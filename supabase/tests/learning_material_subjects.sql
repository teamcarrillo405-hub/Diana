-- Uses the existing synthetic QA assignment only. Every row change is rolled back.
BEGIN;
DO $$
DECLARE
  qa_owner uuid := 'ad37c468-67f5-4b5f-9e28-b5e947a4075c';
  qa_assignment uuid := '0a56fa43-3e0a-4fc1-9f43-dc65c529f080';
  qa_source uuid := '4e743a64-5a1b-462c-a6e5-651a9b87983c';
  asset_hash text := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  version_id text := replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  english_job uuid; science_job uuid; lease uuid := gen_random_uuid();
  denied boolean; fixture_pages jsonb := '[{"page":1,"pageLabel":"1","text":"Synthetic evidence passage.","interpretation":"original"}]';
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.assignment_sources WHERE id=qa_source AND owner_id=qa_owner AND assignment_id=qa_assignment AND mime_type='application/pdf') THEN RAISE EXCEPTION 'Synthetic PDF fixture unavailable'; END IF;
  PERFORM set_config('request.jwt.claim.sub',qa_owner::text,true);
  english_job:=public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,'english');
  science_job:=public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,'science');
  IF english_job=science_job OR science_job<>public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,'science') THEN RAISE EXCEPTION 'Subject identity or retry invariant'; END IF;
  denied:=false;
  BEGIN PERFORM public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,'unknown'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Unknown subject admitted'; END IF;
  denied:=false;
  BEGIN PERFORM public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,NULL); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Null subject admitted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  denied:=false;
  BEGIN PERFORM public.learning_enqueue_ingestion(qa_assignment,qa_source,asset_hash,'science'); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Cross-owner source admitted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',qa_owner::text,true);
  UPDATE public.learning_ingestion_jobs SET state='extracting',lease_token=lease,lease_until=now()+interval '90 seconds',cursor=1,total_pages=1,pages=fixture_pages
    WHERE id=science_job;
  INSERT INTO public.learning_documents(id,owner_id,assignment_id,class_id,document_id,content_hash,metadata,pages)
    SELECT version_id,qa_owner,qa_assignment,class_id,qa_source::text,asset_hash,jsonb_build_object('subject','english','sourceAssetHash',asset_hash),fixture_pages FROM public.assignments WHERE id=qa_assignment;
  denied:=false;
  BEGIN PERFORM public.learning_finish_ingestion(science_job,lease,version_id); EXCEPTION WHEN raise_exception THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Mismatched subject admitted'; END IF;
  UPDATE public.learning_documents SET metadata=jsonb_build_object('subject','science','sourceAssetHash',repeat('0',64)) WHERE id=version_id;
  denied:=false;
  BEGIN PERFORM public.learning_finish_ingestion(science_job,lease,version_id); EXCEPTION WHEN raise_exception THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Mismatched PDF asset admitted'; END IF;
  UPDATE public.learning_documents SET metadata=jsonb_build_object('subject','science','sourceAssetHash',asset_hash) WHERE id=version_id;
  IF public.learning_finish_ingestion(science_job,NULL,version_id) THEN RAISE EXCEPTION 'Null lease admitted'; END IF;
  IF NOT public.learning_finish_ingestion(science_job,lease,version_id) THEN RAISE EXCEPTION 'Valid source rejected'; END IF;
  IF public.learning_finish_ingestion(science_job,lease,version_id) THEN RAISE EXCEPTION 'Reused lease admitted'; END IF;
  IF has_function_privilege('anon','public.learning_enqueue_ingestion(uuid,uuid,text,text)','EXECUTE')
    OR has_function_privilege('anon','public.learning_finish_ingestion(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous execution granted'; END IF;
END $$;
ROLLBACK;

