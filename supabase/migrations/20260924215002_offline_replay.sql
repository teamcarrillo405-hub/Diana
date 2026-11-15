BEGIN;
CREATE TABLE public.offline_event_receipts (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 1 AND 300),
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(owner_id,event_id)
);
ALTER TABLE public.offline_event_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY offline_receipts_read ON public.offline_event_receipts FOR SELECT TO authenticated USING(owner_id=auth.uid());
REVOKE ALL ON public.offline_event_receipts FROM anon,authenticated;
GRANT SELECT ON public.offline_event_receipts TO authenticated;
GRANT ALL ON public.offline_event_receipts TO service_role;

-- These writes and their receipt are one transaction. Replaying a response lost
-- on the network cannot create another note or apply another FSRS update.
CREATE FUNCTION public.apply_offline_event(p_owner uuid,p_event jsonb,p_schedule jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE
  v_event_id text := p_event->>'eventId';
  fingerprint text := encode(extensions.digest(p_event::text,'sha256'),'hex');
  receipt public.offline_event_receipts;
  item jsonb := p_event->'item';
  result jsonb;
  note_id uuid;
  card public.flashcards;
  next_card jsonb := p_schedule->'card';
  review jsonb := p_schedule->'log';
  assignment uuid;
  class uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid()<>p_owner THEN RAISE EXCEPTION 'Account changed' USING ERRCODE='42501'; END IF;
  IF v_event_id IS NULL OR length(v_event_id) NOT BETWEEN 1 AND 300 OR octet_length(p_event::text)>220000 THEN RAISE EXCEPTION 'Event bounds invalid'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_owner::text || ':' || v_event_id,0));
  SELECT * INTO receipt FROM public.offline_event_receipts WHERE owner_id=p_owner AND event_id=v_event_id;
  IF FOUND THEN
    IF receipt.payload_hash<>fingerprint THEN RETURN jsonb_build_object('status','conflict'); END IF;
    RETURN receipt.result || jsonb_build_object('replayed',true);
  END IF;
  IF p_event->>'kind'='note' THEN
    assignment := nullif(item->>'assignmentId','')::uuid;
    class := nullif(item->>'classId','')::uuid;
    IF assignment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.assignments WHERE id=assignment AND owner_id=p_owner) THEN
      RAISE EXCEPTION 'Assignment unavailable' USING ERRCODE='42501';
    END IF;
    IF class IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.classes WHERE id=class AND owner_id=p_owner) THEN
      RAISE EXCEPTION 'Class unavailable' USING ERRCODE='42501';
    END IF;
    IF item->>'noteId' IS NOT NULL THEN
      IF NOT EXISTS(SELECT 1 FROM public.notes WHERE id=(item->>'noteId')::uuid AND owner_id=p_owner) THEN
        RAISE EXCEPTION 'Note unavailable' USING ERRCODE='42501';
      END IF;
      -- Older editors have no server base revision. Preserve their draft as a
      -- clearly labeled copy instead of overwriting newer work from another device.
    END IF;
    INSERT INTO public.notes(owner_id,assignment_id,class_id,title,body_text,source)
      VALUES(p_owner,assignment,class,
        CASE WHEN item->>'noteId' IS NOT NULL THEN left(item->>'title',180)||' (device copy)' ELSE item->>'title' END,
        item->>'bodyText',item->>'source') RETURNING id INTO note_id;
    result := jsonb_build_object('status','applied','noteId',note_id,'recoveredCopy',item->>'noteId' IS NOT NULL);
  ELSIF p_event->>'kind'='review' THEN
    SELECT * INTO card FROM public.flashcards WHERE id=(item->>'cardId')::uuid AND owner_id=p_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Card unavailable' USING ERRCODE='42501'; END IF;
    IF card.reps<>(p_schedule->>'baseReps')::integer
      OR card.last_review_at IS DISTINCT FROM nullif(p_schedule->>'baseLastReviewAt','')::timestamptz
      OR card.last_review_at >= (item->>'queuedAt')::timestamptz THEN
      RETURN jsonb_build_object('status','conflict');
    END IF;
    IF p_schedule IS NULL OR (next_card->>'reps')::integer<>card.reps+1
      OR (item->>'rating')::integer NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Invalid review'; END IF;
    UPDATE public.flashcards SET state=next_card->>'state',stability=(next_card->>'stability')::numeric,
      difficulty=(next_card->>'difficulty')::numeric,due_at=(next_card->>'dueAt')::timestamptz,
      reps=(next_card->>'reps')::integer,lapses=(next_card->>'lapses')::integer,
      last_review_at=(next_card->>'lastReviewAt')::timestamptz,updated_at=now()
      WHERE id=card.id AND owner_id=p_owner;
    INSERT INTO public.flashcard_reviews(card_id,owner_id,rating,scheduled_for,reviewed_at,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,state)
      VALUES(card.id,p_owner,(item->>'rating')::smallint,(review->>'scheduledFor')::timestamptz,(review->>'reviewedAt')::timestamptz,
      (review->>'stability')::numeric,(review->>'difficulty')::numeric,(review->>'elapsedDays')::numeric,
      (review->>'scheduledDays')::numeric,(review->>'reps')::integer,(review->>'lapses')::integer,review->>'state');
    INSERT INTO public.task_signals(owner_id,assignment_id,kind,value)
      VALUES(p_owner,card.source_assignment_id,'recall_result',jsonb_build_object('cardId',card.id,'rating',(item->>'rating')::integer,'offline',true));
    result:=jsonb_build_object('status','applied');
  ELSE
    -- Submission and other assignment transitions need the student's current
    -- page and existing lifecycle checks. Never replay them automatically.
    RETURN jsonb_build_object('status','needs_confirmation');
  END IF;
  INSERT INTO public.offline_event_receipts(owner_id,event_id,payload_hash,result) VALUES(p_owner,v_event_id,fingerprint,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.apply_offline_event(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_offline_event(uuid,jsonb,jsonb) TO authenticated;
COMMIT;
