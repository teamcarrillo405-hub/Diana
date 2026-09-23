-- Diana Course Mode: parent publication gates. Published child content remains
-- invisible to students until the course and its parent unit are also published.

drop policy if exists course_mode_units_course_select on public.course_mode_units;
create policy course_mode_units_course_select
  on public.course_mode_units for select
  using (
    public.can_author_course(course_id)
    or (
      status = 'published'
      and public.is_enrolled_in_course(course_id)
      and exists (
        select 1 from public.course_mode_courses course
        where course.id = course_mode_units.course_id and course.status = 'published'
      )
    )
  );

drop policy if exists course_mode_lessons_course_select on public.course_mode_lessons;
create policy course_mode_lessons_course_select
  on public.course_mode_lessons for select
  using (
    exists (
      select 1
      from public.course_mode_units unit
      join public.course_mode_courses course on course.id = unit.course_id
      where unit.id = course_mode_lessons.unit_id
        and (
          public.can_author_course(course.id)
          or (
            course.status = 'published'
            and unit.status = 'published'
            and course_mode_lessons.status = 'published'
            and public.is_enrolled_in_course(course.id)
          )
        )
    )
  );

drop policy if exists course_mode_lesson_resources_lesson_select on public.course_mode_lesson_resources;
create policy course_mode_lesson_resources_lesson_select
  on public.course_mode_lesson_resources for select
  using (
    exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      join public.course_mode_courses course on course.id = unit.course_id
      where lesson.id = course_mode_lesson_resources.lesson_id
        and (
          public.can_author_course(course.id)
          or (
            course.status = 'published'
            and unit.status = 'published'
            and lesson.status = 'published'
            and public.is_enrolled_in_course(course.id)
          )
        )
    )
  );

drop policy if exists assessment_blueprints_select on public.assessment_blueprints;
create policy assessment_blueprints_select
  on public.assessment_blueprints for select
  using (
    public.can_author_course(course_id)
    or (
      status = 'published'
      and public.is_enrolled_in_course(course_id)
      and exists (
        select 1 from public.course_mode_courses course
        where course.id = assessment_blueprints.course_id and course.status = 'published'
      )
    )
  );

drop policy if exists course_mode_assignments_select on public.course_mode_assignments;
create policy course_mode_assignments_select
  on public.course_mode_assignments for select
  using (
    public.can_author_course(course_id)
    or (
      status = 'published'
      and public.is_enrolled_in_course(course_id)
      and exists (
        select 1 from public.course_mode_courses course
        where course.id = course_mode_assignments.course_id and course.status = 'published'
      )
    )
  );

drop policy if exists safety_protocols_course_select on public.safety_protocols;
create policy safety_protocols_course_select
  on public.safety_protocols for select
  using (
    public.can_author_course(course_id)
    or (
      status = 'published'
      and public.is_enrolled_in_course(course_id)
      and exists (
        select 1 from public.course_mode_courses course
        where course.id = safety_protocols.course_id and course.status = 'published'
      )
    )
  );

drop policy if exists learning_objectives_course_member_select on public.learning_objectives;
create policy learning_objectives_course_member_select
  on public.learning_objectives for select
  using (
    course_mode_course_id is not null
    and (
      public.can_author_course(course_mode_course_id)
      or (
        status = 'approved'
        and public.is_enrolled_in_course(course_mode_course_id)
        and exists (
          select 1 from public.course_mode_courses course
          where course.id = learning_objectives.course_mode_course_id and course.status = 'published'
        )
      )
    )
  );

create policy objective_alignments_course_member_select
  on public.objective_alignments for select
  using (
    exists (
      select 1
      from public.learning_objectives objective
      join public.course_mode_courses course on course.id = objective.course_mode_course_id
      where objective.id = objective_alignments.objective_id
        and objective.status = 'approved'
        and course.status = 'published'
        and public.is_enrolled_in_course(course.id)
    )
  );

create policy standard_items_course_member_select
  on public.standard_items for select
  using (
    exists (
      select 1
      from public.objective_alignments alignment
      join public.learning_objectives objective on objective.id = alignment.objective_id
      join public.course_mode_courses course on course.id = objective.course_mode_course_id
      where alignment.standard_item_id = standard_items.id
        and objective.status = 'approved'
        and course.status = 'published'
        and public.is_enrolled_in_course(course.id)
    )
  );

create policy prerequisite_edges_course_member_select
  on public.prerequisite_edges for select
  using (
    exists (
      select 1
      from public.learning_objectives objective
      join public.course_mode_courses course on course.id = objective.course_mode_course_id
      where objective.id = prerequisite_edges.objective_id
        and objective.status = 'approved'
        and course.status = 'published'
        and public.is_enrolled_in_course(course.id)
    )
  );

