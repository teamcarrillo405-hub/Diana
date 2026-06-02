---
phase: 14-smart-notes-v2
plan: "01"
completed: "2026-06-01"
requirements_completed: [F33, F34, F35, F36, F37, F38]
---

# Phase 14 Plan 01 Summary

Phase 14 is implemented and applied to the linked Supabase project.

## What Changed

- Added migration `0022_smart_notes_v2.sql`:
  - `notes.tags`
  - `notes.ai_suggested_tags`
  - generated `notes.search_vector`
  - GIN indexes for full-text search and tag filters
- Added `note-synthesis` Edge Function for cross-note synthesis with source citations.
- Added `note-tags` Edge Function for AI-suggested tags.
- Added the notes synthesis panel on `/notes`.
- Added full-text note search with snippets and tag display.
- Added deterministic related-note scoring in `lib/notes/related.ts`.
- Added related notes on note detail.
- Added tag add/remove/suggest/accept flows on note detail.
- Added one-tap flashcard creation from highlighted note text.
- Kept the existing generated outline section as the Phase 14 outline view surface.

## Acceptance Evidence

- Synthesis query cites source notes:
  - `supabase/functions/note-synthesis/index.ts` requires JSON output with `summary` and note citations.
  - `app/(app)/notes/note-synthesis-panel.tsx` renders citation links back to `/notes/:id`.
- Related notes within note detail:
  - `app/(app)/notes/[id]/page.tsx` loads recent note candidates.
  - `lib/notes/related.ts` scores text, tag, and class overlap locally before render.
- Full-text search:
  - `notes.search_vector` is generated in migration 0022.
  - `app/(app)/notes/page.tsx` uses `textSearch("search_vector", ...)` and `snippetForQuery`.
- Highlight to flashcard:
  - `app/(app)/notes/[id]/note-detail.tsx` captures selected note text and exposes `Create card from highlight`.
  - `createFlashcardFromSelection` verifies the selected text belongs to the note, then inserts an FSRS flashcard with `source_note_id`.
- Tags:
  - `updateNoteTags` writes student tags.
  - `suggestNoteTags` invokes `note-tags` and stores `ai_suggested_tags`.

## Verification

- `npm run typecheck`: pass
- `npm run test:run`: pass, 34 files / 298 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 README warning
- `npm run build`: pass
- `npx supabase db push --linked --dry-run`: pass, only `0022_smart_notes_v2.sql` pending
- `npx supabase db push --linked --yes`: pass, migration `0022` applied
- `npx supabase migration list --linked`: pass, migration `0022` present on Local and Remote; CLI also reported transient pooler auth circuit-breaker retries before completing
- `npx supabase --experimental db query --linked`: pass, `tags`, `ai_suggested_tags`, and `search_vector` present
- `npx supabase functions deploy note-synthesis`: pass
- `npx supabase functions deploy note-tags`: pass after retry
- `npx supabase functions list`: pass, `note-synthesis` and `note-tags` ACTIVE

## Notes

- Migration 0022 was applied to linked project `oitipayrriupcitgmzju`.
- `note-synthesis` deployed 2026-06-01T17:20:57Z.
- `note-tags` deployed 2026-06-01T17:26:04Z after one retry; first deploy returned success but was not immediately visible in `functions list`.
