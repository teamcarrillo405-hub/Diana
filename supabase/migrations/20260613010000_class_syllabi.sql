-- ----------------------------------------------------------------------------
-- class_syllabi: a per-class syllabus (pasted/uploaded), with heuristically
-- parsed key dates + policies. Mirrors the rubrics table shape + RLS.
-- ----------------------------------------------------------------------------
create table public.class_syllabi (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  title text not null,
  raw_text text,
  parsed jsonb,            -- { keyDates: [{date, label}], policies: [{kind, text}] }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index class_syllabi_owner_idx on public.class_syllabi(owner_id);
create index class_syllabi_class_idx on public.class_syllabi(class_id);

alter table public.class_syllabi enable row level security;

create policy class_syllabi_select on public.class_syllabi for select
  using (owner_id = (select auth.uid()));
create policy class_syllabi_insert on public.class_syllabi for insert
  with check (owner_id = (select auth.uid()));
create policy class_syllabi_update on public.class_syllabi for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy class_syllabi_delete on public.class_syllabi for delete
  using (owner_id = (select auth.uid()));
