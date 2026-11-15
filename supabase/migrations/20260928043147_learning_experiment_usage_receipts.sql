BEGIN;
-- Forward-only: legacy reservations are deliberately not backfilled or settled.
CREATE TABLE public.learning_experiment_provider_receipts (
  request_id uuid PRIMARY KEY REFERENCES public.learning_experiment_reservations(id),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  requested_model text NOT NULL CHECK (requested_model ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  input_cents_per_million numeric NOT NULL CHECK (input_cents_per_million > 0 AND input_cents_per_million <= 1000000),
  output_cents_per_million numeric NOT NULL CHECK (output_cents_per_million > 0 AND output_cents_per_million <= 1000000),
  price_reviewed_at timestamptz NOT NULL,
  provider_started_at timestamptz NOT NULL DEFAULT now(),
  provider_response_id text UNIQUE CHECK (provider_response_id ~ '^[A-Za-z0-9_.:-]{1,200}$'),
  resolved_model text CHECK (resolved_model ~ '^[A-Za-z0-9_.:-]{1,100}$'),
  input_tokens integer CHECK (input_tokens BETWEEN 0 AND 10000000),
  output_tokens integer CHECK (output_tokens BETWEEN 0 AND 10000000),
  total_tokens integer CHECK (total_tokens BETWEEN 1 AND 10000000),
  actual_cents integer CHECK (actual_cents > 0),
  usage_received_at timestamptz,
  output_state text NOT NULL DEFAULT 'pending' CHECK (output_state IN ('pending','released','blocked','screening_unavailable','generation_error','accounting_error')),
  output_state_at timestamptz,
  CHECK ((usage_received_at IS NULL AND provider_response_id IS NULL AND resolved_model IS NULL
    AND input_tokens IS NULL AND output_tokens IS NULL AND total_tokens IS NULL AND actual_cents IS NULL)
    OR (usage_received_at IS NOT NULL AND provider_response_id IS NOT NULL AND resolved_model IS NOT NULL
    AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL AND total_tokens IS NOT NULL AND actual_cents IS NOT NULL
    AND total_tokens=input_tokens+output_tokens))
);
ALTER TABLE public.learning_experiment_provider_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_experiment_provider_receipts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.learning_experiment_provider_receipts TO service_role;

CREATE FUNCTION public.learning_start_experiment_provider(p_id uuid,p_owner_id uuid,p_input_hash text,p_requested_model text,
  p_input_rate numeric,p_output_rate numeric,p_price_reviewed_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r public.learning_experiment_reservations;
BEGIN
  IF p_id IS NULL OR p_owner_id IS NULL OR p_input_hash IS NULL OR p_input_hash !~ '^[a-f0-9]{64}$'
    OR p_requested_model IS NULL OR p_requested_model !~ '^[A-Za-z0-9_.:-]{1,100}$'
    OR p_input_rate IS NULL OR NOT (p_input_rate>0 AND p_input_rate<=1000000)
    OR p_output_rate IS NULL OR NOT (p_output_rate>0 AND p_output_rate<=1000000)
    OR p_price_reviewed_at IS NULL OR NOT (p_price_reviewed_at BETWEEN now()-interval '30 days' AND now()+interval '1 minute')
    THEN RAISE EXCEPTION 'Invalid provider accounting context'; END IF;
  SELECT * INTO r FROM public.learning_experiment_reservations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  -- No legacy reservation may acquire a new execution. Only a freshly reserved
  -- request may start, within the same bounded Edge invocation window.
  IF r.state<>'reserved' OR r.created_at<now()-interval '2 minutes' THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.learning_experiment_provider_receipts WHERE request_id=p_id) THEN RETURN false; END IF;
  INSERT INTO public.learning_experiment_provider_receipts(request_id,owner_id,input_hash,requested_model,
    input_cents_per_million,output_cents_per_million,price_reviewed_at)
    VALUES(p_id,p_owner_id,p_input_hash,p_requested_model,p_input_rate,p_output_rate,p_price_reviewed_at);
  UPDATE public.learning_experiment_reservations SET state='started' WHERE id=p_id;
  RETURN true;
END $$;

CREATE FUNCTION public.learning_record_experiment_usage(p_id uuid,p_owner_id uuid,p_input_hash text,p_provider_response_id text,
  p_resolved_model text,p_input_tokens integer,p_output_tokens integer,p_total_tokens integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE receipt public.learning_experiment_provider_receipts; cents integer;
BEGIN
  IF p_id IS NULL OR p_owner_id IS NULL OR p_input_hash IS NULL
    OR p_provider_response_id IS NULL OR p_provider_response_id !~ '^[A-Za-z0-9_.:-]{1,200}$'
    OR p_resolved_model IS NULL OR p_resolved_model !~ '^[A-Za-z0-9_.:-]{1,100}$'
    OR p_input_tokens IS NULL OR p_output_tokens IS NULL OR p_total_tokens IS NULL
    OR p_input_tokens NOT BETWEEN 0 AND 10000000 OR p_output_tokens NOT BETWEEN 0 AND 10000000
    OR p_total_tokens NOT BETWEEN 1 AND 10000000 OR p_total_tokens::bigint<>p_input_tokens::bigint+p_output_tokens::bigint
    THEN RAISE EXCEPTION 'Invalid provider usage'; END IF;
  -- Always acquire the existing reservation lock first, matching settlement.
  PERFORM 1 FROM public.learning_experiment_reservations WHERE id=p_id FOR UPDATE;
  SELECT * INTO receipt FROM public.learning_experiment_provider_receipts WHERE request_id=p_id FOR UPDATE;
  IF NOT FOUND OR receipt.owner_id<>p_owner_id OR receipt.input_hash<>p_input_hash THEN RAISE EXCEPTION 'Receipt identity conflict'; END IF;
  cents:=greatest(1,ceil((p_input_tokens::numeric*receipt.input_cents_per_million+p_output_tokens::numeric*receipt.output_cents_per_million)/1000000))::integer;
  IF receipt.usage_received_at IS NOT NULL THEN
    IF receipt.provider_response_id<>p_provider_response_id OR receipt.resolved_model<>p_resolved_model
      OR receipt.input_tokens<>p_input_tokens OR receipt.output_tokens<>p_output_tokens OR receipt.total_tokens<>p_total_tokens
      THEN RAISE EXCEPTION 'Immutable usage receipt conflict'; END IF;
    PERFORM public.learning_settle_experiment(p_id,receipt.actual_cents);
    RETURN receipt.actual_cents;
  END IF;
  UPDATE public.learning_experiment_provider_receipts SET provider_response_id=p_provider_response_id,resolved_model=p_resolved_model,
    input_tokens=p_input_tokens,output_tokens=p_output_tokens,total_tokens=p_total_tokens,actual_cents=cents,usage_received_at=now()
    WHERE request_id=p_id;
  -- The receipt and monetary settlement either both commit or both roll back.
  PERFORM public.learning_settle_experiment(p_id,cents);
  RETURN cents;
END $$;

CREATE FUNCTION public.learning_record_experiment_output_state(p_id uuid,p_owner_id uuid,p_input_hash text,p_state text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE receipt public.learning_experiment_provider_receipts;
BEGIN
  IF p_state IS NULL OR p_state NOT IN ('released','blocked','screening_unavailable','generation_error','accounting_error')
    OR p_owner_id IS NULL OR p_input_hash IS NULL THEN RAISE EXCEPTION 'Invalid output status'; END IF;
  SELECT * INTO receipt FROM public.learning_experiment_provider_receipts WHERE request_id=p_id FOR UPDATE;
  IF NOT FOUND OR receipt.owner_id<>p_owner_id OR receipt.input_hash<>p_input_hash THEN RAISE EXCEPTION 'Receipt identity conflict'; END IF;
  IF p_state IN ('released','blocked','screening_unavailable') AND receipt.usage_received_at IS NULL THEN RAISE EXCEPTION 'Usage receipt required'; END IF;
  IF receipt.output_state=p_state THEN RETURN true; END IF;
  IF receipt.output_state<>'pending' THEN RAISE EXCEPTION 'Immutable output status conflict'; END IF;
  UPDATE public.learning_experiment_provider_receipts SET output_state=p_state,output_state_at=now() WHERE request_id=p_id;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.learning_start_experiment_provider(uuid,uuid,text,text,numeric,numeric,timestamptz),
  public.learning_record_experiment_usage(uuid,uuid,text,text,text,integer,integer,integer),
  public.learning_record_experiment_output_state(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_start_experiment_provider(uuid,uuid,text,text,numeric,numeric,timestamptz),
  public.learning_record_experiment_usage(uuid,uuid,text,text,text,integer,integer,integer),
  public.learning_record_experiment_output_state(uuid,uuid,text,text) TO service_role;
COMMIT;
