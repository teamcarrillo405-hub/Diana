-- Phase 35: v2.0 launch hardening.
-- COPPA deletion-retention enforcement and audit trail for service-role jobs.

create table public.data_retention_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  due_requests integer not null default 0,
  completed_requests integer not null default 0,
  notes text
);

alter table public.data_retention_runs enable row level security;

create or replace function public.purge_due_deletion_requests(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_table record;
  v_due integer := 0;
  v_completed integer := 0;
  v_pass integer;
begin
  select count(*) into v_due
  from public.data_deletion_requests
  where status in ('requested', 'processing')
    and requested_at <= p_now - interval '30 days';

  for v_request in
    select id, owner_id
    from public.data_deletion_requests
    where status in ('requested', 'processing')
      and requested_at <= p_now - interval '30 days'
    order by requested_at asc
  loop
    update public.data_deletion_requests
      set status = 'processing'
      where id = v_request.id;

    -- Delete every student-owned table with an owner_id column. Three passes let
    -- FK-constrained child tables clear before parent rows without hardcoding the
    -- whole evolving schema order.
    for v_pass in 1..3 loop
      for v_table in
        select table_name
        from information_schema.columns
        where table_schema = 'public'
          and column_name = 'owner_id'
          and table_name <> 'data_deletion_requests'
        order by table_name asc
      loop
        begin
          execute format('delete from public.%I where owner_id = $1', v_table.table_name)
            using v_request.owner_id;
        exception when foreign_key_violation then
          null;
        end;
      end loop;
    end loop;

    delete from public.profiles where user_id = v_request.owner_id;

    update public.data_deletion_requests
      set status = 'completed',
          notes = concat_ws(' ', notes, 'COPPA data purge completed at', p_now::text)
      where id = v_request.id;

    v_completed := v_completed + 1;
  end loop;

  insert into public.data_retention_runs (due_requests, completed_requests, notes)
  values (v_due, v_completed, 'purge_due_deletion_requests');

  return v_completed;
end;
$$;

grant execute on function public.purge_due_deletion_requests(timestamptz) to service_role;
