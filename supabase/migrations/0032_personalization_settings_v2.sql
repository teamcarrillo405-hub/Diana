-- Phase 33: Personalization Settings v2.
-- Durable preference JSON, privacy deletion requests, and multi-device handoff.

alter table public.profiles
  add column if not exists ai_verbosity_by_subject jsonb not null default '{}'::jsonb,
  add column if not exists notification_preferences jsonb not null default '{
    "assignment_reminders": true,
    "ai_budget": true,
    "weekly_reflection": true,
    "parent_summary": false,
    "quiet_hours": true
  }'::jsonb,
  add column if not exists privacy_preferences jsonb not null default '{}'::jsonb;

create table public.session_handoffs (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  route text not null,
  context jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (length(trim(route)) between 1 and 240)
);

create table public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  ai_disabled_at timestamptz,
  export_offered boolean not null default true,
  notes text
);

create index session_handoffs_updated_idx
  on public.session_handoffs (owner_id, updated_at desc);

create index data_deletion_requests_owner_status_idx
  on public.data_deletion_requests (owner_id, status, requested_at desc);

alter table public.session_handoffs enable row level security;
alter table public.data_deletion_requests enable row level security;

create policy "session_handoffs owner full access"
  on public.session_handoffs for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "data_deletion_requests owner full access"
  on public.data_deletion_requests for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
