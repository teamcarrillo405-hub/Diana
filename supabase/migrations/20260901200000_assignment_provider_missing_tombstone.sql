-- Preserve provider removal state without reusing the student-owned lifecycle.
-- NULL means the assignment is present in the latest complete provider snapshot.

alter table public.assignments
  add column if not exists provider_missing_at timestamptz;

comment on column public.assignments.provider_missing_at is
  'First complete LMS sync when this assignment was absent from its provider. Cleared when the provider assignment reappears; never deletes local student work.';

create index if not exists assignments_provider_missing_idx
  on public.assignments (owner_id, external_source, provider_missing_at)
  where provider_missing_at is not null;
