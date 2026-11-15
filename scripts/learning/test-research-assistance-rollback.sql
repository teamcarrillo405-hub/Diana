-- After reviewed schema installation only. Synthetic metadata, no model calls.
-- Every fixture, permit, ledger write and cent reservation is rolled back.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='30s';
DO $$
DECLARE owner_id uuid:=gen_random_uuid(); adult_id uuid:=gen_random_uuid(); class_id uuid:=gen_random_uuid(); assignment_id uuid:=gen_random_uuid();
  ids uuid[]:=ARRAY[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  manifest text:=repeat('a',64); body_hash text:=repeat('b',64); approval_hash text:=repeat('c',64); payload text;
  batch_id uuid:=gen_random_uuid(); idx integer; receipt jsonb; replay jsonb; initial_control boolean;
  current_month date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date; initial_spent integer; initial_reserved integer;
  signature text; role_name text;
BEGIN
  SELECT enforced INTO initial_control FROM public.learning_task_assistance_control WHERE singleton;
  IF initial_control IS DISTINCT FROM false THEN RAISE EXCEPTION 'Run staged smoke only'; END IF;
  FOREACH signature IN ARRAY ARRAY[
    'public.learning_provision_research_assistance(uuid,text,uuid,uuid,text,text,text,timestamptz)',
    'public.learning_revoke_research_assistance(uuid,text,text)',
    'public.learning_research_assistance_ready(uuid,text,uuid,uuid,text,text)',
    'public.learning_begin_research_assistance(uuid,text,uuid,uuid,text,text)'] LOOP
    IF NOT has_function_privilege('service_role',signature,'EXECUTE') THEN RAISE EXCEPTION 'missing service RPC'; END IF;
    FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_function_privilege(role_name,signature,'EXECUTE') THEN RAISE EXCEPTION 'research RPC public access'; END IF;
    END LOOP;
  END LOOP;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_table_privilege(role_name,'public.learning_research_assistance_permits','INSERT,UPDATE,DELETE')
      OR has_function_privilege(role_name,'public.learning_activate_task_assistance()','EXECUTE') THEN RAISE EXCEPTION 'table mutation or activation grant'; END IF;
  END LOOP;
  IF public.learning_research_assistance_payload('00000000-0000-4000-8000-000000000002',manifest,
    '00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003',
    '7b9db4041ea5a01bd050e8b796bc0729729c42a0286196697da3135bcfbe47b0')
    <> 'ed123325e9d1cd834899b9c492943834f2347944ad304e85317a5a9bb6b2414a' THEN RAISE EXCEPTION 'TypeScript SQL payload parity'; END IF;
  -- Real signup/profile constraints, opaque metadata and supported teen permission.
  INSERT INTO auth.users(id,raw_user_meta_data) VALUES(owner_id,jsonb_build_object('date_of_birth',(current_date-interval '15 years')::date,'display_name','Synthetic permit fixture',
    'teen_guardian_permission_attested',true,'teen_guardian_permission_policy_version','teen_openai_beta_v1','teen_guardian_permission_source','signup_attestation'));
  INSERT INTO auth.users(id,raw_user_meta_data) VALUES(adult_id,'{"date_of_birth":"1990-01-01","display_name":"Synthetic adult permit fixture"}'::jsonb);
  UPDATE public.profiles SET consent_ai=true,teen_guardian_permission_attested_at=clock_timestamp(),
    teen_guardian_permission_policy_version='teen_openai_beta_v1',teen_guardian_permission_source='synthetic_qa_fixture',teen_guardian_permission_withdrawn_at=NULL WHERE user_id=owner_id;
  UPDATE public.profiles SET consent_ai=true WHERE user_id=adult_id;
  IF NOT public.learning_research_profile_allowed(owner_id) OR NOT public.learning_research_profile_allowed(adult_id) THEN RAISE EXCEPTION 'supported age policy'; END IF;
  INSERT INTO public.classes(id,owner_id,name,ai_mode) VALUES(class_id,owner_id,'Synthetic permit class','green');
  INSERT INTO public.assignments(id,owner_id,class_id,title) VALUES(assignment_id,owner_id,class_id,'Synthetic permit assignment');
  INSERT INTO public.learning_experiment_months(month) VALUES(current_month) ON CONFLICT DO NOTHING;
  SELECT spent_cents,reserved_cents INTO initial_spent,initial_reserved FROM public.learning_experiment_months WHERE month=current_month FOR UPDATE;
  FOR idx IN 1..6 LOOP
    payload:=public.learning_research_assistance_payload(ids[idx],manifest,owner_id,assignment_id,body_hash);
    IF public.learning_research_assistance_ready(ids[idx],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'missing permit accepted'; END IF;
    PERFORM public.learning_provision_research_assistance(ids[idx],manifest,owner_id,assignment_id,body_hash,payload,approval_hash,clock_timestamp()+interval '1 hour');
    IF NOT public.learning_research_assistance_ready(ids[idx],manifest,owner_id,assignment_id,body_hash,payload)
      OR public.learning_research_assistance_ready(ids[idx],repeat('d',64),owner_id,assignment_id,body_hash,payload)
      OR public.learning_research_assistance_ready(ids[idx],manifest,adult_id,assignment_id,body_hash,payload)
      OR public.learning_research_assistance_ready(ids[idx],manifest,owner_id,gen_random_uuid(),body_hash,payload)
      OR public.learning_research_assistance_ready(ids[idx],manifest,owner_id,assignment_id,repeat('e',64),payload)
      OR public.learning_research_assistance_ready(ids[idx],manifest,owner_id,assignment_id,body_hash,repeat('f',64)) THEN RAISE EXCEPTION 'exact identity gate'; END IF;
  END LOOP;
  payload:=public.learning_research_assistance_payload(ids[1],manifest,owner_id,assignment_id,body_hash);
  -- Revoked guardian permission disables readiness without changing supported age policy.
  UPDATE public.profiles SET consent_ai=false,teen_guardian_permission_withdrawn_at=clock_timestamp() WHERE user_id=owner_id;
  IF public.learning_research_profile_allowed(owner_id) OR public.learning_research_assistance_ready(ids[1],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'revoked teen permission'; END IF;
  UPDATE public.profiles SET consent_ai=true,teen_guardian_permission_withdrawn_at=NULL WHERE user_id=owner_id;
  UPDATE public.classes SET ai_mode='yellow' WHERE id=class_id;
  IF public.learning_research_assistance_ready(ids[1],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'yellow class'; END IF;
  UPDATE public.classes SET ai_mode='green' WHERE id=class_id;
  BEGIN
    INSERT INTO public.data_deletion_requests(owner_id,status) VALUES(owner_id,'requested');
    IF public.learning_research_assistance_ready(ids[1],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'deletion readiness accepted'; END IF;
    RAISE EXCEPTION 'rollback synthetic deletion fixture' USING ERRCODE='P0002';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  -- No allowance may be re-provisioned or extended.
  BEGIN
    PERFORM public.learning_provision_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload,approval_hash,clock_timestamp()+interval '2 hours');
    RAISE EXCEPTION 'duplicate permit accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  -- Every consume requires an actual fresh monetary reservation.
  BEGIN
    PERFORM public.learning_begin_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload);
    RAISE EXCEPTION 'missing reservation accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  FOR idx IN 1..6 LOOP
    IF public.learning_reserve_experiment(ids[idx],manifest,1,batch_id,6) IS DISTINCT FROM true THEN RAISE EXCEPTION 'need six cents of smoke headroom'; END IF;
  END LOOP;
  BEGIN
    INSERT INTO public.data_deletion_requests(owner_id,status) VALUES(owner_id,'requested');
    BEGIN
      PERFORM public.learning_begin_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload);
      RAISE EXCEPTION 'deletion consume accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    RAISE EXCEPTION 'rollback synthetic deletion fixture' USING ERRCODE='P0002';
  EXCEPTION WHEN no_data_found THEN NULL; END;
  receipt:=public.learning_begin_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload);
  replay:=public.learning_begin_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload);
  IF receipt<>replay OR receipt->>'scope'<>'assignment' OR receipt->>'independenceBlocked'<>'true'
    OR (SELECT count(*) FROM public.learning_assignment_assistance WHERE request_id=ids[1])<>1
    OR public.learning_research_assistance_ready(ids[1],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'receipt/replay boundary'; END IF;
  PERFORM public.learning_revoke_research_assistance(ids[2],manifest,approval_hash);
  UPDATE public.learning_research_assistance_permits SET created_at=clock_timestamp()-interval '1 hour',expires_at=clock_timestamp()-interval '1 second' WHERE request_id=ids[3];
  UPDATE public.learning_experiment_reservations SET state='started' WHERE id=ids[4];
  BEGIN
    PERFORM public.learning_begin_research_assistance(ids[4],manifest,owner_id,assignment_id,body_hash,
      public.learning_research_assistance_payload(ids[4],manifest,owner_id,assignment_id,body_hash));
    RAISE EXCEPTION 'started consume accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.learning_experiment_reservations SET state='reserved' WHERE id=ids[4];
  IF public.learning_start_experiment_provider(ids[4],owner_id,manifest,'synthetic-model',25,200,now()) IS DISTINCT FROM true THEN RAISE EXCEPTION 'synthetic provider marker'; END IF;
  -- Isolate the receipt fence even if reservation state were inconsistent.
  UPDATE public.learning_experiment_reservations SET state='reserved' WHERE id=ids[4];
  UPDATE public.learning_experiment_reservations SET created_at=clock_timestamp()-interval '3 minutes' WHERE id=ids[5];
  INSERT INTO public.learning_experiment_outputs(request_id,owner_id,input_hash,manifest,result) VALUES(ids[6],owner_id,manifest,'{"synthetic":true}','{"synthetic":true}');
  FOR idx IN 2..6 LOOP
    payload:=public.learning_research_assistance_payload(ids[idx],manifest,owner_id,assignment_id,body_hash);
    IF public.learning_research_assistance_ready(ids[idx],manifest,owner_id,assignment_id,body_hash,payload) THEN RAISE EXCEPTION 'attempted or invalid permit ready'; END IF;
    BEGIN
      PERFORM public.learning_begin_research_assistance(ids[idx],manifest,owner_id,assignment_id,body_hash,payload);
      RAISE EXCEPTION 'invalid consume accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  END LOOP;
  -- Current policy is rechecked for an otherwise valid idempotent receipt.
  UPDATE public.profiles SET consent_ai=false,teen_guardian_permission_withdrawn_at=clock_timestamp() WHERE user_id=owner_id;
  payload:=public.learning_research_assistance_payload(ids[1],manifest,owner_id,assignment_id,body_hash);
  BEGIN
    PERFORM public.learning_begin_research_assistance(ids[1],manifest,owner_id,assignment_id,body_hash,payload);
    RAISE EXCEPTION 'revoked policy replay accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF (SELECT enforced FROM public.learning_task_assistance_control WHERE singleton) IS DISTINCT FROM initial_control
    OR NOT EXISTS(SELECT 1 FROM public.learning_experiment_months WHERE month=current_month AND spent_cents=initial_spent AND reserved_cents=initial_reserved+6)
    THEN RAISE EXCEPTION 'global control or money unexpectedly changed'; END IF;
  PERFORM set_config('diana.research_assistance_smoke',jsonb_build_object('checksPassed',true,'syntheticProfiles',2,'syntheticPermits',6,
    'assistanceReceipts',1,'providerNetworkCalls',0,'globalEnforcementChanged',false,'spentDeltaCents',0,'reservedDeltaCents',6,
    'fixtureTransaction','rollback-required','concurrencyTested',false)::text,true);
END $$;
SELECT current_setting('diana.research_assistance_smoke')::jsonb AS content_free_result;
ROLLBACK;
