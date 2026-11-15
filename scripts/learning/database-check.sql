-- Run against the configured staging project. All fixture writes roll back.
-- This uses the existing synthetic QA account and assignment only after checking ownership.
BEGIN;
SET LOCAL statement_timeout='20s';
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.assignments WHERE id='0a56fa43-3e0a-4fc1-9f43-dc65c529f080'
    AND owner_id='ad37c468-67f5-4b5f-9e28-b5e947a4075c') THEN RAISE EXCEPTION 'Synthetic QA assignment is unavailable'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','ad37c468-67f5-4b5f-9e28-b5e947a4075c',true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE v jsonb; source jsonb; chunk jsonb; class uuid; result text; count_rows integer;
BEGIN
  SELECT class_id INTO class FROM public.assignments WHERE id='0a56fa43-3e0a-4fc1-9f43-dc65c529f080';
  v:=jsonb_build_object('id',repeat('a',64),'ownerId',auth.uid(),'documentId','engineering-rls-fixture',
    'assignmentId','0a56fa43-3e0a-4fc1-9f43-dc65c529f080','classId',class,'contentHash',repeat('b',64),
    'trainingPermission','excluded');
  source:=jsonb_build_object('id',repeat('c',64),'versionId',repeat('a',64),'text','A linear equation preserves equality.');
  chunk:=jsonb_build_object('id',repeat('c',64),'versionId',repeat('a',64),'ownerId',auth.uid(),
    'assignmentId','0a56fa43-3e0a-4fc1-9f43-dc65c529f080','text','A linear equation preserves equality.');
  result:=public.learning_store_document(jsonb_build_object('version',v,'pages','[]'::jsonb,
    'blocks',jsonb_build_array(source),'chunks',jsonb_build_array(chunk)));
  IF result<>repeat('a',64) THEN RAISE EXCEPTION 'Document write result mismatch'; END IF;
  SELECT count(*) INTO count_rows FROM public.learning_search('0a56fa43-3e0a-4fc1-9f43-dc65c529f080',ARRAY[repeat('a',64)],'linear equation');
  IF count_rows<>1 THEN RAISE EXCEPTION 'Owner lexical retrieval mismatch'; END IF;
  IF has_function_privilege('authenticated','public.learning_record_attempt(uuid,jsonb,text,jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Student can forge assessment records';
  END IF;
  IF has_table_privilege('authenticated','public.learning_exercises','SELECT') THEN RAISE EXCEPTION 'Answer keys exposed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000999',true);
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM public.learning_documents WHERE id=repeat('a',64))
    OR EXISTS(SELECT 1 FROM public.learning_chunks WHERE id=repeat('c',64)) THEN RAISE EXCEPTION 'Cross-owner read'; END IF;
  IF EXISTS(SELECT 1 FROM public.learning_search('0a56fa43-3e0a-4fc1-9f43-dc65c529f080',ARRAY[repeat('a',64)],'linear')) THEN
    RAISE EXCEPTION 'Cross-owner retrieval';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','ad37c468-67f5-4b5f-9e28-b5e947a4075c',true);
DO $$
DECLARE event jsonb; first_result jsonb; replay_result jsonb; count_rows integer;
BEGIN
  event:=jsonb_build_object('eventId','engineering-replay-fixture','kind','note','item',jsonb_build_object(
    'title','Engineering replay fixture','bodyText','Synthetic sample','noteId',null,'assignmentId',null,'classId',null,'source','manual'));
  first_result:=public.apply_offline_event(auth.uid(),event);
  replay_result:=public.apply_offline_event(auth.uid(),event);
  IF first_result->>'noteId'<>replay_result->>'noteId' OR replay_result->>'replayed'<>'true' THEN RAISE EXCEPTION 'Replay duplicated a note'; END IF;
  SELECT count(*) INTO count_rows FROM public.notes WHERE id=(first_result->>'noteId')::uuid;
  IF count_rows<>1 THEN RAISE EXCEPTION 'Replay note count mismatch'; END IF;
  IF public.apply_offline_event(auth.uid(),jsonb_build_object('eventId','status-fixture','kind','assignment','item','{}'::jsonb))->>'status'<>'needs_confirmation' THEN
    RAISE EXCEPTION 'Assignment status replayed automatically';
  END IF;
