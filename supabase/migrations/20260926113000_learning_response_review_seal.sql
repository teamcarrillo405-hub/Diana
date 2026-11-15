-- A request is a draft until the server signs its exact authored packet.
-- The key is provisioned out of band. No authenticated role can read it.
begin;

create schema if not exists diana_private;
revoke all on schema diana_private from public,anon,authenticated;
create table diana_private.learning_response_review_seal_key (
  singleton boolean primary key default true check(singleton),
  key_bytes bytea not null check(octet_length(key_bytes) between 32 and 64)
);
revoke all on diana_private.learning_response_review_seal_key from public,anon,authenticated;

alter table public.learning_response_review_requests
  add column sealed_packet jsonb,
  add column packet_seal text check(packet_seal ~ '^[a-f0-9]{64}$'),
  add column sealed_at timestamptz,
  add column reviewer_credentials jsonb,
  add constraint response_review_seal_all_or_none check
    ((sealed_packet is null and packet_seal is null and sealed_at is null and reviewer_credentials is null)
      or (sealed_packet is not null and packet_seal is not null and sealed_at is not null
        and reviewer_credentials is not null));

create function diana_private.learning_response_review_immutable_seal()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if old.sealed_at is not null and (new.owner_id,new.record_id,new.revision,new.subject,
    new.reviewer_ids,new.created_at,new.expires_at,new.sealed_packet,new.packet_seal,new.sealed_at,new.reviewer_credentials)
    is distinct from (old.owner_id,old.record_id,old.revision,old.subject,
    old.reviewer_ids,old.created_at,old.expires_at,old.sealed_packet,old.packet_seal,old.sealed_at,old.reviewer_credentials)
    then raise exception 'review_seal_immutable'; end if;
  return new;
end $$;
revoke all on function diana_private.learning_response_review_immutable_seal() from public,anon,authenticated;
create trigger learning_response_review_immutable_seal
before update on public.learning_response_review_requests
for each row execute function diana_private.learning_response_review_immutable_seal();
alter table public.learning_response_review_requests
  drop constraint learning_response_review_reques_owner_id_record_id_revision_key;
create unique index learning_response_review_one_active_revision
  on public.learning_response_review_requests(owner_id,record_id,revision) where revoked_at is null;
create unique index learning_response_review_assessment_id
  on public.learning_response_review_ratings(request_id,(assessment->>'id'));

-- A credential briefly changed and then restored must not revive an old seal.
alter table public.learning_editor_access
  add column review_credential_revision bigint not null default 1 check(review_credential_revision>0);
create function diana_private.learning_review_credential_revision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if (new.roles,new.subjects,new.qualification_ref,new.verified_by,new.verified_at,
    new.expires_at,new.revoked_at) is distinct from
    (old.roles,old.subjects,old.qualification_ref,old.verified_by,old.verified_at,
    old.expires_at,old.revoked_at)
    then new.review_credential_revision:=old.review_credential_revision+1;
    else new.review_credential_revision:=old.review_credential_revision; end if;
  return new;
end $$;
revoke all on function diana_private.learning_review_credential_revision() from public,anon,authenticated;
create trigger learning_review_credential_revision before update on public.learning_editor_access
for each row execute function diana_private.learning_review_credential_revision();

create function diana_private.learning_response_review_credentials(p_request public.learning_response_review_requests)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare snapshot jsonb;
begin
  select jsonb_agg(jsonb_build_object('reviewerId',a.user_id,'qualificationReference',a.qualification_ref,
    'verifiedBy',a.verified_by,'verifiedAt',a.verified_at,'expiresAt',a.expires_at,
    'roles',a.roles,'subjects',a.subjects,'revokedAt',a.revoked_at,
    'revision',a.review_credential_revision) order by r.ord)
  into snapshot
  from unnest(p_request.reviewer_ids) with ordinality r(user_id,ord)
  join public.learning_editor_access a on a.user_id=r.user_id
  where 'reviewer'=any(a.roles) and p_request.subject=any(a.subjects)
    and a.revoked_at is null and a.verified_at<=now() and a.expires_at>now()
    and a.verified_by is distinct from a.user_id::text
    -- UTF-8 bytes conservatively bound the JavaScript UTF-16 schema lengths.
    and octet_length(a.qualification_ref)<=300 and octet_length(a.verified_by)<=200;
  if snapshot is null or jsonb_array_length(snapshot)<>2 then raise exception 'reviewer_credentials_changed'; end if;
  return snapshot;
