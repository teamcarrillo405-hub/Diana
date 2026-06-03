-- Phase 36: Study artifacts generated from real class material.
-- Stores Diana-created study guides, practice tests, and flashcard drafts.

create table if not exists public.study_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  source_type text not null check (source_type in ('assignment', 'note')),
  source_id uuid not null,
  artifact_type text not null check (artifact_type in ('study_guide', 'practice_test', 'flashcard_set')),
  study_mode text not null check (study_mode in ('guided_steps', 'visual_breakdown', 'retrieval_quiz', 'flashcard_builder')),
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  ai_policy text not null check (ai_policy in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.study_artifacts enable row level security;

create policy "study_artifacts owner full access"
  on public.study_artifacts
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists study_artifacts_owner_time_idx
  on public.study_artifacts (owner_id, created_at desc);

create index if not exists study_artifacts_source_idx
  on public.study_artifacts (owner_id, source_type, source_id, created_at desc);

comment on table public.study_artifacts is
  'Student-owned study guides, practice tests, and flashcard drafts generated from assignments or notes.';
