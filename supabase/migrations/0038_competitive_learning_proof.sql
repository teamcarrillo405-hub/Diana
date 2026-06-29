-- Phase 38: competitive learning proof, artifact maturity, and authorship receipts.
-- Additive only; supports benchmark/proof workflows without changing AI policy.

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
    'student_state_snapshot',
    'benchmark_event',
    'teen_test_observation'
  ));

alter table public.student_state_snapshots
  drop constraint if exists student_state_snapshots_support_intensity_check;

alter table public.student_state_snapshots
  add constraint student_state_snapshots_support_intensity_check
  check (support_intensity in ('steady','guided','scaffolded','one_move','recovery'));

alter table public.study_artifacts
  add column if not exists artifact_edit_state jsonb not null default '{}'::jsonb,
  add column if not exists practice_settings jsonb not null default '{}'::jsonb,
  add column if not exists visual_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists authorship_receipt jsonb not null default '{}'::jsonb;

create table if not exists public.authorship_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  source_artifact_id uuid references public.study_artifacts(id) on delete set null,
  actor text not null check (actor in ('student','diana','system')),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.authorship_log enable row level security;

drop policy if exists "authorship_log owner full access" on public.authorship_log;
create policy "authorship_log owner full access"
  on public.authorship_log
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists authorship_log_owner_time_idx
  on public.authorship_log (owner_id, created_at desc);

create index if not exists authorship_log_assignment_time_idx
  on public.authorship_log (assignment_id, created_at desc)
  where assignment_id is not null;

create table if not exists public.competitive_benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  run_label text not null default 'competitive benchmark',
  scenario_id text not null,
  competitor_pattern text not null,
  observations jsonb not null default '{}'::jsonb,
  score jsonb not null default '{}'::jsonb,
  passed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.competitive_benchmark_runs enable row level security;

drop policy if exists "competitive_benchmark_runs owner full access" on public.competitive_benchmark_runs;
create policy "competitive_benchmark_runs owner full access"
  on public.competitive_benchmark_runs
  for all
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid() or owner_id is null);

create index if not exists competitive_benchmark_runs_owner_time_idx
  on public.competitive_benchmark_runs (owner_id, created_at desc);

create table if not exists public.teen_test_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  session_label text not null default 'teen proxy test',
  task_id text not null,
  observation jsonb not null default '{}'::jsonb,
  score jsonb not null default '{}'::jsonb,
  no_pii boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.teen_test_observations enable row level security;

drop policy if exists "teen_test_observations owner full access" on public.teen_test_observations;
create policy "teen_test_observations owner full access"
  on public.teen_test_observations
  for all
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid() or owner_id is null);

create index if not exists teen_test_observations_owner_time_idx
  on public.teen_test_observations (owner_id, created_at desc);

comment on table public.authorship_log is
  'Process evidence for student-owned work: what Diana did, what the student did, and what source was used.';

comment on table public.competitive_benchmark_runs is
  'Fixed proof scenarios comparing Diana against competitor patterns without using competitor APIs.';

comment on table public.teen_test_observations is
  'PII-free observations from teen/proxy testing that block or support 10/10 claims.';
