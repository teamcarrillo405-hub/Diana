-- F15 — LMS Calendar Import (Canvas, Google Classroom, .ics)
-- Adds external-source columns to assignments + new lms_connections table.

-- ----------------------------------------------------------------------------
-- assignments: add external-source provenance
-- ----------------------------------------------------------------------------
alter table public.assignments
  add column if not exists external_source text
    check (external_source in ('canvas', 'google_classroom', 'ics')),
  add column if not exists external_id text,
  add column if not exists last_synced_at timestamptz;

-- Dedup key — only enforced for externally sourced rows
create unique index if not exists assignments_external_dedup
  on public.assignments (owner_id, external_source, external_id)
  where external_id is not null;

-- ----------------------------------------------------------------------------
-- lms_connections: one row per (owner, provider) the student has connected
-- ----------------------------------------------------------------------------
create table if not exists public.lms_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom', 'ics')),
  -- Canvas: { base_url, token }
  -- ICS:    { url, label? }
  -- Google Classroom: {} (we use Supabase session.provider_token at sync time)
  config jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lms_connections_owner_idx
  on public.lms_connections (owner_id);

alter table public.lms_connections enable row level security;

create policy "lms_connections owner read"
  on public.lms_connections for select
  using (owner_id = auth.uid());

create policy "lms_connections owner write"
  on public.lms_connections for insert
  with check (owner_id = auth.uid());

create policy "lms_connections owner update"
  on public.lms_connections for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "lms_connections owner delete"
  on public.lms_connections for delete
  using (owner_id = auth.uid());
