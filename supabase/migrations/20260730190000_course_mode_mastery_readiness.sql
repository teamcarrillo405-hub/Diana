-- Diana Course Mode: objective evidence and prerequisite-aware student guidance.

create table if not exists public.objective_mastery_evidence (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('assessment', 'assignment', 'lesson', 'teacher_override')),
  source_id uuid not null,
  mastery numeric(5,4) not null check (mastery between 0 and 1),
  evidence_detail jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence_detail) = 'object'),
  confirmed_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (objective_id, student_id, source_type, source_id)
);

create index if not exists objective_mastery_evidence_student_idx
  on public.objective_mastery_evidence (course_id, student_id, objective_id, created_at desc);

create or replace function public.require_course_standards_coverage()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  objective_count integer;
  gap_count integer;
begin
  if old.status <> 'published' and new.status = 'published' then
    if new.standards_framework_id is null or not exists (
      select 1
      from public.standards_frameworks framework
      join public.teacher_approvals approval
        on approval.subject_type = 'standards_framework'
       and approval.subject_id = framework.id
       and approval.decision = 'approved'
       and approval.organization_id = new.organization_id
      where framework.id = new.standards_framework_id
        and framework.status = 'approved'
    ) then
      raise exception 'Course publication requires an approved standards framework with verified source approval.';
    end if;
    select count(*) into objective_count
    from public.learning_objectives objective
    where objective.course_mode_course_id = new.id
      and objective.status = 'approved';
    if objective_count = 0 then
      raise exception 'Course publication requires at least one approved learning objective.';
    end if;

    select count(*) into gap_count
    from public.learning_objectives objective
    where objective.course_mode_course_id = new.id
      and objective.status = 'approved'
      and (
        not exists (
          select 1 from public.objective_alignments alignment
          where alignment.objective_id = objective.id
        )
        or not exists (
          select 1 from public.course_mode_lesson_objectives alignment
          join public.course_mode_lessons lesson on lesson.id = alignment.lesson_id
          join public.course_mode_units unit on unit.id = lesson.unit_id
          where alignment.objective_id = objective.id
            and unit.course_id = new.id
            and alignment.alignment_type in ('introduces', 'teaches')
        )
        or not exists (
          select 1 from public.course_mode_lesson_objectives alignment
          join public.course_mode_lessons lesson on lesson.id = alignment.lesson_id
          join public.course_mode_units unit on unit.id = lesson.unit_id
          where alignment.objective_id = objective.id
            and unit.course_id = new.id
            and alignment.alignment_type = 'practices'
        )
        or (
          not exists (
            select 1 from public.course_mode_lesson_objectives alignment
            join public.course_mode_lessons lesson on lesson.id = alignment.lesson_id
            join public.course_mode_units unit on unit.id = lesson.unit_id
            where alignment.objective_id = objective.id
              and unit.course_id = new.id
              and alignment.alignment_type = 'assesses'
          )
          and not exists (
            select 1
            from public.assessment_item_objectives alignment
            join public.assessment_items item on item.id = alignment.item_id
            join public.assessment_blueprints blueprint on blueprint.id = item.blueprint_id
            where alignment.objective_id = objective.id
              and blueprint.course_id = new.id
          )
        )
      );
    if gap_count > 0 then
      raise exception 'Course publication requires standards, instruction, practice, and assessment coverage for every approved objective.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists course_standards_coverage_required on public.course_mode_courses;
create trigger course_standards_coverage_required
  before update on public.course_mode_courses
  for each row execute function public.require_course_standards_coverage();

