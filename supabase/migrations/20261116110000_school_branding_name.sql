-- Optional school name is student-provided and remains owner-scoped on the profile.
begin;
alter table public.profiles add column if not exists school_name text;
alter table public.profiles add constraint profiles_school_name_length
  check (school_name is null or (char_length(btrim(school_name)) between 1 and 80 and school_name !~ '[[:cntrl:]]'));
commit;
