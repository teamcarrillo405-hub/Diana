-- Enforce canonical artifact invariants at the table boundary so direct REST
-- writes cannot bypass the save_assignment_artifact_block RPC checks.

begin;

-- Authenticated clients retain owner-scoped reads, but all writes go through
-- the canonical RPC so version, revision, and authorship updates stay atomic.
-- Do not install immutable write triggers over legacy documents that the new
-- canonical RPC could never update. Failing closed preserves the original
-- work for a deliberate export/remediation instead of silently truncating it.
lock table public.artifact_documents in access exclusive mode;
lock table public.artifact_blocks in access exclusive mode;
lock table public.artifact_revisions in access exclusive mode;

do $$
declare
  v_document_id uuid;
begin
  select document.id
    into v_document_id
  from public.artifact_documents document
  where nullif(trim(document.artifact_type), '') is null
    or length(document.artifact_type) > 100
    or not exists (
      select 1
      from public.assignments assignment
      where assignment.id = document.assignment_id
        and assignment.owner_id = document.owner_id
    )
  limit 1;

  if found then
    raise exception 'Existing artifact document % violates the canonical document contract. Export and remediate it before applying this migration.', v_document_id
      using errcode = 'check_violation';
  end if;

  select block.document_id
    into v_document_id
  from public.artifact_blocks block
  where not exists (
      select 1
      from public.artifact_documents document
      where document.id = block.document_id
        and document.assignment_id = block.assignment_id
        and document.owner_id = block.owner_id
    )
    or not exists (
      select 1
      from public.assignments assignment
      where assignment.id = block.assignment_id
        and assignment.owner_id = block.owner_id
    )
    or nullif(trim(block.block_key), '') is null
    or nullif(trim(block.block_type), '') is null
    or nullif(trim(block.capability), '') is null
    or nullif(trim(block.label), '') is null
    or length(block.block_key) > 120
    or length(block.block_type) > 100
    or length(block.capability) > 100
    or length(block.label) > 300
    or block.position < 0
    or block.position > 1000
    or jsonb_typeof(block.content) is distinct from 'object'
    or octet_length(convert_to(block.content::text, 'UTF8')) > 2000000
    or octet_length(convert_to(coalesce(block.plain_text, ''), 'UTF8')) > 1000000
    or jsonb_typeof(block.source_anchors) is distinct from 'array'
    or case
      when jsonb_typeof(block.source_anchors) = 'array'
        then jsonb_array_length(block.source_anchors) > 12
      else true
    end
    or octet_length(convert_to(coalesce(block.source_anchors::text, ''), 'UTF8')) > 16384
    or case
      when jsonb_typeof(block.source_anchors) = 'array' then exists (
        select 1
        from jsonb_array_elements(block.source_anchors) as anchor(value)
        where jsonb_typeof(anchor.value) <> 'object'
          or not (anchor.value ? 'sourceId')
          or jsonb_typeof(anchor.value -> 'sourceId') <> 'string'
          or (anchor.value ->> 'sourceId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or (
            anchor.value ? 'location'
            and jsonb_typeof(anchor.value -> 'location') not in ('string', 'null')
          )
          or octet_length(convert_to(coalesce(anchor.value ->> 'location', ''), 'UTF8')) > 500
          or not exists (
            select 1
            from public.assignment_sources source
            where source.id::text = lower(anchor.value ->> 'sourceId')
              and source.assignment_id = block.assignment_id
              and source.owner_id = block.owner_id
          )
      )
      else false
    end
  limit 1;

  if found then
    raise exception 'Existing artifact document % exceeds the beta persistence contract. Export and remediate it before applying this migration.', v_document_id
      using errcode = 'check_violation';
  end if;

  select oversized.document_id
    into v_document_id
  from (
    select block.document_id
    from public.artifact_blocks block
    group by block.document_id
    having count(*) > 64
      or coalesce(sum(
        octet_length(convert_to(block.content::text, 'UTF8'))
        + octet_length(convert_to(coalesce(block.plain_text, ''), 'UTF8'))
        + octet_length(convert_to(block.source_anchors::text, 'UTF8'))
      ), 0) > 8000000
  ) oversized
  limit 1;

  if found then
    raise exception 'Existing artifact document % exceeds the beta aggregate persistence limit. Export and remediate it before applying this migration.', v_document_id
      using errcode = 'check_violation';
  end if;

  select revision.document_id
    into v_document_id
  from public.artifact_revisions revision
  where not exists (
    select 1
    from public.artifact_blocks block
    where block.id = revision.block_id
      and block.document_id = revision.document_id
      and block.assignment_id = revision.assignment_id
      and block.owner_id = revision.owner_id
  )
  limit 1;

  if found then
    raise exception 'Existing artifact document % has revision ownership that cannot be repaired by the canonical RPC. Export and remediate it before applying this migration.', v_document_id
      using errcode = 'check_violation';
  end if;

  select oversized.document_id
    into v_document_id
  from (
    select revision.document_id
    from public.artifact_revisions revision
    group by revision.document_id
    having coalesce(sum(
      octet_length(convert_to(revision.content::text, 'UTF8'))
      + octet_length(convert_to(coalesce(revision.plain_text, ''), 'UTF8'))
      + octet_length(convert_to(revision.source_anchors::text, 'UTF8'))
    ), 0) > 8000000
  ) oversized
  limit 1;

  if found then
    raise exception 'Existing artifact document % exceeds the document revision history limit. Export and remediate it before applying this migration.', v_document_id
      using errcode = 'check_violation';
  end if;
