-- ISOLATED DATABASE ONLY. Apply the existing experiment ledger and the forward
-- usage receipt migration first. All fixtures in this contract roll back.
\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
CREATE FUNCTION pg_temp.assert_true(value boolean,label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion: %',label; END IF; END $$;
SELECT pg_temp.assert_true(NOT has_table_privilege('authenticated','public.learning_experiment_provider_receipts','SELECT'),'tenant cannot read receipts');
SELECT pg_temp.assert_true(NOT has_table_privilege('service_role','public.learning_experiment_provider_receipts','UPDATE'),'service cannot mutate receipts directly');
SELECT pg_temp.assert_true(NOT has_function_privilege('authenticated','public.learning_record_experiment_usage(uuid,uuid,text,text,text,integer,integer,integer)','EXECUTE'),'tenant cannot record usage');
SELECT pg_temp.assert_true(NOT has_function_privilege('anon','public.learning_start_experiment_provider(uuid,uuid,text,text,numeric,numeric,timestamptz)','EXECUTE'),'anon cannot start');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM * FROM public.learning_experiment_provider_receipts; RAISE EXCEPTION 'tenant read receipt'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_1','synthetic-model-v1',800,60,860); RAISE EXCEPTION 'tenant wrote receipt'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(public.learning_reserve_experiment('33333333-3333-4333-8333-333333333331',repeat('b',64),1,'44444444-4444-4444-8444-444444444444',1000),'reserve');
SELECT pg_temp.assert_true(public.learning_start_experiment_provider('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'synthetic-model',25,200,now()),'start');
SELECT pg_temp.assert_true(NOT public.learning_start_experiment_provider('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'synthetic-model',25,200,now()),'start cannot replay');
SELECT pg_temp.assert_true(public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_1','synthetic-model-v1',800,60,860)=1,'receipt settles');
SELECT pg_temp.assert_true(public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_1','synthetic-model-v1',800,60,860)=1,'same receipt replay');
SELECT pg_temp.assert_true(public.learning_record_experiment_output_state('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'screening_unavailable'),'unavailable after paid generation');
SELECT pg_temp.assert_true((SELECT spent_cents=1 AND reserved_cents=0 FROM public.learning_experiment_months),'one monetary settlement');
DO $$ BEGIN
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_changed','synthetic-model-v1',800,60,860); RAISE EXCEPTION 'accepted changed receipt'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='accepted changed receipt' THEN RAISE; END IF; END;
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','22222222-2222-4222-8222-222222222222',repeat('a',64),'resp_contract_1','synthetic-model-v1',800,60,860); RAISE EXCEPTION 'accepted wrong owner'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='accepted wrong owner' THEN RAISE; END IF; END;
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('b',64),'resp_contract_1','synthetic-model-v1',800,60,860); RAISE EXCEPTION 'accepted wrong input'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='accepted wrong input' THEN RAISE; END IF; END;
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_1','synthetic-model-v1',800,60,861); RAISE EXCEPTION 'accepted invalid sum'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='accepted invalid sum' THEN RAISE; END IF; END;
  BEGIN PERFORM public.learning_record_experiment_output_state('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',repeat('a',64),'released'); RAISE EXCEPTION 'changed terminal output state'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='changed terminal output state' THEN RAISE; END IF; END;
END $$;
SELECT public.learning_reserve_experiment('33333333-3333-4333-8333-333333333332',repeat('b',64),1,'44444444-4444-4444-8444-444444444444',1000);
SELECT public.learning_start_experiment_provider('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111',repeat('a',64),'synthetic-model',25,200,now());
RESET ROLE;
-- Force a monetary write failure after the receipt UPDATE. Its entire transaction
-- must roll back, preserving the held budget and leaving no fictitious receipt.
CREATE FUNCTION pg_temp.reject_money_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic money write failure'; END $$;
CREATE TRIGGER synthetic_money_write_failure BEFORE UPDATE ON public.learning_experiment_months FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_money_update();
SET LOCAL ROLE service_role;
DO $$ BEGIN
  BEGIN PERFORM public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_2','synthetic-model-v1',800,60,860); RAISE EXCEPTION 'accepted failed settlement'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'synthetic money write failure' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true((SELECT usage_received_at IS NULL FROM public.learning_experiment_provider_receipts WHERE request_id='33333333-3333-4333-8333-333333333332'),'receipt rolled back with money failure');
SELECT pg_temp.assert_true((SELECT state='started' AND actual_cents IS NULL FROM public.learning_experiment_reservations WHERE id='33333333-3333-4333-8333-333333333332'),'reservation remains held');
SELECT pg_temp.assert_true((SELECT reserved_cents=1 AND spent_cents=1 FROM public.learning_experiment_months),'money conserved');
RESET ROLE;
DROP TRIGGER synthetic_money_write_failure ON public.learning_experiment_months;
SET LOCAL ROLE service_role;
SELECT public.learning_record_experiment_usage('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111',repeat('a',64),'resp_contract_2','synthetic-model-v1',800,60,860);
SELECT public.learning_record_experiment_output_state('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111',repeat('a',64),'blocked');
SELECT pg_temp.assert_true((SELECT reserved_cents=0 AND spent_cents=2 FROM public.learning_experiment_months),'blocked generation settled');
RESET ROLE;
-- Existing uncertain reservations are never made replayable or auto-refunded.
SELECT public.learning_reserve_experiment('33333333-3333-4333-8333-333333333333',repeat('b',64),1,'44444444-4444-4444-8444-444444444444',1000);
UPDATE public.learning_experiment_reservations SET created_at=now()-interval '1 day' WHERE id='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_true(NOT public.learning_start_experiment_provider('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',repeat('a',64),'synthetic-model',25,200,now()),'legacy cannot start');
SELECT pg_temp.assert_true((SELECT state='reserved' AND actual_cents IS NULL FROM public.learning_experiment_reservations WHERE id='33333333-3333-4333-8333-333333333333'),'legacy unchanged');
ROLLBACK;
