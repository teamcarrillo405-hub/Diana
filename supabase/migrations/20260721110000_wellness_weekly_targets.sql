create table if not exists public.wellness_weekly_targets (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  sleep_hours numeric(3, 1) not null default 8 check (sleep_hours between 4 and 10),
  check_in_days smallint not null default 5 check (check_in_days between 1 and 7),
  movement_days smallint not null default 4 check (movement_days between 1 and 7),
  updated_at timestamptz not null default now()
);

alter table public.wellness_weekly_targets enable row level security;

create policy "wellness_weekly_targets owner full access"
  on public.wellness_weekly_targets
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