END $$;
RESET ROLE;
DO $$
DECLARE first_id uuid:=gen_random_uuid(); second_id uuid:=gen_random_uuid(); batch uuid:=gen_random_uuid(); attempt jsonb; result jsonb;
BEGIN
  IF NOT public.learning_reserve_experiment(first_id,repeat('d',64),250,batch,400) THEN RAISE EXCEPTION 'Reservation denied'; END IF;
  IF public.learning_reserve_experiment(first_id,repeat('d',64),250,batch,400) THEN RAISE EXCEPTION 'Duplicate reservation authorized'; END IF;
  IF public.learning_reserve_experiment(second_id,repeat('d',64),200,batch,400) THEN RAISE EXCEPTION 'Batch cap exceeded'; END IF;
  IF NOT public.learning_settle_experiment(first_id,100) THEN RAISE EXCEPTION 'Settlement denied'; END IF;
  IF public.learning_settle_experiment(first_id,100) THEN RAISE EXCEPTION 'Duplicate settlement applied'; END IF;
  IF NOT public.learning_reserve_experiment(second_id,repeat('d',64),300,batch,400) THEN RAISE EXCEPTION 'Remaining batch budget unavailable'; END IF;
  attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId','0a56fa43-3e0a-4fc1-9f43-dc65c529f080','problemId','engineering-revision-fixture','revision',1);
  result:=public.learning_record_attempt('ad37c468-67f5-4b5f-9e28-b5e947a4075c',attempt,repeat('e',64),'{"outcome":"unknown"}');
  IF result->>'replayed'<>'false' THEN RAISE EXCEPTION 'Initial attempt not written'; END IF;
  result:=public.learning_record_attempt('ad37c468-67f5-4b5f-9e28-b5e947a4075c',attempt,repeat('e',64),'{"outcome":"supported"}');
  IF result->>'replayed'<>'true' OR result->'assessment'->>'outcome'<>'unknown' THEN RAISE EXCEPTION 'Append-only attempt mutated'; END IF;
  BEGIN
    PERFORM public.learning_record_attempt('ad37c468-67f5-4b5f-9e28-b5e947a4075c',attempt||jsonb_build_object('id',gen_random_uuid(),'revision',3),repeat('f',64),'{}');
    RAISE EXCEPTION 'Revision gap accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
ROLLBACK;
SELECT 'owner_rls_retrieval_replay_revision_and_budget_checks_passed_all_fixtures_rolled_back' AS verification;

BEGIN;
SET LOCAL statement_timeout='20s';
DO $$
DECLARE owner uuid:='ad37c468-67f5-4b5f-9e28-b5e947a4075c'; assignment uuid:='0a56fa43-3e0a-4fc1-9f43-dc65c529f080';
  version text; problem text:='session-fixture-'||gen_random_uuid()::text; session jsonb; attempt jsonb; result jsonb;
BEGIN
  SELECT id INTO version FROM public.learning_documents WHERE owner_id=owner AND assignment_id=assignment LIMIT 1;
  IF version IS NULL THEN RAISE EXCEPTION 'Prepare the synthetic QA source first'; END IF;
  INSERT INTO public.learning_exercises(id,owner_id,assignment_id,version_id,skill_id,prompt,specification,reviewed)
    VALUES(problem,owner,assignment,version,'math.linear_equations','Synthetic session check','{"kind":"equation_value","equation":"2x=4","variable":"x","solutionSetComplete":false}',false);
  BEGIN
    PERFORM public.learning_start_independent(owner,assignment,problem);
    RAISE EXCEPTION 'Unreviewed problem issued an independent session';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.learning_exercises SET reviewed=true WHERE id=problem;
  session:=public.learning_start_independent(owner,assignment,problem);
  attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId',problem,'revision',1,
    'sessionId',session->>'id','assistance','independent','confirmed',true,'modality','typed','subject','math');
  result:=public.learning_record_attempt(owner,attempt,repeat('a',64),'{"status":"supported","outcome":"supported","eligibleForKnowledge":false}');
  IF result->'assessment'->>'eligibleForKnowledge'<>'true' THEN RAISE EXCEPTION 'Reviewed first attempt was not eligible'; END IF;
  result:=public.learning_record_attempt(owner,attempt||jsonb_build_object('id',gen_random_uuid(),'revision',2),repeat('b',64),'{"status":"supported","outcome":"supported","eligibleForKnowledge":true}');
  IF result->'assessment'->>'eligibleForKnowledge'<>'false' THEN RAISE EXCEPTION 'Session reused for knowledge evidence'; END IF;
  IF has_function_privilege('authenticated','public.learning_start_independent(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Student bypassed session guard'; END IF;
END $$;
ROLLBACK;
SELECT 'reviewed_session_first_attempt_and_one_use_checks_passed_all_fixtures_rolled_back' AS verification;
