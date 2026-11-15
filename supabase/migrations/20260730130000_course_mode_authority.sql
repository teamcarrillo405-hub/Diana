-- Diana Course Mode: verified school authority and versioned course content.
-- This model is intentionally separate from student-owned sharing/portal tables.

create table if not exists public.school_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 160),
  organization_type text not null check (organization_type in ('district', 'school', 'program')),
  jurisdiction_code text,
  status text not null default 'active' check (status in ('active', 'suspended', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('district_admin', 'school_admin', 'teacher', 'aide', 'student')),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'suspended')),
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  check (
    (verification_status = 'verified' and verified_at is not null and verified_by is not null)
    or verification_status <> 'verified'
  ),
  check (verified_by is null or verified_by <> user_id)
);

create index if not exists organization_memberships_user_idx
  on public.organization_memberships (user_id, verification_status);
create index if not exists organization_memberships_org_idx
  on public.organization_memberships (organization_id, role, verification_status);

create or replace function public.is_verified_organization_member(
  target_organization_id uuid,
  allowed_roles text[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.verification_status = 'verified'
      and (allowed_roles is null or membership.role = any(allowed_roles))
  );
$$;

revoke all on function public.is_verified_organization_member(uuid, text[]) from public;
grant execute on function public.is_verified_organization_member(uuid, text[]) to authenticated;

create table if not exists public.course_mode_courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 200),
  subject_domain text not null,
  grade_band text not null,
  course_level text,
  jurisdiction_code text,
  standards_framework_id uuid references public.standards_frameworks(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, title, version),
  check (
    (status = 'published' and published_at is not null and published_by is not null)
    or status <> 'published'
  )
);

create table if not exists public.course_mode_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  membership_id uuid not null references public.organization_memberships(id) on delete cascade,
  enrollment_role text not null check (enrollment_role in ('teacher', 'aide', 'student')),
  status text not null default 'active' check (status in ('invited', 'active', 'completed', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, membership_id)
);

create index if not exists course_mode_courses_org_idx
  on public.course_mode_courses (organization_id, status, subject_domain);
create index if not exists course_mode_enrollments_course_idx
  on public.course_mode_enrollments (course_id, enrollment_role, status);

create or replace function public.validate_course_mode_enrollment()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  course_organization_id uuid;
  member_organization_id uuid;
  member_role text;
begin
  select organization_id into course_organization_id
  from public.course_mode_courses
  where id = new.course_id;

  select organization_id, role
    into member_organization_id, member_role
  from public.organization_memberships
  where id = new.membership_id;

  if course_organization_id is null or member_organization_id is null
     or course_organization_id <> member_organization_id then
    raise exception 'Course enrollment must use a membership from the same organization.';
  end if;

  if member_role <> new.enrollment_role
     and not (member_role in ('district_admin', 'school_admin') and new.enrollment_role = 'teacher') then
    raise exception 'Course enrollment role must match the verified organization role.';
  end if;

  return new;
end;
$$;

create trigger course_mode_enrollment_validate
  before insert or update on public.course_mode_enrollments
  for each row execute function public.validate_course_mode_enrollment();

create or replace function public.can_author_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_mode_courses course
    join public.organization_memberships membership
      on membership.organization_id = course.organization_id
    where course.id = target_course_id
      and membership.user_id = auth.uid()
      and membership.verification_status = 'verified'
      and membership.role in ('district_admin', 'school_admin', 'teacher')
  );
$$;

create or replace function public.is_enrolled_in_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership on membership.id = enrollment.membership_id
    where enrollment.course_id = target_course_id
      and enrollment.status = 'active'
      and membership.user_id = auth.uid()
      and membership.verification_status = 'verified'
  );
$$;

revoke all on function public.can_author_course(uuid) from public;
revoke all on function public.is_enrolled_in_course(uuid) from public;
grant execute on function public.can_author_course(uuid) to authenticated;
grant execute on function public.is_enrolled_in_course(uuid) to authenticated;

create table if not exists public.course_mode_units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  title text not null,
  summary text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.course_mode_units(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_mode_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.course_mode_units(id) on delete cascade,
  title text not null,
  summary text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 600),
  accessibility_variants jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.course_mode_lessons(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_mode_lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_mode_lessons(id) on delete cascade,
  resource_type text not null check (resource_type in ('text', 'file', 'link', 'video', 'audio', 'interactive')),
  title text not null,
  source_uri text,
  storage_path text,
  content_text text,
  provenance jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (source_uri is not null or storage_path is not null or content_text is not null)
);

create table if not exists public.teacher_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  course_id uuid references public.course_mode_courses(id) on delete cascade,
  subject_type text not null check (subject_type in ('course', 'unit', 'lesson', 'assessment', 'safety_protocol', 'final_grade', 'practical_unlock')),
  subject_id uuid not null,
  subject_version integer not null default 1 check (subject_version > 0),
  decision text not null check (decision in ('approved', 'returned', 'revoked')),
  notes text,
  decided_by uuid not null references auth.users(id) on delete restrict,
  decided_at timestamptz not null default now()
);

create index if not exists teacher_approvals_subject_idx
  on public.teacher_approvals (subject_type, subject_id, subject_version, decided_at desc);

create or replace function public.protect_published_course_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'published' then
    raise exception 'Published course content is immutable. Create a new version.';
  end if;
  return new;
end;
$$;

create trigger course_mode_courses_published_immutable
  before update or delete on public.course_mode_courses
  for each row execute function public.protect_published_course_content();
create trigger course_mode_units_published_immutable
  before update or delete on public.course_mode_units
  for each row execute function public.protect_published_course_content();
