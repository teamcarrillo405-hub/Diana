-- Durable local help must invalidate independent evidence just as provider help does.
BEGIN;
CREATE OR REPLACE FUNCTION public.learning_record_attempt(p_owner uuid,p_attempt jsonb,p_hash text,p_assessment jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE existing public.learning_attempts; latest integer; assignment uuid := (p_attempt->>'assignmentId')::uuid;
  session public.learning_independent_sessions; eligible boolean:=false;
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
  IF p_attempt->>'sessionId' IS NOT NULL THEN
    SELECT * INTO session FROM public.learning_independent_sessions WHERE id=(p_attempt->>'sessionId')::uuid
      AND owner_id=p_owner AND assignment_id=assignment AND problem_id=p_attempt->>'problemId' FOR UPDATE;
    eligible:=FOUND AND session.expires_at>now() AND session.consumed_by IS NULL AND latest=0
      AND p_attempt->>'assistance'='independent' AND p_attempt->>'confirmed'='true'
      AND p_attempt->>'modality'='typed' AND p_attempt->>'subject'='math'
      AND p_assessment->>'status'='supported' AND p_assessment->>'outcome' IN ('supported','revise')
      AND EXISTS(SELECT 1 FROM public.learning_exercises WHERE id=session.problem_id AND owner_id=p_owner AND reviewed)
      AND NOT EXISTS(SELECT 1 FROM public.learning_problem_revisions r WHERE r.owner_id=p_owner
        AND r.created_at>=session.issued_at AND r.state->'supportCount' IS DISTINCT FROM '0'::jsonb)
      AND NOT EXISTS(SELECT 1 FROM public.ai_interactions WHERE owner_id=p_owner AND assignment_id=assignment AND created_at>=session.issued_at)
      -- Durable pre-provider reservations close the fire-and-forget log gap.
      -- Any AI use on this account is conservatively treated as assistance.
      AND NOT EXISTS(SELECT 1 FROM public.ai_token_budget_reservations WHERE owner_id=p_owner
        AND (provider_started_at>=session.issued_at OR (status='reserved' AND provider_started_at IS NOT NULL)));
  END IF;
  p_assessment:=jsonb_set(p_assessment,'{eligibleForKnowledge}',to_jsonb(coalesce(eligible,false)));
  INSERT INTO public.learning_attempts(id,owner_id,assignment_id,problem_id,revision,payload,payload_hash,assessment)
    VALUES((p_attempt->>'id')::uuid,p_owner,assignment,p_attempt->>'problemId',(p_attempt->>'revision')::integer,p_attempt,p_hash,p_assessment);
  IF session.id IS NOT NULL THEN UPDATE public.learning_independent_sessions SET consumed_by=(p_attempt->>'id')::uuid WHERE id=session.id AND consumed_by IS NULL; END IF;
  RETURN jsonb_build_object('replayed',false,'assessment',p_assessment);
END $$;

COMMIT;
