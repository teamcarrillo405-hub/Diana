-- Durable, fail-closed account deletion. Storage and database deletion are
-- separate persisted phases so a database retry never re-creates or re-deletes
-- files after Storage API deletion has been verified.

create table public.account_deletion_manifest_versions (
  manifest_version integer primary key,
  owner_columns text[] not null,
  actor_columns text[] not null,
  public_table_exclusions text[] not null default '{}'::text[],
  storage_owner_columns text[] not null,
  storage_buckets text[] not null,
  created_at timestamptz not null default now(),
  check (manifest_version > 0),
  check (owner_columns @> array['owner_id', 'user_id', 'student_id']::text[]),
  check (actor_columns @> array['created_by', 'unlocked_by', 'confirmed_by', 'scored_by']::text[]),
  check (not owner_columns && actor_columns),
  check (storage_owner_columns @> array['owner_id']::text[]),
  check (cardinality(storage_buckets) > 0)
);

insert into public.account_deletion_manifest_versions (
  manifest_version,
  owner_columns,
  actor_columns,
  public_table_exclusions,
  storage_owner_columns,
  storage_buckets
)
values (
  1,
  array['owner_id', 'user_id', 'student_id']::text[],
  array[
    'updated_by',
    'verified_by',
    'created_by',
    'published_by',
    'decided_by',
    'unlocked_by',
    'signed_off_by',
    'confirmed_by',
    'scored_by',
    'changed_by',
    'approved_by'
  ]::text[],
  array['data_deletion_requests']::text[],
  array['owner_id', 'owner']::text[],
  array['note-docs', 'portfolio-evidence', 'note-audio', 'inbox-photos', 'assignment-media', 'assignment-submissions']::text[]
)
on conflict (manifest_version) do nothing;

