-- Adult-owned, per-response educator review. No course publication, grade, or training permission.
begin;
create table public.learning_response_review_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null,
  revision integer not null check (revision between 1 and 10000),
  subject text not null check (subject in ('reading','english','science','history')),
  reviewer_ids uuid[] not null check (cardinality(reviewer_ids)=2 and reviewer_ids[1]<>reviewer_ids[2]),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '14 days'),
  revoked_at timestamptz,
  foreign key (record_id,owner_id) references public.learning_problem_records(id,owner_id) on delete cascade,
  unique (owner_id,record_id,revision),
  check (expires_at>created_at and expires_at<=created_at+interval '14 days')
);
create table public.learning_response_review_ratings (
  id uuid primary key default gen_random_uuid(),
  submission_order bigint generated always as identity unique,
  request_id uuid not null references public.learning_response_review_requests(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  qualification_ref text not null,
  assessment jsonb not null check (jsonb_typeof(assessment)='object' and octet_length(assessment::text)<=30000),
  created_at timestamptz not null default now()
);
create index learning_response_review_rating_latest
  on public.learning_response_review_ratings(request_id,reviewer_id,submission_order desc);
alter table public.learning_response_review_requests enable row level security;
alter table public.learning_response_review_ratings enable row level security;
revoke all on public.learning_response_review_requests,public.learning_response_review_ratings from anon,authenticated;
grant all on public.learning_response_review_requests,public.learning_response_review_ratings to service_role;

-- A registry credential is checked on every packet read and rating write.
create function public.learning_response_reviewer_current(p_reviewer uuid,p_subject text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.learning_editor_access a where a.user_id=p_reviewer
   and 'reviewer'=any(a.roles) and p_subject=any(a.subjects)
   and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now());
$$;

create function public.learning_request_response_review(p_record uuid,p_revision integer,p_reviewers uuid[])
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); rec public.learning_problem_records%rowtype;
  response jsonb; request_id uuid; subject_name text;
begin
 if actor is null then raise exception 'authentication_required'; end if;
 if not exists(select 1 from public.profiles where user_id=actor and age_bracket='adult') then raise exception 'adult_permission_required'; end if;
 if p_reviewers is null or cardinality(p_reviewers)<>2 or p_reviewers[1]=p_reviewers[2]
   or actor=any(p_reviewers) then raise exception 'two_independent_reviewers_required'; end if;
 select * into rec from public.learning_problem_records where id=p_record and owner_id=actor for update;
 if not found or rec.assignment_id is not null or rec.exercise_id not like 'course-practice-v2:%'
   or rec.current_revision<>p_revision then raise exception 'response_revision_unavailable'; end if;
 subject_name:=split_part(split_part(rec.exercise_id,':',2),'-',1);
 if subject_name not in ('reading','english','science','history') then raise exception 'response_subject_unavailable'; end if;
 select value into response from public.learning_problem_revisions r,
   lateral jsonb_array_elements(r.state->'observations') value
   where r.record_id=p_record and r.owner_id=actor and r.revision=p_revision and value->>'id'='response';
 if response is null or response->>'confirmedHash' is null
   or response->>'confirmedHash' is distinct from response->>'contentHash'
   or response->>'text' is null or length(response->>'text') not between 1 and 4000
   then raise exception 'confirmed_response_required'; end if;
 if exists(select 1 from unnest(p_reviewers) reviewer where not exists(
   select 1 from public.learning_editor_access a where a.user_id=reviewer
   and 'reviewer'=any(a.roles) and subject_name=any(a.subjects)
   and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now()))
   then raise exception 'verified_reviewers_required'; end if;
 insert into public.learning_response_review_requests(owner_id,record_id,revision,subject,reviewer_ids)
 values(actor,p_record,p_revision,subject_name,p_reviewers) returning id into request_id;
 return request_id;
end $$;

create function public.learning_revoke_response_review(p_request uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.learning_response_review_requests set revoked_at=coalesce(revoked_at,now())
 where id=p_request and owner_id=auth.uid();
 return found;
end $$;

create function public.learning_response_review_access(p_request uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; state jsonb; response jsonb;
begin
 select * into req from public.learning_response_review_requests where id=p_request;
 if auth.uid() is null or not found or req.revoked_at is not null or req.expires_at<=now()
   or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
   or not (auth.uid()=req.owner_id or (auth.uid()=any(req.reviewer_ids)
     and public.learning_response_reviewer_current(auth.uid(),req.subject)))
   then raise exception 'review_access_denied'; end if;
 select r.state into state from public.learning_problem_revisions r
 join public.learning_problem_records p on p.id=r.record_id and p.owner_id=r.owner_id
 where r.record_id=req.record_id and r.owner_id=req.owner_id and r.revision=req.revision
   and p.current_revision=req.revision;
 if state is null then raise exception 'response_revision_changed'; end if;
 select value into response from jsonb_array_elements(state->'observations') value where value->>'id'='response';
 if response is null or response->>'confirmedHash' is distinct from response->>'contentHash'
   then raise exception 'confirmed_response_required'; end if;
 return jsonb_build_object('id',req.id,'recordId',req.record_id,'revision',req.revision,
    'reviewerIds',req.reviewer_ids,'subject',req.subject,'issuedAt',req.created_at,'expiresAt',req.expires_at,
   'revokedAt',req.revoked_at,'exerciseId',state#>>'{scope,exerciseId}',
   'activityVersionId',state->>'exerciseVersionId','response',response->>'text',
   'modality',response->>'modality','supportCount',state->'supportCount');
end $$;

create function public.learning_list_response_reviews(p_role text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'recordId',r.record_id,'revision',r.revision,
   'reviewerIds',r.reviewer_ids,'createdAt',r.created_at,'expiresAt',r.expires_at,'revokedAt',r.revoked_at)
   order by r.created_at desc),'[]'::jsonb)
 from (select * from public.learning_response_review_requests where
   (p_role='owner' and owner_id=auth.uid()) or
   (p_role='reviewer' and auth.uid()=any(reviewer_ids) and revoked_at is null and expires_at>now()
     and public.learning_response_reviewer_current(auth.uid(),subject)
     and exists(select 1 from public.profiles where user_id=owner_id and age_bracket='adult'))
   order by created_at desc limit 100) r;
