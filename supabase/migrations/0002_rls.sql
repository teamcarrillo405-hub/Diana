-- Row-level security. Every row keyed by owner_id (or user_id for profiles).

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.rubrics enable row level security;
alter table public.assignments enable row level security;
alter table public.submission_checklist enable row level security;
alter table public.task_signals enable row level security;
alter table public.ai_calls enable row level security;

-- profiles ------------------------------------------------------------------
create policy profiles_self_select on public.profiles
  for select using (user_id = (select auth.uid()));
create policy profiles_self_insert on public.profiles
  for insert with check (user_id = (select auth.uid()));
create policy profiles_self_update on public.profiles
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- helper: scoped select/insert/update/delete macro pattern
-- (write each policy explicitly so they show up in get_advisors)

-- classes -------------------------------------------------------------------
create policy classes_select on public.classes for select
  using (owner_id = (select auth.uid()));
create policy classes_insert on public.classes for insert
  with check (owner_id = (select auth.uid()));
create policy classes_update on public.classes for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy classes_delete on public.classes for delete
  using (owner_id = (select auth.uid()));

-- rubrics -------------------------------------------------------------------
create policy rubrics_select on public.rubrics for select
  using (owner_id = (select auth.uid()));
create policy rubrics_insert on public.rubrics for insert
  with check (owner_id = (select auth.uid()));
create policy rubrics_update on public.rubrics for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy rubrics_delete on public.rubrics for delete
  using (owner_id = (select auth.uid()));

-- assignments ---------------------------------------------------------------
create policy assignments_select on public.assignments for select
  using (owner_id = (select auth.uid()));
create policy assignments_insert on public.assignments for insert
  with check (owner_id = (select auth.uid()));
create policy assignments_update on public.assignments for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy assignments_delete on public.assignments for delete
  using (owner_id = (select auth.uid()));

-- submission_checklist ------------------------------------------------------
create policy checklist_select on public.submission_checklist for select
  using (owner_id = (select auth.uid()));
create policy checklist_insert on public.submission_checklist for insert
  with check (owner_id = (select auth.uid()));
create policy checklist_update on public.submission_checklist for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy checklist_delete on public.submission_checklist for delete
  using (owner_id = (select auth.uid()));

-- task_signals --------------------------------------------------------------
create policy signals_select on public.task_signals for select
  using (owner_id = (select auth.uid()));
create policy signals_insert on public.task_signals for insert
  with check (owner_id = (select auth.uid()));
-- no update/delete: signals are immutable history

-- ai_calls ------------------------------------------------------------------
-- read-only for users (write happens via service role from server)
create policy ai_calls_select on public.ai_calls for select
  using (owner_id = (select auth.uid()));
