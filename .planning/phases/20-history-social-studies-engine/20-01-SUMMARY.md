---
phase: 20-history-social-studies-engine
plan: "01"
completed: "2026-06-01"
requirements_completed: [F75, F76, F77, F78, F79, F80, F81]
---

# Phase 20 Plan 01 Summary

Phase 20 is implemented and deployed to the linked Supabase project.

## What Changed

- Added `history-scaffold` Edge Function:
  - Text modes for primary source, cause/effect, HAPP, DBQ, compare/contrast, and current-events scaffolds.
  - Image mode for map annotation through GPT-4o.
  - Claude Haiku 4.5 for text scaffolds.
  - Red/yellow AI mode blocks for content-generating history help.
  - `history_scaffold` logging through the shared AI safety layer.
- Added `lib/history/scaffold.ts`:
  - Typed history scaffold result model.
  - JSON parsing and deterministic fallback guidance.
  - HAPP, DBQ, comparison, cause/effect, current-connection, and map annotation normalizers.
- Added History Helper to assignment detail:
  - Renders for history/social-studies class names and history-specific prompt keywords.
  - Supports source text paste plus text-file upload through browser `File.text()`.
  - Renders source cards, HAPP fields, cause/effect chains, DBQ outline, comparison table, current connections, and map annotation overlay.
- Added `history_scaffold` to AI feature unions and tooltip descriptions.

## Acceptance Evidence

- F75 primary source analyzer:
  - `history-scaffold` mode `primary_source`.
  - History Helper accepts pasted source text and text-like uploaded files.
- F76 cause-effect chain builder:
  - `history-scaffold` mode `cause_effect`.
  - UI renders a numbered cause/effect chain.
- F77 HAPP analysis framework:
  - `history-scaffold` mode `happ`.
  - Parser and fallback cover Historical context, Audience, Purpose, and Point of view.
- F78 DBQ essay scaffold:
  - `history-scaffold` mode `dbq`.
  - Fallback and prompt expect a six-part outline.
- F79 compare-contrast scaffold:
  - `history-scaffold` mode `compare`.
  - UI renders comparison lenses in a table.
- F80 map annotation:
  - `history-scaffold` mode `map_annotation`.
  - `uploadHistoryMapImage` stores jpg/jpeg/png/webp/gif files in the existing `note-docs` bucket.
- F81 current events connector:
  - `history-scaffold` mode `current_events`.
  - UI renders then/now bridge prompts.

## Verification

- `npx vitest run lib/history/scaffold.test.ts`: pass, 1 file / 5 tests
- `npm run typecheck`: pass
- `npx supabase functions deploy history-scaffold`: pass
- `npx supabase functions list`: pass, `history-scaffold` ACTIVE, updated 2026-06-01T19:50:39Z
- `npm run test:run`: pass, 41 files / 326 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 README warning
- `git diff --check`: pass, only line-ending warnings
- `npm run build`: pass

## Notes

- No database migration was needed for Phase 20.
- Primary source document upload is text-file upload in the browser; PDF/DOCX extraction remains part of the notes document-upload flow.
- Map annotation uses the existing `note-docs` bucket and stores no new database rows.
