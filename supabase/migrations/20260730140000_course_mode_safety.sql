-- Diana Course Mode: approved safety protocols and supervised practical work.

alter table public.assignments
  add column if not exists course_mode_course_id uuid
  references public.course_mode_courses(id) on delete set null;

create index if not exists assignments_course_mode_course_idx
  on public.assignments (course_mode_course_id)
  where course_mode_course_id is not null;

create table if not exists public.safety_protocols (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  title text not null,
  safety_class text not null check (safety_class in ('physical_activity', 'workshop_hazard', 'lab_hazard')),
  source_uri text not null check (char_length(trim(source_uri)) > 0),
  source_kind text not null check (source_kind in ('teacher', 'district', 'manufacturer', 'government')),
  procedure_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(procedure_steps) = 'array'),
  required_ppe jsonb not null default '[]'::jsonb check (jsonb_typeof(required_ppe) = 'array'),
  emergency_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(emergency_steps) = 'array'),
  disposal_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(disposal_steps) = 'array'),
  supervision_required boolean not null default true,
  minimum_age integer check (minimum_age is null or minimum_age between 5 and 21),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.safety_protocols(id) on delete set null,
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

create table if not exists public.safety_acknowledgments (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.safety_protocols(id) on delete cascade,
  protocol_version integer not null check (protocol_version > 0),
  student_id uuid not null references auth.users(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  unique (protocol_id, protocol_version, student_id)
);

create table if not exists public.practical_activity_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  protocol_id uuid not null references public.safety_protocols(id) on delete restrict,
  protocol_version integer not null check (protocol_version > 0),
  student_id uuid not null references auth.users(id) on delete cascade,
  unlocked_by uuid not null references auth.users(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  supervision_active boolean not null default false,
  expires_at timestamptz not null,
  signed_off_at timestamptz,
  signed_off_by uuid references auth.users(id) on delete restrict,
  signoff_notes text,
  created_at timestamptz not null default now(),
  check (expires_at > unlocked_at),
  check (
    (signed_off_at is null and signed_off_by is null)
    or (signed_off_at is not null and signed_off_by is not null)
  )
);

create index if not exists safety_protocols_course_idx
  on public.safety_protocols (course_id, safety_class, status, version desc);
create index if not exists safety_acknowledgments_student_idx
  on public.safety_acknowledgments (student_id, protocol_id, protocol_version);
create index if not exists practical_activity_sessions_assignment_idx
  on public.practical_activity_sessions (assignment_id, student_id, expires_at desc);

create or replace function public.validate_safety_protocol_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  course_organization_id uuid;
begin
  select organization_id into course_organization_id
  from public.course_mode_courses
  where id = new.course_id;

  if course_organization_id is null or course_organization_id <> new.organization_id then
    raise exception 'Safety protocol must belong to the course organization.';
  end if;
  return new;
end;
$$;

create trigger safety_protocol_scope_validate
  before insert or update on public.safety_protocols
  for each row execute function public.validate_safety_protocol_scope();

create or replace function public.validate_published_safety_protocol()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'published' then
    if jsonb_array_length(new.procedure_steps) = 0 then
      raise exception 'Published safety protocol requires approved procedure steps.';
    end if;
    if new.safety_class in ('workshop_hazard', 'lab_hazard')
       and jsonb_array_length(new.required_ppe) = 0 then
      raise exception 'Published hazardous protocol requires protective equipment.';
    end if;
    if jsonb_array_length(new.emergency_steps) = 0 then
      raise exception 'Published safety protocol requires emergency steps.';
    end if;
  end if;
  return new;
end;
$$;

create trigger safety_protocol_publish_validate
  before insert or update on public.safety_protocols
  for each row execute function public.validate_published_safety_protocol();

create trigger safety_protocol_published_immutable
  before update or delete on public.safety_protocols
  for each row execute function public.protect_published_course_content();

create or replace function public.validate_practical_activity_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_owner uuid;
  assignment_course uuid;
  protocol_course uuid;
  protocol_version_value integer;
  protocol_status text;
  staff_allowed boolean;
  student_enrolled boolean;
  student_acknowledged boolean;
  student_birth_date date;
  protocol_minimum_age integer;
begin
  select owner_id, course_mode_course_id
    into assignment_owner, assignment_course
  from public.assignments
  where id = new.assignment_id;

  select course_id, version, status, minimum_age
    into protocol_course, protocol_version_value, protocol_status, protocol_minimum_age
  from public.safety_protocols
  where id = new.protocol_id;

  select public.can_author_course(new.course_id) into staff_allowed;
  select exists (
    select 1
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership on membership.id = enrollment.membership_id
    where enrollment.course_id = new.course_id
      and enrollment.status = 'active'
      and enrollment.enrollment_role = 'student'
      and membership.user_id = new.student_id
      and membership.verification_status = 'verified'
  ) into student_enrolled;

  select exists (
    select 1 from public.safety_acknowledgments acknowledgment
    where acknowledgment.protocol_id = new.protocol_id
      and acknowledgment.protocol_version = new.protocol_version
      and acknowledgment.student_id = new.student_id
  ) into student_acknowledged;

  select date_of_birth into student_birth_date
  from public.profiles
  where user_id = new.student_id;

  if not staff_allowed
     or (tg_op = 'INSERT' and new.unlocked_by <> auth.uid())
     or (tg_op = 'UPDATE' and new.signed_off_at is not null and new.signed_off_by <> auth.uid()) then
    raise exception 'A verified course teacher must unlock practical work.';
  end if;
  if assignment_owner <> new.student_id or assignment_course <> new.course_id then
    raise exception 'Practical session assignment and student do not match the course.';
  end if;
  if protocol_course <> new.course_id or protocol_status <> 'published'
     or protocol_version_value <> new.protocol_version then
    raise exception 'Practical session must use the current published protocol version.';
  end if;
  if not student_enrolled then
    raise exception 'Student must be actively enrolled in this course.';
  end if;
  if not student_acknowledged then
    raise exception 'Student must acknowledge the current protocol before practical work is unlocked.';
  end if;
  if protocol_minimum_age is not null and (
    student_birth_date is null
    or extract(year from age(current_date, student_birth_date)) < protocol_minimum_age
  ) then
    raise exception 'Student does not meet the approved protocol age requirement.';
  end if;
  return new;
end;
$$;

create trigger practical_activity_session_validate
  before insert or update on public.practical_activity_sessions
  for each row execute function public.validate_practical_activity_session();

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
begin
  select course_mode_course_id into assignment_course
  from public.assignments
  where id = p_assignment_id and owner_id = auth.uid();

  select course_id, version, status
    into protocol_course, protocol_version_value, protocol_status
  from public.safety_protocols
  where id = p_protocol_id;

  if assignment_course is null or protocol_course <> assignment_course or protocol_status <> 'published' then
    return false;
  end if;
  if not public.is_enrolled_in_course(assignment_course) then
    return false;
  end if;

  insert into public.safety_acknowledgments (
    protocol_id,
    protocol_version,
    student_id
  ) values (
    p_protocol_id,
    protocol_version_value,
    auth.uid()
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

  if course_id_value is null then
    return jsonb_build_object(
      'connected', false,
      'acknowledged', false,
      'teacherUnlocked', false,
      'supervisionActive', false,
      'ageEligible', false,
      'protocol', null
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
      'connected', true,
      'acknowledged', false,
      'teacherUnlocked', false,
      'supervisionActive', false,
      'ageEligible', false,
      'protocol', null
    );
  end if;

  select exists (
    select 1 from public.safety_acknowledgments acknowledgment
    where acknowledgment.protocol_id = protocol_row.id
      and acknowledgment.protocol_version = protocol_row.version
      and acknowledgment.student_id = auth.uid()
  ) into acknowledged;

  select date_of_birth into student_birth_date
  from public.profiles
  where user_id = auth.uid();
  age_eligible := protocol_row.minimum_age is null
    or (
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

revoke all on function public.acknowledge_assignment_safety_protocol(uuid, uuid) from public;
revoke all on function public.get_assignment_practical_gate(uuid) from public;
grant execute on function public.acknowledge_assignment_safety_protocol(uuid, uuid) to authenticated;
grant execute on function public.get_assignment_practical_gate(uuid) to authenticated;

alter table public.safety_protocols enable row level security;
alter table public.safety_acknowledgments enable row level security;
alter table public.practical_activity_sessions enable row level security;

create policy safety_protocols_course_select
  on public.safety_protocols for select
  using (
    public.can_author_course(course_id)
    or (status = 'published' and public.is_enrolled_in_course(course_id))
  );
create policy safety_protocols_staff_insert
  on public.safety_protocols for insert
  with check (
    created_by = auth.uid()
    and public.can_author_course(course_id)
  );
create policy safety_protocols_staff_update
  on public.safety_protocols for update
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
create policy safety_protocols_staff_delete
  on public.safety_protocols for delete
  using (status = 'draft' and public.can_author_course(course_id));

create policy safety_acknowledgments_select
  on public.safety_acknowledgments for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.safety_protocols protocol
      where protocol.id = safety_acknowledgments.protocol_id
        and public.can_author_course(protocol.course_id)
    )
  );
-- Student acknowledgment writes go only through the checked security-definer RPC.

create policy practical_activity_sessions_select
  on public.practical_activity_sessions for select
  using (student_id = auth.uid() or public.can_author_course(course_id));
create policy practical_activity_sessions_staff_insert
  on public.practical_activity_sessions for insert
  with check (unlocked_by = auth.uid() and public.can_author_course(course_id));
create policy practical_activity_sessions_staff_update
  on public.practical_activity_sessions for update
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));

comment on table public.safety_protocols is
  'Versioned teacher, district, manufacturer, or government procedures. Hazardous procedures are never generated by Diana.';
comment on table public.practical_activity_sessions is
  'Time-bounded teacher unlock and supervision evidence. It is not an automated physical skill certification.';
