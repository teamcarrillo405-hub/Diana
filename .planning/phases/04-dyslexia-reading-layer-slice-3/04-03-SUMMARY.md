---
phase: 04-dyslexia-reading-layer-slice-3
plan: "03"
subsystem: reading-layer
tags: [reading-panel, tts, comprehension-scaffolds, edge-function, settings, font-picker]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [ReadingPanel, fetchScaffold, reading-scaffold-edge-function, reading-font-picker]
  affects: [assignment-detail-page, settings-accessibility]
tech_stack:
  added: [supabase-edge-functions, reading-scaffold]
  patterns: [server-action-wraps-edge-function, opt-in-ai-scaffold, traffic-light-defense-in-depth]
key_files:
  created:
    - app/(app)/assignments/[id]/reading-panel.tsx
    - app/(app)/assignments/[id]/reading-panel-actions.ts
    - supabase/functions/reading-scaffold/index.ts
  modified:
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/settings/accessibility-prefs.tsx
    - app/(app)/settings/actions.ts
decisions:
  - "classAiMode defaults to 'green' in page.tsx; Phase 6 (F16) adds per-class traffic-light column"
  - "Scaffold buttons are opt-in behind 'Help me with this reading' tap — not shown by default"
  - "reading-scaffold Edge Function uses claude-sonnet-4-6 with 512 max_tokens; truncates to 1500 chars for pre, 4000 for mid/post"
metrics:
  duration_minutes: 8
  completed_date: "2026-05-29"
  tasks_completed: 2
  files_changed: 6
---

# Phase 04 Plan 03: ReadingPanel + reading-scaffold Edge Function + Settings font picker Summary

ReadingPanel with TTS word-highlight, opt-in comprehension scaffolds (pre/mid/post), and reading font picker wired across the full stack.

## What Was Built

### Task 1 — reading-scaffold Edge Function + fetchScaffold server action (commit: 88883a3)

Created `supabase/functions/reading-scaffold/index.ts` — a Deno Edge Function serving three comprehension scaffold types:
- **pre**: Key vocabulary list (5-8 words) from opening 1500 chars
- **mid**: Plain-language recap + open-ended question (4000 chars)
- **post**: 3 retrieval questions, no answers (4000 chars)

Defense-in-depth: `aiMode='red'` returns 403 before calling Anthropic. Model: `claude-sonnet-4-6`, 512 max_tokens.

Created `app/(app)/assignments/[id]/reading-panel-actions.ts` — a `"use server"` action that validates input with zod and wraps `supabase.functions.invoke("reading-scaffold")`. Keeps API keys server-side, never in the browser.

### Task 2 — ReadingPanel + page wiring + Settings font picker (commit: 792c267)

Created `app/(app)/assignments/[id]/reading-panel.tsx`:
- `.reading-view` class wraps entire section (typography applied via CSS)
- `TtsHighlightButton` embedded — student taps "Read aloud", never autoplays
- Comprehension scaffold buttons hidden until student taps "Help me with this reading"
- When `classAiMode === 'red'`: scaffold section is not rendered at all (client-side guard, Pitfall 5)
- Three scaffold buttons: "Key vocabulary", "What just happened?", "Check understanding"
- Error state shows calm message ("Support not available right now. Try again in a moment.")
- No numeric scores, no "grade", "past due", or "wrong" in UI text

Updated `app/(app)/assignments/[id]/page.tsx`:
- Added `import { ReadingPanel } from "./reading-panel"`
- ReadingPanel rendered after `</header>` when `kind === 'reading'` OR `reading_load >= 3`
- `classAiMode` hardcoded to `"green"` (Phase 6/F16 adds per-class traffic-light)

Updated `app/(app)/settings/actions.ts`:
- Added `reading_font: z.enum(["system","lexend","atkinson","opendyslexic"]).optional()` to Prefs schema
- No other changes needed — `supabase.from("profiles").update(parsed.data)` already handles new fields

Updated `app/(app)/settings/accessibility-prefs.tsx`:
- Added `readingFont` state initialized from `initial.reading_font ?? "system"`
- Extended `commit` type to include `reading_font`
- Added "Reading font" Group with 4 Pill options (System / Lexend / Atkinson / OpenDyslexic) after the Dyslexia-friendly font toggle

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` | 35/35 tests pass |
| ReadingPanel in page.tsx | Confirmed (lines 13, 79) |
| classAiMode!='red' guard | Confirmed (line 60 of reading-panel.tsx) |
| No numeric scores in reading-panel.tsx | Confirmed (only comment referencing "scores") |
| aiMode='red' returns 403 | Confirmed (line 44 of edge function) |
| reading_font in accessibility-prefs.tsx | Confirmed (lines 33, 34, 44, 113, 114) |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

- `classAiMode` is hardcoded to `"green"` in `app/(app)/assignments/[id]/page.tsx` (line 85). This is intentional: per-class traffic-light (F16) ships in Phase 6. The stub is documented in a code comment and is non-blocking for F06/F07 functionality.

## Self-Check

- [x] `supabase/functions/reading-scaffold/index.ts` exists
- [x] `app/(app)/assignments/[id]/reading-panel-actions.ts` exists
- [x] `app/(app)/assignments/[id]/reading-panel.tsx` exists
- [x] Task 1 commit `88883a3` exists
- [x] Task 2 commit `792c267` exists
- [x] TypeScript: 0 errors
- [x] All 35 tests pass

## Self-Check: PASSED
