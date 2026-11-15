-- Diana Course Mode: immutable approved standards and collision-safe course revisions.

create or replace function public.protect_approved_standards_framework()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'approved' then
    raise exception 'Approved standards frameworks are immutable. Import a new CASE version.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists standards_frameworks_approved_immutable on public.standards_frameworks;
create trigger standards_frameworks_approved_immutable
  before update or delete on public.standards_frameworks
  for each row execute function public.protect_approved_standards_framework();

create or replace function public.protect_approved_standard_children()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  framework_status text;
begin
  select status into framework_status
  from public.standards_frameworks
  where id = old.framework_id;
  if framework_status = 'approved' then
    raise exception 'Items and associations in an approved standards framework are immutable.';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists standard_items_approved_immutable on public.standard_items;
create trigger standard_items_approved_immutable
  before update or delete on public.standard_items
  for each row execute function public.protect_approved_standard_children();
drop trigger if exists standard_associations_approved_immutable on public.standard_associations;
create trigger standard_associations_approved_immutable
  before update or delete on public.standard_associations
  for each row execute function public.protect_approved_standard_children();

create or replace function public.create_course_revision(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_course public.course_mode_courses%rowtype;
  next_id uuid;
  next_version integer;
begin
  select * into source_course
  from public.course_mode_courses
  where id = p_course_id and status in ('published', 'retired');
  if source_course.id is null or not public.can_author_course(source_course.id) then return null; end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.course_mode_courses
  where organization_id = source_course.organization_id
    and title = source_course.title;

  insert into public.course_mode_courses (
    organization_id, title, subject_domain, grade_band, course_level,
    jurisdiction_code, standards_framework_id, status, version,
    parent_version_id, created_by
  ) values (
    source_course.organization_id, source_course.title, source_course.subject_domain,
    source_course.grade_band, source_course.course_level, source_course.jurisdiction_code,
    source_course.standards_framework_id, 'draft', next_version,
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
end;
$$;

revoke all on function public.create_course_revision(uuid) from public;
grant execute on function public.create_course_revision(uuid) to authenticated;
