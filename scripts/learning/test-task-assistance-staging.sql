\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='20s';
DO $$
DECLARE actor uuid:=gen_random_uuid(); assignment uuid:=gen_random_uuid(); course uuid:=gen_random_uuid();
  task uuid:=gen_random_uuid(); new_task uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); receipt jsonb; result jsonb;
  session jsonb; attempt jsonb; source text:=repeat('a',64); new_source text:=repeat('b',64);
BEGIN
  IF (SELECT enforced FROM public.learning_task_assistance_control) THEN RAISE EXCEPTION 'Expected staged default'; END IF;
  INSERT INTO auth.users VALUES(actor);
  INSERT INTO public.classes VALUES(course,actor,'green');
  INSERT INTO public.assignments VALUES(assignment,actor,course,NULL);
  INSERT INTO public.learning_documents(id,owner_id,assignment_id,document_id,pages) VALUES(source,actor,assignment,'reviewed-transfer','[{"page":1,"text":"3x=12"}]');
  INSERT INTO public.learning_exercises VALUES('staged-a',actor,assignment,source,'math.linear_equations','3x=12','{"kind":"equation_value","equation":"3x=12"}',true);
  -- Earlier behavior remains available while the integration is staged.
  session:=public.learning_start_independent(actor,assignment,'staged-a');
  IF session->>'id' IS NULL THEN RAISE EXCEPTION 'Staging broke current independent start'; END IF;
  PERFORM set_config('request.jwt.claim.sub',actor::text,true);
  BEGIN PERFORM public.learning_begin_assignment_assistance(assignment,request,repeat('c',64),'local','guide');
    RAISE EXCEPTION 'Staged help returned protected receipt'; EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL; END;
  BEGIN PERFORM public.learning_activate_task_assistance(); RAISE EXCEPTION 'Activated with no provisioned reference'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.learning_provision_reviewed_transfer(actor,assignment,task,'staged-a'); RAISE EXCEPTION 'No review became fresh'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.learning_transfer_authorizations VALUES('staged-a',actor,assignment,source,public.learning_task_reference('staged-a'),
    public.learning_task_sha256('[{"page":1,"text":"3x=12"}]'::jsonb::text),repeat('d',64),clock_timestamp());
  PERFORM public.learning_provision_reviewed_transfer(actor,assignment,task,'staged-a');
  PERFORM public.learning_activate_task_assistance();
  session:=public.learning_start_independent(actor,assignment,'staged-a');
  receipt:=public.learning_begin_assignment_assistance(assignment,request,repeat('c',64),'local','guide');
  IF receipt->>'scope'<>'assignment' OR receipt->>'independenceBlocked'<>'true' THEN RAISE EXCEPTION 'Missing broad receipt'; END IF;
  IF receipt<>public.learning_begin_assignment_assistance(assignment,request,repeat('c',64),'local','guide') THEN RAISE EXCEPTION 'Broad replay changed'; END IF;
  BEGIN PERFORM public.learning_begin_assignment_assistance(assignment,request,repeat('d',64),'local','guide'); RAISE EXCEPTION 'Broad replay payload changed'; EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN PERFORM public.learning_start_independent(actor,assignment,'staged-a'); RAISE EXCEPTION 'Broad help escaped new session'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  attempt:=jsonb_build_object('id',gen_random_uuid(),'assignmentId',assignment,'problemId','staged-a','revision',1,'sessionId',session->>'id',
    'assistance','independent','confirmed',true,'modality','typed','subject','math');
  result:=public.learning_record_attempt(actor,attempt,repeat('e',64),'{"status":"supported","outcome":"supported"}');
  IF result->'assessment'->>'eligibleForKnowledge'<>'false' THEN RAISE EXCEPTION 'Broad help escaped existing session'; END IF;
  -- Existing source cannot become novel by registering another exercise after help.
  INSERT INTO public.learning_exercises VALUES('staged-old-source',actor,assignment,source,'math.linear_equations','3x=15','{"kind":"equation_value","equation":"3x=15"}',true);
  INSERT INTO public.learning_transfer_authorizations VALUES('staged-old-source',actor,assignment,source,public.learning_task_reference('staged-old-source'),
    public.learning_task_sha256('[{"page":1,"text":"3x=12"}]'::jsonb::text),repeat('f',64),clock_timestamp());
  BEGIN PERFORM public.learning_provision_reviewed_transfer(actor,assignment,new_task,'staged-old-source'); RAISE EXCEPTION 'Old source rebinding escaped broad help'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO public.learning_documents(id,owner_id,assignment_id,document_id,pages) VALUES(new_source,actor,assignment,'new-reviewed-transfer','[{"page":1,"text":"5x=35"}]');
  INSERT INTO public.learning_exercises VALUES('staged-new-source',actor,assignment,new_source,'math.linear_equations','5x=35','{"kind":"equation_value","equation":"5x=35"}',true);
  INSERT INTO public.learning_transfer_authorizations VALUES('staged-new-source',actor,assignment,new_source,public.learning_task_reference('staged-new-source'),
    public.learning_task_sha256('[{"page":1,"text":"5x=35"}]'::jsonb::text),repeat('f',64),clock_timestamp());
  PERFORM public.learning_provision_reviewed_transfer(actor,assignment,new_task,'staged-new-source');
  PERFORM public.learning_start_independent(actor,assignment,'staged-new-source');
  UPDATE public.classes SET ai_mode='yellow' WHERE id=course;
  BEGIN PERFORM public.learning_begin_assignment_assistance(assignment,gen_random_uuid(),repeat('f',64),'api','hint'); RAISE EXCEPTION 'Yellow assistance accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('service_role','public.learning_register_task(uuid,uuid,uuid,text,text,text,text,text)','EXECUTE')
    OR has_function_privilege('service_role','public.learning_activate_task_assistance()','EXECUTE')
    OR has_function_privilege('service_role','public.learning_task_reference(text)','EXECUTE')
    OR has_function_privilege('service_role','public.learning_task_can_start(uuid,uuid,text)','EXECUTE')
    OR has_table_privilege('service_role','public.learning_transfer_authorizations','INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Runtime caller can mint review authority'; END IF;
END $$;
ROLLBACK;
SELECT 'staging_activation_assignment_scope_and_novel_source_passed' AS result;
