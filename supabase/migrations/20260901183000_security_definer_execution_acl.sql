begin;

-- Supabase exposes functions through PostgREST. Reassert the intended role
-- boundary after all feature migrations so platform defaults cannot leave a
-- SECURITY DEFINER function callable by anonymous clients.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke all on function public.guardian_foundation_status()
  from public, anon;
grant execute on function public.guardian_foundation_status()
  to authenticated, service_role;

revoke all on function public.request_guardian_account_foundation()
  from public, anon;
grant execute on function public.request_guardian_account_foundation()
  to authenticated, service_role;

revoke all on function public.reconcile_assignment_submission_receipt(
  uuid,
  text,
  text,
  text,
  jsonb
)
  from public, anon, authenticated;
grant execute on function public.reconcile_assignment_submission_receipt(
  uuid,
  text,
  text,
  text,
  jsonb
)
  to service_role;

-- Provider acceptance is an authoritative server-side transition. Student
-- clients may prepare receipts and record a pending state, but cannot assert
-- that Canvas or Classroom accepted work or a grade.
revoke all on function public.complete_assignment_submission(
  uuid,
  text,
  text,
  jsonb
)
  from public, anon, authenticated;
grant execute on function public.complete_assignment_submission(
  uuid,
  text,
  text,
  jsonb
)
  to service_role;

revoke all on function public.complete_lms_grade_sync_receipt(
  uuid,
  text,
  text,
  jsonb,
  text
)
  from public, anon, authenticated;
grant execute on function public.complete_lms_grade_sync_receipt(
  uuid,
  text,
  text,
  jsonb,
  text
)
  to service_role;

revoke all on function public.record_guardian_consent_v1(
  uuid,
  text,
  text,
  text[],
  jsonb,
  text
)
  from public, anon, authenticated;
grant execute on function public.record_guardian_consent_v1(
  uuid,
  text,
  text,
  text[],
  jsonb,
  text
)
  to service_role;

revoke all on function public.reserve_early_access_rate_limit(text)
  from public, anon, authenticated;
grant execute on function public.reserve_early_access_rate_limit(text)
  to service_role;

revoke all on function public.validate_child_data_registry_coverage()
  from public, anon, authenticated;
grant execute on function public.validate_child_data_registry_coverage()
  to service_role;

commit;
