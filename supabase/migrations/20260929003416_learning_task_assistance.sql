-- Durable task provenance. No historical mappings or attempts are inferred/reclassified.
-- Service RPCs only: apply before enabling their callers. Unbound sessions fail closed.
BEGIN;

-- Fail atomically if the reviewed predecessor has drifted or a stored caller
-- could retain its renamed OID. This is also checked read-only before rollout.
DO $$
DECLARE target record; body_hash text;
BEGIN
  FOR target IN SELECT * FROM (VALUES
    ('public.learning_start_independent(uuid,uuid,text)','e9c2946dd25589e3ae407d4b06238e00dbaa139819bb5f22a1d48afef19adcf8'),
    ('public.learning_record_attempt(uuid,jsonb,text,jsonb)','6a9b14f6c9b3842166f81c1070ccc9e519c1a8e1c80dda168420710ff9b01550')) AS expected(signature,sha) LOOP
    SELECT encode(extensions.digest(convert_to(regexp_replace(replace(prosrc,E'\r\n',E'\n'),'^\s+|\s+$','','g'),'UTF8'),'sha256'),'hex')
      INTO body_hash FROM pg_proc WHERE oid=to_regprocedure(target.signature) AND prosecdef;
    IF body_hash IS DISTINCT FROM target.sha THEN RAISE EXCEPTION 'Reviewed eligibility predecessor changed: %',target.signature; END IF;
    IF EXISTS(SELECT 1 FROM pg_depend WHERE refclassid='pg_proc'::regclass AND refobjid=to_regprocedure(target.signature)) THEN
      RAISE EXCEPTION 'Stored dependent requires explicit OID migration: %',target.signature; END IF;
  END LOOP;
END $$;

CREATE TABLE public.learning_task_assistance_control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enforced boolean NOT NULL DEFAULT false,
  installed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO public.learning_task_assistance_control DEFAULT VALUES;
