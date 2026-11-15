-- Additive learning engine. Private curriculum never enters a cross-owner index.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE public.learning_documents (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{64}$'),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.assignments(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  metadata jsonb NOT NULL,
  pages jsonb NOT NULL CHECK (jsonb_typeof(pages) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, owner_id)
);
CREATE INDEX learning_documents_scope ON public.learning_documents(owner_id, assignment_id, class_id);

CREATE TABLE public.learning_blocks (
  id text PRIMARY KEY,
  version_id text NOT NULL,
  owner_id uuid NOT NULL,
  payload jsonb NOT NULL,
  FOREIGN KEY (version_id, owner_id) REFERENCES public.learning_documents(id, owner_id) ON DELETE CASCADE
);
CREATE TABLE public.learning_chunks (
  id text PRIMARY KEY,
  version_id text NOT NULL,
  owner_id uuid NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 12000),
  payload jsonb NOT NULL,
  search_terms tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding extensions.vector(1536),
  embedding_model text CHECK (embedding_model IS NULL OR embedding_model = 'text-embedding-3-small'),
  FOREIGN KEY (version_id, owner_id) REFERENCES public.learning_documents(id, owner_id) ON DELETE CASCADE,
  CHECK ((embedding IS NULL) = (embedding_model IS NULL))
);
CREATE INDEX learning_chunks_lexical ON public.learning_chunks USING gin(search_terms);
CREATE INDEX learning_chunks_owner_version ON public.learning_chunks(owner_id, version_id);
-- Owner/version filtering precedes exact vector ranking. An ANN index can reduce
-- recall when tenant filters are applied afterward; benchmark before adding one.

CREATE TABLE public.learning_ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  content_hash text NOT NULL,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','extracting','needs_confirmation','indexing','ready','error')),
  cursor integer NOT NULL DEFAULT 0 CHECK (cursor >= 0),
  version_id text REFERENCES public.learning_documents(id) ON DELETE SET NULL,
  lease_token uuid,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  error_code text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, assignment_id, source_id, content_hash)
);

CREATE TABLE public.learning_attempts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  payload jsonb NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  assessment jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, assignment_id, problem_id, revision)
);
CREATE INDEX learning_attempts_owner_assignment ON public.learning_attempts(owner_id, assignment_id, created_at);

-- Trusted reference specifications are written by operators, never accepted from
-- the student's request. Uploading a source does not create an answer key.
CREATE TABLE public.learning_exercises (
  id text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  version_id text NOT NULL,
  skill_id text NOT NULL,
  prompt text NOT NULL,
  specification jsonb NOT NULL,
  reviewed boolean NOT NULL DEFAULT false,
  FOREIGN KEY (version_id, owner_id) REFERENCES public.learning_documents(id, owner_id) ON DELETE CASCADE
);

