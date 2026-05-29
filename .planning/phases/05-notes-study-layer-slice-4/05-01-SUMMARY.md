---
phase: 05-notes-study-layer-slice-4
plan: "01"
subsystem: database
tags: [fsrs, spaced-repetition, supabase, vitest, react-hooks, debounce, notes, flashcards]

requires:
  - phase: 04-dyslexia-reading-layer-slice-3
    provides: "reading_font migration pattern, manual types.ts extension convention"
  - phase: 03-capture-time-layer-slice-2
    provides: "inbox_items/assignment_intentions shape used as type extension template"

provides:
  - "Migration 0011: public.notes, public.flashcards, public.flashcard_reviews with RLS"
  - "lib/supabase/types.ts extended with notes/flashcards/flashcard_reviews table definitions"
  - "lib/notes/types.ts: Note, Flashcard, FlashcardReview, Rating, FsrsState camelCase type aliases"
  - "lib/fsrs/fsrs.ts: pure FSRS-5 scheduler (createCard, schedule, Rating) with default weights"
  - "lib/notes/auto-save.ts: useAutoSaveNote hook with 30s debounce, save/flushNow/status API"

affects: [05-02-notes-ui, 05-03-flashcards-ui]

tech-stack:
  added:
    - "@testing-library/react (devDependency — jsdom hook test harness)"
  patterns:
    - "FSRS-5 pure-function scheduler: no global clock, no Math.random, deterministic"
    - "Manual Supabase types extension: three new tables added alphabetically to Database['public']['Tables']"
    - "useAutoSaveNote: saver-as-prop pattern — hook is generic, caller closes over note body"
    - "TDD RED→GREEN for both FSRS and auto-save: tests written before implementation"

key-files:
  created:
    - supabase/migrations/0011_notes_and_flashcards.sql
    - lib/notes/types.ts
    - lib/fsrs/fsrs.ts
    - lib/fsrs/fsrs.test.ts
    - lib/notes/auto-save.ts
    - lib/notes/auto-save.test.ts
  modified:
    - lib/supabase/types.ts

key-decisions:
  - "FSRS-5 default weights (v5 Anki release) used; 19-parameter optimization deferred to Phase 7+"
  - "@testing-library/react installed (devDep) because React 19 renderHook/act not available standalone in this environment"
  - "useAutoSaveNote accepts saver as prop (not note body) — hook stays generic; callers close over their own state"
  - "FsrsCard.difficulty=0 on new cards, initialStability/initialDifficulty computed on first schedule() call"
  - "learning state kept for Good on new card (graduates to review only via schedule() from learning state) — mirrors Anki behavior"

patterns-established:
  - "Pure-function algorithm pattern: all inputs via parameters, no module-level state, deterministic"
  - "Debounced hook with inFlightRef guard: prevents concurrent save calls; coalesces rapid edits"
  - "TDD for lib/ code: RED commit (test only) → GREEN commit (implementation passing)"

requirements-completed: [F08, F12]

duration: 18min
completed: 2026-05-29
---

# Phase 5 Plan 01: Notes + Study Layer Foundation Summary

**Migration 0011 (notes/flashcards/flashcard_reviews + RLS) + pure FSRS-5 scheduler (10 tests) + debounced useAutoSaveNote hook (6 tests), providing the shared DB + algorithm foundation for Wave 2 notes and flashcard UIs**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-05-29T05:28:00Z
- **Completed:** 2026-05-29T05:46:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Migration 0011 creates `public.notes`, `public.flashcards`, and `public.flashcard_reviews` with RLS policies, performance indexes, and correct FK + ON DELETE behavior
- FSRS-5 scheduler implemented as pure functions with published default weights (w[0..18]), target retention 0.9 — all 10 tests pass including monotonic stability growth and clamped difficulty
- `useAutoSaveNote` hook debounces saves at 30 s default, coalesces rapid edits into one server call, exposes `flushNow()` for unmount flush — all 6 tests pass using fake timers

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0011 + Supabase types extension + lib/notes/types.ts** - `df4976e` (feat)
2. **Task 2: FSRS-5 algorithm + unit tests** - `7fee98f` (feat)
3. **Task 3: Debounced auto-save hook + test** - `b793b54` (feat)

**Plan metadata:** (docs commit follows)

_Note: Tasks 2 and 3 used TDD RED→GREEN flow (tests confirmed failing before implementation)_

## Files Created/Modified

- `supabase/migrations/0011_notes_and_flashcards.sql` — 3 RLS-protected tables: notes, flashcards, flashcard_reviews
- `lib/supabase/types.ts` — Extended with flashcard_reviews, flashcards, notes table type entries
- `lib/notes/types.ts` — Note, Flashcard, FlashcardReview, Rating, FsrsState, OutlineNode type aliases
- `lib/fsrs/fsrs.ts` — FSRS-5 pure scheduler: Rating enum, FsrsCard interface, createCard(), schedule()
- `lib/fsrs/fsrs.test.ts` — 10 deterministic FSRS unit tests
- `lib/notes/auto-save.ts` — useAutoSaveNote hook (30s debounce, save/flushNow/status/lastSavedAt)
- `lib/notes/auto-save.test.ts` — 6 fake-timer tests covering coalescing, state transitions, error path

## Decisions Made

- **FSRS-5 default weights:** Published v5 Anki release weights used as-is; 19-parameter personalized optimization is a Phase 7+ concern
- **@testing-library/react installed:** React 19's standalone `renderHook`/`act` was not available in this node_modules shape; `@testing-library/react` provides reliable jsdom hook testing
- **saver-as-prop design:** `useAutoSaveNote` accepts an async `saver` function rather than the note body, keeping the hook environment-agnostic and testable without mocking server actions
- **FsrsCard.difficulty initial value 0:** New cards carry difficulty=0 until first `schedule()` call computes `initialDifficulty(rating)` — prevents clamping artifacts on the very first review
- **Good on new card → learning (not review):** Mirrors Anki's two-step graduation; Easy is the only rating that graduates a new card directly to review state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all tests passed on first run after implementation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **05-02 (Notes UI):** Can import `Note`, `useAutoSaveNote`, and the `notes` Supabase table type immediately
- **05-03 (Flashcards UI):** Can import `Flashcard`, `FlashcardReview`, `Rating`, and `schedule()` for review session logic
- Both Wave 2 plans can proceed in parallel — all shared dependencies are now resolved

---
*Phase: 05-notes-study-layer-slice-4*
*Completed: 2026-05-29*
