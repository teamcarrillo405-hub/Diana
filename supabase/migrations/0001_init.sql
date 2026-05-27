-- Diana: core schema (slice 1)
-- All user-owned data is RLS-protected. owner_id = auth.uid() column on every table.

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: per-user metadata, extends auth.users
-- ----------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  date_of_birth date not null,
  age_bracket text not null check (age_bracket in ('under_13','13_to_17','adult')),
  consent_ai boolean not null default false,
  consent_ai_at timestamptz,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- classes: a course the user is taking
-- ----------------------------------------------------------------------------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  teacher text,
  color text not null default 'slate',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index classes_owner_idx on public.classes(owner_id) where archived_at is null;

-- ----------------------------------------------------------------------------
-- rubrics: parsed grading criteria attached to a class (or an assignment)
-- ----------------------------------------------------------------------------
create table public.rubrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  source_kind text not null check (source_kind in ('paste','upload','manual')),
  raw_text text,
  parsed jsonb,            -- {criteria: [{name, weight, levels:[{label, desc, points}]}]}
  parse_status text not null default 'pending' check (parse_status in ('pending','parsed','failed','manual')),
  parse_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rubrics_owner_idx on public.rubrics(owner_id);
create index rubrics_class_idx on public.rubrics(class_id);

-- ----------------------------------------------------------------------------
-- assignments: a task with a due date, attached to a class
-- ----------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  rubric_id uuid references public.rubrics(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  estimated_minutes int,
  difficulty smallint check (difficulty between 1 and 5),
  status text not null default 'todo' check (status in ('todo','drafting','checking','exporting','submitted','graded','abandoned')),
  submitted_at timestamptz,
  submission_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assignments_owner_due_idx on public.assignments(owner_id, due_at) where status not in ('submitted','graded','abandoned');
create index assignments_class_idx on public.assignments(class_id);

-- ----------------------------------------------------------------------------
-- submission_checklist: per-assignment "before you click submit" items
-- generated from rubric on entering exporting state
-- ----------------------------------------------------------------------------
create table public.submission_checklist (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  label text not null,
  detail text,
  required boolean not null default true,
  checked boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index checklist_assignment_idx on public.submission_checklist(assignment_id, position);

-- ----------------------------------------------------------------------------
-- task_signals: lightweight events feeding the next-5-minutes scorer
-- (energy check-ins, completions, dismissals, etc.)
-- ----------------------------------------------------------------------------
create table public.task_signals (
  id bigserial primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('energy','completed','dismissed','started','context_switch')),
  value jsonb,
  assignment_id uuid references public.assignments(id) on delete cascade,
  occurred_at timestamptz not null default now()
);
create index task_signals_owner_time_idx on public.task_signals(owner_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- ai_calls: audit log for every model invocation. retention policy enforced.
-- ----------------------------------------------------------------------------
create table public.ai_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,                    -- 'rubric_parse', 'study_buddy', etc
  model text not null,
  prompt_summary text,                      -- truncated, never PII-heavy
  cost_micros bigint,                       -- 1e-6 USD
  status text not null check (status in ('ok','blocked','error')),
  blocked_reason text,
  created_at timestamptz not null default now()
);
create index ai_calls_owner_time_idx on public.ai_calls(owner_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger classes_touch before update on public.classes
  for each row execute function public.touch_updated_at();
create trigger rubrics_touch before update on public.rubrics
  for each row execute function public.touch_updated_at();
create trigger assignments_touch before update on public.assignments
  for each row execute function public.touch_updated_at();
