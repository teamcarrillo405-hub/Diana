-- Universal Assignment Workspace: durable source material, routing, and submission receipts.

alter table public.assignments
  add column if not exists work_profile text,
  add column if not exists work_profile_source text,
  add column if not exists source_import_status text not null default 'not_started'
    check (source_import_status in ('not_started', 'imported', 'partial', 'failed'));

create table if not exists public.assignment_sources (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('instructions', 'rubric', 'attachment', 'link', 'upload', 'extracted_text')),
  provider text,
  external_id text,
  title text not null,
  url text,
  storage_key text,
  mime_type text,
  extracted_text text,
  source_location text,
  import_status text not null default 'ready' check (import_status in ('ready', 'extracting', 'imported', 'partial', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, source_type, provider, external_id)
);

create index if not exists assignment_sources_assignment_idx on public.assignment_sources(assignment_id, created_at);
create index if not exists assignment_sources_owner_idx on public.assignment_sources(owner_id);

alter table public.assignment_sources enable row level security;
create policy assignment_sources_owner_select on public.assignment_sources for select using (owner_id = auth.uid());
create policy assignment_sources_owner_insert on public.assignment_sources for insert with check (owner_id = auth.uid());
create policy assignment_sources_owner_update on public.assignment_sources for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy assignment_sources_owner_delete on public.assignment_sources for delete using (owner_id = auth.uid());

create table if not exists public.assignment_submission_receipts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  capability text not null,
  provider_receipt_id text,
  status text not null check (status in ('prepared', 'submitted', 'unsupported', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists assignment_submission_receipts_assignment_idx on public.assignment_submission_receipts(assignment_id, created_at desc);

alter table public.assignment_submission_receipts enable row level security;
create policy assignment_submission_receipts_owner_select on public.assignment_submission_receipts for select using (owner_id = auth.uid());
create policy assignment_submission_receipts_owner_insert on public.assignment_submission_receipts for insert with check (owner_id = auth.uid());

-- Existing records remain valid. The resolver will backfill profiles on first open.

alter table public.assignment_problems drop constraint if exists assignment_problems_source_check;
alter table public.assignment_problems add constraint assignment_problems_source_check
  check (source in ('manual', 'photo_scan', 'assignment_source'));
