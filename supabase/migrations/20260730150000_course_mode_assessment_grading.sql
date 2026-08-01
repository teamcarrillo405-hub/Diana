-- Diana Course Mode: QTI-compatible assessment, deterministic scoring,
-- teacher-confirmed grades, and LMS grade-sync receipts.

alter table public.learning_objectives
  add column if not exists course_mode_course_id uuid
  references public.course_mode_courses(id) on delete cascade;

create table if not exists public.course_mode_lesson_objectives (
  lesson_id uuid not null references public.course_mode_lessons(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  alignment_type text not null default 'teaches'
    check (alignment_type in ('introduces', 'teaches', 'practices', 'assesses')),
  primary key (lesson_id, objective_id, alignment_type)
);

create table if not exists public.assessment_blueprints (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  title text not null,
  purpose text not null default 'formative' check (purpose in ('formative', 'summative')),
  instructions text,
  max_attempts integer not null default 1 check (max_attempts between 1 and 20),
  release_conditions jsonb not null default '{}'::jsonb check (jsonb_typeof(release_conditions) = 'object'),
  external_assignment_id text,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  version integer not null default 1 check (version > 0),
  parent_version_id uuid references public.assessment_blueprints(id) on delete set null,
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

create table if not exists public.assessment_items (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.assessment_blueprints(id) on delete cascade,
  identifier text not null check (identifier ~ '^[A-Za-z][A-Za-z0-9_-]{0,79}$'),
  title text not null,
  interaction_type text not null
    check (interaction_type in ('choice', 'multiple_choice', 'text_entry', 'numeric_entry', 'extended_text')),
  prompt text not null,
  body jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object'),
  response_declaration jsonb not null default '{}'::jsonb check (jsonb_typeof(response_declaration) = 'object'),
  points_possible numeric(10,3) not null check (points_possible > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, identifier)
);

create table if not exists public.assessment_item_objectives (
  item_id uuid not null references public.assessment_items(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  evidence_weight numeric(6,4) not null default 1 check (evidence_weight > 0),
  primary key (item_id, objective_id)
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.assessment_blueprints(id) on delete cascade,
  blueprint_version integer not null check (blueprint_version > 0),
  student_id uuid not null references auth.users(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'scored', 'confirmed', 'voided')),
  auto_score numeric(12,3),
  teacher_score numeric(12,3),
  final_score numeric(12,3),
  points_possible numeric(12,3),
  final_percent numeric(7,3) check (final_percent is null or final_percent between 0 and 100),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  scored_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete restrict,
  unique (blueprint_id, student_id, attempt_number),
  check (
    (status = 'confirmed' and confirmed_at is not null and confirmed_by is not null and final_score is not null)
    or status <> 'confirmed'
  )
);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  item_id uuid not null references public.assessment_items(id) on delete cascade,
  student_response jsonb not null default 'null'::jsonb,
  auto_score numeric(10,3),
  teacher_score numeric(10,3),
  teacher_feedback text,
  scored_by uuid references auth.users(id) on delete restrict,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attempt_id, item_id)
);

create table if not exists public.criterion_scores (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  criterion_identifier text not null,
  label text not null,
  points_awarded numeric(10,3) not null check (points_awarded >= 0),
  points_possible numeric(10,3) not null check (points_possible > 0),
  rationale text,
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  unique (attempt_id, criterion_identifier),
  check (points_awarded <= points_possible)
);

create table if not exists public.final_grade_records (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  grading_period text not null,
  calculated_percent numeric(7,3) check (calculated_percent between 0 and 100),
  final_percent numeric(7,3) not null check (final_percent between 0 and 100),
  letter_grade text,
  calculation_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(calculation_summary) = 'object'),
  status text not null default 'confirmed' check (status in ('confirmed', 'synced', 'superseded')),
  version integer not null default 1 check (version > 0),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  supersedes_id uuid references public.final_grade_records(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, student_id, grading_period, version)
);

