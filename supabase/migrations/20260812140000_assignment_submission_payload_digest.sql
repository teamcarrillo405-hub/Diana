-- Bind Diana-generated delivery files to the canonical work payload they render.

alter table public.assignment_submission_files
  add column if not exists payload_digest text;

alter table public.assignment_submission_files
  drop constraint if exists assignment_submission_files_payload_digest_check;

alter table public.assignment_submission_files
  add constraint assignment_submission_files_payload_digest_check
    check (payload_digest is null or payload_digest ~ '^[0-9a-f]{64}$');

create unique index if not exists assignment_submission_files_payload_digest_idx
  on public.assignment_submission_files(owner_id, assignment_id, payload_digest)
  where payload_digest is not null;

create or replace function public.enforce_assignment_submission_payload_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.payload_digest is distinct from old.payload_digest then
    raise exception 'Delivery file payload bindings are immutable.';
  end if;

  if new.payload_digest is not null and (
    new.integrity_status is distinct from 'bound'
    or new.storage_bucket is distinct from 'assignment-submissions'
    or new.canonical_mime_type is distinct from 'application/pdf'
  ) then
    raise exception 'Canonical payloads require an integrity-bound PDF.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_assignment_submission_payload_binding() from public;
revoke all on function public.enforce_assignment_submission_payload_binding() from anon;
revoke all on function public.enforce_assignment_submission_payload_binding() from authenticated;

drop trigger if exists assignment_submission_files_payload_immutable
  on public.assignment_submission_files;
create trigger assignment_submission_files_payload_immutable
before insert or update on public.assignment_submission_files
for each row execute function public.enforce_assignment_submission_payload_binding();

create or replace function public.enforce_submission_receipt_payload_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.capability = 'upload_file' and not exists (
    select 1
    from public.assignment_submission_files file
    where file.id = new.submission_file_id
      and file.assignment_id = new.assignment_id
      and file.owner_id = new.owner_id
      and file.payload_digest ~ '^[0-9a-f]{64}$'
  ) then
    raise exception 'Upload submission receipts require a canonical payload binding.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_submission_receipt_payload_binding() from public;
revoke all on function public.enforce_submission_receipt_payload_binding() from anon;
revoke all on function public.enforce_submission_receipt_payload_binding() from authenticated;

drop trigger if exists assignment_submission_receipts_payload_binding
  on public.assignment_submission_receipts;
create trigger assignment_submission_receipts_payload_binding
before insert or update on public.assignment_submission_receipts
for each row execute function public.enforce_submission_receipt_payload_binding();
