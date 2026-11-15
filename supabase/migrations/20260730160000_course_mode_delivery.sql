-- Diana Course Mode: lesson progress and approved course assignments delivered
-- into the existing student Work flow.

alter table public.teacher_approvals
  drop constraint if exists teacher_approvals_subject_type_check;
alter table public.teacher_approvals
  add constraint teacher_approvals_subject_type_check
  check (subject_type in (
    'course', 'unit', 'lesson', 'course_assignment', 'assessment',
    'safety_protocol', 'final_grade', 'practical_unlock'
  ));

alter table public.classes
  add column if not exists course_mode_course_id uuid
  references public.course_mode_courses(id) on delete set null;
create unique index if not exists classes_owner_course_mode_unique
  on public.classes (owner_id, course_mode_course_id)
  where course_mode_course_id is not null;

create table if not exists public.course_mode_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  lesson_id uuid references public.course_mode_lessons(id) on delete set null,
  assessment_blueprint_id uuid references public.assessment_blueprints(id) on delete set null,
  title text not null,
  instructions text,
  rubric_text text,
  assignment_kind text not null default 'other'
    check (assignment_kind in ('essay', 'lab', 'problem_set', 'presentation', 'test_prep', 'reading', 'other')),
  assignment_profile jsonb not null default '{}'::jsonb check (jsonb_typeof(assignment_profile) = 'object'),
  artifact_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(artifact_contract) = 'object'),
  due_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 1200),
  external_assignment_id text,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.course_mode_assignments(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'published' and published_at is not null and published_by is not null)
    or status <> 'published'
  )
);

alter table public.assignments
  add column if not exists course_mode_assignment_id uuid
  references public.course_mode_assignments(id) on delete set null;
create unique index if not exists assignments_owner_course_mode_assignment_unique
  on public.assignments (owner_id, course_mode_assignment_id)
  where course_mode_assignment_id is not null;

create table if not exists public.course_mode_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_mode_lessons(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (lesson_id, student_id),
  check (
    (status = 'not_started')
    or (status = 'in_progress' and started_at is not null)
    or (status = 'completed' and started_at is not null and completed_at is not null)
  )
);

create index if not exists course_mode_assignments_course_idx
  on public.course_mode_assignments (course_id, status, due_at);
create index if not exists course_mode_lesson_progress_student_idx
  on public.course_mode_lesson_progress (student_id, status, updated_at desc);

create or replace function public.validate_course_mode_assignment_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  lesson_course_id uuid;
  assessment_course_id uuid;
begin
  if new.status = 'published' and (
    jsonb_typeof(new.assignment_profile) <> 'object'
    or not (new.assignment_profile ? 'schemaVersion')
    or not (new.assignment_profile ? 'subjectDomain')
    or not (new.assignment_profile ? 'artifactType')
    or jsonb_typeof(new.assignment_profile -> 'capabilities') <> 'array'
    or coalesce(new.assignment_profile ->> 'legacyMode', '') not in (
      'math', 'worksheet', 'writing', 'research', 'history', 'lab',
      'reading', 'language', 'coding', 'art', 'project', 'handoff'
    )
  ) then
    raise exception 'Published course assignment requires a complete assignment profile.';
  end if;
  if new.lesson_id is not null then
    select unit.course_id into lesson_course_id
    from public.course_mode_lessons lesson
    join public.course_mode_units unit on unit.id = lesson.unit_id
    where lesson.id = new.lesson_id;
    if lesson_course_id <> new.course_id then
      raise exception 'Course assignment lesson must belong to the same course.';
    end if;
  end if;
  if new.assessment_blueprint_id is not null then
    select course_id into assessment_course_id
    from public.assessment_blueprints
    where id = new.assessment_blueprint_id;
    if assessment_course_id <> new.course_id then
      raise exception 'Course assignment assessment must belong to the same course.';
    end if;
  end if;
  return new;
end;
$$;

create trigger course_mode_assignment_scope_validate
  before insert or update on public.course_mode_assignments
  for each row execute function public.validate_course_mode_assignment_scope();

create or replace function public.require_course_assignment_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  organization_id_value uuid;
begin
  if old.status <> 'published' and new.status = 'published' then
    select organization_id into organization_id_value
    from public.course_mode_courses where id = new.course_id;
    if not exists (
      select 1 from public.teacher_approvals approval
      where approval.organization_id = organization_id_value
        and approval.course_id = new.course_id
        and approval.subject_type = 'course_assignment'
        and approval.subject_id = new.id
        and approval.subject_version = new.version
        and approval.decision = 'approved'
    ) then
      raise exception 'Teacher approval is required before publishing a course assignment.';
    end if;
    if new.published_by <> auth.uid() or new.published_at is null then
      raise exception 'Publication must record the verified teacher and time.';
    end if;
  end if;
  return new;
end;
$$;

create trigger course_mode_assignments_require_approval
  before update on public.course_mode_assignments
  for each row execute function public.require_course_assignment_approval();
create trigger course_mode_assignments_published_immutable
  before update or delete on public.course_mode_assignments
  for each row execute function public.protect_published_course_content();

