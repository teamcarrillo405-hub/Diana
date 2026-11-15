begin;

-- Success is an authoritative provider observation. Keep the authorization
-- marker outside the exposed schema and bind it to both the transaction and
-- backend so a direct table write cannot forge the transition.
create table if not exists private.lms_authoritative_transition_markers (
  backend_pid integer not null,
  transaction_id bigint not null,
  target_kind text not null check (
    target_kind in ('submission_receipt', 'assignment', 'grade_receipt')
  ),
  target_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (backend_pid, transaction_id, target_kind, target_id)
);

revoke all on table private.lms_authoritative_transition_markers
  from public, anon, authenticated, service_role;

drop policy if exists assignment_submission_receipts_owner_insert
  on public.assignment_submission_receipts;
revoke insert, update on table public.assignment_submission_receipts
  from public, anon, authenticated;

create or replace function private.enforce_submission_receipt_success_marker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted' then
    delete from private.lms_authoritative_transition_markers marker
    where marker.backend_pid = pg_backend_pid()
      and marker.transaction_id = txid_current()
      and marker.target_kind = 'submission_receipt'
      and marker.target_id = new.id;

    if not found then
      raise exception using
        errcode = '42501',
        message = 'submission success requires an authoritative transition';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_submission_receipt_success_marker()
  from public, anon, authenticated, service_role;

drop trigger if exists assignment_submission_receipts_success_guard
  on public.assignment_submission_receipts;
create trigger assignment_submission_receipts_success_guard
before insert or update on public.assignment_submission_receipts
for each row execute function private.enforce_submission_receipt_success_marker();

create or replace function private.submission_artifact_release_allowed(
  p_old_response jsonb,
  p_new_response jsonb,
  p_provider text
)
returns boolean
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  v_old_response jsonb;
  v_new_response jsonb;
  v_old_record_id text;
  v_new_record_id text;
  v_old_record_provider text;
  v_new_record_provider text;
  v_old_risk_state text;
  v_new_risk_state text;
  v_old_risk_id text;
  v_new_risk_id text;
  v_old_risk_provider text;
  v_new_risk_provider text;
  v_old_operation_id text;
  v_new_operation_id text;
  v_expected_artifact_id text;
  v_expected_operation_id text;
  v_resolution jsonb;
  v_artifact_possible boolean;
