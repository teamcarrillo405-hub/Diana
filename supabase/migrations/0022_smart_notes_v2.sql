-- Phase 14: Smart Notes v2.
-- Adds note search, tagging, and metadata support for synthesis/linking.

BEGIN;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_suggested_tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(body_text, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(transcript_text, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS notes_search_vector_idx
  ON public.notes USING gin (search_vector);

CREATE INDEX IF NOT EXISTS notes_tags_idx
  ON public.notes USING gin (tags);

CREATE INDEX IF NOT EXISTS notes_ai_suggested_tags_idx
  ON public.notes USING gin (ai_suggested_tags);

COMMENT ON COLUMN public.notes.tags IS
  'Student-managed note tags for search, filtering, and related-note linking.';
COMMENT ON COLUMN public.notes.ai_suggested_tags IS
  'AI-suggested tags; student decides whether to add them to tags.';
COMMENT ON COLUMN public.notes.search_vector IS
  'Generated full-text search vector across title, body, and transcript.';

COMMIT;