create or replace function public.capture_assessment_objective_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_id_value uuid;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then return new; end if;
  select course_id into course_id_value
  from public.assessment_blueprints
  where id = new.blueprint_id;

  insert into public.objective_mastery_evidence (
    course_id, objective_id, student_id, source_type, source_id,
    mastery, evidence_detail, confirmed_by
  )
  select
    course_id_value,
    alignment.objective_id,
    new.student_id,
    'assessment',
    new.id,
    least(1, greatest(0,
      sum(coalesce(response.teacher_score, response.auto_score) * alignment.evidence_weight)
      / nullif(sum(item.points_possible * alignment.evidence_weight), 0)
    )),
    jsonb_build_object(
      'attemptId', new.id,
      'blueprintId', new.blueprint_id,
      'blueprintVersion', new.blueprint_version
    ),
    new.confirmed_by
  from public.assessment_item_objectives alignment
  join public.assessment_items item on item.id = alignment.item_id
  join public.assessment_responses response
    on response.item_id = item.id and response.attempt_id = new.id
  where item.blueprint_id = new.blueprint_id
    and coalesce(response.teacher_score, response.auto_score) is not null
  group by alignment.objective_id
  on conflict (objective_id, student_id, source_type, source_id)
  do update set
    mastery = excluded.mastery,
    evidence_detail = excluded.evidence_detail,
    confirmed_by = excluded.confirmed_by;
  return new;
end;
$$;

drop trigger if exists assessment_objective_evidence_capture on public.assessment_attempts;
create trigger assessment_objective_evidence_capture
  after update of status on public.assessment_attempts
  for each row execute function public.capture_assessment_objective_evidence();

create or replace function public.get_my_course_objective_readiness(p_course_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  with allowed as (
    select (
      public.is_enrolled_in_course(p_course_id)
      or public.can_author_course(p_course_id)
    ) as ok
  ),
  mastery as (
    select objective_id, avg(mastery) as current_mastery
    from public.objective_mastery_evidence
    where course_id = p_course_id
      and student_id = auth.uid()
    group by objective_id
  ),
  objective_rows as (
    select
      objective.id,
      objective.title,
      coalesce(mastery.current_mastery, 0) as current_mastery,
      not exists (
        select 1
        from public.prerequisite_edges edge
        left join mastery prerequisite_mastery
          on prerequisite_mastery.objective_id = edge.prerequisite_objective_id
        where edge.objective_id = objective.id
          and coalesce(prerequisite_mastery.current_mastery, 0) < edge.minimum_mastery
      ) as ready,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'objectiveId', edge.prerequisite_objective_id,
          'title', prerequisite.title,
          'currentMastery', coalesce(prerequisite_mastery.current_mastery, 0),
          'requiredMastery', edge.minimum_mastery
        ) order by prerequisite.title)
        from public.prerequisite_edges edge
        join public.learning_objectives prerequisite
          on prerequisite.id = edge.prerequisite_objective_id
        left join mastery prerequisite_mastery
          on prerequisite_mastery.objective_id = edge.prerequisite_objective_id
        where edge.objective_id = objective.id
          and coalesce(prerequisite_mastery.current_mastery, 0) < edge.minimum_mastery
      ), '[]'::jsonb) as unmet
    from public.learning_objectives objective
    left join mastery on mastery.objective_id = objective.id
    cross join allowed
    where allowed.ok
      and objective.course_mode_course_id = p_course_id
      and objective.status = 'approved'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'objectiveId', id,
    'title', title,
    'currentMastery', round(current_mastery, 4),
    'ready', ready,
    'unmet', unmet
  ) order by ready desc, current_mastery asc, title), '[]'::jsonb)
  from objective_rows;
$$;

revoke all on function public.get_my_course_objective_readiness(uuid) from public;
grant execute on function public.get_my_course_objective_readiness(uuid) to authenticated;

alter table public.objective_mastery_evidence enable row level security;

create policy objective_mastery_evidence_select
  on public.objective_mastery_evidence for select
  using (
    student_id = auth.uid()
    or public.can_author_course(course_id)
  );

-- Evidence is written by checked assessment functions and teacher-governed
-- workflows. There is intentionally no direct student insert policy.
create policy objective_mastery_evidence_staff_write
  on public.objective_mastery_evidence for all
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
