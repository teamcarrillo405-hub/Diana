-- Google Calendar is a read-only companion to the student's school schedule.
-- Events remain separate from assignments so personal plans can never become work.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'google_calendar'),
  external_calendar_id text not null default 'primary',
  external_event_id text not null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  html_link text,
  source_updated_at timestamptz,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider, external_calendar_id, external_event_id)
);

create index if not exists calendar_events_owner_starts_at_idx
  on public.calendar_events(owner_id, starts_at);

alter table public.calendar_events enable row level security;

create policy "Students can read their calendar events"
  on public.calendar_events for select
  using (owner_id = auth.uid());

create policy "Students can insert their calendar events"
  on public.calendar_events for insert
  with check (owner_id = auth.uid());

create policy "Students can update their calendar events"
  on public.calendar_events for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Students can delete their calendar events"
  on public.calendar_events for delete
  using (owner_id = auth.uid());
