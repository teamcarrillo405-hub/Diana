begin;

-- Keep the existing owner checks exactly intact while allowing Postgres to
-- evaluate the stable auth value once per query instead of once per scanned row.
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
      where problem.id = problem_id
        and problem.assignment_id = assignment_id
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
      where problem.id = problem_id
        and problem.assignment_id = assignment_id
        and problem.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Students can read their calendar events" on public.calendar_events;
create policy "Students can read their calendar events"
  on public.calendar_events for select
  using (owner_id = (select auth.uid()));

drop policy if exists "Students can insert their calendar events" on public.calendar_events;
create policy "Students can insert their calendar events"
  on public.calendar_events for insert
  with check (owner_id = (select auth.uid()));

drop policy if exists "Students can update their calendar events" on public.calendar_events;
create policy "Students can update their calendar events"
  on public.calendar_events for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Students can delete their calendar events" on public.calendar_events;
create policy "Students can delete their calendar events"
  on public.calendar_events for delete
  using (owner_id = (select auth.uid()));

drop policy if exists "wellness yearly archives owner read" on public.wellness_yearly_archives;
create policy "wellness yearly archives owner read"
  on public.wellness_yearly_archives for select
  using (owner_id = (select auth.uid()));

commit;