end;
$$;

alter function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) security definer;

alter function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) set search_path = public, pg_temp;

revoke all on function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) from public, anon, authenticated;

grant execute on function public.save_assignment_artifact_block(
  uuid, text, text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;

revoke insert, update, delete, truncate
  on table public.artifact_documents
  from public, anon, authenticated;
revoke insert, update, delete, truncate
  on table public.artifact_blocks
  from public, anon, authenticated;
revoke insert, update, delete, truncate
  on table public.artifact_revisions
  from public, anon, authenticated;

grant select on table public.artifact_documents to authenticated;
grant select on table public.artifact_blocks to authenticated;
grant select on table public.artifact_revisions to authenticated;

drop policy if exists artifact_documents_owner_insert on public.artifact_documents;
drop policy if exists artifact_documents_owner_update on public.artifact_documents;
drop policy if exists artifact_documents_owner_delete on public.artifact_documents;
drop policy if exists artifact_blocks_owner_insert on public.artifact_blocks;
drop policy if exists artifact_blocks_owner_update on public.artifact_blocks;
drop policy if exists artifact_blocks_owner_delete on public.artifact_blocks;
drop policy if exists artifact_revisions_owner_insert on public.artifact_revisions;

create or replace function public.enforce_artifact_document_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and (
    new.assignment_id is distinct from old.assignment_id
    or new.owner_id is distinct from old.owner_id
  ) then
    raise exception 'Artifact document ownership is immutable.'
      using errcode = 'check_violation';
  end if;

  if nullif(trim(new.artifact_type), '') is null
    or length(new.artifact_type) > 100 then
    raise exception 'Artifact document type is not valid.'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.assignments assignment
    where assignment.id = new.assignment_id
      and assignment.owner_id = new.owner_id
  ) then
    raise exception 'Artifact document does not belong to the assignment owner.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_artifact_document_invariants()
  from public, anon, authenticated;

drop trigger if exists enforce_artifact_document_invariants
  on public.artifact_documents;
create trigger enforce_artifact_document_invariants
before insert or update on public.artifact_documents
for each row execute function public.enforce_artifact_document_invariants();

create or replace function public.enforce_artifact_block_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_document_assignment_id uuid;
  v_document_owner_id uuid;
  v_existing_bytes bigint := 0;
  v_new_bytes bigint := 0;
