BEGIN;
-- Additive future hardening only. Do not rewrite the existing start/settle APIs.
CREATE FUNCTION public.learning_cancel_unstarted_experiment(p_id uuid, p_manifest_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE reservation public.learning_experiment_reservations;
BEGIN
  -- A stale repeatable-read snapshot could miss independently inserted output
  -- after waiting for its FK key-share lock. Require fresh command snapshots.
  IF current_setting('transaction_isolation')<>'read committed'
    THEN RAISE EXCEPTION 'Cancellation requires read committed isolation'; END IF;
  IF p_id IS NULL OR p_manifest_hash IS NULL OR p_manifest_hash !~ '^[a-f0-9]{64}$'
    THEN RAISE EXCEPTION 'Invalid cancellation identity'; END IF;
  -- Same lock order as provider start and usage settlement: reservation first,
  -- then the monthly money row. Keep this lock through both writes.
  SELECT * INTO reservation FROM public.learning_experiment_reservations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR reservation.manifest_hash<>p_manifest_hash THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.learning_experiment_provider_receipts WHERE request_id=p_id)
    OR EXISTS(SELECT 1 FROM public.learning_experiment_outputs WHERE request_id=p_id)
    THEN RETURN false; END IF;
  IF reservation.state='settled' THEN RETURN reservation.actual_cents=0; END IF;
  -- Do not infer non-consumption for old, uncertain reservations. This matches
  -- the existing provider-start window; a delayed cancellation needs review.
  IF reservation.state<>'reserved' OR reservation.actual_cents IS NOT NULL
    OR reservation.created_at<now()-interval '2 minutes'
    THEN RETURN false; END IF;
  UPDATE public.learning_experiment_months
    SET reserved_cents=reserved_cents-reservation.reserved_cents
    WHERE month=reservation.month AND reserved_cents>=reservation.reserved_cents;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation money unavailable'; END IF;
  UPDATE public.learning_experiment_reservations SET state='settled',actual_cents=0 WHERE id=p_id;
  -- The row remains permanently occupied: reserve/start cannot authorize replay.
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.learning_cancel_unstarted_experiment(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_cancel_unstarted_experiment(uuid,text) TO service_role;
COMMIT;