-- Actor references are audit provenance, not ownership. Keep the authored
-- course, safety event, and grade evidence, but remove the raw auth identifier.
-- The timestamp/value checks remain authoritative after the actor is null.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select constraint_row.conrelid::regclass as table_name,
           constraint_row.conname
    from pg_constraint constraint_row
    where constraint_row.contype = 'c'
      and (
        (constraint_row.conrelid = 'public.organization_memberships'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%verified_by is not null%')
        or (constraint_row.conrelid = 'public.course_mode_courses'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%published_by is not null%')
        or (constraint_row.conrelid = 'public.safety_protocols'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%published_by is not null%')
        or (constraint_row.conrelid = 'public.practical_activity_sessions'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%signed_off_by is not null%')
        or (constraint_row.conrelid = 'public.assessment_blueprints'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%published_by is not null%')
        or (constraint_row.conrelid = 'public.assessment_attempts'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%confirmed_by is not null%')
        or (constraint_row.conrelid = 'public.course_mode_assignments'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%published_by is not null%')
        or (constraint_row.conrelid = 'public.course_grading_rules'::regclass
          and lower(pg_get_constraintdef(constraint_row.oid)) like '%approved_by is not null%')
      )
  loop
    execute format(
      'alter table %s drop constraint %I',
      v_constraint.table_name,
      v_constraint.conname
    );
  end loop;
end;
$$;

alter table public.organization_memberships
  add constraint organization_memberships_verification_evidence_check
  check (
    (verification_status = 'verified' and verified_at is not null)
    or verification_status <> 'verified'
  );
alter table public.course_mode_courses
  add constraint course_mode_courses_publication_evidence_check
  check ((status = 'published' and published_at is not null) or status <> 'published');
alter table public.safety_protocols
  add constraint safety_protocols_publication_evidence_check
  check ((status = 'published' and published_at is not null) or status <> 'published');
alter table public.practical_activity_sessions
  add constraint practical_activity_sessions_signoff_evidence_check
  check (
    (signed_off_at is null and signed_off_by is null)
    or signed_off_at is not null
  );
alter table public.assessment_blueprints
  add constraint assessment_blueprints_publication_evidence_check
  check ((status = 'published' and published_at is not null) or status <> 'published');
alter table public.assessment_attempts
  add constraint assessment_attempts_confirmation_evidence_check
  check (
    (status = 'confirmed' and confirmed_at is not null and final_score is not null)
    or status <> 'confirmed'
  );
alter table public.course_mode_assignments
  add constraint course_mode_assignments_publication_evidence_check
  check ((status = 'published' and published_at is not null) or status <> 'published');
alter table public.course_grading_rules
  add constraint course_grading_rules_approval_evidence_check
  check ((status = 'approved' and approved_at is not null) or status <> 'approved');

-- Convert every declared auth actor reference to nullable SET NULL semantics.
-- Fail the migration if a new direct auth.users reference is neither ownership
-- nor an explicitly classified actor column.
do $$
declare
  v_actor_columns text[];
  v_owner_columns text[];
  v_foreign_key record;
begin
  select actor_columns, owner_columns
  into strict v_actor_columns, v_owner_columns
  from public.account_deletion_manifest_versions
  where manifest_version = 1;

  if exists (
    select 1
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    join pg_attribute column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and namespace_row.nspname = 'public'
      and cardinality(constraint_row.conkey) = 1
      and column_row.attname <> all(v_owner_columns)
      and column_row.attname <> all(v_actor_columns)
  ) then
    raise exception 'unclassified public auth.users reference in account deletion manifest';
  end if;

  for v_foreign_key in
    select constraint_row.conrelid::regclass as table_name,
           constraint_row.conname,
           column_row.attname as column_name,
           constraint_row.condeferrable,
           constraint_row.condeferred
    from pg_constraint constraint_row
    join pg_class table_row on table_row.oid = constraint_row.conrelid
    join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
    join pg_attribute column_row
      on column_row.attrelid = constraint_row.conrelid
      and column_row.attnum = constraint_row.conkey[1]
    where constraint_row.contype = 'f'
      and constraint_row.confrelid = 'auth.users'::regclass
      and namespace_row.nspname = 'public'
      and cardinality(constraint_row.conkey) = 1
      and column_row.attname = any(v_actor_columns)
    order by constraint_row.conrelid::regclass::text, column_row.attname
  loop
    execute format(
      'alter table %s alter column %I drop not null',
      v_foreign_key.table_name,
      v_foreign_key.column_name
    );
    execute format(
      'alter table %s drop constraint %I',
      v_foreign_key.table_name,
      v_foreign_key.conname
    );
    execute format(
      'alter table %s add constraint %I foreign key (%I) references auth.users(id) on delete set null%s',
      v_foreign_key.table_name,
      v_foreign_key.conname,
      v_foreign_key.column_name,
      case
        when v_foreign_key.condeferrable and v_foreign_key.condeferred
          then ' deferrable initially deferred'
        when v_foreign_key.condeferrable then ' deferrable'
        else ''
      end
    );
  end loop;
end;
$$;

create table public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  request_digest text not null check (request_digest ~ '^[0-9a-f]{64}$'),
  manifest_version integer not null
    references public.account_deletion_manifest_versions(manifest_version),
  result text not null check (result in ('completed', 'residue', 'error')),
  phase text not null,
  attempted_at timestamptz not null,
  finished_at timestamptz not null,
  public_rows_deleted bigint not null default 0 check (public_rows_deleted >= 0),
  storage_objects_deleted bigint not null default 0 check (storage_objects_deleted >= 0),
  public_residue bigint check (public_residue is null or public_residue >= 0),
  storage_residue bigint check (storage_residue is null or storage_residue >= 0),
  auth_user_present boolean,
  failure_code text,
  check (
    (result = 'completed'
      and phase = 'completed'
      and public_residue = 0
      and storage_residue = 0
      and auth_user_present = false
      and failure_code is null)
    or
    (result <> 'completed' and failure_code is not null)
  )
);

create index account_deletion_audit_request_digest_idx
  on public.account_deletion_audit (request_digest, attempted_at desc);

alter table public.account_deletion_manifest_versions enable row level security;
alter table public.account_deletion_audit enable row level security;

revoke all on table public.account_deletion_manifest_versions
  from public, anon, authenticated;
revoke all on table public.account_deletion_audit
  from public, anon, authenticated;
grant select on table public.account_deletion_manifest_versions to service_role;
grant select, insert on table public.account_deletion_audit to service_role;

alter table public.data_deletion_requests
  add column if not exists purge_manifest_version integer
    references public.account_deletion_manifest_versions(manifest_version),
  add column if not exists purge_phase text not null default 'pending',
  add column if not exists purge_attempted_at timestamptz,
  add column if not exists purge_completed_at timestamptz,
  add column if not exists purge_failure_code text,
  add column if not exists storage_purge_verified_at timestamptz,
  add column if not exists storage_objects_deleted bigint not null default 0
    check (storage_objects_deleted >= 0),
  add column if not exists purge_claim_token uuid,
  add column if not exists purge_claim_expires_at timestamptz;

alter table public.data_deletion_requests
  drop constraint if exists data_deletion_requests_status_check;

alter table public.data_deletion_requests
  add constraint data_deletion_requests_status_check
  check (status in ('requested', 'processing', 'completed', 'cancelled'));

-- A launch-era "completed" row still retained auth.users and must be retried
-- under the new verified flow. Every migrated non-cancelled owner stays frozen.
update public.data_deletion_requests
set status = 'processing', purge_phase = 'pending'
where status = 'completed' and owner_id is not null;

update public.data_deletion_requests
set purge_phase = case when status = 'cancelled' then 'cancelled' else 'pending' end;

alter table public.data_deletion_requests
  add constraint data_deletion_requests_purge_phase_check
  check (purge_phase in (
    'pending',
    'claimed',
    'preflight_failed',
    'preflighted',
    'storage_failed',
    'storage_verified',
    'db_purge_failed',
    'completed',
    'cancelled'
  ));

alter table public.data_deletion_requests
  add constraint data_deletion_requests_freeze_state_check
  check (
    (status = 'completed' and purge_phase = 'completed' and owner_id is null)
    or (status = 'cancelled' and purge_phase = 'cancelled')
    or (status in ('requested', 'processing')
      and purge_phase not in ('completed', 'cancelled'))
  );

-- Keep one anonymized request row after auth deletion so completion remains
-- inspectable without retaining an account identifier or free-form notes.
alter table public.data_deletion_requests
  alter column owner_id drop not null;

alter table public.data_deletion_requests
  drop constraint if exists data_deletion_requests_owner_id_fkey;

alter table public.data_deletion_requests
  add constraint data_deletion_requests_owner_id_fkey
  foreign key (owner_id) references auth.users(id) on delete restrict;

alter table public.data_retention_runs
  add column if not exists manifest_version integer
    references public.account_deletion_manifest_versions(manifest_version),
  add column if not exists failed_requests integer not null default 0;

-- Owners can create and inspect requests, but cannot directly mutate a frozen
-- request into an unfrozen state. Cancellation is authorized by the RPC below.
revoke insert, update, delete on table public.data_deletion_requests from authenticated;
grant select on table public.data_deletion_requests to authenticated;
grant insert (owner_id, ai_disabled_at, export_offered, notes)
  on public.data_deletion_requests to authenticated;

create or replace function public.cancel_account_deletion_request(
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'authenticated owner required';
  end if;

  update public.data_deletion_requests
  set status = 'cancelled',
      purge_phase = 'cancelled',
      purge_failure_code = null,
      purge_claim_token = null,
      purge_claim_expires_at = null
  where id = p_request_id
    and owner_id = v_owner_id
    and status = 'requested'
    and purge_phase = 'pending'
    and purge_claim_token is null;

  return found;
end;
$$;

revoke execute on function public.cancel_account_deletion_request(uuid)
  from public, anon;
grant execute on function public.cancel_account_deletion_request(uuid)
  to authenticated;

create or replace function public.account_deletion_request_digest(
  p_request_id uuid,
  p_manifest_version integer
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      'diana-account-deletion:' || p_request_id::text
        || ':manifest:' || p_manifest_version::text,
      'sha256'
    ),
    'hex'
  )
$$;

create or replace function public.account_deletion_storage_residue(
  p_owner_id uuid,
  p_manifest_version integer
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manifest public.account_deletion_manifest_versions%rowtype;
  v_column text;
  v_predicate text := '(name = $1::text or name like ($1::text || ''/%''))';
  v_owner_column_count integer;
  v_residue bigint;
begin
  select * into strict v_manifest
  from public.account_deletion_manifest_versions
  where manifest_version = p_manifest_version;

  if to_regclass('storage.objects') is null then
    raise exception using errcode = 'P7002', message = 'storage.objects is required';
  end if;

  select count(*) into v_owner_column_count
  from information_schema.columns c
  where c.table_schema = 'storage'
    and c.table_name = 'objects'
    and c.column_name = any(v_manifest.storage_owner_columns);

  if v_owner_column_count = 0 then
    raise exception using errcode = 'P7006', message = 'storage owner metadata is required';
  end if;

  for v_column in
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'storage'
      and c.table_name = 'objects'
      and c.column_name = any(v_manifest.storage_owner_columns)
    order by array_position(v_manifest.storage_owner_columns, c.column_name)
  loop
    v_predicate := v_predicate || format(' or %I::text = $1::text', v_column);
  end loop;

  execute format('select count(*) from storage.objects where %s', v_predicate)
    into v_residue using p_owner_id;
  return v_residue;
end;
$$;

create or replace function public.account_deletion_delete_public_rows(
  p_owner_id uuid,
  p_request_id uuid,
  p_manifest_version integer
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manifest public.account_deletion_manifest_versions%rowtype;
  v_table record;
  v_predicate text;
  v_table_count integer;
  v_pass integer := 0;
  v_blocked integer;
  v_progress bigint;
  v_row_count bigint;
  v_deleted bigint := 0;
  v_anonymized bigint;
  v_previous_replication_role text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'account_deletion_delete_public_rows requires service_role';
  end if;

  select * into strict v_manifest
  from public.account_deletion_manifest_versions
  where manifest_version = p_manifest_version;

  delete from public.data_deletion_requests
  where owner_id = p_owner_id and id <> p_request_id;
  get diagnostics v_row_count = row_count;
  v_deleted := v_deleted + v_row_count;

  select count(distinct c.table_name) into v_table_count
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name = any(v_manifest.owner_columns)
    and not (c.table_name = any(v_manifest.public_table_exclusions));

  loop
    v_pass := v_pass + 1;
    v_blocked := 0;
    v_progress := 0;

    for v_table in
      select c.table_name,
        array_agg(c.column_name order by array_position(v_manifest.owner_columns, c.column_name)) as owner_columns
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.column_name = any(v_manifest.owner_columns)
        and not (c.table_name = any(v_manifest.public_table_exclusions))
      group by c.table_name
      order by c.table_name
    loop
      select string_agg(format('%I::text = $1::text', owner_column), ' or ')
      into v_predicate
      from unnest(v_table.owner_columns) as owner_column;

      begin
        execute format('delete from public.%I where %s', v_table.table_name, v_predicate)
          using p_owner_id;
        get diagnostics v_row_count = row_count;
        v_progress := v_progress + v_row_count;
        v_deleted := v_deleted + v_row_count;
      exception
        when foreign_key_violation then
          v_blocked := v_blocked + 1;
      end;
    end loop;

    exit when v_blocked = 0;
    if v_progress = 0 or v_pass > v_table_count + 1 then
      raise exception using
        errcode = '23503',
        message = 'account purge blocked by foreign key dependencies';
    end if;
  end loop;

  -- Course and audit rows belong to their course/student context, not to the
  -- staff actor. Null only declared auth actor references. Replica mode is
  -- transaction-local and prevents immutable business triggers from rejecting
  -- this narrow privacy operation; constraints and normal writes remain gated.
  v_previous_replication_role := current_setting('session_replication_role');
  begin
    perform set_config('session_replication_role', 'replica', true);
    for v_table in
      select constraint_row.conrelid::regclass as table_name,
             column_row.attname as actor_column
      from pg_constraint constraint_row
      join pg_class table_row on table_row.oid = constraint_row.conrelid
      join pg_namespace namespace_row on namespace_row.oid = table_row.relnamespace
      join pg_attribute column_row
        on column_row.attrelid = constraint_row.conrelid
        and column_row.attnum = constraint_row.conkey[1]
      where constraint_row.contype = 'f'
        and constraint_row.confrelid = 'auth.users'::regclass
        and namespace_row.nspname = 'public'
        and cardinality(constraint_row.conkey) = 1
        and column_row.attname = any(v_manifest.actor_columns)
      order by constraint_row.conrelid::regclass::text, column_row.attname
    loop
      execute format(
        'update %s set %I = null where %I = $1',
        v_table.table_name,
        v_table.actor_column,
        v_table.actor_column
      ) using p_owner_id;
      get diagnostics v_anonymized = row_count;
    end loop;
    perform set_config('session_replication_role', v_previous_replication_role, true);
  exception
    when others then
      perform set_config('session_replication_role', v_previous_replication_role, true);
      raise;
  end;

  return v_deleted;
end;
$$;

create or replace function public.account_deletion_public_residue(
  p_owner_id uuid,
  p_request_id uuid,
  p_manifest_version integer
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manifest public.account_deletion_manifest_versions%rowtype;
  v_table record;
  v_predicate text;
  v_row_count bigint;
  v_residue bigint;
begin
  select * into strict v_manifest
  from public.account_deletion_manifest_versions
  where manifest_version = p_manifest_version;

  select count(*) into v_residue
  from public.data_deletion_requests
  where owner_id = p_owner_id and id <> p_request_id;

  for v_table in
    select c.table_name,
      array_agg(
        c.column_name
        order by array_position(v_manifest.owner_columns || v_manifest.actor_columns, c.column_name)
      ) as reference_columns
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = any(v_manifest.owner_columns || v_manifest.actor_columns)
      and not (c.table_name = any(v_manifest.public_table_exclusions))
    group by c.table_name
    order by c.table_name
  loop
    select string_agg(format('%I::text = $1::text', owner_column), ' or ')
    into v_predicate
    from unnest(v_table.reference_columns) as owner_column;
    execute format('select count(*) from public.%I where %s', v_table.table_name, v_predicate)
      into v_row_count using p_owner_id;
    v_residue := v_residue + v_row_count;
  end loop;

  return v_residue;
end;
$$;

revoke execute on function public.account_deletion_request_digest(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.account_deletion_storage_residue(uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.account_deletion_delete_public_rows(uuid, uuid, integer)
  from public, anon, authenticated;
revoke execute on function public.account_deletion_public_residue(uuid, uuid, integer)
  from public, anon, authenticated;

create or replace function public.claim_account_deletion_request(
  p_request_id uuid,
  p_now timestamptz default now()
)
returns table (
  request_id uuid,
  owner_id uuid,
  purge_phase text,
  manifest_version integer,
  storage_buckets text[],
  storage_objects_deleted bigint,
  claim_token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_deletion_requests%rowtype;
  v_manifest public.account_deletion_manifest_versions%rowtype;
  v_token uuid := gen_random_uuid();
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'service_role required';
  end if;

  select request_row.* into v_request
  from public.data_deletion_requests request_row
  where request_row.id = p_request_id
    and request_row.owner_id is not null
    and request_row.status in ('requested', 'processing')
    and request_row.requested_at <= p_now - interval '30 days'
    and (
      request_row.purge_claim_expires_at is null
      or request_row.purge_claim_expires_at <= p_now
    )
  for update;

  if not found or not pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0)) then
    return;
  end if;

  if v_request.purge_manifest_version is null then
    select manifest_row.* into strict v_manifest
    from public.account_deletion_manifest_versions manifest_row
    order by manifest_row.manifest_version desc limit 1;
  else
    select manifest_row.* into strict v_manifest
    from public.account_deletion_manifest_versions manifest_row
    where manifest_row.manifest_version = v_request.purge_manifest_version;
  end if;

  update public.data_deletion_requests d
  set status = 'processing',
      purge_phase = case
        when d.purge_phase in ('storage_verified', 'db_purge_failed') then d.purge_phase
        else 'claimed'
      end,
      purge_manifest_version = v_manifest.manifest_version,
      purge_attempted_at = p_now,
      purge_completed_at = null,
      purge_failure_code = null,
      purge_claim_token = v_token,
      purge_claim_expires_at = p_now + interval '10 minutes'
  where d.id = p_request_id;

  return query
  select d.id, d.owner_id, d.purge_phase, d.purge_manifest_version,
    v_manifest.storage_buckets, d.storage_objects_deleted, d.purge_claim_token
  from public.data_deletion_requests d
  where d.id = p_request_id;
end;
$$;

create or replace function public.preflight_account_deletion_request(
  p_request_id uuid,
  p_claim_token uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_deletion_requests%rowtype;
  v_failure_code text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'service_role required';
  end if;

  select * into v_request
  from public.data_deletion_requests
  where id = p_request_id and purge_claim_token = p_claim_token
    and status = 'processing' and purge_phase = 'claimed'
  for update;
  if not found or not pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0)) then
    return false;
  end if;

  begin
    perform public.account_deletion_delete_public_rows(
      v_request.owner_id, v_request.id, v_request.purge_manifest_version
    );
    delete from public.data_deletion_requests where id = v_request.id;
    delete from auth.users where id = v_request.owner_id;
    if exists (select 1 from auth.users where id = v_request.owner_id) then
      raise exception using errcode = 'P7004', message = 'auth user residue verification failed';
    end if;
    -- Force rollback of the dry-run subtransaction after every delete succeeds.
    raise exception using errcode = 'P7099', message = 'account purge preflight rollback';
  exception
    when sqlstate 'P7099' then
      v_failure_code := null;
    when others then
      v_failure_code := sqlstate;
  end;

  if v_failure_code is not null then
    update public.data_deletion_requests
    set status = 'processing', purge_phase = 'preflight_failed',
        purge_failure_code = v_failure_code,
        purge_claim_token = null, purge_claim_expires_at = null
    where id = v_request.id;
    insert into public.account_deletion_audit (
      request_digest, manifest_version, result, phase, attempted_at, finished_at,
      auth_user_present, failure_code
    ) values (
      public.account_deletion_request_digest(v_request.id, v_request.purge_manifest_version),
      v_request.purge_manifest_version, 'error', 'preflight_failed', p_now, p_now,
      true, v_failure_code
    );
    return false;
  end if;

  update public.data_deletion_requests
  set purge_phase = 'preflighted', purge_failure_code = null
  where id = v_request.id and purge_claim_token = p_claim_token;
  return found;
end;
$$;

create or replace function public.fail_account_deletion_storage_phase(
  p_request_id uuid,
  p_claim_token uuid,
  p_failure_code text,
  p_storage_objects_deleted bigint default 0,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_deletion_requests%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'service_role required';
  end if;
  if p_failure_code is null or p_storage_objects_deleted < 0 then return false; end if;

  select * into v_request from public.data_deletion_requests
  where id = p_request_id and purge_claim_token = p_claim_token
    and status = 'processing' and purge_phase in ('claimed', 'preflighted')
  for update;
  if not found or not pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0)) then
    return false;
  end if;

  update public.data_deletion_requests
  set purge_phase = 'storage_failed', purge_failure_code = left(p_failure_code, 120),
      storage_purge_verified_at = null,
      storage_objects_deleted = storage_objects_deleted + p_storage_objects_deleted,
      purge_claim_token = null, purge_claim_expires_at = null
  where id = v_request.id;

  insert into public.account_deletion_audit (
    request_digest, manifest_version, result, phase, attempted_at, finished_at,
    storage_objects_deleted, auth_user_present, failure_code
  ) values (
    public.account_deletion_request_digest(v_request.id, v_request.purge_manifest_version),
    v_request.purge_manifest_version, 'error', 'storage_failed', p_now, p_now,
    p_storage_objects_deleted, true, left(p_failure_code, 120)
  );
  return true;
end;
$$;

create or replace function public.verify_account_deletion_storage(
  p_request_id uuid,
  p_claim_token uuid,
  p_storage_objects_deleted bigint default 0,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_deletion_requests%rowtype;
  v_residue bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'service_role required';
  end if;
  if p_storage_objects_deleted < 0 then return false; end if;

  select * into v_request from public.data_deletion_requests
  where id = p_request_id and purge_claim_token = p_claim_token
    and status = 'processing' and purge_phase = 'preflighted'
  for update;
  if not found or not pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0)) then
    return false;
  end if;

  v_residue := public.account_deletion_storage_residue(
    v_request.owner_id, v_request.purge_manifest_version
  );
  if v_residue <> 0 then
    update public.data_deletion_requests
    set purge_phase = 'storage_failed', purge_failure_code = 'storage_residue',
        storage_purge_verified_at = null,
        storage_objects_deleted = storage_objects_deleted + p_storage_objects_deleted,
        purge_claim_token = null, purge_claim_expires_at = null
    where id = v_request.id;
    insert into public.account_deletion_audit (
      request_digest, manifest_version, result, phase, attempted_at, finished_at,
      storage_objects_deleted, storage_residue, auth_user_present, failure_code
    ) values (
      public.account_deletion_request_digest(v_request.id, v_request.purge_manifest_version),
      v_request.purge_manifest_version, 'residue', 'storage_failed', p_now, p_now,
      p_storage_objects_deleted, v_residue, true, 'storage_residue'
    );
    return false;
  end if;

  update public.data_deletion_requests
  set purge_phase = 'storage_verified', storage_purge_verified_at = p_now,
      storage_objects_deleted = storage_objects_deleted + p_storage_objects_deleted,
      purge_failure_code = null
  where id = v_request.id and purge_claim_token = p_claim_token;
  return found;
end;
$$;

create or replace function public.purge_account_deletion_request(
  p_request_id uuid,
  p_claim_token uuid,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.data_deletion_requests%rowtype;
  v_public_deleted bigint := 0;
  v_public_residue bigint := 0;
  v_storage_residue bigint := 0;
  v_auth_user_present boolean := true;
  v_failure_code text;
  v_audit_result text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'service_role required';
  end if;

  select * into v_request from public.data_deletion_requests
  where id = p_request_id and purge_claim_token = p_claim_token
    and status = 'processing'
    and purge_phase in ('storage_verified', 'db_purge_failed')
    and storage_purge_verified_at is not null
  for update;
  if not found or not pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0)) then
    return false;
  end if;

  begin
    v_storage_residue := public.account_deletion_storage_residue(
      v_request.owner_id, v_request.purge_manifest_version
    );
    if v_storage_residue <> 0 then
      raise exception using errcode = 'P7001', message = 'storage residue verification failed';
    end if;

    v_public_deleted := public.account_deletion_delete_public_rows(
      v_request.owner_id, v_request.id, v_request.purge_manifest_version
    );
    v_public_residue := public.account_deletion_public_residue(
      v_request.owner_id, v_request.id, v_request.purge_manifest_version
    );
    if v_public_residue <> 0 then
      raise exception using errcode = 'P7001', message = 'public residue verification failed';
    end if;

    update public.data_deletion_requests
    set owner_id = null, notes = null, export_offered = false
    where id = v_request.id;
    if not found then
      raise exception using errcode = 'P7003', message = 'request anonymization failed';
    end if;

    delete from auth.users where id = v_request.owner_id;
    select exists(select 1 from auth.users where id = v_request.owner_id)
      into v_auth_user_present;
    if v_auth_user_present then
      raise exception using errcode = 'P7004', message = 'auth user residue verification failed';
    end if;

    update public.data_deletion_requests
    set status = 'completed', purge_phase = 'completed', purge_completed_at = p_now,
        purge_failure_code = null, purge_claim_token = null, purge_claim_expires_at = null
    where id = v_request.id and owner_id is null;
    if not found then
      raise exception using errcode = 'P7005', message = 'request completion failed';
    end if;

    insert into public.account_deletion_audit (
      request_digest, manifest_version, result, phase, attempted_at, finished_at,
      public_rows_deleted, storage_objects_deleted, public_residue, storage_residue,
      auth_user_present, failure_code
    ) values (
      public.account_deletion_request_digest(v_request.id, v_request.purge_manifest_version),
      v_request.purge_manifest_version, 'completed', 'completed', p_now, p_now,
      v_public_deleted, v_request.storage_objects_deleted, 0, 0, false, null
    );
  exception
    when others then
      v_failure_code := sqlstate;
  end;

  if v_failure_code is not null then
    v_audit_result := case when v_failure_code = 'P7001' then 'residue' else 'error' end;
    select exists(select 1 from auth.users where id = v_request.owner_id)
      into v_auth_user_present;
    update public.data_deletion_requests
    set status = 'processing',
        purge_phase = case when v_storage_residue <> 0 then 'storage_failed' else 'db_purge_failed' end,
        purge_failure_code = v_failure_code,
        storage_purge_verified_at = case
          when v_storage_residue <> 0 then null else storage_purge_verified_at
        end,
        purge_claim_token = null, purge_claim_expires_at = null
    where id = v_request.id;
    insert into public.account_deletion_audit (
      request_digest, manifest_version, result, phase, attempted_at, finished_at,
      storage_objects_deleted, public_residue, storage_residue, auth_user_present,
      failure_code
    ) values (
      public.account_deletion_request_digest(v_request.id, v_request.purge_manifest_version),
      v_request.purge_manifest_version, v_audit_result,
      case when v_storage_residue <> 0 then 'storage_failed' else 'db_purge_failed' end,
      p_now, p_now,
      v_request.storage_objects_deleted,
      case when v_audit_result = 'residue' then v_public_residue else null end,
      case when v_audit_result = 'residue' then v_storage_residue else null end,
      v_auth_user_present, v_failure_code
    );
    return false;
  end if;

  return true;
end;
$$;

-- Preserve the existing pg_cron-compatible signature as a DB-only retry
-- worker. It can finish requests only after Storage API verification succeeded.
create or replace function public.purge_due_deletion_requests(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request record;
  v_claim record;
  v_due integer;
  v_completed integer := 0;
  v_failed integer := 0;
  v_manifest_version integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'purge_due_deletion_requests requires service_role';
  end if;

  select max(manifest_version) into v_manifest_version
  from public.account_deletion_manifest_versions;
  select count(*) into v_due
  from public.data_deletion_requests
  where owner_id is not null and status in ('requested', 'processing')
    and requested_at <= p_now - interval '30 days';

  for v_request in
    select id from public.data_deletion_requests
    where owner_id is not null and status = 'processing'
      and purge_phase in ('storage_verified', 'db_purge_failed')
      and storage_purge_verified_at is not null
      and requested_at <= p_now - interval '30 days'
    order by requested_at asc
  loop
    v_claim := null;
    select * into v_claim
    from public.claim_account_deletion_request(v_request.id, p_now);
    if v_claim.request_id is not null then
      if public.purge_account_deletion_request(v_claim.request_id, v_claim.claim_token, p_now) then
        v_completed := v_completed + 1;
      else
        v_failed := v_failed + 1;
      end if;
    end if;
  end loop;

  insert into public.data_retention_runs (
    due_requests, completed_requests, failed_requests, manifest_version, notes
  ) values (
    v_due, v_completed, v_failed, v_manifest_version, 'purge_due_deletion_requests'
  );
  return v_completed;
end;
$$;

revoke execute on function public.claim_account_deletion_request(uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.preflight_account_deletion_request(uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.fail_account_deletion_storage_phase(uuid, uuid, text, bigint, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.verify_account_deletion_storage(uuid, uuid, bigint, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.purge_account_deletion_request(uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.purge_due_deletion_requests(timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_account_deletion_request(uuid, timestamptz)
  to service_role;
grant execute on function public.preflight_account_deletion_request(uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.fail_account_deletion_storage_phase(uuid, uuid, text, bigint, timestamptz)
  to service_role;
grant execute on function public.verify_account_deletion_storage(uuid, uuid, bigint, timestamptz)
  to service_role;
grant execute on function public.purge_account_deletion_request(uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.purge_due_deletion_requests(timestamptz)
  to service_role;