begin
  v_old_response := coalesce(p_old_response, '{}'::jsonb);
  v_new_response := coalesce(p_new_response, '{}'::jsonb);
  v_old_record_id := nullif(btrim(v_old_response #>>
    '{diana_submission_reconciliation,artifact,providerArtifactId}'), '');
  v_new_record_id := nullif(btrim(v_new_response #>>
    '{diana_submission_reconciliation,artifact,providerArtifactId}'), '');
  v_old_record_provider := nullif(btrim(v_old_response #>>
    '{diana_submission_reconciliation,baseline,provider}'), '');
  v_new_record_provider := nullif(btrim(v_new_response #>>
    '{diana_submission_reconciliation,baseline,provider}'), '');
  v_old_risk_state := v_old_response #>> '{diana_provider_artifact_risk,state}';
  v_new_risk_state := v_new_response #>> '{diana_provider_artifact_risk,state}';
  v_old_risk_id := nullif(btrim(v_old_response #>>
    '{diana_provider_artifact_risk,provider_artifact_id}'), '');
  v_new_risk_id := nullif(btrim(v_new_response #>>
    '{diana_provider_artifact_risk,provider_artifact_id}'), '');
  v_old_risk_provider := nullif(btrim(v_old_response #>>
    '{diana_provider_artifact_risk,provider}'), '');
  v_new_risk_provider := nullif(btrim(v_new_response #>>
    '{diana_provider_artifact_risk,provider}'), '');
  v_old_operation_id := nullif(btrim(v_old_response #>>
    '{diana_provider_artifact_risk,operation_id}'), '');
  v_new_operation_id := nullif(btrim(v_new_response #>>
    '{diana_provider_artifact_risk,operation_id}'), '');

  v_artifact_possible :=
    v_old_record_id is not null
    or v_new_record_id is not null
    or v_old_risk_state in ('possible', 'created')
    or v_new_risk_state in ('possible', 'created');
  if not v_artifact_possible then
    return true;
  end if;

  if nullif(btrim(p_provider), '') is null then
    return false;
  end if;
  if (v_old_record_id is not null and v_old_record_provider is distinct from p_provider)
    or (v_new_record_id is not null and v_new_record_provider is distinct from p_provider)
    or (v_old_risk_state in ('possible', 'created') and v_old_risk_provider is distinct from p_provider)
    or (v_new_risk_state in ('possible', 'created') and v_new_risk_provider is distinct from p_provider) then
    return false;
  end if;

  v_expected_artifact_id := coalesce(
    v_old_record_id,
    v_new_record_id,
    v_old_risk_id,
    v_new_risk_id
  );
  if (v_old_record_id is not null and v_old_record_id <> v_expected_artifact_id)
    or (v_new_record_id is not null and v_new_record_id <> v_expected_artifact_id)
    or (v_old_risk_id is not null and v_old_risk_id <> v_expected_artifact_id)
    or (v_new_risk_id is not null and v_new_risk_id <> v_expected_artifact_id) then
    return false;
  end if;

  v_expected_operation_id := coalesce(v_old_operation_id, v_new_operation_id);
  if v_old_operation_id is not null
      and v_old_operation_id <> v_expected_operation_id
    or v_new_operation_id is not null
      and v_new_operation_id <> v_expected_operation_id then
    return false;
  end if;

  v_resolution := v_new_response -> 'diana_provider_artifact_resolution';
  if jsonb_typeof(v_resolution) is distinct from 'object'
    or v_resolution ->> 'provider' is distinct from p_provider
    or (
      v_expected_operation_id is not null
      and v_resolution ->> 'operation_id' is distinct from v_expected_operation_id
    ) then
    return false;
  end if;

  if v_expected_artifact_id is not null then
    if v_resolution ->> 'provider_artifact_id' is distinct from v_expected_artifact_id then
      return false;
    end if;
    return (
      v_resolution ->> 'disposition' = 'absent'
      and v_resolution ->> 'verification' = 'provider_readback'
    ) or (
      v_resolution ->> 'disposition' = 'deleted'
      and v_resolution ->> 'verification' in ('provider_delete', 'provider_readback')
    );
  end if;

  return v_expected_operation_id is not null
    and v_resolution ? 'provider_artifact_id'
    and v_resolution -> 'provider_artifact_id' = 'null'::jsonb
    and v_resolution ->> 'disposition' = 'not_created'
    and v_resolution ->> 'verification' = 'definitive_provider_rejection';
end;
$$;

revoke all on function private.submission_artifact_release_allowed(jsonb, jsonb, text)
  from public, anon, authenticated, service_role;

create or replace function private.enforce_submission_artifact_release_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'confirmation_pending'
    and new.status = 'not_accepted'
    and not private.submission_artifact_release_allowed(
      old.provider_response,
      new.provider_response,
      old.provider
    ) then
    raise exception using
      errcode = '42501',
      message = 'provider artifact release requires exact absence or cleanup evidence';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_submission_artifact_release_evidence()
  from public, anon, authenticated, service_role;

drop trigger if exists assignment_submission_receipts_artifact_release_guard
  on public.assignment_submission_receipts;
create trigger assignment_submission_receipts_artifact_release_guard
before update on public.assignment_submission_receipts
for each row execute function private.enforce_submission_artifact_release_evidence();

