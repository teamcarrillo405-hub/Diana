-- Assignment workspace 9.5 persistence and recovery.

create table if not exists public.assignment_problem_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_id uuid not null references public.assignment_problems(id) on delete cascade,
  role text not null check (role in ('student', 'assistant')),
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  visual_aid jsonb,
  completion_state text not null default 'complete'
    check (completion_state in ('streaming', 'complete', 'interrupted')),
  client_turn_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, problem_id, role, client_turn_id)
);

create index if not exists assignment_problem_messages_thread_idx
  on public.assignment_problem_messages (owner_id, problem_id, created_at desc);

alter table public.assignment_problem_messages enable row level security;

drop policy if exists "problem_messages: owner full access" on public.assignment_problem_messages;
create policy "problem_messages: owner full access"
  on public.assignment_problem_messages
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = problem_id
        and problem.assignment_id = assignment_id
        and problem.owner_id = auth.uid()
    )
  );

create table if not exists public.assignment_workspace_preferences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_id uuid not null references public.assignment_problems(id) on delete cascade,
  paper_style text not null default 'lined'
    check (paper_style in ('blank', 'lined', 'graph')),
  work_height integer not null default 240
    check (work_height between 220 and 1200),
  updated_at timestamptz not null default now(),
  unique (owner_id, assignment_id, problem_id)
);

alter table public.assignment_workspace_preferences enable row level security;

drop policy if exists "workspace_preferences: owner full access" on public.assignment_workspace_preferences;
create policy "workspace_preferences: owner full access"
  on public.assignment_workspace_preferences
  for all
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = problem_id
        and problem.assignment_id = assignment_id
        and problem.owner_id = auth.uid()
    )
  );

alter table public.assignment_time_log
  add column if not exists target_ends_at timestamptz,
  add column if not exists focus_state text not null default 'completed',
  add column if not exists client_session_id text;

update public.assignment_time_log
set focus_state = case when ended_at is null then 'running' else 'completed' end
where focus_state = 'completed' and ended_at is null;

alter table public.assignment_time_log
  drop constraint if exists assignment_time_log_focus_state_check;

alter table public.assignment_time_log
  add constraint assignment_time_log_focus_state_check
  check (focus_state in ('starting', 'running', 'stopping', 'completed', 'retryable_error'));

create unique index if not exists assignment_time_log_client_session_idx
  on public.assignment_time_log (owner_id, client_session_id)
  where client_session_id is not null;
