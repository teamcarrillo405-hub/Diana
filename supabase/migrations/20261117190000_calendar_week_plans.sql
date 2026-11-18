-- A student's optional self-reported study capacity, separate from appointments.
create table public.calendar_week_plans (
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  available_minutes integer not null check (available_minutes between 0 and 10080),
  updated_at timestamptz not null default now(),
  primary key (owner_id, week_start)
);
alter table public.calendar_week_plans enable row level security;
revoke all on public.calendar_week_plans from anon, authenticated;
grant select, insert, update, delete on public.calendar_week_plans to authenticated;
create policy calendar_week_plans_owner on public.calendar_week_plans
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
