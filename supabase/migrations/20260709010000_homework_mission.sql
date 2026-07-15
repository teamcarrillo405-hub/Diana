-- Homework Mission rebuild (handoff_for_claude_code/designs/Homework Mission.dc.html).
--
-- 1. assignments.saved_work — the hand-in field autosave the design calls for
--    ("Hand-in fields: keys map to saved_work JSON per assignment"). Did not
--    exist anywhere in the schema; every subject helper's typed work was
--    previously plain React state, lost on refresh.
--
-- 2. assignment_problems — the design itself has no real multi-problem model
--    for math ("Problem 3 of 8" is hardcoded display text with no backing
--    array — confirmed by reading the prototype's JS). A problem set assignment
--    is one row in `assignments`; this table lets it hold N individually
--    navigable problems, each with its own scaffold + hand-in work, instead of
--    the old math-helper's one-scaffold-at-a-time-overwrites-the-last-one flow.
begin;

alter table public.assignments
  add column if not exists saved_work jsonb not null default '{}'::jsonb;

create table if not exists public.assignment_problems (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_number smallint not null,
  problem_text text not null,
  source text not null default 'manual' check (source in ('manual', 'photo_scan')),
  scaffold jsonb,
  student_work jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_problems_number_positive check (problem_number > 0),
  constraint assignment_problems_unique_number unique (assignment_id, problem_number)
);

create index if not exists assignment_problems_assignment_idx on public.assignment_problems (assignment_id);
create index if not exists assignment_problems_owner_idx on public.assignment_problems (owner_id);

alter table public.assignment_problems enable row level security;

create policy assignment_problems_owner_select on public.assignment_problems
  for select using (owner_id = auth.uid());
create policy assignment_problems_owner_insert on public.assignment_problems
  for insert with check (owner_id = auth.uid());
create policy assignment_problems_owner_update on public.assignment_problems
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy assignment_problems_owner_delete on public.assignment_problems
  for delete using (owner_id = auth.uid());

commit;
