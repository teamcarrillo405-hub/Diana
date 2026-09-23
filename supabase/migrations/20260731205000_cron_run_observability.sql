create table if not exists public.cron_job_runs (
  run_id uuid primary key default gen_random_uuid(),
  correlation_id text not null,
  route_name text not null,
  job_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  processed_count bigint not null default 0,
  succeeded_count bigint not null default 0,
  failed_count bigint not null default 0,
  retry_signaled boolean not null default false,
  retry_count bigint not null default 0,
  dead_letter_signaled boolean not null default false,
  dead_letter_count bigint not null default 0,
  error_code text,
  error_summary text,
  constraint cron_job_runs_route_name_check
    check (route_name like '/api/%' and char_length(route_name) <= 160),
  constraint cron_job_runs_job_name_check
    check (job_name ~ '^[a-z0-9][a-z0-9_-]*$' and char_length(job_name) <= 80),
  constraint cron_job_runs_correlation_id_check
    check (char_length(correlation_id) between 1 and 80),
  constraint cron_job_runs_status_check
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  constraint cron_job_runs_counts_check
    check (
      processed_count >= 0
      and succeeded_count >= 0
      and failed_count >= 0
      and retry_count >= 0
      and dead_letter_count >= 0
    ),
  constraint cron_job_runs_error_bounds_check
    check (
      (error_code is null or char_length(error_code) <= 64)
      and (error_summary is null or char_length(error_summary) <= 240)
    ),
  constraint cron_job_runs_signal_counts_check
    check (
      retry_signaled = (retry_count > 0)
      and dead_letter_signaled = (dead_letter_count > 0)
    ),
  constraint cron_job_runs_completion_check
    check (
      (status = 'running' and completed_at is null)
      or (status <> 'running' and completed_at is not null and completed_at >= started_at)
    ),
  constraint cron_job_runs_success_error_check
    check (status <> 'succeeded' or (failed_count = 0 and error_code is null and error_summary is null))
);

comment on table public.cron_job_runs is
  'Service-only operational ledger for scheduled runs. Student payloads are prohibited.';
comment on column public.cron_job_runs.error_summary is
  'Bounded operational summary only. Do not store student content, identifiers, or request payloads.';

create index if not exists cron_job_runs_last_success_idx
  on public.cron_job_runs (job_name, completed_at desc)
  include (run_id, route_name)
  where status = 'succeeded';

create index if not exists cron_job_runs_running_age_idx
  on public.cron_job_runs (started_at asc)
  include (run_id, job_name, route_name)
  where status = 'running';

create index if not exists cron_job_runs_route_history_idx
  on public.cron_job_runs (route_name, started_at desc);

alter table public.cron_job_runs enable row level security;
revoke all on table public.cron_job_runs from anon, authenticated;
grant select, insert, update, delete on table public.cron_job_runs to service_role;

create or replace function public.get_cron_job_run_health(p_now timestamptz default now())
returns table (
  job_name text,
  route_name text,
  last_success_at timestamptz,
  last_success_age_seconds bigint,
  running_count bigint,
  oldest_running_started_at timestamptz,
  oldest_running_age_seconds bigint,
  retry_signaled boolean,
  dead_letter_signaled boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    runs.job_name,
    runs.route_name,
    max(runs.completed_at) filter (where runs.status = 'succeeded') as last_success_at,
    case
      when max(runs.completed_at) filter (where runs.status = 'succeeded') is null then null
      else greatest(0, floor(extract(epoch from (
        p_now - max(runs.completed_at) filter (where runs.status = 'succeeded')
      )))::bigint)
    end as last_success_age_seconds,
    count(*) filter (where runs.status = 'running') as running_count,
    min(runs.started_at) filter (where runs.status = 'running') as oldest_running_started_at,
    case
      when min(runs.started_at) filter (where runs.status = 'running') is null then null
      else greatest(0, floor(extract(epoch from (
        p_now - min(runs.started_at) filter (where runs.status = 'running')
      )))::bigint)
    end as oldest_running_age_seconds,
    coalesce(bool_or(runs.retry_signaled) filter (where runs.started_at >= p_now - interval '24 hours'), false),
    coalesce(bool_or(runs.dead_letter_signaled) filter (where runs.started_at >= p_now - interval '24 hours'), false)
  from public.cron_job_runs as runs
  group by runs.job_name, runs.route_name;
$$;

revoke all on function public.get_cron_job_run_health(timestamptz) from public, anon, authenticated;
grant execute on function public.get_cron_job_run_health(timestamptz) to service_role;
