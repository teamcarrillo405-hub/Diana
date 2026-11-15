BEGIN;
ALTER TABLE public.learning_ingestion_jobs ADD COLUMN pages jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.learning_ingestion_jobs ADD COLUMN total_pages integer CHECK(total_pages BETWEEN 1 AND 1500);
ALTER TABLE public.learning_ingestion_jobs ADD COLUMN subject text NOT NULL DEFAULT 'math' CHECK(subject IN ('math','reading'));

CREATE FUNCTION public.learning_enqueue_ingestion(p_assignment uuid,p_source uuid,p_hash text,p_subject text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_subject NOT IN ('math','reading') OR NOT EXISTS(
    SELECT 1 FROM public.assignment_sources s JOIN public.assignments a ON a.id=s.assignment_id AND a.owner_id=s.owner_id
    WHERE s.id=p_source AND s.assignment_id=p_assignment AND s.owner_id=auth.uid() AND s.mime_type='application/pdf'
  ) THEN RAISE EXCEPTION 'Source unavailable' USING ERRCODE='42501'; END IF;
  -- Subject participates in the deduplication identity without changing the pinned byte hash.
  INSERT INTO public.learning_ingestion_jobs(owner_id,assignment_id,source_id,content_hash,subject)
    VALUES(auth.uid(),p_assignment,p_source::text,p_hash,p_subject) ON CONFLICT(owner_id,assignment_id,source_id,content_hash) DO NOTHING;
  SELECT id INTO job_id FROM public.learning_ingestion_jobs WHERE owner_id=auth.uid() AND assignment_id=p_assignment AND source_id=p_source::text AND content_hash=p_hash AND subject=p_subject;
  IF job_id IS NULL THEN RAISE EXCEPTION 'Source already prepared under another subject'; END IF;
  UPDATE public.learning_ingestion_jobs SET state='queued',error_code=NULL,updated_at=now() WHERE id=job_id AND state='error';
  RETURN job_id;
END $$;

CREATE FUNCTION public.learning_claim_ingestion(p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.learning_ingestion_jobs;
BEGIN
  UPDATE public.learning_ingestion_jobs SET lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds',state='extracting',attempts=attempts+1,updated_at=now()
    WHERE id=p_job AND owner_id=auth.uid() AND state IN ('queued','extracting','indexing') AND (lease_until IS NULL OR lease_until<=now())
    RETURNING * INTO job;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(job);
END $$;

CREATE FUNCTION public.learning_checkpoint_ingestion(p_job uuid,p_token uuid,p_pages jsonb,p_total integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.learning_ingestion_jobs; item jsonb; count_pages integer; expected integer;
BEGIN
  SELECT * INTO job FROM public.learning_ingestion_jobs WHERE id=p_job AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR job.lease_token IS DISTINCT FROM p_token OR job.lease_until<=now() OR job.state<>'extracting' THEN RETURN false; END IF;
  IF jsonb_typeof(p_pages)<>'array' OR p_total NOT BETWEEN 1 AND 1500 OR (job.total_pages IS NOT NULL AND job.total_pages<>p_total) THEN RAISE EXCEPTION 'Invalid page batch'; END IF;
  count_pages:=jsonb_array_length(p_pages);
  IF count_pages NOT BETWEEN 1 AND 10 OR job.cursor+count_pages>p_total OR octet_length((job.pages||p_pages)::text)>12000000 THEN RAISE EXCEPTION 'Page batch exceeds limits'; END IF;
  expected:=job.cursor+1;
  FOR item IN SELECT value FROM jsonb_array_elements(p_pages) LOOP
    IF (item->>'page')::integer IS DISTINCT FROM expected OR jsonb_typeof(item->'text')<>'string' OR length(item->>'text')>250000 THEN RAISE EXCEPTION 'Page order mismatch'; END IF;
    expected:=expected+1;
  END LOOP;
  UPDATE public.learning_ingestion_jobs SET pages=pages||p_pages,cursor=cursor+count_pages,total_pages=p_total,
    state=CASE WHEN cursor+count_pages=p_total THEN 'indexing' ELSE 'queued' END,lease_token=NULL,lease_until=NULL,error_code=NULL,updated_at=now() WHERE id=p_job;
  RETURN true;
END $$;

CREATE FUNCTION public.learning_finish_ingestion(p_job uuid,p_token uuid,p_version text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.learning_ingestion_jobs;
BEGIN
  SELECT * INTO job FROM public.learning_ingestion_jobs WHERE id=p_job AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR job.lease_token IS DISTINCT FROM p_token OR job.lease_until<=now() OR job.cursor IS DISTINCT FROM job.total_pages THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learning_documents d WHERE d.id=p_version AND d.owner_id=auth.uid() AND d.assignment_id=job.assignment_id AND d.document_id=job.source_id AND d.pages=job.pages) THEN RAISE EXCEPTION 'Indexed version mismatch'; END IF;
  UPDATE public.learning_ingestion_jobs SET version_id=p_version,state=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(job.pages) p WHERE p->>'interpretation'='model_extraction') THEN 'needs_confirmation' ELSE 'ready' END,
    lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=p_job;
  RETURN true;
END $$;

CREATE FUNCTION public.learning_fail_ingestion(p_job uuid,p_token uuid,p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF p_code NOT IN ('source_changed','extraction_unavailable','storage_unavailable') THEN RAISE EXCEPTION 'Invalid code'; END IF;
  UPDATE public.learning_ingestion_jobs SET state='error',error_code=p_code,lease_token=NULL,lease_until=NULL,updated_at=now()
    WHERE id=p_job AND owner_id=auth.uid() AND lease_token=p_token AND lease_until>now();
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.learning_enqueue_ingestion(uuid,uuid,text,text),public.learning_claim_ingestion(uuid),public.learning_checkpoint_ingestion(uuid,uuid,jsonb,integer),public.learning_finish_ingestion(uuid,uuid,text),public.learning_fail_ingestion(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_enqueue_ingestion(uuid,uuid,text,text),public.learning_claim_ingestion(uuid),public.learning_checkpoint_ingestion(uuid,uuid,jsonb,integer),public.learning_finish_ingestion(uuid,uuid,text),public.learning_fail_ingestion(uuid,uuid,text) TO authenticated;
COMMIT;
