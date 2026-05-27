create table if not exists readings (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes on delete cascade not null,
  user_id uuid references profiles(user_id) on delete cascade not null,
  title text not null,
  source_url text,
  full_text text,
  vocab_preview jsonb,
  comprehension_questions jsonb,
  created_at timestamptz default now()
);
alter table readings enable row level security;
create policy "users own readings" on readings for all using (auth.uid() = user_id);

create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid references readings on delete cascade not null,
  user_id uuid references profiles(user_id) on delete cascade not null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  current_offset integer default 0,
  comprehension_checks jsonb
);
alter table reading_sessions enable row level security;
create policy "users own reading sessions" on reading_sessions for all using (auth.uid() = user_id);
