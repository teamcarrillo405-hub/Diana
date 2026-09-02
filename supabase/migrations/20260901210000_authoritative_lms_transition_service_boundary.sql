begin;

-- Provider acceptance is authoritative external state. These functions are
-- callable only with the service role and derive ownership from locked rows.
-- A browser session can prepare or hold a receipt, but it cannot assert that
-- Canvas or Classroom accepted work or a grade.
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

    select assignment.status
      into v_assignment_status
    from public.assignments assignment
    where assignment.id = v_receipt.assignment_id
      and assignment.owner_id = v_owner_id
    for update;

    if not found or v_assignment_status not in ('exporting', 'submitted') then
      raise exception 'Assignment state changed before the receipt was reconciled.';
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
  if p_final_status = 'synced' and nullif(btrim(p_provider_receipt_id), '') is null then
    raise exception using errcode = '22023', message = 'synced receipt requires provider confirmation';
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
  'Service-only provider read-back transition. Ownership is derived from the locked receipt.';
comment on function public.complete_assignment_submission(uuid, text, text, jsonb) is
  'Deprecated service-only wrapper. Submission success requires verified reconciliation evidence.';
comment on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text) is
  'Service-only grade receipt transition. Supports read-back reconciliation from confirmation-pending.';

commit;
