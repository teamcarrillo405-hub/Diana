-- Phase 6 — Slice 5 AI Feature Core.
-- F15: ai_interactions authorship log (per-assignment, student-facing CSV export).
-- F16: classes.ai_mode traffic-light (green | yellow | red).
-- AI-SAFETY-01: per-user daily token budget on profiles.

-- ---- F16: classes.ai_mode -------------------------------------------------
alter table public.classes
  add column ai_mode text not null default 'green'
    check (ai_mode in ('green','yellow','red'));

-- ---- F15: ai_interactions authorship log ---------------------------------
create table public.ai_interactions (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  assignment_id   uuid references public.assignments(id) on delete set null,
  feature         text not null,                  -- 'math_step' | 'writing_aid' | 'citation_gen' | 'reading_scaffold' | 'transcribe_note'
  model           text not null,                  -- 'claude-haiku-4-5' | 'claude-sonnet-4-6' | 'claude-opus-4-7'
  prompt_summary  text,                           -- <= 200 chars, never PII-heavy
  tokens_used     integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.ai_interactions enable row level security;

create policy "ai_interactions: owner full access"
  on public.ai_interactions
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index ai_interactions_owner_time_idx
  on public.ai_interactions (owner_id, created_at desc);

create index ai_interactions_assignment_idx
  on public.ai_interactions (assignment_id)
  where assignment_id is not null;

-- ---- AI-SAFETY-01: per-user daily token budget ---------------------------
alter table public.profiles
  add column daily_token_budget integer not null default 50000,
  add column tokens_used_today  integer not null default 0,
  add column token_reset_date   date    not null default current_date;
