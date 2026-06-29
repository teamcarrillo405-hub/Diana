-- Phase 43: worker rate-limit runtime.
-- Atomic reservation primitive for horizontally scaled Diana worker callers.

create or replace function public.reserve_worker_rate_limit(
  requested_tenant_id text,
  requested_owner_id uuid,
  requested_feature text,
  requested_scope text,
  window_seconds integer,
  max_count integer
)
returns table (
  allowed boolean,
  count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
  window_start_value timestamptz;
  reset_at_value timestamptz;
begin
  if window_seconds < 1 then
    raise exception 'window_seconds must be positive';
  end if;
  if max_count < 1 then
    raise exception 'max_count must be positive';
  end if;

  window_start_value := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );
  reset_at_value := window_start_value + make_interval(secs => window_seconds);

  loop
    update public.worker_rate_limits
    set
      count = worker_rate_limits.count + 1,
      updated_at = now()
    where tenant_id = requested_tenant_id
      and owner_id = requested_owner_id
      and feature = requested_feature
      and scope = requested_scope
      and window_start = window_start_value
      and worker_rate_limits.count < max_count
    returning worker_rate_limits.count into current_count;

    if found then
      return query select
        true,
        current_count,
        greatest(0, max_count - current_count),
        reset_at_value;
      return;
    end if;

    select worker_rate_limits.count
    into current_count
    from public.worker_rate_limits
    where tenant_id = requested_tenant_id
      and owner_id = requested_owner_id
      and feature = requested_feature
      and scope = requested_scope
      and window_start = window_start_value;

    if found then
      return query select
        false,
        current_count,
        0,
        reset_at_value;
      return;
    end if;

    begin
      insert into public.worker_rate_limits (
        tenant_id,
        owner_id,
        feature,
        scope,
        window_start,
        count
      )
      values (
        requested_tenant_id,
        requested_owner_id,
        requested_feature,
        requested_scope,
        window_start_value,
        1
      )
      returning worker_rate_limits.count into current_count;

      return query select
        true,
        current_count,
        greatest(0, max_count - current_count),
        reset_at_value;
      return;
    exception
      when unique_violation then
        -- Another app instance created the same window; retry and update it.
    end;
  end loop;
end;
$$;

comment on function public.reserve_worker_rate_limit(text, uuid, text, text, integer, integer) is
  'Atomically reserves one worker-rate-limit slot for a tenant/student/feature window.';
