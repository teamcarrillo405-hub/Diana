-- Both 20260811103918 and 20260811120000 are immutable staging history. They
-- install the same function body, so this migration records the one final ACL
-- and execution contract without rewriting either applied migration.
alter function public.merge_assignment_problem_work(uuid, jsonb)
  security invoker;

alter function public.merge_assignment_problem_work(uuid, jsonb)
  set search_path = public, pg_temp;

revoke all on function public.merge_assignment_problem_work(uuid, jsonb)
  from public, anon;
grant execute on function public.merge_assignment_problem_work(uuid, jsonb)
  to authenticated, service_role;

comment on function public.merge_assignment_problem_work(uuid, jsonb) is
  'Owner-scoped assignment problem autosave; authenticated and service-role execution only.';
