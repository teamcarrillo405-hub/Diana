-- Keep a local recognition claim verifiable even when a signed-in client calls
-- learning_save_problem directly instead of the Course Practice HTTP route.
-- The key is provisioned separately by an operator; never put it in a migration.
begin;

create schema if not exists diana_private;
revoke all on schema diana_private from public, anon, authenticated;

create table if not exists diana_private.learning_recognition_key (
  singleton boolean primary key default true check (singleton),
  key_bytes bytea not null check (octet_length(key_bytes) between 32 and 64)
);
revoke all on diana_private.learning_recognition_key from public, anon, authenticated;

create or replace function public.learning_recognition_provenance_ready(p_challenge text,p_signature text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(p_challenge ~ '^[a-f0-9]{32}$' and p_signature ~ '^[a-f0-9]{64}$'
    and exists(select 1 from diana_private.learning_recognition_key
      where singleton and encode(extensions.hmac(convert_to(p_challenge,'UTF8'),key_bytes,'sha256'),'hex')=p_signature),false);
$$;
revoke all on function public.learning_recognition_provenance_ready(text,text) from public, anon;
grant execute on function public.learning_recognition_provenance_ready(text,text) to authenticated;

create or replace function diana_private.verify_learning_recognition_revision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  response jsonb; previous_response jsonb; evidence jsonb; payload jsonb;
  token text; encoded text; supplied_signature text; expected_signature text;
  base64_body text; secret bytea; issued_ms bigint; expires_ms bigint; now_ms bigint;
  response_count integer;
begin
  -- Recognition proofs are specific to the student's response. Class-scoped
  -- practice has no assignment; assignment tutoring has its own machine-made
  -- prompt/source observations and is outside this recognition contract.
  if exists(select 1 from jsonb_array_elements(new.state->'observations') entry(value)
    where entry.value->>'id' is distinct from 'response'
      and (entry.value ? 'recognitionEvidence' or entry.value ? 'recognitionProof'
        or (new.state#>>'{scope,assignmentId}' is null
          and entry.value->>'provenance'='machine_interpretation')))
  then raise exception 'invalid_recognition_provenance'; end if;
  select count(*) into response_count from jsonb_array_elements(new.state->'observations') entry(value)
    where entry.value->>'id'='response';
  if response_count>1 then raise exception 'invalid_recognition_response'; end if;
  select entry.value into response from jsonb_array_elements(new.state->'observations') entry(value)
    where entry.value->>'id'='response' limit 1;
  if response is null then return new; end if;

  if new.revision>1 then
    select entry.value into previous_response
      from public.learning_problem_revisions saved,
           lateral jsonb_array_elements(saved.state->'observations') entry(value)
      where saved.record_id=new.record_id and saved.owner_id=new.owner_id
        and saved.revision=new.revision-1 and entry.value->>'id'='response' limit 1;
  end if;

  -- Existing manual responses remain valid. A machine response always carries
  -- both the source/model evidence and the signed proof used to admit it.
  if response->>'provenance'<>'machine_interpretation'
    and not (response ? 'recognitionEvidence' or response ? 'recognitionProof') then return new; end if;
  if response->>'provenance'<>'machine_interpretation' then raise exception 'invalid_recognition_provenance'; end if;

  evidence:=response->'recognitionEvidence';
  token:=response->>'recognitionProof';
  if evidence is null or evidence='null'::jsonb or token is null then
    -- Preserve identical legacy machine responses written before this guard;
    -- a new unproved machine response cannot be inserted.
    if not (response ? 'recognitionEvidence' or response ? 'recognitionProof')
      and previous_response is not null and previous_response->>'provenance'='machine_interpretation'
      and not (previous_response ? 'recognitionEvidence' or previous_response ? 'recognitionProof')
      and response->>'text'=previous_response->>'text'
      and response->>'modality'=previous_response->>'modality'
      and response->>'role'=previous_response->>'role' then return new; end if;
    raise exception 'recognition_proof_required';
  end if;
  if jsonb_typeof(evidence)<>'object' or length(token)>2000
    or response->>'modality' not in ('voice','handwriting')
    or (response->>'modality'='voice' and evidence->>'kind'<>'speech')
    or (response->>'modality'='handwriting' and evidence->>'kind'<>'handwriting_line')
    or evidence->>'version'<>'recognition-evidence-v1'
    or evidence->>'textHash' is distinct from encode(extensions.digest(convert_to(response->>'text','UTF8'),'sha256'),'hex')
    or evidence->>'networkUsed'<>'false' or evidence->'confidence' is distinct from 'null'::jsonb
  then raise exception 'invalid_recognition_provenance'; end if;

  -- A previously accepted response may be reconfirmed or saved later without
  -- forcing the student to run the model or refresh a 15-minute proof.
  if previous_response is not null and previous_response->>'provenance'='machine_interpretation'
    and previous_response->>'text'=response->>'text'
    and previous_response->>'modality'=response->>'modality'
    and previous_response->>'role'=response->>'role'
    and previous_response->'recognitionEvidence'=evidence
    and previous_response->>'recognitionProof'=token then return new; end if;

  select key_bytes into secret from diana_private.learning_recognition_key where singleton;
  if secret is null then raise exception 'recognition_key_unavailable'; end if;
  if token !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then raise exception 'invalid_recognition_proof'; end if;
  encoded:=split_part(token,'.',1);supplied_signature:=split_part(token,'.',2);
  expected_signature:=replace(replace(trim(trailing '=' from encode(extensions.hmac(convert_to(encoded,'UTF8'),secret,'sha256'),'base64')),'+','-'),'/','_');
  if supplied_signature<>expected_signature then raise exception 'invalid_recognition_proof'; end if;
  base64_body:=translate(encoded,'-_','+/');
  base64_body:=base64_body||repeat('=',(4-length(base64_body)%4)%4);
  payload:=convert_from(decode(base64_body,'base64'),'UTF8')::jsonb;
  now_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
  issued_ms:=(payload->>'issuedAt')::bigint;expires_ms:=(payload->>'expiresAt')::bigint;
  if payload->>'ownerId' is distinct from new.owner_id::text
    or payload->>'textHash' is distinct from evidence->>'textHash'
    or (payload - 'ownerId' - 'expiresAt') is distinct from evidence
    or issued_ms>now_ms+60000 or expires_ms<=now_ms or expires_ms-issued_ms<>900000
  then raise exception 'invalid_recognition_proof'; end if;
  return new;
end $$;
revoke all on function diana_private.verify_learning_recognition_revision() from public, anon, authenticated;

drop trigger if exists learning_recognition_provenance_guard on public.learning_problem_revisions;
create trigger learning_recognition_provenance_guard
before insert on public.learning_problem_revisions
for each row execute function diana_private.verify_learning_recognition_revision();

commit;
