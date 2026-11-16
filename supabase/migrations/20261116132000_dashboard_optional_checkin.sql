-- Store only the values a student chooses to share. All writes stay within
-- one owner-scoped transaction and a text ID avoids bigint precision loss.
begin;

create or replace function public.record_dashboard_energy_check_in(
  p_energy text,
  p_sleep_date date,
  p_sleep_hours numeric,
  p_movement_type text,
  p_movement_minutes integer
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_signal_id text;
  v_sleep_quality text;
  v_existing_focus_note text;
begin
  if v_owner_id is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.profiles where user_id = v_owner_id) then
    raise exception 'profile not found';
  end if;
  if p_energy is null or p_energy not in ('low', 'okay', 'good') then
    raise exception 'invalid energy';
  end if;
  if p_sleep_date is null then raise exception 'invalid check-in date'; end if;
  if p_sleep_hours is not null and (
    p_sleep_hours::text in ('NaN', 'Infinity', '-Infinity')
    or p_sleep_hours < 0 or p_sleep_hours > 12
  ) then raise exception 'invalid sleep hours'; end if;
  if (p_movement_type is null) <> (p_movement_minutes is null) then
    raise exception 'movement type and duration must be provided together';
  end if;
  if p_movement_type is not null and (
    p_movement_type not in ('walk', 'run', 'bike', 'team_sport', 'strength', 'stretch', 'dance', 'other')
    or p_movement_minutes < 1 or p_movement_minutes > 180
  ) then raise exception 'invalid movement'; end if;

  -- Serialize this student's same-day dashboard saves through commit so the
  -- replace operation below cannot insert duplicate dashboard activity rows.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    'diana-dashboard-checkin:' || v_owner_id::text || ':' || (p_sleep_date - date '2000-01-01')::text, 0
  ));

  if p_sleep_hours is not null then
    v_sleep_quality := case when p_sleep_hours < 5 then 'rough' when p_sleep_hours < 7.5 then 'ok' else 'rested' end;
    select focus_note into v_existing_focus_note from public.sleep_logs
      where owner_id = v_owner_id and sleep_date = p_sleep_date;
    perform public.record_wellness_sleep_log(
      p_sleep_date, v_sleep_quality, p_sleep_hours, coalesce(v_existing_focus_note, '')
    );
  end if;

  if p_movement_type is not null then
    delete from public.wellness_activity_logs
      where owner_id = v_owner_id and logged_for = p_sleep_date
        and notes = '__diana_dashboard_checkin__';
    perform public.record_wellness_activity(
      p_sleep_date, p_movement_type, p_movement_minutes, 'not_sure', '__diana_dashboard_checkin__'
    );
  end if;

  insert into public.task_signals (owner_id, kind, value)
  values (v_owner_id, 'mood_checkin', pg_catalog.jsonb_build_object(
    'energy', p_energy, 'sleepHours', p_sleep_hours,
    'movementType', p_movement_type, 'movementMinutes', p_movement_minutes
  )) returning id::text into v_signal_id;
  return v_signal_id;
end;
$$;

revoke all on function public.record_dashboard_energy_check_in(text, date, numeric, text, integer) from public, anon, service_role;
grant execute on function public.record_dashboard_energy_check_in(text, date, numeric, text, integer) to authenticated;
commit;
