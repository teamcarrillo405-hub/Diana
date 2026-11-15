-- ISOLATED DATABASE ONLY. Minimal earlier-schema dependencies for loading the
-- unmodified 20260925201612_learning_problem_records.sql migration.
create role anon;
create role authenticated;
create schema auth;
create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
grant usage on schema extensions to authenticated;
create table public.classes (id uuid primary key, owner_id uuid not null references auth.users(id));
create table public.assignments (id uuid primary key, owner_id uuid not null references auth.users(id), class_id uuid not null references public.classes(id));
create table public.learning_documents (
  id text primary key, owner_id uuid not null references auth.users(id),
  class_id uuid references public.classes(id), assignment_id uuid references public.assignments(id),
  pages jsonb not null default '[]'::jsonb, metadata jsonb not null default '{}'::jsonb
);
