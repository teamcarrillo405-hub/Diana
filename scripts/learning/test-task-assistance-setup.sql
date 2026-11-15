-- ONLY an empty, disposable local database. Earlier-schema dependencies below
-- are deliberately minimal; the real session/history migrations are loaded intact.
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF host(inet_server_addr())<>'127.0.0.1' OR current_setting('port')<>'55449' OR to_regclass('public.assignments') IS NOT NULL THEN
    RAISE EXCEPTION 'Requires empty disposable local database on port 55449'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.classes(id uuid PRIMARY KEY,owner_id uuid NOT NULL,ai_mode text NOT NULL DEFAULT 'green');
CREATE TABLE public.assignments(id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES auth.users(id),class_id uuid,ai_mode_override text);
CREATE TABLE public.assignment_problems(id uuid PRIMARY KEY,owner_id uuid NOT NULL,assignment_id uuid NOT NULL,
  problem_number integer NOT NULL,problem_text text NOT NULL,source text,unit_type text);
CREATE TABLE public.learning_documents(id text PRIMARY KEY,owner_id uuid NOT NULL,assignment_id uuid NOT NULL,document_id text NOT NULL,pages jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE public.learning_blocks(id text PRIMARY KEY,owner_id uuid NOT NULL,version_id text NOT NULL,payload jsonb NOT NULL);
CREATE TABLE public.learning_exercises(id text PRIMARY KEY,owner_id uuid NOT NULL,assignment_id uuid NOT NULL,
  version_id text NOT NULL,skill_id text NOT NULL,prompt text NOT NULL,specification jsonb NOT NULL,reviewed boolean NOT NULL DEFAULT false);
CREATE TABLE public.learning_attempts(id uuid PRIMARY KEY,owner_id uuid NOT NULL,assignment_id uuid NOT NULL,
  problem_id text NOT NULL,revision integer NOT NULL CHECK(revision>0),payload jsonb NOT NULL,payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
  assessment jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(owner_id,assignment_id,problem_id,revision));
CREATE TABLE public.learning_problem_records(id uuid PRIMARY KEY,owner_id uuid NOT NULL,assignment_id uuid NOT NULL,exercise_id text);
CREATE TABLE public.learning_problem_revisions(record_id uuid NOT NULL,owner_id uuid NOT NULL,state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.ai_interactions(owner_id uuid NOT NULL,assignment_id uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.ai_token_budget_reservations(owner_id uuid NOT NULL,provider_started_at timestamptz,status text NOT NULL);
\ir ../../supabase/migrations/20260924221832_learning_independent_sessions.sql
\ir ../../supabase/migrations/20260925203216_learning_assisted_history.sql
-- Supabase defaults may grant service EXECUTE automatically. New functions must
-- explicitly revoke this before applying their intended role allowlist.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
\ir ../../supabase/migrations/20260929003416_learning_task_assistance.sql
