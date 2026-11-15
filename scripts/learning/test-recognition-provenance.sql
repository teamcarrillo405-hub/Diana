-- TRIGGER UNIT FIXTURE ONLY: this uses a simplified revisions table and does
-- not cover the real parent/request_id columns or learning_save_problem RPC.
-- Use test-recognition-real-schema.sql for the actual-schema contract test.
-- Run only in an isolated Postgres test database after the provenance migration.
-- The fixed key and IDs below are synthetic fixtures, never deployment secrets.
begin;
set local role authenticated;
do $$ begin
  if public.learning_recognition_provenance_ready(repeat('a',32),repeat('0',64)) then
    raise exception 'readiness must fail without a provisioned key';
  end if;
end $$;
reset role;

insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011',1,
  jsonb_build_object('observations',jsonb_build_array(jsonb_build_object(
    'id','response','role','student_step','modality','typed','provenance','student_entered','text','manual answer'))));

do $$ begin
  begin
    insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
    values ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000011',1,
      jsonb_build_object('observations',jsonb_build_array(jsonb_build_object(
        'id','response','role','student_step','modality','voice','provenance','machine_interpretation','text','forged answer'))));
    raise exception 'unproved machine response was accepted';
  exception when others then
    if sqlerrm <> 'recognition_proof_required' then raise; end if;
  end;
end $$;

insert into diana_private.learning_recognition_key(singleton,key_bytes)
values (true,decode(repeat('11',32),'hex'));
do $$ declare signature text; begin
  signature:=encode(extensions.hmac(convert_to(repeat('a',32),'UTF8'),decode(repeat('11',32),'hex'),'sha256'),'hex');
  if not public.learning_recognition_provenance_ready(repeat('a',32),signature) then
    raise exception 'readiness must pass with matching provisioned key';
  end if;
  if public.learning_recognition_provenance_ready(repeat('a',32),repeat('0',64)) then
    raise exception 'readiness must reject a different key';
  end if;
end $$;

do $$ declare
  secret bytea:=decode(repeat('11',32),'hex');
  response_text text:='recognized answer';
  issued_ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
  evidence jsonb; payload jsonb; encoded text; signature text; proof text; response jsonb; state jsonb;
begin
  evidence:=jsonb_build_object('version','recognition-evidence-v1','kind','speech',
    'assetHash',repeat('a',64),'textHash',encode(extensions.digest(convert_to(response_text,'UTF8'),'sha256'),'hex'),
    'modelId','fixture','revision',repeat('b',40),'fileManifestHash',repeat('c',64),
    'issuedAt',issued_ms,'networkUsed',false,'confidence',null);
  payload:=evidence||jsonb_build_object('ownerId','00000000-0000-4000-8000-000000000011','expiresAt',issued_ms+900000);
  encoded:=replace(replace(trim(trailing '=' from replace(encode(convert_to(payload::text,'UTF8'),'base64'),E'\n','')),'+','-'),'/','_');
  signature:=replace(replace(trim(trailing '=' from encode(extensions.hmac(convert_to(encoded,'UTF8'),secret,'sha256'),'base64')),'+','-'),'/','_');
  proof:=encoded||'.'||signature;
  response:=jsonb_build_object('id','response','role','student_step','modality','voice',
    'provenance','machine_interpretation','text',response_text,'recognitionEvidence',evidence,'recognitionProof',proof);
  state:=jsonb_build_object('observations',jsonb_build_array(response));
  insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
  values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011',1,state);
  insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
  values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011',2,state);

  begin
    insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
    values ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000011',1,
      jsonb_build_object('observations',jsonb_build_array(response||jsonb_build_object('text','edited answer'))));
    raise exception 'edited text was accepted with old proof';
  exception when others then
    if sqlerrm <> 'invalid_recognition_provenance' then raise; end if;
  end;
  begin
    insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
    values ('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000011',1,
      jsonb_build_object('observations',jsonb_build_array(response||jsonb_build_object('recognitionProof',encoded||'.'||repeat('A',43)))));
    raise exception 'forged signature was accepted';
  exception when others then
    if sqlerrm <> 'invalid_recognition_proof' then raise; end if;
  end;
  -- A student can replace their own recognized draft with a manual response.
  insert into public.learning_problem_revisions(record_id,owner_id,revision,state)
  values ('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011',3,
    jsonb_build_object('observations',jsonb_build_array(jsonb_build_object(
      'id','response','role','student_step','modality','typed','provenance','student_entered','text','my edit'))));
end $$;
rollback;
