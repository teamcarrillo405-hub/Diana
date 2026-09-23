-- Run against a disposable database with all migrations applied, using an
-- administrative connection that can create dblink:
-- psql -v ON_ERROR_STOP=1 -v database_url="$DATABASE_URL" "$DATABASE_URL" -f supabase/tests/upload_claim_epoch_contract.sql
\set ON_ERROR_STOP on

\if :{?database_url}
\else
  \echo 'database_url psql variable is required'
  \quit
\endif

create schema if not exists extensions;
create extension if not exists dblink with schema extensions;

do $grants$
begin
  if has_function_privilege(
    'authenticated',
    'public.claim_assignment_media_upload(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute upload claim RPC';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.finalize_assignment_media_upload(uuid,uuid,uuid,uuid,bigint,text,text,bigint)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.revalidate_assignment_media_upload_claim(uuid,uuid,uuid,uuid,bigint,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute upload finalize RPC';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.claim_due_assignment_media_candidate_cleanups(uuid,integer,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.complete_claimed_assignment_media_candidate_cleanup(uuid,uuid,uuid,uuid,bigint,text,uuid,boolean,boolean,text,timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute candidate cleanup RPCs';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.recover_assignment_media_upload_cleanup(uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.recover_assignment_media_candidate_cleanup(uuid,uuid,uuid,bigint,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.get_assignment_media_upload_cleanup_monitoring(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute tombstone recovery or monitoring RPCs';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.request_assignment_media_deletion(uuid,uuid,uuid,text,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.claim_assignment_media_deletion(uuid,uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.complete_assignment_media_deletion(uuid,uuid,uuid,uuid,text,uuid,boolean,boolean,text,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.recover_assignment_media_deletion(uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.get_assignment_media_deletion_monitoring(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'authenticated can execute media deletion job RPCs';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.claim_assignment_media_upload(uuid,uuid,uuid,uuid)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.finalize_assignment_media_upload(uuid,uuid,uuid,uuid,bigint,text,text,bigint)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.revalidate_assignment_media_upload_claim(uuid,uuid,uuid,uuid,bigint,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.claim_due_assignment_media_candidate_cleanups(uuid,integer,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.complete_claimed_assignment_media_candidate_cleanup(uuid,uuid,uuid,uuid,bigint,text,uuid,boolean,boolean,text,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.recover_assignment_media_upload_cleanup(uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.recover_assignment_media_candidate_cleanup(uuid,uuid,uuid,bigint,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.get_assignment_media_upload_cleanup_monitoring(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'service_role is missing upload claim, finalize, or cleanup RPC access';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.request_assignment_media_deletion(uuid,uuid,uuid,text,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.request_due_assignment_media_retention_deletions(integer,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.claim_assignment_media_deletion(uuid,uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.claim_due_assignment_media_deletions(uuid,integer,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.complete_assignment_media_deletion(uuid,uuid,uuid,uuid,text,uuid,boolean,boolean,text,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.recover_assignment_media_deletion(uuid,uuid,uuid,uuid,timestamptz)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.get_assignment_media_deletion_monitoring(timestamptz)',
    'EXECUTE'
  ) then
    raise exception 'service_role is missing media deletion job RPC access';
  end if;
  if has_table_privilege('authenticated', 'public.assignment_media_upload_candidates', 'INSERT')
    or has_table_privilege('authenticated', 'public.assignment_media_upload_candidates', 'UPDATE')
    or has_table_privilege('authenticated', 'public.assignment_media_upload_candidates', 'DELETE') then
    raise exception 'authenticated can mutate upload candidates';
  end if;
  if has_table_privilege('authenticated', 'public.media_asset_deletion_jobs', 'SELECT')
    or has_table_privilege('authenticated', 'public.media_asset_deletion_jobs', 'INSERT')
    or has_table_privilege('authenticated', 'public.media_asset_deletion_jobs', 'UPDATE')
    or has_table_privilege('authenticated', 'public.media_asset_deletion_jobs', 'DELETE') then
    raise exception 'authenticated can read or mutate media deletion jobs';
  end if;
end;
$grants$;

begin;
set local session_replication_role = replica;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000201',
  'authenticated',
  'authenticated',
  'upload-claim-contract@example.invalid',
  '',
  clock_timestamp(),
  '{}'::jsonb,
  '{}'::jsonb,
  clock_timestamp(),
  clock_timestamp()
);

insert into public.assignments (
  id, owner_id, class_id, title, status
) values (
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000203',
  'Upload claim epoch contract',
  'todo'
);

set local session_replication_role = origin;

insert into public.assignment_media_uploads (
  id, assignment_id, owner_id, media_kind, storage_key, file_name,
  declared_mime_type, declared_size_bytes, consent_confirmed_at,
  signed_upload_expires_at, cleanup_quiescence_not_before, expires_at
) values (
  '00000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000201',
  'video',
  '00000000-0000-4000-8000-000000000201/00000000-0000-4000-8000-000000000202/00000000-0000-4000-8000-000000000204.mp4',
  'contract.mp4',
  'video/mp4',
  1024,
  clock_timestamp(),
  clock_timestamp() + interval '2 hours 10 minutes',
  clock_timestamp() + interval '2 hours 35 minutes',
  clock_timestamp() + interval '2 hours'
);
commit;

select extensions.dblink_connect('upload_lease_a', :'database_url');
select extensions.dblink_connect('upload_lease_b', :'database_url');
select extensions.dblink_exec('upload_lease_a', 'begin');

select result
from extensions.dblink(
  'upload_lease_a',
  $sql$
    select public.claim_assignment_media_upload(
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000205'
    )
  $sql$
) as claimed(result jsonb);

select extensions.dblink_send_query(
  'upload_lease_b',
  $sql$
    select public.claim_assignment_media_upload(
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000206'
    )
  $sql$
);
select pg_sleep(0.2);

do $locking$
begin
  if extensions.dblink_is_busy('upload_lease_b') <> 1 then
    raise exception 'session B did not block on the upload row lock';
  end if;
end;
$locking$;

select extensions.dblink_exec('upload_lease_a', 'commit');

do $busy_result$
declare
  result jsonb;
begin
  select response.result into result
  from extensions.dblink_get_result('upload_lease_b') as response(result jsonb);
  if result->>'state' <> 'busy' then
    raise exception 'session B did not observe A active claim after lock release: %', result;
  end if;
end;
$busy_result$;

-- A completed all verification and the exact final database fence, then pauses
-- immediately before the non-transactional storage copy.
do $a_pre_copy_revalidation$
declare
  result jsonb;
  first_key text;
begin
  select storage_key into first_key
  from public.assignment_media_upload_candidates
  where upload_id = '00000000-0000-4000-8000-000000000204' and claim_epoch = 1;

  result := public.revalidate_assignment_media_upload_claim(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000205',
    1,
    first_key
  );
  if result->>'state' <> 'active' then
    raise exception 'verifier A did not pass the immediate pre-copy fence: %', result;
  end if;
end;
$a_pre_copy_revalidation$;

update public.assignment_media_uploads
set claim_expires_at = clock_timestamp() - interval '1 second'
where id = '00000000-0000-4000-8000-000000000204';

do $takeover$
declare
  result jsonb;
  first_key text;
  second_key text;
begin
  result := public.claim_assignment_media_upload(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000206'
  );
  if result->>'state' <> 'claimed' or (result->>'claim_epoch')::bigint <> 2 then
    raise exception 'takeover did not allocate claim epoch 2: %', result;
  end if;

  select storage_key into first_key
  from public.assignment_media_upload_candidates
  where upload_id = '00000000-0000-4000-8000-000000000204' and claim_epoch = 1;
  select storage_key into second_key
  from public.assignment_media_upload_candidates
  where upload_id = '00000000-0000-4000-8000-000000000204' and claim_epoch = 2;

  if first_key is null or second_key is null or first_key = second_key then
    raise exception 'claim epochs did not persist distinct candidate keys';
  end if;
  if not exists (
    select 1 from public.assignment_media_upload_candidates
    where upload_id = '00000000-0000-4000-8000-000000000204'
      and claim_epoch = 1
      and cleanup_requested_at is not null
      and promoted_at is null
  ) then
    raise exception 'superseded candidate cleanup was not scheduled';
  end if;

  perform public.finalize_assignment_media_upload(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000206',
    2,
    second_key,
    'video/mp4',
    1024
  );

  begin
    perform public.finalize_assignment_media_upload(
      '00000000-0000-4000-8000-000000000204',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000205',
      1,
      first_key,
      'video/mp4',
      1024
    );
    raise exception 'stale verifier A unexpectedly finalized';
  exception
    when sqlstate '55000' then null;
  end;

  if not exists (
    select 1 from public.media_assets
    where upload_intent_id = '00000000-0000-4000-8000-000000000204'
      and storage_key = second_key
  ) or exists (
    select 1 from public.media_assets
    where upload_intent_id = '00000000-0000-4000-8000-000000000204'
      and storage_key = first_key
  ) then
    raise exception 'stale A changed B promoted media row';
  end if;
end;
$takeover$;

do $candidate_dead_letter_recovery$
declare
  recovery_result jsonb;
  monitoring_result jsonb;
  candidate_a_key text;
  promoted_b_key text;
  dead_lettered_at timestamptz := clock_timestamp() - interval '2 hours';
begin
  select storage_key into candidate_a_key
  from public.assignment_media_upload_candidates
  where upload_id = '00000000-0000-4000-8000-000000000204'
    and claim_epoch = 1;
  select storage_key into promoted_b_key
  from public.media_assets
  where upload_intent_id = '00000000-0000-4000-8000-000000000204';

  update public.assignment_media_upload_candidates
  set cleanup_requested_at = coalesce(cleanup_requested_at, dead_lettered_at),
      cleanup_started_at = coalesce(cleanup_started_at, dead_lettered_at),
      cleanup_attempts = 12,
      cleanup_next_attempt_at = dead_lettered_at,
      cleanup_last_error = 'contract_candidate_cleanup_failed',
      cleanup_dead_lettered_at = dead_lettered_at,
      cleanup_claim_token = null,
      cleanup_claim_expires_at = null
  where upload_id = '00000000-0000-4000-8000-000000000204'
    and claim_epoch = 1;

  monitoring_result := public.get_assignment_media_upload_cleanup_monitoring(clock_timestamp());
  if (monitoring_result->>'candidate_dead_letter_count')::integer <> 1
    or (monitoring_result->>'candidate_oldest_dead_letter_age_seconds')::integer < 7190 then
    raise exception 'candidate dead letter was absent from cleanup monitoring: %', monitoring_result;
  end if;

  if exists (
    select 1
    from public.claim_due_assignment_media_candidate_cleanups(
      '00000000-0000-4000-8000-000000000209',
      50,
      clock_timestamp()
    )
  ) then
    raise exception 'dead-lettered candidate A was claimed before recovery';
  end if;

  recovery_result := public.recover_assignment_media_candidate_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    1,
    clock_timestamp()
  );
  if recovery_result->>'state' <> 'recovered' or not exists (
    select 1 from public.assignment_media_upload_candidates
    where upload_id = '00000000-0000-4000-8000-000000000204'
      and claim_epoch = 1
      and storage_key = candidate_a_key
      and cleanup_attempts = 0
      and cleanup_dead_lettered_at is null
  ) then
    raise exception 'candidate A recovery did not preserve and requeue exact identity: %', recovery_result;
  end if;
  if not exists (
    select 1 from public.media_assets
    where upload_intent_id = '00000000-0000-4000-8000-000000000204'
      and storage_key = promoted_b_key
  ) or promoted_b_key = candidate_a_key then
    raise exception 'candidate A recovery changed promoted candidate B';
  end if;
end;
$candidate_dead_letter_recovery$;

update public.assignment_media_upload_candidates
set cleanup_next_attempt_at = clock_timestamp() - interval '1 second'
where upload_id = '00000000-0000-4000-8000-000000000204'
  and claim_epoch = 1;

-- B is now promoted. Cron's first idempotent delete confirms A absent, but A's
-- immutable identity must remain eligible because the quiescence horizon has
-- not elapsed.
do $candidate_cleanup_before_quiescence$
declare
  cleanup_claim record;
  cleanup_result jsonb;
  promoted_key text;
  cleanup_at timestamptz := clock_timestamp();
begin
  select * into cleanup_claim
  from public.claim_due_assignment_media_candidate_cleanups(
    '00000000-0000-4000-8000-000000000207',
    500,
    cleanup_at
  );

  if not found then
    raise exception 'candidate A was not claimed for cleanup';
  end if;
  if cleanup_claim.upload_id is distinct from '00000000-0000-4000-8000-000000000204'::uuid
    or cleanup_claim.claim_token is distinct from '00000000-0000-4000-8000-000000000205'::uuid
    or cleanup_claim.claim_epoch is distinct from 1
    or cleanup_claim.cleanup_token is distinct from '00000000-0000-4000-8000-000000000207'::uuid then
    raise exception 'candidate A was not claimed with its exact identity: %', row_to_json(cleanup_claim);
  end if;
  if cleanup_claim.storage_key is null
    or cleanup_claim.storage_key not like '%/durable-e1-%' then
    raise exception 'candidate A cleanup returned an invalid storage key: %', cleanup_claim.storage_key;
  end if;

  select storage_key into promoted_key
  from public.media_assets
  where upload_intent_id = '00000000-0000-4000-8000-000000000204';
  if promoted_key is null or promoted_key = cleanup_claim.storage_key then
    raise exception 'candidate cleanup targeted promoted candidate B';
  end if;

  cleanup_result := public.complete_claimed_assignment_media_candidate_cleanup(
    cleanup_claim.upload_id,
    cleanup_claim.assignment_id,
    cleanup_claim.owner_id,
    cleanup_claim.claim_token,
    cleanup_claim.claim_epoch,
    cleanup_claim.storage_key,
    cleanup_claim.cleanup_token,
    true,
    true,
    null,
    cleanup_at
  );
  if cleanup_result->>'state' <> 'quiescing' then
    raise exception 'candidate A closed before quiescence: %', cleanup_result;
  end if;
  if not exists (
    select 1 from public.assignment_media_upload_candidates
    where upload_id = cleanup_claim.upload_id
      and claim_epoch = cleanup_claim.claim_epoch
      and claim_token = cleanup_claim.claim_token
      and storage_key = cleanup_claim.storage_key
      and removed_at is not null
      and last_absence_confirmed_at is not null
      and closed_at is null
  ) then
    raise exception 'candidate A identity was not retained after first absence confirmation';
  end if;
  if not exists (
    select 1 from public.media_assets
    where upload_intent_id = cleanup_claim.upload_id
      and storage_key = promoted_key
  ) then
    raise exception 'candidate A cleanup removed promoted candidate B';
  end if;
end;
$candidate_cleanup_before_quiescence$;

-- A resumes the pre-authorized copy and crashes. Storage recreation is modeled
-- by another successful delete/absence confirmation against the same retained
-- candidate identity ten minutes later.
update public.assignment_media_upload_candidates
set cleanup_next_attempt_at = clock_timestamp() - interval '1 second'
where upload_id = '00000000-0000-4000-8000-000000000204'
  and claim_epoch = 1;

do $candidate_recreated_then_recleaned$
declare
  cleanup_claim record;
  cleanup_result jsonb;
  cleanup_at timestamptz := clock_timestamp() + interval '10 minutes';
begin
  select * into cleanup_claim
  from public.claim_due_assignment_media_candidate_cleanups(
    '00000000-0000-4000-8000-000000000208',
    50,
    cleanup_at
  );
  if not found or cleanup_claim.claim_epoch <> 1 then
    raise exception 'recreated candidate A was not eligible for another sweep';
  end if;

  cleanup_result := public.complete_claimed_assignment_media_candidate_cleanup(
    cleanup_claim.upload_id,
    cleanup_claim.assignment_id,
    cleanup_claim.owner_id,
    cleanup_claim.claim_token,
    cleanup_claim.claim_epoch,
    cleanup_claim.storage_key,
    cleanup_claim.cleanup_token,
    true,
    true,
    null,
    cleanup_at
  );
  if cleanup_result->>'state' <> 'quiescing' then
    raise exception 'recreated candidate A closed before the horizon: %', cleanup_result;
  end if;
end;
$candidate_recreated_then_recleaned$;

-- Only a final absence confirmation at or after signed-token fence + the
-- 15-minute maximum verifier lifetime + 10-minute safety margin can close A.
update public.assignment_media_upload_candidates
set cleanup_next_attempt_at = quiescence_not_before
where upload_id = '00000000-0000-4000-8000-000000000204'
  and claim_epoch = 1;

do $candidate_post_quiescence_confirmation$
declare
  cleanup_claim record;
  cleanup_result jsonb;
  horizon timestamptz;
begin
  select quiescence_not_before into horizon
  from public.assignment_media_upload_candidates
  where upload_id = '00000000-0000-4000-8000-000000000204' and claim_epoch = 1;

  select * into cleanup_claim
  from public.claim_due_assignment_media_candidate_cleanups(
    '00000000-0000-4000-8000-000000000209',
    50,
    horizon
  );
  if not found or cleanup_claim.claim_epoch <> 1 then
    raise exception 'candidate A was not eligible for post-quiescence confirmation';
  end if;

  cleanup_result := public.complete_claimed_assignment_media_candidate_cleanup(
    cleanup_claim.upload_id,
    cleanup_claim.assignment_id,
    cleanup_claim.owner_id,
    cleanup_claim.claim_token,
    cleanup_claim.claim_epoch,
    cleanup_claim.storage_key,
    cleanup_claim.cleanup_token,
    true,
    true,
    null,
    horizon
  );
  if cleanup_result->>'state' <> 'closed' then
    raise exception 'candidate A did not close after final absence confirmation: %', cleanup_result;
  end if;
  if not exists (
    select 1 from public.assignment_media_upload_candidates
    where upload_id = cleanup_claim.upload_id
      and claim_epoch = 1
      and closed_at >= quiescence_not_before
      and last_absence_confirmed_at >= quiescence_not_before
  ) then
    raise exception 'candidate A lacks post-quiescence closure evidence';
  end if;
  if not exists (
    select 1 from public.media_assets
    where upload_intent_id = cleanup_claim.upload_id
      and storage_key like '%/durable-e2-%'
  ) then
    raise exception 'candidate cleanup changed promoted candidate B';
  end if;
end;
$candidate_post_quiescence_confirmation$;

do $tombstone_dead_letter_recovery$
declare
  cleanup_result jsonb;
  monitoring_result jsonb;
  horizon timestamptz;
begin
  select cleanup_quiescence_not_before into horizon
  from public.assignment_media_uploads
  where id = '00000000-0000-4000-8000-000000000204';

  update public.assignment_media_uploads
  set cleanup_attempts = 10,
      cleanup_state = 'pending',
      cleanup_next_attempt_at = horizon - interval '1 second',
      cleanup_last_error = null,
      cleanup_dead_lettered_at = null,
      cleanup_dead_letter_error_code = null
  where id = '00000000-0000-4000-8000-000000000204';

  cleanup_result := public.complete_assignment_media_upload_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    null,
    false,
    false,
    false,
    false,
    'contract_storage_unavailable',
    horizon - interval '1 second'
  );
  if cleanup_result->>'state' <> 'retained' or not exists (
    select 1 from public.assignment_media_uploads
    where id = '00000000-0000-4000-8000-000000000204'
      and cleanup_state = 'retry'
      and cleanup_attempts = 11
      and cleanup_dead_lettered_at is null
      and cleanup_dead_letter_error_code is null
  ) then
    raise exception 'tombstone did not enter bounded retry state: %', cleanup_result;
  end if;

  update public.assignment_media_uploads
  set cleanup_next_attempt_at = horizon
  where id = '00000000-0000-4000-8000-000000000204';

  cleanup_result := public.complete_assignment_media_upload_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    null,
    false,
    false,
    false,
    false,
    'contract_storage_unavailable',
    horizon
  );
  if cleanup_result->>'state' <> 'dead_lettered' or not exists (
    select 1 from public.assignment_media_uploads
    where id = '00000000-0000-4000-8000-000000000204'
      and cleanup_state = 'dead_lettered'
      and cleanup_attempts = 12
      and cleanup_dead_lettered_at = horizon
      and cleanup_dead_letter_error_code = 'contract_storage_unavailable'
  ) then
    raise exception 'tombstone did not dead-letter explicitly at attempt 12: %', cleanup_result;
  end if;

  monitoring_result := public.get_assignment_media_upload_cleanup_monitoring(horizon);
  if (monitoring_result->>'dead_letter_count')::integer < 1 then
    raise exception 'tombstone dead letter was absent from cleanup monitoring: %', monitoring_result;
  end if;

  cleanup_result := public.recover_assignment_media_upload_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    horizon
  );
  if cleanup_result->>'state' <> 'recovered' or not exists (
    select 1 from public.assignment_media_uploads
    where id = '00000000-0000-4000-8000-000000000204'
      and cleanup_state = 'retry'
      and cleanup_attempts = 0
      and cleanup_next_attempt_at = horizon
      and cleanup_last_error is null
      and cleanup_dead_lettered_at is null
      and cleanup_dead_letter_error_code is null
  ) then
    raise exception 'service recovery did not requeue the tombstone: %', cleanup_result;
  end if;
