-- Apply only a complete read of the student's primary Google Calendar.
-- Serialize snapshots so a slow earlier request cannot undo a newer sync.
create or replace function public.reconcile_google_calendar_snapshot(
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_snapshot_at timestamptz,
  p_events jsonb,
  p_complete boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  student_id uuid := auth.uid();
  connection_config jsonb;
  previous_snapshot timestamptz;
  synced_at timestamptz := clock_timestamp();
  imported_count integer;
  removed_count integer;
begin
  if student_id is null then raise exception 'Authentication required'; end if;
  if p_complete is distinct from true
    or p_range_start is null or p_range_end is null or p_snapshot_at is null
    or not isfinite(p_range_start) or not isfinite(p_range_end) or not isfinite(p_snapshot_at)
    or p_range_end <= p_range_start or p_range_end - p_range_start > interval '240 days'
    or p_snapshot_at > clock_timestamp() + interval '5 minutes'
    or jsonb_typeof(p_events) is distinct from 'array'
  then raise exception 'A complete bounded calendar snapshot is required'; end if;
  if jsonb_array_length(p_events) > 5000 then raise exception 'Calendar snapshot exceeds the page bound'; end if;

  perform pg_advisory_xact_lock(hashtextextended('google-calendar:' || student_id::text, 0));
  select config into connection_config from public.lms_connections
    where owner_id = student_id and provider = 'google_classroom' for update;
  if connection_config is null or connection_config->>'calendar_enabled' is distinct from 'true'
    then raise exception 'Google Calendar permission is required'; end if;
  previous_snapshot := nullif(connection_config->>'calendar_snapshot_at', '')::timestamptz;
  if previous_snapshot is not null and previous_snapshot >= p_snapshot_at then
    return jsonb_build_object('imported', 0, 'removed', 0, 'applied', false,
      'syncedAt', connection_config->>'calendar_last_synced_at',
      'rangeStart', connection_config->>'calendar_range_start', 'rangeEnd', connection_config->>'calendar_range_end');
  end if;

  if exists (select 1 from jsonb_array_elements(p_events) event
    where jsonb_typeof(event) <> 'object' or coalesce(event->>'external_event_id', '') = ''
      or coalesce(event->>'title', '') = '' or event->>'starts_at' is null)
    or (select count(distinct event->>'external_event_id') from jsonb_array_elements(p_events) event) <> jsonb_array_length(p_events)
    then raise exception 'Calendar snapshot contains invalid events'; end if;

  insert into public.calendar_events (
    owner_id, provider, external_calendar_id, external_event_id, title, description,
    starts_at, ends_at, all_day, html_link, source_updated_at, last_synced_at, updated_at
  )
  select student_id, 'google_calendar', 'primary', event.external_event_id, event.title, event.description,
    event.starts_at, event.ends_at, coalesce(event.all_day, false), event.html_link,
    event.source_updated_at, synced_at, synced_at
  from jsonb_to_recordset(p_events) as event(
    external_event_id text, title text, description text, starts_at timestamptz,
    ends_at timestamptz, all_day boolean, html_link text, source_updated_at timestamptz
  )
  on conflict (owner_id, provider, external_calendar_id, external_event_id) do update set
    title = excluded.title, description = excluded.description,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, all_day = excluded.all_day,
    html_link = excluded.html_link, source_updated_at = excluded.source_updated_at,
    last_synced_at = excluded.last_synced_at, updated_at = excluded.updated_at;
  get diagnostics imported_count = row_count;

  delete from public.calendar_events stored
    where stored.owner_id = student_id and stored.provider = 'google_calendar'
      and stored.external_calendar_id = 'primary'
      and stored.starts_at < p_range_end
      and coalesce(stored.ends_at, stored.starts_at) > p_range_start
      and not exists (select 1 from jsonb_array_elements(p_events) event
        where event->>'external_event_id' = stored.external_event_id);
  get diagnostics removed_count = row_count;

  update public.lms_connections set config = config || jsonb_build_object(
    'calendar_snapshot_at', p_snapshot_at, 'calendar_last_synced_at', synced_at,
    'calendar_range_start', p_range_start, 'calendar_range_end', p_range_end,
    'calendar_id', 'primary'
  ) where owner_id = student_id and provider = 'google_classroom';
  return jsonb_build_object('imported', imported_count, 'removed', removed_count, 'applied', true,
    'syncedAt', synced_at, 'rangeStart', p_range_start, 'rangeEnd', p_range_end);
end;
$$;

revoke all on function public.reconcile_google_calendar_snapshot(timestamptz, timestamptz, timestamptz, jsonb, boolean) from public;
grant execute on function public.reconcile_google_calendar_snapshot(timestamptz, timestamptz, timestamptz, jsonb, boolean) to authenticated;
