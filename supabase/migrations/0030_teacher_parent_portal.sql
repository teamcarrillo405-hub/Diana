-- Phase 30: Teacher + Parent Portal.
-- Student-owned portal data for assignment creation, roster contacts, progress notes,
-- accommodation confirmation, and assignment-level AI policy.

alter table public.assignments
  add column if not exists ai_mode_override text
    check (ai_mode_override is null or ai_mode_override in ('green', 'yellow', 'red'));

create table if not exists public.class_roster_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  display_name text not null,
  email text,
  role text not null default 'student' check (role in ('teacher', 'student', 'aide', 'guardian')),
  status text not null default 'invited' check (status in ('invited', 'active', 'inactive')),
  consent_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(display_name)) between 1 and 120)
);

create table if not exists public.teacher_progress_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  author_name text not null,
  note_text text not null,
  visible_to_parent boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(author_name)) between 1 and 120),
  check (length(trim(note_text)) between 1 and 2000)
);

create table if not exists public.accommodation_confirmations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  confirmed_by text not null,
  extra_time_pct integer not null default 0,
  tts_enabled boolean not null default false,
  dyslexia_font boolean not null default false,
  accommodations jsonb not null default '[]'::jsonb,
  notes text,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (extra_time_pct >= 0 and extra_time_pct <= 300),
  check (length(trim(confirmed_by)) between 1 and 120)
);

create index if not exists assignments_ai_mode_override_idx
  on public.assignments (owner_id, ai_mode_override)
  where ai_mode_override is not null;

create index if not exists class_roster_members_owner_class_idx
  on public.class_roster_members (owner_id, class_id, role, status);

create index if not exists teacher_progress_notes_owner_class_idx
  on public.teacher_progress_notes (owner_id, class_id, created_at desc);

create index if not exists teacher_progress_notes_parent_idx
  on public.teacher_progress_notes (owner_id, visible_to_parent, created_at desc)
  where visible_to_parent = true;

create index if not exists accommodation_confirmations_owner_class_idx
  on public.accommodation_confirmations (owner_id, class_id, confirmed_at desc);

alter table public.class_roster_members enable row level security;
alter table public.teacher_progress_notes enable row level security;
alter table public.accommodation_confirmations enable row level security;

create policy "class_roster_members owner read"
  on public.class_roster_members for select
  using (owner_id = auth.uid());

create policy "class_roster_members owner insert"
  on public.class_roster_members for insert
  with check (owner_id = auth.uid());

create policy "class_roster_members owner update"
  on public.class_roster_members for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "class_roster_members owner delete"
  on public.class_roster_members for delete
  using (owner_id = auth.uid());

create policy "teacher_progress_notes owner read"
  on public.teacher_progress_notes for select
  using (owner_id = auth.uid());

create policy "teacher_progress_notes owner insert"
  on public.teacher_progress_notes for insert
  with check (owner_id = auth.uid());

create policy "teacher_progress_notes owner update"
  on public.teacher_progress_notes for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "teacher_progress_notes owner delete"
  on public.teacher_progress_notes for delete
  using (owner_id = auth.uid());

create policy "accommodation_confirmations owner read"
  on public.accommodation_confirmations for select
  using (owner_id = auth.uid());

create policy "accommodation_confirmations owner insert"
  on public.accommodation_confirmations for insert
  with check (owner_id = auth.uid());

create policy "accommodation_confirmations owner update"
  on public.accommodation_confirmations for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "accommodation_confirmations owner delete"
  on public.accommodation_confirmations for delete
  using (owner_id = auth.uid());
