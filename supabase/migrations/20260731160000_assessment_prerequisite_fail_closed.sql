-- Formal assessments stay closed until every declared prerequisite lesson has
-- a completed progress row for the signed-in student.

create or replace function public.assessment_release_available(
  p_blueprint public.assessment_blueprints,
  p_student_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  opens_at timestamptz;
  closes_at timestamptz;
  prerequisite_count integer := 0;
  completed_count integer := 0;
begin
  if p_student_id is null then return false; end if;

  begin
    opens_at := nullif(p_blueprint.release_conditions ->> 'opensAt', '')::timestamptz;
    closes_at := nullif(p_blueprint.release_conditions ->> 'closesAt', '')::timestamptz;
  exception when others then
    return false;
  end;

  if opens_at is not null and now() < opens_at then return false; end if;
  if closes_at is not null and now() > closes_at then return false; end if;

  if p_blueprint.release_conditions ? 'prerequisiteLessonIds' then
    if jsonb_typeof(p_blueprint.release_conditions -> 'prerequisiteLessonIds') <> 'array' then
      return false;
    end if;

    begin
      with prerequisite_lessons as (
        select distinct value::uuid as lesson_id
        from jsonb_array_elements_text(
          p_blueprint.release_conditions -> 'prerequisiteLessonIds'
        ) as required(value)
      )
      select
        count(*),
        count(*) filter (
          where exists (
            select 1
            from public.course_mode_lesson_progress progress
            where progress.lesson_id = prerequisite_lessons.lesson_id
              and progress.student_id = p_student_id
              and progress.status = 'completed'
          )
        )
      into prerequisite_count, completed_count
      from prerequisite_lessons;
    exception when others then
      return false;
    end;

    if completed_count <> prerequisite_count then return false; end if;
  end if;

  return true;
end;
$$;

revoke all on function public.assessment_release_available(public.assessment_blueprints, uuid)
  from public, anon, authenticated;
grant execute on function public.assessment_release_available(public.assessment_blueprints, uuid)
  to service_role;
