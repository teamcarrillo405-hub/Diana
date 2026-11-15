-- TWO REAL CONNECTIONS. Only this disposable harness port; never shared DBs.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF host(inet_server_addr())<>'127.0.0.1' OR current_setting('port')<>'55449' THEN
    RAISE EXCEPTION 'Disposable local port 55449 required'; END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE TEMP TABLE assistance_race_fixture(round integer,owner_id uuid,assignment_id uuid,task_id uuid,exercise text,snapshot text,session jsonb,attempt jsonb);
UPDATE public.learning_task_assistance_control SET enforced=true;
DO $$
DECLARE actor uuid:=gen_random_uuid(); assignment uuid; course uuid:=gen_random_uuid(); task uuid; exercise text; snap text; session jsonb; attempt jsonb;
BEGIN
  INSERT INTO auth.users VALUES(actor);
  INSERT INTO public.classes VALUES(course,actor,'green');
  FOR i IN 1..4 LOOP
    assignment:=gen_random_uuid();
    INSERT INTO public.assignments VALUES(assignment,actor,course,NULL);
    task:=gen_random_uuid(); exercise:='race-'||task::text; snap:=public.learning_task_sha256('Find a value of x that satisfies 7x=21.');
    INSERT INTO public.learning_exercises VALUES(exercise,actor,assignment,repeat('a',64),'math.linear_equations',
      'Find a value of x that satisfies 7x=21.','{"kind":"equation_value","equation":"7x=21"}',true);
    PERFORM public.learning_register_task(actor,assignment,task,'reviewed_transfer',task::text,snap,'fresh_transfer_reviewed',exercise);
    PERFORM public.learning_bind_exercise(actor,assignment,task,exercise,snap);
    session:=public.learning_start_independent(actor,assignment,exercise);
    attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId',exercise,'revision',1,
      'sessionId',session->>'id','assistance','independent','confirmed',true,'modality','typed','subject','math');
    INSERT INTO assistance_race_fixture VALUES(i,actor,assignment,task,exercise,snap,session,attempt);
  END LOOP;
END $$;
SELECT dblink_connect('task_first',format('host=127.0.0.1 port=55449 dbname=%s user=postgres application_name=task_assistance_first',current_database()));
SELECT dblink_connect('task_second',format('host=127.0.0.1 port=55449 dbname=%s user=postgres application_name=task_assistance_second',current_database()));
SELECT dblink_exec('task_first','SET statement_timeout=''10s''');
SELECT dblink_exec('task_second','SET statement_timeout=''10s''');
DO $$
DECLARE row assistance_race_fixture; assistance_sql text; attempt_sql text; result jsonb; wait_seen boolean;
BEGIN
  FOR row IN SELECT * FROM assistance_race_fixture ORDER BY round LOOP
    assistance_sql:=format('SELECT public.learning_begin_task_assistance(%L::uuid,%L::uuid,%L::uuid,%L::uuid,%L,%L,''local'',''hint'')',
      row.owner_id,row.assignment_id,row.task_id,gen_random_uuid(),repeat('a',64),row.snapshot);
    IF row.round>=3 THEN
      PERFORM dblink_exec('task_first',format('SET request.jwt.claim.sub=%L',row.owner_id));
      PERFORM dblink_exec('task_second',format('SET request.jwt.claim.sub=%L',row.owner_id));
      assistance_sql:=format('SELECT public.learning_begin_assignment_assistance(%L::uuid,%L::uuid,%L,''api'',''guide'')',row.assignment_id,gen_random_uuid(),repeat('b',64));
    END IF;
    attempt_sql:=format('SELECT public.learning_record_attempt(%L::uuid,%L::jsonb,%L,''{"status":"supported","outcome":"supported"}''::jsonb)',
      row.owner_id,row.attempt,repeat('a',64));
    PERFORM dblink_exec('task_first','BEGIN');
    -- Odd rounds: assistance first. Even rounds: independent attempt first.
    -- Rounds 3/4 repeat both orderings for broad assignment assistance.
    SELECT value INTO result FROM dblink('task_first',CASE WHEN row.round%2=1 THEN assistance_sql ELSE attempt_sql END) AS t(value jsonb);
    IF row.round%2=0 AND result->'assessment'->>'eligibleForKnowledge'<>'true' THEN RAISE EXCEPTION 'Early independent attempt rejected'; END IF;
    PERFORM dblink_send_query('task_second',CASE WHEN row.round%2=1 THEN attempt_sql ELSE assistance_sql END);
    wait_seen:=false;
    FOR i IN 1..100 LOOP
      PERFORM pg_stat_clear_snapshot();
      SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='task_assistance_second' AND wait_event='advisory') INTO wait_seen;
      EXIT WHEN wait_seen;
      PERFORM pg_sleep(0.01);
    END LOOP;
    IF NOT wait_seen OR dblink_is_busy('task_second')<>1 THEN RAISE EXCEPTION 'Concurrent operation did not wait on task lock'; END IF;
    PERFORM dblink_exec('task_first','COMMIT');
    SELECT value INTO result FROM dblink_get_result('task_second') AS t(value jsonb);
    IF row.round%2=1 AND result->'assessment'->>'eligibleForKnowledge'<>'false' THEN RAISE EXCEPTION 'Concurrent help escaped eligibility gate'; END IF;
    PERFORM * FROM dblink_get_result('task_second') AS t(value jsonb);
    IF row.round%2=0 AND (SELECT assessment->>'eligibleForKnowledge' FROM public.learning_attempts WHERE id=(row.attempt->>'id')::uuid)<>'true' THEN
      RAISE EXCEPTION 'Later assistance rewrote committed evidence'; END IF;
  END LOOP;
END $$;
SELECT dblink_disconnect('task_first');
SELECT dblink_disconnect('task_second');
BEGIN;
DELETE FROM public.learning_independent_sessions WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM public.learning_attempts WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM public.learning_task_origins WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM public.learning_exercises WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM public.assignments WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM public.classes WHERE owner_id IN (SELECT owner_id FROM assistance_race_fixture);
DELETE FROM auth.users WHERE id IN (SELECT owner_id FROM assistance_race_fixture);
UPDATE public.learning_task_assistance_control SET enforced=false;
COMMIT;
SELECT 'two_connection_assistance_ordering_passed' AS result;
