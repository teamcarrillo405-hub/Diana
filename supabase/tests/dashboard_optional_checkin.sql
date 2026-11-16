-- Run only on a disposable database with all migrations applied:
-- psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/dashboard_optional_checkin.sql
-- Synthetic users and all wellness records are rolled back at the end.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000801', 'authenticated', 'authenticated', 'optional-checkin-a@example.invalid', '', now(), '{}'::jsonb, '{"date_of_birth":"1990-01-01"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000802', 'authenticated', 'authenticated', 'optional-checkin-b@example.invalid', '', now(), '{}'::jsonb, '{"date_of_birth":"1990-01-01"}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '', true);
do $no_identity$
declare v_rejected boolean := false;
begin
  begin
    perform public.record_dashboard_energy_check_in('low', '2030-01-15', null, null, null);
  exception when raise_exception then
    if sqlerrm = 'authentication required' then v_rejected := true; else raise; end if;
  end;
  if not v_rejected then raise exception 'check-in accepted a missing identity'; end if;
end;
$no_identity$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000801', true);

-- Exercise the RPC before adding any test-only table privileges. This must
-- work even on a fresh replay where authenticated cannot select profiles.
do $default_acl$
declare v_signal_id text;
begin
  v_signal_id := public.record_dashboard_energy_check_in('low', '2030-01-15', null, null, null);
  if v_signal_id is null or v_signal_id !~ '^[0-9]+$' then
    raise exception 'energy-only check-in did not return a text signal ID';
  end if;
  perform set_config('test.dashboard_energy_signal_id', v_signal_id, true);
end;
$default_acl$;
reset role;

-- Temporary grants let this regression inspect owner RLS in fresh local
-- projects without relying on hosted default grants. They roll back below.
grant select on public.profiles, public.task_signals, public.sleep_logs, public.wellness_activity_logs to authenticated;
grant update (focus_note) on public.sleep_logs to authenticated;
grant insert on public.task_signals to authenticated;
grant usage, select on sequence public.task_signals_id_seq to authenticated;
set local role authenticated;

do $contract$
declare
  v_owner uuid := '00000000-0000-4000-8000-000000000801';
  v_signal_id text;
  v_signal_count bigint;
  v_rejected boolean := false;
begin
  v_signal_id := current_setting('test.dashboard_energy_signal_id');
  if v_signal_id !~ '^[0-9]+$' or not exists (
    select 1 from public.task_signals where id::text = v_signal_id and owner_id = v_owner
      and kind = 'mood_checkin' and value ->> 'energy' = 'low'
      and value -> 'sleepHours' = 'null'::jsonb
      and value -> 'movementType' = 'null'::jsonb
      and value -> 'movementMinutes' = 'null'::jsonb
      and not (value ? 'focus') and not (value ? 'mood')
  ) then raise exception 'energy-only signal or text ID incorrect'; end if;
  if exists (select 1 from public.sleep_logs where owner_id = v_owner)
     or exists (select 1 from public.wellness_activity_logs where owner_id = v_owner)
     or (select session_mood from public.profiles where user_id = v_owner) is not null
  then raise exception 'energy-only check-in invented wellness data'; end if;

  v_signal_id := public.record_dashboard_energy_check_in('good', '2030-01-15', null, 'walk', 30);
  if exists (select 1 from public.sleep_logs where owner_id = v_owner)
     or (select count(*) from public.wellness_activity_logs where owner_id = v_owner and logged_for = '2030-01-15' and activity_type = 'walk' and duration_minutes = 30) <> 1
  then raise exception 'movement-only check-in wrote incorrect wellness data'; end if;

  perform public.record_dashboard_energy_check_in('okay', '2030-01-15', 8, null, null);
  if not exists (select 1 from public.sleep_logs where owner_id = v_owner and sleep_date = '2030-01-15' and sleep_hours = 8)
     or (select count(*) from public.wellness_activity_logs where owner_id = v_owner and logged_for = '2030-01-15') <> 1
  then raise exception 'sleep-only check-in modified unrelated movement'; end if;

  update public.sleep_logs set focus_note = 'Keep this note' where owner_id = v_owner and sleep_date = '2030-01-15';
  perform public.record_dashboard_energy_check_in('okay', '2030-01-15', 7, 'bike', 15);
  if not exists (select 1 from public.sleep_logs where owner_id = v_owner and sleep_date = '2030-01-15' and sleep_hours = 7 and focus_note = 'Keep this note')
     or (select count(*) from public.wellness_activity_logs where owner_id = v_owner and logged_for = '2030-01-15' and activity_type = 'bike' and duration_minutes = 15) <> 1
  then raise exception 'updated check-in lost existing note or failed to replace dashboard movement'; end if;

  select count(*) into v_signal_count from public.task_signals;
  begin
    perform public.record_dashboard_energy_check_in('good', '2030-01-15', null, 'walk', null);
  exception when raise_exception then v_rejected := true;
  end;
  if not v_rejected or (select count(*) from public.task_signals) <> v_signal_count then
    raise exception 'partial movement was not rejected atomically';
  end if;
end;
$contract$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000802', true);
do $isolation$
declare
  v_foreign_write_denied boolean := false;
  v_signal_id text;
begin
  if exists (select 1 from public.task_signals where owner_id = '00000000-0000-4000-8000-000000000801')
     or exists (select 1 from public.sleep_logs where owner_id = '00000000-0000-4000-8000-000000000801')
  then raise exception 'another student can read check-in data'; end if;
  if has_function_privilege('anon', 'public.record_dashboard_energy_check_in(text,date,numeric,text,integer)', 'execute') then
    raise exception 'anonymous check-in execution is allowed';
  end if;
  if has_function_privilege('service_role', 'public.record_dashboard_energy_check_in(text,date,numeric,text,integer)', 'execute')
     or not has_function_privilege('authenticated', 'public.record_dashboard_energy_check_in(text,date,numeric,text,integer)', 'execute') then
    raise exception 'dashboard check-in execution ACL is incorrect';
  end if;
  begin
    insert into public.task_signals (owner_id, kind, value)
      values ('00000000-0000-4000-8000-000000000801', 'mood_checkin', '{"energy":"low"}'::jsonb);
  exception when insufficient_privilege then v_foreign_write_denied := true;
  end;
  if not v_foreign_write_denied then raise exception 'foreign-owner signal insert was accepted'; end if;
  v_signal_id := public.record_dashboard_energy_check_in('good', '2030-01-15', null, null, null);
  if not exists (select 1 from public.task_signals where id::text = v_signal_id and owner_id = '00000000-0000-4000-8000-000000000802') then
    raise exception 'second student check-in was not attributed to the caller';
  end if;
end;
$isolation$;
reset role;
rollback;
