alter table public.profiles
  drop constraint if exists profiles_school_year_check;

alter table public.profiles
  add constraint profiles_school_year_check
  check (school_year is null or school_year between 6 and 16);
