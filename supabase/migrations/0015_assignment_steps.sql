-- 0015_assignment_steps.sql
-- Phase 9 — F6 AI task breakdown.
-- Stores generated atomic steps so the student can tick them off without
-- regenerating. One row per assignment (unique index for upsert pattern).

BEGIN;

CREATE TABLE IF NOT EXISTS public.assignment_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- steps shape: [{ step: 1, action: "...", minutes: N, done: false }]
  generated_at  timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS assignment_steps_assignment_idx
  ON public.assignment_steps(assignment_id);

CREATE INDEX IF NOT EXISTS assignment_steps_owner_idx
  ON public.assignment_steps(owner_id);

ALTER TABLE public.assignment_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignment_steps_owner_select" ON public.assignment_steps;
CREATE POLICY "assignment_steps_owner_select" ON public.assignment_steps
  FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "assignment_steps_owner_insert" ON public.assignment_steps;
CREATE POLICY "assignment_steps_owner_insert" ON public.assignment_steps
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "assignment_steps_owner_update" ON public.assignment_steps;
CREATE POLICY "assignment_steps_owner_update" ON public.assignment_steps
  FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "assignment_steps_owner_delete" ON public.assignment_steps;
CREATE POLICY "assignment_steps_owner_delete" ON public.assignment_steps
  FOR DELETE USING (owner_id = auth.uid());

COMMIT;
