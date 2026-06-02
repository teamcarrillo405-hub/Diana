-- Phase 29: Vocabulary + Reading Scaffold Engine.
-- Saves student-owned vocabulary cards and text annotations without creating a separate study system.

create table if not exists public.vocabulary_terms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  note_id uuid references public.notes(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  flashcard_id uuid references public.flashcards(id) on delete set null,
  word text not null,
  context_text text,
  definition text not null,
  phonics jsonb not null default '{}'::jsonb,
  source text not null default 'hover' check (source in ('hover', 'selection', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(word)) between 1 and 64),
  check (note_id is null or assignment_id is null)
);

create table if not exists public.reading_annotations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  note_id uuid references public.notes(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade,
  selected_text text not null,
  note_text text not null,
  color text not null default 'amber' check (color in ('amber', 'sky', 'violet', 'emerald')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(selected_text)) between 1 and 1200),
  check (length(trim(note_text)) between 1 and 1000),
  check (num_nonnulls(note_id, assignment_id) = 1)
);

create index if not exists vocabulary_terms_owner_word_idx
  on public.vocabulary_terms (owner_id, lower(word), created_at desc);

create index if not exists vocabulary_terms_owner_class_idx
  on public.vocabulary_terms (owner_id, class_id, created_at desc);

create index if not exists reading_annotations_owner_note_idx
  on public.reading_annotations (owner_id, note_id, created_at desc)
  where note_id is not null;

create index if not exists reading_annotations_owner_assignment_idx
  on public.reading_annotations (owner_id, assignment_id, created_at desc)
  where assignment_id is not null;

alter table public.vocabulary_terms enable row level security;
alter table public.reading_annotations enable row level security;

create policy "vocabulary_terms owner read"
  on public.vocabulary_terms for select
  using (owner_id = auth.uid());

create policy "vocabulary_terms owner insert"
  on public.vocabulary_terms for insert
  with check (owner_id = auth.uid());

create policy "vocabulary_terms owner update"
  on public.vocabulary_terms for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "vocabulary_terms owner delete"
  on public.vocabulary_terms for delete
  using (owner_id = auth.uid());

create policy "reading_annotations owner read"
  on public.reading_annotations for select
  using (owner_id = auth.uid());

create policy "reading_annotations owner insert"
  on public.reading_annotations for insert
  with check (owner_id = auth.uid());

create policy "reading_annotations owner update"
  on public.reading_annotations for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "reading_annotations owner delete"
  on public.reading_annotations for delete
  using (owner_id = auth.uid());
