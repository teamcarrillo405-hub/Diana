-- 0040: GitLab connector.
-- Adds GitLab as a read-only source for coding-class issues with due dates.

alter table public.assignments
  drop constraint if exists assignments_external_source_check;

alter table public.assignments
  add constraint assignments_external_source_check
  check (external_source in ('canvas', 'google_classroom', 'ics', 'clever', 'gitlab'));

alter table public.lms_connections
  drop constraint if exists lms_connections_provider_check;

alter table public.lms_connections
  add constraint lms_connections_provider_check
  check (provider in ('canvas', 'google_classroom', 'ics', 'clever', 'gitlab'));
