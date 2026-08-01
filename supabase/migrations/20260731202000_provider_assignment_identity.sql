-- Keep Diana's provider-wide deduplication key separate from the raw
-- assignment identifier required by Canvas and Google Classroom APIs.

alter table public.assignments
  add column if not exists provider_assignment_id text;

update public.assignments
set provider_assignment_id = external_id
where provider_assignment_id is null
  and external_id is not null
  and external_source in ('canvas', 'google_classroom');

comment on column public.assignments.provider_assignment_id is
  'Raw provider assignment identifier used for LMS API calls. external_id may include a course namespace for owner-wide deduplication.';