CREATE TABLE public.learning_experiment_months (
  month date PRIMARY KEY CHECK (extract(day FROM month) = 1),
  reserved_cents integer NOT NULL DEFAULT 0 CHECK (reserved_cents >= 0),
  spent_cents integer NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
  cap_cents integer NOT NULL DEFAULT 10000 CHECK (cap_cents BETWEEN 0 AND 10000)
);
CREATE TABLE public.learning_experiment_reservations (
  id uuid PRIMARY KEY,
  month date NOT NULL REFERENCES public.learning_experiment_months(month),
  manifest_hash text NOT NULL,
  batch_id uuid NOT NULL,
  batch_cap_cents integer NOT NULL CHECK (batch_cap_cents BETWEEN 1 AND 1000),
  reserved_cents integer NOT NULL CHECK (reserved_cents BETWEEN 1 AND 1000),
  actual_cents integer CHECK (actual_cents >= 0),
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','started','settled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.learning_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_experiment_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_experiment_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_documents_read ON public.learning_documents FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY learning_blocks_read ON public.learning_blocks FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY learning_chunks_read ON public.learning_chunks FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY learning_jobs_read ON public.learning_ingestion_jobs FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY learning_attempts_read ON public.learning_attempts FOR SELECT TO authenticated USING (owner_id = auth.uid());
-- Exercise specifications include the reference answer and are not exposed as a table.
REVOKE ALL ON public.learning_documents, public.learning_blocks, public.learning_chunks,
  public.learning_ingestion_jobs, public.learning_attempts, public.learning_exercises,
  public.learning_experiment_months, public.learning_experiment_reservations FROM anon, authenticated;
GRANT SELECT ON public.learning_documents, public.learning_blocks, public.learning_chunks,
  public.learning_ingestion_jobs, public.learning_attempts TO authenticated;
GRANT ALL ON public.learning_documents, public.learning_blocks, public.learning_chunks,
  public.learning_ingestion_jobs, public.learning_attempts, public.learning_exercises,
  public.learning_experiment_months, public.learning_experiment_reservations TO service_role;

CREATE FUNCTION public.learning_store_document(p_document jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v jsonb := p_document->'version';
  owner uuid := auth.uid();
  assignment uuid := nullif(v->>'assignmentId','')::uuid;
  class uuid := nullif(v->>'classId','')::uuid;
  item jsonb;
BEGIN
  IF owner IS NULL OR owner <> (v->>'ownerId')::uuid THEN RAISE EXCEPTION 'Owner mismatch' USING ERRCODE='42501'; END IF;
  IF assignment IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.assignments a WHERE a.id = assignment AND a.owner_id = owner
      AND a.class_id IS NOT DISTINCT FROM class
  ) THEN RAISE EXCEPTION 'Assignment unavailable' USING ERRCODE='42501'; END IF;
  IF octet_length(p_document::text) > 24000000
    OR jsonb_array_length(p_document->'blocks') > 15000
    OR jsonb_array_length(p_document->'chunks') > 15000
    OR v->>'trainingPermission' <> 'excluded'
  THEN RAISE EXCEPTION 'Document bounds or rights invalid'; END IF;
  INSERT INTO public.learning_documents(id,owner_id,assignment_id,class_id,document_id,content_hash,metadata,pages)
  VALUES(v->>'id',owner,assignment,class,v->>'documentId',v->>'contentHash',v,p_document->'pages')
  ON CONFLICT(id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.learning_documents d WHERE d.id=v->>'id' AND d.owner_id=owner
    AND d.metadata=v AND d.pages=p_document->'pages') THEN RAISE EXCEPTION 'Version conflict'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_document->'blocks') LOOP
    IF item->>'versionId' <> v->>'id' THEN RAISE EXCEPTION 'Block version mismatch'; END IF;
    INSERT INTO public.learning_blocks(id,version_id,owner_id,payload) VALUES(item->>'id',v->>'id',owner,item)
    ON CONFLICT(id) DO NOTHING;
  END LOOP;
  FOR item IN SELECT value FROM jsonb_array_elements(p_document->'chunks') LOOP
    IF item->>'versionId' <> v->>'id' OR (item->>'ownerId')::uuid <> owner
      OR item->>'assignmentId' <> assignment::text THEN RAISE EXCEPTION 'Chunk scope mismatch'; END IF;
    INSERT INTO public.learning_chunks(id,version_id,owner_id,content,payload)
    VALUES(item->>'id',v->>'id',owner,item->>'text',item) ON CONFLICT(id) DO NOTHING;
  END LOOP;
  RETURN v->>'id';
