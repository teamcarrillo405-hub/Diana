-- 0018_notes_class_id.sql
-- Phase 10: F16-AUTOCLASSIFY foundation. Add class_id FK to notes so the
-- auto-class router can write the matched class and the student can override.

ALTER TABLE public.notes
  ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- Partial index: only index rows that have a class assigned. Saves space and
-- speeds up the common query "list this user's notes for class X".
CREATE INDEX notes_owner_class_idx
  ON public.notes (owner_id, class_id)
  WHERE class_id IS NOT NULL;
