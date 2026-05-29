-- Phase 3 F04/F05: inbox capture queue + time-budget layer
-- Creates four new tables and one atomic upsert RPC.

-- 1. inbox_items: universal capture inbox (voice / photo / text)
create table public.inbox_items (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references auth.users(id) on delete cascade,
  raw                   text not null,
  capture_mode          text not null check (capture_mode in ('voice','photo','text')),
  photo_storage_key     text,
  status                text not null default 'unclassified'
                          check (status in ('unclassified','classified','dismissed','converted')),
  suggested_class_id    uuid references public.classes(id) on delete set null,
  suggested_kind        text,
  suggested_due_at      timestamptz,
  suggestion_confidence numeric check (suggestion_confidence between 0 and 1),
  assignment_id         uuid references public.assignments(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.inbox_items enable row level security;

create policy "inbox_items: owner full access"
  on public.inbox_items
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 2. assignment_time_log: open timer row while student is working
create table public.assignment_time_log (
  id                  bigserial primary key,
  owner_id            uuid not null references auth.users(id) on delete cascade,
  assignment_id       uuid not null references public.assignments(id) on delete cascade,
  started_at          timestamptz not null default now(),
  ended_at            timestamptz,              -- null = session still open
  elapsed_minutes     numeric,                  -- null until closed
  edited_by_student   boolean not null default false
);

alter table public.assignment_time_log enable row level security;

create policy "time_log: owner full access"
  on public.assignment_time_log
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 3. assignment_type_estimates: running mean of actual elapsed time per kind
create table public.assignment_type_estimates (
  owner_id      uuid not null references auth.users(id) on delete cascade,
  kind          text not null,
  mean_minutes  numeric not null default 0,
  n_samples     integer not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (owner_id, kind)
);

alter table public.assignment_type_estimates enable row level security;

create policy "type_estimates: owner full access"
  on public.assignment_type_estimates
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 4. assignment_intentions: implementation-intention cues (F14)
create table public.assignment_intentions (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  cue_type      text not null check (cue_type in ('time','event','location','other')),
  cue_text      text not null,
  scheduled_for timestamptz,
  fired_at      timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.assignment_intentions enable row level security;

create policy "intentions: owner full access"
  on public.assignment_intentions
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Atomic upsert for running mean (Pitfall 7 guard — no race condition)
create or replace function public.upsert_type_estimate(
  p_owner_id uuid,
  p_kind     text,
  p_elapsed  numeric
) returns void language sql security definer as $$
  insert into public.assignment_type_estimates (owner_id, kind, mean_minutes, n_samples)
  values (p_owner_id, p_kind, p_elapsed, 1)
  on conflict (owner_id, kind) do update set
    mean_minutes = (assignment_type_estimates.mean_minutes * assignment_type_estimates.n_samples + excluded.mean_minutes)
                   / (assignment_type_estimates.n_samples + 1),
    n_samples    = assignment_type_estimates.n_samples + 1,
    updated_at   = now();
$$;
