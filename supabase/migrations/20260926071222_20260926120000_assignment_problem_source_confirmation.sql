-- Keep imported source provenance distinct from an explicit student confirmation.
-- Existing assignment_source rows stay unconfirmed; reviewing student work does not backfill confirmation.
alter table public.assignment_problems drop constraint if exists assignment_problems_source_check;
alter table public.assignment_problems add constraint assignment_problems_source_check
  check (source in ('manual', 'photo_scan', 'assignment_source', 'student_confirmed_source'));
