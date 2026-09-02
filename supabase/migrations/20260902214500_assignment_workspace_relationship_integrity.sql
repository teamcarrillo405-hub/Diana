begin;

-- The assignment ID on the row being written must match the owned problem.
-- Qualify outer references so Postgres cannot resolve them against the
-- assignment_problems alias inside the relationship check.
drop policy if exists "problem_messages: owner full access" on public.assignment_problem_messages;
create policy "problem_messages: owner full access"
  on public.assignment_problem_messages
  for all
  using (owner_id = (select auth.uid()))
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

drop policy if exists "workspace_preferences: owner full access" on public.assignment_workspace_preferences;
create policy "workspace_preferences: owner full access"
  on public.assignment_workspace_preferences
  for all
  using (owner_id = (select auth.uid()))
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
