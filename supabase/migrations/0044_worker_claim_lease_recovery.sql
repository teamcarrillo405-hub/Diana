-- Phase 44: worker claim lease recovery.
-- Reclaim expired or malformed running jobs and stop retrying them after max_attempts.

create index if not exists worker_jobs_reclaim_idx
  on public.worker_jobs (queue_name, locked_until, attempts, priority desc, created_at)
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
    status = 'error',
    error_summary = coalesce(error_summary, 'Worker lease expired after maximum attempts.'),
    completed_at = now(),
    locked_at = null,
    locked_until = null,
    locked_by = null
  where queue_name = requested_queue_name
    and status = 'running'
    and (
      locked_until is null
      or locked_until <= now()
    )
    and attempts >= max_attempts;

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
      and available_at <= now()
      and (
        status = 'queued'
        or (
          status = 'running'
          and (
            locked_until is null
            or locked_until <= now()
          )
          and attempts < max_attempts
        )
      )
    order by priority desc, created_at asc
    for update skip locked
    limit 1
  )
  returning * into claimed;

  return claimed;
end;
$$;

comment on function public.claim_worker_job(text, text, integer) is
  'Claims one queued Diana worker job or reclaims one expired or malformed leased job for horizontally scalable worker pools.';
