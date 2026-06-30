-- 0035: ai_help_feedback — the capture half of the scaffold-effectiveness
-- learning loop. One row per student tap on "That helped / Not really".
-- Append-only, student-owned, exportable like all Diana data. The policy is
-- computed from these rows at read time (lib/adaptation/effectiveness.ts);
-- there is no derived table to drift.

create table public.ai_help_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- Feature key conventions:
  --   subject:<theme>        panel-level (subject:math, subject:writing, ...)
  --   study_mode:<mode>      study helper modes (study_mode:retrieval_quiz, ...)
  --   <LogParams feature>    fine-grained AI features (math_step, ...)
  feature text not null,
  assignment_id uuid references public.assignments(id) on delete set null,
  helpful boolean not null,
  created_at timestamptz not null default now()
);

create index ai_help_feedback_owner_recent_idx
  on public.ai_help_feedback(owner_id, created_at desc);

alter table public.ai_help_feedback enable row level security;

create policy "ai_help_feedback_owner_all"
  on public.ai_help_feedback
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);;
