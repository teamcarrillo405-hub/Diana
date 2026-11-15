-- Run against a disposable database with all migrations applied:
-- psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f supabase/tests/account_deletion_actor_anonymization.sql
-- The transaction always rolls back its fixtures.
\set ON_ERROR_STOP on

begin;

do $contract$
declare
  v_actor_id uuid := '00000000-0000-4000-8000-000000000101';
  v_student_id uuid := '00000000-0000-4000-8000-000000000102';
  v_course_id uuid := '00000000-0000-4000-8000-000000000103';
  v_session_id uuid := '00000000-0000-4000-8000-000000000104';
  v_grade_id uuid := '00000000-0000-4000-8000-000000000105';
  v_response_id uuid := '00000000-0000-4000-8000-000000000106';
  v_created_at timestamptz := '2026-07-01 10:00:00+00';
  v_unlocked_at timestamptz := '2026-07-02 10:00:00+00';
  v_signed_off_at timestamptz := '2026-07-02 11:00:00+00';
  v_confirmed_at timestamptz := '2026-07-03 10:00:00+00';
  v_scored_at timestamptz := '2026-07-04 10:00:00+00';
begin
  -- Replica mode is fixture-only: it permits isolated contract rows without
  -- building an entire school/course graph. CHECK and NOT NULL constraints
  -- remain active, and the production purge restores the prior mode itself.
  perform set_config('session_replication_role', 'replica', true);

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_actor_id, 'authenticated', 'authenticated',
    'actor-anonymization-contract@example.invalid', '', v_created_at,
    '{}'::jsonb, '{}'::jsonb, v_created_at, v_created_at
  );

  insert into public.course_mode_courses (
    id, organization_id, title, subject_domain, grade_band, status, version,
    created_by, published_at, published_by, created_at, updated_at
  ) values (
    v_course_id, gen_random_uuid(), 'Actor deletion contract course',
    'science', '9-12', 'published', 1,
    v_actor_id, v_created_at, v_actor_id, v_created_at, v_created_at
  );

  insert into public.practical_activity_sessions (
    id, course_id, assignment_id, protocol_id, protocol_version, student_id,
    unlocked_by, unlocked_at, supervision_active, expires_at,
    signed_off_at, signed_off_by, signoff_notes, created_at
  ) values (
    v_session_id, v_course_id, gen_random_uuid(), gen_random_uuid(), 1, v_student_id,
    v_actor_id, v_unlocked_at, true, v_unlocked_at + interval '2 hours',
    v_signed_off_at, v_actor_id, 'Safety evidence remains after anonymization.', v_created_at
  );

  insert into public.final_grade_records (
    id, course_id, student_id, grading_period, calculated_percent,
    final_percent, letter_grade, calculation_summary, status, version,
    confirmed_by, confirmed_at, created_at
  ) values (
    v_grade_id, v_course_id, v_student_id, '2026-Q3', 92.5,
    92.5, 'A-', '{"source":"contract"}'::jsonb, 'confirmed', 1,
    v_actor_id, v_confirmed_at, v_created_at
  );

  insert into public.assessment_responses (
    id, attempt_id, item_id, student_response, auto_score, teacher_score,
    teacher_feedback, scored_by, scored_at, created_at, updated_at
  ) values (
    v_response_id, gen_random_uuid(), gen_random_uuid(), '{"answer":"B"}'::jsonb,
    8, 9, 'Scoring evidence remains after anonymization.',
    v_actor_id, v_scored_at, v_created_at, v_created_at
  );

  perform set_config('session_replication_role', 'origin', true);

  perform public.account_deletion_delete_public_rows(
    v_actor_id,
    '00000000-0000-4000-8000-000000000107'::uuid,
    1
  );

  if not exists (
    select 1 from public.course_mode_courses
    where id = v_course_id
      and created_by is null
      and published_by is null
      and title = 'Actor deletion contract course'
      and created_at = v_created_at
      and published_at = v_created_at
  ) then
    raise exception 'authored course was deleted or its immutable evidence changed';
  end if;

  if not exists (
    select 1 from public.practical_activity_sessions
    where id = v_session_id
      and unlocked_by is null
      and signed_off_by is null
      and unlocked_at = v_unlocked_at
      and signed_off_at = v_signed_off_at
      and signoff_notes = 'Safety evidence remains after anonymization.'
  ) then
    raise exception 'safety unlock was deleted or its immutable evidence changed';
  end if;

  if not exists (
    select 1 from public.final_grade_records
    where id = v_grade_id
      and confirmed_by is null
      and confirmed_at = v_confirmed_at
      and final_percent = 92.5
      and calculation_summary = '{"source":"contract"}'::jsonb
  ) then
    raise exception 'grade confirmation was deleted or its immutable evidence changed';
  end if;

  if not exists (
    select 1 from public.assessment_responses
    where id = v_response_id
      and scored_by is null
      and scored_at = v_scored_at
      and teacher_score = 9
      and teacher_feedback = 'Scoring evidence remains after anonymization.'
  ) then
    raise exception 'score actor row was deleted or its immutable evidence changed';
  end if;

  if public.account_deletion_public_residue(
    v_actor_id,
    '00000000-0000-4000-8000-000000000107'::uuid,
    1
  ) <> 0 then
    raise exception 'raw actor reference remains after anonymization';
  end if;

  delete from auth.users where id = v_actor_id;
  if exists (select 1 from auth.users where id = v_actor_id) then
    raise exception 'auth actor was not deleted';
  end if;
end;
$contract$;

rollback;
