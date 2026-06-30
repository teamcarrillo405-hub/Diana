-- ----------------------------------------------------------------------------
-- Link classes to an LMS source so Canvas courses map to real Diana classes
-- (instead of one flat "Canvas (imported)" shadow class). Manual classes keep
-- NULL external_* and stay unconstrained.
-- ----------------------------------------------------------------------------
alter table public.classes
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists external_url text;

-- Idempotent upsert key for synced courses; partial so manual classes (NULL) are exempt.
create unique index if not exists classes_owner_external_idx
  on public.classes (owner_id, external_source, external_id)
  where external_source is not null;
