-- Keep Canvas grade delivery idempotent when the provider response is ambiguous.

alter table public.lms_grade_sync_receipts
  drop constraint if exists lms_grade_sync_receipts_status_check;
alter table public.lms_grade_sync_receipts
  add constraint lms_grade_sync_receipts_status_check
  check (status in (
    'prepared', 'syncing', 'synced', 'confirmation_pending', 'not_accepted'
  ));

create or replace function public.claim_lms_grade_sync_receipt(
  p_attempt_id uuid,
  p_provider text,
  p_external_student_id text
)
returns table (
  receipt_id uuid,
  receipt_status text,
  claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row record;
  link_row record;
  current_receipt public.lms_grade_sync_receipts%rowtype;
  receipt_exists boolean;
  computed_idempotency_key text;
begin
  if auth.uid() is null
    or p_provider not in ('canvas', 'google_classroom')
    or nullif(btrim(p_external_student_id), '') is null
    or length(btrim(p_external_student_id)) > 300 then
    return;
  end if;

  select
    attempt.id,
    attempt.final_score,
    attempt.points_possible,
    attempt.confirmed_by,
    attempt.confirmed_at,
    blueprint.course_id,
    blueprint.external_assignment_id
  into attempt_row
  from public.assessment_attempts attempt
  join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
  where attempt.id = p_attempt_id
    and attempt.status = 'confirmed'
    and attempt.confirmed_by = auth.uid()
    and attempt.final_score is not null
    and blueprint.external_assignment_id is not null
    and public.can_author_course(blueprint.course_id);
  if not found then return; end if;

  select link.external_course_id
  into link_row
  from public.course_mode_lms_links link
  where link.course_id = attempt_row.course_id
    and link.provider = p_provider;
  if not found then return; end if;

  computed_idempotency_key := concat(
    attempt_row.id::text,
    ':',
    p_provider,
    ':',
    btrim(p_external_student_id)
  );
  perform pg_advisory_xact_lock(hashtextextended(
    concat('lms-grade-sync:', attempt_row.course_id::text, ':', p_provider, ':', computed_idempotency_key),
    0
  ));

  select *
  into current_receipt
  from public.lms_grade_sync_receipts receipt
  where receipt.course_id = attempt_row.course_id
    and receipt.provider = p_provider
    and receipt.idempotency_key = computed_idempotency_key
  for update;
  receipt_exists := found;

  if receipt_exists and current_receipt.status in ('syncing', 'confirmation_pending', 'synced') then
    return query select current_receipt.id, current_receipt.status, false;
    return;
  end if;

  if receipt_exists then
    update public.lms_grade_sync_receipts
    set external_course_id = link_row.external_course_id,
        external_assignment_id = attempt_row.external_assignment_id,
        external_student_id = btrim(p_external_student_id),
        status = 'syncing',
        score = attempt_row.final_score,
        points_possible = attempt_row.points_possible,
        provider_receipt_id = null,
        provider_response = '{}'::jsonb,
        error_detail = null,
        confirmed_by = attempt_row.confirmed_by,
        confirmed_at = attempt_row.confirmed_at,
        synced_at = null
    where id = current_receipt.id
    returning * into current_receipt;
  else
    insert into public.lms_grade_sync_receipts (
      course_id,
      attempt_id,
      provider,
      external_course_id,
      external_assignment_id,
      external_student_id,
      idempotency_key,
      status,
      score,
      points_possible,
      confirmed_by,
      confirmed_at
    ) values (
      attempt_row.course_id,
      attempt_row.id,
      p_provider,
      link_row.external_course_id,
      attempt_row.external_assignment_id,
      btrim(p_external_student_id),
      computed_idempotency_key,
      'syncing',
      attempt_row.final_score,
      attempt_row.points_possible,
      attempt_row.confirmed_by,
      attempt_row.confirmed_at
    )
    returning * into current_receipt;
  end if;

  return query select current_receipt.id, current_receipt.status, true;
end;
$$;

revoke all on function public.claim_lms_grade_sync_receipt(uuid, text, text) from public;
revoke all on function public.claim_lms_grade_sync_receipt(uuid, text, text) from anon;
grant execute on function public.claim_lms_grade_sync_receipt(uuid, text, text) to authenticated;

comment on function public.claim_lms_grade_sync_receipt(uuid, text, text) is
  'Atomically claims a confirmed assessment grade for LMS delivery. Syncing and confirmation-pending receipts require reconciliation before retry.';

drop policy if exists lms_grade_sync_receipts_staff_insert
  on public.lms_grade_sync_receipts;
drop policy if exists lms_grade_sync_receipts_staff_update
  on public.lms_grade_sync_receipts;
revoke insert, update on table public.lms_grade_sync_receipts
  from public, anon, authenticated;

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
set search_path = pg_catalog, public
as $$
declare
  current_receipt public.lms_grade_sync_receipts%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;
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
    and receipt.confirmed_by = auth.uid()
    and public.can_author_course(receipt.course_id)
  for update;
  if not found then return; end if;

  if current_receipt.status <> 'syncing' then
    return query select current_receipt.id, current_receipt.status, false;
    return;
  end if;

  update public.lms_grade_sync_receipts receipt
  set status = p_final_status,
      provider_receipt_id = case
        when p_final_status = 'synced' then btrim(p_provider_receipt_id)
        else null
      end,
      provider_response = p_provider_response,
      error_detail = case
        when p_final_status = 'synced' then null
        else p_error_detail
      end,
      synced_at = case when p_final_status = 'synced' then now() else null end
  where receipt.id = current_receipt.id
    and receipt.status = 'syncing'
  returning receipt.* into current_receipt;

  return query select current_receipt.id, current_receipt.status, true;
end;
$$;

revoke all on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  from public;
revoke all on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  from anon;
revoke all on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  from authenticated;
grant execute on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)
  to authenticated;

comment on function public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text) is
  'Completes an authenticated course author''s syncing grade receipt through a legal final transition.';
