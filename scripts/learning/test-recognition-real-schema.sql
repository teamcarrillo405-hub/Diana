-- ISOLATED DATABASE ONLY. Run after test-recognition-schema-setup.sql,
-- 20260925201612_learning_problem_records.sql, and the recognition migration.
-- This exercises the real learning_save_problem RPC and its real parent/FK,
-- revision, request_id, and RLS table definitions. All data rolls back.
begin;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000011');
insert into public.classes(id,owner_id) values
  ('00000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000011');
insert into public.assignments(id,owner_id,class_id) values
  ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000021');

create function public._test_recognition_save(p_id uuid,p_expected integer,p_request uuid,p_observations jsonb,p_assignment uuid default null)
returns jsonb language plpgsql security invoker as $$
declare exercise text:=case when p_assignment is null then 'course-practice-v2:fixture:question' else 'tutor-fixture' end;
begin
  return public.learning_save_problem(p_id,'00000000-0000-4000-8000-000000000021',p_assignment,exercise,p_expected,p_request,
    jsonb_build_object('schemaVersion','problem-state-v1','id',p_id,'revision',p_expected+1,
      'scope',jsonb_build_object('classId','00000000-0000-4000-8000-000000000021',
        'assignmentId',p_assignment,'exerciseId',exercise),'observations',p_observations));
end $$;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-8000-000000000011';
do $$ begin
  if public.learning_recognition_provenance_ready(repeat('a',32),repeat('0',64)) then
    raise exception 'readiness accepted without a key';
  end if;
end $$;
select public._test_recognition_save('00000000-0000-4000-8000-000000000001',0,
  '10000000-0000-4000-8000-000000000001',jsonb_build_array(jsonb_build_object(
    'id','response','field','response','role','student_step','modality','typed',
    'provenance','student_entered','text','manual answer')));

do $$ begin
  begin
    perform public._test_recognition_save('00000000-0000-4000-8000-000000000002',0,
      '10000000-0000-4000-8000-000000000002',jsonb_build_array(jsonb_build_object(
        'id','response','field','response','role','student_step','modality','voice',
        'provenance','machine_interpretation','text','unproved answer')));
    raise exception 'unproved machine response was accepted';
  exception when others then
    if sqlerrm <> 'recognition_proof_required' then raise; end if;
  end;
  begin
    perform public._test_recognition_save('00000000-0000-4000-8000-000000000003',0,
      '10000000-0000-4000-8000-000000000003',jsonb_build_array(jsonb_build_object(
        'id','prompt','field','prompt','role','problem_statement','modality','typed',
        'provenance','machine_interpretation','text','forged prompt')));
    raise exception 'class-scoped non-response machine claim was accepted';
  exception when others then
    if sqlerrm <> 'invalid_recognition_provenance' then raise; end if;
  end;
  if exists(select 1 from public.learning_problem_records where id in
    ('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003')) then
    raise exception 'rejected RPC left a parent record';
  end if;
end $$;

reset role;
insert into diana_private.learning_recognition_key(singleton,key_bytes)
values (true,decode(repeat('11',32),'hex'));
set local role authenticated;
do $$ declare
  secret bytea:=decode(repeat('11',32),'hex');
  challenge text:=repeat('a',32); signature text;
  response_text text:='recognized answer';
  issued_ms bigint:=(extract(epoch from clock_timestamp())*1000)::bigint;
  evidence jsonb; payload jsonb; encoded text; proof text; response jsonb;
begin
  signature:=encode(extensions.hmac(convert_to(challenge,'UTF8'),secret,'sha256'),'hex');
  if not public.learning_recognition_provenance_ready(challenge,signature) then
    raise exception 'matching key was not ready';
  end if;
  if public.learning_recognition_provenance_ready(challenge,repeat('0',64)) then
    raise exception 'mismatched key was ready';
  end if;
  evidence:=jsonb_build_object('version','recognition-evidence-v1','kind','speech',
    'assetHash',repeat('a',64),'textHash',encode(extensions.digest(convert_to(response_text,'UTF8'),'sha256'),'hex'),
    'modelId','fixture','revision',repeat('b',40),'fileManifestHash',repeat('c',64),
    'issuedAt',issued_ms,'networkUsed',false,'confidence',null);
  payload:=evidence||jsonb_build_object('ownerId','00000000-0000-4000-8000-000000000011','expiresAt',issued_ms+900000);
  encoded:=replace(replace(trim(trailing '=' from replace(encode(convert_to(payload::text,'UTF8'),'base64'),E'\n','')),'+','-'),'/','_');
  proof:=encoded||'.'||replace(replace(trim(trailing '=' from encode(extensions.hmac(convert_to(encoded,'UTF8'),secret,'sha256'),'base64')),'+','-'),'/','_');
  response:=jsonb_build_object('id','response','field','response','role','student_step','modality','voice',
    'provenance','machine_interpretation','text',response_text,
    'recognitionEvidence',evidence,'recognitionProof',proof);

  perform public._test_recognition_save('00000000-0000-4000-8000-000000000005',0,
    '10000000-0000-4000-8000-000000000005',jsonb_build_array(response));
  perform public._test_recognition_save('00000000-0000-4000-8000-000000000005',1,
    '10000000-0000-4000-8000-000000000006',jsonb_build_array(response));
  begin
    perform public._test_recognition_save('00000000-0000-4000-8000-000000000006',0,
      '10000000-0000-4000-8000-000000000007',jsonb_build_array(response||jsonb_build_object('text','edited answer')));
    raise exception 'edited response was accepted';
  exception when others then
    if sqlerrm <> 'invalid_recognition_provenance' then raise; end if;
  end;
  begin
    perform public._test_recognition_save('00000000-0000-4000-8000-000000000007',0,
      '10000000-0000-4000-8000-000000000008',jsonb_build_array(response||jsonb_build_object('recognitionProof',encoded||'.'||repeat('A',43))));
    raise exception 'forged proof was accepted';
  exception when others then
    if sqlerrm <> 'invalid_recognition_proof' then raise; end if;
  end;
  begin
    perform public._test_recognition_save('00000000-0000-4000-8000-000000000004',0,
      '10000000-0000-4000-8000-000000000009',jsonb_build_array(jsonb_build_object(
        'id','prompt','field','prompt','role','problem_statement','modality','typed',
        'provenance','student_entered','text','prompt','recognitionEvidence',evidence,'recognitionProof',proof)));
    raise exception 'non-response proof was accepted';
  exception when others then
    if sqlerrm <> 'invalid_recognition_provenance' then raise; end if;
  end;
  perform public._test_recognition_save('00000000-0000-4000-8000-000000000005',2,
    '10000000-0000-4000-8000-000000000010',jsonb_build_array(jsonb_build_object(
      'id','response','field','response','role','student_step','modality','typed',
      'provenance','student_entered','text','student edit')));
  -- Assignment tutoring legitimately persists a machine-made prompt; this
  -- recognition guard applies to class-scoped records with null assignment.
  perform public._test_recognition_save('00000000-0000-4000-8000-000000000008',0,
    '10000000-0000-4000-8000-000000000011',jsonb_build_array(jsonb_build_object(
      'id','prompt','field','prompt','role','problem_statement','modality','typed',
      'provenance','machine_interpretation','text','tutor-generated prompt')),
    '00000000-0000-4000-8000-000000000031');
end $$;
rollback;
