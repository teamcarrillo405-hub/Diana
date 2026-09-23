-- Diana Course Mode: idempotent assessment starts and deterministic course grades.

alter table public.teacher_approvals
  drop constraint if exists teacher_approvals_subject_type_check;
alter table public.teacher_approvals
  add constraint teacher_approvals_subject_type_check
  check (subject_type in (
    'standards_framework', 'course', 'unit', 'lesson', 'objective',
    'course_assignment', 'assessment', 'grading_rule', 'safety_protocol',
    'final_grade', 'practical_unlock'
  ));

create table if not exists public.course_grading_rules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  assessment_blueprint_id uuid not null references public.assessment_blueprints(id) on delete cascade,
  grading_period text not null,
  weight numeric(8,4) not null check (weight > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.course_grading_rules(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, assessment_blueprint_id, grading_period, version),
  check (
    (status = 'approved' and approved_by is not null and approved_at is not null)
    or status <> 'approved'
  )
);

create index if not exists course_grading_rules_course_period_idx
  on public.course_grading_rules (course_id, grading_period, status);

create or replace function public.validate_course_grading_rule()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  blueprint_course uuid;
begin
  if tg_op = 'DELETE' then
    if old.status = 'approved' then
      raise exception 'Approved grading rules are immutable. Create a new version.';
    end if;
    return old;
  end if;
  select course_id into blueprint_course
  from public.assessment_blueprints
  where id = new.assessment_blueprint_id;
  if blueprint_course <> new.course_id
     or new.created_by <> auth.uid()
     or not public.can_author_course(new.course_id) then
    raise exception 'Grading rules require a verified course teacher and an assessment from the same course.';
  end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then
    raise exception 'Approved grading rules are immutable. Create a new version.';
  end if;
  if (tg_op = 'INSERT' or old.status <> 'approved') and new.status = 'approved' then
    if new.approved_by <> auth.uid() or new.approved_at is null then
      raise exception 'The approving teacher must approve the grading rule.';
    end if;
    if not exists (
      select 1 from public.teacher_approvals approval
      join public.course_mode_courses course on course.id = new.course_id
      where approval.organization_id = course.organization_id
        and approval.course_id = new.course_id
        and approval.subject_type = 'grading_rule'
        and approval.subject_id = new.id
        and approval.subject_version = new.version
        and approval.decision = 'approved'
    ) then
      raise exception 'Grading rule approval evidence is required.';
    end if;
  end if;
  return new;
end;
$$;

create trigger course_grading_rules_validate
  before insert or update or delete on public.course_grading_rules
  for each row execute function public.validate_course_grading_rule();

create or replace function public.calculate_course_grade(
  p_course_id uuid,
  p_student_id uuid,
  p_grading_period text
)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  rule_count integer;
  scored_count integer;
  total_weight numeric;
  weighted_percent numeric;
  breakdown jsonb;
begin
  if not public.can_author_course(p_course_id) then return null; end if;
  select
    count(*),
    count(latest.final_percent),
    coalesce(sum(rule.weight), 0),
    case when sum(rule.weight) > 0
      then round(sum(latest.final_percent * rule.weight) / sum(rule.weight), 3)
      else null end,
    coalesce(jsonb_agg(jsonb_build_object(
      'ruleId', rule.id,
      'assessmentId', rule.assessment_blueprint_id,
      'weight', rule.weight,
      'attemptId', latest.id,
      'percent', latest.final_percent
    ) order by blueprint.title), '[]'::jsonb)
  into rule_count, scored_count, total_weight, weighted_percent, breakdown
  from public.course_grading_rules rule
  join public.assessment_blueprints blueprint
    on blueprint.id = rule.assessment_blueprint_id
  left join lateral (
    select attempt.id, attempt.final_percent
    from public.assessment_attempts attempt
    where attempt.blueprint_id = rule.assessment_blueprint_id
      and attempt.student_id = p_student_id
      and attempt.status = 'confirmed'
    order by attempt.confirmed_at desc
    limit 1
  ) latest on true
  where rule.course_id = p_course_id
    and rule.grading_period = trim(p_grading_period)
    and rule.status = 'approved';

  return jsonb_build_object(
    'ready', rule_count > 0 and scored_count = rule_count and total_weight > 0,
    'ruleCount', rule_count,
    'scoredCount', scored_count,
    'totalWeight', total_weight,
    'calculatedPercent', weighted_percent,
    'breakdown', breakdown
  );
end;
$$;

create or replace function public.confirm_calculated_course_final_grade(
  p_course_id uuid,
  p_student_id uuid,
  p_grading_period text,
  p_final_percent numeric,
  p_letter_grade text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  calculation jsonb;
  calculated_percent numeric;
begin
  calculation := public.calculate_course_grade(p_course_id, p_student_id, p_grading_period);
  if calculation is null or coalesce((calculation ->> 'ready')::boolean, false) is not true then
    return null;
  end if;
  calculated_percent := (calculation ->> 'calculatedPercent')::numeric;
  return public.confirm_course_final_grade(
    p_course_id,
    p_student_id,
    p_grading_period,
    calculated_percent,
    p_final_percent,
    p_letter_grade,
    calculation,
    p_reason
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
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_blueprint_id::text, 0));
  select id into attempt_id
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id
    and student_id = auth.uid()
    and status = 'in_progress'
  order by started_at desc
  limit 1;
  if attempt_id is not null then return attempt_id; end if;

  select * into blueprint_row from public.assessment_blueprints where id = p_blueprint_id;
  select status into course_status from public.course_mode_courses where id = blueprint_row.course_id;
  if blueprint_row.id is null
     or blueprint_row.status <> 'published'
     or course_status <> 'published'
     or not public.is_enrolled_in_course(blueprint_row.course_id) then
    return null;
  end if;
  select count(*) into prior_count
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id
    and student_id = auth.uid()
    and status <> 'voided';
  if prior_count >= blueprint_row.max_attempts then return null; end if;
  insert into public.assessment_attempts (
    blueprint_id, blueprint_version, student_id, attempt_number
  ) values (
    p_blueprint_id, blueprint_row.version, auth.uid(), prior_count + 1
  ) returning id into attempt_id;
  return attempt_id;
end;
$$;

revoke all on function public.calculate_course_grade(uuid, uuid, text) from public;
revoke all on function public.confirm_calculated_course_final_grade(uuid, uuid, text, numeric, text, text) from public;
grant execute on function public.calculate_course_grade(uuid, uuid, text) to authenticated;
grant execute on function public.confirm_calculated_course_final_grade(uuid, uuid, text, numeric, text, text) to authenticated;

alter table public.course_grading_rules enable row level security;

create policy course_grading_rules_select
  on public.course_grading_rules for select
  using (
    public.can_author_course(course_id)
    or (status = 'approved' and public.is_enrolled_in_course(course_id))
  );
create policy course_grading_rules_staff_insert
  on public.course_grading_rules for insert
  with check (created_by = auth.uid() and public.can_author_course(course_id));
create policy course_grading_rules_staff_update
  on public.course_grading_rules for update
  using (status = 'draft' and public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
create policy course_grading_rules_staff_delete
  on public.course_grading_rules for delete
  using (status = 'draft' and public.can_author_course(course_id));
