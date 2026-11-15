-- Run only in a disposable database with psql -v ON_ERROR_STOP=1 -f this_file.
-- The fixture and roles roll back; the real migration is executed verbatim.
begin;
create role authenticated;
create role anon;
create role service_role bypassrls;
create table public.worker_jobs (
  id uuid, trace_id text, owner_id uuid, feature text, queue_name text,
  queue_mode text, status text, created_at timestamptz, started_at timestamptz,
  completed_at timestamptz, payload jsonb, result_payload jsonb,
  error_summary text, constraints jsonb, observability jsonb
);
alter table public.worker_jobs enable row level security;
create policy owner_read on public.worker_jobs for select
  using (owner_id = current_setting('request.jwt.claim.sub', true)::uuid);
grant usage on schema public to authenticated, anon, service_role;
grant all on public.worker_jobs to authenticated, anon, service_role;
grant select on public.worker_jobs to public;
grant select (result_payload, payload) on public.worker_jobs to authenticated, anon, public;
insert into public.worker_jobs (owner_id, trace_id, status, payload, result_payload) values
  ('11111111-1111-4111-8111-111111111111', 'owned', 'succeeded', '{"input":{}}', '{"response":"Private help"}'),
  ('22222222-2222-4222-8222-222222222222', 'other', 'succeeded', '{"input":{}}', '{"response":"Other help"}');

\ir ../migrations/20260929034718_worker_result_release_boundary.sql

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
begin
  if (select count(status) from public.worker_jobs) <> 1 then
    raise exception 'Owner status access or row isolation regressed';
  end if;
  begin
    perform result_payload from public.worker_jobs;
    raise exception 'Raw result bypass remains';
  exception when insufficient_privilege then null;
  end;
  begin
    perform payload from public.worker_jobs;
    raise exception 'Raw payload remains readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform to_jsonb(j) from public.worker_jobs j;
    raise exception 'Whole-row projection bypass remains';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS authenticated owner status, cross-owner RLS, raw result/payload and whole-row denial';
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform status from public.worker_jobs;
    raise exception 'Anon status access remains';
  exception when insufficient_privilege then null;
  end;
  begin
    perform result_payload from public.worker_jobs;
    raise exception 'Anon raw result access remains';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anonymous status and result denial';
end $$;
reset role;
set local role service_role;
do $$
begin
  if (select count(result_payload) from public.worker_jobs) <> 2 then
    raise exception 'Service worker result access regressed';
  end if;
  raise notice 'PASS service worker result access preserved';
end $$;
reset role;
rollback;
