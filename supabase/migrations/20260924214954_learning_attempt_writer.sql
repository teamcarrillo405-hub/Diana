BEGIN;
CREATE FUNCTION public.learning_record_attempt(p_owner uuid,p_attempt jsonb,p_hash text,p_assessment jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.learning_attempts; latest integer; assignment uuid := (p_attempt->>'assignmentId')::uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text || ':' || assignment::text || ':' || (p_attempt->>'problemId'),0));
  IF NOT EXISTS(SELECT 1 FROM public.assignments WHERE id=assignment AND owner_id=p_owner) THEN
    RAISE EXCEPTION 'Assignment unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO existing FROM public.learning_attempts WHERE id=(p_attempt->>'id')::uuid;
  IF FOUND THEN
    IF existing.owner_id<>p_owner OR existing.payload_hash<>p_hash THEN RAISE EXCEPTION 'Attempt conflict' USING ERRCODE='23505'; END IF;
    RETURN jsonb_build_object('replayed',true,'assessment',existing.assessment);
  END IF;
  SELECT coalesce(max(revision),0) INTO latest FROM public.learning_attempts
    WHERE owner_id=p_owner AND assignment_id=assignment AND problem_id=p_attempt->>'problemId';
  IF (p_attempt->>'revision')::integer<>latest+1 THEN RAISE EXCEPTION 'Revision conflict' USING ERRCODE='23505'; END IF;
  INSERT INTO public.learning_attempts(id,owner_id,assignment_id,problem_id,revision,payload,payload_hash,assessment)
    VALUES((p_attempt->>'id')::uuid,p_owner,assignment,p_attempt->>'problemId',(p_attempt->>'revision')::integer,p_attempt,p_hash,p_assessment);
  RETURN jsonb_build_object('replayed',false,'assessment',p_assessment);
END $$;
REVOKE ALL ON FUNCTION public.learning_record_attempt(uuid,jsonb,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learning_record_attempt(uuid,jsonb,text,jsonb) TO service_role;
COMMIT;
