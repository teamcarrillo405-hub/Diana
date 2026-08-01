-- Finished files are separate from teacher-provided assignment sources.

create table if not exists public.assignment_submission_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  filename text not null,
  mime_type text,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 20971520),
  created_at timestamptz not null default now()
);

create index if not exists assignment_submission_files_assignment_idx
  on public.assignment_submission_files(assignment_id, created_at desc);

alter table public.assignment_submission_files enable row level security;
create policy assignment_submission_files_owner_select on public.assignment_submission_files for select using (owner_id = auth.uid());
create policy assignment_submission_files_owner_insert on public.assignment_submission_files for insert with check (owner_id = auth.uid());
create policy assignment_submission_files_owner_delete on public.assignment_submission_files for delete using (owner_id = auth.uid());
