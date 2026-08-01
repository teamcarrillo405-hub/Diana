-- Diana Course Mode: immutable-content revisions and teacher-only LMS links.

alter table public.course_mode_courses
  add column if not exists parent_version_id uuid
  references public.course_mode_courses(id) on delete set null;

alter table public.teacher_approvals
  drop constraint if exists teacher_approvals_subject_type_check;
alter table public.teacher_approvals
  add constraint teacher_approvals_subject_type_check
  check (subject_type in (
    'course', 'unit', 'lesson', 'objective', 'course_assignment', 'assessment',
    'safety_protocol', 'final_grade', 'practical_unlock'
  ));

create or replace function public.validate_course_mode_lms_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  connection_owner uuid;
  connection_provider text;
  connection_mode text;
begin
  select owner_id, provider, config ->> 'connection_mode'
    into connection_owner, connection_provider, connection_mode
  from public.lms_connections
  where id = new.connection_id;

  if new.created_by <> auth.uid()
     or connection_owner <> auth.uid()
     or connection_provider <> new.provider
     or connection_mode is distinct from 'teacher'
     or not public.can_author_course(new.course_id) then
    raise exception 'Course Mode requires a verified teacher LMS connection for this course.';
  end if;
  return new;
end;
$$;

create or replace function public.require_safety_protocol_approval()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'published' and new.status = 'published' then
    if not exists (
      select 1
      from public.teacher_approvals approval
      where approval.organization_id = new.organization_id
        and approval.course_id = new.course_id
        and approval.subject_type = 'safety_protocol'
        and approval.subject_id = new.id
        and approval.subject_version = new.version
        and approval.decision = 'approved'
    ) then
      raise exception 'Safety protocol publication requires verified teacher approval.';
    end if;
    if new.published_by <> auth.uid() or new.published_at is null then
      raise exception 'The approving teacher must publish the safety protocol.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists safety_protocol_approval_required on public.safety_protocols;
create trigger safety_protocol_approval_required
  before update on public.safety_protocols
  for each row execute function public.require_safety_protocol_approval();

