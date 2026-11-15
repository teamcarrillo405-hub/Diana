BEGIN;
CREATE OR REPLACE FUNCTION public.learning_finish_ingestion(p_job uuid,p_token uuid,p_version text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.learning_ingestion_jobs;
BEGIN
  IF p_token IS NULL OR p_version IS NULL THEN RETURN false; END IF;
  SELECT * INTO job FROM public.learning_ingestion_jobs WHERE id=p_job AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR job.lease_token IS NULL OR job.lease_until IS NULL OR job.lease_token<>p_token OR job.lease_until<=now()
    OR job.state<>'extracting' OR job.total_pages IS NULL OR job.cursor<>job.total_pages THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learning_documents d WHERE d.id=p_version AND d.owner_id=auth.uid() AND d.assignment_id=job.assignment_id AND d.document_id=job.source_id AND d.pages=job.pages) THEN RAISE EXCEPTION 'Indexed version mismatch'; END IF;
  UPDATE public.learning_ingestion_jobs SET version_id=p_version,state=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(job.pages) p WHERE p->>'interpretation'='model_extraction') THEN 'needs_confirmation' ELSE 'ready' END,
    lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=p_job;
  RETURN true;
END $$;
COMMIT;
