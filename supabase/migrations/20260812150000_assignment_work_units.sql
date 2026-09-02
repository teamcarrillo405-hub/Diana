begin;

-- `assignment_problems` is the established, owner-protected work record.  Keep
-- the table and its child records intact while allowing it to represent a
-- section, source response, procedure, or milestone outside mathematics.
alter table public.assignment_problems
  add column if not exists unit_label text,
  add column if not exists unit_type text not null default 'problem',
  add column if not exists source_anchor jsonb,
  add column if not exists unit_metadata jsonb not null default '{}'::jsonb;

alter table public.assignment_problems
  drop constraint if exists assignment_problems_unit_type_check;

alter table public.assignment_problems
  add constraint assignment_problems_unit_type_check
  check (unit_type in ('problem', 'section', 'source', 'procedure', 'evidence', 'milestone'));

update public.assignment_problems
set unit_label = coalesce(nullif(btrim(unit_label), ''), 'Problem ' || problem_number::text)
where unit_label is null or btrim(unit_label) = '';

create or replace function public.sync_assignment_problem_unit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- The existing scaffold JSON remains the compatibility channel for older
  -- clients. Keep explicit work-unit columns synchronized as installations
  -- move to the normalized fields.
  if new.scaffold is not null then
    new.unit_label := coalesce(nullif(btrim(new.scaffold->>'unitLabel'), ''), new.unit_label);
    new.unit_type := case
      when new.scaffold->>'unitType' in ('problem', 'section', 'source', 'procedure', 'evidence', 'milestone')
        then new.scaffold->>'unitType'
      else coalesce(new.unit_type, 'problem')
    end;
    new.source_anchor := coalesce(new.scaffold->'sourceAnchor', new.source_anchor);
    new.unit_metadata := coalesce(new.scaffold->'unitMetadata', new.unit_metadata, '{}'::jsonb);
  end if;
  new.unit_label := coalesce(nullif(btrim(new.unit_label), ''), 'Problem ' || new.problem_number::text);
  new.unit_type := coalesce(nullif(new.unit_type, ''), 'problem');
  return new;
end;
$$;

drop trigger if exists assignment_problems_sync_unit_fields on public.assignment_problems;
create trigger assignment_problems_sync_unit_fields
  before insert or update of scaffold, problem_number, unit_label, unit_type, source_anchor, unit_metadata
  on public.assignment_problems
  for each row execute function public.sync_assignment_problem_unit_fields();

create index if not exists assignment_problems_assignment_owner_order_idx
  on public.assignment_problems (assignment_id, owner_id, problem_number);

commit;