end $$;
revoke all on function diana_private.learning_response_review_credentials(public.learning_response_review_requests)
  from public,anon,authenticated;

-- PostgreSQL serializes the JSONB before returning the challenge. The server
-- signs those exact bytes; it never tries to reproduce PostgreSQL JSONB text.
create function diana_private.learning_response_review_claim(
  p_request public.learning_response_review_requests,p_packet jsonb
) returns bytea language plpgsql stable security definer set search_path=public,pg_temp as $$
declare rec public.learning_problem_records%rowtype; state jsonb; response jsonb; credentials jsonb;
  criteria jsonb; criterion jsonb; criterion_id text; seen text[]:='{}'; response_count integer;
begin
  if p_packet is null or jsonb_typeof(p_packet)<>'object' or octet_length(p_packet::text)>100000
    then raise exception 'review_packet_invalid'; end if;
  select * into rec from public.learning_problem_records
    where id=p_request.record_id and owner_id=p_request.owner_id;
  if not found or rec.current_revision<>p_request.revision or rec.assignment_id is not null
    or rec.exercise_id not like 'course-practice-v2:%'
    then raise exception 'review_revision_changed'; end if;
  select r.state into state from public.learning_problem_revisions r
    where r.record_id=rec.id and r.owner_id=rec.owner_id and r.revision=p_request.revision;
  if state is null or state#>>'{scope,exerciseId}' is distinct from rec.exercise_id
    or state->>'exerciseVersionId' !~ '^[a-f0-9]{64}$'
    then raise exception 'review_state_changed'; end if;
  select count(*) into response_count
    from jsonb_array_elements(state->'observations') value where value->>'id'='response';
  select value into response from jsonb_array_elements(state->'observations') value
    where value->>'id'='response' limit 1;
  if response_count<>1 or response->>'confirmedHash' is null
    or response->>'confirmedHash' is distinct from response->>'contentHash'
    or response->>'text' is null or length(response->>'text') not between 1 and 4000
    then raise exception 'confirmed_response_required'; end if;
  criteria:=p_packet#>'{rubric,criteria}';
  if p_packet->>'version' is distinct from 'response-assessment-v1'
    or p_packet->>'activityVersionId' is distinct from state->>'exerciseVersionId'
    or p_packet#>>'{rubric,subject}' is distinct from p_request.subject
    or p_packet->>'response' is distinct from response->>'text'
    or p_packet->>'modality' is distinct from response->>'modality'
    or p_packet->'supportCount' is distinct from state->'supportCount'
    or p_packet->>'id' !~ '^[a-f0-9]{64}$'
    or p_packet->>'contentHash' !~ '^[a-f0-9]{64}$'
    or p_packet->>'rubricHash' !~ '^[a-f0-9]{64}$'
    or p_packet->>'responseHash' !~ '^[a-f0-9]{64}$'
    or p_packet#>>'{permission,id}' is distinct from p_request.id::text
    or p_packet#>>'{permission,scope}' is distinct from 'response_assessment'
    or p_packet#>>'{permission,provenance}' is distinct from 'consented_student'
    or p_packet#>>'{permission,consentReference}' is distinct from p_request.id::text
    or p_packet#>>'{permission,responseHash}' is distinct from p_packet->>'responseHash'
    or p_packet#>>'{permission,activityVersionId}' is distinct from p_packet->>'activityVersionId'
    or p_packet#>'{permission,reviewerIds}' is distinct from to_jsonb(p_request.reviewer_ids)
    or (p_packet#>>'{permission,issuedAt}')::timestamptz is distinct from p_request.created_at
    or (p_packet#>>'{permission,expiresAt}')::timestamptz is distinct from p_request.expires_at
    or p_packet#>>'{permission,revokedAt}' is not null
    or jsonb_typeof(criteria)<>'array' or jsonb_array_length(criteria) not between 2 and 6
    then raise exception 'review_packet_invalid'; end if;
  for criterion in select value from jsonb_array_elements(criteria) value loop
    criterion_id:=criterion->>'id';
    if criterion_id is null or criterion_id !~ '^[a-z_]+$' or criterion_id=any(seen)
      then raise exception 'review_criteria_invalid'; end if;
    seen:=array_append(seen,criterion_id);
  end loop;
  credentials:=diana_private.learning_response_review_credentials(p_request);
  if p_request.reviewer_credentials is not null and p_request.reviewer_credentials is distinct from credentials
    then raise exception 'reviewer_credentials_changed'; end if;
  return convert_to(jsonb_build_array('response-review-seal-v1',p_request.id::text,
    p_request.owner_id::text,p_request.record_id::text,p_request.revision,
    p_request.subject,p_request.reviewer_ids,p_request.created_at,p_request.expires_at,
    rec.exercise_id,state->>'exerciseVersionId',
    encode(extensions.digest(convert_to(response->>'text','UTF8'),'sha256'),'hex'),
    p_packet->>'responseHash',p_packet->>'id',p_packet->>'contentHash',
    p_packet->>'rubricHash',to_jsonb(seen),credentials,
    encode(extensions.digest(convert_to(p_packet::text,'UTF8'),'sha256'),'hex'))::text,'UTF8');
end $$;
revoke all on function diana_private.learning_response_review_claim(public.learning_response_review_requests,jsonb) from public,anon,authenticated;

create function diana_private.learning_response_review_seal_valid(p_request public.learning_response_review_requests)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare secret bytea; expected text;
begin
  if p_request.sealed_packet is null or p_request.packet_seal is null or p_request.sealed_at is null
    then return false; end if;
  select key_bytes into secret from diana_private.learning_response_review_seal_key where singleton;
  if secret is null then return false; end if;
  expected:=encode(extensions.hmac(diana_private.learning_response_review_claim(p_request,p_request.sealed_packet),secret,'sha256'),'hex');
  return expected=p_request.packet_seal;
exception when others then return false;
end $$;
revoke all on function diana_private.learning_response_review_seal_valid(public.learning_response_review_requests) from public,anon,authenticated;

create function public.learning_response_review_seal_ready(p_challenge text,p_signature text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(p_challenge ~ '^[a-f0-9]{32}$' and p_signature ~ '^[a-f0-9]{64}$'
    and exists(select 1 from diana_private.learning_response_review_seal_key where singleton
      and encode(extensions.hmac(convert_to(p_challenge,'UTF8'),key_bytes,'sha256'),'hex')=p_signature),false);
$$;

create function public.learning_response_review_seal_challenge(p_request uuid,p_packet jsonb)
returns text language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid();
  if auth.uid() is null or not found or req.packet_seal is not null or req.revoked_at is not null
    or req.expires_at<=now() or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
    then raise exception 'review_access_denied'; end if;
  return encode(diana_private.learning_response_review_claim(req,p_packet),'base64');
end $$;

create function public.learning_seal_response_review(p_request uuid,p_packet jsonb,p_signature text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; secret bytea; expected text;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid() for update;
  if auth.uid() is null or not found or req.packet_seal is not null or req.revoked_at is not null
    or req.expires_at<=now() or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
    then raise exception 'review_access_denied'; end if;
  select key_bytes into secret from diana_private.learning_response_review_seal_key where singleton;
  if secret is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception 'review_seal_unavailable'; end if;
  expected:=encode(extensions.hmac(diana_private.learning_response_review_claim(req,p_packet),secret,'sha256'),'hex');
  if p_signature is distinct from expected then raise exception 'review_seal_invalid'; end if;
  update public.learning_response_review_requests set sealed_packet=p_packet,
    packet_seal=p_signature,sealed_at=clock_timestamp(),
    reviewer_credentials=diana_private.learning_response_review_credentials(req) where id=req.id;
  return true;
end $$;

-- The old functions remain internal. Public wrappers check the seal first.
alter function public.learning_response_review_access(uuid) rename to learning_response_review_access_unsealed;
alter function public.learning_submit_response_rating(uuid,text,jsonb) rename to learning_submit_response_rating_unsealed;
alter function public.learning_response_review_ratings(uuid) rename to learning_response_review_ratings_unsealed;
alter function public.learning_response_review_registry(uuid) rename to learning_response_review_registry_unsealed;

create function public.learning_response_review_draft(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid();
  if auth.uid() is null or not found or req.sealed_at is not null or req.revoked_at is not null
    or req.expires_at<=now() or not exists(select 1 from public.profiles where user_id=req.owner_id and age_bracket='adult')
    then raise exception 'review_access_denied'; end if;
  return public.learning_response_review_access_unsealed(p_request);
end $$;

create function public.learning_response_review_access(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; delivered jsonb;
begin
  select * into req from public.learning_response_review_requests where id=p_request;
  if not found or not diana_private.learning_response_review_seal_valid(req)
    then raise exception 'review_access_denied'; end if;
  delivered:=public.learning_response_review_access_unsealed(p_request);
  return delivered||jsonb_build_object('sealedPacket',req.sealed_packet);
end $$;

create function diana_private.learning_review_exact_keys(p_value jsonb,p_keys text[])
returns boolean language sql immutable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_typeof(p_value)='object' and
   (select array_agg(key order by key) from jsonb_object_keys(p_value) key)=
   (select array_agg(value order by value) from unnest(p_keys) value),false);
$$;
revoke all on function diana_private.learning_review_exact_keys(jsonb,text[]) from public,anon,authenticated;

create or replace function public.learning_list_response_reviews(p_role text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'recordId',r.record_id,'revision',r.revision,
   'reviewerIds',r.reviewer_ids,'createdAt',r.created_at,'expiresAt',r.expires_at,'revokedAt',r.revoked_at)
   order by r.created_at desc),'[]'::jsonb)
 from (select * from public.learning_response_review_requests where
   diana_private.learning_response_review_seal_valid(learning_response_review_requests)
   and ((p_role='owner' and owner_id=auth.uid()) or
     (p_role='reviewer' and auth.uid()=any(reviewer_ids) and revoked_at is null and expires_at>now()
       and public.learning_response_reviewer_current(auth.uid(),subject)
       and exists(select 1 from public.profiles where user_id=owner_id and age_bracket='adult')))
   order by created_at desc limit 100) r;
$$;

create function public.learning_submit_response_rating(p_request uuid,p_subject text,p_assessment jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype; criterion jsonb; expected_id text;
  credential public.learning_editor_access%rowtype;
  evidence jsonb; response_text text; idx integer:=0; span_start integer; span_end integer;
begin
  select * into req from public.learning_response_review_requests where id=p_request for update;
  if not found or not diana_private.learning_response_review_seal_valid(req)
    then raise exception 'review_access_denied'; end if;
  if not diana_private.learning_review_exact_keys(p_assessment,
      array['id','packetId','packetHash','rubricHash','reviewerId','qualificationReference',
        'role','reviewedAt','conflictOfInterest','resolves','criteria'])
    or p_assessment->>'packetId' is distinct from req.sealed_packet->>'id'
    or p_assessment->>'packetHash' is distinct from req.sealed_packet->>'contentHash'
    or p_assessment->>'rubricHash' is distinct from req.sealed_packet->>'rubricHash'
    or p_assessment->>'role' is distinct from 'rater'
    or p_assessment->'resolves' is distinct from '[]'::jsonb
    or jsonb_typeof(p_assessment->'id') is distinct from 'string'
    or jsonb_typeof(p_assessment->'reviewedAt') is distinct from 'string'
    or p_assessment->>'id' !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
    or p_assessment->>'reviewedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$'
    or jsonb_typeof(p_assessment->'conflictOfInterest') is distinct from 'boolean'
    or jsonb_typeof(p_assessment->'criteria')<>'array'
    or jsonb_array_length(p_assessment->'criteria')<>jsonb_array_length(req.sealed_packet#>'{rubric,criteria}')
    then raise exception 'invalid_assessment'; end if;
  response_text:=req.sealed_packet->>'response';
  select * into credential from public.learning_editor_access where user_id=auth.uid();
  if not found or credential.verified_by=credential.user_id::text
    then raise exception 'reviewer_credentials_changed'; end if;
  for criterion in select value from jsonb_array_elements(p_assessment->'criteria') value loop
    idx:=idx+1;
    expected_id:=req.sealed_packet#>>array['rubric','criteria',(idx-1)::text,'id'];
    if not diana_private.learning_review_exact_keys(criterion,
        array['criterionId','score','rationale','evidence'])
      or criterion->>'criterionId' is distinct from expected_id
      or jsonb_typeof(criterion->'evidence')<>'array'
      or jsonb_array_length(criterion->'evidence')>6
      or jsonb_typeof(criterion->'rationale') is distinct from 'string'
      -- PostgreSQL length counts code points; Zod counts UTF-16 units.
      -- The byte ceiling is conservative for every valid UTF-8 code point.
      or length(btrim(criterion->>'rationale'))<20
      or octet_length(criterion->>'rationale')>2000
      -- Requiring substantive characters also covers JavaScript trim's wider
      -- whitespace set (tabs, nonbreaking spaces and Unicode spaces).
      or length(regexp_replace(criterion->>'rationale','[^[:alnum:]]','','g'))<20
      or criterion->>'rationale' is distinct from btrim(criterion->>'rationale')
      or criterion->'score' is null
      or (criterion->'score' is distinct from 'null'::jsonb and
        (jsonb_typeof(criterion->'score')<>'number' or criterion->>'score' !~ '^[0-3]$'))
      or (criterion->>'score' ~ '^[1-3]$' and jsonb_array_length(criterion->'evidence')=0)
      then raise exception 'invalid_assessment'; end if;
    for evidence in select value from jsonb_array_elements(criterion->'evidence') value loop
      if not diana_private.learning_review_exact_keys(evidence,array['start','end','exactText'])
        or jsonb_typeof(evidence->'start') is distinct from 'number'
        or jsonb_typeof(evidence->'end') is distinct from 'number'
        or jsonb_typeof(evidence->'exactText') is distinct from 'string'
        or length(evidence->>'exactText') not between 1 and 4000
        or evidence->>'start' !~ '^[0-9]+$' or evidence->>'end' !~ '^[0-9]+$'
        then raise exception 'invalid_evidence_span'; end if;
      span_start:=(evidence->>'start')::integer;span_end:=(evidence->>'end')::integer;
      if public.learning_utf16_span(response_text,span_start,span_end)
        is distinct from evidence->>'exactText' then raise exception 'invalid_evidence_span'; end if;
    end loop;
  end loop;
  if (p_assessment->>'reviewedAt')::timestamptz<req.created_at
    or (p_assessment->>'reviewedAt')::timestamptz<credential.verified_at
    or (p_assessment->>'reviewedAt')::timestamptz<clock_timestamp()-interval '5 minutes'
    or (p_assessment->>'reviewedAt')::timestamptz>clock_timestamp()
    then raise exception 'invalid_review_time'; end if;
  return public.learning_submit_response_rating_unsealed(p_request,p_subject,p_assessment);
end $$;

create function public.learning_response_review_ratings(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid();
  if not found or not diana_private.learning_response_review_seal_valid(req)
    or req.revoked_at is not null or req.expires_at<=now() then raise exception 'review_access_denied'; end if;
  return public.learning_response_review_ratings_unsealed(p_request);
end $$;

create function public.learning_response_review_registry(p_request uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare req public.learning_response_review_requests%rowtype;
begin
  select * into req from public.learning_response_review_requests where id=p_request and owner_id=auth.uid();
  if not found or not diana_private.learning_response_review_seal_valid(req)
    or req.revoked_at is not null or req.expires_at<=now() then raise exception 'review_access_denied'; end if;
  return public.learning_response_review_registry_unsealed(p_request);
end $$;

revoke all on function public.learning_response_review_seal_ready(text,text),
  public.learning_response_review_draft(uuid),
  public.learning_response_review_seal_challenge(uuid,jsonb),
  public.learning_seal_response_review(uuid,jsonb,text),
  public.learning_response_review_access(uuid),
  public.learning_submit_response_rating(uuid,text,jsonb),
  public.learning_response_review_ratings(uuid),
  public.learning_response_review_registry(uuid),
  public.learning_list_response_reviews(text) from public,anon,authenticated;
grant execute on function public.learning_response_review_seal_ready(text,text),
  public.learning_response_review_draft(uuid),
  public.learning_response_review_seal_challenge(uuid,jsonb),
  public.learning_seal_response_review(uuid,jsonb,text),
  public.learning_request_response_review(uuid,integer,uuid[]),
  public.learning_revoke_response_review(uuid),
  public.learning_response_review_access(uuid),
  public.learning_list_response_reviews(text),
  public.learning_submit_response_rating(uuid,text,jsonb),
  public.learning_response_review_ratings(uuid),
  public.learning_response_review_registry(uuid) to authenticated;
commit;
