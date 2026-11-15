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

  if p_duration_minutes >= 20 then
    update public.sleep_logs
    set movement_20_min = true, updated_at = pg_catalog.now()
    where owner_id = v_owner_id
      and sleep_date = p_logged_for;
  end if;

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