end;
$tombstone_dead_letter_recovery$;

do $tombstone_cleanup$
declare
  cleanup_result jsonb;
  promoted_key text;
  horizon timestamptz;
begin
  select storage_key into promoted_key
  from public.media_assets
  where upload_intent_id = '00000000-0000-4000-8000-000000000204';
  select cleanup_quiescence_not_before into horizon
  from public.assignment_media_uploads
  where id = '00000000-0000-4000-8000-000000000204';

  cleanup_result := public.complete_assignment_media_upload_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    null,
    true,
    false,
    true,
    false,
    null,
    horizon
  );
  if cleanup_result->>'state' <> 'completed' then
    raise exception 'promoted upload tombstone did not complete cleanup: %', cleanup_result;
  end if;
  if not exists (
    select 1 from public.assignment_media_uploads
    where id = '00000000-0000-4000-8000-000000000204'
      and cleanup_state = 'completed'
      and cleanup_completed_at = horizon
      and temporary_removed_at >= cleanup_quiescence_not_before
  ) then
    raise exception 'completed promoted upload tombstone was not retained';
  end if;
  if not exists (
    select 1 from public.media_assets
    where upload_intent_id = '00000000-0000-4000-8000-000000000204'
      and storage_key = promoted_key
  ) then
    raise exception 'tombstone completion removed promoted candidate B';
  end if;
