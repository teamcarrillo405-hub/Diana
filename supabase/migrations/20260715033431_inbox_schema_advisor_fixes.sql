begin;

create index if not exists inbox_items_suggested_class_idx
  on public.inbox_items (suggested_class_id)
  where suggested_class_id is not null;

create index if not exists inbox_items_assignment_idx
  on public.inbox_items (assignment_id)
  where assignment_id is not null;

drop policy if exists "inbox_items: owner full access" on public.inbox_items;

create policy "inbox_items: owner full access"
  on public.inbox_items
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

commit;
