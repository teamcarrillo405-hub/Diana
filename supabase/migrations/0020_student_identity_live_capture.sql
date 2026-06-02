-- Phase 12: Student Identity + Live Capture (F22-F25).
--
-- Adds the personalization fields that every subject engine can consume, plus
-- note metadata for lecture capture and extracted action items.

alter table public.profiles
  add column interests text[] not null default '{}',
  add column mastery_signals jsonb not null default '{}'::jsonb,
  add column session_mood text check (session_mood in ('good','meh','rough'));

alter table public.notes
  add column source text not null default 'manual'
    check (source in ('manual','voice','audio_upload','doc_upload','lecture')),
  add column action_items_json jsonb not null default '[]'::jsonb;

alter table public.inbox_items
  add column source_note_id uuid references public.notes(id) on delete set null;

create index notes_owner_source_updated_idx
  on public.notes (owner_id, source, updated_at desc);

create index inbox_items_source_note_idx
  on public.inbox_items (source_note_id)
  where source_note_id is not null;

comment on column public.profiles.interests is
  'Student-selected interest ids used to personalize examples and analogies.';

comment on column public.profiles.mastery_signals is
  'Adaptive subject/concept mastery signals; Phase 15 expands this into concept tables.';

comment on column public.profiles.session_mood is
  'Latest optional student mood check-in: good, meh, or rough.';

comment on column public.notes.source is
  'How the note was created: manual, voice, audio_upload, doc_upload, or lecture.';

comment on column public.notes.action_items_json is
  'Action items extracted from note cleanup and mirrored into inbox_items for student review.';
