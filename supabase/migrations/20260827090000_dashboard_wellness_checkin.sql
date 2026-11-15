-- The Today dashboard updates one daily sleep log and one dashboard movement
-- record so adjustment of a slider never creates duplicate activity history.
create or replace function public.record_dashboard_wellness_check_in(
  p_mood text,
  p_sleep_date date,
  p_sleep_quality text,
  p_sleep_hours numeric,
  p_focus_note text,
  p_movement_type text,
  p_movement_minutes integer,
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

  if p_movement_type not in ('walk', 'run', 'bike', 'team_sport', 'strength', 'stretch', 'dance', 'other') then
    raise exception 'invalid activity type';
  end if;
  if p_movement_minutes < 1 or p_movement_minutes > 180 then
    raise exception 'invalid activity duration';
  end if;

  perform public.record_daily_wellness_check_in(
    p_mood,
    p_sleep_date,
    p_sleep_quality,
    p_sleep_hours,
    p_focus_note,
    p_mood_metadata
  );

  delete from public.wellness_activity_logs
  where owner_id = v_owner_id
    and logged_for = p_sleep_date
    and notes = '__diana_dashboard_checkin__';

  perform public.record_wellness_activity(
    p_sleep_date,
    p_movement_type,
    p_movement_minutes,
    'steady',
    '__diana_dashboard_checkin__'
  );
end;
$$;

revoke all on function public.record_dashboard_wellness_check_in(text, date, text, numeric, text, text, integer, jsonb) from public, anon, service_role;
grant execute on function public.record_dashboard_wellness_check_in(text, date, text, numeric, text, text, integer, jsonb) to authenticated;