create table if not exists public.grade_change_events (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  grade_kind text not null check (grade_kind in ('assessment', 'course_final')),
  grade_record_id uuid not null,
  prior_value jsonb,
  next_value jsonb not null,
  reason text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create table if not exists public.course_mode_lms_links (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom')),
  connection_id uuid not null references public.lms_connections(id) on delete cascade,
  external_course_id text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (course_id, provider)
);

create table if not exists public.lms_grade_sync_receipts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.course_mode_courses(id) on delete cascade,
  attempt_id uuid references public.assessment_attempts(id) on delete cascade,
  final_grade_id uuid references public.final_grade_records(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom')),
  external_course_id text not null,
  external_assignment_id text,
  external_student_id text not null,
  idempotency_key text not null,
  status text not null default 'prepared'
    check (status in ('prepared', 'syncing', 'synced', 'not_accepted')),
  score numeric(12,3) not null,
  points_possible numeric(12,3),
  provider_receipt_id text,
  provider_response jsonb not null default '{}'::jsonb,
  error_detail text,
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (course_id, provider, idempotency_key),
  check ((attempt_id is not null)::integer + (final_grade_id is not null)::integer = 1)
);

create index if not exists learning_objectives_course_mode_idx
  on public.learning_objectives (course_mode_course_id, status);
create index if not exists assessment_blueprints_course_idx
  on public.assessment_blueprints (course_id, status, purpose);
create index if not exists assessment_items_blueprint_idx
  on public.assessment_items (blueprint_id, position);
create index if not exists assessment_attempts_student_idx
  on public.assessment_attempts (student_id, blueprint_id, status);
create index if not exists grade_change_events_course_idx
  on public.grade_change_events (course_id, student_id, changed_at desc);
create index if not exists lms_grade_sync_receipts_course_idx
  on public.lms_grade_sync_receipts (course_id, status, created_at desc);

create or replace function public.validate_course_mode_objective()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.course_mode_course_id is not null then
    if new.owner_id <> auth.uid() or not public.can_author_course(new.course_mode_course_id) then
      raise exception 'A verified course teacher must own course objectives.';
    end if;
  end if;
  return new;
end;
$$;

create trigger learning_objectives_course_mode_validate
  before insert or update on public.learning_objectives
  for each row execute function public.validate_course_mode_objective();

create or replace function public.require_course_content_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  approval_type text;
  expected_organization_id uuid;
  expected_course_id uuid;
begin
  if old.status <> 'published' and new.status = 'published' then
    approval_type := case tg_table_name
      when 'course_mode_courses' then 'course'
      when 'course_mode_units' then 'unit'
      when 'course_mode_lessons' then 'lesson'
      when 'assessment_blueprints' then 'assessment'
      when 'safety_protocols' then 'safety_protocol'
      else null
    end;
    if tg_table_name = 'course_mode_courses' then
      expected_organization_id := new.organization_id;
      expected_course_id := new.id;
    elsif tg_table_name = 'course_mode_units' then
      select course.organization_id, course.id
        into expected_organization_id, expected_course_id
      from public.course_mode_courses course where course.id = new.course_id;
    elsif tg_table_name = 'course_mode_lessons' then
      select course.organization_id, course.id
        into expected_organization_id, expected_course_id
      from public.course_mode_units unit
      join public.course_mode_courses course on course.id = unit.course_id
      where unit.id = new.unit_id;
    elsif tg_table_name in ('assessment_blueprints', 'safety_protocols') then
      select course.organization_id, course.id
        into expected_organization_id, expected_course_id
      from public.course_mode_courses course where course.id = new.course_id;
    end if;
    if approval_type is null or not exists (
      select 1
      from public.teacher_approvals approval
      where approval.subject_type = approval_type
        and approval.subject_id = new.id
        and approval.subject_version = new.version
        and approval.decision = 'approved'
        and approval.organization_id = expected_organization_id
        and approval.course_id = expected_course_id
    ) then
      raise exception 'Teacher approval is required before publishing course content.';
    end if;
    if new.published_by <> auth.uid() or new.published_at is null then
      raise exception 'Publication must record the verified teacher and time.';
    end if;
  end if;
  return new;
end;
$$;

create trigger course_mode_courses_require_approval
  before update on public.course_mode_courses
  for each row execute function public.require_course_content_approval();
create trigger course_mode_units_require_approval
  before update on public.course_mode_units
  for each row execute function public.require_course_content_approval();
create trigger course_mode_lessons_require_approval
  before update on public.course_mode_lessons
  for each row execute function public.require_course_content_approval();
create trigger safety_protocols_require_approval
  before update on public.safety_protocols
  for each row execute function public.require_course_content_approval();

create or replace function public.protect_published_assessment_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.assessment_blueprints blueprint
    where blueprint.id = old.blueprint_id and blueprint.status = 'published'
  ) then
    raise exception 'Published assessment items are immutable. Create a new blueprint version.';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.validate_assessment_blueprint_publish()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status <> 'published' and new.status = 'published' then
    if not exists (
      select 1 from public.assessment_items item where item.blueprint_id = new.id
    ) then
      raise exception 'Published assessment requires at least one item.';
    end if;
    if exists (
      select 1
      from public.assessment_items item
      where item.blueprint_id = new.id
        and (
          item.interaction_type <> 'extended_text'
          and (
            jsonb_typeof(item.response_declaration -> 'correctResponse') <> 'array'
            or jsonb_array_length(item.response_declaration -> 'correctResponse') = 0
          )
        )
    ) then
      raise exception 'Every deterministic assessment item requires an approved correct response.';
    end if;
    if exists (
      select 1
      from public.assessment_items item
      where item.blueprint_id = new.id
        and item.interaction_type in ('choice', 'multiple_choice')
        and (
          jsonb_typeof(item.body -> 'choices') <> 'array'
          or jsonb_array_length(item.body -> 'choices') < 2
        )
    ) then
      raise exception 'Choice assessment items require at least two choices.';
    end if;
  end if;
  return new;
