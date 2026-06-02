-- Phase 27: Advanced Placement command center.
-- Stores AP exam plans and practice attempts without shame framing.

create table if not exists public.ap_exam_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  exam_date date not null,
  goal_band text,
  current_focus text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ap_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.ap_exam_plans(id) on delete set null,
  subject text not null,
  practice_type text not null check (practice_type in ('mcq', 'frq', 'mixed')),
  correct_count integer check (correct_count is null or correct_count >= 0),
  total_count integer check (total_count is null or total_count > 0),
  score_band text,
  notes text,
  practiced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ap_exam_plans_owner_subject_idx
  on public.ap_exam_plans (owner_id, active, subject, exam_date);

create index if not exists ap_practice_attempts_owner_time_idx
  on public.ap_practice_attempts (owner_id, practiced_at desc);

alter table public.ap_exam_plans enable row level security;
alter table public.ap_practice_attempts enable row level security;

create policy "ap_exam_plans owner read"
  on public.ap_exam_plans for select
  using (owner_id = auth.uid());

create policy "ap_exam_plans owner insert"
  on public.ap_exam_plans for insert
  with check (owner_id = auth.uid());

create policy "ap_exam_plans owner update"
  on public.ap_exam_plans for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "ap_exam_plans owner delete"
  on public.ap_exam_plans for delete
  using (owner_id = auth.uid());

create policy "ap_practice_attempts owner read"
  on public.ap_practice_attempts for select
  using (owner_id = auth.uid());

create policy "ap_practice_attempts owner insert"
  on public.ap_practice_attempts for insert
  with check (owner_id = auth.uid());

create policy "ap_practice_attempts owner update"
  on public.ap_practice_attempts for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "ap_practice_attempts owner delete"
  on public.ap_practice_attempts for delete
  using (owner_id = auth.uid());
