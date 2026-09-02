begin;

-- Keep the relation check restrictive so a later permissive policy cannot
-- weaken the assignment-to-problem binding established for student-owned work.
drop policy if exists "problem_messages: relationship integrity" on public.assignment_problem_messages;
create policy "problem_messages: relationship integrity"
  on public.assignment_problem_messages
  as restrictive
  for all
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = public.assignment_problem_messages.problem_id
        and problem.assignment_id = public.assignment_problem_messages.assignment_id
        and problem.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = public.assignment_problem_messages.problem_id
        and problem.assignment_id = public.assignment_problem_messages.assignment_id
        and problem.owner_id = (select auth.uid())
    )
  );

drop policy if exists "workspace_preferences: relationship integrity" on public.assignment_workspace_preferences;
create policy "workspace_preferences: relationship integrity"
  on public.assignment_workspace_preferences
  as restrictive
  for all
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = public.assignment_workspace_preferences.problem_id
        and problem.assignment_id = public.assignment_workspace_preferences.assignment_id
        and problem.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1
      from public.assignment_problems problem
      where problem.id = public.assignment_workspace_preferences.problem_id
        and problem.assignment_id = public.assignment_workspace_preferences.assignment_id
        and problem.owner_id = (select auth.uid())
    )
  );

commit;
