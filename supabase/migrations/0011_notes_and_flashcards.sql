-- Phase 5 F08/F12: notes (audio + transcript + outline) and FSRS-5 flashcards.

-- 1. notes: in-class note-taking — audio + body_text + AI transcript + outline_json
create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  assignment_id   uuid references public.assignments(id) on delete set null,
  title           text not null default 'Untitled note',
  body_text       text not null default '',
  audio_storage_key text,
  transcript_text text,
  outline_json    jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.notes enable row level security;

create policy "notes: owner full access"
  on public.notes
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index notes_owner_updated_idx
  on public.notes (owner_id, updated_at desc);

-- 2. flashcards: FSRS-5 cards (basic text + optional image)
create table public.flashcards (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  source_note_id  uuid references public.notes(id) on delete set null,
  front           text not null,
  back            text not null,
  image_storage_key text,
  -- FSRS card state (latest scheduling snapshot — review log is in flashcard_reviews)
  state           text not null default 'new'
                    check (state in ('new','learning','review','relearning')),
  stability       numeric not null default 0,
  difficulty      numeric not null default 0,
  due_at          timestamptz not null default now(),
  reps            integer not null default 0,
  lapses          integer not null default 0,
  last_review_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.flashcards enable row level security;

create policy "flashcards: owner full access"
  on public.flashcards
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Due-today deck performance index
create index flashcards_owner_due_idx
  on public.flashcards (owner_id, due_at);

-- 3. flashcard_reviews: every review event (history is sacred for FSRS optimization later)
create table public.flashcard_reviews (
  id              bigserial primary key,
  card_id         uuid not null references public.flashcards(id) on delete cascade,
  owner_id        uuid not null references auth.users(id) on delete cascade,
  rating          smallint not null check (rating between 1 and 4),
  -- Snapshot of scheduling at the moment of review
  scheduled_for   timestamptz not null,
  reviewed_at     timestamptz not null default now(),
  stability       numeric not null,
  difficulty      numeric not null,
  elapsed_days    numeric not null,
  scheduled_days  numeric not null,
  reps            integer not null,
  lapses          integer not null,
  state           text not null check (state in ('new','learning','review','relearning'))
);

alter table public.flashcard_reviews enable row level security;

create policy "flashcard_reviews: owner full access"
  on public.flashcard_reviews
  for all
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index flashcard_reviews_card_idx
  on public.flashcard_reviews (card_id, reviewed_at desc);
