-- Educator credentials are provisioned only by a trusted operator using service access.
-- Student confirmation and user-editable profile metadata never grant these roles.
create table public.learning_editor_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roles text[] not null check (cardinality(roles) between 1 and 2 and roles <@ array['operator','reviewer']::text[]),
  subjects text[] not null check (cardinality(subjects) > 0 and subjects <@ array['math','reading','english','science','history','computing','other']::text[]),
  qualification_ref text not null check (length(qualification_ref) between 3 and 300),
  verified_by text not null check (length(verified_by) between 3 and 200),
  verified_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz,
  check (expires_at > verified_at)
);
create table public.learning_course_modules (
  id uuid primary key default gen_random_uuid(), course_id text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'), subject text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft','published','withdrawn')),
  published_by uuid references auth.users(id), published_at timestamptz,
  unique(course_id,content_hash)
);
create table public.learning_course_reviews (
  id uuid primary key default gen_random_uuid(), module_id uuid not null references public.learning_course_modules(id),
  reviewer_id uuid not null references auth.users(id), qualification_ref text not null,
  checks jsonb not null, decision text not null check (decision in ('approve','revise')),
  notes text not null check (length(notes) between 20 and 4000), reviewed_at timestamptz not null default now(),
  unique(module_id,reviewer_id)
);
create table public.learning_course_events (
  id uuid primary key default gen_random_uuid(), module_id uuid not null references public.learning_course_modules(id),
  actor_id uuid not null references auth.users(id), action text not null check (action in ('register','review','publish','withdraw')),
  reason text not null check (length(reason) between 3 and 4000), created_at timestamptz not null default now()
);
alter table public.learning_editor_access enable row level security;
alter table public.learning_course_modules enable row level security;
alter table public.learning_course_reviews enable row level security;
alter table public.learning_course_events enable row level security;
revoke all on public.learning_editor_access,public.learning_course_modules,public.learning_course_reviews,public.learning_course_events from anon,authenticated;
grant all on public.learning_editor_access,public.learning_course_modules,public.learning_course_reviews,public.learning_course_events to service_role;

create function public.learning_editor_has(p_role text,p_subject text default null) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from learning_editor_access a where a.user_id=auth.uid() and p_role=any(a.roles)
   and (p_subject is null or p_subject=any(a.subjects)) and a.revoked_at is null
   and a.verified_at<=now() and a.expires_at>now());
$$;
create function public.learning_editor_profile() returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('roles',a.roles,'subjects',a.subjects,'expiresAt',a.expires_at)
 from learning_editor_access a where a.user_id=auth.uid() and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now();
$$;

-- Only reviewers/operators see keys and unreleased instructions. Raters see their own
-- decisions until publication; operators can adjudicate a disagreement by revising content.
grant select on public.learning_course_modules,public.learning_course_reviews,public.learning_course_events to authenticated;
create policy learning_module_editor_read on public.learning_course_modules for select to authenticated
 using (learning_editor_has('operator',subject) or learning_editor_has('reviewer',subject));
create policy learning_review_editor_read on public.learning_course_reviews for select to authenticated
 using (exists(select 1 from learning_course_modules m where m.id=module_id and
   (learning_editor_has('operator',m.subject) or (reviewer_id=auth.uid() and learning_editor_has('reviewer',m.subject)))));
create policy learning_event_editor_read on public.learning_course_events for select to authenticated
 using (exists(select 1 from learning_course_modules m where m.id=module_id and learning_editor_has('operator',m.subject)));

