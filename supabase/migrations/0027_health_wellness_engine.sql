-- Phase 26: PE, health, and wellness engine.
-- Tracks movement, student-owned goals, and sleep/recovery without body-size metrics.

alter table public.task_signals
  drop constraint if exists task_signals_kind_check;

alter table public.task_signals
  add constraint task_signals_kind_check
  check (kind in (
    'energy',
    'completed',
    'dismissed',
    'started',
    'context_switch',
    'overwhelmed',
    'mood_checkin',
    'activity_log',
    'sleep_log'
  ));

create table if not exists public.wellness_activity_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  logged_for date not null default current_date,
  activity_type text not null check (activity_type in (
    'walk',
    'run',
    'bike',
    'team_sport',
    'strength',
    'stretch',
    'dance',
    'other'
  )),
  duration_minutes integer not null check (duration_minutes between 1 and 720),
  felt text not null check (felt in ('steady', 'tired', 'energized', 'sore', 'proud', 'not_sure')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wellness_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in (
    'skill',
    'endurance',
    'strength',
    'flexibility',
    'consistency',
    'recovery'
  )),
  target_text text not null,
  next_step text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null default current_date,
  sleep_quality text not null check (sleep_quality in ('rested', 'ok', 'rough')),
  sleep_hours numeric(3,1) check (sleep_hours is null or sleep_hours between 0 and 18),
  focus_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, sleep_date)
);

create index if not exists wellness_activity_logs_owner_date_idx
  on public.wellness_activity_logs (owner_id, logged_for desc, created_at desc);

create index if not exists wellness_goals_owner_active_idx
  on public.wellness_goals (owner_id, active, created_at desc);

create index if not exists sleep_logs_owner_date_idx
  on public.sleep_logs (owner_id, sleep_date desc);

alter table public.wellness_activity_logs enable row level security;
alter table public.wellness_goals enable row level security;
alter table public.sleep_logs enable row level security;

create policy "wellness_activity_logs owner read"
  on public.wellness_activity_logs for select
  using (owner_id = auth.uid());

create policy "wellness_activity_logs owner insert"
  on public.wellness_activity_logs for insert
  with check (owner_id = auth.uid());

create policy "wellness_activity_logs owner update"
  on public.wellness_activity_logs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "wellness_activity_logs owner delete"
  on public.wellness_activity_logs for delete
  using (owner_id = auth.uid());

create policy "wellness_goals owner read"
  on public.wellness_goals for select
  using (owner_id = auth.uid());

create policy "wellness_goals owner insert"
  on public.wellness_goals for insert
  with check (owner_id = auth.uid());

create policy "wellness_goals owner update"
  on public.wellness_goals for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "wellness_goals owner delete"
  on public.wellness_goals for delete
  using (owner_id = auth.uid());

create policy "sleep_logs owner read"
  on public.sleep_logs for select
  using (owner_id = auth.uid());

create policy "sleep_logs owner insert"
  on public.sleep_logs for insert
  with check (owner_id = auth.uid());

create policy "sleep_logs owner update"
  on public.sleep_logs for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "sleep_logs owner delete"
  on public.sleep_logs for delete
  using (owner_id = auth.uid());