create or replace function public.create_course_content_revision(
  p_kind text,
  p_subject_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
  source_course public.course_mode_courses%rowtype;
  source_unit public.course_mode_units%rowtype;
  source_lesson public.course_mode_lessons%rowtype;
  source_assignment public.course_mode_assignments%rowtype;
  source_assessment public.assessment_blueprints%rowtype;
  source_protocol public.safety_protocols%rowtype;
  item_row public.assessment_items%rowtype;
  next_item_id uuid;
begin
  if p_kind = 'course' then
    select * into source_course
    from public.course_mode_courses
    where id = p_subject_id and status in ('published', 'retired');
    if source_course.id is null or not public.can_author_course(source_course.id) then return null; end if;

    insert into public.course_mode_courses (
      organization_id, title, subject_domain, grade_band, course_level,
      jurisdiction_code, standards_framework_id, status, version,
      parent_version_id, created_by
    ) values (
      source_course.organization_id, source_course.title, source_course.subject_domain,
      source_course.grade_band, source_course.course_level, source_course.jurisdiction_code,
      source_course.standards_framework_id, 'draft', source_course.version + 1,
      source_course.id, auth.uid()
    ) returning id into next_id;

    insert into public.course_mode_enrollments (
      course_id, membership_id, enrollment_role, status
    )
    select next_id, membership_id, enrollment_role, status
    from public.course_mode_enrollments
    where course_id = source_course.id
      and status in ('invited', 'active');
    return next_id;
  elsif p_kind = 'unit' then
    select * into source_unit
    from public.course_mode_units
    where id = p_subject_id and status in ('published', 'retired');
    if source_unit.id is null or not public.can_author_course(source_unit.course_id) then return null; end if;

    insert into public.course_mode_units (
      course_id, title, summary, position, status, version,
      parent_version_id, created_by
    ) values (
      source_unit.course_id, source_unit.title, source_unit.summary,
      source_unit.position, 'draft', source_unit.version + 1,
      source_unit.id, auth.uid()
    ) returning id into next_id;
    return next_id;
  elsif p_kind = 'lesson' then
    select lesson.* into source_lesson
    from public.course_mode_lessons lesson
    join public.course_mode_units unit on unit.id = lesson.unit_id
    where lesson.id = p_subject_id
      and lesson.status in ('published', 'retired')
      and public.can_author_course(unit.course_id);
    if source_lesson.id is null then return null; end if;

    insert into public.course_mode_lessons (
      unit_id, title, summary, estimated_minutes, accessibility_variants,
      position, status, version, parent_version_id, created_by
    ) values (
      source_lesson.unit_id, source_lesson.title, source_lesson.summary,
      source_lesson.estimated_minutes, source_lesson.accessibility_variants,
      source_lesson.position, 'draft', source_lesson.version + 1,
      source_lesson.id, auth.uid()
    ) returning id into next_id;

    insert into public.course_mode_lesson_resources (
      lesson_id, resource_type, title, source_uri, storage_path,
      content_text, provenance, position
    )
    select next_id, resource_type, title, source_uri, storage_path,
           content_text, provenance, position
    from public.course_mode_lesson_resources
    where lesson_id = source_lesson.id;

    insert into public.course_mode_lesson_objectives (
      lesson_id, objective_id, alignment_type
    )
    select next_id, objective_id, alignment_type
    from public.course_mode_lesson_objectives
    where lesson_id = source_lesson.id;
    return next_id;
  elsif p_kind = 'course_assignment' then
    select * into source_assignment
    from public.course_mode_assignments
    where id = p_subject_id and status in ('published', 'retired');
    if source_assignment.id is null or not public.can_author_course(source_assignment.course_id) then return null; end if;

    insert into public.course_mode_assignments (
      course_id, lesson_id, assessment_blueprint_id, title, instructions,
      rubric_text, assignment_kind, assignment_profile, artifact_contract,
      due_at, estimated_minutes, external_assignment_id, status, version,
      parent_version_id, created_by
    ) values (
      source_assignment.course_id, source_assignment.lesson_id,
      source_assignment.assessment_blueprint_id, source_assignment.title,
      source_assignment.instructions, source_assignment.rubric_text,
      source_assignment.assignment_kind, source_assignment.assignment_profile,
      source_assignment.artifact_contract, source_assignment.due_at,
      source_assignment.estimated_minutes, source_assignment.external_assignment_id,
      'draft', source_assignment.version + 1, source_assignment.id, auth.uid()
    ) returning id into next_id;
    return next_id;
  elsif p_kind = 'assessment' then
    select * into source_assessment
    from public.assessment_blueprints
    where id = p_subject_id and status in ('published', 'retired');
    if source_assessment.id is null or not public.can_author_course(source_assessment.course_id) then return null; end if;

    insert into public.assessment_blueprints (
      course_id, title, purpose, instructions, max_attempts,
      release_conditions, external_assignment_id, status, version,
      parent_version_id, created_by
    ) values (
      source_assessment.course_id, source_assessment.title, source_assessment.purpose,
      source_assessment.instructions, source_assessment.max_attempts,
      source_assessment.release_conditions, source_assessment.external_assignment_id,
      'draft', source_assessment.version + 1, source_assessment.id, auth.uid()
    ) returning id into next_id;

    for item_row in
      select * from public.assessment_items
      where blueprint_id = source_assessment.id
      order by position, id
    loop
      insert into public.assessment_items (
        blueprint_id, identifier, title, interaction_type, prompt, body,
        response_declaration, points_possible, position
      ) values (
        next_id, item_row.identifier, item_row.title, item_row.interaction_type,
        item_row.prompt, item_row.body, item_row.response_declaration,
        item_row.points_possible, item_row.position
      ) returning id into next_item_id;

      insert into public.assessment_item_objectives (
        item_id, objective_id, evidence_weight
      )
      select next_item_id, objective_id, evidence_weight
      from public.assessment_item_objectives
      where item_id = item_row.id;
    end loop;
    return next_id;
  elsif p_kind = 'safety_protocol' then
    select * into source_protocol
    from public.safety_protocols
    where id = p_subject_id and status in ('published', 'retired');
    if source_protocol.id is null or not public.can_author_course(source_protocol.course_id) then return null; end if;

    insert into public.safety_protocols (
      organization_id, course_id, title, safety_class, source_uri, source_kind,
      procedure_steps, required_ppe, emergency_steps, disposal_steps,
      supervision_required, minimum_age, status, version, parent_version_id,
      created_by
    ) values (
      source_protocol.organization_id, source_protocol.course_id, source_protocol.title,
      source_protocol.safety_class, source_protocol.source_uri, source_protocol.source_kind,
      source_protocol.procedure_steps, source_protocol.required_ppe,
      source_protocol.emergency_steps, source_protocol.disposal_steps,
      source_protocol.supervision_required, source_protocol.minimum_age,
      'draft', source_protocol.version + 1, source_protocol.id, auth.uid()
    ) returning id into next_id;
    return next_id;
  end if;
  return null;
end;
$$;

revoke all on function public.create_course_content_revision(text, uuid) from public;
grant execute on function public.create_course_content_revision(text, uuid) to authenticated;