create function public.learning_register_course(p_course text,p_hash text,p_payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare module_id uuid; existing learning_course_modules%rowtype; subject_name text;
begin
 subject_name:=p_payload#>>'{framework,courses,0,subject}';
 if not learning_editor_has('operator',subject_name) or subject_name is null then raise exception 'editor_access_denied'; end if;
 if p_course is null or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' or length(p_course)>160
   or p_payload->>'version' is distinct from 'course-module-v1' or p_payload->>'courseId' is distinct from p_course
   or jsonb_array_length(p_payload#>'{framework,courses}') is distinct from 1
   or p_payload#>>'{framework,courses,0,id}' is distinct from p_course
   or jsonb_typeof(p_payload->'activities') is distinct from 'array' or jsonb_array_length(p_payload->'activities') not between 1 and 200
   or octet_length(p_payload::text)>2000000 then raise exception 'invalid_course_module'; end if;
 insert into learning_course_modules(course_id,content_hash,subject,payload,created_by)
 values(p_course,p_hash,subject_name,p_payload,auth.uid()) on conflict(course_id,content_hash) do nothing returning id into module_id;
 if module_id is null then
   select * into existing from learning_course_modules where course_id=p_course and content_hash=p_hash;
   if existing.payload is distinct from p_payload then raise exception 'module_hash_conflict'; end if;
   return existing.id;
 end if;
 insert into learning_course_events(module_id,actor_id,action,reason) values(module_id,auth.uid(),'register','Submitted for independent educator review');
 return module_id;
end; $$;

create function public.learning_review_course(p_module uuid,p_checks jsonb,p_notes text,p_no_conflict boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare module learning_course_modules%rowtype; credential learning_editor_access%rowtype; review_id uuid; approval boolean;
begin
 select * into module from learning_course_modules where id=p_module for update;
 if not found or not learning_editor_has('reviewer',module.subject) then raise exception 'review_access_denied'; end if;
 if module.status<>'draft' or module.created_by=auth.uid() or p_no_conflict is distinct from true then raise exception 'independent_review_required'; end if;
 if p_checks is null or jsonb_typeof(p_checks)<>'object' or
   (select count(*) from jsonb_object_keys(p_checks))<>5 or
   not (p_checks ?& array['accuracy','sourceRights','instruction','accessibility','safety']) or
   exists(select 1 from jsonb_each(p_checks) where jsonb_typeof(value)<>'boolean')
   or p_notes is null or length(btrim(p_notes)) not between 20 and 4000 then raise exception 'complete_review_required'; end if;
 select * into credential from learning_editor_access where user_id=auth.uid();
 approval := not exists(select 1 from jsonb_each(p_checks) where value<>'true'::jsonb);
 insert into learning_course_reviews(module_id,reviewer_id,qualification_ref,checks,decision,notes)
 values(p_module,auth.uid(),credential.qualification_ref,p_checks,case when approval then 'approve' else 'revise' end,btrim(p_notes)) returning id into review_id;
 insert into learning_course_events(module_id,actor_id,action,reason) values(p_module,auth.uid(),'review','Independent content review recorded');
 return review_id;
end; $$;

create function public.learning_course_reviews_current(p_module uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select count(*)>=2 and bool_and(r.decision='approve')
 from learning_course_reviews r join learning_course_modules m on m.id=r.module_id
 join learning_editor_access a on a.user_id=r.reviewer_id
 where r.module_id=p_module and r.reviewer_id<>m.created_by and a.revoked_at is null and a.verified_at<=r.reviewed_at
 and a.expires_at>now() and 'reviewer'=any(a.roles) and m.subject=any(a.subjects)
 and r.qualification_ref=a.qualification_ref
 and not exists(select 1 from learning_course_reviews rejected where rejected.module_id=p_module and rejected.decision='revise');
$$;
create function public.learning_set_course_publication(p_module uuid,p_action text,p_reason text) returns boolean
language plpgsql security definer set search_path=public as $$
declare module learning_course_modules%rowtype;
begin
 select * into module from learning_course_modules where id=p_module for update;
 if not found or not learning_editor_has('operator',module.subject) then raise exception 'publication_access_denied'; end if;
 if p_action is null or p_action not in ('publish','withdraw') or p_reason is null or length(btrim(p_reason)) not between 3 and 4000 then raise exception 'publication_reason_required'; end if;
 if p_action='publish' and (module.status='withdrawn' or learning_course_reviews_current(p_module) is distinct from true) then raise exception 'current_independent_approval_required'; end if;
 update learning_course_modules set status=case when p_action='publish' then 'published' else 'withdrawn' end,
   published_by=case when p_action='publish' then auth.uid() else published_by end,
   published_at=case when p_action='publish' then now() else published_at end where id=p_module;
 insert into learning_course_events(module_id,actor_id,action,reason) values(p_module,auth.uid(),p_action,btrim(p_reason));
 return true;
end; $$;
create function public.learning_course_publications() returns jsonb
language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('course_id',m.course_id,'content_hash',m.content_hash,'status',
   case when m.status='published' and learning_course_reviews_current(m.id) is distinct from true then 'suspended' else m.status end)),'[]'::jsonb)
 from learning_course_modules m where auth.uid() is not null;
$$;
revoke all on function public.learning_editor_has(text,text),public.learning_editor_profile(),public.learning_register_course(text,text,jsonb),public.learning_review_course(uuid,jsonb,text,boolean),public.learning_course_reviews_current(uuid),public.learning_set_course_publication(uuid,text,text),public.learning_course_publications() from public,anon,authenticated;
grant execute on function public.learning_editor_has(text,text),public.learning_editor_profile(),public.learning_register_course(text,text,jsonb),public.learning_review_course(uuid,jsonb,text,boolean),public.learning_set_course_publication(uuid,text,text),public.learning_course_publications() to authenticated;
