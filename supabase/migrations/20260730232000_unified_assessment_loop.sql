begin;

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  artifact_id uuid not null references public.study_artifacts(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed')),
  score numeric(7,3) check (score is null or score between 0 and 100),
  points_earned integer not null default 0 check (points_earned >= 0),
  points_possible integer not null default 0 check (points_possible >= 0),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_id, artifact_id, attempt_number)
);

create table if not exists public.practice_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  question_index integer not null check (question_index >= 0 and question_index < 100),
  response text not null,
  result_category text not null
    check (result_category in ('matched', 'check_again', 'review_together', 'not_answered')),
  scored boolean not null default false,
  points_earned integer check (points_earned in (0, 1)),
  explanation text not null default '',
  source_anchor text not null default '',
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_index)
);

alter table public.practice_attempts enable row level security;
alter table public.practice_responses enable row level security;

create policy practice_attempts_owner_access
  on public.practice_attempts for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy practice_responses_owner_access
  on public.practice_responses for all
  using (
    exists (
      select 1
      from public.practice_attempts attempt
      where attempt.id = practice_responses.attempt_id
        and attempt.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.practice_attempts attempt
      where attempt.id = practice_responses.attempt_id
        and attempt.owner_id = auth.uid()
    )
  );

create index if not exists practice_attempts_owner_updated_idx
  on public.practice_attempts (owner_id, updated_at desc);
create index if not exists practice_responses_attempt_idx
  on public.practice_responses (attempt_id, question_index);

