---
phase: 22-foreign-language-engine
plan: "01"
completed: "2026-06-01"
requirements_completed: [F89, F90, F91, F92, F93, F94, F95]
---

# Phase 22 Plan 01 Summary

Phase 22 is implemented and deployed to the linked Supabase project.

## What Changed

- Added `language-scaffold` Edge Function:
  - Vocabulary mode.
  - Conjugation mode.
  - Reading mode.
  - Speaking mode.
  - Writing mode.
  - Culture mode.
  - Red/yellow AI mode blocks for content-generating language help.
  - `language_scaffold` logging through the shared AI safety layer.
- Added `lib/language/scaffold.ts`:
  - Typed language scaffold result model.
  - JSON parsing and deterministic fallback guidance.
  - Vocabulary, conjugation, reading, speaking, writing, and culture normalizers.
- Added Foreign Language Helper to assignment detail:
  - Renders for language class names and language-specific prompt keywords.
  - Target language selector.
  - Text input plus target-language speech transcript input through `VoiceTextarea`.
  - Vocabulary cards with audio buttons and FSRS save action.
  - Incremental conjugation table rows.
  - Reading, speaking, writing, and culture card renderers.
- Extended `VoiceTextarea` with `speechLang` for target-language browser STT.
- Added flashcard review TTS controls for front/back card audio through the saved provider.
- Added `language_scaffold` to AI feature unions and tooltip descriptions.

## Acceptance Evidence

- F89 vocabulary introduction:
  - `language-scaffold` mode `vocabulary`.
  - Vocabulary cards include cognate hint, interest sentence, and pronunciation text.
- F90 conjugation scaffold:
  - `language-scaffold` mode `conjugation`.
  - UI reveals rows with `Next cell`.
- F91 reading comprehension:
  - `language-scaffold` mode `reading`.
  - Output pairs English questions with target-language answer frames.
- F92 speaking practice:
  - `VoiceTextarea` can capture a target-language transcript via browser STT.
  - `language-scaffold` mode `speaking` returns nongraded practice prompts from the transcript.
- F93 writing in target language:
  - `language-scaffold` mode `writing`.
- F94 cultural context cards:
  - `language-scaffold` mode `culture`.
- F95 vocabulary spaced repetition:
  - `createFlashcard` saves vocabulary cards into the existing FSRS deck.
  - Flashcard review now includes TTS controls; ElevenLabs playback is used when the student has selected the ElevenLabs provider and the Edge Function secret is configured.

## Verification

- `npx vitest run lib/language/scaffold.test.ts`: pass, 1 file / 3 tests
- `npm run typecheck`: pass
- `npx supabase functions deploy language-scaffold`: pass
- `npx supabase functions list`: pass, `language-scaffold` ACTIVE, updated 2026-06-01T20:10:29Z
- `npm run test:run`: pass, 45 files / 339 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 README warning
- `git diff --check`: pass, only line-ending warnings
- `npm run build`: pass

## Notes

- No database migration was needed for Phase 22.
- Speaking feedback is transcript-based; there is no acoustic pronunciation scoring in this phase.
- Language flashcards reuse the existing `flashcards` schema and TTS playback path rather than adding a dedicated audio column.
