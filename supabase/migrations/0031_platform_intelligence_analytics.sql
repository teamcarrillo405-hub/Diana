-- Phase 31: Platform Intelligence + Analytics.
-- Student-owned operational telemetry for usage, feature flags, UI experiments,
-- errors, and web vital budget monitoring.

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  flag_key text not null,
  description text,
  enabled boolean not null default false,
  rollout_pct integer not null default 0 check (rollout_pct between 0 and 100),
  audience text not null default 'self' check (audience in ('self', 'beta', 'all')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, flag_key),
  check (length(trim(flag_key)) between 2 and 80)
);

create table public.analytics_events (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  feature text,
  route text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (duration_ms is null or duration_ms >= 0),
  check (length(trim(event_name)) between 2 and 80)
);

create table public.error_events (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  route text,
  message text not null,
  stack text,
  severity text not null default 'error' check (severity in ('info', 'warning', 'error')),
  diagnosis_tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (length(trim(message)) between 1 and 2000)
);

create table public.performance_events (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  metric_name text not null,
  value numeric not null,
  budget_value numeric,
  created_at timestamptz not null default now(),
  check (value >= 0),
  check (budget_value is null or budget_value >= 0)
);

create table public.experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  experiment_key text not null,
  description text,
  surface text not null default 'ui',
  variants jsonb not null default '["control","variant"]'::jsonb,
  enabled boolean not null default false,
  allocation_pct integer not null default 0 check (allocation_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, experiment_key),
  check (length(trim(experiment_key)) between 2 and 80),
  check (surface !~* '(accommodation|iep|504|content|diagnosis|safety|privacy|ai)')
);

create index feature_flags_owner_enabled_idx
  on public.feature_flags (owner_id, enabled, flag_key);

create index analytics_events_owner_time_idx
  on public.analytics_events (owner_id, created_at desc);

create index analytics_events_owner_feature_idx
  on public.analytics_events (owner_id, feature, created_at desc)
  where feature is not null;

create index error_events_owner_time_idx
  on public.error_events (owner_id, created_at desc);

create index performance_events_owner_metric_idx
  on public.performance_events (owner_id, metric_name, created_at desc);

create index experiments_owner_enabled_idx
  on public.experiments (owner_id, enabled, experiment_key);

alter table public.feature_flags enable row level security;
alter table public.analytics_events enable row level security;
alter table public.error_events enable row level security;
alter table public.performance_events enable row level security;
alter table public.experiments enable row level security;

create policy "feature_flags owner full access"
  on public.feature_flags for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "analytics_events owner full access"
  on public.analytics_events for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "error_events owner full access"
  on public.error_events for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "performance_events owner full access"
  on public.performance_events for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "experiments owner full access"
  on public.experiments for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
