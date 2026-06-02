-- Phase 34: Social + Collaboration Features.
-- Opt-in study groups, shared sessions, shared flashcard decks, collaborative notes,
-- peer explanations, and group project coordination.

create table public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  subject text not null default '' check (length(subject) <= 80),
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  visibility text not null default 'invite_only' check (visibility = 'invite_only'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'facilitator', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, owner_id)
);

create table public.study_group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  work_minutes integer not null default 25 check (work_minutes between 5 and 60),
  break_minutes integer not null default 5 check (break_minutes between 1 and 30),
  starts_at timestamptz not null default now(),
  status text not null default 'planned' check (status in ('planned', 'active', 'done')),
  created_at timestamptz not null default now()
);

create table public.shared_flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 140),
  source text not null default 'student' check (source in ('student', 'teacher', 'ai')),
  created_at timestamptz not null default now()
);

create table public.shared_flashcard_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.shared_flashcard_decks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  front text not null check (length(trim(front)) between 1 and 2000),
  back text not null check (length(trim(back)) between 1 and 4000),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.shared_flashcard_installs (
  deck_id uuid not null references public.shared_flashcard_decks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  installed_at timestamptz not null default now(),
  primary key (deck_id, owner_id)
);

create table public.collaborative_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Group notes' check (length(trim(title)) between 1 and 140),
  body_text text not null default '',
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.peer_explanations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  concept text not null check (length(trim(concept)) between 1 and 120),
  explanation text not null check (length(trim(explanation)) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table public.group_project_tasks (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 180),
  assignee_name text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_group_members_owner_idx on public.study_group_members (owner_id, joined_at desc);
create index study_group_sessions_group_idx on public.study_group_sessions (group_id, starts_at desc);
create index shared_flashcard_decks_group_idx on public.shared_flashcard_decks (group_id, created_at desc);
create index shared_flashcard_cards_deck_idx on public.shared_flashcard_cards (deck_id, position);
create index collaborative_notes_group_idx on public.collaborative_notes (group_id, updated_at desc);
create index peer_explanations_group_idx on public.peer_explanations (group_id, created_at desc);
create index group_project_tasks_group_idx on public.group_project_tasks (group_id, status, created_at desc);

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_group_sessions enable row level security;
alter table public.shared_flashcard_decks enable row level security;
alter table public.shared_flashcard_cards enable row level security;
alter table public.shared_flashcard_installs enable row level security;
alter table public.collaborative_notes enable row level security;
alter table public.peer_explanations enable row level security;
alter table public.group_project_tasks enable row level security;

create or replace function public.is_study_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.study_group_members m
    where m.group_id = p_group_id
      and m.owner_id = auth.uid()
  );
$$;

create or replace function public.is_study_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.study_groups g
    where g.id = p_group_id
      and g.owner_id = auth.uid()
  );
$$;

