-- Diana slice 1 schema
-- Run this against your Supabase project via the SQL editor or `supabase db push`

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  date_of_birth date,
  needs_parental_consent boolean generated always as (
    date_of_birth > current_date - interval '13 years'
  ) stored,
  consent_status text default 'pending' check (consent_status in ('pending', 'verified', 'not_required')),
  font_preference text default 'atkinson_hyperlegible',
  background_preference text default 'offwhite',
  line_height numeric default 1.6,
  letter_spacing numeric default 0.02,
  tts_voice text,
  tts_speed numeric default 1.0,
  ai_training_opt_out boolean default true,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "users own profile" on profiles for all using (auth.uid() = id);

-- Classes
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  name text not null,
  subject_category text,
  teacher_name text,
  schedule_text text,
  color text default '#6B7280',
  ai_policy text default 'yellow' check (ai_policy in ('red', 'yellow', 'green')),
  rubric_summary jsonb,
  rubric_summary_cache_key text,
  archived_at timestamptz,
  created_at timestamptz default now()
);

alter table classes enable row level security;
create policy "users own classes" on classes for all using (auth.uid() = user_id);

-- Class documents (syllabi, rubrics)
create table if not exists class_documents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  kind text check (kind in ('syllabus', 'rubric', 'rules', 'other')),
  title text,
  storage_path text,
  extracted_text text,
  uploaded_at timestamptz default now()
);

alter table class_documents enable row level security;
create policy "users own class documents" on class_documents for all
  using (exists (
    select 1 from classes where classes.id = class_documents.class_id and classes.user_id = auth.uid()
  ));

-- Assignments
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  class_id uuid references classes on delete cascade not null,
  title text not null,
  description text,
  assignment_type text check (assignment_type in ('essay', 'reading', 'problem_set', 'lab_report', 'dbq', 'study', 'other')),
  due_at timestamptz,
  state text default 'captured' check (state in ('captured', 'planned', 'in_progress', 'done', 'submitted', 'graded')),
  ai_policy_override text check (ai_policy_override in ('red', 'yellow', 'green')),
  submission_link text,
  submission_proof_path text,
  submitted_at timestamptz,
  estimated_minutes integer,
  last_shown_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table assignments enable row level security;
create policy "users own assignments" on assignments for all using (auth.uid() = user_id);

create index on assignments (user_id, state, due_at);

-- Inbox items (quick capture — slice 2 will add voice/photo)
create table if not exists inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  source text check (source in ('voice', 'photo', 'text')) default 'text',
  raw_content text,
  ai_suggested_class_id uuid references classes,
  ai_suggested_type text,
  ai_suggested_due_date date,
  ai_confidence numeric,
  classified_at timestamptz,
  created_at timestamptz default now()
);

alter table inbox_items enable row level security;
create policy "users own inbox" on inbox_items for all using (auth.uid() = user_id);
