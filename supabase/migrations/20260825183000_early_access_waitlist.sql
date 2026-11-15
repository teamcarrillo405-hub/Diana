create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 200),
  email_normalized text not null unique check (email_normalized = lower(btrim(email))),
  status text not null default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'unsubscribed')),
  source text not null default 'public_landing' check (char_length(source) <= 80),
  confirmation_token uuid not null default gen_random_uuid() unique,
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.early_access_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default timezone('utc', now()),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.early_access_signups enable row level security;
alter table public.early_access_rate_limits enable row level security;

-- No browser roles receive access. Public requests go through the Edge Functions.
revoke all on table public.early_access_signups from anon, authenticated;
revoke all on table public.early_access_rate_limits from anon, authenticated;

create or replace function public.reserve_early_access_rate_limit(p_rate_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz := date_trunc('hour', timezone('utc', now()))
    + floor(extract(minute from timezone('utc', now())) / 10) * interval '10 minutes';
  next_count integer;
begin
  insert into public.early_access_rate_limits as limits (rate_key, window_started_at, request_count, updated_at)
  values (p_rate_key, current_window, 1, timezone('utc', now()))
  on conflict (rate_key) do update
  set
    request_count = case
      when limits.window_started_at < current_window then 1
      else limits.request_count + 1
    end,
    window_started_at = case
      when limits.window_started_at < current_window then current_window
      else limits.window_started_at
    end,
    updated_at = timezone('utc', now())
  returning request_count into next_count;

  return next_count <= 5;
end;
$$;

revoke all on function public.reserve_early_access_rate_limit(text) from public;
grant execute on function public.reserve_early_access_rate_limit(text) to service_role;