create or replace function public.join_study_group(p_join_code text, p_display_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_group_id
  from public.study_groups
  where join_code = upper(trim(p_join_code));

  if v_group_id is null then
    raise exception 'study group not found';
  end if;

  insert into public.study_group_members (group_id, owner_id, display_name, role)
  values (v_group_id, auth.uid(), nullif(trim(coalesce(p_display_name, '')), ''), 'member')
  on conflict (group_id, owner_id) do update
    set display_name = coalesce(excluded.display_name, public.study_group_members.display_name);

  return v_group_id;
end;
$$;

create or replace function public.install_shared_deck_for_members(p_deck_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select group_id into v_group_id
  from public.shared_flashcard_decks
  where id = p_deck_id;

  if v_group_id is null or not public.is_study_group_member(v_group_id) then
    raise exception 'not a study group member';
  end if;

  with eligible as (
    select m.owner_id
    from public.study_group_members m
    where m.group_id = v_group_id
      and not exists (
        select 1
        from public.shared_flashcard_installs i
        where i.deck_id = p_deck_id
          and i.owner_id = m.owner_id
      )
  ),
  inserted_installs as (
    insert into public.shared_flashcard_installs (deck_id, owner_id)
    select p_deck_id, owner_id from eligible
    on conflict do nothing
    returning owner_id
  ),
  inserted_cards as (
    insert into public.flashcards (
      owner_id,
      front,
      back,
      state,
      stability,
      difficulty,
      due_at,
      reps,
      lapses,
      last_review_at
    )
    select
      i.owner_id,
      c.front,
      c.back,
      'new',
      0,
      0,
      now(),
      0,
      0,
      null
    from inserted_installs i
    cross join public.shared_flashcard_cards c
    where c.deck_id = p_deck_id
    returning 1
  )
  select count(*) into v_count from inserted_cards;

  return v_count;
end;
$$;

grant execute on function public.join_study_group(text, text) to authenticated;
grant execute on function public.install_shared_deck_for_members(uuid) to authenticated;
grant execute on function public.is_study_group_member(uuid) to authenticated;
grant execute on function public.is_study_group_owner(uuid) to authenticated;

create policy "study_groups member select"
  on public.study_groups for select
  using (owner_id = auth.uid() or public.is_study_group_member(id));

create policy "study_groups owner insert"
  on public.study_groups for insert
  with check (owner_id = auth.uid());

create policy "study_groups owner update"
  on public.study_groups for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "study_groups owner delete"
  on public.study_groups for delete
  using (owner_id = auth.uid());

create policy "study_group_members member select"
  on public.study_group_members for select
  using (public.is_study_group_member(group_id));

create policy "study_group_members self or owner insert"
  on public.study_group_members for insert
  with check (owner_id = auth.uid() or public.is_study_group_owner(group_id));

create policy "study_group_members self or owner update"
  on public.study_group_members for update
  using (owner_id = auth.uid() or public.is_study_group_owner(group_id))
  with check (owner_id = auth.uid() or public.is_study_group_owner(group_id));

create policy "study_group_members self or owner delete"
  on public.study_group_members for delete
  using (owner_id = auth.uid() or public.is_study_group_owner(group_id));

create policy "study_group_sessions member select"
  on public.study_group_sessions for select
  using (public.is_study_group_member(group_id));

create policy "study_group_sessions member insert"
  on public.study_group_sessions for insert
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "study_group_sessions owner update"
  on public.study_group_sessions for update
  using (owner_id = auth.uid() and public.is_study_group_member(group_id))
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "shared_flashcard_decks member select"
  on public.shared_flashcard_decks for select
  using (public.is_study_group_member(group_id));

create policy "shared_flashcard_decks member insert"
  on public.shared_flashcard_decks for insert
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "shared_flashcard_cards member select"
  on public.shared_flashcard_cards for select
  using (exists (
    select 1
    from public.shared_flashcard_decks d
    where d.id = deck_id
      and public.is_study_group_member(d.group_id)
  ));

create policy "shared_flashcard_cards member insert"
  on public.shared_flashcard_cards for insert
  with check (owner_id = auth.uid() and exists (
    select 1
    from public.shared_flashcard_decks d
    where d.id = deck_id
      and public.is_study_group_member(d.group_id)
  ));

create policy "shared_flashcard_installs member select"
  on public.shared_flashcard_installs for select
  using (exists (
    select 1
    from public.shared_flashcard_decks d
    where d.id = deck_id
      and public.is_study_group_member(d.group_id)
  ));

create policy "collaborative_notes member select"
  on public.collaborative_notes for select
  using (public.is_study_group_member(group_id));

create policy "collaborative_notes member insert"
  on public.collaborative_notes for insert
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "collaborative_notes member update"
  on public.collaborative_notes for update
  using (public.is_study_group_member(group_id))
  with check (public.is_study_group_member(group_id));

create policy "peer_explanations member select"
  on public.peer_explanations for select
  using (public.is_study_group_member(group_id));

create policy "peer_explanations member insert"
  on public.peer_explanations for insert
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "group_project_tasks member select"
  on public.group_project_tasks for select
  using (public.is_study_group_member(group_id));

create policy "group_project_tasks member insert"
  on public.group_project_tasks for insert
  with check (owner_id = auth.uid() and public.is_study_group_member(group_id));

create policy "group_project_tasks member update"
  on public.group_project_tasks for update
  using (public.is_study_group_member(group_id))
  with check (public.is_study_group_member(group_id));