create or replace function public.save_practice_attempt(
  p_artifact_id uuid,
  p_assignment_id uuid,
  p_attempt_number integer,
  p_completed boolean,
  p_result jsonb,
  p_responses jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt_id_value uuid;
  response_row jsonb;
begin
  if auth.uid() is null
     or p_attempt_number < 1
     or jsonb_typeof(p_result) <> 'object'
     or jsonb_typeof(p_responses) <> 'array'
     or not exists (
       select 1 from public.study_artifacts artifact
       where artifact.id = p_artifact_id and artifact.owner_id = auth.uid()
     ) then
    return null;
  end if;

  insert into public.practice_attempts (
    owner_id, artifact_id, assignment_id, attempt_number, status,
    score, points_earned, points_possible, result, completed_at
  ) values (
    auth.uid(), p_artifact_id, p_assignment_id, p_attempt_number,
    case when p_completed then 'completed' else 'in_progress' end,
    nullif(p_result ->> 'percentage', '')::numeric,
    coalesce((p_result ->> 'pointsEarned')::integer, 0),
    coalesce((p_result ->> 'pointsPossible')::integer, 0),
    p_result,
    case when p_completed then now() else null end
  )
  on conflict (owner_id, artifact_id, attempt_number) do update
    set assignment_id = excluded.assignment_id,
        status = excluded.status,
        score = excluded.score,
        points_earned = excluded.points_earned,
        points_possible = excluded.points_possible,
        result = excluded.result,
        completed_at = coalesce(public.practice_attempts.completed_at, excluded.completed_at),
        updated_at = now()
  returning id into attempt_id_value;

  for response_row in select value from jsonb_array_elements(p_responses)
  loop
    if coalesce(response_row ->> 'response', '') <> '' then
      insert into public.practice_responses (
        attempt_id, question_index, response, result_category, scored,
        points_earned, explanation, source_anchor
      ) values (
        attempt_id_value,
        (response_row ->> 'questionIndex')::integer,
        response_row ->> 'response',
        response_row ->> 'category',
        coalesce((response_row ->> 'scored')::boolean, false),
        nullif(response_row ->> 'pointsEarned', '')::integer,
        coalesce(response_row ->> 'explanation', ''),
        coalesce(response_row ->> 'sourceAnchor', '')
      )
      on conflict (attempt_id, question_index) do update
        set response = excluded.response,
            result_category = excluded.result_category,
            scored = excluded.scored,
            points_earned = excluded.points_earned,
            explanation = excluded.explanation,
            source_anchor = excluded.source_anchor,
            answered_at = now();
    end if;
  end loop;

  return attempt_id_value;
end;
$$;

revoke all on function public.save_practice_attempt(uuid, uuid, integer, boolean, jsonb, jsonb) from public;
grant execute on function public.save_practice_attempt(uuid, uuid, integer, boolean, jsonb, jsonb) to authenticated;

alter table public.assessment_blueprints
  add column if not exists time_limit_minutes integer
    check (time_limit_minutes is null or time_limit_minutes between 1 and 480),
  add column if not exists allow_resume boolean not null default true,
  add column if not exists feedback_release text not null default 'after_submission'
    check (feedback_release in ('after_submission', 'after_confirmation', 'after_close'));

alter table public.assessment_attempts
  add column if not exists extra_time_pct integer not null default 0
    check (extra_time_pct between 0 and 300),
  add column if not exists allotted_minutes integer
    check (allotted_minutes is null or allotted_minutes between 1 and 1920),
  add column if not exists expires_at timestamptz,
  add column if not exists last_saved_at timestamptz;

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
begin
  begin
    opens_at := nullif(p_blueprint.release_conditions ->> 'opensAt', '')::timestamptz;
    closes_at := nullif(p_blueprint.release_conditions ->> 'closesAt', '')::timestamptz;
  exception when others then
    return false;
  end;
  if opens_at is not null and now() < opens_at then return false; end if;
  if closes_at is not null and now() > closes_at then return false; end if;
  if jsonb_typeof(p_blueprint.release_conditions -> 'prerequisiteLessonIds') = 'array'
     and exists (
       select 1
       from jsonb_array_elements_text(p_blueprint.release_conditions -> 'prerequisiteLessonIds') lesson_id
       where not exists (
         select 1
         from public.course_mode_lesson_progress progress
         where progress.lesson_id = lesson_id::uuid
           and progress.student_id = p_student_id
           and progress.status = 'completed'
       )
     ) then
    return false;
  end if;
  return true;
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
  profile_extra_time integer := 0;
  allotted integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || ':' || p_blueprint_id::text, 0));
  select id into attempt_id
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id
    and student_id = auth.uid()
    and status = 'in_progress'
    and (expires_at is null or expires_at > now())
  order by started_at desc
  limit 1;
  if attempt_id is not null then return attempt_id; end if;

  select * into blueprint_row from public.assessment_blueprints where id = p_blueprint_id;
  select status into course_status from public.course_mode_courses where id = blueprint_row.course_id;
  if blueprint_row.id is null
     or blueprint_row.status <> 'published'
     or course_status <> 'published'
     or not public.is_enrolled_in_course(blueprint_row.course_id)
     or not public.assessment_release_available(blueprint_row, auth.uid()) then
    return null;
  end if;
  select count(*) into prior_count
  from public.assessment_attempts
  where blueprint_id = p_blueprint_id
    and student_id = auth.uid()
    and status <> 'voided';
  if prior_count >= blueprint_row.max_attempts then return null; end if;

  select coalesce(extra_time_pct, 0) into profile_extra_time
  from public.profiles where user_id = auth.uid();
  allotted := case
    when blueprint_row.time_limit_minutes is null then null
    else ceil(blueprint_row.time_limit_minutes * (1 + profile_extra_time / 100.0))::integer
  end;

  insert into public.assessment_attempts (
    blueprint_id, blueprint_version, student_id, attempt_number,
    extra_time_pct, allotted_minutes, expires_at
  ) values (
    p_blueprint_id, blueprint_row.version, auth.uid(), prior_count + 1,
    profile_extra_time, allotted,
    case when allotted is null then null else now() + make_interval(mins => allotted) end
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
  where id = p_attempt_id
    and student_id = auth.uid()
    and status = 'in_progress'
    and (expires_at is null or expires_at > now());
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
  update public.assessment_attempts
    set last_saved_at = now()
  where id = p_attempt_id;
  return true;
end;
$$;

revoke all on function public.assessment_release_available(public.assessment_blueprints, uuid) from public;
revoke all on function public.start_assessment_attempt(uuid) from public;
revoke all on function public.save_assessment_response(uuid, uuid, jsonb) from public;
grant execute on function public.start_assessment_attempt(uuid) to authenticated;
grant execute on function public.save_assessment_response(uuid, uuid, jsonb) to authenticated;

comment on table public.practice_attempts is
  'Persisted, retryable practice sessions with deterministic scoring summaries.';
comment on column public.assessment_attempts.expires_at is
  'Formal assessment deadline after applying the student extra-time accommodation.';

commit;
