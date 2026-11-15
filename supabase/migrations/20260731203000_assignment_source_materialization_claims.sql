-- Recoverable, owner-scoped claims for connected assignment source imports.

alter table public.assignment_sources
  add column if not exists materialization_claim_token uuid,
  add column if not exists materialization_claim_expires_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assignment_sources_materialization_claim_pair'
      and conrelid = 'public.assignment_sources'::regclass
  ) then
    alter table public.assignment_sources
      add constraint assignment_sources_materialization_claim_pair
      check (
        (materialization_claim_token is null)
        = (materialization_claim_expires_at is null)
      );
  end if;
end;
$$;

create index if not exists assignment_sources_materialization_candidates_idx
  on public.assignment_sources (
    assignment_id,
    owner_id,
    import_status,
    materialization_claim_expires_at,
    created_at
  )
  where source_type = 'attachment' and import_status in ('ready', 'partial', 'extracting', 'failed');

create or replace function public.claim_assignment_source_materializations(
  p_assignment_id uuid,
  p_claim_token uuid
)
returns setof public.assignment_sources
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or p_claim_token is null then
    return;
  end if;

  return query
  with candidates as (
    select source.id
    from public.assignment_sources source
    where source.assignment_id = p_assignment_id
      and source.owner_id = (select auth.uid())
      and source.source_type = 'attachment'
      and (
        (source.storage_key is null and source.import_status in ('ready', 'partial'))
        or (
          source.storage_key is not null
          and source.import_status in ('ready', 'partial', 'extracting', 'failed')
        )
      )
      and (
        source.materialization_claim_token is null
        or source.materialization_claim_token = p_claim_token
        or source.materialization_claim_expires_at <= clock_timestamp()
      )
      and exists (
        select 1
        from public.assignments assignment
        where assignment.id = source.assignment_id
          and assignment.owner_id = (select auth.uid())
      )
    order by source.created_at, source.id
    for update of source skip locked
  ), claimed as (
    update public.assignment_sources source
    set materialization_claim_token = p_claim_token,
        materialization_claim_expires_at = clock_timestamp() + interval '10 minutes',
        updated_at = clock_timestamp()
    from candidates
    where source.id = candidates.id
    returning source.*
  )
  select claimed.* from claimed;
end;
$$;

create or replace function public.renew_assignment_source_materialization_claim(
  p_assignment_id uuid,
  p_source_id uuid,
  p_claim_token uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or p_claim_token is null then
    return false;
  end if;

  update public.assignment_sources source
  set materialization_claim_expires_at = clock_timestamp() + interval '10 minutes',
      updated_at = clock_timestamp()
  where source.id = p_source_id
    and source.assignment_id = p_assignment_id
    and source.owner_id = (select auth.uid())
    and source.source_type = 'attachment'
    and source.import_status in ('ready', 'partial', 'extracting', 'failed')
    and source.materialization_claim_token = p_claim_token
    and source.materialization_claim_expires_at > clock_timestamp()
    and exists (
      select 1
      from public.assignments assignment
      where assignment.id = source.assignment_id
        and assignment.owner_id = (select auth.uid())
    );
  return found;
end;
$$;

revoke execute on function public.claim_assignment_source_materializations(uuid, uuid)
  from public, anon;
revoke execute on function public.renew_assignment_source_materialization_claim(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.claim_assignment_source_materializations(uuid, uuid)
  to authenticated;
grant execute on function public.renew_assignment_source_materialization_claim(uuid, uuid, uuid)
  to authenticated;
