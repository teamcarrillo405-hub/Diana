-- Assignment workspace reliability: atomic JSON patches and one open work session.

create table if not exists public.assignment_source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.assignment_sources(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  page_label text,
  content text not null,
  created_at timestamptz not null default now(),
  unique (source_id, ordinal)
);

create index if not exists assignment_source_chunks_assignment_idx
  on public.assignment_source_chunks (assignment_id, ordinal);

alter table public.assignment_source_chunks enable row level security;
create policy assignment_source_chunks_owner_select on public.assignment_source_chunks for select using (owner_id = auth.uid());
create policy assignment_source_chunks_owner_insert on public.assignment_source_chunks for insert with check (owner_id = auth.uid());
create policy assignment_source_chunks_owner_update on public.assignment_source_chunks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy assignment_source_chunks_owner_delete on public.assignment_source_chunks for delete using (owner_id = auth.uid());

create or replace function public.merge_assignment_saved_work(
  p_assignment_id uuid,
  p_patch jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text) > 200000 then
    return false;
  end if;

  update public.assignments
  set saved_work = coalesce(saved_work, '{}'::jsonb) || p_patch,
      updated_at = now()
  where id = p_assignment_id
    and owner_id = auth.uid();

  if not found then
    return false;
  end if;

  insert into public.authorship_log (owner_id, assignment_id, actor, event_type, payload)
  values (
    auth.uid(),
    p_assignment_id,
    'student',
    'workspace_patch_saved',
    jsonb_build_object(
      'keys', coalesce((select jsonb_agg(key) from jsonb_object_keys(p_patch) as key), '[]'::jsonb),
      'character_count', length(p_patch::text)
    )
  );

  return true;
end;
$$;

create or replace function public.merge_assignment_problem_work(
  p_problem_id uuid,
  p_patch jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
  if auth.uid() is null or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text) > 100000 then
    return false;
  end if;

  update public.assignment_problems
  set student_work = coalesce(student_work, '{}'::jsonb) || p_patch,
      updated_at = now()
  where id = p_problem_id
    and owner_id = auth.uid()
  returning assignment_id into v_assignment_id;

  if not found then
    return false;
  end if;

  insert into public.authorship_log (owner_id, assignment_id, actor, event_type, payload)
  values (
    auth.uid(),
    v_assignment_id,
    'student',
    'problem_patch_saved',
    jsonb_build_object(
      'problem_id', p_problem_id,
      'keys', coalesce((select jsonb_agg(key) from jsonb_object_keys(p_patch) as key), '[]'::jsonb),
      'character_count', length(p_patch::text)
    )
  );

  return true;
end;
$$;

create or replace function public.select_assignment_work_profile(
  p_assignment_id uuid,
  p_mode text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is null or p_mode not in ('math','worksheet','writing','research','history','lab','reading','language','coding','art','project','handoff') then
    return false;
  end if;

  update public.assignments
  set work_profile = p_mode,
      work_profile_source = 'student_selected',
      saved_work = coalesce(saved_work, '{}'::jsonb) || jsonb_build_object('workspaceMode', p_mode),
      updated_at = now()
  where id = p_assignment_id
    and owner_id = auth.uid();

  if not found then
    return false;
  end if;

  insert into public.authorship_log (owner_id, assignment_id, actor, event_type, payload)
  values (auth.uid(), p_assignment_id, 'student', 'work_profile_selected', jsonb_build_object('mode', p_mode));
  return true;
end;
$$;

grant execute on function public.select_assignment_work_profile(uuid, text) to authenticated;
grant execute on function public.merge_assignment_saved_work(uuid, jsonb) to authenticated;
grant execute on function public.merge_assignment_problem_work(uuid, jsonb) to authenticated;

with ranked_open_logs as (
  select id,
         row_number() over (partition by owner_id, assignment_id order by started_at desc, id desc) as row_number
  from public.assignment_time_log
  where ended_at is null
)
update public.assignment_time_log as log
set ended_at = log.started_at,
    elapsed_minutes = 0
from ranked_open_logs
where log.id = ranked_open_logs.id
  and ranked_open_logs.row_number > 1;

create unique index if not exists assignment_time_log_one_open_idx
  on public.assignment_time_log (owner_id, assignment_id)
  where ended_at is null;
