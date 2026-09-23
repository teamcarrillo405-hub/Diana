-- Diana Course Mode: immutable, auditable learning-objective revisions.

alter table public.teacher_approvals
  drop constraint if exists teacher_approvals_subject_type_check;
alter table public.teacher_approvals
  add constraint teacher_approvals_subject_type_check
  check (subject_type in (
    'standards_framework', 'course', 'unit', 'lesson', 'objective',
    'course_assignment', 'assessment', 'safety_protocol', 'final_grade',
    'practical_unlock'
  ));

alter table public.learning_objectives
  add column if not exists parent_version_id uuid
  references public.learning_objectives(id) on delete set null;

create or replace function public.protect_approved_learning_objective()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'approved' then
    raise exception 'Approved learning objectives are immutable. Create a new version.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists learning_objectives_approved_immutable on public.learning_objectives;
create trigger learning_objectives_approved_immutable
  before update or delete on public.learning_objectives
  for each row execute function public.protect_approved_learning_objective();

create or replace function public.create_course_objective_revision(p_objective_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_objective public.learning_objectives%rowtype;
  next_id uuid;
  next_version integer;
begin
  select * into source_objective
  from public.learning_objectives
  where id = p_objective_id and status in ('approved', 'retired');
  if source_objective.id is null
     or source_objective.course_mode_course_id is null
     or not public.can_author_course(source_objective.course_mode_course_id) then
    return null;
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.learning_objectives
  where course_mode_course_id = source_objective.course_mode_course_id
    and (
      id = source_objective.id
      or parent_version_id = source_objective.id
      or parent_version_id = source_objective.parent_version_id
    );

  insert into public.learning_objectives (
    owner_id, class_id, course_mode_course_id, title, description,
    version, status, parent_version_id
  ) values (
    auth.uid(), source_objective.class_id, source_objective.course_mode_course_id,
    source_objective.title, source_objective.description, next_version,
    'draft', source_objective.id
  ) returning id into next_id;

  insert into public.objective_alignments (
    owner_id, objective_id, standard_item_id, alignment_type
  )
  select auth.uid(), next_id, standard_item_id, alignment_type
  from public.objective_alignments
  where objective_id = source_objective.id;
  return next_id;
end;
$$;

revoke all on function public.create_course_objective_revision(uuid) from public;
grant execute on function public.create_course_objective_revision(uuid) to authenticated;
