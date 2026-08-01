-- Bind private upload rows to their owner paths and stage direct assignment
-- media uploads until the server verifies the stored object.

create table if not exists public.assignment_media_uploads (
  id uuid primary key,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_kind text not null check (media_kind in ('audio', 'video')),
  storage_key text not null unique,
  file_name text not null check (length(file_name) between 1 and 500),
  declared_mime_type text not null,
  declared_size_bytes bigint not null check (declared_size_bytes > 0 and declared_size_bytes <= 262144000),
  consent_confirmed_at timestamptz not null,
  claimed_at timestamptz,
  claim_token uuid,
  claim_expires_at timestamptz,
  claim_epoch bigint not null default 0,
  durable_storage_key text,
  finalized_at timestamptz,
  discarded_at timestamptz,
  cleanup_requested_at timestamptz,
  temporary_removed_at timestamptz,
  durable_removed_at timestamptz,
  cleanup_attempts integer not null default 0 check (cleanup_attempts between 0 and 12),
  cleanup_next_attempt_at timestamptz not null default now(),
  cleanup_last_error text,
  cleanup_state text not null default 'pending' check (cleanup_state in ('pending', 'retry', 'dead_lettered', 'completed')),
  cleanup_completed_at timestamptz,
  cleanup_dead_lettered_at timestamptz,
  cleanup_dead_letter_error_code text,
  signed_upload_expires_at timestamptz,
  token_issuance_failed_at timestamptz,
  cleanup_quiescence_not_before timestamptz,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  check (storage_key = owner_id::text || '/' || assignment_id::text || '/' || id::text || '.' || split_part(storage_key, '.', -1))
);

alter table public.assignment_media_uploads
  add column if not exists claimed_at timestamptz,
  add column if not exists claim_token uuid,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists claim_epoch bigint not null default 0,
  add column if not exists durable_storage_key text,
  add column if not exists finalized_at timestamptz,
  add column if not exists discarded_at timestamptz,
  add column if not exists cleanup_requested_at timestamptz,
  add column if not exists temporary_removed_at timestamptz,
  add column if not exists durable_removed_at timestamptz,
  add column if not exists cleanup_attempts integer not null default 0,
  add column if not exists cleanup_next_attempt_at timestamptz not null default now(),
  add column if not exists cleanup_last_error text,
  add column if not exists cleanup_state text not null default 'pending',
  add column if not exists cleanup_completed_at timestamptz,
  add column if not exists cleanup_dead_lettered_at timestamptz,
  add column if not exists cleanup_dead_letter_error_code text,
  add column if not exists signed_upload_expires_at timestamptz,
  add column if not exists token_issuance_failed_at timestamptz,
  add column if not exists cleanup_quiescence_not_before timestamptz;

alter table public.assignment_media_uploads
  drop constraint if exists assignment_media_uploads_cleanup_state_check;
alter table public.assignment_media_uploads
  add constraint assignment_media_uploads_cleanup_state_check
  check (cleanup_state in ('pending', 'retry', 'dead_lettered', 'completed'));

update public.assignment_media_uploads
set cleanup_state = 'dead_lettered',
    cleanup_completed_at = null,
    cleanup_dead_lettered_at = coalesce(
      cleanup_dead_lettered_at,
      cleanup_requested_at,
      created_at,
      clock_timestamp()
    ),
    cleanup_dead_letter_error_code = coalesce(
      cleanup_dead_letter_error_code,
      cleanup_last_error,
      'cleanup_attempts_exhausted'
    )
where cleanup_attempts >= 12;

update public.assignment_media_uploads
set cleanup_dead_lettered_at = null,
    cleanup_dead_letter_error_code = null
where cleanup_state <> 'dead_lettered';

update public.assignment_media_uploads
set cleanup_completed_at = null
where cleanup_state <> 'completed';

alter table public.assignment_media_uploads
  drop constraint if exists assignment_media_uploads_dead_letter_state_check;
alter table public.assignment_media_uploads
  add constraint assignment_media_uploads_dead_letter_state_check
  check (
    (
      cleanup_state = 'dead_lettered'
      and cleanup_attempts = 12
      and cleanup_dead_lettered_at is not null
      and nullif(cleanup_dead_letter_error_code, '') is not null
    )
    or (
      cleanup_state <> 'dead_lettered'
      and cleanup_dead_lettered_at is null
      and cleanup_dead_letter_error_code is null
    )
  );

alter table public.assignment_media_uploads
  drop constraint if exists assignment_media_uploads_completed_state_check;
alter table public.assignment_media_uploads
  add constraint assignment_media_uploads_completed_state_check
  check (
    (cleanup_state = 'completed' and cleanup_completed_at is not null)
    or (cleanup_state <> 'completed' and cleanup_completed_at is null)
  );

create table if not exists public.assignment_media_upload_candidates (
  upload_id uuid not null references public.assignment_media_uploads(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  claim_epoch bigint not null check (claim_epoch > 0),
  claim_token uuid not null,
  storage_key text not null unique,
  lease_expires_at timestamptz not null,
  promoted_at timestamptz,
  cleanup_requested_at timestamptz,
  cleanup_started_at timestamptz,
  cleanup_claim_token uuid,
  cleanup_claim_expires_at timestamptz,
  cleanup_dead_lettered_at timestamptz,
  removed_at timestamptz,
  last_absence_confirmed_at timestamptz,
  quiescence_not_before timestamptz not null,
  closed_at timestamptz,
  cleanup_attempts integer not null default 0 check (cleanup_attempts between 0 and 12),
  cleanup_next_attempt_at timestamptz not null,
  cleanup_last_error text,
  created_at timestamptz not null default now(),
  primary key (upload_id, claim_epoch),
  unique (upload_id, claim_token),
  check ((cleanup_claim_token is null) = (cleanup_claim_expires_at is null)),
  check (
    storage_key like owner_id::text || '/' || assignment_id::text ||
      '/durable-e' || claim_epoch::text || '-%'
  )
);

alter table public.assignment_media_upload_candidates
  add column if not exists cleanup_started_at timestamptz,
  add column if not exists cleanup_claim_token uuid,
  add column if not exists cleanup_claim_expires_at timestamptz,
  add column if not exists cleanup_dead_lettered_at timestamptz,
  add column if not exists last_absence_confirmed_at timestamptz,
  add column if not exists quiescence_not_before timestamptz,
  add column if not exists closed_at timestamptz;

-- Production liveness bound: a verifier can execute for at most 15 minutes.
-- The 10-minute margin covers scheduler delay and clock skew. Candidate and
-- tombstone identity therefore remain live for 25 minutes beyond the signed
-- upload-token fence, and terminal closure requires an absence confirmation
-- after that deadline.
update public.assignment_media_upload_candidates candidate
set quiescence_not_before = greatest(
      candidate.lease_expires_at,
      coalesce(upload.signed_upload_expires_at, upload.expires_at)
    ) + interval '25 minutes'
from public.assignment_media_uploads upload
where upload.id = candidate.upload_id
  and candidate.quiescence_not_before is null;

alter table public.assignment_media_upload_candidates
  alter column quiescence_not_before set not null;

drop index if exists public.assignment_media_upload_candidates_cleanup_idx;
create index assignment_media_upload_candidates_cleanup_idx
  on public.assignment_media_upload_candidates (cleanup_next_attempt_at, upload_id, claim_epoch)
  where promoted_at is null
    and closed_at is null
    and cleanup_dead_lettered_at is null;

create or replace function public.prevent_assignment_media_candidate_identity_change()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.upload_id is distinct from old.upload_id
    or new.assignment_id is distinct from old.assignment_id
    or new.owner_id is distinct from old.owner_id
    or new.claim_epoch is distinct from old.claim_epoch
    or new.claim_token is distinct from old.claim_token
    or new.storage_key is distinct from old.storage_key
    or new.created_at is distinct from old.created_at then
    raise exception 'upload candidate identity is immutable' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_media_candidate_identity_immutable
  on public.assignment_media_upload_candidates;
create trigger assignment_media_candidate_identity_immutable
before update on public.assignment_media_upload_candidates
for each row execute function public.prevent_assignment_media_candidate_identity_change();

alter table public.assignment_media_upload_candidates enable row level security;
revoke all on table public.assignment_media_upload_candidates from anon, authenticated;
grant select, insert, update, delete on table public.assignment_media_upload_candidates to service_role;
revoke execute on function public.prevent_assignment_media_candidate_identity_change()
  from public, anon, authenticated;

alter table public.media_assets
  add column if not exists upload_intent_id uuid;

create unique index if not exists media_assets_upload_intent_idx
  on public.media_assets (upload_intent_id)
  where upload_intent_id is not null;

create index if not exists assignment_media_uploads_expiry_idx
  on public.assignment_media_uploads (expires_at, id);

drop index if exists public.assignment_media_uploads_cleanup_idx;
create index assignment_media_uploads_cleanup_idx
  on public.assignment_media_uploads (cleanup_next_attempt_at, id)
  where cleanup_state in ('pending', 'retry')
    and (
      finalized_at is not null
      or discarded_at is not null
      or claim_token is not null
    );

alter table public.assignment_media_uploads enable row level security;

drop policy if exists assignment_media_uploads_owner_select on public.assignment_media_uploads;
drop policy if exists assignment_media_uploads_owner_insert on public.assignment_media_uploads;
drop policy if exists assignment_media_uploads_owner_delete on public.assignment_media_uploads;

create policy assignment_media_uploads_owner_select
on public.assignment_media_uploads for select to authenticated
using (
  owner_id = auth.uid()
  and storage_key like auth.uid()::text || '/' || assignment_id::text || '/%'
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = assignment_media_uploads.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

revoke insert, update, delete on table public.assignment_media_uploads from anon, authenticated;
grant select on table public.assignment_media_uploads to authenticated;

drop policy if exists media_assets_owner_all on public.media_assets;
drop policy if exists media_assets_owner_select on public.media_assets;
drop policy if exists media_assets_owner_delete on public.media_assets;

create policy media_assets_owner_select
on public.media_assets for select to authenticated
using (
  owner_id = auth.uid()
  and storage_key like auth.uid()::text || '/' || assignment_id::text || '/%'
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = media_assets.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

revoke insert, update, delete on table public.media_assets from anon, authenticated;
grant select on table public.media_assets to authenticated;
grant select, insert, update, delete on table public.assignment_media_uploads to service_role;
grant select, insert, update, delete on table public.media_assets to service_role;

drop policy if exists assignment_media_owner_insert on storage.objects;
drop policy if exists assignment_media_owner_update on storage.objects;
drop policy if exists assignment_media_owner_select on storage.objects;
drop policy if exists assignment_media_owner_delete on storage.objects;

create policy assignment_media_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'assignment-media'
  and exists (
    select 1
    from public.assignment_media_uploads upload
    where upload.storage_key = name
      and upload.owner_id = auth.uid()
      and upload.assignment_id::text = (storage.foldername(name))[2]
      and (storage.foldername(name))[1] = auth.uid()::text
      and upload.expires_at > now()
      and upload.claimed_at is null
      and upload.finalized_at is null
      and upload.discarded_at is null
  )
);

create policy assignment_media_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (
    exists (
      select 1
      from public.assignment_media_uploads upload
      where upload.storage_key = name
        and upload.owner_id = auth.uid()
        and upload.assignment_id::text = (storage.foldername(name))[2]
        and upload.expires_at > now()
        and upload.finalized_at is null
        and upload.discarded_at is null
    )
    or exists (
      select 1
      from public.media_assets media
      where media.storage_key = name
        and media.owner_id = auth.uid()
        and media.assignment_id::text = (storage.foldername(name))[2]
    )
  )
);

create policy assignment_media_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignment_media_uploads upload
    where upload.storage_key = name
      and upload.owner_id = auth.uid()
      and upload.assignment_id::text = (storage.foldername(name))[2]
      and upload.claimed_at is null
      and upload.finalized_at is null
      and upload.discarded_at is null
  )
);

