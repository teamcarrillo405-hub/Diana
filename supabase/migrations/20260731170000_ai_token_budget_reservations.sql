-- Atomic, service-role-only token budget reservations for student AI calls.
-- tokens_used_today includes both settled usage and active reservations.

-- Earlier builds stored a prompt excerpt in this field. Retain the audit row
-- while irreversibly removing student/model content before this release.
update public.ai_interactions
set prompt_summary = 'legacy_content_redacted'
where prompt_summary is not null;

create table public.ai_token_budget_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  token_reset_date date not null,
  reserved_tokens integer not null check (reserved_tokens > 0),
  actual_tokens integer check (actual_tokens >= 0),
  charged_tokens integer not null default 0 check (charged_tokens >= 0),
  refunded_tokens integer not null default 0 check (refunded_tokens >= 0),
  settlement_overage_tokens integer not null default 0 check (settlement_overage_tokens >= 0),
  provider_started_at timestamptz,
  provider_start_key text,
  known_not_consumed_at timestamptz,
  conservatively_settled_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'settled', 'released', 'expired', 'settled_late')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (owner_id, idempotency_key)
);

create index ai_token_budget_reservations_active_owner_idx
  on public.ai_token_budget_reservations (owner_id, expires_at)
  where status = 'active';

alter table public.ai_token_budget_reservations enable row level security;
alter table public.ai_token_budget_reservations force row level security;

revoke all on table public.ai_token_budget_reservations from public, anon, authenticated;
grant select, insert, update on table public.ai_token_budget_reservations to service_role;