create or replace function public.distribute_course_mode_assignment(p_course_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  template public.course_mode_assignments%rowtype;
  course_row public.course_mode_courses%rowtype;
  enrollment_row record;
  class_id_value uuid;
  inserted_count integer := 0;
  skipped_count integer := 0;
begin
  select * into template
  from public.course_mode_assignments
  where id = p_course_assignment_id and status = 'published';
  if template.id is null or not public.can_author_course(template.course_id) then
    return null;
  end if;
  select * into course_row from public.course_mode_courses where id = template.course_id;

  for enrollment_row in
    select membership.user_id
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership on membership.id = enrollment.membership_id
    where enrollment.course_id = template.course_id
      and enrollment.enrollment_role = 'student'
      and enrollment.status = 'active'
      and membership.verification_status = 'verified'
  loop
    insert into public.classes (
      owner_id, name, teacher, color, course_mode_course_id
    ) values (
      enrollment_row.user_id,
      course_row.title,
      null,
      'slate',
      template.course_id
    )
    on conflict (owner_id, course_mode_course_id)
      where course_mode_course_id is not null
    do update set name = excluded.name, updated_at = now()
    returning id into class_id_value;

    insert into public.assignments (
      owner_id,
      class_id,
      title,
      description,
      rubric_text,
      due_at,
      estimated_minutes,
      kind,
      status,
      assignment_profile,
      assignment_profile_version,
      work_profile,
      work_profile_source,
      course_mode_course_id,
      course_mode_assignment_id
    ) values (
      enrollment_row.user_id,
      class_id_value,
      template.title,
      template.instructions,
      template.rubric_text,
      template.due_at,
      template.estimated_minutes,
      template.assignment_kind,
      'todo',
      template.assignment_profile,
      case
        when (template.assignment_profile ->> 'schemaVersion') ~ '^[0-9]+$'
          then (template.assignment_profile ->> 'schemaVersion')::integer
        else 1
      end,
      nullif(template.assignment_profile ->> 'legacyMode', ''),
      'course_mode',
      template.course_id,
      template.id
    )
    on conflict (owner_id, course_mode_assignment_id)
      where course_mode_assignment_id is not null
    do nothing;
    if found then
      inserted_count := inserted_count + 1;
    else
      skipped_count := skipped_count + 1;
    end if;
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'skipped', skipped_count);
end;
$$;

create or replace function public.update_course_mode_lesson_progress(
  p_lesson_id uuid,
  p_status text,
  p_evidence jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  course_id_value uuid;
begin
  if p_status not in ('in_progress', 'completed') then return false; end if;
  select unit.course_id into course_id_value
  from public.course_mode_lessons lesson
  join public.course_mode_units unit on unit.id = lesson.unit_id
  where lesson.id = p_lesson_id
    and lesson.status = 'published'
    and unit.status = 'published';
  if course_id_value is null or not public.is_enrolled_in_course(course_id_value) then
    return false;
  end if;

  insert into public.course_mode_lesson_progress (
    lesson_id, student_id, status, evidence, started_at, completed_at
  ) values (
    p_lesson_id,
    auth.uid(),
    p_status,
    coalesce(p_evidence, '{}'::jsonb),
    now(),
    case when p_status = 'completed' then now() else null end
  )
  on conflict (lesson_id, student_id) do update
    set status = excluded.status,
        evidence = excluded.evidence,
        started_at = coalesce(course_mode_lesson_progress.started_at, excluded.started_at),
        completed_at = case when excluded.status = 'completed' then now() else course_mode_lesson_progress.completed_at end,
        updated_at = now();
  return true;
end;
$$;

revoke all on function public.distribute_course_mode_assignment(uuid) from public;
revoke all on function public.update_course_mode_lesson_progress(uuid, text, jsonb) from public;
grant execute on function public.distribute_course_mode_assignment(uuid) to authenticated;
grant execute on function public.update_course_mode_lesson_progress(uuid, text, jsonb) to authenticated;

alter table public.course_mode_assignments enable row level security;
alter table public.course_mode_lesson_progress enable row level security;

create policy course_mode_assignments_select
  on public.course_mode_assignments for select
  using (
    public.can_author_course(course_id)
    or (status = 'published' and public.is_enrolled_in_course(course_id))
  );
create policy course_mode_assignments_staff_insert
  on public.course_mode_assignments for insert
  with check (created_by = auth.uid() and public.can_author_course(course_id));
create policy course_mode_assignments_staff_update
  on public.course_mode_assignments for update
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
create policy course_mode_assignments_staff_delete
  on public.course_mode_assignments for delete
  using (status = 'draft' and public.can_author_course(course_id));

create policy course_mode_lesson_progress_select
  on public.course_mode_lesson_progress for select
  using (
    student_id = auth.uid()
    or exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_progress.lesson_id
        and public.can_author_course(unit.course_id)
    )
  );
-- Student progress writes use the checked RPC only.

comment on table public.course_mode_assignments is
  'Versioned teacher-approved assignments distributed into each enrolled student Work flow.';
comment on table public.course_mode_lesson_progress is
  'Student-owned lesson progress and completion evidence visible to verified course staff.';
