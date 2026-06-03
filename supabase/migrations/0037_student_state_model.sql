-- Phase 37: Student State Model, anchored study loop, and help ownership traceability.
-- Keeps the model student-owned and append-only enough to audit without changing AI policy.

alter table public.task_signals
  drop constraint if exists task_signals_kind_check;

alter table public.task_signals
  add constraint task_signals_kind_check
  check (kind in (
    'energy',
    'completed',
    'dismissed',
    'started',
    'context_switch',
    'overwhelmed',
    'mood_checkin',
    'activity_log',
    'sleep_log',
    'study_helper_event',
    'recall_result',
    'student_state_snapshot'
  ));

alter table public.study_artifacts
  add column if not exists loop_state text not null default 'generated'
    check (loop_state in ('generated','cards_saved','reviewing','mastery_linked')),
  add column if not exists cards_saved_count integer not null default 0
    check (cards_saved_count >= 0),
  add column if not exists source_anchor_count integer not null default 0
    check (source_anchor_count >= 0),
  add column if not exists last_reviewed_at timestamptz;

alter table public.flashcards
  add column if not exists source_assignment_id uuid references public.assignments(id) on delete set null,
  add column if not exists source_artifact_id uuid references public.study_artifacts(id) on delete set null,
  add column if not exists source_anchor text,
  add column if not exists student_required_action text,
  add column if not exists ai_contribution_level text not null default 'none'
    check (ai_contribution_level in ('none','organize','hint','practice','draft_suggestion'));

create index if not exists flashcards_source_assignment_due_idx
  on public.flashcards (source_assignment_id, due_at)
  where source_assignment_id is not null;

create index if not exists flashcards_source_artifact_idx
  on public.flashcards (source_artifact_id)
  where source_artifact_id is not null;

create table if not exists public.student_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  state_version integer not null default 1,
  trigger text not null,
  assignment_kind text,
  ai_policy text not null check (ai_policy in ('green','yellow','red')),
  readiness jsonb not null default '{}'::jsonb,
  friction_signals jsonb not null default '{}'::jsonb,
  recall_signals jsonb not null default '{}'::jsonb,
  mastery_signals jsonb not null default '{}'::jsonb,
  support_intensity text not null check (support_intensity in ('steady','guided','scaffolded','one_move','recovery')),
  struggle_state text not null check (struggle_state in ('steady','productive','blocked','overload')),
  next_step text not null,
  ownership_meter jsonb not null default '{}'::jsonb,
  source_anchors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.student_state_snapshots enable row level security;

create policy "student_state_snapshots: owner full access"
  on public.student_state_snapshots
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists student_state_snapshots_owner_time_idx
  on public.student_state_snapshots (owner_id, created_at desc);

create index if not exists student_state_snapshots_assignment_time_idx
  on public.student_state_snapshots (assignment_id, created_at desc)
  where assignment_id is not null;

comment on table public.student_state_snapshots is
  'Student-owned snapshots of readiness, friction, recall, mastery, support level, and source anchors used to adapt help.';

comment on column public.flashcards.source_anchor is
  'Human-readable source trace such as Assignment prompt sentence 2, Rubric line 1, or Note paragraph 3.';

comment on column public.flashcards.student_required_action is
  'The student action required before the card or helper output should influence mastery.';
