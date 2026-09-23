-- Submission safety: idempotent provider delivery receipts and atomic lifecycle updates.

alter table public.assignment_submission_receipts
  add column if not exists idempotency_key uuid,
  add column if not exists submission_file_id uuid references public.assignment_submission_files(id) on delete set null,
  add column if not exists provider_response jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

update public.assignment_submission_receipts
set idempotency_key = id
where idempotency_key is null;

alter table public.assignment_submission_receipts
  alter column idempotency_key set not null;

alter table public.assignment_submission_receipts
  drop constraint if exists assignment_submission_receipts_status_check;

update public.assignment_submission_receipts
set status = 'not_accepted'
where status = 'failed';

alter table public.assignment_submission_receipts
  add constraint assignment_submission_receipts_status_check
  check (status in ('prepared', 'confirmation_pending', 'submitted', 'unsupported', 'not_accepted'));

create unique index if not exists assignment_submission_receipts_idempotency_idx
  on public.assignment_submission_receipts(owner_id, idempotency_key);

create index if not exists assignment_submission_receipts_active_idx
  on public.assignment_submission_receipts(assignment_id, provider, status, updated_at desc);


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

  if p_capability = 'upload_file' and not exists (
    select 1
    from public.assignment_submission_files
    where id = p_submission_file_id
      and assignment_id = p_assignment_id
      and owner_id = v_owner_id
  ) then
    raise exception 'Delivery file is not available for this assignment.';
  end if;

  if p_capability = 'submit_text' and p_submission_file_id is not null then
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
declare
  v_owner_id uuid := auth.uid();
  v_assignment_id uuid;
  v_assignment_status text;
begin
  if v_owner_id is null then
    raise exception 'Not signed in.';
  end if;

  select assignment_id
    into v_assignment_id
  from public.assignment_submission_receipts
  where id = p_receipt_id
    and owner_id = v_owner_id
    and status in ('prepared', 'confirmation_pending')
  for update;

  if not found then
    raise exception 'Submission receipt is not available for completion.';
  end if;

  select status
    into v_assignment_status
  from public.assignments
  where id = v_assignment_id
    and owner_id = v_owner_id
  for update;

  if v_assignment_status not in ('exporting', 'submitted') then
    raise exception 'Assignment state changed before the receipt was completed.';
  end if;

  update public.assignment_submission_receipts
  set status = 'submitted',
      provider_receipt_id = p_provider_receipt_id,
      provider_response = coalesce(p_provider_response, '{}'::jsonb),
      detail = p_detail,
      updated_at = now()
  where id = p_receipt_id
    and owner_id = v_owner_id;

  if v_assignment_status = 'exporting' then
    update public.assignments
    set status = 'submitted',
        submitted_at = coalesce(submitted_at, now()),
        submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where id = v_assignment_id
      and owner_id = v_owner_id;

    insert into public.task_signals(owner_id, kind, assignment_id)
    values (v_owner_id, 'completed', v_assignment_id);
  else
    update public.assignments
    set submission_sync_status = 'marked_submitted',
        submission_synced_at = now(),
        updated_at = now()
    where id = v_assignment_id
      and owner_id = v_owner_id;
  end if;
end;
$$;

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
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  if p_status not in ('not_accepted', 'confirmation_pending') then
    raise exception 'Unsupported receipt status.';
  end if;

  update public.assignment_submission_receipts
  set status = p_status,
      detail = p_detail,
      updated_at = now()
  where id = p_receipt_id
    and owner_id = auth.uid()
    and status in ('prepared', 'confirmation_pending');

  if not found then
    raise exception 'Submission receipt is not available for update.';
  end if;
end;
$$;

revoke all on function public.claim_assignment_submission(uuid, text, text, uuid, uuid)
  from public;
revoke all on function public.complete_assignment_submission(uuid, text, text, jsonb)
  from public;
revoke all on function public.update_assignment_submission_receipt(uuid, text, text)
  from public;
grant execute on function public.claim_assignment_submission(uuid, text, text, uuid, uuid)
  to authenticated;
grant execute on function public.complete_assignment_submission(uuid, text, text, jsonb)
  to authenticated;
grant execute on function public.update_assignment_submission_receipt(uuid, text, text)
  to authenticated;
