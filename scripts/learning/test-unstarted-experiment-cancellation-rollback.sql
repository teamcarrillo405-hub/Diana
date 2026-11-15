-- Review first; run only after the additive RPC is installed and experiments stop.
-- No DDL, provider calls, actual student reads, or persistent fixture writes.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL statement_timeout='15s';
SET LOCAL lock_timeout='2s';
SET LOCAL idle_in_transaction_session_timeout='20s';
DO $$
DECLARE
  owner_id uuid:=gen_random_uuid(); batch_id uuid:=gen_random_uuid();
  ids uuid[]:=ARRAY[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
  manifest text:=repeat('a',64); current_month date:=date_trunc('month',now() AT TIME ZONE 'UTC')::date;
  initial_spent integer; initial_reserved integer; idx integer;
BEGIN
  IF has_function_privilege('anon','public.learning_cancel_unstarted_experiment(uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.learning_cancel_unstarted_experiment(uuid,text)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.learning_cancel_unstarted_experiment(uuid,text)','EXECUTE')
    THEN RAISE EXCEPTION 'cancellation role grants'; END IF;
  -- Exercise the real signup trigger with a disposable, explicitly synthetic adult.
  INSERT INTO auth.users(id,raw_user_meta_data)
    VALUES(owner_id,'{"date_of_birth":"1990-01-01","display_name":"Synthetic cancellation fixture"}'::jsonb);
  INSERT INTO public.learning_experiment_months(month) VALUES(current_month) ON CONFLICT DO NOTHING;
  SELECT spent_cents,reserved_cents INTO initial_spent,initial_reserved
    FROM public.learning_experiment_months WHERE month=current_month FOR UPDATE;
  FOR idx IN 1..6 LOOP
    IF public.learning_reserve_experiment(ids[idx],manifest,1,batch_id,6) IS DISTINCT FROM true
      THEN RAISE EXCEPTION 'synthetic reserve unavailable; need six cents of headroom'; END IF;
  END LOOP;
  IF public.learning_cancel_unstarted_experiment(gen_random_uuid(),manifest) IS DISTINCT FROM false
    OR public.learning_cancel_unstarted_experiment(ids[1],repeat('b',64)) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'identity fence'; END IF;
  IF public.learning_cancel_unstarted_experiment(ids[1],manifest) IS DISTINCT FROM true
    OR public.learning_cancel_unstarted_experiment(ids[1],manifest) IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'zero cancellation / idempotency'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE id=ids[1] AND state='settled' AND actual_cents=0)
    OR public.learning_reserve_experiment(ids[1],manifest,1,batch_id,6) IS DISTINCT FROM false
    OR public.learning_start_experiment_provider(ids[1],owner_id,manifest,'synthetic-model',25,200,now()) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'settled row must retain replay fence'; END IF;
  -- Isolate the state fence from the independent receipt fence.
  UPDATE public.learning_experiment_reservations SET state='started' WHERE id=ids[2];
  IF public.learning_cancel_unstarted_experiment(ids[2],manifest) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'started fence'; END IF;
  IF public.learning_start_experiment_provider(ids[3],owner_id,manifest,'synthetic-model',25,200,now()) IS DISTINCT FROM true
    THEN RAISE EXCEPTION 'synthetic receipt creation'; END IF;
  UPDATE public.learning_experiment_reservations SET state='reserved' WHERE id=ids[3];
  IF public.learning_cancel_unstarted_experiment(ids[3],manifest) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'receipt fence'; END IF;
  INSERT INTO public.learning_experiment_outputs(request_id,owner_id,input_hash,manifest,result)
    VALUES(ids[4],owner_id,manifest,'{"synthetic":true}'::jsonb,'{"synthetic":true}'::jsonb);
  IF public.learning_cancel_unstarted_experiment(ids[4],manifest) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'raw output fence'; END IF;
  UPDATE public.learning_experiment_reservations SET created_at=now()-interval '3 minutes' WHERE id=ids[5];
  IF public.learning_cancel_unstarted_experiment(ids[5],manifest) IS DISTINCT FROM false
    THEN RAISE EXCEPTION 'old reservation fence'; END IF;
  -- A subtransaction exercises the guarded monetary failure and rolls it back.
  BEGIN
    UPDATE public.learning_experiment_months SET reserved_cents=0 WHERE month=current_month;
    PERFORM public.learning_cancel_unstarted_experiment(ids[6],manifest);
    RAISE EXCEPTION 'accepted unavailable reservation money';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM<>'Reservation money unavailable' THEN RAISE; END IF;
  END;
  IF NOT EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE id=ids[6] AND state='reserved' AND actual_cents IS NULL)
    OR NOT EXISTS(SELECT 1 FROM public.learning_experiment_months WHERE month=current_month
      AND spent_cents=initial_spent AND reserved_cents=initial_reserved+5)
    THEN RAISE EXCEPTION 'monetary conservation / rollback'; END IF;
  PERFORM set_config('diana.unstarted_cancellation_smoke',jsonb_build_object(
    'schema','integrated-unstarted-cancellation-smoke-v1','checksPassed',true,
    'syntheticReservations',6,'zeroSettlements',1,'retainedReservations',5,
    'spentDeltaCents',0,'reservedDeltaCents',5,'providerNetworkCalls',0,
    'fixtureTransaction','rollback-required','concurrencyTested',false)::text,true);
END $$;
SELECT current_setting('diana.unstarted_cancellation_smoke')::jsonb AS content_free_result;
ROLLBACK;
