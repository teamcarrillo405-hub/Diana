---
phase: 29-vocabulary-reading-scaffold-engine
plan: "01"
completed: "2026-06-01"
requirements_completed: [F135, F136, F137, F138, F139, F140, F141]
---

# Phase 29 Plan 01 Summary

Phase 29 is implemented, migration `0029_vocabulary_reading_scaffold.sql` is applied to the linked Supabase project, and `vocab-hover` plus `reading-level` are deployed ACTIVE.

## What Changed

- Added migration `0029_vocabulary_reading_scaffold.sql`:
  - `vocabulary_terms` table for saved hover words.
  - `reading_annotations` table for highlighted text notes.
  - Owner RLS policies and note/assignment/class indexes.
- Added reading/vocabulary helpers:
  - Word validation and normalization.
  - Context-clue generation.
  - Phonics breakdown.
  - Deterministic reading-level fallback.
- Upgraded `vocab-hover`:
  - Structured definition/context/phonics JSON.
  - Student interest context from `profiles.interests`.
  - Same token budget, safety, and logging path.
- Added `reading-level` Edge Function:
  - Simpler and more-detail adaptation modes.
  - Red/yellow AI policy gate.
  - Token budget, safety prompts, and `reading_level` interaction logs.
- Added client reading controls:
  - Hover vocabulary popover with first-encounter context clue.
  - Save vocabulary card action into FSRS.
  - Reading-level segmented control.
  - Highlight annotation save control.
  - Assignment reading block for server-rendered assignment descriptions.
- Extended AI transparency labels for `reading_level` and `vocab_hover`.

## Acceptance Evidence

- F135 hover vocabulary:
  - `AccessibleReadingText` emits `data-vocab-word` spans, and `VocabHoverProvider` opens on hover/double-click with word context.
- F136 reading level slider:
  - `ReadingLevelAdapter` offers Original / Simpler / More detail and calls `reading-level`.
- F137 annotation mode:
  - Highlighted note or assignment text can be saved through `ReadingAnnotationControl`.
- F138 read-aloud mode:
  - Existing synchronized `TtsHighlightButton` remains wired on full notes, cleaned transcripts, and reading panels.
- F139 vocabulary builder:
  - Hover definitions can save a `flashcards` row and linked `vocabulary_terms` row.
- F140 phonics scaffold:
  - Popover shows pronunciation, stress, and syllable support.
- F141 context clue trainer:
  - First hover shows context clue before definition; seen words can open definition directly.

## Verification

- `npx vitest run lib/reading/vocabulary.test.ts components/vocab-hover-provider.test.tsx`: pass, 2 files / 13 tests
- `npm run typecheck`: pass
- `npm run test:run`: pass after known Windows EPERM rerun, 54 files / 383 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 existing README warning
- `git diff --check`: pass, only line-ending warnings
- `npx supabase db push --linked --yes`: pass, applied `0029_vocabulary_reading_scaffold.sql`
- `npx supabase functions deploy vocab-hover`: pass
- `npx supabase functions deploy reading-level`: pass; sequential redeploy made the function visible in `functions list`
- `npx supabase migration list --linked`: pass, local and remote both at `0029`
- `npx supabase functions list`: pass, `vocab-hover` ACTIVE updated 2026-06-01T21:40:55Z and `reading-level` ACTIVE updated 2026-06-01T21:51:42Z
- `npm run build`: pass

## Notes

- Annotation rows store student notes only; no AI call is required.
- Reading-level fallback is deterministic if the remote function is temporarily unavailable.
- Vocabulary review intentionally stays inside the existing FSRS flashcard system.