-- Operator-written provenance, not metadata accepted from a student's upload.
-- A review must establish semantic novelty, not merely a new UUID/version.
CREATE TABLE public.learning_transfer_authorizations (
  exercise_id text PRIMARY KEY, owner_id uuid NOT NULL, assignment_id uuid NOT NULL,
  source_version_id text NOT NULL, reference_sha256 text NOT NULL CHECK(reference_sha256 ~ '^[a-f0-9]{64}$'),
  source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$'),
  novelty_evidence_sha256 text NOT NULL CHECK(novelty_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.learning_assignment_assistance (
  request_id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  selected_problem_id uuid,
  payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),
  channel text NOT NULL CHECK(channel IN ('local','api')),
  kind text NOT NULL CHECK(kind IN ('hint','example','check','guide')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX learning_assignment_assistance_scope ON public.learning_assignment_assistance(owner_id,assignment_id,created_at);
ALTER TABLE public.learning_task_assistance_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_transfer_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assignment_assistance ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_assistance_read ON public.learning_assignment_assistance FOR SELECT TO authenticated USING(owner_id=auth.uid());
REVOKE ALL ON public.learning_task_assistance_control,public.learning_transfer_authorizations,public.learning_assignment_assistance FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.learning_task_assistance_control,public.learning_transfer_authorizations,public.learning_assignment_assistance TO service_role;
GRANT SELECT ON public.learning_assignment_assistance TO authenticated;

CREATE TABLE public.learning_task_origins (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  origin_kind text NOT NULL CHECK (origin_kind IN ('worksheet_problem','reviewed_transfer')),
  origin_key text NOT NULL CHECK (length(origin_key) BETWEEN 1 AND 200),
  initial_snapshot_sha256 text NOT NULL CHECK (initial_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  trust_basis text NOT NULL CHECK (trust_basis IN ('legacy_unresolved','fresh_transfer_reviewed')),
  reviewed_exercise_id text,
  reviewed_reference_sha256 text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(owner_id,assignment_id,origin_kind,origin_key),
  UNIQUE(id,owner_id,assignment_id),
  CHECK ((trust_basis='fresh_transfer_reviewed')=(reviewed_exercise_id IS NOT NULL AND reviewed_reference_sha256 IS NOT NULL))
);
CREATE UNIQUE INDEX learning_task_reviewed_origin ON public.learning_task_origins(reviewed_exercise_id) WHERE reviewed_exercise_id IS NOT NULL;
-- Deliberately no cascading FK to mutable worksheet/exercise rows: deletion cannot
-- erase the identity, snapshots, or assistance attached to an existing assignment.
CREATE TABLE public.learning_exercise_bindings (
  exercise_id text PRIMARY KEY,
  task_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  source_version_id text NOT NULL CHECK (source_version_id ~ '^[a-f0-9]{64}$'),
  source_snapshot_sha256 text NOT NULL CHECK (source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  reference_sha256 text NOT NULL CHECK (reference_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(task_id,owner_id,assignment_id) REFERENCES public.learning_task_origins(id,owner_id,assignment_id) ON DELETE CASCADE
);
CREATE INDEX learning_bindings_task ON public.learning_exercise_bindings(task_id);
CREATE TABLE public.learning_task_sources (
  task_id uuid NOT NULL, owner_id uuid NOT NULL, assignment_id uuid NOT NULL,
  source_version_id text NOT NULL CHECK(source_version_id ~ '^[a-f0-9]{64}$'),
  source_page integer NOT NULL CHECK(source_page BETWEEN 1 AND 1500),
  source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY(source_version_id,source_page),
  FOREIGN KEY(task_id,owner_id,assignment_id) REFERENCES public.learning_task_origins(id,owner_id,assignment_id) ON DELETE CASCADE
);
CREATE TABLE public.learning_assistance_events (
  request_id uuid PRIMARY KEY,
  task_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  assignment_id uuid NOT NULL,
  source_version_id text CHECK (source_version_id ~ '^[a-f0-9]{64}$'),
  source_snapshot_sha256 text NOT NULL CHECK (source_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  channel text NOT NULL CHECK (channel IN ('local','api')),
  kind text NOT NULL CHECK (kind IN ('hint','example','check','guide')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(task_id,owner_id,assignment_id) REFERENCES public.learning_task_origins(id,owner_id,assignment_id) ON DELETE CASCADE
);
CREATE INDEX learning_assistance_task ON public.learning_assistance_events(task_id);
ALTER TABLE public.learning_independent_sessions ADD COLUMN task_id uuid REFERENCES public.learning_task_origins(id),
  ADD COLUMN task_reference_sha256 text, ADD COLUMN task_source_version_id text;
ALTER TABLE public.learning_attempts ADD COLUMN task_id uuid REFERENCES public.learning_task_origins(id);
CREATE INDEX learning_attempts_task ON public.learning_attempts(task_id) WHERE task_id IS NOT NULL;

ALTER TABLE public.learning_task_origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_exercise_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_assistance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_task_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_origins_read ON public.learning_task_origins FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY task_bindings_read ON public.learning_exercise_bindings FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY task_assistance_read ON public.learning_assistance_events FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY task_sources_read ON public.learning_task_sources FOR SELECT TO authenticated USING(owner_id=auth.uid());
REVOKE ALL ON public.learning_task_origins,public.learning_exercise_bindings,public.learning_assistance_events,public.learning_task_sources FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.learning_task_origins,public.learning_exercise_bindings,public.learning_assistance_events,public.learning_task_sources TO authenticated,service_role;

CREATE FUNCTION public.learning_task_sha256(p_text text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT SET search_path=public,pg_temp AS $$
  SELECT encode(extensions.digest(convert_to(p_text,'UTF8'),'sha256'),'hex')
$$;
CREATE FUNCTION public.learning_task_reference(p_exercise text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT public.learning_task_sha256(jsonb_build_object('id',id,'owner',owner_id,'assignment',assignment_id,
    'version',version_id,'skill',skill_id,'prompt',prompt,'specification',specification,'reviewed',reviewed)::text)
  FROM public.learning_exercises WHERE id=p_exercise
$$;

CREATE FUNCTION public.learning_register_task(p_owner uuid,p_assignment uuid,p_task uuid,p_origin_kind text,
  p_origin_key text,p_snapshot_sha256 text,p_trust_basis text DEFAULT 'legacy_unresolved',p_reviewed_exercise text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.learning_task_origins; reference_hash text; snapshot text;
BEGIN
  IF p_task IS NULL OR NOT EXISTS(SELECT 1 FROM public.assignments WHERE id=p_assignment AND owner_id=p_owner) THEN
    RAISE EXCEPTION 'Owned task scope required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  IF (p_origin_kind='worksheet_problem' AND (p_trust_basis IS DISTINCT FROM 'legacy_unresolved' OR p_reviewed_exercise IS NOT NULL))
    OR (p_origin_kind='reviewed_transfer' AND p_trust_basis IS DISTINCT FROM 'fresh_transfer_reviewed') THEN
    RAISE EXCEPTION 'Worksheet history cannot certify fresh transfer' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text||':origin:'||p_origin_kind||':'||p_origin_key,812));
  IF p_origin_kind='worksheet_problem' THEN
    SELECT public.learning_task_sha256(problem_text) INTO snapshot FROM public.assignment_problems
      WHERE id=p_origin_key::uuid AND owner_id=p_owner AND assignment_id=p_assignment;
  ELSIF p_origin_kind='reviewed_transfer' THEN
    PERFORM p_origin_key::uuid;
    SELECT public.learning_task_sha256(prompt) INTO snapshot FROM public.learning_exercises
      WHERE id=p_reviewed_exercise AND owner_id=p_owner AND assignment_id=p_assignment AND reviewed AND skill_id LIKE 'math.%';
  ELSE RAISE EXCEPTION 'Unsupported task origin' USING ERRCODE='22023'; END IF;
  IF snapshot IS NULL OR snapshot IS DISTINCT FROM p_snapshot_sha256 THEN
    RAISE EXCEPTION 'Source snapshot mismatch' USING ERRCODE='22023'; END IF;
  IF p_trust_basis='fresh_transfer_reviewed' THEN
    IF NOT EXISTS(SELECT 1 FROM public.learning_exercises WHERE id=p_reviewed_exercise AND owner_id=p_owner
      AND assignment_id=p_assignment AND reviewed AND skill_id LIKE 'math.%') THEN
      RAISE EXCEPTION 'Trusted reviewed math reference required' USING ERRCODE='42501'; END IF;
    reference_hash:=public.learning_task_reference(p_reviewed_exercise);
    -- The operator still must establish genuine novelty. These checks prevent a
    -- reviewed flag from recycling already bound/attempted/notebook-assisted work.
    IF EXISTS(SELECT 1 FROM public.learning_exercise_bindings WHERE exercise_id=p_reviewed_exercise)
      OR EXISTS(SELECT 1 FROM public.learning_task_origins WHERE reviewed_exercise_id=p_reviewed_exercise AND id<>p_task)
      OR EXISTS(SELECT 1 FROM public.learning_attempts WHERE owner_id=p_owner AND problem_id=p_reviewed_exercise)
      OR EXISTS(SELECT 1 FROM public.learning_problem_records p JOIN public.learning_problem_revisions r ON r.record_id=p.id
        WHERE p.owner_id=p_owner AND p.exercise_id=p_reviewed_exercise AND r.state->'supportCount' IS DISTINCT FROM '0'::jsonb) THEN
      -- Permit an exact retry below, never a new origin for this reference.
      IF NOT EXISTS(SELECT 1 FROM public.learning_task_origins WHERE id=p_task AND reviewed_exercise_id=p_reviewed_exercise) THEN
        RAISE EXCEPTION 'Reference already exposed or bound' USING ERRCODE='23505'; END IF;
    END IF;
  ELSIF p_trust_basis='legacy_unresolved' AND p_reviewed_exercise IS NULL THEN NULL;
  ELSE RAISE EXCEPTION 'Invalid trust evidence' USING ERRCODE='22023'; END IF;
  SELECT * INTO existing FROM public.learning_task_origins WHERE id=p_task OR
    (owner_id=p_owner AND assignment_id=p_assignment AND origin_kind=p_origin_kind AND origin_key=p_origin_key);
  IF FOUND THEN
    IF existing.id<>p_task OR existing.owner_id<>p_owner OR existing.assignment_id<>p_assignment
      OR existing.origin_kind<>p_origin_kind OR existing.origin_key<>p_origin_key
      OR (existing.origin_kind<>'worksheet_problem' AND existing.initial_snapshot_sha256<>p_snapshot_sha256) OR existing.trust_basis<>p_trust_basis
      OR existing.reviewed_exercise_id IS DISTINCT FROM p_reviewed_exercise OR existing.reviewed_reference_sha256 IS DISTINCT FROM reference_hash THEN
      RAISE EXCEPTION 'Task registration conflict' USING ERRCODE='23505'; END IF;
  ELSE
    INSERT INTO public.learning_task_origins VALUES(p_task,p_owner,p_assignment,p_origin_kind,p_origin_key,p_snapshot_sha256,
      p_trust_basis,p_reviewed_exercise,reference_hash,clock_timestamp()) RETURNING * INTO existing;
  END IF;
  RETURN jsonb_build_object('taskId',existing.id,'ownerId',existing.owner_id,'assignmentId',existing.assignment_id,
    'originKind',existing.origin_kind,'originKey',existing.origin_key,'initialSnapshotSha256',existing.initial_snapshot_sha256,'trustBasis',existing.trust_basis);
END $$;

CREATE FUNCTION public.learning_provision_reviewed_transfer(p_owner uuid,p_assignment uuid,p_task uuid,p_exercise text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE review_record public.learning_transfer_authorizations; exercise public.learning_exercises; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  SELECT * INTO review_record FROM public.learning_transfer_authorizations WHERE exercise_id=p_exercise AND owner_id=p_owner AND assignment_id=p_assignment;
  SELECT * INTO exercise FROM public.learning_exercises WHERE id=p_exercise AND owner_id=p_owner AND assignment_id=p_assignment AND reviewed AND skill_id LIKE 'math.%';
  IF review_record.exercise_id IS NULL OR exercise.id IS NULL OR exercise.version_id<>review_record.source_version_id
    OR public.learning_task_reference(p_exercise) IS DISTINCT FROM review_record.reference_sha256
    OR NOT EXISTS(SELECT 1 FROM public.learning_documents d,public.learning_task_assistance_control c
      WHERE d.id=exercise.version_id AND d.owner_id=p_owner AND d.assignment_id=p_assignment
        AND d.created_at>=c.installed_at AND review_record.reviewed_at>=d.created_at
        AND NOT EXISTS(SELECT 1 FROM public.learning_assignment_assistance h WHERE h.owner_id=p_owner AND h.assignment_id=p_assignment AND h.created_at>=d.created_at)
        AND public.learning_task_sha256(d.pages::text)=review_record.source_sha256)
    OR EXISTS(SELECT 1 FROM public.learning_assignment_assistance a WHERE a.owner_id=p_owner AND a.assignment_id=p_assignment
      AND a.created_at>=review_record.reviewed_at) THEN
    RAISE EXCEPTION 'Current trusted novel-source authorization required' USING ERRCODE='42501'; END IF;
  result:=public.learning_register_task(p_owner,p_assignment,p_task,'reviewed_transfer',p_task::text,
    public.learning_task_sha256(exercise.prompt),'fresh_transfer_reviewed',p_exercise);
  PERFORM public.learning_bind_exercise(p_owner,p_assignment,p_task,p_exercise,public.learning_task_sha256(exercise.prompt));
  RETURN result;
END $$;

CREATE FUNCTION public.learning_activate_task_assistance() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.learning_exercise_bindings b JOIN public.learning_task_origins t ON t.id=b.task_id
    JOIN public.learning_transfer_authorizations a ON a.exercise_id=b.exercise_id
    WHERE t.trust_basis='fresh_transfer_reviewed' AND b.reference_sha256=public.learning_task_reference(b.exercise_id)) THEN
    RAISE EXCEPTION 'Provision a reviewed transfer before activation' USING ERRCODE='42501'; END IF;
  UPDATE public.learning_task_assistance_control SET enforced=true WHERE singleton;
  RETURN true;
END $$;

CREATE FUNCTION public.learning_begin_assignment_assistance(p_assignment uuid,p_request uuid,p_payload_sha256 text,
  p_channel text,p_kind text,p_selected_problem uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE actor uuid:=auth.uid(); event public.learning_assignment_assistance;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_assignment::text,814));
  IF NOT EXISTS(SELECT 1 FROM public.learning_task_assistance_control WHERE enforced) THEN
    RAISE EXCEPTION 'Durable assistance enforcement is staged' USING ERRCODE='55000'; END IF;
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.assignments a JOIN public.classes c ON c.id=a.class_id AND c.owner_id=a.owner_id
    WHERE a.id=p_assignment AND a.owner_id=actor AND coalesce(a.ai_mode_override,c.ai_mode)='green') THEN
    RAISE EXCEPTION 'Owned green assignment required' USING ERRCODE='42501'; END IF;
  IF p_request IS NULL OR p_payload_sha256 IS NULL OR p_channel IS NULL OR p_kind IS NULL THEN
    RAISE EXCEPTION 'Complete assistance identity required' USING ERRCODE='22023'; END IF;
  IF p_selected_problem IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.assignment_problems WHERE id=p_selected_problem AND owner_id=actor AND assignment_id=p_assignment) THEN
    RAISE EXCEPTION 'Owned selected problem required' USING ERRCODE='42501'; END IF;
  SELECT * INTO event FROM public.learning_assignment_assistance WHERE request_id=p_request;
  IF FOUND THEN
    IF event.owner_id<>actor OR event.assignment_id<>p_assignment OR event.selected_problem_id IS DISTINCT FROM p_selected_problem
      OR event.payload_sha256<>p_payload_sha256 OR event.channel<>p_channel OR event.kind<>p_kind THEN
      RAISE EXCEPTION 'Assignment assistance request conflict' USING ERRCODE='23505'; END IF;
  ELSE INSERT INTO public.learning_assignment_assistance VALUES(p_request,actor,p_assignment,p_selected_problem,p_payload_sha256,p_channel,p_kind,clock_timestamp()) RETURNING * INTO event; END IF;
  RETURN jsonb_build_object('schemaVersion','assignment-assistance-v1','scope','assignment','requestId',event.request_id,
    'ownerId',event.owner_id,'assignmentId',event.assignment_id,'selectedProblemId',event.selected_problem_id,
    'payloadSha256',event.payload_sha256,'channel',event.channel,'kind',event.kind,'recordedAt',event.created_at,'independenceBlocked',true);
END $$;

CREATE FUNCTION public.learning_bind_task_source(p_owner uuid,p_assignment uuid,p_task uuid,p_source_version text,
  p_source_page integer,p_source_snapshot_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE task public.learning_task_origins; mapping public.learning_task_sources; wording text; number integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_task::text,813));
  SELECT * INTO task FROM public.learning_task_origins WHERE id=p_task AND owner_id=p_owner AND assignment_id=p_assignment AND origin_kind='worksheet_problem';
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned worksheet task required' USING ERRCODE='42501'; END IF;
  SELECT problem_text,problem_number INTO wording,number FROM public.assignment_problems WHERE id=task.origin_key::uuid
    AND owner_id=p_owner AND assignment_id=p_assignment AND source IN ('manual','student_confirmed_source') AND unit_type='problem';
  IF wording IS NULL OR public.learning_task_sha256(wording) IS DISTINCT FROM p_source_snapshot_sha256
    OR NOT EXISTS(SELECT 1 FROM public.learning_documents d CROSS JOIN LATERAL jsonb_array_elements(d.pages) page
      WHERE d.id=p_source_version AND d.owner_id=p_owner AND d.assignment_id=p_assignment AND d.document_id='assignment-problems'
        AND page->>'page'=p_source_page::text AND page->>'text'=number::text||'. '||wording
        AND page->>'interpretation' IN ('original','confirmed')) THEN
    RAISE EXCEPTION 'Verified worksheet source page required' USING ERRCODE='22023'; END IF;
  SELECT * INTO mapping FROM public.learning_task_sources WHERE source_version_id=p_source_version AND source_page=p_source_page;
  IF FOUND THEN
    IF mapping.task_id<>p_task OR mapping.owner_id<>p_owner OR mapping.assignment_id<>p_assignment OR mapping.source_snapshot_sha256<>p_source_snapshot_sha256 THEN
      RAISE EXCEPTION 'Immutable source mapping conflict' USING ERRCODE='23505'; END IF;
  ELSE INSERT INTO public.learning_task_sources VALUES(p_task,p_owner,p_assignment,p_source_version,p_source_page,p_source_snapshot_sha256); END IF;
  RETURN jsonb_build_object('taskId',p_task,'sourceVersionId',p_source_version,'sourcePage',p_source_page,'sourceSnapshotSha256',p_source_snapshot_sha256);
END $$;

-- Browser-authenticated indexing can preserve identity, never mint fresh evidence.
CREATE FUNCTION public.learning_register_worksheet_task(p_assignment uuid,p_problem uuid,p_snapshot_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.assignment_problems WHERE id=p_problem AND assignment_id=p_assignment
    AND owner_id=auth.uid() AND source IN ('manual','student_confirmed_source') AND unit_type='problem') THEN
    RAISE EXCEPTION 'Owned confirmed worksheet required' USING ERRCODE='42501'; END IF;
  RETURN public.learning_register_task(auth.uid(),p_assignment,p_problem,'worksheet_problem',p_problem::text,p_snapshot_sha256,'legacy_unresolved',NULL);
END $$;
CREATE FUNCTION public.learning_bind_worksheet_source(p_assignment uuid,p_problem uuid,p_source_version text,p_source_page integer,p_source_snapshot_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  RETURN public.learning_bind_task_source(auth.uid(),p_assignment,p_problem,p_source_version,p_source_page,p_source_snapshot_sha256);
END $$;

CREATE FUNCTION public.learning_bind_exercise(p_owner uuid,p_assignment uuid,p_task uuid,p_exercise text,p_source_snapshot_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE task public.learning_task_origins; exercise public.learning_exercises; binding public.learning_exercise_bindings; snapshot text; ref text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_task::text,813));
  SELECT * INTO task FROM public.learning_task_origins WHERE id=p_task AND owner_id=p_owner AND assignment_id=p_assignment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned task unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO exercise FROM public.learning_exercises WHERE id=p_exercise AND owner_id=p_owner AND assignment_id=p_assignment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned exercise unavailable' USING ERRCODE='42501'; END IF;
  IF task.origin_kind='worksheet_problem' THEN
    SELECT public.learning_task_sha256(problem_text) INTO snapshot FROM public.assignment_problems
      WHERE id=task.origin_key::uuid AND owner_id=p_owner AND assignment_id=p_assignment;
    IF NOT EXISTS(SELECT 1 FROM public.learning_task_sources s JOIN public.learning_blocks b
      ON b.version_id=s.source_version_id AND b.owner_id=s.owner_id AND b.payload->'location'->>'page'=s.source_page::text
      WHERE s.task_id=p_task AND s.source_version_id=exercise.version_id AND s.source_snapshot_sha256=p_source_snapshot_sha256
        AND exercise.id=b.id||':value' AND b.payload->>'kind'='problem' AND b.payload->>'needsConfirmation'='false'
        AND exercise.specification->>'kind'='equation_value'
        AND position(exercise.specification->>'equation' in b.payload->>'text')>0
        AND exercise.prompt='Find a value of x that satisfies '||(exercise.specification->>'equation')||'.') THEN
      RAISE EXCEPTION 'Verified worksheet exercise provenance required' USING ERRCODE='22023'; END IF;
  ELSE
    snapshot:=public.learning_task_sha256(exercise.prompt);
    IF NOT EXISTS(SELECT 1 FROM public.learning_exercises original WHERE original.id=task.reviewed_exercise_id
      AND original.prompt=exercise.prompt AND original.specification=exercise.specification AND original.skill_id=exercise.skill_id
      AND public.learning_task_reference(original.id)=task.reviewed_reference_sha256) THEN
      RAISE EXCEPTION 'Transfer alias requires unchanged reviewed content' USING ERRCODE='42501'; END IF;
  END IF;
  IF snapshot IS NULL OR snapshot IS DISTINCT FROM p_source_snapshot_sha256 THEN
    RAISE EXCEPTION 'Source snapshot mismatch' USING ERRCODE='22023'; END IF;
  ref:=public.learning_task_reference(p_exercise);
  IF task.reviewed_exercise_id=p_exercise AND task.reviewed_reference_sha256 IS DISTINCT FROM ref THEN
    RAISE EXCEPTION 'Reviewed reference changed' USING ERRCODE='22023'; END IF;
  SELECT * INTO binding FROM public.learning_exercise_bindings WHERE exercise_id=p_exercise;
  IF FOUND THEN
    IF binding.task_id<>p_task OR binding.owner_id<>p_owner OR binding.assignment_id<>p_assignment
      OR binding.source_version_id<>exercise.version_id OR binding.source_snapshot_sha256<>snapshot OR binding.reference_sha256<>ref THEN
      RAISE EXCEPTION 'Immutable binding conflict' USING ERRCODE='23505'; END IF;
  ELSE
    INSERT INTO public.learning_exercise_bindings VALUES(p_exercise,p_task,p_owner,p_assignment,exercise.version_id,snapshot,ref,clock_timestamp()) RETURNING * INTO binding;
  END IF;
  RETURN jsonb_build_object('taskId',binding.task_id,'exerciseId',binding.exercise_id,'sourceVersionId',binding.source_version_id,
    'sourceSnapshotSha256',binding.source_snapshot_sha256,'referenceSha256',binding.reference_sha256);
END $$;

CREATE FUNCTION public.learning_begin_task_assistance(p_owner uuid,p_assignment uuid,p_task uuid,p_request uuid,
  p_source_version text,p_source_snapshot_sha256 text,p_channel text,p_kind text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE task public.learning_task_origins; event public.learning_assistance_events; snapshot text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  IF NOT EXISTS(SELECT 1 FROM public.learning_task_assistance_control WHERE enforced) THEN
    RAISE EXCEPTION 'Durable assistance enforcement is staged' USING ERRCODE='55000'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_task::text,813));
  SELECT * INTO task FROM public.learning_task_origins WHERE id=p_task AND owner_id=p_owner AND assignment_id=p_assignment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owned task unavailable' USING ERRCODE='42501'; END IF;
  IF p_request IS NULL OR p_source_snapshot_sha256 IS NULL OR p_channel IS NULL OR p_kind IS NULL THEN
    RAISE EXCEPTION 'Complete assistance identity required' USING ERRCODE='22023'; END IF;
  IF p_source_version IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.learning_task_sources s
    WHERE s.task_id=p_task AND s.source_version_id=p_source_version AND s.source_snapshot_sha256=p_source_snapshot_sha256)
    AND NOT EXISTS(SELECT 1 FROM public.learning_exercise_bindings b
    WHERE b.task_id=p_task AND b.source_version_id=p_source_version AND b.source_snapshot_sha256=p_source_snapshot_sha256
      AND b.reference_sha256=public.learning_task_reference(b.exercise_id)) THEN
    RAISE EXCEPTION 'Current bound source required' USING ERRCODE='22023'; END IF;
  IF task.origin_kind='worksheet_problem' THEN
    SELECT public.learning_task_sha256(problem_text) INTO snapshot FROM public.assignment_problems
      WHERE id=task.origin_key::uuid AND owner_id=p_owner AND assignment_id=p_assignment;
    IF snapshot IS NULL OR snapshot IS DISTINCT FROM p_source_snapshot_sha256 THEN
      RAISE EXCEPTION 'Source snapshot mismatch' USING ERRCODE='22023'; END IF;
  ELSIF p_source_version IS NULL THEN RAISE EXCEPTION 'Bound source required' USING ERRCODE='22023'; END IF;
  SELECT * INTO event FROM public.learning_assistance_events WHERE request_id=p_request;
  IF FOUND THEN
    IF event.task_id<>p_task OR event.owner_id<>p_owner OR event.assignment_id<>p_assignment
      OR event.source_version_id IS DISTINCT FROM p_source_version OR event.source_snapshot_sha256<>p_source_snapshot_sha256
      OR event.channel<>p_channel OR event.kind<>p_kind THEN RAISE EXCEPTION 'Assistance request conflict' USING ERRCODE='23505'; END IF;
  ELSE
    INSERT INTO public.learning_assistance_events VALUES(p_request,p_task,p_owner,p_assignment,p_source_version,
      p_source_snapshot_sha256,p_channel,p_kind,clock_timestamp()) RETURNING * INTO event;
  END IF;
  RETURN jsonb_build_object('schemaVersion','task-assistance-v1','requestId',event.request_id,'taskId',event.task_id,
    'ownerId',event.owner_id,'assignmentId',event.assignment_id,'sourceVersionId',event.source_version_id,
    'sourceSnapshotSha256',event.source_snapshot_sha256,'channel',event.channel,'kind',event.kind,
    'recordedAt',event.created_at,'independenceBlocked',true);
END $$;

-- Lifetime task check, including pre-migration attempts and notebook history
-- through every immutable alias. No earlier eligibility records are rewritten.
CREATE FUNCTION public.learning_task_can_start(p_owner uuid,p_assignment uuid,p_exercise text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT EXISTS(SELECT 1 FROM public.learning_exercise_bindings b JOIN public.learning_task_origins t ON t.id=b.task_id
    JOIN public.learning_exercises e ON e.id=b.exercise_id
    WHERE b.exercise_id=p_exercise AND b.owner_id=p_owner AND b.assignment_id=p_assignment
      AND t.trust_basis='fresh_transfer_reviewed' AND e.reviewed AND e.skill_id LIKE 'math.%'
      AND b.reference_sha256=public.learning_task_reference(e.id)
      AND (t.origin_kind<>'worksheet_problem' OR EXISTS(SELECT 1 FROM public.assignment_problems w
        WHERE w.id=t.origin_key::uuid AND w.owner_id=p_owner AND w.assignment_id=p_assignment
          AND public.learning_task_sha256(w.problem_text)=b.source_snapshot_sha256))
      AND NOT EXISTS(SELECT 1 FROM public.learning_assistance_events h WHERE h.task_id=t.id)
      AND NOT EXISTS(SELECT 1 FROM public.learning_assignment_assistance h WHERE h.owner_id=p_owner AND h.assignment_id=p_assignment AND h.created_at>=t.created_at)
      AND NOT EXISTS(SELECT 1 FROM public.learning_attempts a WHERE a.owner_id=p_owner AND a.assignment_id=p_assignment
        AND (a.task_id=t.id OR a.problem_id IN (SELECT exercise_id FROM public.learning_exercise_bindings WHERE task_id=t.id)))
      AND NOT EXISTS(SELECT 1 FROM public.learning_problem_records p JOIN public.learning_problem_revisions r ON r.record_id=p.id
        WHERE p.owner_id=p_owner AND p.assignment_id=p_assignment AND r.state->'supportCount' IS DISTINCT FROM '0'::jsonb
          AND p.exercise_id IN (SELECT exercise_id FROM public.learning_exercise_bindings WHERE task_id=t.id)))
$$;

-- Preserve the prior conservative guards internally; prevent bypass by callers.
ALTER FUNCTION public.learning_start_independent(uuid,uuid,text) RENAME TO learning_start_independent_pre_task_v1;
ALTER FUNCTION public.learning_record_attempt(uuid,jsonb,text,jsonb) RENAME TO learning_record_attempt_pre_task_v1;
REVOKE ALL ON FUNCTION public.learning_start_independent_pre_task_v1(uuid,uuid,text),public.learning_record_attempt_pre_task_v1(uuid,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.learning_start_independent(p_owner uuid,p_assignment uuid,p_problem text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE binding public.learning_exercise_bindings; result jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_assignment::text,814));
  IF NOT EXISTS(SELECT 1 FROM public.learning_task_assistance_control WHERE enforced) THEN
    RETURN public.learning_start_independent_pre_task_v1(p_owner,p_assignment,p_problem); END IF;
  SELECT * INTO binding FROM public.learning_exercise_bindings WHERE exercise_id=p_problem AND owner_id=p_owner AND assignment_id=p_assignment;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trusted task binding required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(binding.task_id::text,813));
  IF NOT public.learning_task_can_start(p_owner,p_assignment,p_problem) THEN
    RAISE EXCEPTION 'Task is not independent evidence' USING ERRCODE='42501'; END IF;
  result:=public.learning_start_independent_pre_task_v1(p_owner,p_assignment,p_problem);
  UPDATE public.learning_independent_sessions SET task_id=binding.task_id,task_reference_sha256=binding.reference_sha256,
    task_source_version_id=binding.source_version_id WHERE id=(result->>'id')::uuid;
  RETURN result||jsonb_build_object('taskId',binding.task_id,'eligibilityGate','task-assistance-v1');
END $$;
CREATE FUNCTION public.learning_record_attempt(p_owner uuid,p_attempt jsonb,p_hash text,p_assessment jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE binding public.learning_exercise_bindings; result jsonb; clean boolean:=false; replay public.learning_attempts;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||(p_attempt->>'assignmentId'),814));
  IF NOT EXISTS(SELECT 1 FROM public.learning_task_assistance_control WHERE enforced) THEN
    RETURN public.learning_record_attempt_pre_task_v1(p_owner,p_attempt,p_hash,p_assessment); END IF;
  -- Serialize exact exercise replay as before; task lock is acquired first when bound.
  SELECT * INTO binding FROM public.learning_exercise_bindings WHERE exercise_id=p_attempt->>'problemId'
    AND owner_id=p_owner AND assignment_id=(p_attempt->>'assignmentId')::uuid;
  IF FOUND THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(binding.task_id::text,813));
    clean:=public.learning_task_can_start(p_owner,binding.assignment_id,binding.exercise_id)
      AND EXISTS(SELECT 1 FROM public.learning_independent_sessions s WHERE s.id=(p_attempt->>'sessionId')::uuid
        AND s.owner_id=p_owner AND s.assignment_id=binding.assignment_id AND s.problem_id=binding.exercise_id
        AND s.task_id=binding.task_id AND s.task_reference_sha256=binding.reference_sha256 AND s.task_source_version_id=binding.source_version_id);
  END IF;
  result:=public.learning_record_attempt_pre_task_v1(p_owner,p_attempt,p_hash,p_assessment);
  IF result->>'replayed'='true' THEN RETURN result; END IF;
  p_assessment:=(result->'assessment')||jsonb_build_object('eligibleForKnowledge',clean AND coalesce((result->'assessment'->>'eligibleForKnowledge')::boolean,false),
    'eligibilityGate','task-assistance-v1');
  UPDATE public.learning_attempts SET task_id=binding.task_id,assessment=p_assessment WHERE id=(p_attempt->>'id')::uuid;
  RETURN jsonb_build_object('replayed',false,'assessment',p_assessment);
END $$;

REVOKE ALL ON FUNCTION public.learning_task_sha256(text),public.learning_task_reference(text),public.learning_task_can_start(uuid,uuid,text),
  public.learning_register_task(uuid,uuid,uuid,text,text,text,text,text),public.learning_bind_exercise(uuid,uuid,uuid,text,text),
  public.learning_begin_task_assistance(uuid,uuid,uuid,uuid,text,text,text,text),
  public.learning_start_independent(uuid,uuid,text),public.learning_record_attempt(uuid,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.learning_bind_task_source(uuid,uuid,uuid,text,integer,text),
  public.learning_register_worksheet_task(uuid,uuid,text),public.learning_bind_worksheet_source(uuid,uuid,text,integer,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learning_register_worksheet_task(uuid,uuid,text),public.learning_bind_worksheet_source(uuid,uuid,text,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.learning_bind_task_source(uuid,uuid,uuid,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.learning_bind_exercise(uuid,uuid,uuid,text,text),
  public.learning_begin_task_assistance(uuid,uuid,uuid,uuid,text,text,text,text),
  public.learning_start_independent(uuid,uuid,text),public.learning_record_attempt(uuid,jsonb,text,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.learning_provision_reviewed_transfer(uuid,uuid,uuid,text),public.learning_activate_task_assistance(),
  public.learning_begin_assignment_assistance(uuid,uuid,text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learning_provision_reviewed_transfer(uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.learning_begin_assignment_assistance(uuid,uuid,text,text,text,uuid) TO authenticated;
COMMIT;
