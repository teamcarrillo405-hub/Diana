BEGIN;
-- Empty, service-only synthetic diagnostic allowlist. Does not activate product enforcement.
CREATE TABLE public.learning_research_assistance_permits (
  request_id uuid PRIMARY KEY,
  manifest_hash text NOT NULL CHECK(manifest_hash ~ '^[a-f0-9]{64}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  request_body_sha256 text NOT NULL CHECK(request_body_sha256 ~ '^[a-f0-9]{64}$'),
  payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),
  authorization_sha256 text NOT NULL CHECK(authorization_sha256 ~ '^[a-f0-9]{64}$'),
  scope text NOT NULL DEFAULT 'synthetic_diagnostic' CHECK(scope='synthetic_diagnostic'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  consumed_at timestamptz,
  CHECK(expires_at>created_at AND expires_at<=created_at+interval '24 hours')
);
ALTER TABLE public.learning_research_assistance_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_research_assistance_permits FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.learning_research_assistance_permits TO service_role;

-- Internal policy predicate mirrors existing supported age/consent and teen permission contract.
CREATE FUNCTION public.learning_research_profile_allowed(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=p_owner AND p.consent_ai
   AND p.age_bracket IN ('adult','13_to_17')
   AND (p.age_bracket='adult' OR (p.teen_guardian_permission_attested_at IS NOT NULL
     AND p.teen_guardian_permission_policy_version='teen_openai_beta_v1'
     AND p.teen_guardian_permission_source IN ('signup_attestation','profile_center_attestation','synthetic_qa_fixture')
     AND p.teen_guardian_permission_withdrawn_at IS NULL)))
   AND NOT EXISTS(SELECT 1 FROM public.data_deletion_requests WHERE owner_id=p_owner AND status NOT IN ('completed','cancelled'));
$$;

CREATE FUNCTION public.learning_research_assistance_payload(p_request uuid,p_manifest text,p_owner uuid,p_assignment uuid,p_body_sha256 text)
RETURNS text LANGUAGE sql IMMUTABLE STRICT SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.learning_task_sha256('integrated-research-assistance-v1'||E'\n'||p_owner::text||E'\n'||p_assignment::text||E'\n'||p_request::text||E'\n'||p_manifest||E'\n'||p_body_sha256||E'\napi\nhint');
$$;

-- Trusted operator service provisioning only; artifact hash binds external approval, not self-authentication.
CREATE FUNCTION public.learning_provision_research_assistance(p_request uuid,p_manifest text,p_owner uuid,p_assignment uuid,
  p_body_sha256 text,p_payload_sha256 text,p_authorization_sha256 text,p_expires_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_request IS NULL OR p_owner IS NULL OR p_assignment IS NULL OR p_manifest IS NULL OR p_manifest !~ '^[a-f0-9]{64}$'
    OR p_body_sha256 IS NULL OR p_body_sha256 !~ '^[a-f0-9]{64}$'
    OR p_payload_sha256 IS DISTINCT FROM public.learning_research_assistance_payload(p_request,p_manifest,p_owner,p_assignment,p_body_sha256)
    OR p_authorization_sha256 IS NULL OR p_authorization_sha256 !~ '^[a-f0-9]{64}$'
    OR p_expires_at IS NULL OR p_expires_at<=clock_timestamp() OR p_expires_at>clock_timestamp()+interval '24 hours'
    THEN RAISE EXCEPTION 'Invalid exact research authorization' USING ERRCODE='22023'; END IF;
  IF NOT public.learning_research_profile_allowed(p_owner) OR NOT EXISTS(SELECT 1 FROM public.assignments a JOIN public.classes c ON c.id=a.class_id AND c.owner_id=a.owner_id
    WHERE a.id=p_assignment AND a.owner_id=p_owner AND coalesce(a.ai_mode_override,c.ai_mode)='green')
    THEN RAISE EXCEPTION 'Eligible owned green research scope required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE id=p_request)
    OR EXISTS(SELECT 1 FROM public.learning_assignment_assistance WHERE request_id=p_request)
    THEN RAISE EXCEPTION 'Research identity already attempted' USING ERRCODE='23505'; END IF;
  -- No upsert: a used/revoked identity can never be reset or extended.
  INSERT INTO public.learning_research_assistance_permits(request_id,manifest_hash,owner_id,assignment_id,request_body_sha256,payload_sha256,authorization_sha256,expires_at)
    VALUES(p_request,p_manifest,p_owner,p_assignment,p_body_sha256,p_payload_sha256,p_authorization_sha256,p_expires_at);
  RETURN true;
END $$;

CREATE FUNCTION public.learning_revoke_research_assistance(p_request uuid,p_manifest text,p_authorization_sha256 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE permit public.learning_research_assistance_permits;
BEGIN
  SELECT * INTO permit FROM public.learning_research_assistance_permits WHERE request_id=p_request FOR UPDATE;
  IF NOT FOUND OR permit.manifest_hash IS DISTINCT FROM p_manifest OR permit.authorization_sha256 IS DISTINCT FROM p_authorization_sha256 THEN RETURN false; END IF;
  UPDATE public.learning_research_assistance_permits SET revoked_at=coalesce(revoked_at,clock_timestamp()) WHERE request_id=p_request;
  RETURN true;
END $$;

-- Read-only early gate before any cents, moderation or tokens. Consumption rechecks under locks.
CREATE FUNCTION public.learning_research_assistance_ready(p_request uuid,p_manifest text,p_owner uuid,p_assignment uuid,p_body_sha256 text,p_payload_sha256 text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(SELECT 1 FROM public.learning_research_assistance_permits p
   JOIN public.assignments a ON a.id=p.assignment_id AND a.owner_id=p.owner_id
   JOIN public.classes c ON c.id=a.class_id AND c.owner_id=a.owner_id
   WHERE p.request_id=p_request AND p.manifest_hash=p_manifest AND p.owner_id=p_owner AND p.assignment_id=p_assignment
     AND p.request_body_sha256=p_body_sha256 AND p.payload_sha256=p_payload_sha256
     AND p_payload_sha256=public.learning_research_assistance_payload(p_request,p_manifest,p_owner,p_assignment,p_body_sha256)
     AND p.revoked_at IS NULL AND p.consumed_at IS NULL AND p.expires_at>clock_timestamp()
     AND coalesce(a.ai_mode_override,c.ai_mode)='green' AND public.learning_research_profile_allowed(p_owner)
     AND NOT EXISTS(SELECT 1 FROM public.learning_experiment_reservations r WHERE r.id=p_request));
$$;

CREATE FUNCTION public.learning_begin_research_assistance(p_request uuid,p_manifest text,p_owner uuid,p_assignment uuid,p_body_sha256 text,p_payload_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE permit public.learning_research_assistance_permits; reservation public.learning_experiment_reservations;
  event public.learning_assignment_assistance; assignment_class uuid; assignment_mode text; class_mode text;
BEGIN
  IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Research receipt requires read committed isolation'; END IF;
  IF p_request IS NULL OR p_owner IS NULL OR p_assignment IS NULL OR p_manifest IS NULL OR p_manifest !~ '^[a-f0-9]{64}$'
    OR p_body_sha256 IS NULL OR p_body_sha256 !~ '^[a-f0-9]{64}$'
    OR p_payload_sha256 IS DISTINCT FROM public.learning_research_assistance_payload(p_request,p_manifest,p_owner,p_assignment,p_body_sha256)
    THEN RAISE EXCEPTION 'Invalid research receipt identity' USING ERRCODE='22023'; END IF;
  -- Same assignment-wide lock as production help and independent evidence; no task narrowing.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  PERFORM 1 FROM public.profiles WHERE user_id=p_owner FOR UPDATE;
  SELECT class_id,ai_mode_override INTO assignment_class,assignment_mode FROM public.assignments WHERE id=p_assignment AND owner_id=p_owner FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned assignment required' USING ERRCODE='42501'; END IF;
  SELECT ai_mode INTO class_mode FROM public.classes WHERE id=assignment_class AND owner_id=p_owner FOR SHARE;
  IF NOT FOUND OR coalesce(assignment_mode,class_mode) IS DISTINCT FROM 'green' OR NOT public.learning_research_profile_allowed(p_owner)
    THEN RAISE EXCEPTION 'Current research policy required' USING ERRCODE='42501'; END IF;
  -- Revocation and consumption serialize on this row. No direct runtime UPDATE grant.
  SELECT * INTO permit FROM public.learning_research_assistance_permits WHERE request_id=p_request FOR UPDATE;
  IF NOT FOUND OR permit.manifest_hash IS DISTINCT FROM p_manifest OR permit.owner_id IS DISTINCT FROM p_owner
    OR permit.assignment_id IS DISTINCT FROM p_assignment OR permit.request_body_sha256 IS DISTINCT FROM p_body_sha256
    OR permit.payload_sha256 IS DISTINCT FROM p_payload_sha256 OR permit.revoked_at IS NOT NULL
    THEN RAISE EXCEPTION 'Exact active research permit required' USING ERRCODE='42501'; END IF;
  SELECT * INTO reservation FROM public.learning_experiment_reservations WHERE id=p_request FOR UPDATE;
  -- Re-evaluate clock after every potentially blocking lock, never trust preflight timing.
  IF NOT FOUND OR reservation.manifest_hash IS DISTINCT FROM p_manifest OR reservation.state<>'reserved' OR reservation.actual_cents IS NOT NULL
    OR reservation.created_at<clock_timestamp()-interval '2 minutes' OR reservation.created_at>clock_timestamp()
    OR permit.expires_at<=clock_timestamp() OR NOT public.learning_research_profile_allowed(p_owner)
    OR EXISTS(SELECT 1 FROM public.learning_experiment_provider_receipts WHERE request_id=p_request)
    OR EXISTS(SELECT 1 FROM public.learning_experiment_outputs WHERE request_id=p_request)
    THEN RAISE EXCEPTION 'Fresh unstarted research reservation required' USING ERRCODE='42501'; END IF;
  SELECT * INTO event FROM public.learning_assignment_assistance WHERE request_id=p_request;
  IF FOUND THEN
    IF permit.consumed_at IS NULL OR event.owner_id<>p_owner OR event.assignment_id<>p_assignment OR event.payload_sha256<>p_payload_sha256
      OR event.selected_problem_id IS NOT NULL OR event.channel<>'api' OR event.kind<>'hint'
      THEN RAISE EXCEPTION 'Research receipt conflict' USING ERRCODE='23505'; END IF;
  ELSE
    IF permit.consumed_at IS NOT NULL THEN RAISE EXCEPTION 'Consumed research receipt missing' USING ERRCODE='23505'; END IF;
    INSERT INTO public.learning_assignment_assistance(request_id,owner_id,assignment_id,selected_problem_id,payload_sha256,channel,kind)
      VALUES(p_request,p_owner,p_assignment,NULL,p_payload_sha256,'api','hint') RETURNING * INTO event;
    UPDATE public.learning_research_assistance_permits SET consumed_at=event.created_at WHERE request_id=p_request;
  END IF;
  RETURN jsonb_build_object('schemaVersion','assignment-assistance-v1','scope','assignment','requestId',event.request_id,
    'ownerId',event.owner_id,'assignmentId',event.assignment_id,'selectedProblemId',NULL,'payloadSha256',event.payload_sha256,
    'channel','api','kind','hint','recordedAt',event.created_at,'independenceBlocked',true);
END $$;

REVOKE ALL ON FUNCTION public.learning_research_profile_allowed(uuid),public.learning_research_assistance_payload(uuid,text,uuid,uuid,text),
  public.learning_provision_research_assistance(uuid,text,uuid,uuid,text,text,text,timestamptz),
  public.learning_revoke_research_assistance(uuid,text,text),public.learning_research_assistance_ready(uuid,text,uuid,uuid,text,text),
  public.learning_begin_research_assistance(uuid,text,uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learning_provision_research_assistance(uuid,text,uuid,uuid,text,text,text,timestamptz),
  public.learning_revoke_research_assistance(uuid,text,text),public.learning_research_assistance_ready(uuid,text,uuid,uuid,text,text),
  public.learning_begin_research_assistance(uuid,text,uuid,uuid,text,text) TO service_role;
-- No real permits, no production function replacement, no enforcement-control update.
COMMIT;
