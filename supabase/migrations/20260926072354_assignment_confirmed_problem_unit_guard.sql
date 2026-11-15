-- Generated work steps cannot be marked as source-confirmed problems.
alter table public.assignment_problems add constraint assignment_problems_confirmed_source_unit_check
  check (source <> 'student_confirmed_source' or unit_type = 'problem');
