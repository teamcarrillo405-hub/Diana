begin;

alter table public.assignment_problems
  add column if not exists progress_status text not null default 'not_started',
  add column if not exists reviewed_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.assignment_problems
  drop constraint if exists assignment_problems_progress_status_check;

alter table public.assignment_problems
  add constraint assignment_problems_progress_status_check
  check (progress_status in ('not_started', 'in_progress', 'done'));

update public.assignment_problems
set progress_status = case
  when nullif(btrim(coalesce(student_work->>'work', '')), '') is not null
    or nullif(btrim(coalesce(student_work->>'answer', '')), '') is not null
    or nullif(btrim(coalesce(student_work->>'workInk', '')), '') is not null
    then 'in_progress'
  else 'not_started'
end
where progress_status = 'not_started';

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
  v_changes_work boolean;
begin
  if auth.uid() is null or jsonb_typeof(p_patch) <> 'object' or length(p_patch::text) > 100000 then
    return false;
  end if;

  v_changes_work := p_patch ?| array['work', 'workInk', 'answer'];

  update public.assignment_problems
  set student_work = coalesce(student_work, '{}'::jsonb) || p_patch,
      progress_status = case
        when not v_changes_work then progress_status
        when nullif(btrim(coalesce((coalesce(student_work, '{}'::jsonb) || p_patch)->>'work', '')), '') is not null
          or nullif(btrim(coalesce((coalesce(student_work, '{}'::jsonb) || p_patch)->>'answer', '')), '') is not null
          or nullif(btrim(coalesce((coalesce(student_work, '{}'::jsonb) || p_patch)->>'workInk', '')), '') is not null
          then 'in_progress'
        else 'not_started'
      end,
      reviewed_at = case when v_changes_work then null else reviewed_at end,
      completed_at = case when v_changes_work then null else completed_at end,
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

commit;