end;
$tombstone_cleanup$;

create or replace function public.upload_contract_block_media_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'contract database finalize failure';
end;
$$;

do $media_deletion_database_retry$
declare
  media_id uuid;
  job_id uuid;
  v_storage_key text;
  request_result jsonb;
  claim_result jsonb;
  upload_cleanup_result jsonb;
  completion_result jsonb;
  retry_at timestamptz;
  deletion_at timestamptz;
  temporary_key text;
begin
  select id, media.storage_key into media_id, v_storage_key
  from public.media_assets
  media
  where upload_intent_id = '00000000-0000-4000-8000-000000000204';

  select cleanup_quiescence_not_before + interval '1 minute'
  into deletion_at
  from public.assignment_media_uploads
  where id = '00000000-0000-4000-8000-000000000204';

  update public.assignment_media_uploads
  set cleanup_state = 'dead_lettered',
      cleanup_completed_at = null,
      cleanup_attempts = 12,
      cleanup_next_attempt_at = deletion_at,
      cleanup_last_error = 'earlier_finalization_cleanup_failed',
      cleanup_dead_lettered_at = deletion_at - interval '1 minute',
      cleanup_dead_letter_error_code = 'earlier_finalization_cleanup_failed'
  where id = '00000000-0000-4000-8000-000000000204';

  request_result := public.request_assignment_media_deletion(
    media_id,
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    'user',
    deletion_at
  );
  job_id := (request_result->>'job_id')::uuid;
  temporary_key := request_result->>'temporary_storage_key';
  if request_result->>'state' <> 'requested'
    or job_id is null
    or (request_result->>'upload_id')::uuid is distinct from '00000000-0000-4000-8000-000000000204'::uuid
    or temporary_key is distinct from '00000000-0000-4000-8000-000000000201/00000000-0000-4000-8000-000000000202/00000000-0000-4000-8000-000000000204.mp4'
    or not exists (
      select 1 from public.assignment_media_uploads
      where id = '00000000-0000-4000-8000-000000000204'
        and cleanup_state = 'pending'
        and cleanup_attempts = 0
        and cleanup_dead_lettered_at is null
    ) then
    raise exception 'media deletion job was not durably requested: %', request_result;
  end if;

  upload_cleanup_result := public.complete_assignment_media_upload_cleanup(
    '00000000-0000-4000-8000-000000000204',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    null,
    true,
    false,
    true,
    false,
    null,
    deletion_at
  );
  if upload_cleanup_result->>'state' <> 'completed' then
    raise exception 'deletion worker did not recover the finalized upload tombstone: %', upload_cleanup_result;
  end if;

  execute format(
    'create trigger upload_contract_block_media_delete before delete on public.media_assets for each row when (old.id = %L::uuid) execute function public.upload_contract_block_media_delete()',
    media_id
  );

  claim_result := public.claim_assignment_media_deletion(
    job_id,
    media_id,
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000211',
    deletion_at
  );
  if claim_result->>'state' <> 'claimed' then
    raise exception 'media deletion job was not claimed before storage work: %', claim_result;
  end if;
  if claim_result->>'upload_id' <> '00000000-0000-4000-8000-000000000204'
    or claim_result->>'temporary_storage_key' is distinct from temporary_key then
    raise exception 'media deletion claim lost upload cleanup identity: %', claim_result;
  end if;

  completion_result := public.complete_assignment_media_deletion(
    job_id,
    media_id,
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    v_storage_key,
    '00000000-0000-4000-8000-000000000211',
    true,
    true,
    null,
    deletion_at + interval '1 minute'
  );
  if completion_result->>'state' <> 'retry' or not exists (
    select 1 from public.media_asset_deletion_jobs
    where id = job_id
      and media_asset_id = media_id
      and assignment_id = '00000000-0000-4000-8000-000000000202'
      and owner_id = '00000000-0000-4000-8000-000000000201'
      and storage_key = v_storage_key
      and state = 'retry'
      and attempts = 1
      and storage_removed_at is not null
      and last_error = 'database_finalize_failed'
  ) or not exists (
    select 1 from public.media_assets where id = media_id
  ) or not exists (
    select 1 from public.assignment_media_uploads
    where id = '00000000-0000-4000-8000-000000000204'
      and cleanup_state = 'completed'
  ) then
    raise exception 'database failure did not preserve retryable media deletion state: %', completion_result;
  end if;

  drop trigger upload_contract_block_media_delete on public.media_assets;
  select next_attempt_at into retry_at
  from public.media_asset_deletion_jobs where id = job_id;

  claim_result := public.claim_assignment_media_deletion(
    job_id,
    media_id,
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000212',
    retry_at
  );
  completion_result := public.complete_assignment_media_deletion(
    job_id,
    media_id,
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    v_storage_key,
    '00000000-0000-4000-8000-000000000212',
    false,
    true,
    null,
    retry_at
  );
  if claim_result->>'state' <> 'claimed'
    or completion_result->>'state' <> 'completed'
    or exists (select 1 from public.media_assets where id = media_id)
    or exists (
      select 1 from public.assignment_media_uploads
      where id = '00000000-0000-4000-8000-000000000204'
    )
    or not exists (
      select 1 from public.media_asset_deletion_jobs
      where id = job_id
        and state = 'completed'
        and storage_absence_confirmed_at is not null
        and completed_at is not null
    ) then
    raise exception 'media deletion retry did not finalize from retained state: %, %', claim_result, completion_result;
  end if;
