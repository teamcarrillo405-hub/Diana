-- Personal schedules are separate from school work and imported Google events.
create table public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  event jsonb not null check (jsonb_typeof(event) = 'object' and octet_length(event::text) <= 10000),
  time_zone text not null default 'UTC',
  photo_key text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personal_calendar_events_owner_idx on public.personal_calendar_events(owner_id) where deleted_at is null;
alter table public.personal_calendar_events enable row level security;
create policy "Read own personal events" on public.personal_calendar_events for select to authenticated using (owner_id = (select auth.uid()));
create policy "Create own personal events" on public.personal_calendar_events for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Edit own personal events" on public.personal_calendar_events for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update on public.personal_calendar_events to authenticated;
