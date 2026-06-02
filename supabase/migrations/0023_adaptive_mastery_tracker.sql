-- Phase 15: Adaptive Mastery Tracker.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mastery_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  source text NOT NULL DEFAULT 'seeded'
    CHECK (source IN ('seeded','note_tag','flashcard','self_report','ai_quiz')),
  mastery_level numeric(3,2) NOT NULL DEFAULT 0
    CHECK (mastery_level >= 0 AND mastery_level <= 4),
  self_confidence numeric(3,2)
    CHECK (self_confidence IS NULL OR (self_confidence >= 0 AND self_confidence <= 4)),
  last_practiced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, class_id, name)
);

ALTER TABLE public.mastery_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mastery_concepts: owner full access"
  ON public.mastery_concepts
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.mastery_events (
  id bigserial PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.mastery_concepts(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('flashcard_review','self_confidence','ai_quiz')),
  rating numeric(3,2),
  delta numeric(3,2) NOT NULL DEFAULT 0,
  evidence_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mastery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mastery_events: owner full access"
  ON public.mastery_events
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.flashcards
  ADD COLUMN IF NOT EXISTS concept_id uuid REFERENCES public.mastery_concepts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS mastery_concepts_owner_class_idx
  ON public.mastery_concepts (owner_id, class_id, mastery_level, updated_at DESC);

CREATE INDEX IF NOT EXISTS mastery_events_concept_idx
  ON public.mastery_events (concept_id, created_at DESC);

CREATE INDEX IF NOT EXISTS flashcards_concept_due_idx
  ON public.flashcards (concept_id, due_at)
  WHERE concept_id IS NOT NULL;

COMMENT ON TABLE public.mastery_concepts IS
  'Per-class concept mastery map, levels 0 to 4, student-facing and shame-free.';
COMMENT ON TABLE public.mastery_events IS
  'Append-only inputs that move concept mastery: flashcards, self-confidence, AI quiz events.';
COMMENT ON COLUMN public.flashcards.concept_id IS
  'Optional concept link so flashcard reviews can update mastery.';

COMMIT;
