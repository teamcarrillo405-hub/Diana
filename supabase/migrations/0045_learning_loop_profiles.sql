-- 0045: Learning Loop v1/v2 foundations.
-- Student-private personalization, plus an event/rollup shape that can move
-- to backend workers without changing the student-facing contract.

begin;

alter table public.profiles
  add column if not exists learning_loop_paused boolean not null default false,
  add column if not exists learning_loop_reset_at timestamptz;

create table if not exists public.learner_profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  confidence_json jsonb not null default '{}'::jsonb,
  source_counts_json jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists learner_profile_snapshots_owner_computed_idx
  on public.learner_profile_snapshots(owner_id, computed_at desc);

alter table public.learner_profile_snapshots enable row level security;

drop policy if exists "learner_profile_snapshots owner read" on public.learner_profile_snapshots;
create policy "learner_profile_snapshots owner read"
  on public.learner_profile_snapshots for select
  using (owner_id = auth.uid());

drop policy if exists "learner_profile_snapshots owner delete" on public.learner_profile_snapshots;
create policy "learner_profile_snapshots owner delete"
  on public.learner_profile_snapshots for delete
  using (owner_id = auth.uid());

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tenant_id text not null,
  event_name text not null,
  source_table text,
  source_id text,
  assignment_id uuid references public.assignments(id) on delete set null,
  feature text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (length(trim(event_name)) between 2 and 100),
  check (tenant_id = ('personal:' || owner_id::text))
);

create index if not exists learning_events_owner_time_idx
  on public.learning_events(owner_id, occurred_at desc);

create index if not exists learning_events_tenant_time_idx
  on public.learning_events(tenant_id, occurred_at desc);

alter table public.learning_events enable row level security;

drop policy if exists "learning_events owner read" on public.learning_events;
create policy "learning_events owner read"
  on public.learning_events for select
  using (owner_id = auth.uid());

drop policy if exists "learning_events owner insert" on public.learning_events;
create policy "learning_events owner insert"
  on public.learning_events for insert
  with check (owner_id = auth.uid() and tenant_id = ('personal:' || auth.uid()::text));

drop policy if exists "learning_events owner delete" on public.learning_events;
create policy "learning_events owner delete"
  on public.learning_events for delete
  using (owner_id = auth.uid());

create table if not exists public.learning_rollup_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  tenant_id text not null,
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','error','disabled')),
  reason text not null default 'event',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_until timestamptz,
  locked_by text,
  error_summary text,
  queued_at timestamptz not null default now(),
  completed_at timestamptz,
  check (tenant_id = ('personal:' || owner_id::text))
);

create index if not exists learning_rollup_jobs_queue_idx
  on public.learning_rollup_jobs(status, available_at, queued_at);

create index if not exists learning_rollup_jobs_tenant_idx
  on public.learning_rollup_jobs(tenant_id, queued_at desc);

alter table public.learning_rollup_jobs enable row level security;

drop policy if exists "learning_rollup_jobs owner read" on public.learning_rollup_jobs;
create policy "learning_rollup_jobs owner read"
  on public.learning_rollup_jobs for select
  using (owner_id = auth.uid());

drop policy if exists "learning_rollup_jobs owner insert" on public.learning_rollup_jobs;
create policy "learning_rollup_jobs owner insert"
  on public.learning_rollup_jobs for insert
  with check (owner_id = auth.uid() and tenant_id = ('personal:' || auth.uid()::text));

drop policy if exists "learning_rollup_jobs owner delete" on public.learning_rollup_jobs;
create policy "learning_rollup_jobs owner delete"
  on public.learning_rollup_jobs for delete
  using (owner_id = auth.uid());

commit;
