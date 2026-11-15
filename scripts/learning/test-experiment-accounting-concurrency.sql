-- ISOLATED SYNTHETIC CLUSTER ONLY, on the dedicated test port. These committed
-- fixtures are needed for two real concurrent connections. Never use staging.
\set ON_ERROR_STOP on
DO $$ BEGIN IF current_setting('port')<>'55439' OR inet_server_addr()<>inet '127.0.0.1' THEN RAISE EXCEPTION 'Dedicated isolated test cluster required'; END IF; END $$;
CREATE EXTENSION IF NOT EXISTS dblink;
INSERT INTO auth.users(id) VALUES('77777777-7777-4777-8777-777777777777');
SELECT public.learning_reserve_experiment('88888888-8888-4888-8888-888888888888',repeat('c',64),1,'99999999-9999-4999-8999-999999999999',1000);
SELECT public.learning_start_experiment_provider('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777',repeat('d',64),'synthetic-model',25,200,now());
SELECT dblink_connect('receipt_a','host=127.0.0.1 port=55439 dbname=postgres user=postgres');
SELECT dblink_connect('receipt_b','host=127.0.0.1 port=55439 dbname=postgres user=postgres');
SELECT dblink_exec('receipt_a','SET ROLE service_role');
SELECT dblink_exec('receipt_b','SET ROLE service_role');
SELECT dblink_exec('receipt_a','BEGIN');
SELECT * FROM dblink('receipt_a',$q$SELECT public.learning_record_experiment_usage('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777',repeat('d',64),'resp_concurrent','synthetic-model-v1',800,60,860)$q$) AS receipt(cents integer);
SELECT dblink_send_query('receipt_b',$q$SELECT public.learning_record_experiment_usage('88888888-8888-4888-8888-888888888888','77777777-7777-4777-8777-777777777777',repeat('d',64),'resp_concurrent','synthetic-model-v1',800,60,860)$q$);
DO $$ BEGIN
  PERFORM pg_sleep(0.2);
  IF dblink_is_busy('receipt_b')<>1 THEN RAISE EXCEPTION 'Concurrent settlement did not wait for the reservation lock'; END IF;
END $$;
SELECT dblink_exec('receipt_a','COMMIT');
SELECT * FROM dblink_get_result('receipt_b') AS receipt(cents integer);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.learning_experiment_months WHERE spent_cents=1 AND reserved_cents=0)
    OR (SELECT count(*) FROM public.learning_experiment_provider_receipts WHERE request_id='88888888-8888-4888-8888-888888888888')<>1
    OR NOT EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE id='88888888-8888-4888-8888-888888888888' AND state='settled' AND actual_cents=1)
  THEN RAISE EXCEPTION 'Concurrent usage charged more than once'; END IF;
END $$;
SELECT dblink_disconnect('receipt_a');
SELECT dblink_disconnect('receipt_b');
-- Remove exactly the committed synthetic rows in dependency order.
DELETE FROM public.learning_experiment_provider_receipts WHERE request_id='88888888-8888-4888-8888-888888888888';
DELETE FROM public.learning_experiment_reservations WHERE id='88888888-8888-4888-8888-888888888888';
DELETE FROM auth.users WHERE id='77777777-7777-4777-8777-777777777777';
DELETE FROM public.learning_experiment_months WHERE NOT EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE month=learning_experiment_months.month);
