-- Phase 41: production worker tier.
-- Durable queue/worker audit primitives for horizontally scalable Diana workers.

create table if not exists public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('diana.voice_candidate')),
  queue_name text not null,
  queue_mode text not null check (queue_mode in ('inline','managed_queue')),
  status text not null default 'queued'
    check (status in ('queued','running','succeeded','error','rate_limited')),
  trace_id text not null unique,
  idempotency_key text not null unique,
  input_summary jsonb not null default '{}'::jsonb,
  constraints jsonb not null default '{}'::jsonb,
  observability jsonb not null default '{}'::jsonb,
  error_summary text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.worker_jobs enable row level security;

create policy "worker_jobs owner read access"
  on public.worker_jobs
  for select
  using (owner_id = auth.uid());

create index if not exists worker_jobs_tenant_feature_status_idx
  on public.worker_jobs (tenant_id, feature, status, created_at desc);

create index if not exists worker_jobs_owner_time_idx
  on public.worker_jobs (owner_id, created_at desc);

comment on table public.worker_jobs is
  'Tenant-scoped production worker job receipts. Workers never receive direct browser access or unscoped Diana data.';

create table if not exists public.worker_rate_limits (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check (feature in ('diana.voice_candidate')),
  scope text not null check (scope in ('student','tenant','feature')),
  window_start timestamptz not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, owner_id, feature, scope, window_start)
);

alter table public.worker_rate_limits enable row level security;

create policy "worker_rate_limits owner read access"
  on public.worker_rate_limits
  for select
  using (owner_id = auth.uid());

create index if not exists worker_rate_limits_tenant_feature_idx
  on public.worker_rate_limits (tenant_id, feature, scope, window_start desc);

comment on table public.worker_rate_limits is
  'Tenant and student scoped worker rate-limit counters for production queue enforcement.';
