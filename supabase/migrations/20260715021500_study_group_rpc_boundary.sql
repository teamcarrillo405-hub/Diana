-- Keep privileged study-group helpers outside the exposed public API schema.
-- Public RPC wrappers retain the app's existing API while running as the
-- caller; only the private implementation functions bypass RLS.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_study_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.study_group_members as member
    where member.group_id = p_group_id
      and member.owner_id = auth.uid()
  );
$$;

create or replace function private.is_study_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.study_groups as study_group
    where study_group.id = p_group_id
      and study_group.owner_id = auth.uid()
  );
$$;

create or replace function private.join_study_group(
  p_join_code text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select study_group.id into v_group_id
  from public.study_groups as study_group
  where study_group.join_code = pg_catalog.upper(pg_catalog.btrim(p_join_code));

  if v_group_id is null then
    raise exception 'study group not found';
  end if;

  insert into public.study_group_members (group_id, owner_id, display_name, role)
  values (
    v_group_id,
    auth.uid(),
    nullif(pg_catalog.btrim(coalesce(p_display_name, '')), ''),
    'member'
  )
  on conflict (group_id, owner_id) do update
    set display_name = coalesce(
      excluded.display_name,
      public.study_group_members.display_name
    );

  return v_group_id;
end;
$$;

create or replace function private.install_shared_deck_for_members(p_deck_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_group_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select deck.group_id into v_group_id
  from public.shared_flashcard_decks as deck
  where deck.id = p_deck_id;

  if v_group_id is null or not private.is_study_group_member(v_group_id) then
    raise exception 'not a study group member';
  end if;

  with eligible as (
    select member.owner_id
    from public.study_group_members as member
    where member.group_id = v_group_id
      and not exists (
        select 1
        from public.shared_flashcard_installs as install
        where install.deck_id = p_deck_id
          and install.owner_id = member.owner_id
      )
  ),
  inserted_installs as (
    insert into public.shared_flashcard_installs (deck_id, owner_id)
    select p_deck_id, eligible.owner_id from eligible
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
      install.owner_id,
      card.front,
      card.back,
      'new',
      0,
      0,
      pg_catalog.now(),
      0,
      0,
      null
    from inserted_installs as install
    cross join public.shared_flashcard_cards as card
    where card.deck_id = p_deck_id
    returning 1
  )
  select count(*) into v_count from inserted_cards;

  return v_count;
end;
$$;

revoke execute on function private.is_study_group_member(uuid)
  from public, anon, service_role;
revoke execute on function private.is_study_group_owner(uuid)
  from public, anon, service_role;
revoke execute on function private.join_study_group(text, text)
  from public, anon, service_role;
revoke execute on function private.install_shared_deck_for_members(uuid)
  from public, anon, service_role;

grant execute on function private.is_study_group_member(uuid)
  to authenticated;
grant execute on function private.is_study_group_owner(uuid)
  to authenticated;
grant execute on function private.join_study_group(text, text)
  to authenticated;
grant execute on function private.install_shared_deck_for_members(uuid)
  to authenticated;

create or replace function public.is_study_group_member(p_group_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_study_group_member(p_group_id);
$$;

create or replace function public.is_study_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_study_group_owner(p_group_id);
$$;

create or replace function public.join_study_group(
  p_join_code text,
  p_display_name text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.join_study_group(p_join_code, p_display_name);
$$;

create or replace function public.install_shared_deck_for_members(p_deck_id uuid)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.install_shared_deck_for_members(p_deck_id);
$$;

revoke execute on function public.is_study_group_member(uuid)
  from public, anon, service_role;
revoke execute on function public.is_study_group_owner(uuid)
  from public, anon, service_role;
revoke execute on function public.join_study_group(text, text)
  from public, anon, service_role;
revoke execute on function public.install_shared_deck_for_members(uuid)
  from public, anon, service_role;

grant execute on function public.is_study_group_member(uuid)
  to authenticated;
grant execute on function public.is_study_group_owner(uuid)
  to authenticated;
grant execute on function public.join_study_group(text, text)
  to authenticated;
grant execute on function public.install_shared_deck_for_members(uuid)
  to authenticated;
