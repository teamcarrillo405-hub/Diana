BEGIN;
-- Preserve existing jobs and pinned content hashes. Subject is part of job identity.
ALTER TABLE public.learning_ingestion_jobs DROP CONSTRAINT learning_ingestion_jobs_subject_check;
ALTER TABLE public.learning_ingestion_jobs ADD CONSTRAINT learning_ingestion_jobs_subject_check
  CHECK(subject IN ('math','reading','english','science','history','computing','other'));
ALTER TABLE public.learning_ingestion_jobs DROP CONSTRAINT learning_ingestion_jobs_owner_id_assignment_id_source_id_co_key;
ALTER TABLE public.learning_ingestion_jobs ADD CONSTRAINT learning_ingestion_jobs_source_subject_key
  UNIQUE(owner_id,assignment_id,source_id,content_hash,subject);
CREATE OR REPLACE FUNCTION public.learning_enqueue_ingestion(p_assignment uuid,p_source uuid,p_hash text,p_subject text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR p_hash IS NULL OR p_subject IS NULL OR p_hash !~ '^[a-f0-9]{64}$'
    OR p_subject NOT IN ('math','reading','english','science','history','computing','other') OR NOT EXISTS(
      SELECT 1 FROM public.assignment_sources s JOIN public.assignments a ON a.id=s.assignment_id AND a.owner_id=s.owner_id
      WHERE s.id=p_source AND s.assignment_id=p_assignment AND s.owner_id=auth.uid() AND s.mime_type='application/pdf'
    ) THEN RAISE EXCEPTION 'Source unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.learning_ingestion_jobs(owner_id,assignment_id,source_id,content_hash,subject)
    VALUES(auth.uid(),p_assignment,p_source::text,p_hash,p_subject)
    ON CONFLICT(owner_id,assignment_id,source_id,content_hash,subject) DO NOTHING;
  SELECT id INTO job_id FROM public.learning_ingestion_jobs
    WHERE owner_id=auth.uid() AND assignment_id=p_assignment AND source_id=p_source::text AND content_hash=p_hash AND subject=p_subject;
  IF job_id IS NULL THEN RAISE EXCEPTION 'Source unavailable'; END IF;
  UPDATE public.learning_ingestion_jobs SET state='queued',error_code=NULL,updated_at=now() WHERE id=job_id AND state='error';
  RETURN job_id;
END $$;
REVOKE ALL ON FUNCTION public.learning_enqueue_ingestion(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_enqueue_ingestion(uuid,uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.learning_finish_ingestion(p_job uuid,p_token uuid,p_version text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job public.learning_ingestion_jobs;
BEGIN
  IF p_token IS NULL OR p_version IS NULL THEN RETURN false; END IF;
  SELECT * INTO job FROM public.learning_ingestion_jobs WHERE id=p_job AND owner_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR job.lease_token IS NULL OR job.lease_until IS NULL OR job.lease_token<>p_token OR job.lease_until<=now()
    OR job.state<>'extracting' OR job.total_pages IS NULL OR job.cursor<>job.total_pages THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.learning_documents d
    WHERE d.id=p_version AND d.owner_id=auth.uid() AND d.assignment_id=job.assignment_id AND d.document_id=job.source_id
      AND d.pages=job.pages AND d.metadata->>'subject'=job.subject AND d.metadata->>'sourceAssetHash'=job.content_hash)
    THEN RAISE EXCEPTION 'Indexed version mismatch'; END IF;
  UPDATE public.learning_ingestion_jobs SET version_id=p_version,
    state=CASE WHEN EXISTS(SELECT 1 FROM jsonb_array_elements(job.pages) p WHERE p->>'interpretation'='model_extraction') THEN 'needs_confirmation' ELSE 'ready' END,
    lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=p_job;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.learning_finish_ingestion(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.learning_finish_ingestion(uuid,uuid,text) TO authenticated;
COMMIT;