begin
  if tg_op = 'UPDATE' and (
    new.document_id is distinct from old.document_id
    or new.assignment_id is distinct from old.assignment_id
    or new.owner_id is distinct from old.owner_id
  ) then
    raise exception 'Artifact block ownership is immutable.'
      using errcode = 'check_violation';
  end if;

  -- The document lock serializes count and aggregate-byte checks for writes to
  -- the one document allowed per assignment owner.
  select document.assignment_id, document.owner_id
    into v_document_assignment_id, v_document_owner_id
  from public.artifact_documents document
  where document.id = new.document_id
  for update;

  if not found
    or v_document_assignment_id is distinct from new.assignment_id
    or v_document_owner_id is distinct from new.owner_id then
    raise exception 'Artifact block does not match its document.'
      using errcode = 'check_violation';
  end if;

  if not exists (
    select 1
    from public.assignments assignment
    where assignment.id = new.assignment_id
      and assignment.owner_id = new.owner_id
  ) then
    raise exception 'Artifact block does not belong to the assignment owner.'
      using errcode = 'check_violation';
  end if;

  if nullif(trim(new.block_key), '') is null
    or nullif(trim(new.block_type), '') is null
    or nullif(trim(new.capability), '') is null
    or nullif(trim(new.label), '') is null
    or length(new.block_key) > 120
    or length(new.block_type) > 100
    or length(new.capability) > 100
    or length(new.label) > 300
    or new.position < 0
    or new.position > 1000
    or new.content is null
    or new.source_anchors is null
    or jsonb_typeof(new.content) <> 'object'
    or jsonb_typeof(new.source_anchors) <> 'array'
    or octet_length(convert_to(new.content::text, 'UTF8')) > 2000000
    or octet_length(convert_to(coalesce(new.plain_text, ''), 'UTF8')) > 1000000 then
    raise exception 'Artifact block is not valid.'
      using errcode = 'check_violation';
  end if;

  if jsonb_array_length(new.source_anchors) > 12
    or octet_length(convert_to(new.source_anchors::text, 'UTF8')) > 16384 then
    raise exception 'Artifact source anchors exceed their persistence limits.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.source_anchors) as anchor(value)
    where jsonb_typeof(anchor.value) <> 'object'
      or not (anchor.value ? 'sourceId')
      or jsonb_typeof(anchor.value -> 'sourceId') <> 'string'
      or (anchor.value ->> 'sourceId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (
        anchor.value ? 'location'
        and jsonb_typeof(anchor.value -> 'location') not in ('string', 'null')
      )
      or octet_length(convert_to(coalesce(anchor.value ->> 'location', ''), 'UTF8')) > 500
  ) then
    raise exception 'Artifact source anchors are not valid.'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(new.source_anchors) as anchor(value)
    where not exists (
      select 1
      from public.assignment_sources source
      where source.id::text = lower(anchor.value ->> 'sourceId')
        and source.assignment_id = new.assignment_id
        and source.owner_id = new.owner_id
    )
  ) then
    raise exception 'Artifact source anchor does not belong to this assignment.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'INSERT' and (
    select count(*)
    from public.artifact_blocks block
    where block.document_id = new.document_id
      and block.owner_id = new.owner_id
  ) >= 64 then
    raise exception 'Assignment artifact block limit reached.'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(sum(
      octet_length(convert_to(block.content::text, 'UTF8'))
      + octet_length(convert_to(block.plain_text, 'UTF8'))
      + octet_length(convert_to(block.source_anchors::text, 'UTF8'))
    ), 0)
      into v_existing_bytes
    from public.artifact_blocks block
    where block.document_id = new.document_id
      and block.owner_id = new.owner_id
      and block.id <> old.id;
  else
    select coalesce(sum(
      octet_length(convert_to(block.content::text, 'UTF8'))
      + octet_length(convert_to(block.plain_text, 'UTF8'))
      + octet_length(convert_to(block.source_anchors::text, 'UTF8'))
    ), 0)
      into v_existing_bytes
    from public.artifact_blocks block
    where block.document_id = new.document_id
      and block.owner_id = new.owner_id;
  end if;

  v_new_bytes :=
    octet_length(convert_to(new.content::text, 'UTF8'))
    + octet_length(convert_to(coalesce(new.plain_text, ''), 'UTF8'))
    + octet_length(convert_to(new.source_anchors::text, 'UTF8'));

  if v_existing_bytes + v_new_bytes > 8000000 then
    raise exception 'Assignment artifact payload exceeds the aggregate persistence limit.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_artifact_block_invariants()
  from public, anon, authenticated;

drop trigger if exists enforce_artifact_block_invariants
  on public.artifact_blocks;
create trigger enforce_artifact_block_invariants
before insert or update on public.artifact_blocks
for each row execute function public.enforce_artifact_block_invariants();

create or replace function public.enforce_artifact_revision_invariants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_block public.artifact_blocks%rowtype;
begin
  select *
    into v_block
  from public.artifact_blocks block
  where block.id = new.block_id;

  if not found
    or new.document_id is distinct from v_block.document_id
    or new.assignment_id is distinct from v_block.assignment_id
    or new.owner_id is distinct from v_block.owner_id
    or new.version is distinct from v_block.version
    or new.content is distinct from v_block.content
    or new.plain_text is distinct from v_block.plain_text
    or new.source_anchors is distinct from v_block.source_anchors then
    raise exception 'Artifact revision must exactly snapshot its current block.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_artifact_revision_invariants()
  from public, anon, authenticated;

drop trigger if exists enforce_artifact_revision_invariants
  on public.artifact_revisions;
create trigger enforce_artifact_revision_invariants
before insert or update on public.artifact_revisions
for each row execute function public.enforce_artifact_revision_invariants();

create or replace function public.prune_artifact_revision_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Serialize pruning with every save for this document.
  perform 1
  from public.artifact_documents document
  where document.id = new.document_id
  for update;

  with ranked_revisions as (
    select
      revision.id,
      row_number() over (
        partition by revision.block_id
        order by revision.version desc, revision.id desc
      ) as block_recency_rank,
      sum(
        octet_length(convert_to(revision.content::text, 'UTF8'))
        + octet_length(convert_to(coalesce(revision.plain_text, ''), 'UTF8'))
        + octet_length(convert_to(revision.source_anchors::text, 'UTF8'))
      ) over (
        order by revision.created_at desc, revision.id desc
        rows between unbounded preceding and current row
      ) as document_cumulative_bytes
    from public.artifact_revisions revision
    where revision.document_id = new.document_id
  )
  delete from public.artifact_revisions revision
  using ranked_revisions ranked
  where revision.id = ranked.id
    and (
      ranked.block_recency_rank > 50
      or ranked.document_cumulative_bytes > 8000000
    );

  return null;
end;
$$;

revoke execute on function public.prune_artifact_revision_history()
  from public, anon, authenticated;

drop trigger if exists prune_artifact_revision_history
  on public.artifact_revisions;
create trigger prune_artifact_revision_history
after insert on public.artifact_revisions
for each row execute function public.prune_artifact_revision_history();

commit;