create trigger course_mode_lessons_published_immutable
  before update or delete on public.course_mode_lessons
  for each row execute function public.protect_published_course_content();

alter table public.school_organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.course_mode_courses enable row level security;
alter table public.course_mode_enrollments enable row level security;
alter table public.course_mode_units enable row level security;
alter table public.course_mode_lessons enable row level security;
alter table public.course_mode_lesson_resources enable row level security;
alter table public.teacher_approvals enable row level security;

create policy school_organizations_member_select
  on public.school_organizations for select
  using (public.is_verified_organization_member(id, null));

create policy organization_memberships_member_select
  on public.organization_memberships for select
  using (
    user_id = auth.uid()
    or public.is_verified_organization_member(
      organization_id,
      array['district_admin', 'school_admin', 'teacher']::text[]
    )
  );

-- Organization and membership creation/verification intentionally have no
-- authenticated INSERT/UPDATE policies. They require service-role provisioning.

create policy course_mode_courses_member_select
  on public.course_mode_courses for select
  using (
    public.can_author_course(id)
    or (status = 'published' and public.is_enrolled_in_course(id))
  );
create policy course_mode_courses_staff_insert
  on public.course_mode_courses for insert
  with check (
    created_by = auth.uid()
    and public.is_verified_organization_member(
      organization_id,
      array['district_admin', 'school_admin', 'teacher']::text[]
    )
  );
create policy course_mode_courses_staff_update
  on public.course_mode_courses for update
  using (public.can_author_course(id))
  with check (public.can_author_course(id));
create policy course_mode_courses_staff_delete
  on public.course_mode_courses for delete
  using (public.can_author_course(id) and status = 'draft');

create policy course_mode_enrollments_member_select
  on public.course_mode_enrollments for select
  using (
    public.can_author_course(course_id)
    or membership_id in (
      select membership.id
      from public.organization_memberships membership
      where membership.user_id = auth.uid()
    )
  );
create policy course_mode_enrollments_staff_write
  on public.course_mode_enrollments for all
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));

create policy course_mode_units_course_select
  on public.course_mode_units for select
  using (
    public.can_author_course(course_id)
    or (status = 'published' and public.is_enrolled_in_course(course_id))
  );
create policy course_mode_units_staff_insert
  on public.course_mode_units for insert
  with check (public.can_author_course(course_id) and created_by = auth.uid());
create policy course_mode_units_staff_update
  on public.course_mode_units for update
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
create policy course_mode_units_staff_delete
  on public.course_mode_units for delete
  using (public.can_author_course(course_id) and status = 'draft');

create policy course_mode_lessons_course_select
  on public.course_mode_lessons for select
  using (
    exists (
      select 1 from public.course_mode_units unit
      where unit.id = course_mode_lessons.unit_id
        and (
          public.can_author_course(unit.course_id)
          or (
            course_mode_lessons.status = 'published'
            and unit.status = 'published'
            and public.is_enrolled_in_course(unit.course_id)
          )
        )
    )
  );
create policy course_mode_lessons_staff_insert
  on public.course_mode_lessons for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.course_mode_units unit
      where unit.id = course_mode_lessons.unit_id
        and public.can_author_course(unit.course_id)
    )
  );
create policy course_mode_lessons_staff_update
  on public.course_mode_lessons for update
  using (
    exists (
      select 1 from public.course_mode_units unit
      where unit.id = course_mode_lessons.unit_id
        and public.can_author_course(unit.course_id)
    )
  )
  with check (
    exists (
      select 1 from public.course_mode_units unit
      where unit.id = course_mode_lessons.unit_id
        and public.can_author_course(unit.course_id)
    )
  );
create policy course_mode_lessons_staff_delete
  on public.course_mode_lessons for delete
  using (
    status = 'draft'
    and exists (
      select 1 from public.course_mode_units unit
      where unit.id = course_mode_lessons.unit_id
        and public.can_author_course(unit.course_id)
    )
  );

create policy course_mode_lesson_resources_lesson_select
  on public.course_mode_lesson_resources for select
  using (
    exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_resources.lesson_id
        and (
          public.can_author_course(unit.course_id)
          or (
            lesson.status = 'published'
            and unit.status = 'published'
            and public.is_enrolled_in_course(unit.course_id)
          )
        )
    )
  );
create policy course_mode_lesson_resources_staff_write
  on public.course_mode_lesson_resources for all
  using (
    exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_resources.lesson_id
        and lesson.status = 'draft'
        and public.can_author_course(unit.course_id)
    )
  )
  with check (
    exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_resources.lesson_id
        and lesson.status = 'draft'
        and public.can_author_course(unit.course_id)
    )
  );

create policy teacher_approvals_staff_select
  on public.teacher_approvals for select
  using (
    public.is_verified_organization_member(
      organization_id,
      array['district_admin', 'school_admin', 'teacher']::text[]
    )
    or (course_id is not null and public.is_enrolled_in_course(course_id))
  );
create policy teacher_approvals_staff_insert
  on public.teacher_approvals for insert
  with check (
    decided_by = auth.uid()
    and public.is_verified_organization_member(
      organization_id,
      array['district_admin', 'school_admin', 'teacher']::text[]
    )
    and (course_id is null or public.can_author_course(course_id))
  );

comment on table public.organization_memberships is
  'Verified school authority. This is not the student-owned sharing roster and cannot be self-verified.';
comment on table public.teacher_approvals is
  'Append-only approval evidence for published course content, safety, practical work, and final grades.';
