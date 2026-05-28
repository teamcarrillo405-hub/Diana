-- Phase 2 GAP-06 + GAP-07: enable micro-task chaining and pivot transitions.
-- See docs/review/slice-1-evidence-review.md §7 #6 and §7 #7.

alter table public.assignments
  add column pivot_note text,
  add column parent_assignment_id uuid references public.assignments(id) on delete set null;

-- Helpful when listing children of a parent assignment (micro-task chains).
create index if not exists assignments_parent_assignment_id_idx
  on public.assignments(parent_assignment_id)
  where parent_assignment_id is not null;
