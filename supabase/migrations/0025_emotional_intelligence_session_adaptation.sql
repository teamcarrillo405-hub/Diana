-- Phase 24: emotional intelligence and session adaptation.
-- Adds durable mood-check cadence fields and student-owned weekly reflections.

alter table public.profiles
  add column if not exists mood_checkin_disabled boolean not null default false,
  add column if not exists last_mood_checkin_at timestamptz,
  add column if not exists rough_mode_until timestamptz,
  add column if not exists last_weekly_reflection_at timestamptz;

create table if not exists public.student_reflections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  mood text check (mood in ('good', 'meh', 'rough')),
  body text not null,
  ai_reflection text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, week_start)
);

create index if not exists student_reflections_owner_week_idx
  on public.student_reflections (owner_id, week_start desc);

alter table public.student_reflections enable row level security;

create policy "student_reflections owner read"
  on public.student_reflections for select
  using (owner_id = auth.uid());

create policy "student_reflections owner insert"
  on public.student_reflections for insert
  with check (owner_id = auth.uid());

create policy "student_reflections owner update"
  on public.student_reflections for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
