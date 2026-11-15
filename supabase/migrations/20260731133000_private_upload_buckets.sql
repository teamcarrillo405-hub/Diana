-- Reproduce every student upload bucket and its owner boundary from source.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'note-docs',
    'note-docs',
    false,
    20971520,
    array[
      'application/pdf',
      'text/plain',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  ),
  (
    'note-audio',
    'note-audio',
    false,
    26214400,
    array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg']
  ),
  (
    'inbox-photos',
    'inbox-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'assignment-submissions',
    'assignment-submissions',
    false,
    20971520,
    array[
      'application/pdf',
      'text/plain',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  ),
  (
    'portfolio-evidence',
    'portfolio-evidence',
    false,
    20971520,
    array[
      'application/pdf',
      'text/plain',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
declare
  bucket_name text;
begin
  foreach bucket_name in array array['note-docs', 'note-audio', 'inbox-photos']
  loop
    execute format('drop policy if exists %I on storage.objects', bucket_name || '_owner_select');
    execute format('drop policy if exists %I on storage.objects', bucket_name || '_owner_insert');
    execute format('drop policy if exists %I on storage.objects', bucket_name || '_owner_update');
    execute format('drop policy if exists %I on storage.objects', bucket_name || '_owner_delete');

    execute format(
      'create policy %I on storage.objects for select to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      bucket_name || '_owner_select',
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      bucket_name || '_owner_insert',
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      bucket_name || '_owner_update',
      bucket_name,
      bucket_name
    );
    execute format(
      'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)',
      bucket_name || '_owner_delete',
      bucket_name
    );
  end loop;
end;
$$;

-- Finished assignment files are append-only. Authenticated owners may create and
-- read a unique object, but only the service role may remove it for retention.
drop policy if exists assignment_submissions_owner_select on storage.objects;
drop policy if exists assignment_submissions_owner_insert on storage.objects;
drop policy if exists assignment_submissions_owner_update on storage.objects;
drop policy if exists assignment_submissions_owner_delete on storage.objects;

create policy assignment_submissions_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy assignment_submissions_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignment-submissions'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Portfolio evidence is append-only for the same reason as a submission file:
-- once its digest is bound to a record, authenticated clients cannot replace or
-- delete the bytes. Retention uses the service role.
drop policy if exists portfolio_evidence_owner_select on storage.objects;
drop policy if exists portfolio_evidence_owner_insert on storage.objects;
drop policy if exists portfolio_evidence_owner_update on storage.objects;
drop policy if exists portfolio_evidence_owner_delete on storage.objects;

create policy portfolio_evidence_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'portfolio-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy portfolio_evidence_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.enforce_portfolio_item_evidence_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.storage_key is not null and (
      new.storage_bucket is distinct from 'portfolio-evidence'
      or new.mime_type is null
      or new.metadata -> 'uploadIntegrity' is null
    ) then
      raise exception 'portfolio evidence binding is incomplete';
    end if;
    return new;
  end if;

  if new.storage_bucket is distinct from old.storage_bucket
    or new.storage_key is distinct from old.storage_key
    or new.mime_type is distinct from old.mime_type
    or new.metadata -> 'uploadIntegrity' is distinct from old.metadata -> 'uploadIntegrity'
  then
    raise exception 'portfolio evidence binding is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists portfolio_item_evidence_binding on public.portfolio_items;
create trigger portfolio_item_evidence_binding
before insert or update on public.portfolio_items
for each row execute function public.enforce_portfolio_item_evidence_binding();

revoke all on function public.enforce_portfolio_item_evidence_binding() from public;

alter table public.assignment_submission_files
  add column if not exists storage_bucket text,
  add column if not exists storage_version uuid,
  add column if not exists canonical_mime_type text,
  add column if not exists sha256_digest text,
  add column if not exists integrity_status text,
  add column if not exists integrity_bound_at timestamptz;

-- The bytes for historical rows cannot be trusted or hashed from a SQL migration.
-- Preserve those rows for display, but require a fresh upload before forwarding.
update public.assignment_submission_files
set storage_bucket = coalesce(storage_bucket, 'note-docs'),
    integrity_status = 'legacy_unbound'
where integrity_status is null;

alter table public.assignment_submission_files
  alter column storage_bucket set default 'assignment-submissions',
  alter column integrity_status set default 'bound',
  alter column integrity_status set not null;

alter table public.assignment_submission_files
  drop constraint if exists assignment_submission_files_integrity_status_check,
  drop constraint if exists assignment_submission_files_bound_metadata_check,
  drop constraint if exists assignment_submission_files_bound_path_check;

alter table public.assignment_submission_files
  add constraint assignment_submission_files_integrity_status_check
    check (integrity_status in ('bound', 'legacy_unbound')),
  add constraint assignment_submission_files_bound_metadata_check
    check (
      integrity_status = 'legacy_unbound'
      or (
        storage_bucket = 'assignment-submissions'
        and storage_version is not null
        and canonical_mime_type is not null
        and canonical_mime_type = mime_type
        and sha256_digest ~ '^[0-9a-f]{64}$'
        and integrity_bound_at is not null
      )
    ),
  add constraint assignment_submission_files_bound_path_check
    check (
      integrity_status = 'legacy_unbound'
      or (
        split_part(storage_key, '/', 1) = owner_id::text
        and split_part(storage_key, '/', 2) = assignment_id::text
        and split_part(storage_key, '/', 3) = storage_version::text
        and array_length(string_to_array(storage_key, '/'), 1) = 4
      )
    );

create unique index if not exists assignment_submission_files_bound_object_idx
  on public.assignment_submission_files(storage_bucket, storage_key)
  where integrity_status = 'bound';

create unique index if not exists assignment_submission_files_bound_version_idx
  on public.assignment_submission_files(owner_id, storage_version)
  where integrity_status = 'bound';

do $$
begin
  if exists (
    select 1
    from public.assignment_submission_receipts
    where capability = 'upload_file'
      and submission_file_id is null
  ) then
    raise exception 'Upload submission receipts must retain their delivery file binding.';
  end if;
end;
$$;

alter table public.assignment_submission_receipts
  drop constraint if exists assignment_submission_receipts_submission_file_required,
  drop constraint if exists assignment_submission_receipts_submission_file_id_fkey;

alter table public.assignment_submission_receipts
  add constraint assignment_submission_receipts_submission_file_required
    check (capability <> 'upload_file' or submission_file_id is not null),
  add constraint assignment_submission_receipts_submission_file_id_fkey
    foreign key (submission_file_id)
    references public.assignment_submission_files(id)
    on delete no action
    deferrable initially immediate;

create or replace function public.enforce_assignment_submission_file_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if coalesce((select auth.role()), '') <> 'service_role' and new.integrity_status <> 'bound' then
      raise exception 'New delivery files must have an integrity binding.';
    end if;
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id
    or new.assignment_id is distinct from old.assignment_id
    or new.storage_bucket is distinct from old.storage_bucket
    or new.storage_key is distinct from old.storage_key
    or new.storage_version is distinct from old.storage_version
    or new.filename is distinct from old.filename
    or new.mime_type is distinct from old.mime_type
    or new.canonical_mime_type is distinct from old.canonical_mime_type
    or new.byte_size is distinct from old.byte_size
    or new.sha256_digest is distinct from old.sha256_digest
    or new.integrity_status is distinct from old.integrity_status
    or new.integrity_bound_at is distinct from old.integrity_bound_at then
    raise exception 'Delivery file bindings are immutable.';
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_submission_files_binding_immutable
  on public.assignment_submission_files;
create trigger assignment_submission_files_binding_immutable
before insert or update on public.assignment_submission_files
for each row execute function public.enforce_assignment_submission_file_binding();

create or replace function public.prevent_active_submission_file_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.role()) = 'authenticated' and exists (
    select 1
    from public.assignment_submission_receipts receipt
    where receipt.submission_file_id = old.id
      and receipt.owner_id = old.owner_id
      and receipt.status in ('prepared', 'confirmation_pending', 'submitted')
  ) then
    raise exception 'A delivery file with an active submission receipt cannot be deleted.'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_active_submission_file_delete() from public;
revoke all on function public.prevent_active_submission_file_delete() from anon;
revoke all on function public.prevent_active_submission_file_delete() from authenticated;

drop trigger if exists assignment_submission_files_prevent_active_delete
  on public.assignment_submission_files;
create trigger assignment_submission_files_prevent_active_delete
before delete on public.assignment_submission_files
for each row execute function public.prevent_active_submission_file_delete();

create or replace function public.enforce_submission_receipt_file_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    new.assignment_id is distinct from old.assignment_id
    or new.owner_id is distinct from old.owner_id
    or new.provider is distinct from old.provider
    or new.capability is distinct from old.capability
    or new.idempotency_key is distinct from old.idempotency_key
    or new.submission_file_id is distinct from old.submission_file_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Submission receipt identity and file binding are immutable.';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'submitted'
    and new is distinct from old then
    raise exception 'Submitted receipt metadata is immutable.';
  end if;

  if new.capability = 'upload_file' and new.submission_file_id is null then
    raise exception 'Upload submission receipts require a delivery file.';
  end if;

  if new.submission_file_id is not null and not exists (
    select 1
    from public.assignment_submission_files file
    where file.id = new.submission_file_id
      and file.assignment_id = new.assignment_id
      and file.owner_id = new.owner_id
      and file.integrity_status = 'bound'
      and file.storage_bucket = 'assignment-submissions'
      and file.storage_version is not null
      and file.sha256_digest is not null
  ) then
    raise exception 'Delivery file is not integrity-bound to this assignment.';
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_submission_receipts_bound_file
  on public.assignment_submission_receipts;
create trigger assignment_submission_receipts_bound_file
before insert or update
on public.assignment_submission_receipts
for each row execute function public.enforce_submission_receipt_file_binding();

create or replace function public.claim_assignment_submission(
  p_assignment_id uuid,
  p_provider text,
  p_capability text,
  p_idempotency_key uuid,
  p_submission_file_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_assignment_status text;
  v_assignment_provider text;
  v_receipt public.assignment_submission_receipts%rowtype;
begin
  if v_owner_id is null then
    raise exception 'Not signed in.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_assignment_id::text || ':' || p_provider, 0));

  select status, external_source
    into v_assignment_status, v_assignment_provider
  from public.assignments
  where id = p_assignment_id
    and owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'Assignment not found.';
  end if;

  if v_assignment_provider is distinct from p_provider then
    raise exception 'Submission provider does not match this assignment.';
  end if;

  if p_capability not in ('submit_text', 'upload_file') then
    raise exception 'Unsupported submission capability.';
  end if;

  if p_capability = 'upload_file' then
    perform 1
    from public.assignment_submission_files file
    where file.id = p_submission_file_id
      and file.assignment_id = p_assignment_id
      and file.owner_id = v_owner_id
      and file.integrity_status = 'bound'
      and file.storage_bucket = 'assignment-submissions'
      and file.storage_version is not null
      and file.sha256_digest is not null
    for key share;

    if not found then
      raise exception 'Delivery file is not available for this assignment.';
    end if;
  elsif p_submission_file_id is not null then
    raise exception 'Text submissions cannot claim a delivery file.';
  end if;

  select *
    into v_receipt
  from public.assignment_submission_receipts
  where owner_id = v_owner_id
    and idempotency_key = p_idempotency_key;

  if found then
    if v_receipt.assignment_id <> p_assignment_id
      or v_receipt.provider <> p_provider
      or v_receipt.capability <> p_capability
      or v_receipt.submission_file_id is distinct from p_submission_file_id then
      raise exception 'Idempotency key was already used for a different submission.';
    end if;
    return jsonb_build_object(
      'receipt_id', v_receipt.id,
      'status', v_receipt.status,
      'claimed', false,
      'detail', v_receipt.detail
    );
  end if;

  select *
    into v_receipt
  from public.assignment_submission_receipts
  where assignment_id = p_assignment_id
    and owner_id = v_owner_id
    and provider = p_provider
    and status in ('prepared', 'confirmation_pending', 'submitted')
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object(
      'receipt_id', v_receipt.id,
      'status', v_receipt.status,
      'claimed', false,
      'detail', v_receipt.detail
    );
  end if;

  if v_assignment_status <> 'exporting' then
    raise exception 'Open the submission review before sending this assignment.';
  end if;

  if exists (
    select 1
    from public.submission_checklist
    where assignment_id = p_assignment_id
      and owner_id = v_owner_id
      and required
      and not checked
  ) then
    raise exception 'Check each required item before sending this assignment.';
  end if;

  insert into public.assignment_submission_receipts (
    assignment_id,
    owner_id,
    provider,
    capability,
    idempotency_key,
    submission_file_id,
    status,
    detail
  )
  values (
    p_assignment_id,
    v_owner_id,
    p_provider,
    p_capability,
    p_idempotency_key,
    p_submission_file_id,
    'prepared',
    'Submission prepared after student confirmation.'
  )
  returning * into v_receipt;

  return jsonb_build_object(
    'receipt_id', v_receipt.id,
    'status', v_receipt.status,
    'claimed', true,
    'detail', v_receipt.detail
  );
end;
$$;

revoke all on function public.claim_assignment_submission(uuid, text, text, uuid, uuid)
  from public;
grant execute on function public.claim_assignment_submission(uuid, text, text, uuid, uuid)
  to authenticated;