create or replace function public.reserve_ai_token_budget(
  p_owner_id uuid,
  p_idempotency_key text,
  p_requested_tokens integer
)
returns table (
  reservation_id uuid,
  allowed boolean,
  remaining_tokens integer,
  reserved_tokens integer,
  reservation_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_utc_date date := (now() at time zone 'UTC')::date;
  v_budget integer;
  v_used integer;
  v_reset_date date;
  v_expired_tokens integer := 0;
  v_existing public.ai_token_budget_reservations%rowtype;
  v_reservation_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_owner_id is null
    or nullif(btrim(p_idempotency_key), '') is null
    or p_requested_tokens is null
    or p_requested_tokens <= 0
    or p_requested_tokens > 1000000 then
    raise exception 'invalid token reservation request' using errcode = '22023';
  end if;

  select p.daily_token_budget, p.tokens_used_today, p.token_reset_date
  into v_budget, v_used, v_reset_date
  from public.profiles p
  where p.user_id = p_owner_id
  for update;

  if not found then
    return query select null::uuid, false, 0, 0, 'profile_not_found'::text;
    return;
  end if;

  -- Preserve the existing lazy daily reset, explicitly anchored to UTC.
  -- A provider-started reservation is never expired or refunded. If its
  -- normal settlement path and reconciliation enqueue both disappeared, the
  -- stale reservation becomes an idempotent full-reservation charge.
  if v_reset_date <> v_utc_date then
    update public.ai_token_budget_reservations r
    set status = 'settled_late',
        actual_tokens = r.reserved_tokens,
        charged_tokens = r.reserved_tokens,
        refunded_tokens = 0,
        settled_at = now(),
        conservatively_settled_at = now()
    where r.owner_id = p_owner_id
      and r.status = 'active'
      and r.provider_started_at is not null;

    update public.ai_token_budget_reservations r
    set status = 'expired', settled_at = now(), refunded_tokens = r.reserved_tokens
    where r.owner_id = p_owner_id
      and r.status = 'active'
      and r.provider_started_at is null;

    update public.profiles p
    set tokens_used_today = 0, token_reset_date = v_utc_date
    where p.user_id = p_owner_id;

    v_used := 0;
    v_reset_date := v_utc_date;
  else
    update public.ai_token_budget_reservations r
    set status = 'settled',
        actual_tokens = r.reserved_tokens,
        charged_tokens = r.reserved_tokens,
        refunded_tokens = 0,
        settled_at = now(),
        conservatively_settled_at = now()
    where r.owner_id = p_owner_id
      and r.token_reset_date = v_reset_date
      and r.status = 'active'
      and r.expires_at <= now()
      and r.provider_started_at is not null;

    with expired as (
      update public.ai_token_budget_reservations r
      set status = 'expired', settled_at = now(), refunded_tokens = r.reserved_tokens
      where r.owner_id = p_owner_id
        and r.token_reset_date = v_reset_date
        and r.status = 'active'
        and r.expires_at <= now()
        and r.provider_started_at is null
      returning r.reserved_tokens
    )
    select coalesce(sum(e.reserved_tokens), 0)::integer
    into v_expired_tokens
    from expired e;

    if v_expired_tokens > 0 then
      v_used := greatest(0, v_used - v_expired_tokens);
      update public.profiles p
      set tokens_used_today = v_used
      where p.user_id = p_owner_id;
    end if;
  end if;

  select r.*
  into v_existing
  from public.ai_token_budget_reservations r
  where r.owner_id = p_owner_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    return query select
      v_existing.id,
      v_existing.status = 'active',
      greatest(0, v_budget - v_used),
      v_existing.reserved_tokens,
      v_existing.status;
    return;
  end if;

  if v_budget <= 0 or v_used + p_requested_tokens > v_budget then
    return query select
      null::uuid,
      false,
      greatest(0, v_budget - v_used),
      0,
      'budget_exhausted'::text;
    return;
  end if;

  insert into public.ai_token_budget_reservations (
    owner_id,
    idempotency_key,
    token_reset_date,
    reserved_tokens,
    expires_at
  ) values (
    p_owner_id,
    p_idempotency_key,
    v_reset_date,
    p_requested_tokens,
    now() + interval '15 minutes'
  )
  returning id into v_reservation_id;

  v_used := v_used + p_requested_tokens;
  update public.profiles p
  set tokens_used_today = v_used
  where p.user_id = p_owner_id;

  return query select
    v_reservation_id,
    true,
    greatest(0, v_budget - v_used),
    p_requested_tokens,
    'active'::text;
end;
$$;

create or replace function public.settle_ai_token_budget(
  p_reservation_id uuid,
  p_actual_tokens integer
)
returns table (
  reservation_id uuid,
  reservation_status text,
  actual_tokens integer,
  charged_tokens integer,
  refunded_tokens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reservation public.ai_token_budget_reservations%rowtype;
  v_profile_reset_date date;
  v_settlement_status text;
  v_refund integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_reservation_id is null
    or p_actual_tokens is null
    or p_actual_tokens < 0
    or p_actual_tokens > 1000000 then
    raise exception 'invalid token settlement request' using errcode = '22023';
  end if;

  select r.owner_id into v_owner_id
  from public.ai_token_budget_reservations r
  where r.id = p_reservation_id;

  if not found then
    return query select p_reservation_id, 'not_found'::text, 0, 0, 0;
    return;
  end if;

  -- All reservation RPCs lock profile first, then reservation, to avoid deadlocks.
  select p.token_reset_date into v_profile_reset_date
  from public.profiles p
  where p.user_id = v_owner_id
  for update;

  select r.* into v_reservation
  from public.ai_token_budget_reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.status in ('settled', 'settled_late') then
    v_settlement_status := case
      when v_reservation.actual_tokens = p_actual_tokens
        or (v_reservation.conservatively_settled_at is not null
          and v_reservation.actual_tokens >= p_actual_tokens)
        then v_reservation.status
      else 'usage_mismatch'
    end;
    return query select
      v_reservation.id,
      v_settlement_status,
      coalesce(v_reservation.actual_tokens, 0),
      v_reservation.charged_tokens,
      v_reservation.refunded_tokens;
    return;
  end if;

  -- A released reservation represents a provider call that did not consume
  -- usage. It cannot later be converted into a charge by replaying settlement.
  if v_reservation.status = 'released' then
    return query select
      v_reservation.id,
      v_reservation.status,
      coalesce(v_reservation.actual_tokens, 0),
      v_reservation.charged_tokens,
      v_reservation.refunded_tokens;
    return;
  end if;

  if v_reservation.status = 'expired' then
    if v_profile_reset_date = v_reservation.token_reset_date then
      update public.profiles p
      set tokens_used_today = p.tokens_used_today + p_actual_tokens
      where p.user_id = v_owner_id;
    end if;

    update public.ai_token_budget_reservations r
    set status = 'settled_late',
        actual_tokens = p_actual_tokens,
        charged_tokens = p_actual_tokens,
        settlement_overage_tokens = greatest(0, p_actual_tokens - r.reserved_tokens),
        settled_at = now()
    where r.id = p_reservation_id
    returning r.* into v_reservation;

    return query select
      v_reservation.id,
      v_reservation.status,
      coalesce(v_reservation.actual_tokens, 0),
      v_reservation.charged_tokens,
      v_reservation.refunded_tokens;
    return;
  end if;

  if v_reservation.status <> 'active' then
    return query select
      v_reservation.id,
      'invalid_status'::text,
      coalesce(v_reservation.actual_tokens, 0),
      v_reservation.charged_tokens,
      v_reservation.refunded_tokens;
    return;
  end if;

  v_refund := greatest(0, v_reservation.reserved_tokens - p_actual_tokens);
  v_settlement_status := case
    when v_profile_reset_date = v_reservation.token_reset_date then 'settled'
    else 'settled_late'
  end;

  if v_profile_reset_date = v_reservation.token_reset_date then
    update public.profiles p
    set tokens_used_today = greatest(
      0,
      p.tokens_used_today + p_actual_tokens - v_reservation.reserved_tokens
    )
    where p.user_id = v_owner_id;
  end if;

  update public.ai_token_budget_reservations r
  set status = v_settlement_status,
      actual_tokens = p_actual_tokens,
      charged_tokens = p_actual_tokens,
      refunded_tokens = v_refund,
      settlement_overage_tokens = greatest(0, p_actual_tokens - r.reserved_tokens),
      settled_at = now()
  where r.id = p_reservation_id
  returning r.* into v_reservation;

  return query select
    v_reservation.id,
    v_reservation.status,
    coalesce(v_reservation.actual_tokens, 0),
    v_reservation.charged_tokens,
    v_reservation.refunded_tokens;
end;
$$;

create or replace function public.release_ai_token_budget(
  p_reservation_id uuid
)
returns table (
  reservation_id uuid,
  reservation_status text,
  refunded_tokens integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reservation public.ai_token_budget_reservations%rowtype;
  v_profile_reset_date date;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select r.owner_id into v_owner_id
  from public.ai_token_budget_reservations r
  where r.id = p_reservation_id;

  if not found then
    return query select p_reservation_id, 'not_found'::text, 0;
    return;
  end if;

  select p.token_reset_date into v_profile_reset_date
  from public.profiles p
  where p.user_id = v_owner_id
  for update;

  select r.* into v_reservation
  from public.ai_token_budget_reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.provider_started_at is not null then
    return query select
      v_reservation.id,
      'provider_started'::text,
      v_reservation.refunded_tokens;
    return;
  end if;

  if v_reservation.status <> 'active' then
    return query select
      v_reservation.id,
      v_reservation.status,
      v_reservation.refunded_tokens;
    return;
  end if;

  if v_profile_reset_date = v_reservation.token_reset_date then
    update public.profiles p
    set tokens_used_today = greatest(0, p.tokens_used_today - v_reservation.reserved_tokens)
    where p.user_id = v_owner_id;
  end if;

  update public.ai_token_budget_reservations r
  set status = 'released',
      refunded_tokens = r.reserved_tokens,
      settled_at = now()
  where r.id = p_reservation_id
  returning r.* into v_reservation;

  return query select
    v_reservation.id,
    v_reservation.status,
    v_reservation.refunded_tokens;
end;
$$;

-- Speech providers bill by audio duration or input characters rather than
-- model tokens. Keep those costs in a separately named, atomic daily quota.
alter table public.profiles
  add column daily_media_cost_unit_budget integer not null default 50000,
  add column media_cost_units_used_today integer not null default 0,
  add column media_cost_unit_reset_date date not null
    default ((now() at time zone 'UTC')::date),
  add constraint profiles_daily_media_cost_unit_budget_check
    check (daily_media_cost_unit_budget >= 0 and daily_media_cost_unit_budget <= 1000000),
  add constraint profiles_media_cost_units_used_today_check
    check (media_cost_units_used_today >= 0);

create table public.ai_media_cost_unit_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  reset_date date not null,
  reserved_cost_units integer not null check (reserved_cost_units > 0),
  actual_cost_units integer check (actual_cost_units >= 0),
  charged_cost_units integer not null default 0 check (charged_cost_units >= 0),
  refunded_cost_units integer not null default 0 check (refunded_cost_units >= 0),
  settlement_overage_cost_units integer not null default 0
    check (settlement_overage_cost_units >= 0),
  provider_started_at timestamptz,
  provider_start_key text,
  known_not_consumed_at timestamptz,
  conservatively_settled_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'settled', 'released', 'expired', 'settled_late')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique (owner_id, idempotency_key)
);

create index ai_media_cost_unit_reservations_active_owner_idx
  on public.ai_media_cost_unit_reservations (owner_id, expires_at)
  where status = 'active';

alter table public.ai_media_cost_unit_reservations enable row level security;
alter table public.ai_media_cost_unit_reservations force row level security;

revoke all on table public.ai_media_cost_unit_reservations from public, anon, authenticated;
grant select, insert, update on table public.ai_media_cost_unit_reservations to service_role;

create or replace function public.reserve_ai_media_cost_budget(
  p_owner_id uuid,
  p_idempotency_key text,
  p_requested_cost_units integer
)
returns table (
  reservation_id uuid,
  allowed boolean,
  remaining_cost_units integer,
  reserved_cost_units integer,
  reservation_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_utc_date date := (now() at time zone 'UTC')::date;
  v_budget integer;
  v_used integer;
  v_reset_date date;
  v_expired_units integer := 0;
  v_existing public.ai_media_cost_unit_reservations%rowtype;
  v_reservation_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_owner_id is null
    or nullif(btrim(p_idempotency_key), '') is null
    or p_requested_cost_units is null
    or p_requested_cost_units <= 0
    or p_requested_cost_units > 1000000 then
    raise exception 'invalid media cost reservation request' using errcode = '22023';
  end if;

  select
    p.daily_media_cost_unit_budget,
    p.media_cost_units_used_today,
    p.media_cost_unit_reset_date
  into v_budget, v_used, v_reset_date
  from public.profiles p
  where p.user_id = p_owner_id
  for update;

  if not found then
    return query select null::uuid, false, 0, 0, 'profile_not_found'::text;
    return;
  end if;

  if v_reset_date <> v_utc_date then
    update public.ai_media_cost_unit_reservations r
    set status = 'settled_late',
        actual_cost_units = r.reserved_cost_units,
        charged_cost_units = r.reserved_cost_units,
        refunded_cost_units = 0,
        settled_at = now(),
        conservatively_settled_at = now()
    where r.owner_id = p_owner_id
      and r.status = 'active'
      and r.provider_started_at is not null;

    update public.ai_media_cost_unit_reservations r
    set status = 'expired',
        settled_at = now(),
        refunded_cost_units = r.reserved_cost_units
    where r.owner_id = p_owner_id
      and r.status = 'active'
      and r.provider_started_at is null;

    update public.profiles p
    set media_cost_units_used_today = 0,
        media_cost_unit_reset_date = v_utc_date
    where p.user_id = p_owner_id;

    v_used := 0;
    v_reset_date := v_utc_date;
  else
    update public.ai_media_cost_unit_reservations r
    set status = 'settled',
        actual_cost_units = r.reserved_cost_units,
        charged_cost_units = r.reserved_cost_units,
        refunded_cost_units = 0,
        settled_at = now(),
        conservatively_settled_at = now()
    where r.owner_id = p_owner_id
      and r.reset_date = v_reset_date
      and r.status = 'active'
      and r.expires_at <= now()
      and r.provider_started_at is not null;

    with expired as (
      update public.ai_media_cost_unit_reservations r
      set status = 'expired',
          settled_at = now(),
          refunded_cost_units = r.reserved_cost_units
      where r.owner_id = p_owner_id
        and r.reset_date = v_reset_date
        and r.status = 'active'
        and r.expires_at <= now()
        and r.provider_started_at is null
      returning r.reserved_cost_units
    )
    select coalesce(sum(e.reserved_cost_units), 0)::integer
    into v_expired_units
    from expired e;

    if v_expired_units > 0 then
      v_used := greatest(0, v_used - v_expired_units);
      update public.profiles p
      set media_cost_units_used_today = v_used
      where p.user_id = p_owner_id;
    end if;
  end if;

  select r.* into v_existing
  from public.ai_media_cost_unit_reservations r
  where r.owner_id = p_owner_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    return query select
      v_existing.id,
      v_existing.status = 'active',
      greatest(0, v_budget - v_used),
      v_existing.reserved_cost_units,
      v_existing.status;
    return;
  end if;

  if v_budget <= 0 or v_used + p_requested_cost_units > v_budget then
    return query select
      null::uuid,
      false,
      greatest(0, v_budget - v_used),
      0,
      'budget_exhausted'::text;
    return;
  end if;

  insert into public.ai_media_cost_unit_reservations (
    owner_id,
    idempotency_key,
    reset_date,
    reserved_cost_units,
    expires_at
  ) values (
    p_owner_id,
    p_idempotency_key,
    v_reset_date,
    p_requested_cost_units,
    now() + interval '15 minutes'
  ) returning id into v_reservation_id;

  v_used := v_used + p_requested_cost_units;
  update public.profiles p
  set media_cost_units_used_today = v_used
  where p.user_id = p_owner_id;

  return query select
    v_reservation_id,
    true,
    greatest(0, v_budget - v_used),
    p_requested_cost_units,
    'active'::text;
end;
$$;

create or replace function public.settle_ai_media_cost_budget(
  p_reservation_id uuid,
  p_actual_cost_units integer
)
returns table (
  reservation_id uuid,
  reservation_status text,
  actual_cost_units integer,
  charged_cost_units integer,
  refunded_cost_units integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reservation public.ai_media_cost_unit_reservations%rowtype;
  v_profile_reset_date date;
  v_settlement_status text;
  v_refund integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_reservation_id is null
    or p_actual_cost_units is null
    or p_actual_cost_units < 0
    or p_actual_cost_units > 1000000 then
    raise exception 'invalid media cost settlement request' using errcode = '22023';
  end if;

  select r.owner_id into v_owner_id
  from public.ai_media_cost_unit_reservations r
  where r.id = p_reservation_id;

  if not found then
    return query select p_reservation_id, 'not_found'::text, 0, 0, 0;
    return;
  end if;

  select p.media_cost_unit_reset_date into v_profile_reset_date
  from public.profiles p
  where p.user_id = v_owner_id
  for update;

  select r.* into v_reservation
  from public.ai_media_cost_unit_reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.status in ('settled', 'settled_late') then
    v_settlement_status := case
      when v_reservation.actual_cost_units = p_actual_cost_units
        or (v_reservation.conservatively_settled_at is not null
          and v_reservation.actual_cost_units >= p_actual_cost_units)
        then v_reservation.status
      else 'usage_mismatch'
    end;
    return query select
      v_reservation.id,
      v_settlement_status,
      coalesce(v_reservation.actual_cost_units, 0),
      v_reservation.charged_cost_units,
      v_reservation.refunded_cost_units;
    return;
  end if;

  if v_reservation.status = 'released' then
    return query select
      v_reservation.id,
      v_reservation.status,
      coalesce(v_reservation.actual_cost_units, 0),
      v_reservation.charged_cost_units,
      v_reservation.refunded_cost_units;
    return;
  end if;

  if v_reservation.status = 'expired' then
    if v_profile_reset_date = v_reservation.reset_date then
      update public.profiles p
      set media_cost_units_used_today = p.media_cost_units_used_today + p_actual_cost_units
      where p.user_id = v_owner_id;
    end if;

    update public.ai_media_cost_unit_reservations r
    set status = 'settled_late',
        actual_cost_units = p_actual_cost_units,
        charged_cost_units = p_actual_cost_units,
        settlement_overage_cost_units = greatest(0, p_actual_cost_units - r.reserved_cost_units),
        settled_at = now()
    where r.id = p_reservation_id
    returning r.* into v_reservation;

    return query select
      v_reservation.id,
      v_reservation.status,
      coalesce(v_reservation.actual_cost_units, 0),
      v_reservation.charged_cost_units,
      v_reservation.refunded_cost_units;
    return;
  end if;

  if v_reservation.status <> 'active' then
    return query select
      v_reservation.id,
      'invalid_status'::text,
      coalesce(v_reservation.actual_cost_units, 0),
      v_reservation.charged_cost_units,
      v_reservation.refunded_cost_units;
    return;
  end if;

  v_refund := greatest(0, v_reservation.reserved_cost_units - p_actual_cost_units);
  v_settlement_status := case
    when v_profile_reset_date = v_reservation.reset_date then 'settled'
    else 'settled_late'
  end;

  if v_profile_reset_date = v_reservation.reset_date then
    update public.profiles p
    set media_cost_units_used_today = greatest(
      0,
      p.media_cost_units_used_today + p_actual_cost_units - v_reservation.reserved_cost_units
    )
    where p.user_id = v_owner_id;
  end if;

  update public.ai_media_cost_unit_reservations r
  set status = v_settlement_status,
      actual_cost_units = p_actual_cost_units,
      charged_cost_units = p_actual_cost_units,
      refunded_cost_units = v_refund,
      settlement_overage_cost_units = greatest(0, p_actual_cost_units - r.reserved_cost_units),
      settled_at = now()
  where r.id = p_reservation_id
  returning r.* into v_reservation;

  return query select
    v_reservation.id,
    v_reservation.status,
    coalesce(v_reservation.actual_cost_units, 0),
    v_reservation.charged_cost_units,
    v_reservation.refunded_cost_units;
end;
$$;

create or replace function public.release_ai_media_cost_budget(
  p_reservation_id uuid
)
returns table (
  reservation_id uuid,
  reservation_status text,
  refunded_cost_units integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reservation public.ai_media_cost_unit_reservations%rowtype;
  v_profile_reset_date date;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select r.owner_id into v_owner_id
  from public.ai_media_cost_unit_reservations r
  where r.id = p_reservation_id;

  if not found then
    return query select p_reservation_id, 'not_found'::text, 0;
    return;
  end if;

  select p.media_cost_unit_reset_date into v_profile_reset_date
  from public.profiles p
  where p.user_id = v_owner_id
  for update;

  select r.* into v_reservation
  from public.ai_media_cost_unit_reservations r
  where r.id = p_reservation_id
  for update;

  if v_reservation.provider_started_at is not null then
    return query select
      v_reservation.id,
      'provider_started'::text,
      v_reservation.refunded_cost_units;
    return;
  end if;

  if v_reservation.status <> 'active' then
    return query select
      v_reservation.id,
      v_reservation.status,
      v_reservation.refunded_cost_units;
    return;
  end if;

  if v_profile_reset_date = v_reservation.reset_date then
    update public.profiles p
    set media_cost_units_used_today = greatest(
      0,
      p.media_cost_units_used_today - v_reservation.reserved_cost_units
    )
    where p.user_id = v_owner_id;
  end if;

  update public.ai_media_cost_unit_reservations r
  set status = 'released',
      refunded_cost_units = r.reserved_cost_units,
      settled_at = now()
  where r.id = p_reservation_id
  returning r.* into v_reservation;

  return query select
    v_reservation.id,
    v_reservation.status,
    v_reservation.refunded_cost_units;
end;
$$;

-- This transition is the durable fence immediately before any paid provider
-- request. It is idempotent so a lost RPC response can be retried safely.
create or replace function public.mark_ai_budget_provider_started(
  p_reservation_kind text,
  p_reservation_id uuid,
  p_provider_start_key text
)
returns table (
  reservation_id uuid,
  reservation_status text,
  provider_start_status text,
  provider_started_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_started_at timestamptz;
  v_start_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_reservation_kind not in ('token', 'media_cost_unit')
    or p_reservation_id is null
    or nullif(btrim(p_provider_start_key), '') is null then
    raise exception 'invalid provider start request' using errcode = '22023';
  end if;

  if p_reservation_kind = 'token' then
    update public.ai_token_budget_reservations r
    set provider_started_at = coalesce(r.provider_started_at, now()),
        provider_start_key = coalesce(r.provider_start_key, p_provider_start_key)
    where r.id = p_reservation_id
      and r.status = 'active'
      and (r.provider_start_key is null or r.provider_start_key = p_provider_start_key)
    returning r.status, r.provider_started_at, r.provider_start_key
    into v_status, v_started_at, v_start_key;

    if not found then
      select r.status, r.provider_started_at, r.provider_start_key
      into v_status, v_started_at, v_start_key
      from public.ai_token_budget_reservations r
      where r.id = p_reservation_id;
    end if;
  else
    update public.ai_media_cost_unit_reservations r
    set provider_started_at = coalesce(r.provider_started_at, now()),
        provider_start_key = coalesce(r.provider_start_key, p_provider_start_key)
    where r.id = p_reservation_id
      and r.status = 'active'
      and (r.provider_start_key is null or r.provider_start_key = p_provider_start_key)
    returning r.status, r.provider_started_at, r.provider_start_key
    into v_status, v_started_at, v_start_key;

    if not found then
      select r.status, r.provider_started_at, r.provider_start_key
      into v_status, v_started_at, v_start_key
      from public.ai_media_cost_unit_reservations r
      where r.id = p_reservation_id;
    end if;
  end if;

  if v_status is null then
    return query select p_reservation_id, 'not_found'::text, 'not_started'::text, null::timestamptz;
  elsif v_status = 'active' and v_started_at is not null and v_start_key = p_provider_start_key then
    return query select p_reservation_id, v_status, 'started'::text, v_started_at;
  elsif v_status = 'active' and v_started_at is not null then
    return query select p_reservation_id, v_status, 'already_claimed'::text, v_started_at;
  else
    return query select p_reservation_id, v_status, 'not_started'::text, v_started_at;
  end if;
end;
$$;

-- The only post-marker refund path requires the caller to assert that no
-- provider request was made. This is used when the marker response itself is
-- lost and the provider invocation is deliberately withheld.
create or replace function public.release_ai_budget_known_not_consumed(
  p_reservation_kind text,
  p_reservation_id uuid,
  p_provider_start_key text
)
returns table (
  reservation_id uuid,
  reservation_status text,
  refunded_units integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reset_date date;
  v_reservation_reset_date date;
  v_reserved_units integer;
  v_status text;
  v_start_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_reservation_kind not in ('token', 'media_cost_unit')
    or p_reservation_id is null
    or nullif(btrim(p_provider_start_key), '') is null then
    raise exception 'invalid known-not-consumed release request' using errcode = '22023';
  end if;

  if p_reservation_kind = 'token' then
    select r.owner_id into v_owner_id from public.ai_token_budget_reservations r
    where r.id = p_reservation_id;
    if not found then
      return query select p_reservation_id, 'not_found'::text, 0;
      return;
    end if;

    select p.token_reset_date into v_reset_date from public.profiles p
    where p.user_id = v_owner_id for update;
    select r.token_reset_date, r.reserved_tokens, r.status, r.provider_start_key
    into v_reservation_reset_date, v_reserved_units, v_status, v_start_key
    from public.ai_token_budget_reservations r
    where r.id = p_reservation_id for update;

    if v_status = 'active' and (v_start_key is null or v_start_key = p_provider_start_key) then
      if v_reset_date = v_reservation_reset_date then
        update public.profiles p
        set tokens_used_today = greatest(0, p.tokens_used_today - v_reserved_units)
        where p.user_id = v_owner_id;
      end if;
      update public.ai_token_budget_reservations r
      set status = 'released', refunded_tokens = r.reserved_tokens,
          known_not_consumed_at = now(), settled_at = now()
      where r.id = p_reservation_id;
      v_status := 'released';
    end if;
  else
    select r.owner_id into v_owner_id from public.ai_media_cost_unit_reservations r
    where r.id = p_reservation_id;
    if not found then
      return query select p_reservation_id, 'not_found'::text, 0;
      return;
    end if;

    select p.media_cost_unit_reset_date into v_reset_date from public.profiles p
    where p.user_id = v_owner_id for update;
    select r.reset_date, r.reserved_cost_units, r.status, r.provider_start_key
    into v_reservation_reset_date, v_reserved_units, v_status, v_start_key
    from public.ai_media_cost_unit_reservations r
    where r.id = p_reservation_id for update;

    if v_status = 'active' and (v_start_key is null or v_start_key = p_provider_start_key) then
      if v_reset_date = v_reservation_reset_date then
        update public.profiles p
        set media_cost_units_used_today = greatest(0, p.media_cost_units_used_today - v_reserved_units)
        where p.user_id = v_owner_id;
      end if;
      update public.ai_media_cost_unit_reservations r
      set status = 'released', refunded_cost_units = r.reserved_cost_units,
          known_not_consumed_at = now(), settled_at = now()
      where r.id = p_reservation_id;
      v_status := 'released';
    end if;
  end if;

  return query select p_reservation_id, v_status,
    case when v_status = 'released' then v_reserved_units else 0 end;
end;
$$;

-- Sweep provider-started reservations that outlived both immediate settlement
-- and reconciliation enqueue. The active-row predicate makes retries and lost
-- responses idempotent, while the full reserved charge prevents a refund of
-- potentially successful provider work.
create or replace function public.reconcile_stale_started_ai_budget_reservations(
  p_now timestamptz default now(),
  p_limit integer default 100
)
returns table (
  token_reservations integer,
  media_reservations integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tokens integer := 0;
  v_media integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'invalid stale reservation reconciliation request' using errcode = '22023';
  end if;

  with candidates as (
    select r.id
    from public.ai_token_budget_reservations r
    where r.status = 'active'
      and r.provider_started_at is not null
      and r.expires_at <= p_now
    order by r.expires_at, r.created_at
    limit p_limit
    for update skip locked
  ), reconciled as (
    update public.ai_token_budget_reservations r
    set status = case
          when p.token_reset_date = r.token_reset_date then 'settled'
          else 'settled_late'
        end,
        actual_tokens = r.reserved_tokens,
        charged_tokens = r.reserved_tokens,
        refunded_tokens = 0,
        settled_at = p_now,
        conservatively_settled_at = p_now
    from candidates c, public.profiles p
    where r.id = c.id
      and p.user_id = r.owner_id
      and r.status = 'active'
    returning r.id
  )
  select count(*)::integer into v_tokens from reconciled;

  with candidates as (
    select r.id
    from public.ai_media_cost_unit_reservations r
    where r.status = 'active'
      and r.provider_started_at is not null
      and r.expires_at <= p_now
    order by r.expires_at, r.created_at
    limit p_limit
    for update skip locked
  ), reconciled as (
    update public.ai_media_cost_unit_reservations r
    set status = case
          when p.media_cost_unit_reset_date = r.reset_date then 'settled'
          else 'settled_late'
        end,
        actual_cost_units = r.reserved_cost_units,
        charged_cost_units = r.reserved_cost_units,
        refunded_cost_units = 0,
        settled_at = p_now,
        conservatively_settled_at = p_now
    from candidates c, public.profiles p
    where r.id = c.id
      and p.user_id = r.owner_id
      and r.status = 'active'
    returning r.id
  )
  select count(*)::integer into v_media from reconciled;

  return query select v_tokens, v_media;
end;
$$;

-- Failed client-side settlement is withheld from the caller and recorded for
-- an idempotent background reconciliation attempt. No reconciliation path
-- releases a reservation because the provider has already consumed usage.
create table public.ai_budget_reconciliation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  reservation_kind text not null check (reservation_kind in ('token', 'media_cost_unit')),
  reservation_id uuid not null,
  actual_units integer not null check (actual_units >= 0 and actual_units <= 1000000),
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dead_letter')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reservation_kind, reservation_id)
);

create index ai_budget_reconciliation_jobs_pending_idx
  on public.ai_budget_reconciliation_jobs (next_attempt_at, created_at)
  where status = 'pending';

alter table public.ai_budget_reconciliation_jobs enable row level security;
alter table public.ai_budget_reconciliation_jobs force row level security;

revoke all on table public.ai_budget_reconciliation_jobs from public, anon, authenticated;
grant select, insert, update on table public.ai_budget_reconciliation_jobs to service_role;

create or replace function public.queue_ai_budget_reconciliation(
  p_reservation_kind text,
  p_reservation_id uuid,
  p_actual_units integer,
  p_last_error text default null
)
returns table (
  reconciliation_id uuid,
  reconciliation_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_reservation_status text;
  v_stored_actual integer;
  v_provider_started_at timestamptz;
  v_existing_actual integer;
  v_existing_status text;
  v_job_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_reservation_kind not in ('token', 'media_cost_unit')
    or p_reservation_id is null
    or p_actual_units is null
    or p_actual_units < 0
    or p_actual_units > 1000000 then
    raise exception 'invalid reconciliation request' using errcode = '22023';
  end if;

  if p_reservation_kind = 'token' then
    select r.owner_id, r.status, r.actual_tokens, r.provider_started_at
    into v_owner_id, v_reservation_status, v_stored_actual, v_provider_started_at
    from public.ai_token_budget_reservations r
    where r.id = p_reservation_id;
  else
    select r.owner_id, r.status, r.actual_cost_units, r.provider_started_at
    into v_owner_id, v_reservation_status, v_stored_actual, v_provider_started_at
    from public.ai_media_cost_unit_reservations r
    where r.id = p_reservation_id;
  end if;

  if v_owner_id is null then
    return query select null::uuid, 'not_found'::text;
    return;
  end if;

  if v_provider_started_at is null then
    return query select null::uuid, 'not_started'::text;
    return;
  end if;

  if v_reservation_status in ('settled', 'settled_late') then
    return query select
      null::uuid,
      case when v_stored_actual >= p_actual_units
        then 'already_settled' else 'usage_mismatch' end;
    return;
  end if;

  select j.id, j.actual_units, j.status into v_job_id, v_existing_actual, v_existing_status
  from public.ai_budget_reconciliation_jobs j
  where j.reservation_kind = p_reservation_kind
    and j.reservation_id = p_reservation_id
  for update;

  if found and v_existing_actual <> p_actual_units then
    return query select null::uuid, 'usage_mismatch'::text;
    return;
  end if;

  if found then
    update public.ai_budget_reconciliation_jobs j
    set last_error = case
          when j.status = 'pending'
            then left(coalesce(p_last_error, 'settlement unavailable'), 500)
          else j.last_error
        end,
        next_attempt_at = case when j.status = 'pending' then now() else j.next_attempt_at end,
        updated_at = case when j.status = 'pending' then now() else j.updated_at end
    where j.id = v_job_id;

    return query select v_job_id, v_existing_status;
    return;
  end if;

  insert into public.ai_budget_reconciliation_jobs (
    owner_id,
    reservation_kind,
    reservation_id,
    actual_units,
    last_error
  ) values (
    v_owner_id,
    p_reservation_kind,
    p_reservation_id,
    p_actual_units,
    left(coalesce(p_last_error, 'settlement unavailable'), 500)
  )
  on conflict (reservation_kind, reservation_id) do nothing
  returning id, status, actual_units
  into v_job_id, v_existing_status, v_existing_actual;

  if found then
    return query select v_job_id, v_existing_status;
    return;
  end if;

  -- A concurrent caller won the unique-key race. Its usage is authoritative;
  -- retries may refresh metadata only when they report the same usage.
  select j.id, j.actual_units, j.status
  into v_job_id, v_existing_actual, v_existing_status
  from public.ai_budget_reconciliation_jobs j
  where j.reservation_kind = p_reservation_kind
    and j.reservation_id = p_reservation_id
  for update;

  if not found then
    return query select null::uuid, 'enqueue_unavailable'::text;
    return;
  end if;

  if v_existing_actual <> p_actual_units then
    return query select null::uuid, 'usage_mismatch'::text;
    return;
  end if;

  update public.ai_budget_reconciliation_jobs j
  set last_error = case
        when j.status = 'pending'
          then left(coalesce(p_last_error, 'settlement unavailable'), 500)
        else j.last_error
      end,
      next_attempt_at = case when j.status = 'pending' then now() else j.next_attempt_at end,
      updated_at = case when j.status = 'pending' then now() else j.updated_at end
  where j.id = v_job_id;

  return query select v_job_id, v_existing_status;
end;
$$;

-- Process one durable job while holding its row lock. Settlement and job-state
-- transition share one transaction, making retries idempotent. This worker has
-- no release path because every queued job represents consumed provider usage.
create or replace function public.process_ai_budget_reconciliation(
  p_job_id uuid,
  p_now timestamptz default now(),
  p_max_attempts integer default 5
)
returns table (
  reconciliation_id uuid,
  reconciliation_status text,
  reservation_status text,
  attempt_count integer,
  next_attempt_at timestamptz,
  failure_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.ai_budget_reconciliation_jobs%rowtype;
  v_reservation_status text;
  v_actual_units integer := 0;
  v_charged_units integer := 0;
  v_attempts integer;
  v_failure_code text;
  v_next_attempt_at timestamptz;
  v_terminal boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_job_id is null
    or p_now is null
    or p_max_attempts is null
    or p_max_attempts < 1
    or p_max_attempts > 10 then
    raise exception 'invalid reconciliation processing request' using errcode = '22023';
  end if;

  select j.* into v_job
  from public.ai_budget_reconciliation_jobs j
  where j.id = p_job_id
  for update;

  if not found then
    return query select p_job_id, 'not_found'::text, null::text, 0, null::timestamptz,
      'job_not_found'::text;
    return;
  end if;

  if v_job.status <> 'pending' then
    return query select v_job.id, v_job.status, null::text, v_job.attempts,
      v_job.next_attempt_at, v_job.last_error;
    return;
  end if;

  if v_job.next_attempt_at > p_now then
    return query select v_job.id, v_job.status, null::text, v_job.attempts,
      v_job.next_attempt_at, 'not_due'::text;
    return;
  end if;

  v_attempts := v_job.attempts + 1;

  begin
    if v_job.reservation_kind = 'token' then
      select s.reservation_status, s.actual_tokens, s.charged_tokens
      into v_reservation_status, v_actual_units, v_charged_units
      from public.settle_ai_token_budget(v_job.reservation_id, v_job.actual_units) s;
    elsif v_job.reservation_kind = 'media_cost_unit' then
      select s.reservation_status, s.actual_cost_units, s.charged_cost_units
      into v_reservation_status, v_actual_units, v_charged_units
      from public.settle_ai_media_cost_budget(v_job.reservation_id, v_job.actual_units) s;
    else
      v_reservation_status := 'invalid_kind';
    end if;
  exception when others then
    -- Do not persist SQLERRM: durable reconciliation records only bounded
    -- operational codes, never provider or student content.
    v_failure_code := 'settlement_rpc_error';
  end;

  if v_failure_code is null
    and v_reservation_status in ('settled', 'settled_late')
    and v_actual_units >= v_job.actual_units
    and v_charged_units = v_actual_units then
    update public.ai_budget_reconciliation_jobs j
    set status = 'resolved',
        attempts = v_attempts,
        last_error = null,
        updated_at = p_now,
        resolved_at = p_now
    where j.id = v_job.id;

    return query select v_job.id, 'resolved'::text, v_reservation_status,
      v_attempts, null::timestamptz, null::text;
    return;
  end if;

  if v_failure_code is null then
    if v_reservation_status in ('released', 'not_found', 'usage_mismatch', 'invalid_status', 'invalid_kind') then
      v_failure_code := 'terminal_' || v_reservation_status;
      v_terminal := true;
    elsif v_reservation_status in ('settled', 'settled_late') then
      v_failure_code := 'settlement_usage_mismatch';
      v_terminal := true;
    else
      v_failure_code := 'unexpected_settlement_status';
    end if;
  end if;

  if v_terminal or v_attempts >= p_max_attempts then
    update public.ai_budget_reconciliation_jobs j
    set status = 'dead_letter',
        attempts = v_attempts,
        last_error = v_failure_code,
        updated_at = p_now,
        next_attempt_at = p_now
    where j.id = v_job.id;

    return query select v_job.id, 'dead_letter'::text, v_reservation_status,
      v_attempts, p_now, v_failure_code;
    return;
  end if;

  v_next_attempt_at := p_now + make_interval(
    secs => least(3600, 30 * power(2, least(v_attempts - 1, 7)))::integer
  );

  update public.ai_budget_reconciliation_jobs j
  set attempts = v_attempts,
      last_error = v_failure_code,
      next_attempt_at = v_next_attempt_at,
      updated_at = p_now
  where j.id = v_job.id;

  return query select v_job.id, 'pending'::text, v_reservation_status,
    v_attempts, v_next_attempt_at, v_failure_code;
end;
$$;

revoke execute on function public.reserve_ai_token_budget(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.settle_ai_token_budget(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.release_ai_token_budget(uuid)
  from public, anon, authenticated;
revoke execute on function public.reserve_ai_media_cost_budget(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.settle_ai_media_cost_budget(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.release_ai_media_cost_budget(uuid)
  from public, anon, authenticated;
revoke execute on function public.mark_ai_budget_provider_started(text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.release_ai_budget_known_not_consumed(text, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.reconcile_stale_started_ai_budget_reservations(timestamptz, integer)
  from public, anon, authenticated;
revoke execute on function public.queue_ai_budget_reconciliation(text, uuid, integer, text)
  from public, anon, authenticated;
revoke execute on function public.process_ai_budget_reconciliation(uuid, timestamptz, integer)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_token_budget(uuid, text, integer)
  to service_role;
grant execute on function public.settle_ai_token_budget(uuid, integer)
  to service_role;
grant execute on function public.release_ai_token_budget(uuid)
  to service_role;
grant execute on function public.reserve_ai_media_cost_budget(uuid, text, integer)
  to service_role;
grant execute on function public.settle_ai_media_cost_budget(uuid, integer)
  to service_role;
grant execute on function public.release_ai_media_cost_budget(uuid)
  to service_role;
grant execute on function public.mark_ai_budget_provider_started(text, uuid, text)
  to service_role;
grant execute on function public.release_ai_budget_known_not_consumed(text, uuid, text)
  to service_role;
grant execute on function public.reconcile_stale_started_ai_budget_reservations(timestamptz, integer)
  to service_role;
grant execute on function public.queue_ai_budget_reconciliation(text, uuid, integer, text)
  to service_role;
grant execute on function public.process_ai_budget_reconciliation(uuid, timestamptz, integer)
  to service_role;
