-- Phase 42: worker queue runtime fields.
-- Additive queue semantics for horizontally scalable Diana worker pools.

alter table public.worker_jobs
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists result_payload jsonb not null default '{}'::jsonb,
  add column if not exists attempts integer not null default 0 check (attempts >= 0),
  add column if not exists max_attempts integer not null default 3 check (max_attempts > 0),
  add column if not exists priority integer not null default 0,
  add column if not exists available_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists locked_by text;

create index if not exists worker_jobs_claim_idx
  on public.worker_jobs (queue_name, status, available_at, priority desc, created_at)
  where status = 'queued';

create index if not exists worker_jobs_lease_idx
  on public.worker_jobs (locked_until)
  where status = 'running';

create or replace function public.claim_worker_job(
  requested_queue_name text,
  worker_id text,
  lease_seconds integer default 60
)
returns public.worker_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.worker_jobs;
begin
  update public.worker_jobs
  set
    status = 'running',
    attempts = attempts + 1,
    locked_at = now(),
    locked_until = now() + make_interval(secs => greatest(1, lease_seconds)),
    locked_by = worker_id,
    started_at = coalesce(started_at, now())
  where id = (
    select id
    from public.worker_jobs
    where queue_name = requested_queue_name
      and status = 'queued'
      and available_at <= now()
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;

  return claimed;
end;
$$;

comment on function public.claim_worker_job(text, text, integer) is
  'Claims one queued Diana worker job with a lease for horizontally scalable worker pools.';
