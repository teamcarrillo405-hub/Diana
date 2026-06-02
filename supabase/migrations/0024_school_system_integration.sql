-- Phase 23: school system integration hardening.
-- Adds external assignment metadata, submission-sync tracking, Clever marker support,
-- and IEP/504 import audit rows.

alter table public.assignments
  drop constraint if exists assignments_external_source_check;

alter table public.assignments
  add constraint assignments_external_source_check
  check (external_source in ('canvas', 'google_classroom', 'ics', 'clever'));

alter table public.assignments
  add column if not exists external_url text,
  add column if not exists rubric_text text,
  add column if not exists submission_synced_at timestamptz,
  add column if not exists submission_sync_status text
    check (submission_sync_status in ('not_started', 'opened_external', 'marked_submitted', 'not_supported'));

alter table public.lms_connections
  drop constraint if exists lms_connections_provider_check;

alter table public.lms_connections
  add constraint lms_connections_provider_check
  check (provider in ('canvas', 'google_classroom', 'ics', 'clever'));

create table if not exists public.iep_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_name text,
  extracted_summary jsonb not null default '{}',
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists iep_imports_owner_idx
  on public.iep_imports (owner_id, created_at desc);

alter table public.iep_imports enable row level security;

create policy "iep_imports owner read"
  on public.iep_imports for select
  using (owner_id = auth.uid());

create policy "iep_imports owner insert"
  on public.iep_imports for insert
  with check (owner_id = auth.uid());
