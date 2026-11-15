-- Synthetic QA fixture, all changes roll back.
BEGIN;
SET LOCAL statement_timeout='20s';
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.assignments WHERE id='0a56fa43-3e0a-4fc1-9f43-dc65c529f080' AND owner_id='ad37c468-67f5-4b5f-9e28-b5e947a4075c') THEN RAISE EXCEPTION 'QA assignment unavailable'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','ad37c468-67f5-4b5f-9e28-b5e947a4075c',true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE source uuid:=gen_random_uuid(); job uuid; lease jsonb; next_lease jsonb; pages jsonb; metadata jsonb; version text:=repeat('e',64); class uuid;
BEGIN
  INSERT INTO public.assignment_sources(id,assignment_id,owner_id,source_type,title,mime_type,storage_key,import_status)
    VALUES(source,'0a56fa43-3e0a-4fc1-9f43-dc65c529f080',auth.uid(),'upload','Synthetic lease test','application/pdf',auth.uid()::text||'/synthetic-lease.pdf','ready');
  job:=public.learning_enqueue_ingestion('0a56fa43-3e0a-4fc1-9f43-dc65c529f080',source,repeat('f',64),'math');
  IF job<>public.learning_enqueue_ingestion('0a56fa43-3e0a-4fc1-9f43-dc65c529f080',source,repeat('f',64),'math') THEN RAISE EXCEPTION 'Duplicate job'; END IF;
  lease:=public.learning_claim_ingestion(job);
  IF lease IS NULL OR public.learning_claim_ingestion(job) IS NOT NULL THEN RAISE EXCEPTION 'Lease exclusivity violated'; END IF;
  pages:=jsonb_build_array(jsonb_build_object('page',1,'pageLabel','Page 1','text','1. Solve x + 2 = 5.','interpretation','original'));
  IF public.learning_checkpoint_ingestion(job,gen_random_uuid(),pages,1) THEN RAISE EXCEPTION 'Foreign lease accepted'; END IF;
  IF NOT public.learning_checkpoint_ingestion(job,(lease->>'lease_token')::uuid,pages,1) THEN RAISE EXCEPTION 'Checkpoint rejected'; END IF;
  IF public.learning_checkpoint_ingestion(job,(lease->>'lease_token')::uuid,pages,1) THEN RAISE EXCEPTION 'Checkpoint replay accepted'; END IF;
  IF public.learning_finish_ingestion(job,NULL,version) THEN RAISE EXCEPTION 'Completion accepted without lease'; END IF;
  next_lease:=public.learning_claim_ingestion(job);
  IF (next_lease->>'cursor')::integer<>1 OR next_lease->'pages'<>pages THEN RAISE EXCEPTION 'Resume lost pages'; END IF;
  SELECT class_id INTO class FROM public.assignments WHERE id='0a56fa43-3e0a-4fc1-9f43-dc65c529f080';
  metadata:=jsonb_build_object('id',version,'ownerId',auth.uid(),'assignmentId','0a56fa43-3e0a-4fc1-9f43-dc65c529f080','classId',class,'documentId',source,'contentHash',repeat('d',64),'trainingPermission','excluded');
  PERFORM public.learning_store_document(jsonb_build_object('version',metadata,'pages',pages,'blocks','[]'::jsonb,'chunks','[]'::jsonb));
  IF public.learning_finish_ingestion(job,(lease->>'lease_token')::uuid,version) THEN RAISE EXCEPTION 'Stale lease completed job'; END IF;
  IF NOT public.learning_finish_ingestion(job,(next_lease->>'lease_token')::uuid,version) THEN RAISE EXCEPTION 'Completion rejected'; END IF;
  IF public.learning_claim_ingestion(job) IS NOT NULL THEN RAISE EXCEPTION 'Completed job re-leased'; END IF;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000999',true);
  IF public.learning_claim_ingestion(job) IS NOT NULL OR EXISTS(SELECT 1 FROM public.learning_ingestion_jobs WHERE id=job) THEN RAISE EXCEPTION 'Cross-owner job access'; END IF;
END $$;
ROLLBACK;