end;
$$;

create trigger assessment_blueprints_publish_validate
  before update on public.assessment_blueprints
  for each row execute function public.validate_assessment_blueprint_publish();
create trigger assessment_blueprints_require_approval
  before update on public.assessment_blueprints
  for each row execute function public.require_course_content_approval();
create trigger assessment_blueprints_published_immutable
  before update or delete on public.assessment_blueprints
  for each row execute function public.protect_published_course_content();
create trigger assessment_items_published_immutable
  before update or delete on public.assessment_items
  for each row execute function public.protect_published_assessment_item();

create or replace function public.score_qti_item_response(
  item_interaction_type text,
  item_response_declaration jsonb,
  item_points numeric,
  student_response jsonb
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  correct_values text[];
  received_values text[];
  case_sensitive boolean;
  tolerance numeric;
  expected_number numeric;
  received_number numeric;
begin
  if item_interaction_type = 'extended_text' then
    return null;
  end if;
  select coalesce(array_agg(value), '{}') into correct_values
  from jsonb_array_elements_text(coalesce(item_response_declaration -> 'correctResponse', '[]'::jsonb)) value;
  case_sensitive := coalesce((item_response_declaration ->> 'caseSensitive')::boolean, false);

  if item_interaction_type = 'numeric_entry' then
    begin
      expected_number := (correct_values[1])::numeric;
      received_number := trim(both '"' from student_response::text)::numeric;
      tolerance := coalesce((item_response_declaration ->> 'numericTolerance')::numeric, 0);
      return case when abs(received_number - expected_number) <= tolerance then item_points else 0 end;
    exception when invalid_text_representation then
      return 0;
    end;
  end if;

  if jsonb_typeof(student_response) = 'array' then
    select coalesce(array_agg(value), '{}') into received_values
    from jsonb_array_elements_text(student_response) value;
  else
    received_values := array[trim(both '"' from student_response::text)];
  end if;
  if not case_sensitive then
    select array_agg(lower(value) order by lower(value)) into correct_values from unnest(correct_values) value;
    select array_agg(lower(value) order by lower(value)) into received_values from unnest(received_values) value;
  else
    select array_agg(value order by value) into correct_values from unnest(correct_values) value;
    select array_agg(value order by value) into received_values from unnest(received_values) value;
  end if;

  if item_interaction_type = 'multiple_choice' then
    return case when received_values = correct_values then item_points else 0 end;
  end if;
  return case
    when array_length(received_values, 1) = 1 and received_values[1] = any(correct_values) then item_points
    else 0
  end;
end;
$$;

create or replace function public.validate_course_mode_lms_link()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  connection_owner uuid;
  connection_provider text;
begin
  select owner_id, provider into connection_owner, connection_provider
  from public.lms_connections where id = new.connection_id;
  if new.created_by <> auth.uid() or connection_owner <> auth.uid()
     or connection_provider <> new.provider or not public.can_author_course(new.course_id) then
    raise exception 'LMS grade link must use the verified teacher connection for this course.';
  end if;
  return new;
end;
$$;

create trigger course_mode_lms_link_validate
  before insert or update on public.course_mode_lms_links
  for each row execute function public.validate_course_mode_lms_link();

create or replace function public.confirm_course_final_grade(
  p_course_id uuid,
  p_student_id uuid,
  p_grading_period text,
  p_calculated_percent numeric,
  p_final_percent numeric,
  p_letter_grade text,
  p_calculation_summary jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prior_row public.final_grade_records%rowtype;
  next_version integer;
  next_id uuid;
  organization_id_value uuid;
  student_enrolled boolean;
begin
  if not public.can_author_course(p_course_id)
     or p_final_percent < 0 or p_final_percent > 100
     or p_calculated_percent < 0 or p_calculated_percent > 100
     or char_length(trim(p_grading_period)) = 0 then
    return null;
  end if;
  select exists (
    select 1
    from public.course_mode_enrollments enrollment
    join public.organization_memberships membership on membership.id = enrollment.membership_id
    where enrollment.course_id = p_course_id
      and enrollment.status in ('active', 'completed')
      and enrollment.enrollment_role = 'student'
      and membership.user_id = p_student_id
      and membership.verification_status = 'verified'
  ) into student_enrolled;
  if not student_enrolled then return null; end if;

  select * into prior_row
  from public.final_grade_records
  where course_id = p_course_id
    and student_id = p_student_id
    and grading_period = trim(p_grading_period)
    and status in ('confirmed', 'synced')
  order by version desc
  limit 1;
  next_version := coalesce(prior_row.version, 0) + 1;

  if prior_row.id is not null then
    update public.final_grade_records set status = 'superseded' where id = prior_row.id;
  end if;
  insert into public.final_grade_records (
    course_id, student_id, grading_period, calculated_percent, final_percent,
    letter_grade, calculation_summary, version, confirmed_by, supersedes_id
  ) values (
    p_course_id, p_student_id, trim(p_grading_period), p_calculated_percent, p_final_percent,
    nullif(trim(p_letter_grade), ''), coalesce(p_calculation_summary, '{}'::jsonb),
    next_version, auth.uid(), prior_row.id
  ) returning id into next_id;

  insert into public.grade_change_events (
    course_id, student_id, grade_kind, grade_record_id,
    prior_value, next_value, reason, changed_by
  ) values (
    p_course_id, p_student_id, 'course_final', next_id,
    case when prior_row.id is null then null else jsonb_build_object(
      'recordId', prior_row.id,
      'percent', prior_row.final_percent,
      'letterGrade', prior_row.letter_grade,
      'version', prior_row.version
    ) end,
    jsonb_build_object(
      'recordId', next_id,
      'calculatedPercent', p_calculated_percent,
      'percent', p_final_percent,
      'letterGrade', nullif(trim(p_letter_grade), ''),
      'version', next_version
    ),
    coalesce(nullif(trim(p_reason), ''), 'Teacher confirmed course grade.'),
    auth.uid()
  );
  select organization_id into organization_id_value
  from public.course_mode_courses where id = p_course_id;
  insert into public.teacher_approvals (
    organization_id, course_id, subject_type, subject_id, subject_version,
    decision, notes, decided_by
  ) values (
    organization_id_value, p_course_id, 'final_grade', next_id, next_version,
    'approved', nullif(trim(p_reason), ''), auth.uid()
  );
  return next_id;
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
  prior_count integer;
  attempt_id uuid;
begin
  select * into blueprint_row from public.assessment_blueprints where id = p_blueprint_id;
  if blueprint_row.id is null or blueprint_row.status <> 'published'
     or not public.is_enrolled_in_course(blueprint_row.course_id) then
    return null;
  end if;
  select count(*) into prior_count
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id and student_id = auth.uid() and status <> 'voided';
  if prior_count >= blueprint_row.max_attempts then
    return null;
  end if;
  insert into public.assessment_attempts (
    blueprint_id, blueprint_version, student_id, attempt_number
  ) values (
    p_blueprint_id, blueprint_row.version, auth.uid(), prior_count + 1
  ) returning id into attempt_id;
  return attempt_id;
end;
$$;

create or replace function public.save_assessment_response(
  p_attempt_id uuid,
  p_item_id uuid,
  p_response jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.assessment_attempts%rowtype;
  item_row public.assessment_items%rowtype;
  calculated_score numeric;
begin
  select * into attempt_row
  from public.assessment_attempts
  where id = p_attempt_id and student_id = auth.uid() and status = 'in_progress';
  if attempt_row.id is null then return false; end if;

  select * into item_row
  from public.assessment_items
  where id = p_item_id and blueprint_id = attempt_row.blueprint_id;
  if item_row.id is null then return false; end if;

  calculated_score := public.score_qti_item_response(
    item_row.interaction_type,
    item_row.response_declaration,
    item_row.points_possible,
    p_response
  );
  insert into public.assessment_responses (
    attempt_id, item_id, student_response, auto_score
  ) values (
    p_attempt_id, p_item_id, p_response, calculated_score
  )
  on conflict (attempt_id, item_id) do update
    set student_response = excluded.student_response,
        auto_score = excluded.auto_score,
        teacher_score = null,
        teacher_feedback = null,
        scored_by = null,
        scored_at = null,
        updated_at = now();
  return true;
end;
$$;

create or replace function public.submit_assessment_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.assessment_attempts%rowtype;
  item_count integer;
  response_count integer;
  points_total numeric;
  score_total numeric;
  needs_teacher boolean;
begin
  select * into attempt_row
  from public.assessment_attempts
  where id = p_attempt_id and student_id = auth.uid() and status = 'in_progress';
  if attempt_row.id is null then return null; end if;

  select count(*), coalesce(sum(points_possible), 0)
    into item_count, points_total
  from public.assessment_items
  where blueprint_id = attempt_row.blueprint_id;
  select count(*), coalesce(sum(coalesce(response.auto_score, 0)), 0),
         coalesce(bool_or(response.auto_score is null), false)
    into response_count, score_total, needs_teacher
  from public.assessment_responses response
  join public.assessment_items item on item.id = response.item_id
  where response.attempt_id = p_attempt_id and item.blueprint_id = attempt_row.blueprint_id;

  if item_count = 0 or response_count <> item_count then
    return jsonb_build_object('submitted', false, 'reason', 'Every assessment item needs a response.');
  end if;

  update public.assessment_attempts
    set status = case when needs_teacher then 'submitted' else 'scored' end,
        auto_score = score_total,
        points_possible = points_total,
        submitted_at = now(),
        scored_at = case when needs_teacher then null else now() end
  where id = p_attempt_id;
  return jsonb_build_object(
    'submitted', true,
    'requiresTeacherScore', needs_teacher,
    'autoScore', score_total,
    'pointsPossible', points_total
  );
end;
$$;

create or replace function public.record_assessment_teacher_score(
  p_attempt_id uuid,
  p_item_id uuid,
  p_score numeric,
  p_feedback text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  course_id_value uuid;
  points_value numeric;
begin
  select blueprint.course_id, item.points_possible
    into course_id_value, points_value
  from public.assessment_attempts attempt
  join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
  join public.assessment_items item on item.blueprint_id = blueprint.id and item.id = p_item_id
  where attempt.id = p_attempt_id and attempt.status in ('submitted', 'scored');
  if course_id_value is null or not public.can_author_course(course_id_value)
     or p_score < 0 or p_score > points_value then
    return false;
  end if;
  update public.assessment_responses
    set teacher_score = p_score,
        teacher_feedback = nullif(trim(p_feedback), ''),
        scored_by = auth.uid(),
        scored_at = now(),
        updated_at = now()
  where attempt_id = p_attempt_id and item_id = p_item_id;
  return found;
end;
$$;

create or replace function public.confirm_assessment_grade(
  p_attempt_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_row public.assessment_attempts%rowtype;
  blueprint_row public.assessment_blueprints%rowtype;
  score_total numeric;
  points_total numeric;
  unresolved integer;
  percent_value numeric;
begin
  select * into attempt_row from public.assessment_attempts where id = p_attempt_id;
  if attempt_row.id is null or attempt_row.status not in ('submitted', 'scored') then return null; end if;
  select * into blueprint_row from public.assessment_blueprints where id = attempt_row.blueprint_id;
  if not public.can_author_course(blueprint_row.course_id) then return null; end if;

  select
    coalesce(sum(coalesce(response.teacher_score, response.auto_score)), 0),
    coalesce(sum(item.points_possible), 0),
    count(*) filter (where coalesce(response.teacher_score, response.auto_score) is null)
  into score_total, points_total, unresolved
  from public.assessment_items item
  left join public.assessment_responses response
    on response.item_id = item.id and response.attempt_id = p_attempt_id
  where item.blueprint_id = attempt_row.blueprint_id;
  if points_total <= 0 or unresolved > 0 then
    return jsonb_build_object('confirmed', false, 'reason', 'Every item needs an approved score.');
  end if;
  percent_value := round((score_total / points_total) * 100, 3);

  update public.assessment_attempts
    set status = 'confirmed',
        teacher_score = score_total,
        final_score = score_total,
        points_possible = points_total,
        final_percent = percent_value,
        scored_at = coalesce(scored_at, now()),
        confirmed_at = now(),
        confirmed_by = auth.uid()
  where id = p_attempt_id;

  insert into public.grade_change_events (
    course_id, student_id, grade_kind, grade_record_id,
    prior_value, next_value, reason, changed_by
  ) values (
    blueprint_row.course_id, attempt_row.student_id, 'assessment', p_attempt_id,
    jsonb_build_object('status', attempt_row.status, 'score', attempt_row.final_score),
    jsonb_build_object('status', 'confirmed', 'score', score_total, 'pointsPossible', points_total, 'percent', percent_value),
    coalesce(nullif(trim(p_reason), ''), 'Teacher confirmed assessment grade.'),
    auth.uid()
  );
  insert into public.teacher_approvals (
    organization_id, course_id, subject_type, subject_id, subject_version,
    decision, notes, decided_by
  )
  select course.organization_id, course.id, 'final_grade', p_attempt_id, attempt_row.blueprint_version,
         'approved', nullif(trim(p_reason), ''), auth.uid()
  from public.course_mode_courses course where course.id = blueprint_row.course_id;
  return jsonb_build_object(
    'confirmed', true,
    'score', score_total,
    'pointsPossible', points_total,
    'percent', percent_value
  );
end;
$$;

revoke all on function public.start_assessment_attempt(uuid) from public;
revoke all on function public.save_assessment_response(uuid, uuid, jsonb) from public;
revoke all on function public.submit_assessment_attempt(uuid) from public;
revoke all on function public.record_assessment_teacher_score(uuid, uuid, numeric, text) from public;
revoke all on function public.confirm_assessment_grade(uuid, text) from public;
revoke all on function public.confirm_course_final_grade(uuid, uuid, text, numeric, numeric, text, jsonb, text) from public;
grant execute on function public.start_assessment_attempt(uuid) to authenticated;
grant execute on function public.save_assessment_response(uuid, uuid, jsonb) to authenticated;
grant execute on function public.submit_assessment_attempt(uuid) to authenticated;
grant execute on function public.record_assessment_teacher_score(uuid, uuid, numeric, text) to authenticated;
grant execute on function public.confirm_assessment_grade(uuid, text) to authenticated;
grant execute on function public.confirm_course_final_grade(uuid, uuid, text, numeric, numeric, text, jsonb, text) to authenticated;

alter table public.course_mode_lesson_objectives enable row level security;
alter table public.assessment_blueprints enable row level security;
alter table public.assessment_items enable row level security;
alter table public.assessment_item_objectives enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.criterion_scores enable row level security;
alter table public.final_grade_records enable row level security;
alter table public.grade_change_events enable row level security;
alter table public.course_mode_lms_links enable row level security;
alter table public.lms_grade_sync_receipts enable row level security;

create policy learning_objectives_course_member_select
  on public.learning_objectives for select
  using (
    course_mode_course_id is not null
    and (public.can_author_course(course_mode_course_id) or public.is_enrolled_in_course(course_mode_course_id))
  );
create policy course_mode_lesson_objectives_select
  on public.course_mode_lesson_objectives for select
  using (
    exists (
      select 1
      from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_objectives.lesson_id
        and (
          public.can_author_course(unit.course_id)
          or (lesson.status = 'published' and public.is_enrolled_in_course(unit.course_id))
        )
    )
  );
create policy course_mode_lesson_objectives_staff_write
  on public.course_mode_lesson_objectives for all
  using (
    exists (
      select 1 from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_objectives.lesson_id
        and lesson.status = 'draft'
        and public.can_author_course(unit.course_id)
    )
  )
  with check (
    exists (
      select 1 from public.course_mode_lessons lesson
      join public.course_mode_units unit on unit.id = lesson.unit_id
      where lesson.id = course_mode_lesson_objectives.lesson_id
        and lesson.status = 'draft'
        and public.can_author_course(unit.course_id)
    )
  );

create policy assessment_blueprints_select
  on public.assessment_blueprints for select
  using (
    public.can_author_course(course_id)
    or (status = 'published' and public.is_enrolled_in_course(course_id))
  );
create policy assessment_blueprints_staff_insert
  on public.assessment_blueprints for insert
  with check (created_by = auth.uid() and public.can_author_course(course_id));
create policy assessment_blueprints_staff_update
  on public.assessment_blueprints for update
  using (public.can_author_course(course_id))
  with check (public.can_author_course(course_id));
create policy assessment_blueprints_staff_delete
  on public.assessment_blueprints for delete
  using (status = 'draft' and public.can_author_course(course_id));

create policy assessment_items_select
  on public.assessment_items for select
  using (
    exists (
      select 1 from public.assessment_blueprints blueprint
      where blueprint.id = assessment_items.blueprint_id
        and (
          public.can_author_course(blueprint.course_id)
          or (blueprint.status = 'published' and public.is_enrolled_in_course(blueprint.course_id))
        )
    )
  );
create policy assessment_items_staff_write
  on public.assessment_items for all
  using (
    exists (
      select 1 from public.assessment_blueprints blueprint
      where blueprint.id = assessment_items.blueprint_id
        and blueprint.status = 'draft'
        and public.can_author_course(blueprint.course_id)
    )
  )
  with check (
    exists (
      select 1 from public.assessment_blueprints blueprint
      where blueprint.id = assessment_items.blueprint_id
        and blueprint.status = 'draft'
        and public.can_author_course(blueprint.course_id)
    )
  );

create policy assessment_item_objectives_select
  on public.assessment_item_objectives for select
  using (
    exists (
      select 1 from public.assessment_items item
      join public.assessment_blueprints blueprint on blueprint.id = item.blueprint_id
      where item.id = assessment_item_objectives.item_id
        and (
          public.can_author_course(blueprint.course_id)
          or (blueprint.status = 'published' and public.is_enrolled_in_course(blueprint.course_id))
        )
    )
  );
create policy assessment_item_objectives_staff_write
  on public.assessment_item_objectives for all
  using (
    exists (
      select 1 from public.assessment_items item
      join public.assessment_blueprints blueprint on blueprint.id = item.blueprint_id
      where item.id = assessment_item_objectives.item_id
        and blueprint.status = 'draft'
        and public.can_author_course(blueprint.course_id)
    )
  )
  with check (
    exists (
      select 1 from public.assessment_items item
      join public.assessment_blueprints blueprint on blueprint.id = item.blueprint_id
      where item.id = assessment_item_objectives.item_id
        and blueprint.status = 'draft'
        and public.can_author_course(blueprint.course_id)
    )
  );

create policy assessment_attempts_select
  on public.assessment_attempts for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.assessment_blueprints blueprint
      where blueprint.id = assessment_attempts.blueprint_id
        and public.can_author_course(blueprint.course_id)
    )
  );
-- Student attempt and response writes use checked RPCs only.
create policy assessment_responses_select
  on public.assessment_responses for select
  using (
    exists (
      select 1 from public.assessment_attempts attempt
      join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
      where attempt.id = assessment_responses.attempt_id
        and (attempt.student_id = auth.uid() or public.can_author_course(blueprint.course_id))
    )
  );

create policy criterion_scores_select
  on public.criterion_scores for select
  using (
    exists (
      select 1 from public.assessment_attempts attempt
      join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
      where attempt.id = criterion_scores.attempt_id
        and (attempt.student_id = auth.uid() or public.can_author_course(blueprint.course_id))
    )
  );
create policy criterion_scores_staff_write
  on public.criterion_scores for all
  using (
    exists (
      select 1 from public.assessment_attempts attempt
      join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
      where attempt.id = criterion_scores.attempt_id
        and public.can_author_course(blueprint.course_id)
    )
  )
  with check (
    confirmed_by = auth.uid()
    and exists (
      select 1 from public.assessment_attempts attempt
      join public.assessment_blueprints blueprint on blueprint.id = attempt.blueprint_id
      where attempt.id = criterion_scores.attempt_id
        and public.can_author_course(blueprint.course_id)
    )
  );

create policy final_grade_records_select
  on public.final_grade_records for select
  using (student_id = auth.uid() or public.can_author_course(course_id));
create policy grade_change_events_select
  on public.grade_change_events for select
  using (student_id = auth.uid() or public.can_author_course(course_id));
-- Grade events are append-only and are written by checked grading RPCs.

create policy course_mode_lms_links_staff_select
  on public.course_mode_lms_links for select
  using (public.can_author_course(course_id));
create policy course_mode_lms_links_staff_write
  on public.course_mode_lms_links for all
  using (public.can_author_course(course_id))
  with check (created_by = auth.uid() and public.can_author_course(course_id));

create policy lms_grade_sync_receipts_staff_select
  on public.lms_grade_sync_receipts for select
  using (public.can_author_course(course_id));
create policy lms_grade_sync_receipts_staff_insert
  on public.lms_grade_sync_receipts for insert
  with check (confirmed_by = auth.uid() and public.can_author_course(course_id));
create policy lms_grade_sync_receipts_staff_update
  on public.lms_grade_sync_receipts for update
  using (confirmed_by = auth.uid() and public.can_author_course(course_id))
  with check (confirmed_by = auth.uid() and public.can_author_course(course_id));

comment on table public.assessment_blueprints is
  'Versioned QTI-compatible assessment definitions. AI-authored drafts require verified teacher approval before publication.';
comment on table public.assessment_attempts is
  'Student attempts with deterministic objective scoring and explicit teacher confirmation for final grades.';
comment on table public.grade_change_events is
  'Append-only audit history for every teacher-confirmed assessment or course-grade change.';