create or replace function public.protect_course_mode_delivery_links()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_course_id uuid;
begin
  target_course_id := new.course_mode_course_id;
  if tg_table_name = 'assignments' then
    if tg_op = 'UPDATE' and (
      old.course_mode_course_id is distinct from new.course_mode_course_id
      or old.course_mode_assignment_id is distinct from new.course_mode_assignment_id
    ) and (target_course_id is null or not public.can_author_course(target_course_id)) then
      raise exception 'Course Mode assignment links are managed by verified course staff.';
    end if;
    if tg_op = 'INSERT' and target_course_id is not null
       and not public.can_author_course(target_course_id) then
      raise exception 'Course Mode assignment links are managed by verified course staff.';
    end if;
  elsif tg_table_name = 'classes' then
    if tg_op = 'UPDATE' and old.course_mode_course_id is distinct from new.course_mode_course_id
       and (target_course_id is null or not public.can_author_course(target_course_id)) then
      raise exception 'Course Mode class links are managed by verified course staff.';
    end if;
    if tg_op = 'INSERT' and target_course_id is not null
       and not public.can_author_course(target_course_id) then
      raise exception 'Course Mode class links are managed by verified course staff.';
    end if;
  end if;
  return new;
end;
$$;

create trigger assignments_course_mode_links_protected
  before insert or update on public.assignments
  for each row execute function public.protect_course_mode_delivery_links();
create trigger classes_course_mode_links_protected
  before insert or update on public.classes
  for each row execute function public.protect_course_mode_delivery_links();

