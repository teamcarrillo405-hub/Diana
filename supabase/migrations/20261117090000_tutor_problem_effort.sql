begin;

-- Keep only digests and timing. These references remove evidence on problem,
-- assignment, or account deletion through the existing database cascades.
create table public.tutor_problem_effort (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  problem_id uuid not null references public.assignment_problems(id) on delete cascade,
  problem_version text not null check (problem_version ~ '^[a-f0-9]{64}$'),
  attempt_digest text not null check (attempt_digest ~ '^[a-f0-9]{64}$'),
  explicitly_stuck boolean not null default false,
  observed_at timestamptz not null default now(),
  delivered_at timestamptz,
  unique (owner_id, assignment_id, problem_id, problem_version, attempt_digest)
);
create index tutor_problem_effort_expiry on public.tutor_problem_effort (observed_at);
alter table public.tutor_problem_effort enable row level security;
revoke all on public.tutor_problem_effort from public, anon, authenticated, service_role;

create function public.tutor_problem_effort_support(p_owner uuid)
returns table (has_accommodation boolean, low_energy boolean, scattered_focus boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
  -- Check consent before reading either accommodations or current check-in.
  if not exists (select 1 from public.profiles where user_id = p_owner and tutor_personalization_enabled is true) then
    return query select false, false, false;
    return;
  end if;

  return query
    select coalesce(profile.accommodations && array[
      'extended_time', 'reduced_quantity', 'alternate_format', 'reader', 'scribe', 'breaks', 'quiet_setting'
    ]::text[], false),
    coalesce(case
      when recent.value ->> 'disabled' = 'true' then false
      when recent.value ->> 'energy' in ('low', 'okay', 'good') then recent.value ->> 'energy' = 'low'
      else recent.value ->> 'body' = 'low'
    end, false),
    coalesce(recent.value ->> 'disabled' is distinct from 'true' and recent.value ->> 'focus' = 'scattered', false)
    from public.profiles profile
    left join lateral (
      select signal.value from public.task_signals signal
      where signal.owner_id = p_owner and signal.kind = 'mood_checkin'
        and signal.occurred_at between now() - interval '24 hours' and now()
      order by signal.occurred_at desc, signal.id desc limit 1
    ) recent on true
    where profile.user_id = p_owner and profile.tutor_personalization_enabled is true;
end;
$$;
revoke all on function public.tutor_problem_effort_support(uuid) from public, anon, authenticated, service_role;

create function public.tutor_problem_effort_snapshot(p_owner uuid, p_assignment uuid, p_problem uuid)
returns table (
  problem_text text, student_work text, problem_version text, attempt_digest text,
  has_accommodation boolean, low_energy boolean, scattered_focus boolean
)
language sql stable security definer set search_path = ''
as $$
  select problem.problem_text,
    pg_catalog.concat_ws(E'\n', 'Saved reasoning: ' || draft.work, 'Saved answer: ' || nullif(draft.answer, '')),
    pg_catalog.encode(extensions.digest(
      pg_catalog.jsonb_build_array(problem.problem_text, problem.source, problem.unit_type)::text, 'sha256'), 'hex'),
    pg_catalog.encode(extensions.digest(
      draft.normalized_work || '|' || draft.normalized_answer,
      'sha256'), 'hex'),
    support.has_accommodation, support.low_energy, support.scattered_focus
  from public.assignment_problems problem
  join public.assignments assignment on assignment.id = problem.assignment_id and assignment.owner_id = problem.owner_id
  join public.classes class on class.id = assignment.class_id and class.owner_id = assignment.owner_id
  cross join lateral public.tutor_problem_effort_support(assignment.owner_id) support
  cross join lateral (
    select pg_catalog.btrim(coalesce(problem.student_work ->> 'work', '')) as work,
      pg_catalog.btrim(coalesce(problem.student_work ->> 'answer', '')) as answer
  ) saved
  cross join lateral (
    select saved.work, saved.answer, pg_catalog.regexp_replace(pg_catalog.lower(saved.work), '[^[:alnum:]]+', '', 'g') as words,
      pg_catalog.regexp_replace(pg_catalog.regexp_replace(
        pg_catalog.translate(pg_catalog.lower(saved.work), '−×÷', '-*/'), '(?<=[0-9])[.](?=[0-9])', 'decimal', 'g'
      ), '[^[:alnum:]+=*/^<>%-]+', '', 'g') as normalized_work,
      pg_catalog.regexp_replace(pg_catalog.regexp_replace(
        pg_catalog.translate(pg_catalog.lower(saved.answer), '−×÷', '-*/'), '(?<=[0-9])[.](?=[0-9])', 'decimal', 'g'
      ), '[^[:alnum:]+=*/^<>%-]+', '', 'g') as normalized_answer
  ) draft
  where problem.owner_id = p_owner and assignment.id = p_assignment and problem.id = p_problem
    and problem.unit_type = 'problem' and problem.source in ('manual', 'student_confirmed_source')
    and pg_catalog.length(pg_catalog.btrim(problem.problem_text)) between 1 and 4000
    and pg_catalog.btrim(problem.problem_text)
      !~* '^(problem([[:space:]#]+[0-9]+)?|your (work|response)|add (the |a )?problem|enter (the |a )?problem|copy (the |a )?problem)[[:space:].:!?]*$'
    and coalesce(assignment.ai_mode_override, class.ai_mode) = 'green'
    and assignment.status in ('todo', 'drafting', 'checking')
    and not exists (
      select 1 from public.course_mode_assignments delivery
      where delivery.id = assignment.course_mode_assignment_id and delivery.assessment_blueprint_id is not null
    )
    and pg_catalog.regexp_replace(
      pg_catalog.concat_ws(' ', assignment.title, assignment.assignment_type),
      '(^|[^[:alnum:]])(practice (quiz|exam|test|assessment|midterm)|(quiz|exam|test|assessment|midterm) (review|practice|prep))([^[:alnum:]]|$)',
      ' ', 'gi'
    ) !~* '(^|[^[:alnum:]])(quiz|exam|midterm|assessment|closed[- ]book|graded test|final test|chapter test|independent work)([^[:alnum:]]|$)'
    and pg_catalog.concat_ws(' ', assignment.description, assignment.rubric_text, problem.problem_text)
      !~* '(^|[^[:alnum:]])(closed[- ]book|no (outside help|assistance|outside assistance|ai)|without (ai|outside help)|do not use ai|independent work|work (alone|independently)|unaided)([^[:alnum:]]|$)'
    and pg_catalog.jsonb_typeof(problem.student_work -> 'work') = 'string'
    and coalesce(pg_catalog.jsonb_typeof(problem.student_work -> 'answer'), 'string') = 'string'
    and pg_catalog.length(draft.work) <= 4500 and pg_catalog.length(draft.answer) <= 500
    and pg_catalog.length(draft.words) >= 3
    and draft.words not in ('idk','idontknow','idonotknow','notsure','help','stuck','imstuck','blank','none','unknown')
    and draft.words <>
      pg_catalog.regexp_replace(pg_catalog.lower(problem.problem_text), '[^[:alnum:]]+', '', 'g');
$$;
revoke all on function public.tutor_problem_effort_snapshot(uuid, uuid, uuid) from public, anon, authenticated, service_role;

create function public.observe_tutor_problem_effort(p_owner uuid, p_assignment uuid, p_problem uuid, p_stuck boolean)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  current_work record;
  current_attempt uuid;
  attempts integer;
  stuck_attempts integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tutor-problem-effort:' || p_owner::text, 0));
  select * into current_work from public.tutor_problem_effort_snapshot(p_owner, p_assignment, p_problem);
  if not found then return null; end if;

  delete from public.tutor_problem_effort effort
    where effort.owner_id = p_owner and effort.observed_at < now() - interval '24 hours';

  select effort.id into current_attempt from public.tutor_problem_effort effort
    where effort.owner_id = p_owner and effort.assignment_id = p_assignment and effort.problem_id = p_problem
      and effort.problem_version = current_work.problem_version and effort.attempt_digest = current_work.attempt_digest;

  if current_attempt is not null then
    if p_stuck then
      update public.tutor_problem_effort effort set explicitly_stuck = true
        where effort.id = current_attempt and not effort.explicitly_stuck;
    end if;
  else
    -- Keep a new revision usable after the cap. Prefer retaining delivered
    -- evidence while there are undisclosed revisions that can be evicted.
    if (select count(*) from public.tutor_problem_effort
      where owner_id = p_owner and assignment_id = p_assignment and problem_id = p_problem) >= 12 then
      delete from public.tutor_problem_effort where id = (
        select effort.id from public.tutor_problem_effort effort
        where effort.owner_id = p_owner and effort.assignment_id = p_assignment and effort.problem_id = p_problem
        order by (effort.delivered_at is not null), effort.observed_at, effort.id limit 1
      );
    end if;
    if (select count(*) from public.tutor_problem_effort where owner_id = p_owner) >= 96 then
      delete from public.tutor_problem_effort where id = (
        select effort.id from public.tutor_problem_effort effort where effort.owner_id = p_owner
        order by (effort.delivered_at is not null), effort.observed_at, effort.id limit 1
      );
    end if;
    insert into public.tutor_problem_effort (owner_id, assignment_id, problem_id, problem_version, attempt_digest, explicitly_stuck)
      values (p_owner, p_assignment, p_problem, current_work.problem_version, current_work.attempt_digest, coalesce(p_stuck, false))
      returning id into current_attempt;
  end if;

  if current_attempt is null then return null; end if;
  select count(*), count(*) filter (where effort.explicitly_stuck)
    into attempts, stuck_attempts from public.tutor_problem_effort effort
    where effort.owner_id = p_owner and effort.assignment_id = p_assignment and effort.problem_id = p_problem
      and effort.problem_version = current_work.problem_version;
  return pg_catalog.jsonb_build_object(
    'problemId', p_problem, 'problemText', current_work.problem_text, 'studentWork', current_work.student_work,
    'problemVersion', current_work.problem_version, 'attemptDigest', current_work.attempt_digest, 'attemptId', current_attempt,
    'attemptCount', attempts, 'stuckRequests', stuck_attempts, 'hasAccommodation', current_work.has_accommodation,
    'lowEnergy', current_work.low_energy, 'scatteredFocus', current_work.scattered_focus
  );
end;
$$;

create function public.record_tutor_worked_solution_delivery(
  p_owner uuid, p_assignment uuid, p_problem uuid, p_attempt uuid, p_version text, p_digest text,
  p_attempt_count integer, p_stuck_count integer, p_requires_support boolean
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  current_work record;
  attempts integer;
  stuck_attempts integer;
begin
  if p_attempt_count is null or p_attempt_count not between 1 and 12 or p_stuck_count is null
    or p_stuck_count not between 0 and p_attempt_count or p_requires_support is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tutor-problem-effort:' || p_owner::text, 0));
  select * into current_work from public.tutor_problem_effort_snapshot(p_owner, p_assignment, p_problem);
  if not found or current_work.problem_version is distinct from p_version
    or current_work.attempt_digest is distinct from p_digest then return false; end if;

  select count(*), count(*) filter (where effort.explicitly_stuck)
    into attempts, stuck_attempts from public.tutor_problem_effort effort
    where effort.owner_id = p_owner and effort.assignment_id = p_assignment and effort.problem_id = p_problem
      and effort.problem_version = p_version and effort.observed_at >= now() - interval '24 hours';
  if attempts < p_attempt_count or stuck_attempts < p_stuck_count or (p_requires_support and not (
    current_work.has_accommodation or current_work.low_energy or current_work.scattered_focus
  )) then return false; end if;

  update public.tutor_problem_effort effort set delivered_at = coalesce(effort.delivered_at, now())
    where effort.id = p_attempt and effort.owner_id = p_owner and effort.assignment_id = p_assignment
      and effort.problem_id = p_problem and effort.problem_version = p_version and effort.attempt_digest = p_digest
      and effort.observed_at >= now() - interval '24 hours';
  return found;
end;
$$;

revoke all on function public.observe_tutor_problem_effort(uuid, uuid, uuid, boolean),
  public.record_tutor_worked_solution_delivery(uuid, uuid, uuid, uuid, text, text, integer, integer, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.observe_tutor_problem_effort(uuid, uuid, uuid, boolean),
  public.record_tutor_worked_solution_delivery(uuid, uuid, uuid, uuid, text, text, integer, integer, boolean)
  to service_role;

select cron.schedule(
  'purge-tutor-problem-effort',
  '19 * * * *',
  $$delete from public.tutor_problem_effort where observed_at < now() - interval '24 hours'$$
);

commit;
