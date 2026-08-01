-- Reconcile ambiguous provider submissions without repeating the provider write.

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
  v_owner_id uuid := auth.uid();
  v_receipt public.assignment_submission_receipts%rowtype;
  v_assignment_status text;
begin
  if v_owner_id is null then
    raise exception 'Not signed in.';
  end if;

  if p_status not in ('submitted', 'confirmation_pending', 'not_accepted') then
    raise exception 'Unsupported reconciliation status.';
  end if;

  select *
    into v_receipt
  from public.assignment_submission_receipts
  where id = p_receipt_id
    and owner_id = v_owner_id
  for update;

  if not found then
    raise exception 'Submission receipt is not available.';
  end if;

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
    select status
      into v_assignment_status
    from public.assignments
    where id = v_receipt.assignment_id
      and owner_id = v_owner_id
    for update;

    if not found or v_assignment_status not in ('exporting', 'submitted') then
      raise exception 'Assignment state changed before the receipt was reconciled.';
    end if;
  end if;

  update public.assignment_submission_receipts
  set status = p_status,
      provider_receipt_id = coalesce(p_provider_receipt_id, provider_receipt_id),
      provider_response = coalesce(provider_response, '{}'::jsonb) || coalesce(p_provider_response, '{}'::jsonb),
      detail = p_detail,
      updated_at = now()
  where id = v_receipt.id
    and owner_id = v_owner_id;

  if p_status = 'submitted' and v_assignment_status = 'exporting' then
    update public.assignments
    set status = 'submitted',
        submitted_at = coalesce(submitted_at, now()),
        submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where id = v_receipt.assignment_id
      and owner_id = v_owner_id;

    insert into public.task_signals(owner_id, kind, assignment_id)
    values (v_owner_id, 'completed', v_receipt.assignment_id);
  elsif p_status = 'submitted' then
    update public.assignments
    set submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where id = v_receipt.assignment_id
      and owner_id = v_owner_id;
  end if;

  return jsonb_build_object(
    'receipt_id', v_receipt.id,
    'status', p_status,
    'transitioned', v_receipt.status is distinct from p_status,
    'detail', p_detail
  );
end;
$$;

revoke all on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)
  from public;
grant execute on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)
  to authenticated;