create or replace function public.update_assignment_submission_receipt(
  p_receipt_id uuid,
  p_status text,
  p_detail text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.assignment_submission_receipts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;
  if p_status not in ('not_accepted', 'confirmation_pending') then
    raise exception 'Unsupported receipt status.';
  end if;
  if p_detail is null or length(p_detail) > 2000 then
    raise exception 'Invalid receipt detail.';
  end if;

  select receipt.*
    into v_receipt
  from public.assignment_submission_receipts receipt
  where receipt.id = p_receipt_id
    and receipt.owner_id = auth.uid()
    and receipt.status in ('prepared', 'confirmation_pending')
  for update;

  if not found then
    raise exception 'Submission receipt is not available for update.';
  end if;
  if v_receipt.status = 'confirmation_pending'
    and p_status = 'not_accepted'
    and not private.submission_artifact_release_allowed(
      v_receipt.provider_response,
      v_receipt.provider_response,
      v_receipt.provider
    ) then
    raise exception 'Provider artifact reconciliation is required before another attempt.';
  end if;

  update public.assignment_submission_receipts receipt
  set status = p_status,
      detail = p_detail,
      updated_at = now()
  where receipt.id = v_receipt.id;
end;
$$;

revoke all on function public.update_assignment_submission_receipt(uuid, text, text)
  from public, anon;
grant execute on function public.update_assignment_submission_receipt(uuid, text, text)
  to authenticated;

create or replace function private.enforce_assignment_provider_success_marker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_provider_backed boolean := false;
  v_new_provider_backed boolean :=
    coalesce(new.external_source in ('canvas', 'google_classroom'), false);
  v_has_success boolean :=
    new.status = 'submitted'
    or new.submission_sync_status = 'marked_submitted'
    or new.submission_synced_at is not null;
  v_establishes_success boolean := false;
  v_attaches_provider boolean := false;
  v_detaches_provider boolean := false;
  v_requires_marker boolean := false;
begin
  if tg_op = 'INSERT' then
    v_requires_marker := v_new_provider_backed and v_has_success;
  else
    v_old_provider_backed :=
      coalesce(old.external_source in ('canvas', 'google_classroom'), false);
    v_establishes_success :=
      (new.status = 'submitted' and old.status is distinct from new.status)
      or (
        new.submission_sync_status = 'marked_submitted'
        and old.submission_sync_status is distinct from new.submission_sync_status
      )
      or (
        new.submission_synced_at is not null
        and old.submission_synced_at is distinct from new.submission_synced_at
      );
    v_attaches_provider := not v_old_provider_backed and v_new_provider_backed;
    v_detaches_provider :=
      v_old_provider_backed
      and old.external_source is distinct from new.external_source;
    v_requires_marker :=
      ((v_old_provider_backed or v_new_provider_backed) and v_establishes_success)
      or (v_attaches_provider and v_has_success)
      or v_detaches_provider;
  end if;

  if v_requires_marker then
    delete from private.lms_authoritative_transition_markers marker
    where marker.backend_pid = pg_backend_pid()
      and marker.transaction_id = txid_current()
      and marker.target_kind = 'assignment'
      and marker.target_id = new.id;

    if not found then
      raise exception using
        errcode = '42501',
        message = 'provider assignment transition requires authoritative confirmation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_assignment_provider_success_marker()
  from public, anon, authenticated, service_role;

drop trigger if exists assignments_provider_success_guard on public.assignments;
create trigger assignments_provider_success_guard
before insert or update on public.assignments
for each row execute function private.enforce_assignment_provider_success_marker();

create or replace function private.enforce_grade_receipt_success_marker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'synced' then
    delete from private.lms_authoritative_transition_markers marker
    where marker.backend_pid = pg_backend_pid()
      and marker.transaction_id = txid_current()
      and marker.target_kind = 'grade_receipt'
      and marker.target_id = new.id;

    if not found then
      raise exception using
        errcode = '42501',
        message = 'grade sync success requires an authoritative transition';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_grade_receipt_success_marker()
  from public, anon, authenticated, service_role;

drop trigger if exists lms_grade_sync_receipts_success_guard
  on public.lms_grade_sync_receipts;
create trigger lms_grade_sync_receipts_success_guard
before insert or update on public.lms_grade_sync_receipts
for each row execute function private.enforce_grade_receipt_success_marker();

create or replace function public.reconcile_assignment_submission_receipt(
  p_receipt_id uuid,
  p_status text,
  p_provider_receipt_id text,
  p_detail text,
  p_provider_response jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt public.assignment_submission_receipts%rowtype;
  v_owner_id uuid;
  v_assignment_status text;
  v_assignment_provider text;
begin
  if p_status not in ('submitted', 'confirmation_pending', 'not_accepted') then
    raise exception 'Unsupported reconciliation status.';
  end if;
  if p_provider_response is null
    or jsonb_typeof(p_provider_response) <> 'object'
    or octet_length(p_provider_response::text) > 65536 then
    raise exception 'Invalid provider response.';
  end if;
  if p_detail is null or length(p_detail) > 2000 then
    raise exception 'Invalid reconciliation detail.';
  end if;
  if p_provider_receipt_id is not null and length(p_provider_receipt_id) > 1000 then
    raise exception 'Invalid provider receipt.';
  end if;

  select receipt.*
    into v_receipt
  from public.assignment_submission_receipts receipt
  where receipt.id = p_receipt_id
  for update;

  if not found then
    raise exception 'Submission receipt is not available.';
  end if;
  v_owner_id := v_receipt.owner_id;

  if v_receipt.status in ('submitted', 'not_accepted') then
    return jsonb_build_object(
      'receipt_id', v_receipt.id,
      'status', v_receipt.status,
      'transitioned', false,
      'detail', v_receipt.detail
    );
  end if;

  if v_receipt.status not in ('prepared', 'confirmation_pending') then
    raise exception 'Submission receipt is not ready for a status check.';
  end if;

  if p_status = 'submitted' then
    if nullif(btrim(p_provider_receipt_id), '') is null then
      raise exception 'Submitted receipt requires provider confirmation.';
    end if;
    if p_provider_response ->> 'diana_reconciliation_verified' is distinct from 'true' then
      raise exception 'Submitted receipt requires verified provider read-back.';
    end if;

    select assignment.status, assignment.external_source
      into v_assignment_status, v_assignment_provider
    from public.assignments assignment
    where assignment.id = v_receipt.assignment_id
      and assignment.owner_id = v_owner_id
    for update;

    if not found or v_assignment_status not in ('exporting', 'submitted') then
      raise exception 'Assignment state changed before the receipt was reconciled.';
    end if;

    insert into private.lms_authoritative_transition_markers (
      backend_pid,
      transaction_id,
      target_kind,
      target_id
    ) values (
      pg_backend_pid(),
      txid_current(),
      'submission_receipt',
      v_receipt.id
    )
    on conflict do nothing;

    if v_assignment_provider in ('canvas', 'google_classroom') then
      insert into private.lms_authoritative_transition_markers (
        backend_pid,
        transaction_id,
        target_kind,
        target_id
      ) values (
        pg_backend_pid(),
        txid_current(),
        'assignment',
        v_receipt.assignment_id
      )
      on conflict do nothing;
    end if;
  end if;

  update public.assignment_submission_receipts receipt
  set status = p_status,
      provider_receipt_id = case
        when p_status = 'submitted' then btrim(p_provider_receipt_id)
        else receipt.provider_receipt_id
      end,
      provider_response = coalesce(receipt.provider_response, '{}'::jsonb)
        || p_provider_response,
      detail = p_detail,
      updated_at = now()
  where receipt.id = v_receipt.id;

  if p_status = 'submitted' and v_assignment_status = 'exporting' then
    update public.assignments assignment
    set status = 'submitted',
        submitted_at = coalesce(assignment.submitted_at, now()),
        submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where assignment.id = v_receipt.assignment_id
      and assignment.owner_id = v_owner_id;

    insert into public.task_signals(owner_id, kind, assignment_id)
    values (v_owner_id, 'completed', v_receipt.assignment_id);
  elsif p_status = 'submitted' then
    update public.assignments assignment
    set submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where assignment.id = v_receipt.assignment_id
      and assignment.owner_id = v_owner_id;
  end if;

  return jsonb_build_object(
    'receipt_id', v_receipt.id,
    'status', p_status,
    'transitioned', v_receipt.status is distinct from p_status,
    'detail', p_detail
  );
end;
$$;

create or replace function public.complete_assignment_submission(
  p_receipt_id uuid,
  p_provider_receipt_id text,
  p_detail text,
  p_provider_response jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.reconcile_assignment_submission_receipt(
    p_receipt_id,
    'submitted',
    p_provider_receipt_id,
    p_detail,
    p_provider_response
  );
end;
$$;

create or replace function public.complete_lms_grade_sync_receipt(
  p_receipt_id uuid,
  p_final_status text,
  p_provider_receipt_id text default null,
  p_provider_response jsonb default '{}'::jsonb,
  p_error_detail text default null
)
returns table (
  receipt_id uuid,
  receipt_status text,
  completed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_receipt public.lms_grade_sync_receipts%rowtype;
begin
  if p_final_status not in ('synced', 'confirmation_pending', 'not_accepted') then
    raise exception using errcode = '22023', message = 'invalid grade receipt transition';
  end if;
  if p_provider_response is null
    or jsonb_typeof(p_provider_response) <> 'object'
    or octet_length(p_provider_response::text) > 65536 then
    raise exception using errcode = '22023', message = 'invalid provider response';
  end if;
  if p_provider_receipt_id is not null and length(p_provider_receipt_id) > 1000 then
    raise exception using errcode = '22023', message = 'invalid provider receipt';
  end if;
  if p_error_detail is not null and length(p_error_detail) > 1000 then
    raise exception using errcode = '22023', message = 'invalid error detail';
  end if;

  select receipt.*
  into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.id = p_receipt_id
  for update;
  if not found then return; end if;

  if current_receipt.status in ('synced', 'not_accepted') then
    return query select current_receipt.id, current_receipt.status, false;
    return;
  end if;
  if current_receipt.status not in ('syncing', 'confirmation_pending') then
    return query select current_receipt.id, current_receipt.status, false;
    return;
  end if;

  if p_final_status = 'synced' then
    if nullif(btrim(p_provider_receipt_id), '') is null then
      raise exception using errcode = '22023',
        message = 'synced receipt requires provider confirmation';
    end if;
    if p_provider_response ->> 'verification' is distinct from 'provider_readback'
      or p_provider_response ->> 'provider' is distinct from current_receipt.provider
      or p_provider_response ->> 'provider_receipt_id' is distinct from btrim(p_provider_receipt_id)
      or nullif(btrim(p_provider_response ->> 'provider_state'), '') is null
      or jsonb_typeof(p_provider_response -> 'observed_score') is distinct from 'number'
      or (p_provider_response ->> 'observed_score')::numeric is distinct from current_receipt.score
      or (
        current_receipt.provider = 'google_classroom'
        and (
          jsonb_typeof(p_provider_response -> 'observed_draft_score') is distinct from 'number'
          or (p_provider_response ->> 'observed_draft_score')::numeric
            is distinct from current_receipt.score
        )
      ) then
      raise exception using errcode = '22023',
        message = 'synced receipt requires matching provider read-back evidence';
    end if;

    insert into private.lms_authoritative_transition_markers (
      backend_pid,
      transaction_id,
      target_kind,
      target_id
    ) values (
      pg_backend_pid(),
      txid_current(),
      'grade_receipt',
      current_receipt.id
    )
    on conflict do nothing;
  end if;

  update public.lms_grade_sync_receipts receipt
  set status = p_final_status,
      provider_receipt_id = case
        when p_final_status = 'synced' then btrim(p_provider_receipt_id)
        else receipt.provider_receipt_id
      end,
      provider_response = coalesce(receipt.provider_response, '{}'::jsonb)
        || p_provider_response,
      error_detail = case
        when p_final_status = 'synced' then null
        else p_error_detail
      end,
      synced_at = case when p_final_status = 'synced' then now() else receipt.synced_at end
  where receipt.id = current_receipt.id
    and receipt.status in ('syncing', 'confirmation_pending')
  returning receipt.* into current_receipt;

  return query select current_receipt.id, current_receipt.status, true;
end;
$$;

revoke all on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)
  to service_role;

revoke all on function public.complete_assignment_submission(uuid, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_assignment_submission(uuid, text, text, jsonb)
  to service_role;

revoke all on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  to service_role;

comment on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb) is
  'Service-only provider reconciliation. Success marks the receipt and assignment transaction for guarded writes.';
comment on function public.complete_assignment_submission(uuid, text, text, jsonb) is
  'Deprecated service-only wrapper around guarded provider reconciliation.';
comment on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text) is
  'Service-only grade completion. Synced status requires provider read-back evidence matching the locked receipt.';

commit;