create or replace function public.acknowledge_assignment_safety_protocol(
  p_assignment_id uuid,
  p_protocol_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_course uuid;
  protocol_course uuid;
  protocol_version_value integer;
  protocol_status text;
  course_status text;
begin
  select course_mode_course_id into assignment_course
  from public.assignments
  where id = p_assignment_id and owner_id = auth.uid();
  select course_id, version, status
    into protocol_course, protocol_version_value, protocol_status
  from public.safety_protocols
  where id = p_protocol_id;
  select status into course_status
  from public.course_mode_courses where id = assignment_course;
  if assignment_course is null or protocol_course <> assignment_course
     or protocol_status <> 'published' or course_status <> 'published'
     or not public.is_enrolled_in_course(assignment_course) then
    return false;
  end if;
  insert into public.safety_acknowledgments (
    protocol_id, protocol_version, student_id
  ) values (
    p_protocol_id, protocol_version_value, auth.uid()
  )
  on conflict (protocol_id, protocol_version, student_id) do nothing;
  return true;
end;
$$;

create or replace function public.get_assignment_practical_gate(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  course_id_value uuid;
  course_status text;
  protocol_row public.safety_protocols%rowtype;
  acknowledged boolean := false;
  session_row public.practical_activity_sessions%rowtype;
  assignment_safety_class text;
  student_birth_date date;
  age_eligible boolean := true;
begin
  select course_mode_course_id, assignment_profile ->> 'safetyClass'
    into course_id_value, assignment_safety_class
  from public.assignments
  where id = p_assignment_id and owner_id = auth.uid();
  select status into course_status from public.course_mode_courses where id = course_id_value;
  if course_id_value is null or course_status <> 'published'
     or not public.is_enrolled_in_course(course_id_value) then
    return jsonb_build_object(
      'connected', false, 'acknowledged', false, 'teacherUnlocked', false,
      'supervisionActive', false, 'ageEligible', false, 'protocol', null
    );
  end if;
  select * into protocol_row
  from public.safety_protocols
  where course_id = course_id_value
    and status = 'published'
    and (assignment_safety_class is null or safety_class = assignment_safety_class)
  order by version desc, published_at desc
  limit 1;
  if protocol_row.id is null then
    return jsonb_build_object(
      'connected', true, 'acknowledged', false, 'teacherUnlocked', false,
      'supervisionActive', false, 'ageEligible', false, 'protocol', null
    );
  end if;
  select exists (
    select 1 from public.safety_acknowledgments acknowledgment_row
    where acknowledgment_row.protocol_id = protocol_row.id
      and acknowledgment_row.protocol_version = protocol_row.version
      and acknowledgment_row.student_id = auth.uid()
  ) into acknowledged;
  select date_of_birth into student_birth_date from public.profiles where user_id = auth.uid();
  age_eligible := protocol_row.minimum_age is null or (
    student_birth_date is not null
    and extract(year from age(current_date, student_birth_date)) >= protocol_row.minimum_age
  );
  select * into session_row
  from public.practical_activity_sessions session
  where session.assignment_id = p_assignment_id
    and session.student_id = auth.uid()
    and session.protocol_id = protocol_row.id
    and session.protocol_version = protocol_row.version
    and session.expires_at > now()
  order by session.unlocked_at desc
  limit 1;
  return jsonb_build_object(
    'connected', true,
    'acknowledged', acknowledged,
    'teacherUnlocked', session_row.id is not null,
    'supervisionActive', coalesce(session_row.supervision_active, false),
    'ageEligible', age_eligible,
    'protocol', jsonb_build_object(
      'id', protocol_row.id,
      'version', protocol_row.version,
      'title', protocol_row.title,
      'safetyClass', protocol_row.safety_class,
      'sourceUri', protocol_row.source_uri,
      'procedureSteps', protocol_row.procedure_steps,
      'requiredPpe', protocol_row.required_ppe,
      'emergencySteps', protocol_row.emergency_steps,
      'disposalSteps', protocol_row.disposal_steps,
      'supervisionRequired', protocol_row.supervision_required,
      'minimumAge', protocol_row.minimum_age
    )
  );
end;
$$;

create or replace function public.start_assessment_attempt(p_blueprint_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  blueprint_row public.assessment_blueprints%rowtype;
  course_status text;
  prior_count integer;
  attempt_id uuid;
begin
  select * into blueprint_row from public.assessment_blueprints where id = p_blueprint_id;
  select status into course_status from public.course_mode_courses where id = blueprint_row.course_id;
  if blueprint_row.id is null or blueprint_row.status <> 'published' or course_status <> 'published'
     or not public.is_enrolled_in_course(blueprint_row.course_id) then
    return null;
  end if;
  select count(*) into prior_count
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id and student_id = auth.uid() and status <> 'voided';
  if prior_count >= blueprint_row.max_attempts then return null; end if;
  insert into public.assessment_attempts (
    blueprint_id, blueprint_version, student_id, attempt_number
  ) values (
    p_blueprint_id, blueprint_row.version, auth.uid(), prior_count + 1
  ) returning id into attempt_id;
  return attempt_id;
end;
$$;

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
  if template.id is null or not public.can_author_course(template.course_id) then return null; end if;
  select * into course_row from public.course_mode_courses where id = template.course_id;
  if course_row.status <> 'published' then
    return jsonb_build_object('inserted', 0, 'skipped', 0, 'reason', 'Course must be published before distribution.');
  end if;

  for enrollment_row in
    select membership.user_id
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership on membership.id = enrollment.membership_id
    where enrollment.course_id = template.course_id
      and enrollment.enrollment_role = 'student'
      and enrollment.status = 'active'
      and membership.verification_status = 'verified'
  loop
    insert into public.classes (owner_id, name, teacher, color, course_mode_course_id)
    values (enrollment_row.user_id, course_row.title, null, 'slate', template.course_id)
    on conflict (owner_id, course_mode_course_id)
      where course_mode_course_id is not null
    do update set name = excluded.name, updated_at = now()
    returning id into class_id_value;

    insert into public.assignments (
      owner_id, class_id, title, description, rubric_text, due_at,
      estimated_minutes, kind, status, assignment_profile,
      assignment_profile_version, work_profile, work_profile_source,
      course_mode_course_id, course_mode_assignment_id
    ) values (
      enrollment_row.user_id, class_id_value, template.title, template.instructions,
      template.rubric_text, template.due_at, template.estimated_minutes,
      template.assignment_kind, 'todo', template.assignment_profile,
      case when (template.assignment_profile ->> 'schemaVersion') ~ '^[0-9]+$'
        then (template.assignment_profile ->> 'schemaVersion')::integer else 1 end,
      nullif(template.assignment_profile ->> 'legacyMode', ''), 'course_mode',
      template.course_id, template.id
    )
    on conflict (owner_id, course_mode_assignment_id)
      where course_mode_assignment_id is not null
    do nothing;
    if found then inserted_count := inserted_count + 1;
    else skipped_count := skipped_count + 1;
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
  join public.course_mode_courses course on course.id = unit.course_id
  where lesson.id = p_lesson_id
    and lesson.status = 'published'
    and unit.status = 'published'
    and course.status = 'published';
  if course_id_value is null or not public.is_enrolled_in_course(course_id_value) then return false; end if;
  insert into public.course_mode_lesson_progress (
    lesson_id, student_id, status, evidence, started_at, completed_at
  ) values (
    p_lesson_id, auth.uid(), p_status, coalesce(p_evidence, '{}'::jsonb),
    now(), case when p_status = 'completed' then now() else null end
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
