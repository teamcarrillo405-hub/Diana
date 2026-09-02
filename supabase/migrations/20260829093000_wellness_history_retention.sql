-- Keep detailed wellness history private and short-lived while retaining the
-- aggregate values needed for a student's year-to-date dashboard.

create table if not exists public.wellness_yearly_archives (
  owner_id uuid not null references auth.users(id) on delete cascade,
  logged_for date not null,
  check_in_completed boolean not null default false,
  energy_total numeric not null default 0,
  energy_samples integer not null default 0,
  sleep_total numeric not null default 0,
  sleep_samples integer not null default 0,
  movement_minutes integer not null default 0,
  archived_at timestamptz not null default now(),
  primary key (owner_id, logged_for),
  check (energy_total >= 0),
  check (energy_samples >= 0),
  check (sleep_total >= 0),
  check (sleep_samples >= 0),
  check (movement_minutes >= 0)
);

create index if not exists wellness_yearly_archives_owner_date_idx
  on public.wellness_yearly_archives (owner_id, logged_for desc);

alter table public.wellness_yearly_archives enable row level security;

create policy "wellness yearly archives owner read"
  on public.wellness_yearly_archives for select
  using (owner_id = auth.uid());

create or replace function public.archive_and_prune_wellness_history()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_cutoff date := (current_date - interval '3 months')::date;
begin
  if v_owner_id is null then
    raise exception 'authentication required';
  end if;

  with sleep_days as (
    select sleep_date as logged_for, sleep_hours
    from public.sleep_logs
    where owner_id = v_owner_id and sleep_date < v_cutoff
  ),
  movement_days as (
    select logged_for, sum(duration_minutes)::integer as movement_minutes
    from public.wellness_activity_logs
    where owner_id = v_owner_id and logged_for < v_cutoff
    group by logged_for
  ),
  mood_candidates as (
    select
      coalesce(nullif(value ->> 'sleepDate', '')::date, (occurred_at at time zone 'UTC')::date) as logged_for,
      case coalesce(value ->> 'energy', value ->> 'mood')
        when 'good' then 3 when 'ready' then 3
        when 'meh' then 2 when 'okay' then 2 when 'ok' then 2
        when 'rough' then 1 when 'low' then 1
        else null
      end as energy_level,
      occurred_at
    from public.task_signals
    where owner_id = v_owner_id
      and kind = 'mood_checkin'
      and coalesce(nullif(value ->> 'sleepDate', '')::date, (occurred_at at time zone 'UTC')::date) < v_cutoff
  ),
  mood_days as (
    select distinct on (logged_for) logged_for, energy_level
    from mood_candidates
    where energy_level is not null
    order by logged_for, occurred_at desc
  ),
  dated_days as (
    select logged_for from sleep_days
    union select logged_for from movement_days
    union select logged_for from mood_days
  )
  insert into public.wellness_yearly_archives (
    owner_id, logged_for, check_in_completed, energy_total, energy_samples,
    sleep_total, sleep_samples, movement_minutes, archived_at
  )
  select
    v_owner_id,
    days.logged_for,
    sleep_days.logged_for is not null or mood_days.logged_for is not null,
    coalesce(mood_days.energy_level, 0),
    case when mood_days.energy_level is null then 0 else 1 end,
    coalesce(sleep_days.sleep_hours, 0),
    case when sleep_days.sleep_hours is null then 0 else 1 end,
    coalesce(movement_days.movement_minutes, 0),
    now()
  from dated_days as days
  left join sleep_days on sleep_days.logged_for = days.logged_for
  left join movement_days on movement_days.logged_for = days.logged_for
  left join mood_days on mood_days.logged_for = days.logged_for
  on conflict (owner_id, logged_for) do update set
    check_in_completed = excluded.check_in_completed,
    energy_total = excluded.energy_total,
    energy_samples = excluded.energy_samples,
    sleep_total = excluded.sleep_total,
    sleep_samples = excluded.sleep_samples,
    movement_minutes = excluded.movement_minutes,
    archived_at = now();

  delete from public.wellness_activity_logs
  where owner_id = v_owner_id and logged_for < v_cutoff;

  delete from public.sleep_logs
  where owner_id = v_owner_id and sleep_date < v_cutoff;

  delete from public.task_signals
  where owner_id = v_owner_id
    and kind in ('mood_checkin', 'sleep_log', 'activity_log')
    and coalesce(
      nullif(value ->> 'sleepDate', '')::date,
      nullif(value ->> 'loggedFor', '')::date,
      (occurred_at at time zone 'UTC')::date
    ) < v_cutoff;
end;
$$;

revoke all on function public.archive_and_prune_wellness_history() from public, anon, service_role;
grant execute on function public.archive_and_prune_wellness_history() to authenticated;