end;
$media_deletion_database_retry$;

drop function public.upload_contract_block_media_delete();

insert into public.media_assets (
  id, assignment_id, owner_id, media_kind, storage_key, file_name, mime_type,
  file_size_bytes, consent_confirmed_at, retention_expires_at
) values (
  '00000000-0000-4000-8000-000000000213',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000201',
  'video',
  '00000000-0000-4000-8000-000000000201/00000000-0000-4000-8000-000000000202/durable-e3-00000000-0000-4000-8000-000000000213.mp4',
  'dead-letter-contract.mp4',
  'video/mp4',
  2048,
  '2026-08-01 00:00:00+00',
  '2026-08-01 00:00:00+00'
);

do $media_deletion_dead_letter_recovery$
declare
  request_result jsonb;
  claim_result jsonb;
  completion_result jsonb;
  recovery_result jsonb;
  monitoring_result jsonb;
  job_id uuid;
  attempt_at timestamptz := '2026-08-02 00:00:00+00';
  claim_token uuid;
  attempt integer;
begin
  if public.request_assignment_media_deletion(
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000299',
    'user',
    attempt_at
  )->>'state' <> 'absent' then
    raise exception 'owner fence exposed another owner media row';
  end if;

  request_result := public.request_assignment_media_deletion(
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    'retention',
    attempt_at
  );
  job_id := (request_result->>'job_id')::uuid;

  for attempt in 1..12 loop
    claim_token := ('00000000-0000-4000-8000-' || lpad((220 + attempt)::text, 12, '0'))::uuid;
    claim_result := public.claim_assignment_media_deletion(
      job_id,
      '00000000-0000-4000-8000-000000000213',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000201',
      claim_token,
      attempt_at
    );
    if claim_result->>'state' <> 'claimed' then
      raise exception 'media deletion retry % was not claimed: %', attempt, claim_result;
    end if;
    completion_result := public.complete_assignment_media_deletion(
      job_id,
      '00000000-0000-4000-8000-000000000213',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000201/00000000-0000-4000-8000-000000000202/durable-e3-00000000-0000-4000-8000-000000000213.mp4',
      claim_token,
      false,
      false,
      'contract_storage_unavailable',
      attempt_at
    );
    select next_attempt_at into attempt_at
    from public.media_asset_deletion_jobs where id = job_id;
  end loop;

  if completion_result->>'state' <> 'dead_lettered' or not exists (
    select 1 from public.media_asset_deletion_jobs
    where id = job_id
      and state = 'dead_lettered'
      and attempts = 12
      and dead_lettered_at is not null
      and dead_letter_error_code = 'contract_storage_unavailable'
  ) then
    raise exception 'media deletion did not dead-letter explicitly: %', completion_result;
  end if;

  monitoring_result := public.get_assignment_media_deletion_monitoring(attempt_at);
  if (monitoring_result->>'dead_letter_count')::integer <> 1
    or (monitoring_result->>'oldest_dead_letter_age_seconds')::integer < 0 then
    raise exception 'media deletion dead letter was absent from monitoring: %', monitoring_result;
  end if;

  recovery_result := public.recover_assignment_media_deletion(
    job_id,
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    attempt_at
  );
  claim_result := public.claim_assignment_media_deletion(
    job_id,
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000240',
    attempt_at
  );
  completion_result := public.complete_assignment_media_deletion(
    job_id,
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000202',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000201/00000000-0000-4000-8000-000000000202/durable-e3-00000000-0000-4000-8000-000000000213.mp4',
    '00000000-0000-4000-8000-000000000240',
    true,
    true,
    null,
    attempt_at
  );
  if recovery_result->>'state' <> 'recovered'
    or claim_result->>'state' <> 'claimed'
    or completion_result->>'state' <> 'completed'
    or exists (
      select 1 from public.media_assets
      where id = '00000000-0000-4000-8000-000000000213'
    ) then
    raise exception 'media deletion dead-letter recovery did not finish: %, %, %',
      recovery_result, claim_result, completion_result;
  end if;
end;
$media_deletion_dead_letter_recovery$;

select extensions.dblink_disconnect('upload_lease_a');
select extensions.dblink_disconnect('upload_lease_b');

delete from public.media_asset_deletion_jobs
where owner_id = '00000000-0000-4000-8000-000000000201';

delete from auth.users
where id = '00000000-0000-4000-8000-000000000201';
