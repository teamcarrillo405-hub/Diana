-- Remove PostgreSQL's default PUBLIC execution privilege from every privileged
-- API function. Client-callable RPCs are restored from an explicit allowlist;
-- triggers and administrative workers remain service-role-only.

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

do $$
declare
  privileged_function record;
  authenticated_rpc_names constant text[] := array[
    'acknowledge_assignment_safety_protocol',
    'calculate_course_grade',
    'can_author_course',
    'cancel_account_deletion_request',
    'claim_assignment_submission',
    'complete_assignment_submission',
    'confirm_assessment_grade',
    'confirm_calculated_course_final_grade',
    'confirm_course_final_grade',
    'create_course_content_revision',
    'create_course_objective_revision',
    'create_course_revision',
    'distribute_course_mode_assignment',
    'get_assignment_practical_gate',
    'get_my_course_objective_readiness',
    'install_shared_deck_for_members',
    'is_enrolled_in_course',
    'is_study_group_member',
    'is_study_group_owner',
    'is_verified_organization_member',
    'join_study_group',
    'merge_assignment_problem_work',
    'merge_assignment_saved_work',
    'record_assessment_teacher_score',
    'record_daily_wellness_check_in',
    'record_wellness_activity',
    'record_wellness_sleep_log',
    'save_assignment_artifact_block',
    'save_assessment_response',
    'save_practice_attempt',
    'select_assignment_work_profile',
    'start_assessment_attempt',
    'submit_assessment_attempt',
    'update_assignment_submission_receipt',
    'update_course_mode_lesson_progress',
    'upsert_type_estimate'
  ];
begin
  for privileged_function in
    select p.oid::regprocedure as signature, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute format(
      'revoke execute on function %s from public, anon, authenticated',
      privileged_function.signature
    );
    execute format(
      'grant execute on function %s to service_role',
      privileged_function.signature
    );

    if privileged_function.proname = any(authenticated_rpc_names) then
      execute format(
        'grant execute on function %s to authenticated',
        privileged_function.signature
      );
    end if;
  end loop;
end;
$$;