END $$;
REVOKE ALL ON FUNCTION public.learning_store_document(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_store_document(jsonb) TO authenticated;

CREATE FUNCTION public.learning_search(
  p_assignment uuid, p_versions text[], p_query text, p_embedding extensions.vector(1536) DEFAULT NULL
) RETURNS TABLE(payload jsonb, lexical_rank bigint, semantic_rank bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public, extensions, pg_temp AS $$
  WITH scope AS MATERIALIZED (
    SELECT c.* FROM public.learning_chunks c
    JOIN public.learning_documents d ON d.id=c.version_id AND d.owner_id=c.owner_id
    JOIN public.assignments a ON a.id=p_assignment AND a.owner_id=auth.uid()
    WHERE c.owner_id=auth.uid() AND c.version_id=ANY(p_versions)
      AND (d.assignment_id=a.id OR (d.assignment_id IS NULL AND d.class_id=a.class_id))
  ), lexical AS (
    SELECT id, row_number() OVER (ORDER BY ts_rank_cd(search_terms,websearch_to_tsquery('english',left(p_query,1000))) DESC,id) rank
    FROM scope WHERE search_terms @@ websearch_to_tsquery('english',left(p_query,1000))
    ORDER BY rank LIMIT 20
  ), semantic AS (
    SELECT id, row_number() OVER (ORDER BY embedding <=> p_embedding,id) rank FROM scope
    WHERE p_embedding IS NOT NULL AND embedding IS NOT NULL AND embedding_model='text-embedding-3-small'
      AND embedding <=> p_embedding < 0.65
    ORDER BY rank LIMIT 20
  )
  SELECT s.payload,l.rank,m.rank FROM scope s
  LEFT JOIN lexical l ON l.id=s.id LEFT JOIN semantic m ON m.id=s.id
  WHERE l.id IS NOT NULL OR m.id IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.learning_search(uuid,text[],text,extensions.vector) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learning_search(uuid,text[],text,extensions.vector) TO authenticated;

-- Row lock makes parallel budget reservations atomic. Unknown provider outcomes
-- retain their full reservation until an operator reconciles actual usage.
CREATE FUNCTION public.learning_reserve_experiment(p_id uuid,p_manifest_hash text,p_cents integer,p_batch_id uuid,p_batch_cap integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_month date := date_trunc('month', now() AT TIME ZONE 'UTC')::date; existing public.learning_experiment_reservations;
BEGIN
  IF p_cents NOT BETWEEN 1 AND 1000 OR p_batch_cap NOT BETWEEN 1 AND 1000 OR p_batch_id IS NULL
    OR p_manifest_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid reservation'; END IF;
  INSERT INTO public.learning_experiment_months(month) VALUES(current_month) ON CONFLICT DO NOTHING;
  PERFORM 1 FROM public.learning_experiment_months WHERE month=current_month FOR UPDATE;
  SELECT * INTO existing FROM public.learning_experiment_reservations WHERE id=p_id;
  IF FOUND THEN
    IF existing.manifest_hash <> p_manifest_hash OR existing.reserved_cents <> p_cents OR existing.batch_id<>p_batch_id THEN RAISE EXCEPTION 'Idempotency conflict'; END IF;
    RETURN false; -- never authorizes a second provider execution
  END IF;
  IF (SELECT coalesce(sum(CASE WHEN state='settled' THEN actual_cents ELSE reserved_cents END),0)
    FROM public.learning_experiment_reservations WHERE batch_id=p_batch_id)+p_cents>p_batch_cap THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.learning_experiment_reservations WHERE batch_id=p_batch_id
    AND (manifest_hash<>p_manifest_hash OR batch_cap_cents<>p_batch_cap)) THEN RAISE EXCEPTION 'Batch contract conflict'; END IF;
  UPDATE public.learning_experiment_months SET reserved_cents=reserved_cents+p_cents
    WHERE month=current_month AND spent_cents+reserved_cents+p_cents<=cap_cents;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.learning_experiment_reservations(id,month,manifest_hash,reserved_cents,batch_id,batch_cap_cents)
    VALUES(p_id,current_month,p_manifest_hash,p_cents,p_batch_id,p_batch_cap);
  RETURN true;
END $$;
CREATE FUNCTION public.learning_settle_experiment(p_id uuid,p_actual_cents integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE reservation public.learning_experiment_reservations;
BEGIN
  IF p_actual_cents < 0 THEN RAISE EXCEPTION 'Invalid usage'; END IF;
  SELECT * INTO reservation FROM public.learning_experiment_reservations WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF reservation.state='settled' THEN
    IF reservation.actual_cents<>p_actual_cents THEN RAISE EXCEPTION 'Settlement conflict'; END IF;
    RETURN false;
  END IF;
  UPDATE public.learning_experiment_months SET reserved_cents=reserved_cents-reservation.reserved_cents,
    spent_cents=spent_cents+p_actual_cents WHERE month=reservation.month;
  UPDATE public.learning_experiment_reservations SET state='settled',actual_cents=p_actual_cents WHERE id=p_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.learning_reserve_experiment(uuid,text,integer,uuid,integer),public.learning_settle_experiment(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_reserve_experiment(uuid,text,integer,uuid,integer),public.learning_settle_experiment(uuid,integer) TO service_role;
COMMIT;
