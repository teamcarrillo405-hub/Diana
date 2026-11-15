-- Keep student wellness writes internally consistent across the lobby and
-- Wellness page. All functions run as the signed-in caller, so existing RLS
-- policies continue to enforce student isolation.

create or replace function public.record_wellness_sleep_log(
  p_sleep_date date,
  p_sleep_quality text,
  p_sleep_hours numeric,
  p_focus_note text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_has_movement boolean;
begin
  if v_owner_id is null then
    raise exception 'authentication required';
  end if;
  if p_sleep_quality not in ('rested', 'ok', 'rough') then
    raise exception 'invalid sleep quality';
  end if;
  if p_sleep_hours is not null and (p_sleep_hours < 0 or p_sleep_hours > 18) then
    raise exception 'invalid sleep hours';
  end if;

  select exists (
    select 1
    from public.wellness_activity_logs
    where owner_id = v_owner_id
      and logged_for = p_sleep_date
      and duration_minutes >= 20
  ) into v_has_movement;

  insert into public.sleep_logs as logs (
    owner_id,
    sleep_date,
    sleep_quality,
    sleep_hours,
    movement_20_min,
    focus_note,
    updated_at
  ) values (
    v_owner_id,
    p_sleep_date,
    p_sleep_quality,
    p_sleep_hours,
    v_has_movement,
    nullif(p_focus_note, ''),
    pg_catalog.now()
  )
  on conflict (owner_id, sleep_date) do update set
    sleep_quality = excluded.sleep_quality,
    sleep_hours = excluded.sleep_hours,
    movement_20_min = coalesce(logs.movement_20_min, false) or excluded.movement_20_min,
    focus_note = excluded.focus_note,
    updated_at = pg_catalog.now();

  insert into public.task_signals (owner_id, kind, value)
  values (
    v_owner_id,
    'sleep_log',
    jsonb_build_object(
      'sleepDate', p_sleep_date,
      'sleepQuality', p_sleep_quality,
      'sleepHours', p_sleep_hours,
      'movement20', v_has_movement
    )
  );

  return v_has_movement;
end;
$$;

create or replace function public.record_wellness_activity(
  p_logged_for date,
  p_activity_type text,
  p_duration_minutes integer,
  p_felt text,
  p_notes text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception 'authentication required';
  end if;
  if p_activity_type not in ('walk', 'run', 'bike', 'team_sport', 'strength', 'stretch', 'dance', 'other') then
    raise exception 'invalid activity type';
  end if;
  if p_duration_minutes < 1 or p_duration_minutes > 720 then
    raise exception 'invalid activity duration';
  end if;
  if p_felt not in ('steady', 'tired', 'energized', 'sore', 'proud', 'not_sure') then
    raise exception 'invalid activity feeling';
  end if;

  insert into public.wellness_activity_logs (
    owner_id,
    logged_for,
    activity_type,
    duration_minutes,
    felt,
    notes
  ) values (
    v_owner_id,
    p_logged_for,
    p_activity_type,
    p_duration_minutes,
    p_felt,
    nullif(p_notes, '')
  );

  insert into public.task_signals (owner_id, kind, value)
  values (
    v_owner_id,
    'activity_log',
    jsonb_build_object(
      'loggedFor', p_logged_for,
      'activityType', p_activity_type,
      'durationMinutes', p_duration_minutes,
      'felt', p_felt
    )
  );
end;
$$;

create or replace function public.record_daily_wellness_check_in(
  p_mood text,
  p_sleep_date date,
  p_sleep_quality text,
  p_sleep_hours numeric,
  p_focus_note text,
  p_mood_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception 'authentication required';
  end if;
  if p_mood not in ('good', 'meh', 'rough') then
    raise exception 'invalid mood';
  end if;

  update public.profiles
  set
    session_mood = p_mood,
    last_mood_checkin_at = pg_catalog.now(),
    rough_mode_until = case when p_mood = 'rough' then pg_catalog.now() + interval '1 day' else null end,
    updated_at = pg_catalog.now()
  where user_id = v_owner_id;

  if not found then
    raise exception 'profile not found';
  end if;

  perform public.record_wellness_sleep_log(
    p_sleep_date,
    p_sleep_quality,
    p_sleep_hours,
    p_focus_note
  );

  insert into public.task_signals (owner_id, kind, value)
  values (
    v_owner_id,
    'mood_checkin',
    jsonb_build_object('mood', p_mood) || coalesce(p_mood_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.record_wellness_sleep_log(date, text, numeric, text) from public, anon, service_role;
revoke all on function public.record_wellness_activity(date, text, integer, text, text) from public, anon, service_role;
revoke all on function public.record_daily_wellness_check_in(text, date, text, numeric, text, jsonb) from public, anon, service_role;

grant execute on function public.record_wellness_sleep_log(date, text, numeric, text) to authenticated;
grant execute on function public.record_wellness_activity(date, text, integer, text, text) to authenticated;
grant execute on function public.record_daily_wellness_check_in(text, date, text, numeric, text, jsonb) to authenticated;
