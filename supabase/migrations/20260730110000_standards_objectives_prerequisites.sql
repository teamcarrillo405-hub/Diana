-- CASE-compatible standards references and deterministic prerequisite graph.

create table if not exists public.standards_frameworks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_identifier text not null,
  uri text not null,
  title text not null,
  creator text,
  version_label text,
  jurisdiction text,
  language text,
  adoption_status text,
  license_uri text,
  statement_storage_authorized boolean not null default false,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, case_identifier)
);

create table if not exists public.standard_items (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.standards_frameworks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_identifier text not null,
  uri text not null,
  human_coding_scheme text,
  statement text,
  statement_hash text,
  education_levels text[] not null default '{}',
  item_type text,
  raw_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (framework_id, case_identifier),
  unique (framework_id, uri)
);

create table if not exists public.standard_associations (
  id uuid primary key default gen_random_uuid(),
  framework_id uuid not null references public.standards_frameworks(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  case_identifier text not null,
  uri text,
  association_type text not null,
  origin_uri text not null,
  destination_uri text not null,
  raw_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(raw_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (framework_id, case_identifier)
);

create table if not exists public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  description text,
  version integer not null default 1 check (version >= 1),
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objective_alignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  standard_item_id uuid not null references public.standard_items(id) on delete cascade,
  alignment_type text not null default 'teaches' check (alignment_type in ('introduces', 'teaches', 'practices', 'assesses')),
  created_at timestamptz not null default now(),
  unique (objective_id, standard_item_id, alignment_type)
);

create table if not exists public.prerequisite_edges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  prerequisite_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  minimum_mastery numeric(4,3) not null default 0.700 check (minimum_mastery between 0 and 1),
  created_at timestamptz not null default now(),
  unique (prerequisite_objective_id, objective_id),
  check (prerequisite_objective_id <> objective_id)
);

create table if not exists public.assignment_objectives (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  evidence_weight numeric(5,4) not null default 1 check (evidence_weight > 0),
  created_at timestamptz not null default now(),
  primary key (assignment_id, objective_id)
);

create index if not exists standard_items_framework_code_idx
  on public.standard_items (framework_id, human_coding_scheme);
create index if not exists standard_associations_origin_idx
  on public.standard_associations (framework_id, origin_uri);
create index if not exists standard_associations_destination_idx
  on public.standard_associations (framework_id, destination_uri);
create index if not exists learning_objectives_class_idx
  on public.learning_objectives (class_id, status);
create index if not exists prerequisite_edges_objective_idx
  on public.prerequisite_edges (objective_id);

alter table public.standards_frameworks enable row level security;
alter table public.standard_items enable row level security;
alter table public.standard_associations enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.objective_alignments enable row level security;
alter table public.prerequisite_edges enable row level security;
alter table public.assignment_objectives enable row level security;

create policy standards_frameworks_owner_all on public.standards_frameworks for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy standard_items_owner_all on public.standard_items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy standard_associations_owner_all on public.standard_associations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy learning_objectives_owner_all on public.learning_objectives for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy objective_alignments_owner_all on public.objective_alignments for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy prerequisite_edges_owner_all on public.prerequisite_edges for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy assignment_objectives_owner_all on public.assignment_objectives for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.reject_prerequisite_cycles()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if exists (
    with recursive reachable(objective_id) as (
      select new.objective_id
      union
      select edge.objective_id
      from public.prerequisite_edges edge
      join reachable on edge.prerequisite_objective_id = reachable.objective_id
      where edge.id is distinct from new.id
        and edge.owner_id = new.owner_id
    )
    select 1 from reachable where objective_id = new.prerequisite_objective_id
  ) then
    raise exception 'Prerequisite graph cannot contain a cycle.';
  end if;
  return new;
end;
$$;

drop trigger if exists prerequisite_edges_no_cycles on public.prerequisite_edges;
create trigger prerequisite_edges_no_cycles
before insert or update on public.prerequisite_edges
for each row execute function public.reject_prerequisite_cycles();
