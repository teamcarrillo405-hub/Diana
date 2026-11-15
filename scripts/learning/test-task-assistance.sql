-- Disposable isolated PostgreSQL only; every fixture rolls back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='20s';
CREATE FUNCTION pg_temp.assert_true(value boolean,message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion: %',message; END IF; END $$;
DO $$
DECLARE owner uuid:=gen_random_uuid(); other_owner uuid:=gen_random_uuid(); assignment uuid:=gen_random_uuid();
  task uuid:=gen_random_uuid(); transfer uuid:=gen_random_uuid(); worksheet uuid:=gen_random_uuid(); source text:=repeat('a',64);
  request uuid:=gen_random_uuid(); session jsonb; result jsonb; original jsonb; attempt jsonb; snap text; receipt jsonb;
BEGIN
  INSERT INTO auth.users VALUES(owner),(other_owner);
  INSERT INTO public.assignments(id,owner_id) VALUES(assignment,owner);
  -- Operator-only fixture activation; provisioning and staged guards are tested separately.
  UPDATE public.learning_task_assistance_control SET enforced=true;
  INSERT INTO public.learning_exercises VALUES
    ('task-a',owner,assignment,source,'math.linear_equations','Find a value of x that satisfies 2x=8.','{"kind":"equation_value","equation":"2x=8"}',true),
    ('task-a-reindexed',owner,assignment,repeat('b',64),'math.linear_equations','Find a value of x that satisfies 2x=8.','{"kind":"equation_value","equation":"2x=8"}',true),
    ('task-b',owner,assignment,source,'math.linear_equations','Find a value of x that satisfies 3x=15.','{"kind":"equation_value","equation":"3x=15"}',true),
    ('unreviewed',owner,assignment,source,'math.linear_equations','2x=7','{}',false);
  snap:=public.learning_task_sha256('Find a value of x that satisfies 2x=8.');
  BEGIN PERFORM public.learning_start_independent(owner,assignment,'task-a'); RAISE EXCEPTION 'unbound start allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.learning_register_task(owner,assignment,task,'reviewed_transfer',task::text,public.learning_task_sha256('2x=7'),'fresh_transfer_reviewed','unreviewed');
    RAISE EXCEPTION 'unreviewed transfer allowed'; EXCEPTION WHEN invalid_parameter_value OR insufficient_privilege THEN NULL; END;
  receipt:=public.learning_register_task(owner,assignment,task,'reviewed_transfer',task::text,snap,'fresh_transfer_reviewed','task-a');
  PERFORM pg_temp.assert_true(receipt=public.learning_register_task(owner,assignment,task,'reviewed_transfer',task::text,snap,'fresh_transfer_reviewed','task-a'),'task replay');
  PERFORM public.learning_bind_exercise(owner,assignment,task,'task-a',snap);
  PERFORM public.learning_bind_exercise(owner,assignment,task,'task-a-reindexed',snap);
  session:=public.learning_start_independent(owner,assignment,'task-a');
  receipt:=public.learning_begin_task_assistance(owner,assignment,task,request,source,snap,'local','hint');
  PERFORM pg_temp.assert_true(receipt=public.learning_begin_task_assistance(owner,assignment,task,request,source,snap,'local','hint'),'assistance exact replay');
  BEGIN PERFORM public.learning_begin_task_assistance(owner,assignment,task,request,source,snap,'api','hint'); RAISE EXCEPTION 'changed replay allowed'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM public.learning_begin_task_assistance(other_owner,assignment,task,gen_random_uuid(),source,snap,'api','hint'); RAISE EXCEPTION 'other owner allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.learning_begin_task_assistance(owner,assignment,task,gen_random_uuid(),source,repeat('c',64),'api','hint'); RAISE EXCEPTION 'stale source allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  BEGIN PERFORM public.learning_start_independent(owner,assignment,'task-a-reindexed'); RAISE EXCEPTION 'reindex reset assistance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.learning_start_independent(owner,assignment,'task-a'); RAISE EXCEPTION 'new session reset assistance'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId','task-a','revision',1,'sessionId',session->>'id',
    'assistance','independent','confirmed',true,'modality','typed','subject','math');
  result:=public.learning_record_attempt(owner,attempt,repeat('d',64),'{"status":"supported","outcome":"supported","eligibleForKnowledge":true}');
  PERFORM pg_temp.assert_true(result->'assessment'->>'eligibleForKnowledge'='false','help during session blocked');
  snap:=public.learning_task_sha256('Find a value of x that satisfies 3x=15.');
  PERFORM public.learning_register_task(owner,assignment,transfer,'reviewed_transfer',transfer::text,snap,'fresh_transfer_reviewed','task-b');
  PERFORM public.learning_bind_exercise(owner,assignment,transfer,'task-b',snap);
  session:=public.learning_start_independent(owner,assignment,'task-b');
  attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId','task-b','revision',1,'sessionId',session->>'id',
    'assistance','independent','confirmed',true,'modality','typed','subject','math');
  original:=public.learning_record_attempt(owner,attempt,repeat('e',64),'{"status":"supported","outcome":"supported"}');
  PERFORM pg_temp.assert_true(original->'assessment'->>'eligibleForKnowledge'='true','distinct same-skill transfer remains independent');
  PERFORM public.learning_begin_task_assistance(owner,assignment,transfer,gen_random_uuid(),source,snap,'api','guide');
  result:=public.learning_record_attempt(owner,attempt,repeat('e',64),'{"status":"supported","outcome":"supported"}');
  PERFORM pg_temp.assert_true(result->'assessment'=original->'assessment','later assistance preserves committed historical attempt');
  PERFORM pg_temp.assert_true(result->>'replayed'='true','attempt replay preserved');

  INSERT INTO public.assignment_problems VALUES(worksheet,owner,assignment,1,'Solve 4x=20.','manual','problem');
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);
  snap:=public.learning_task_sha256('Solve 4x=20.');
  BEGIN PERFORM public.learning_register_task(owner,assignment,worksheet,'worksheet_problem',worksheet::text,snap,'fresh_transfer_reviewed','task-b');
    RAISE EXCEPTION 'legacy worksheet certified as fresh'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  receipt:=public.learning_register_worksheet_task(assignment,worksheet,snap);
  PERFORM pg_temp.assert_true(receipt->>'trustBasis'='legacy_unresolved','worksheet wrapper cannot mint independence');
  INSERT INTO public.learning_documents(id,owner_id,assignment_id,document_id,pages) VALUES(source,owner,assignment,'assignment-problems','[{"page":1,"text":"1. Solve 4x=20.","interpretation":"original"}]');
  PERFORM public.learning_bind_worksheet_source(assignment,worksheet,source,1,snap);
  INSERT INTO public.learning_blocks VALUES('worksheet-block',owner,source,'{"location":{"page":1},"kind":"problem","needsConfirmation":false,"text":"1. Solve 4x=20."}');
  INSERT INTO public.learning_exercises VALUES('worksheet-block:value',owner,assignment,source,'math.linear_equations','Find a value of x that satisfies 4x=20.','{"kind":"equation_value","equation":"4x=20"}',true);
  PERFORM public.learning_bind_exercise(owner,assignment,worksheet,'worksheet-block:value',snap);
  BEGIN PERFORM public.learning_start_independent(owner,assignment,'worksheet-block:value'); RAISE EXCEPTION 'legacy gained trust'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM public.learning_begin_task_assistance(owner,assignment,worksheet,gen_random_uuid(),NULL,snap,'local','check');
  UPDATE public.assignment_problems SET problem_text='Solve 4x=24.' WHERE id=worksheet;
  result:=public.learning_register_worksheet_task(assignment,worksheet,public.learning_task_sha256('Solve 4x=24.'));
  PERFORM pg_temp.assert_true(result->>'taskId'=worksheet::text AND result->>'initialSnapshotSha256'=snap,'edited worksheet retains task and initial snapshot');
  BEGIN PERFORM public.learning_begin_task_assistance(owner,assignment,worksheet,gen_random_uuid(),NULL,snap,'local','hint'); RAISE EXCEPTION 'old worksheet snapshot allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  DELETE FROM public.assignment_problems WHERE id=worksheet;
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.learning_assistance_events WHERE task_id=worksheet),'worksheet deletion cannot clear assistance');
  PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated','public.learning_register_task(uuid,uuid,uuid,text,text,text,text,text)','EXECUTE'),'no student fresh transfer RPC');
  PERFORM pg_temp.assert_true(NOT has_function_privilege('service_role','public.learning_record_attempt_pre_task_v1(uuid,jsonb,text,jsonb)','EXECUTE'),'no old gate bypass');
  PERFORM pg_temp.assert_true(NOT has_table_privilege('authenticated','public.learning_assistance_events','INSERT,UPDATE,DELETE'),'no student ledger mutations');
  PERFORM pg_temp.assert_true(NOT has_table_privilege('service_role','public.learning_assistance_events','UPDATE,DELETE'),'no service ledger reset');
END $$;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.learning_begin_task_assistance(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),NULL,repeat('a',64),'local','hint');
    RAISE EXCEPTION 'authenticated assistance write allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'task_assistance_behavior_passed_all_fixtures_rolled_back' AS result;