create or replace function public.create_assignment_media_upload_intent(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_media_kind text,
  p_storage_key text,
  p_file_name text,
  p_declared_mime_type text,
  p_declared_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_upload public.assignment_media_uploads%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.assignments assignment
    where assignment.id = p_assignment_id and assignment.owner_id = p_owner_id
  ) then
    raise exception 'assignment ownership mismatch' using errcode = '42501';
  end if;

  if p_storage_key not like p_owner_id::text || '/' || p_assignment_id::text || '/' || p_upload_id::text || '.%' then
    raise exception 'upload path mismatch' using errcode = '22023';
  end if;

  if (p_media_kind = 'audio' and p_declared_mime_type not in ('audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg'))
    or (p_media_kind = 'video' and p_declared_mime_type not in ('video/mp4', 'video/webm', 'video/quicktime'))
    or p_media_kind not in ('audio', 'video') then
    raise exception 'media declaration mismatch' using errcode = '22023';
  end if;

  insert into public.assignment_media_uploads (
    id, assignment_id, owner_id, media_kind, storage_key, file_name,
    declared_mime_type, declared_size_bytes, consent_confirmed_at
  ) values (
    p_upload_id, p_assignment_id, p_owner_id, p_media_kind, p_storage_key,
    p_file_name, p_declared_mime_type, p_declared_size_bytes, clock_timestamp()
  )
  on conflict (id) do nothing
  returning * into created_upload;

  if created_upload.id is null then
    select * into created_upload
    from public.assignment_media_uploads
    where id = p_upload_id;

    if created_upload.id is null
      or created_upload.assignment_id <> p_assignment_id
      or created_upload.owner_id <> p_owner_id
      or created_upload.media_kind <> p_media_kind
      or created_upload.storage_key <> p_storage_key
      or created_upload.file_name <> p_file_name
      or created_upload.declared_mime_type <> p_declared_mime_type
      or created_upload.declared_size_bytes <> p_declared_size_bytes then
      raise exception 'upload intent idempotency mismatch' using errcode = '23505';
    end if;
  end if;

  return jsonb_build_object('id', created_upload.id, 'storage_key', created_upload.storage_key);
end;
$$;

create or replace function public.record_assignment_media_upload_token_expiry(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_storage_key text,
  p_signed_upload_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  minimum_safe_expiry timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
    and storage_key = p_storage_key
  for update;

  if upload.id is null then
    raise exception 'upload intent not found' using errcode = 'P0002';
  end if;
  if upload.signed_upload_expires_at = p_signed_upload_expires_at then
    update public.assignment_media_uploads
    set cleanup_quiescence_not_before = coalesce(
      cleanup_quiescence_not_before,
      p_signed_upload_expires_at + interval '25 minutes'
    )
    where id = upload.id;
    return jsonb_build_object(
      'state', 'recorded',
      'signed_upload_expires_at', upload.signed_upload_expires_at
    );
  end if;
  minimum_safe_expiry := clock_timestamp() + interval '2 hours 5 minutes';
  if upload.finalized_at is not null
    or upload.discarded_at is not null
    or upload.claimed_at is not null
    or upload.expires_at <= clock_timestamp()
    or upload.token_issuance_failed_at is not null then
    raise exception 'upload intent is not active' using errcode = '55000';
  end if;
  if p_signed_upload_expires_at is null
    or not isfinite(p_signed_upload_expires_at)
    or p_signed_upload_expires_at < minimum_safe_expiry then
    raise exception 'signed upload expiry is invalid or shortened' using errcode = '22023';
  end if;
  if upload.signed_upload_expires_at is not null
    and p_signed_upload_expires_at < upload.signed_upload_expires_at then
    raise exception 'signed upload expiry cannot be shortened' using errcode = '22023';
  end if;

  update public.assignment_media_uploads
  set signed_upload_expires_at = case
        when signed_upload_expires_at is null then p_signed_upload_expires_at
        else greatest(signed_upload_expires_at, p_signed_upload_expires_at)
      end,
      cleanup_quiescence_not_before = case
        when cleanup_quiescence_not_before is null then p_signed_upload_expires_at + interval '25 minutes'
        else greatest(cleanup_quiescence_not_before, p_signed_upload_expires_at + interval '25 minutes')
      end
  where id = upload.id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
    and storage_key = p_storage_key
    and finalized_at is null
    and discarded_at is null
    and claimed_at is null
    and token_issuance_failed_at is null
  returning * into upload;

  if upload.id is null then
    raise exception 'upload intent is not active' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'state', 'recorded',
    'signed_upload_expires_at', upload.signed_upload_expires_at
  );
end;
$$;