$$;

create function public.learning_submit_response_rating(p_request uuid,p_subject text,p_assessment jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; rating_id uuid; credential public.learning_editor_access%rowtype;
begin
 select * into req from public.learning_response_review_requests where id=p_request for update;
 if auth.uid() is null or not found or req.revoked_at is not null or req.expires_at<=now()
   or not (auth.uid()=any(req.reviewer_ids))
   or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
   or p_subject is distinct from req.subject
   or not public.learning_response_reviewer_current(auth.uid(),req.subject)
   or not exists(select 1 from public.learning_problem_records where id=req.record_id and owner_id=req.owner_id and current_revision=req.revision)
   then raise exception 'review_access_denied'; end if;
 if p_assessment is null or jsonb_typeof(p_assessment)<>'object'
   or octet_length(p_assessment::text)>30000 or p_assessment->>'reviewerId' is distinct from auth.uid()::text
   or p_assessment->>'role' is distinct from 'rater'
   or p_assessment->>'packetId' !~ '^[a-f0-9]{64}$'
   or p_assessment->>'packetHash' !~ '^[a-f0-9]{64}$'
   or p_assessment->>'rubricHash' !~ '^[a-f0-9]{64}$'
   or p_assessment->>'conflictOfInterest' is distinct from 'false'
   or jsonb_typeof(p_assessment->'criteria')<>'array' or jsonb_array_length(p_assessment->'criteria') not between 2 and 6
   then raise exception 'invalid_assessment'; end if;
 select * into credential from public.learning_editor_access where user_id=auth.uid();
 if p_assessment->>'qualificationReference' is distinct from credential.qualification_ref then raise exception 'qualification_changed'; end if;
 -- The locked parent request serializes this cap across concurrent submissions.
 if (select count(*) from public.learning_response_review_ratings
     where request_id=p_request and reviewer_id=auth.uid())>=5
   then raise exception 'rating_submission_limit'; end if;
 insert into public.learning_response_review_ratings(request_id,reviewer_id,qualification_ref,assessment)
 values(p_request,auth.uid(),credential.qualification_ref,p_assessment) returning id into rating_id;
 return rating_id;
end $$;

create function public.learning_response_review_ratings(p_request uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(latest.assessment order by latest.submission_order),'[]'::jsonb)
 from (
   select distinct on (r.reviewer_id) r.assessment,r.submission_order
   from public.learning_response_review_ratings r
   join public.learning_response_review_requests q on q.id=r.request_id
   where q.id=p_request and q.owner_id=auth.uid() and q.revoked_at is null and q.expires_at>now()
     and exists(select 1 from public.profiles where user_id=q.owner_id and age_bracket='adult')
   order by r.reviewer_id,r.submission_order desc
 ) latest;
$$;
create function public.learning_response_review_registry(p_request uuid)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',a.user_id,'subjects',a.subjects,
   'qualificationReference',a.qualification_ref,'verifiedBy',a.verified_by,
   'verifiedAt',a.verified_at,'expiresAt',a.expires_at,'revokedAt',a.revoked_at)),'[]'::jsonb)
 from public.learning_response_review_requests q
 join public.learning_editor_access a on a.user_id=any(q.reviewer_ids)
 where q.id=p_request and q.owner_id=auth.uid() and q.revoked_at is null and q.expires_at>now()
   and exists(select 1 from public.profiles where user_id=q.owner_id and age_bracket='adult');
$$;
-- SECURITY HOLD: this prototype does not yet bind an operator-signed canonical
-- activity/response/rubric packet at the database boundary. SECURITY DEFINER
-- defaults to PUBLIC execute unless explicitly revoked. Keep every entry point
-- inaccessible to authenticated callers until a later sealed migration proves
-- direct RPC calls cannot bypass the authored-course and rollout checks.
revoke all on function public.learning_response_reviewer_current(uuid,text),public.learning_request_response_review(uuid,integer,uuid[]),public.learning_revoke_response_review(uuid),public.learning_response_review_access(uuid),public.learning_list_response_reviews(text),public.learning_submit_response_rating(uuid,text,jsonb),public.learning_response_review_ratings(uuid),public.learning_response_review_registry(uuid) from public,anon,authenticated;
commit;
