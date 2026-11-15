-- ISOLATED DATABASE ONLY, after test-recognition-schema-setup.sql.
create role service_role;
create table public.profiles (
  user_id uuid primary key references auth.users(id),
  date_of_birth date not null,
  age_bracket text not null check (age_bracket in ('under_13','13_to_17','adult'))
);
create table public.learning_editor_access (
  user_id uuid primary key references auth.users(id), roles text[] not null, subjects text[] not null,
  qualification_ref text not null, verified_by text not null, verified_at timestamptz not null,
  expires_at timestamptz not null, revoked_at timestamptz
);