create or replace function public.mark_assignment_media_upload_token_issuance_failed(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_storage_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
    and storage_key = p_storage_key
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if upload.signed_upload_expires_at is not null then
    raise exception 'signed upload token was already issued' using errcode = '55000';
  end if;
  if upload.finalized_at is not null or upload.claimed_at is not null then
    raise exception 'upload intent is not active' using errcode = '55000';
  end if;

  update public.assignment_media_uploads
  set token_issuance_failed_at = coalesce(token_issuance_failed_at, clock_timestamp()),
      cleanup_quiescence_not_before = coalesce(
        cleanup_quiescence_not_before,
        expires_at + interval '25 minutes'
      )
  where id = upload.id
  returning * into upload;

  return jsonb_build_object(
    'state', 'marked',
    'token_issuance_failed_at', upload.token_issuance_failed_at
  );
end;
$$;

create or replace function public.claim_assignment_media_upload(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  media public.media_assets%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
  extension text;
  next_claim_epoch bigint;
  next_candidate_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_claim_token is null then
    raise exception 'claim token is required' using errcode = '22023';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  select * into media
  from public.media_assets
  where upload_intent_id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id;

  if found then
    return jsonb_build_object(
      'state', 'finalized',
      'media', jsonb_build_object(
        'id', media.id,
        'media_kind', media.media_kind,
        'storage_key', media.storage_key,
        'file_name', media.file_name,
        'mime_type', media.mime_type,
        'file_size_bytes', media.file_size_bytes
      )
    );
  end if;

  if upload.id is null then
    raise exception 'upload intent not found' using errcode = 'P0002';
  end if;
  if upload.finalized_at is not null
    or upload.discarded_at is not null
    or upload.expires_at <= now()
    or upload.signed_upload_expires_at is null then
    raise exception 'upload intent is not active' using errcode = '55000';
  end if;
  if upload.claim_token is not null
    and upload.claim_token <> p_claim_token
    and upload.claim_expires_at > now() then
    return jsonb_build_object('state', 'busy');
  end if;
  if upload.claim_token = p_claim_token
    and upload.claim_expires_at > now()
    and upload.durable_storage_key is not null then
    select * into candidate
    from public.assignment_media_upload_candidates
    where upload_id = upload.id
      and claim_epoch = upload.claim_epoch
      and claim_token = p_claim_token
      and storage_key = upload.durable_storage_key;
    if candidate.upload_id is null then
      raise exception 'upload claim candidate is missing' using errcode = '55000';
    end if;
    return jsonb_build_object(
      'state', 'claimed',
      'storage_key', upload.storage_key,
      'durable_storage_key', candidate.storage_key,
      'claim_epoch', candidate.claim_epoch
    );
  end if;

  extension := split_part(upload.storage_key, '.', -1);
  if extension !~ '^[A-Za-z0-9]{1,12}$' then
    raise exception 'upload extension is not valid' using errcode = '22023';
  end if;

  next_claim_epoch := upload.claim_epoch + 1;
  next_candidate_key := upload.owner_id::text || '/' || upload.assignment_id::text ||
    '/durable-e' || next_claim_epoch::text || '-' || gen_random_uuid()::text || '.' || extension;

  -- The candidate is durable database state before its key is returned to a
  -- verifier. Each takeover gets a new key; no verifier ever copies onto a key
  -- that another claim could have promoted.
  insert into public.assignment_media_upload_candidates (
    upload_id, assignment_id, owner_id, claim_epoch, claim_token, storage_key,
    lease_expires_at, cleanup_next_attempt_at, quiescence_not_before
  ) values (
    upload.id, upload.assignment_id, upload.owner_id, next_claim_epoch,
    p_claim_token, next_candidate_key, now() + interval '15 minutes',
    now() + interval '15 minutes',
    greatest(upload.signed_upload_expires_at, upload.expires_at) + interval '25 minutes'
  )
  returning * into candidate;

  update public.assignment_media_upload_candidates
  set cleanup_requested_at = coalesce(cleanup_requested_at, clock_timestamp()),
      cleanup_next_attempt_at = greatest(cleanup_next_attempt_at, clock_timestamp() + interval '15 minutes')
  where upload_id = upload.id
    and claim_epoch < next_claim_epoch
    and promoted_at is null
    and closed_at is null;

  update public.assignment_media_uploads
  set claimed_at = clock_timestamp(),
      claim_token = p_claim_token,
      claim_expires_at = now() + interval '15 minutes',
      claim_epoch = next_claim_epoch,
      durable_storage_key = candidate.storage_key,
      durable_removed_at = null
  where id = upload.id
  returning * into upload;

  return jsonb_build_object(
    'state', 'claimed',
    'storage_key', upload.storage_key,
    'durable_storage_key', candidate.storage_key,
    'claim_epoch', candidate.claim_epoch
  );
end;
$$;

create or replace function public.revalidate_assignment_media_upload_claim(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_claim_epoch bigint,
  p_candidate_storage_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'stale');
  end if;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = upload.id
    and assignment_id = upload.assignment_id
    and owner_id = upload.owner_id
    and claim_token = p_claim_token
    and claim_epoch = p_claim_epoch
    and storage_key = p_candidate_storage_key
  for update;

  if candidate.upload_id is null
    or candidate.promoted_at is not null
    or candidate.cleanup_started_at is not null
    or candidate.closed_at is not null
    or upload.finalized_at is not null
    or upload.discarded_at is not null
    or upload.expires_at <= now()
    or upload.claim_token is distinct from p_claim_token
    or upload.claim_epoch <> p_claim_epoch
    or upload.claim_expires_at is null
    or upload.claim_expires_at <= now()
    or upload.durable_storage_key is distinct from candidate.storage_key
    or exists (
      select 1
      from public.media_assets media
      where media.upload_intent_id = upload.id
        or media.storage_key = candidate.storage_key
    ) then
    return jsonb_build_object('state', 'stale');
  end if;

  return jsonb_build_object('state', 'active');
end;
$$;

drop function if exists public.finalize_assignment_media_upload(uuid, uuid, uuid, text, bigint);
drop function if exists public.finalize_assignment_media_upload(uuid, uuid, uuid, uuid, text, bigint);
create or replace function public.finalize_assignment_media_upload(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_claim_epoch bigint,
  p_candidate_storage_key text,
  p_verified_mime_type text,
  p_verified_size_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  media public.media_assets%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  if upload.id is null then
    raise exception 'upload intent not found' using errcode = 'P0002';
  end if;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = upload.id
    and assignment_id = upload.assignment_id
    and owner_id = upload.owner_id
    and claim_epoch = p_claim_epoch
    and claim_token = p_claim_token
    and storage_key = p_candidate_storage_key
  for update;

  select * into media
  from public.media_assets
  where upload_intent_id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id;

  if found and candidate.upload_id is not null
    and candidate.promoted_at is not null
    and media.storage_key = candidate.storage_key then
    return jsonb_build_object(
      'id', media.id,
      'media_kind', media.media_kind,
      'storage_key', media.storage_key,
      'file_name', media.file_name,
      'mime_type', media.mime_type,
      'file_size_bytes', media.file_size_bytes
    );
  end if;
  if found or candidate.upload_id is null then
    raise exception 'upload claim is stale' using errcode = '55000';
  end if;
  if candidate.cleanup_started_at is not null then
    raise exception 'upload candidate cleanup already started' using errcode = '55000';
  end if;
  if upload.finalized_at is not null or upload.discarded_at is not null or upload.expires_at <= now() then
    raise exception 'upload intent is not active' using errcode = '55000';
  end if;
  if upload.consent_confirmed_at is null then
    raise exception 'media consent is required' using errcode = '23514';
  end if;
  if upload.declared_mime_type <> p_verified_mime_type
    or upload.declared_size_bytes <> p_verified_size_bytes then
    raise exception 'verified object mismatch' using errcode = '22023';
  end if;
  if upload.claim_token is distinct from p_claim_token
    or upload.claim_expires_at is null
    or upload.claim_expires_at <= now()
    or upload.claim_epoch <> p_claim_epoch
    or upload.durable_storage_key is null
    or upload.durable_storage_key <> candidate.storage_key
    or upload.durable_storage_key = upload.storage_key
    or upload.durable_storage_key not like upload.owner_id::text || '/' || upload.assignment_id::text ||
      '/durable-e' || upload.claim_epoch::text || '-%' then
    raise exception 'upload claim is not active' using errcode = '55000';
  end if;
  if not exists (
    select 1 from public.assignments assignment
    where assignment.id = upload.assignment_id and assignment.owner_id = upload.owner_id
  ) then
    raise exception 'assignment ownership mismatch' using errcode = '42501';
  end if;

  insert into public.media_assets (
    assignment_id, owner_id, media_kind, storage_key, file_name, mime_type,
    file_size_bytes, consent_confirmed_at, upload_intent_id
  ) values (
    upload.assignment_id, upload.owner_id, upload.media_kind, candidate.storage_key,
    upload.file_name, p_verified_mime_type, p_verified_size_bytes,
    upload.consent_confirmed_at, upload.id
  )
  returning * into media;

  update public.assignment_media_upload_candidates
  set promoted_at = clock_timestamp(),
      cleanup_requested_at = null,
      cleanup_last_error = null
  where upload_id = candidate.upload_id and claim_epoch = candidate.claim_epoch;

  update public.assignment_media_uploads
  set finalized_at = clock_timestamp(),
      claim_expires_at = null,
      cleanup_state = 'pending',
      cleanup_completed_at = null,
      cleanup_next_attempt_at = expires_at,
      cleanup_last_error = null
  where id = upload.id;

  return jsonb_build_object(
    'id', media.id,
    'media_kind', media.media_kind,
    'storage_key', media.storage_key,
    'file_name', media.file_name,
    'mime_type', media.mime_type,
    'file_size_bytes', media.file_size_bytes
  );
end;
$$;

drop function if exists public.cleanup_assignment_media_copy(uuid, uuid, uuid, uuid);
create or replace function public.cleanup_assignment_media_copy(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_claim_epoch bigint,
  p_candidate_storage_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  media public.media_assets%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
    and claim_epoch = p_claim_epoch
    and claim_token = p_claim_token
    and storage_key = p_candidate_storage_key
  for update;

  select * into media
  from public.media_assets
  where storage_key = p_candidate_storage_key;

  if found and media.storage_key = p_candidate_storage_key then
    return jsonb_build_object(
      'can_delete_object', false,
      'media', jsonb_build_object(
        'id', media.id,
        'media_kind', media.media_kind,
        'storage_key', media.storage_key,
        'file_name', media.file_name,
        'mime_type', media.mime_type,
        'file_size_bytes', media.file_size_bytes
      )
    );
  end if;

  if upload.id is null
    or candidate.upload_id is null
    or candidate.promoted_at is not null
    or candidate.closed_at is not null then
    return jsonb_build_object('can_delete_object', false);
  end if;

  update public.assignment_media_upload_candidates
  set cleanup_requested_at = coalesce(cleanup_requested_at, clock_timestamp()),
      cleanup_started_at = coalesce(cleanup_started_at, clock_timestamp()),
      cleanup_next_attempt_at = least(cleanup_next_attempt_at, clock_timestamp())
  where upload_id = candidate.upload_id and claim_epoch = candidate.claim_epoch;

  return jsonb_build_object(
    'can_delete_object', true,
    'storage_key', candidate.storage_key
  );
end;
$$;

create or replace function public.complete_assignment_media_candidate_cleanup(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_claim_epoch bigint,
  p_candidate_storage_key text,
  p_removed boolean default false,
  p_failure_code text default null,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
  retry_delay interval;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'absent');
  end if;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = upload.id
    and assignment_id = upload.assignment_id
    and owner_id = upload.owner_id
    and claim_epoch = p_claim_epoch
    and claim_token = p_claim_token
    and storage_key = p_candidate_storage_key
  for update;

  if candidate.upload_id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if candidate.promoted_at is not null
    or exists (
      select 1 from public.media_assets media
      where media.storage_key = candidate.storage_key
    ) then
    return jsonb_build_object('state', 'protected');
  end if;

  if p_failure_code is not null then
    retry_delay := least(
      interval '6 hours',
      interval '5 minutes' * power(2, least(candidate.cleanup_attempts, 6))
    );
  end if;

  update public.assignment_media_upload_candidates
  set removed_at = case when p_removed then p_now else removed_at end,
      cleanup_requested_at = coalesce(cleanup_requested_at, p_now),
      cleanup_claim_token = null,
      cleanup_claim_expires_at = null,
      cleanup_attempts = case
        when p_failure_code is null then cleanup_attempts
        when cleanup_last_error = left(p_failure_code, 120)
          and cleanup_next_attempt_at > p_now then cleanup_attempts
        else least(cleanup_attempts + 1, 12)
      end,
      cleanup_next_attempt_at = case
        when p_failure_code is null then least(
          quiescence_not_before,
          p_now + interval '10 minutes'
        )
        when cleanup_last_error = left(p_failure_code, 120)
          and cleanup_next_attempt_at > p_now then cleanup_next_attempt_at
        else p_now + retry_delay
      end,
      cleanup_dead_lettered_at = case
        when p_failure_code is not null
          and not (
            cleanup_last_error = left(p_failure_code, 120)
            and cleanup_next_attempt_at > p_now
          )
          and cleanup_attempts + 1 >= 12
          then coalesce(cleanup_dead_lettered_at, p_now)
        else cleanup_dead_lettered_at
      end,
      cleanup_last_error = left(p_failure_code, 120)
  where upload_id = candidate.upload_id and claim_epoch = candidate.claim_epoch
  returning * into candidate;

  if p_removed and upload.durable_storage_key = candidate.storage_key then
    update public.assignment_media_uploads
    set durable_removed_at = p_now
    where id = upload.id;
  end if;

  return jsonb_build_object(
    'state', case when candidate.removed_at is not null then 'quiescing' else 'retained' end,
    'cleanup_attempts', candidate.cleanup_attempts,
    'cleanup_next_attempt_at', candidate.cleanup_next_attempt_at
  );
end;
$$;

create or replace function public.claim_due_assignment_media_candidate_cleanups(
  p_cleanup_token uuid,
  p_limit integer default 50,
  p_now timestamptz default clock_timestamp()
)
returns table (
  upload_id uuid,
  assignment_id uuid,
  owner_id uuid,
  claim_token uuid,
  claim_epoch bigint,
  storage_key text,
  cleanup_token uuid,
  cleanup_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_cleanup_token is null then
    raise exception 'cleanup token is required' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  return query
  with due as (
    select candidate.upload_id, candidate.claim_epoch
    from public.assignment_media_uploads upload
    join public.assignment_media_upload_candidates candidate
      on candidate.upload_id = upload.id
    where candidate.cleanup_requested_at is not null
      and candidate.cleanup_next_attempt_at <= p_now
      and candidate.cleanup_attempts < 12
      and candidate.cleanup_dead_lettered_at is null
      and candidate.promoted_at is null
      and candidate.closed_at is null
      and (
        candidate.cleanup_claim_token is null
        or candidate.cleanup_claim_expires_at <= p_now
      )
      and not exists (
        select 1
        from public.media_assets media
        where media.storage_key = candidate.storage_key
      )
      and not (
        upload.finalized_at is null
        and upload.discarded_at is null
        and upload.claim_token = candidate.claim_token
        and upload.claim_epoch = candidate.claim_epoch
        and upload.durable_storage_key = candidate.storage_key
        and upload.claim_expires_at > p_now
      )
    order by candidate.cleanup_next_attempt_at, candidate.upload_id, candidate.claim_epoch
    for update of upload, candidate skip locked
    limit bounded_limit
  ), claimed as (
    update public.assignment_media_upload_candidates candidate
    set cleanup_started_at = coalesce(candidate.cleanup_started_at, p_now),
        cleanup_claim_token = p_cleanup_token,
        cleanup_claim_expires_at = p_now + interval '5 minutes'
    from due
    where candidate.upload_id = due.upload_id
      and candidate.claim_epoch = due.claim_epoch
    returning
      candidate.upload_id as claimed_upload_id,
      candidate.assignment_id as claimed_assignment_id,
      candidate.owner_id as claimed_owner_id,
      candidate.claim_token as verifier_claim_token,
      candidate.claim_epoch as claimed_claim_epoch,
      candidate.storage_key as claimed_storage_key,
      candidate.cleanup_claim_expires_at as claimed_cleanup_expires_at
  )
  select
    claimed.claimed_upload_id,
    claimed.claimed_assignment_id,
    claimed.claimed_owner_id,
    claimed.verifier_claim_token,
    claimed.claimed_claim_epoch,
    claimed.claimed_storage_key,
    p_cleanup_token,
    claimed.claimed_cleanup_expires_at
  from claimed;
end;
$$;

create or replace function public.complete_claimed_assignment_media_candidate_cleanup(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_claim_epoch bigint,
  p_candidate_storage_key text,
  p_cleanup_token uuid,
  p_removed boolean default false,
  p_absence_confirmed boolean default false,
  p_failure_code text default null,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
  retry_delay interval;
  next_attempts integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_cleanup_token is null then
    raise exception 'cleanup token is required' using errcode = '22023';
  end if;
  if p_removed is null
    or p_absence_confirmed is null
    or p_absence_confirmed and not p_removed
    or p_absence_confirmed = (p_failure_code is not null) then
    raise exception 'candidate cleanup outcome is invalid' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'absent');
  end if;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = upload.id
    and assignment_id = upload.assignment_id
    and owner_id = upload.owner_id
    and claim_epoch = p_claim_epoch
    and claim_token = p_claim_token
    and storage_key = p_candidate_storage_key
  for update;

  if candidate.upload_id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if candidate.closed_at is not null then
    return jsonb_build_object('state', 'closed');
  end if;
  if candidate.cleanup_claim_token is distinct from p_cleanup_token then
    return jsonb_build_object('state', 'stale');
  end if;
  if candidate.promoted_at is not null
    or exists (
      select 1
      from public.media_assets media
      where media.storage_key = candidate.storage_key
    ) then
    return jsonb_build_object('state', 'protected');
  end if;

  if p_removed then
    update public.assignment_media_upload_candidates
    set removed_at = p_now,
        last_absence_confirmed_at = case
          when p_absence_confirmed then p_now
          else last_absence_confirmed_at
        end,
        closed_at = case
          when p_absence_confirmed and p_now >= quiescence_not_before then p_now
          else closed_at
        end,
        cleanup_claim_token = null,
        cleanup_claim_expires_at = null,
        cleanup_attempts = 0,
        cleanup_next_attempt_at = case
          when p_absence_confirmed and p_now >= quiescence_not_before then p_now
          else least(quiescence_not_before, p_now + interval '10 minutes')
        end,
        cleanup_last_error = null,
        cleanup_dead_lettered_at = null
    where upload_id = candidate.upload_id
      and claim_epoch = candidate.claim_epoch
      and cleanup_claim_token = p_cleanup_token;

    if upload.durable_storage_key = candidate.storage_key then
      update public.assignment_media_uploads
      set durable_removed_at = p_now
      where id = upload.id;
    end if;

    select * into candidate
    from public.assignment_media_upload_candidates
    where upload_id = p_upload_id and claim_epoch = p_claim_epoch;

    return jsonb_build_object(
      'state', case when candidate.closed_at is not null then 'closed' else 'quiescing' end,
      'quiescence_not_before', candidate.quiescence_not_before,
      'last_absence_confirmed_at', candidate.last_absence_confirmed_at
    );
  end if;

  next_attempts := least(candidate.cleanup_attempts + 1, 12);
  retry_delay := least(
    interval '6 hours',
    interval '5 minutes' * power(2, least(candidate.cleanup_attempts, 6))
  );

  update public.assignment_media_upload_candidates
  set cleanup_claim_token = null,
      cleanup_claim_expires_at = null,
      cleanup_next_attempt_at = p_now + retry_delay,
      cleanup_last_error = left(p_failure_code, 120),
      cleanup_dead_lettered_at = case
        when next_attempts >= 12 and p_now >= quiescence_not_before
          then coalesce(cleanup_dead_lettered_at, p_now)
        else cleanup_dead_lettered_at
      end,
      cleanup_attempts = case
        when next_attempts >= 12 and p_now < quiescence_not_before then 11
        else next_attempts
      end
  where upload_id = candidate.upload_id
    and claim_epoch = candidate.claim_epoch
    and cleanup_claim_token = p_cleanup_token
  returning * into candidate;

  if candidate.upload_id is null then
    return jsonb_build_object('state', 'stale');
  end if;

  return jsonb_build_object(
    'state', case
      when candidate.cleanup_dead_lettered_at is not null then 'dead_lettered'
      else 'retry'
    end,
    'cleanup_attempts', candidate.cleanup_attempts,
    'cleanup_next_attempt_at', candidate.cleanup_next_attempt_at
  );
end;
$$;

drop function if exists public.discard_assignment_media_upload(uuid, uuid, uuid);
create or replace function public.discard_assignment_media_upload(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  media public.media_assets%rowtype;
  safe_durable_storage_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  select * into media
  from public.media_assets
  where upload_intent_id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id;

  if found and upload.id is not null then
    update public.assignment_media_uploads
    set cleanup_requested_at = coalesce(cleanup_requested_at, clock_timestamp()),
        cleanup_next_attempt_at = case
          when cleanup_state = 'completed' then cleanup_next_attempt_at
          else least(cleanup_next_attempt_at, clock_timestamp())
        end
    where id = upload.id;

    return jsonb_build_object(
      'state', 'finalized',
      'can_delete_object', upload.storage_key is distinct from media.storage_key,
      'temporary_storage_key', upload.storage_key,
      'media', jsonb_build_object(
        'id', media.id,
        'media_kind', media.media_kind,
        'storage_key', media.storage_key,
        'file_name', media.file_name,
        'mime_type', media.mime_type,
        'file_size_bytes', media.file_size_bytes
      )
    );
  end if;

  if upload.id is null then
    return jsonb_build_object('state', 'absent', 'can_delete_object', false);
  end if;

  if p_claim_token is not null then
    if upload.claim_token is distinct from p_claim_token
      or upload.claim_expires_at is null
      or upload.claim_expires_at <= now() then
      return jsonb_build_object('state', 'stale', 'can_delete_object', false);
    end if;
  elsif upload.claim_token is not null and upload.claim_expires_at > now() then
    return jsonb_build_object('state', 'busy', 'can_delete_object', false);
  end if;

  update public.assignment_media_uploads
  set discarded_at = coalesce(discarded_at, clock_timestamp()),
      cleanup_requested_at = coalesce(cleanup_requested_at, clock_timestamp()),
      cleanup_next_attempt_at = least(cleanup_next_attempt_at, clock_timestamp())
  where id = upload.id and finalized_at is null;

  if not found then
    return jsonb_build_object('state', 'absent', 'can_delete_object', false);
  end if;

  update public.assignment_media_upload_candidates candidate
  set cleanup_requested_at = coalesce(candidate.cleanup_requested_at, clock_timestamp()),
      cleanup_started_at = coalesce(candidate.cleanup_started_at, clock_timestamp()),
      cleanup_next_attempt_at = least(candidate.cleanup_next_attempt_at, clock_timestamp())
  where candidate.upload_id = upload.id
    and candidate.storage_key = upload.durable_storage_key
    and candidate.promoted_at is null
    and candidate.closed_at is null
    and not exists (
      select 1 from public.media_assets referenced_media
      where referenced_media.storage_key = candidate.storage_key
    )
  returning candidate.storage_key into safe_durable_storage_key;

  return jsonb_strip_nulls(jsonb_build_object(
    'state', 'cleanup',
    'can_delete_object', true,
    'temporary_storage_key', upload.storage_key,
    'durable_storage_key', safe_durable_storage_key
  ));
end;
$$;

create or replace function public.complete_assignment_media_upload_cleanup(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid default null,
  p_temporary_removed boolean default false,
  p_durable_removed boolean default false,
  p_temporary_absence_confirmed boolean default false,
  p_durable_absence_confirmed boolean default false,
  p_failure_code text default null,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  media public.media_assets%rowtype;
  has_media boolean := false;
  retry_delay interval;
  next_attempts integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_temporary_absence_confirmed and not p_temporary_removed
    or p_durable_absence_confirmed and not p_durable_removed then
    raise exception 'upload cleanup absence confirmation is invalid' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id and assignment_id = p_assignment_id and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'deleted');
  end if;

  select * into media
  from public.media_assets
  where upload_intent_id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id;
  has_media := found;

  if p_claim_token is not null and not has_media then
    if upload.claim_token is distinct from p_claim_token
      or upload.claim_expires_at is null
      or upload.claim_expires_at <= p_now then
      return jsonb_build_object('state', 'stale');
    end if;
  elsif p_claim_token is null
    and not has_media
    and upload.claim_token is not null
    and upload.claim_expires_at > p_now then
    return jsonb_build_object('state', 'busy');
  end if;

  if p_failure_code is not null then
    next_attempts := case
      when upload.cleanup_last_error = left(p_failure_code, 120)
        and upload.cleanup_next_attempt_at > p_now then upload.cleanup_attempts
      else least(upload.cleanup_attempts + 1, 12)
    end;
    retry_delay := least(
      interval '6 hours',
      interval '5 minutes' * power(2, least(upload.cleanup_attempts, 6))
    );
  else
    next_attempts := 0;
  end if;

  update public.assignment_media_uploads
  set temporary_removed_at = case
        when p_temporary_removed then p_now
        else temporary_removed_at
      end,
      durable_removed_at = case
        when p_durable_removed and not has_media then p_now
        else durable_removed_at
      end,
      cleanup_attempts = next_attempts,
      cleanup_next_attempt_at = case
        when p_failure_code is not null
          and cleanup_last_error = left(p_failure_code, 120)
          and cleanup_next_attempt_at > p_now then cleanup_next_attempt_at
        when p_failure_code is not null and next_attempts >= 12 then p_now
        when p_failure_code is not null then p_now + retry_delay
        when has_media
          and p_temporary_absence_confirmed
          and cleanup_quiescence_not_before is not null
          and p_now >= cleanup_quiescence_not_before
          and not exists (
            select 1 from public.assignment_media_upload_candidates candidate
            where candidate.upload_id = upload.id
              and candidate.promoted_at is null
              and candidate.closed_at is null
          ) then p_now
        when signed_upload_expires_at is null
          and token_issuance_failed_at is null then p_now + interval '6 hours'
        when cleanup_quiescence_not_before is not null
          and p_now < cleanup_quiescence_not_before then least(
            cleanup_quiescence_not_before,
            p_now + interval '10 minutes'
          )
        else p_now
      end,
      cleanup_last_error = left(p_failure_code, 120),
      cleanup_state = case
        when p_failure_code is null
          and has_media
          and p_temporary_absence_confirmed
          and cleanup_quiescence_not_before is not null
          and p_now >= cleanup_quiescence_not_before
          and not exists (
            select 1 from public.assignment_media_upload_candidates candidate
            where candidate.upload_id = upload.id
              and candidate.promoted_at is null
              and candidate.closed_at is null
          ) then 'completed'
        when p_failure_code is null then 'pending'
        when next_attempts >= 12 then 'dead_lettered'
        else 'retry'
      end,
      cleanup_completed_at = case
        when p_failure_code is null
          and has_media
          and p_temporary_absence_confirmed
          and cleanup_quiescence_not_before is not null
          and p_now >= cleanup_quiescence_not_before
          and not exists (
            select 1 from public.assignment_media_upload_candidates candidate
            where candidate.upload_id = upload.id
              and candidate.promoted_at is null
              and candidate.closed_at is null
          )
          then coalesce(cleanup_completed_at, p_now)
        else null
      end,
      cleanup_dead_lettered_at = case
        when p_failure_code is not null and next_attempts >= 12
          then coalesce(cleanup_dead_lettered_at, p_now)
        else null
      end,
      cleanup_dead_letter_error_code = case
        when p_failure_code is not null and next_attempts >= 12
          then coalesce(nullif(left(p_failure_code, 120), ''), 'cleanup_failed')
        else null
      end
  where id = upload.id
  returning * into upload;

  if p_durable_removed and not has_media and upload.durable_storage_key is not null then
    update public.assignment_media_upload_candidates
    set removed_at = p_now,
        last_absence_confirmed_at = case
          when p_durable_absence_confirmed then p_now
          else last_absence_confirmed_at
        end,
        closed_at = case
          when p_durable_absence_confirmed and p_now >= quiescence_not_before then p_now
          else closed_at
        end,
        cleanup_requested_at = coalesce(cleanup_requested_at, p_now),
        cleanup_next_attempt_at = case
          when p_durable_absence_confirmed and p_now >= quiescence_not_before then p_now
          else least(quiescence_not_before, p_now + interval '10 minutes')
        end,
        cleanup_last_error = null
    where upload_id = upload.id
      and storage_key = upload.durable_storage_key
      and promoted_at is null;
  end if;

  -- A signed token can recreate staging bytes until its persisted fence. A
  -- verifier started at that fence can still recreate a candidate for the
  -- 15-minute execution bound; the extra 10 minutes is the safety margin.
  -- Unknown token issuance remains fail closed because no finite fence exists.
  if p_failure_code is null
    and not has_media
    and p_temporary_absence_confirmed
    and upload.cleanup_quiescence_not_before is not null
    and p_now >= upload.cleanup_quiescence_not_before
    and upload.temporary_removed_at >= upload.cleanup_quiescence_not_before
    and not exists (
      select 1
      from public.assignment_media_upload_candidates candidate
      where candidate.upload_id = upload.id
        and candidate.promoted_at is null
        and candidate.closed_at is null
    ) then
    delete from public.assignment_media_uploads where id = upload.id;
    return jsonb_build_object('state', 'deleted');
  end if;

  return jsonb_build_object(
    'state', case
      when upload.cleanup_state = 'dead_lettered' then 'dead_lettered'
      when upload.cleanup_state = 'completed' then 'completed'
      else 'retained'
    end,
    'cleanup_attempts', upload.cleanup_attempts,
    'cleanup_next_attempt_at', upload.cleanup_next_attempt_at,
    'cleanup_dead_lettered_at', upload.cleanup_dead_lettered_at,
    'cleanup_dead_letter_error_code', upload.cleanup_dead_letter_error_code
  );
end;
$$;

create or replace function public.recover_assignment_media_upload_cleanup(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if upload.cleanup_state <> 'dead_lettered' then
    return jsonb_build_object(
      'state', 'not_dead_lettered',
      'cleanup_state', upload.cleanup_state,
      'cleanup_attempts', upload.cleanup_attempts
    );
  end if;

  update public.assignment_media_uploads
  set cleanup_state = 'retry',
      cleanup_completed_at = null,
      cleanup_attempts = 0,
      cleanup_next_attempt_at = p_now,
      cleanup_last_error = null,
      cleanup_dead_lettered_at = null,
      cleanup_dead_letter_error_code = null,
      cleanup_requested_at = coalesce(cleanup_requested_at, p_now)
  where id = upload.id
  returning * into upload;

  return jsonb_build_object(
    'state', 'recovered',
    'cleanup_state', upload.cleanup_state,
    'cleanup_attempts', upload.cleanup_attempts,
    'cleanup_next_attempt_at', upload.cleanup_next_attempt_at
  );
end;
$$;

create or replace function public.get_assignment_media_upload_cleanup_monitoring(
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'dead_letter_count', (
      select count(*)
      from public.assignment_media_uploads
      where cleanup_state = 'dead_lettered'
    ),
    'oldest_dead_letter_age_seconds', (
      select floor(extract(epoch from (p_now - min(cleanup_dead_lettered_at))))::bigint
      from public.assignment_media_uploads
      where cleanup_state = 'dead_lettered'
    ),
    'retry_count', (
      select count(*)
      from public.assignment_media_uploads
      where cleanup_state = 'retry'
    ),
    'due_count', (
      select count(*)
      from public.assignment_media_uploads
      where cleanup_state in ('pending', 'retry')
        and cleanup_next_attempt_at <= p_now
        and (
          discarded_at is not null
          or expires_at <= p_now
          or claim_expires_at <= p_now
        )
    ),
    'candidate_dead_letter_count', (
      select count(*)
      from public.assignment_media_upload_candidates
      where cleanup_dead_lettered_at is not null
        and promoted_at is null
        and closed_at is null
    ),
    'candidate_oldest_dead_letter_age_seconds', (
      select floor(extract(epoch from (p_now - min(cleanup_dead_lettered_at))))::bigint
      from public.assignment_media_upload_candidates
      where cleanup_dead_lettered_at is not null
        and promoted_at is null
        and closed_at is null
    )
  ) into result;

  return result;
end;
$$;

create or replace function public.recover_assignment_media_candidate_cleanup(
  p_upload_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_epoch bigint,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  upload public.assignment_media_uploads%rowtype;
  candidate public.assignment_media_upload_candidates%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'cleanup time is invalid' using errcode = '22023';
  end if;

  select * into upload
  from public.assignment_media_uploads
  where id = p_upload_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if upload.id is null then
    return jsonb_build_object('state', 'absent');
  end if;

  select * into candidate
  from public.assignment_media_upload_candidates
  where upload_id = upload.id
    and assignment_id = upload.assignment_id
    and owner_id = upload.owner_id
    and claim_epoch = p_claim_epoch
  for update;

  if candidate.upload_id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if candidate.promoted_at is not null
    or candidate.closed_at is not null
    or exists (
      select 1 from public.media_assets media
      where media.storage_key = candidate.storage_key
    ) then
    return jsonb_build_object('state', 'protected');
  end if;
  if candidate.cleanup_dead_lettered_at is null then
    return jsonb_build_object(
      'state', 'not_dead_lettered',
      'cleanup_attempts', candidate.cleanup_attempts
    );
  end if;

  update public.assignment_media_upload_candidates
  set cleanup_requested_at = coalesce(cleanup_requested_at, p_now),
      cleanup_started_at = coalesce(cleanup_started_at, p_now),
      cleanup_claim_token = null,
      cleanup_claim_expires_at = null,
      cleanup_attempts = 0,
      cleanup_next_attempt_at = p_now,
      cleanup_last_error = null,
      cleanup_dead_lettered_at = null
  where upload_id = candidate.upload_id
    and claim_epoch = candidate.claim_epoch
  returning * into candidate;

  return jsonb_build_object(
    'state', 'recovered',
    'upload_id', candidate.upload_id,
    'claim_epoch', candidate.claim_epoch,
    'storage_key', candidate.storage_key,
    'cleanup_next_attempt_at', candidate.cleanup_next_attempt_at
  );
end;
$$;

-- Durable deletion jobs preserve enough identity to finish database cleanup
-- after storage succeeds, including when the first completion call fails.
create table if not exists public.media_asset_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null unique,
  assignment_id uuid not null,
  owner_id uuid not null,
  storage_key text not null unique,
  upload_id uuid,
  temporary_storage_key text,
  reason text not null check (reason in ('user', 'retention')),
  state text not null default 'requested'
    check (state in ('requested', 'processing', 'retry', 'dead_lettered', 'completed')),
  attempts integer not null default 0 check (attempts between 0 and 12),
  next_attempt_at timestamptz not null default now(),
  claim_token uuid,
  claim_expires_at timestamptz,
  storage_removed_at timestamptz,
  storage_absence_confirmed_at timestamptz,
  completed_at timestamptz,
  dead_lettered_at timestamptz,
  dead_letter_error_code text,
  last_error text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((claim_token is null) = (claim_expires_at is null)),
  check ((upload_id is null) = (temporary_storage_key is null)),
  check (
    temporary_storage_key is null
    or (
      temporary_storage_key <> storage_key
      and temporary_storage_key like owner_id::text || '/' || assignment_id::text || '/%'
      and temporary_storage_key not like '%/%/%/%'
      and temporary_storage_key not like '%..%'
      and temporary_storage_key not like E'%\\%'
    )
  ),
  check (
    (state = 'completed' and completed_at is not null and storage_absence_confirmed_at is not null)
    or (state <> 'completed' and completed_at is null)
  ),
  check (
    (
      state = 'dead_lettered'
      and attempts = 12
      and dead_lettered_at is not null
      and nullif(dead_letter_error_code, '') is not null
    )
    or (
      state <> 'dead_lettered'
      and dead_lettered_at is null
      and dead_letter_error_code is null
    )
  )
);

alter table public.media_asset_deletion_jobs
  add column if not exists upload_id uuid,
  add column if not exists temporary_storage_key text;

update public.media_asset_deletion_jobs job
set upload_id = media.upload_intent_id,
    temporary_storage_key = upload.storage_key
from public.media_assets media
join public.assignment_media_uploads upload
  on upload.id = media.upload_intent_id
  and upload.assignment_id = media.assignment_id
  and upload.owner_id = media.owner_id
where job.media_asset_id = media.id
  and job.assignment_id = media.assignment_id
  and job.owner_id = media.owner_id
  and job.storage_key = media.storage_key
  and job.upload_id is null
  and job.temporary_storage_key is null;

alter table public.media_asset_deletion_jobs
  drop constraint if exists media_asset_deletion_jobs_upload_identity_check;
alter table public.media_asset_deletion_jobs
  add constraint media_asset_deletion_jobs_upload_identity_check
  check ((upload_id is null) = (temporary_storage_key is null));

alter table public.media_asset_deletion_jobs
  drop constraint if exists media_asset_deletion_jobs_temporary_path_check;
alter table public.media_asset_deletion_jobs
  add constraint media_asset_deletion_jobs_temporary_path_check
  check (
    temporary_storage_key is null
    or (
      temporary_storage_key <> storage_key
      and temporary_storage_key like owner_id::text || '/' || assignment_id::text || '/%'
      and temporary_storage_key not like '%/%/%/%'
      and temporary_storage_key not like '%..%'
      and temporary_storage_key not like E'%\\%'
    )
  );

create index if not exists media_asset_deletion_jobs_due_idx
  on public.media_asset_deletion_jobs (next_attempt_at, requested_at, id)
  where state in ('requested', 'processing', 'retry');

alter table public.media_asset_deletion_jobs enable row level security;
revoke all on table public.media_asset_deletion_jobs from anon, authenticated;
grant select, insert, update, delete on table public.media_asset_deletion_jobs to service_role;

create or replace function public.request_assignment_media_deletion(
  p_media_asset_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_reason text,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  media public.media_assets%rowtype;
  upload public.assignment_media_uploads%rowtype;
  job public.media_asset_deletion_jobs%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_reason not in ('user', 'retention') then
    raise exception 'media deletion reason is invalid' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  select * into media
  from public.media_assets
  where id = p_media_asset_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if media.id is null then
    select * into job
    from public.media_asset_deletion_jobs
    where media_asset_id = p_media_asset_id
      and assignment_id = p_assignment_id
      and owner_id = p_owner_id;
    if job.id is null then
      return jsonb_build_object('state', 'absent');
    end if;
    return jsonb_build_object(
      'state', job.state,
      'job_id', job.id,
      'media_asset_id', job.media_asset_id,
      'assignment_id', job.assignment_id,
      'owner_id', job.owner_id,
      'storage_key', job.storage_key,
      'upload_id', job.upload_id,
      'temporary_storage_key', job.temporary_storage_key
    );
  end if;
  if not exists (
    select 1 from public.assignments assignment
    where assignment.id = media.assignment_id
      and assignment.owner_id = media.owner_id
  ) then
    raise exception 'assignment ownership mismatch' using errcode = '42501';
  end if;
  if media.storage_key not like media.owner_id::text || '/' || media.assignment_id::text || '/%'
    or media.storage_key like '%/%/%/%'
    or media.storage_key like '%..%'
    or media.storage_key like E'%\\%' then
    raise exception 'media deletion path mismatch' using errcode = '22023';
  end if;

  if media.upload_intent_id is not null then
    select * into upload
    from public.assignment_media_uploads
    where id = media.upload_intent_id
      and assignment_id = media.assignment_id
      and owner_id = media.owner_id
      and finalized_at is not null
      and storage_key is distinct from media.storage_key
    for update;

    if upload.id is null then
      raise exception 'media deletion upload tombstone is missing' using errcode = '55000';
    end if;

    update public.assignment_media_uploads
    set cleanup_requested_at = coalesce(cleanup_requested_at, p_now),
        cleanup_state = case when cleanup_state = 'completed' then 'completed' else 'pending' end,
        cleanup_completed_at = case when cleanup_state = 'completed' then cleanup_completed_at else null end,
        cleanup_attempts = case when cleanup_state = 'dead_lettered' then 0 else cleanup_attempts end,
        cleanup_next_attempt_at = case
          when cleanup_state = 'completed' then cleanup_next_attempt_at
          else least(cleanup_next_attempt_at, p_now)
        end,
        cleanup_last_error = case when cleanup_state = 'completed' then cleanup_last_error else null end,
        cleanup_dead_lettered_at = null,
        cleanup_dead_letter_error_code = null
    where id = upload.id
    returning * into upload;
  end if;

  insert into public.media_asset_deletion_jobs (
    media_asset_id, assignment_id, owner_id, storage_key, upload_id,
    temporary_storage_key, reason,
    state, next_attempt_at, requested_at, updated_at
  ) values (
    media.id, media.assignment_id, media.owner_id, media.storage_key, upload.id,
    upload.storage_key, p_reason,
    'requested', p_now, p_now, p_now
  )
  on conflict (media_asset_id) do nothing;

  select * into job
  from public.media_asset_deletion_jobs
  where media_asset_id = media.id
  for update;

  if job.assignment_id <> media.assignment_id
    or job.owner_id <> media.owner_id
    or job.storage_key <> media.storage_key
    or job.upload_id is distinct from upload.id
    or job.temporary_storage_key is distinct from upload.storage_key then
    raise exception 'media deletion job identity mismatch' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'state', job.state,
    'job_id', job.id,
    'media_asset_id', job.media_asset_id,
    'assignment_id', job.assignment_id,
    'owner_id', job.owner_id,
    'storage_key', job.storage_key,
    'upload_id', job.upload_id,
    'temporary_storage_key', job.temporary_storage_key
  );
end;
$$;

create or replace function public.request_due_assignment_media_retention_deletions(
  p_limit integer default 50,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
  requested_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.media_assets media
    where media.retention_expires_at <= p_now
      and media.upload_intent_id is not null
      and not exists (
        select 1 from public.assignment_media_uploads upload
        where upload.id = media.upload_intent_id
          and upload.assignment_id = media.assignment_id
          and upload.owner_id = media.owner_id
          and upload.finalized_at is not null
          and upload.storage_key is distinct from media.storage_key
      )
  ) then
    raise exception 'retention deletion upload tombstone is missing' using errcode = '55000';
  end if;

  with due as (
    select media.id, media.assignment_id, media.owner_id, media.storage_key,
      upload.id as upload_id, upload.storage_key as temporary_storage_key
    from public.media_assets media
    left join public.assignment_media_uploads upload
      on upload.id = media.upload_intent_id
      and upload.assignment_id = media.assignment_id
      and upload.owner_id = media.owner_id
    where media.retention_expires_at <= p_now
      and not exists (
        select 1 from public.media_asset_deletion_jobs job
        where job.media_asset_id = media.id
      )
    order by media.retention_expires_at, media.id
    for update of media skip locked
    limit bounded_limit
  ), scheduled as (
    update public.assignment_media_uploads upload
    set cleanup_requested_at = coalesce(upload.cleanup_requested_at, p_now),
        cleanup_state = case when upload.cleanup_state = 'completed' then 'completed' else 'pending' end,
        cleanup_completed_at = case when upload.cleanup_state = 'completed' then upload.cleanup_completed_at else null end,
        cleanup_attempts = case when upload.cleanup_state = 'dead_lettered' then 0 else upload.cleanup_attempts end,
        cleanup_next_attempt_at = case
          when upload.cleanup_state = 'completed' then upload.cleanup_next_attempt_at
          else least(upload.cleanup_next_attempt_at, p_now)
        end,
        cleanup_last_error = case when upload.cleanup_state = 'completed' then upload.cleanup_last_error else null end,
        cleanup_dead_lettered_at = null,
        cleanup_dead_letter_error_code = null
    from due
    where upload.id = due.upload_id
    returning upload.id
  ), inserted as (
    insert into public.media_asset_deletion_jobs (
      media_asset_id, assignment_id, owner_id, storage_key, upload_id,
      temporary_storage_key, reason,
      state, next_attempt_at, requested_at, updated_at
    )
    select id, assignment_id, owner_id, storage_key, upload_id,
      temporary_storage_key, 'retention',
      'requested', p_now, p_now, p_now
    from due
    on conflict (media_asset_id) do nothing
    returning id
  )
  select count(*) into requested_count from inserted;

  return jsonb_build_object(
    'requested_count', requested_count,
    'backlog', requested_count = bounded_limit
  );
end;
$$;

create or replace function public.claim_assignment_media_deletion(
  p_job_id uuid,
  p_media_asset_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_claim_token uuid,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.media_asset_deletion_jobs%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_claim_token is null then
    raise exception 'deletion claim token is required' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  select * into job
  from public.media_asset_deletion_jobs
  where id = p_job_id
    and media_asset_id = p_media_asset_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if job.id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if job.state = 'completed' then
    return jsonb_build_object('state', 'completed', 'job_id', job.id);
  end if;
  if job.state = 'dead_lettered' then
    return jsonb_build_object('state', 'dead_lettered', 'job_id', job.id);
  end if;
  if job.state = 'processing'
    and job.claim_token = p_claim_token
    and job.claim_expires_at > p_now then
    return jsonb_build_object(
      'state', 'claimed',
      'job_id', job.id,
      'media_asset_id', job.media_asset_id,
      'assignment_id', job.assignment_id,
      'owner_id', job.owner_id,
      'storage_key', job.storage_key,
      'upload_id', job.upload_id,
      'temporary_storage_key', job.temporary_storage_key,
      'claim_token', job.claim_token,
      'claim_expires_at', job.claim_expires_at
    );
  end if;
  if job.state = 'processing' and job.claim_expires_at > p_now then
    return jsonb_build_object('state', 'busy', 'job_id', job.id);
  end if;
  if job.next_attempt_at > p_now then
    return jsonb_build_object('state', 'retry', 'job_id', job.id);
  end if;
  if not exists (
    select 1 from public.media_assets media
    where media.id = job.media_asset_id
      and media.assignment_id = job.assignment_id
      and media.owner_id = job.owner_id
      and media.storage_key = job.storage_key
  ) then
    raise exception 'media deletion job lost its fenced record' using errcode = '55000';
  end if;
  if job.upload_id is not null and not exists (
    select 1 from public.assignment_media_uploads upload
    where upload.id = job.upload_id
      and upload.assignment_id = job.assignment_id
      and upload.owner_id = job.owner_id
      and upload.storage_key = job.temporary_storage_key
      and upload.finalized_at is not null
  ) then
    raise exception 'media deletion job lost its upload tombstone' using errcode = '55000';
  end if;

  update public.media_asset_deletion_jobs
  set state = 'processing',
      claim_token = p_claim_token,
      claim_expires_at = p_now + interval '5 minutes',
      updated_at = p_now
  where id = job.id
  returning * into job;

  return jsonb_build_object(
    'state', 'claimed',
    'job_id', job.id,
    'media_asset_id', job.media_asset_id,
    'assignment_id', job.assignment_id,
    'owner_id', job.owner_id,
    'storage_key', job.storage_key,
    'upload_id', job.upload_id,
    'temporary_storage_key', job.temporary_storage_key,
    'claim_token', job.claim_token,
    'claim_expires_at', job.claim_expires_at
  );
end;
$$;

create or replace function public.claim_due_assignment_media_deletions(
  p_claim_token uuid,
  p_limit integer default 50,
  p_now timestamptz default clock_timestamp()
)
returns table (
  job_id uuid,
  media_asset_id uuid,
  assignment_id uuid,
  owner_id uuid,
  storage_key text,
  upload_id uuid,
  temporary_storage_key text,
  claim_token uuid,
  claim_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  bounded_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_claim_token is null then
    raise exception 'deletion claim token is required' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  return query
  with due as (
    select job.id
    from public.media_asset_deletion_jobs job
    join public.media_assets media
      on media.id = job.media_asset_id
      and media.assignment_id = job.assignment_id
      and media.owner_id = job.owner_id
      and media.storage_key = job.storage_key
    left join public.assignment_media_uploads upload
      on upload.id = job.upload_id
      and upload.assignment_id = job.assignment_id
      and upload.owner_id = job.owner_id
      and upload.storage_key = job.temporary_storage_key
      and upload.finalized_at is not null
    where job.state in ('requested', 'retry', 'processing')
      and (job.upload_id is null or upload.id is not null)
      and job.attempts < 12
      and job.next_attempt_at <= p_now
      and (
        job.state <> 'processing'
        or job.claim_expires_at <= p_now
      )
    order by job.next_attempt_at, job.requested_at, job.id
    for update of job skip locked
    limit bounded_limit
  ), claimed as (
    update public.media_asset_deletion_jobs job
    set state = 'processing',
        claim_token = p_claim_token,
        claim_expires_at = p_now + interval '5 minutes',
        updated_at = p_now
    from due
    where job.id = due.id
    returning job.*
  )
  select
    claimed.id,
    claimed.media_asset_id,
    claimed.assignment_id,
    claimed.owner_id,
    claimed.storage_key,
    claimed.upload_id,
    claimed.temporary_storage_key,
    claimed.claim_token,
    claimed.claim_expires_at
  from claimed;
end;
$$;

create or replace function public.complete_assignment_media_deletion(
  p_job_id uuid,
  p_media_asset_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_storage_key text,
  p_claim_token uuid,
  p_storage_removed boolean default false,
  p_storage_absence_confirmed boolean default false,
  p_failure_code text default null,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.media_asset_deletion_jobs%rowtype;
  next_attempts integer;
  retry_delay interval;
  database_failure text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_claim_token is null then
    raise exception 'deletion claim token is required' using errcode = '22023';
  end if;
  if p_storage_removed is null
    or p_storage_absence_confirmed is null
    or (p_storage_absence_confirmed and p_failure_code is not null)
    or (not p_storage_absence_confirmed and nullif(p_failure_code, '') is null) then
    raise exception 'media deletion outcome is invalid' using errcode = '22023';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  select * into job
  from public.media_asset_deletion_jobs
  where id = p_job_id
    and media_asset_id = p_media_asset_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
    and storage_key = p_storage_key
  for update;

  if job.id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if job.state = 'completed' then
    return jsonb_build_object('state', 'completed', 'job_id', job.id);
  end if;
  if job.claim_token is distinct from p_claim_token then
    return jsonb_build_object('state', 'stale', 'job_id', job.id);
  end if;

  if p_storage_absence_confirmed and job.upload_id is not null and not exists (
    select 1 from public.assignment_media_uploads upload
    where upload.id = job.upload_id
      and upload.assignment_id = job.assignment_id
      and upload.owner_id = job.owner_id
      and upload.storage_key = job.temporary_storage_key
      and upload.finalized_at is not null
      and upload.cleanup_state = 'completed'
      and upload.cleanup_completed_at is not null
      and upload.temporary_removed_at >= upload.cleanup_quiescence_not_before
      and not exists (
        select 1 from public.assignment_media_upload_candidates candidate
        where candidate.upload_id = upload.id
          and candidate.promoted_at is null
          and candidate.closed_at is null
      )
  ) then
    database_failure := 'upload_cleanup_incomplete';
  elsif p_storage_absence_confirmed then
    begin
      delete from public.media_assets
      where id = job.media_asset_id
        and assignment_id = job.assignment_id
        and owner_id = job.owner_id
        and storage_key = job.storage_key;

      if job.upload_id is not null then
        delete from public.assignment_media_uploads
        where id = job.upload_id
          and assignment_id = job.assignment_id
          and owner_id = job.owner_id
          and storage_key = job.temporary_storage_key
          and cleanup_state = 'completed';
        if not found then
          raise exception 'completed upload tombstone was not deleted' using errcode = '55000';
        end if;
      end if;

      update public.media_asset_deletion_jobs
      set state = 'completed',
          claim_token = null,
          claim_expires_at = null,
          storage_removed_at = case
            when p_storage_removed then coalesce(storage_removed_at, p_now)
            else storage_removed_at
          end,
          storage_absence_confirmed_at = coalesce(storage_absence_confirmed_at, p_now),
          completed_at = coalesce(completed_at, p_now),
          last_error = null,
          updated_at = p_now
      where id = job.id;

      return jsonb_build_object('state', 'completed', 'job_id', job.id);
    exception when others then
      database_failure := 'database_finalize_failed';
    end;
  end if;

  next_attempts := least(job.attempts + 1, 12);
  retry_delay := least(
    interval '6 hours',
    interval '5 minutes' * power(2, least(job.attempts, 6))
  );

  update public.media_asset_deletion_jobs
  set state = case when next_attempts >= 12 then 'dead_lettered' else 'retry' end,
      attempts = next_attempts,
      next_attempt_at = p_now + retry_delay,
      claim_token = null,
      claim_expires_at = null,
      storage_removed_at = case
        when p_storage_removed then coalesce(storage_removed_at, p_now)
        else storage_removed_at
      end,
      last_error = left(coalesce(database_failure, p_failure_code, 'media_deletion_failed'), 120),
      dead_lettered_at = case
        when next_attempts >= 12 then coalesce(dead_lettered_at, p_now)
        else null
      end,
      dead_letter_error_code = case
        when next_attempts >= 12 then left(coalesce(database_failure, p_failure_code, 'media_deletion_failed'), 120)
        else null
      end,
      updated_at = p_now
  where id = job.id
  returning * into job;

  return jsonb_build_object(
    'state', job.state,
    'job_id', job.id,
    'attempts', job.attempts,
    'next_attempt_at', job.next_attempt_at,
    'dead_lettered_at', job.dead_lettered_at,
    'dead_letter_error_code', job.dead_letter_error_code
  );
end;
$$;

create or replace function public.recover_assignment_media_deletion(
  p_job_id uuid,
  p_media_asset_id uuid,
  p_assignment_id uuid,
  p_owner_id uuid,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  job public.media_asset_deletion_jobs%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  select * into job
  from public.media_asset_deletion_jobs
  where id = p_job_id
    and media_asset_id = p_media_asset_id
    and assignment_id = p_assignment_id
    and owner_id = p_owner_id
  for update;

  if job.id is null then
    return jsonb_build_object('state', 'absent');
  end if;
  if job.state <> 'dead_lettered' then
    return jsonb_build_object('state', 'not_dead_lettered', 'job_id', job.id);
  end if;

  update public.media_asset_deletion_jobs
  set state = 'retry',
      attempts = 0,
      next_attempt_at = p_now,
      claim_token = null,
      claim_expires_at = null,
      last_error = null,
      dead_lettered_at = null,
      dead_letter_error_code = null,
      updated_at = p_now
  where id = job.id
  returning * into job;

  return jsonb_build_object(
    'state', 'recovered',
    'job_id', job.id,
    'next_attempt_at', job.next_attempt_at
  );
end;
$$;

create or replace function public.get_assignment_media_deletion_monitoring(
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if p_now is null or not isfinite(p_now) then
    raise exception 'deletion time is invalid' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'dead_letter_count', count(*) filter (where state = 'dead_lettered'),
    'oldest_dead_letter_age_seconds', floor(extract(epoch from (
      p_now - min(dead_lettered_at) filter (where state = 'dead_lettered')
    )))::bigint,
    'retry_count', count(*) filter (where state = 'retry'),
    'due_count', count(*) filter (
      where state in ('requested', 'retry', 'processing')
        and next_attempt_at <= p_now
        and (state <> 'processing' or claim_expires_at <= p_now)
    ),
    'processing_count', count(*) filter (
      where state = 'processing' and claim_expires_at > p_now
    )
  ) into result
  from public.media_asset_deletion_jobs;

  return result;
end;
$$;

revoke execute on function public.create_assignment_media_upload_intent(uuid, uuid, uuid, text, text, text, text, bigint)
  from public, anon, authenticated;
revoke execute on function public.record_assignment_media_upload_token_expiry(uuid, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.mark_assignment_media_upload_token_issuance_failed(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.claim_assignment_media_upload(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.revalidate_assignment_media_upload_claim(uuid, uuid, uuid, uuid, bigint, text)
  from public, anon, authenticated;
revoke execute on function public.finalize_assignment_media_upload(uuid, uuid, uuid, uuid, bigint, text, text, bigint)
  from public, anon, authenticated;
revoke execute on function public.cleanup_assignment_media_copy(uuid, uuid, uuid, uuid, bigint, text)
  from public, anon, authenticated;
revoke execute on function public.complete_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, boolean, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.claim_due_assignment_media_candidate_cleanups(uuid, integer, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.complete_claimed_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, uuid, boolean, boolean, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.discard_assignment_media_upload(uuid, uuid, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.complete_assignment_media_upload_cleanup(uuid, uuid, uuid, uuid, boolean, boolean, boolean, boolean, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.recover_assignment_media_upload_cleanup(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.recover_assignment_media_candidate_cleanup(uuid, uuid, uuid, bigint, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.get_assignment_media_upload_cleanup_monitoring(timestamptz)
  from public, anon, authenticated;
revoke execute on function public.request_assignment_media_deletion(uuid, uuid, uuid, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.request_due_assignment_media_retention_deletions(integer, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.claim_assignment_media_deletion(uuid, uuid, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.claim_due_assignment_media_deletions(uuid, integer, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.complete_assignment_media_deletion(uuid, uuid, uuid, uuid, text, uuid, boolean, boolean, text, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.recover_assignment_media_deletion(uuid, uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.get_assignment_media_deletion_monitoring(timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_assignment_media_upload_intent(uuid, uuid, uuid, text, text, text, text, bigint)
  to service_role;
grant execute on function public.record_assignment_media_upload_token_expiry(uuid, uuid, uuid, text, timestamptz)
  to service_role;
grant execute on function public.mark_assignment_media_upload_token_issuance_failed(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.claim_assignment_media_upload(uuid, uuid, uuid, uuid)
  to service_role;
grant execute on function public.revalidate_assignment_media_upload_claim(uuid, uuid, uuid, uuid, bigint, text)
  to service_role;
grant execute on function public.finalize_assignment_media_upload(uuid, uuid, uuid, uuid, bigint, text, text, bigint)
  to service_role;
grant execute on function public.cleanup_assignment_media_copy(uuid, uuid, uuid, uuid, bigint, text)
  to service_role;
grant execute on function public.complete_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, boolean, text, timestamptz)
  to service_role;
grant execute on function public.claim_due_assignment_media_candidate_cleanups(uuid, integer, timestamptz)
  to service_role;
grant execute on function public.complete_claimed_assignment_media_candidate_cleanup(uuid, uuid, uuid, uuid, bigint, text, uuid, boolean, boolean, text, timestamptz)
  to service_role;
grant execute on function public.discard_assignment_media_upload(uuid, uuid, uuid, uuid)
  to service_role;
grant execute on function public.complete_assignment_media_upload_cleanup(uuid, uuid, uuid, uuid, boolean, boolean, boolean, boolean, text, timestamptz)
  to service_role;
grant execute on function public.recover_assignment_media_upload_cleanup(uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.recover_assignment_media_candidate_cleanup(uuid, uuid, uuid, bigint, timestamptz)
  to service_role;
grant execute on function public.get_assignment_media_upload_cleanup_monitoring(timestamptz)
  to service_role;
grant execute on function public.request_assignment_media_deletion(uuid, uuid, uuid, text, timestamptz)
  to service_role;
grant execute on function public.request_due_assignment_media_retention_deletions(integer, timestamptz)
  to service_role;
grant execute on function public.claim_assignment_media_deletion(uuid, uuid, uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.claim_due_assignment_media_deletions(uuid, integer, timestamptz)
  to service_role;
grant execute on function public.complete_assignment_media_deletion(uuid, uuid, uuid, uuid, text, uuid, boolean, boolean, text, timestamptz)
  to service_role;
grant execute on function public.recover_assignment_media_deletion(uuid, uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function public.get_assignment_media_deletion_monitoring(timestamptz)
  to service_role;

drop policy if exists assignment_submission_files_owner_select on public.assignment_submission_files;
drop policy if exists assignment_submission_files_owner_insert on public.assignment_submission_files;
drop policy if exists assignment_submission_files_owner_delete on public.assignment_submission_files;

create policy assignment_submission_files_owner_select
on public.assignment_submission_files for select
using (
  owner_id = auth.uid()
  and storage_key like auth.uid()::text || '/%'
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = assignment_submission_files.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

create policy assignment_submission_files_owner_insert
on public.assignment_submission_files for insert
with check (
  owner_id = auth.uid()
  and storage_key like auth.uid()::text || '/%'
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = assignment_submission_files.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

create policy assignment_submission_files_owner_delete
on public.assignment_submission_files for delete
using (owner_id = auth.uid() and storage_key like auth.uid()::text || '/%');

drop policy if exists assignment_sources_owner_insert on public.assignment_sources;
drop policy if exists assignment_sources_owner_update on public.assignment_sources;

create policy assignment_sources_owner_insert
on public.assignment_sources for insert
with check (
  owner_id = auth.uid()
  and (storage_key is null or storage_key like auth.uid()::text || '/%')
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = assignment_sources.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

create policy assignment_sources_owner_update
on public.assignment_sources for update
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and (storage_key is null or storage_key like auth.uid()::text || '/%')
  and exists (
    select 1 from public.assignments assignment
    where assignment.id = assignment_sources.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

drop policy if exists "notes: owner full access" on public.notes;
create policy "notes: owner full access"
on public.notes for all
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (audio_storage_key is null or audio_storage_key like (select auth.uid())::text || '/%')
  and (doc_storage_key is null or doc_storage_key like (select auth.uid())::text || '/%')
);

drop policy if exists "inbox_items: owner full access" on public.inbox_items;
create policy "inbox_items: owner full access"
on public.inbox_items for all
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (photo_storage_key is null or photo_storage_key like (select auth.uid())::text || '/%')
);
