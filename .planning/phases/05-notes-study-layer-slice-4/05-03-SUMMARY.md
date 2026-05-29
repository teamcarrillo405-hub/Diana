---
phase: 05-notes-study-layer-slice-4
plan: "03"
subsystem: ui
tags: [fsrs, spaced-repetition, flashcards, dashboard, next.js, supabase]

# Dependency graph
requires:
  - phase: 05-01-notes-study-layer-slice-4
    provides: "lib/fsrs/fsrs.ts (createCard, schedule, Rating), lib/notes/types.ts (Flashcard, FsrsState, Rating), migration 0011 (flashcards + flashcard_reviews tables)"
provides:
  - "/flashcards list page with due-today deck and coming-up list"
  - "/flashcards/new manual card creation form with ?note= pre-fill"
  - "/flashcards/[id]/review review session (flip + Again/Hard/Good/Easy → FSRS schedule + log)"
  - "createFlashcard + deleteFlashcard server actions"
  - "rateCard server action that calls schedule() and writes flashcard_reviews log"
  - "Dashboard DueCards tile with calm copy ('N cards to review today')"
  - "Study nav item linking to /flashcards in both BottomNav and SideNav"
affects:
  - "05-02-notes-study-layer-slice-4 (notes UI — add '+ Make card' link to /notes/[id])"
  - "06-ai-feature-core (flashcard generation from AI summaries)"
  - "07-polish-tier-2 (F20 tone audit will scan flashcards/ for banned patterns)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FSRS server action pattern: load card row → call schedule() → update flashcards → insert flashcard_reviews (sequential awaited calls)"
    - "Due-cards tile: self-contained display component fed count + firstCardId props from parent server page"
    - "Review queue: server page reorders fullQueue to start from requested id, passes to client ReviewSession"
    - "Calm copy invariant: zero shame/streak/incorrect/behind language in all flashcards UI (F20 guard)"

key-files:
  created:
    - "app/(app)/flashcards/actions.ts"
    - "app/(app)/flashcards/[id]/actions.ts"
    - "app/(app)/flashcards/page.tsx"
    - "app/(app)/flashcards/new/page.tsx"
    - "app/(app)/flashcards/new/card-form.tsx"
    - "app/(app)/flashcards/[id]/review/page.tsx"
    - "app/(app)/flashcards/[id]/review/review-session.tsx"
    - "app/(app)/dashboard/due-cards.tsx"
  modified:
    - "app/(app)/dashboard/page.tsx"
    - "components/nav.tsx"

key-decisions:
  - "rateCard uses sequential await calls (load → update → insert) rather than a Postgres RPC — matches inbox classification pattern already in codebase"
  - "ReviewSession client component re-renders off local idx state after rateCard returns; revalidatePath('/flashcards') ensures server data is fresh on back-navigation"
  - "DueCards tile returns null when count=0 — no empty-state nagging for students who haven't created cards yet"
  - "Flashcard-from-note link (/notes/[id] → ?note={id} param) intentionally deferred: ?note= wiring and FK exist, adding the link is a one-line follow-up in Phase 5 polish or Phase 6"
  - "RATINGS array in review-session uses Anki-convention labels (Again/Hard/Good/Easy) — neutral, no shame, exactly mirrors FSRS spec"

patterns-established:
  - "Server action returns { ok: true; ... } | { ok: false; error: string } discriminated union — consistent with notes/actions and inbox/actions patterns"
  - "Dashboard tiles: server page fetches count + firstId, passes as props to display component (not prop-drilling full rows)"

requirements-completed:
  - F12

# Metrics
duration: 16min
completed: "2026-05-29"
---

# Phase 5 Plan 03: Flashcards UI + FSRS Review Session + Dashboard DueCards Tile Summary

**FSRS-5 spaced repetition flashcard system: deck list, manual card creation, flip-and-rate review session wired to schedule() + flashcard_reviews log, and calm dashboard tile ("N cards to review today — no rush").**

## Performance

- **Duration:** 16 min
- **Started:** 2026-05-29T06:00:45Z
- **Completed:** 2026-05-29T06:16:50Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Full flashcard CRUD + FSRS scheduling wired end-to-end: createCard() initializes state, schedule() advances it, flashcard_reviews row inserted after every rating
- Review session: flip front/back, rate Again/Hard/Good/Easy, auto-advance to next due card, finish with "Done for now" calm state
- Dashboard DueCards tile surfaces due count to students who never visit /flashcards directly; tile disappears cleanly when count=0
- Study item added to BottomNav + SideNav (Brain icon); both nav variants use the shared ITEMS array so no duplication
- Zero TypeScript errors; 51 existing tests all pass; build clean with /flashcards, /flashcards/new, /flashcards/[id]/review routes

## Task Commits

Each task was committed atomically:

1. **Task 1: Server actions (createFlashcard, deleteFlashcard, rateCard) + Study nav item** - `32a6542` (feat)
2. **Task 2: /flashcards list page, /flashcards/new form, /flashcards/[id]/review session** - `ed81152` (feat)
3. **Task 3: DueCards dashboard tile + dashboard wiring** - `3507934` (feat)

**Plan metadata:** (docs commit — created after this summary)

## Files Created/Modified
- `app/(app)/flashcards/actions.ts` — createFlashcard (createCard init) + deleteFlashcard server actions
- `app/(app)/flashcards/[id]/actions.ts` — rateCard: load card → schedule() → update flashcards → insert flashcard_reviews
- `app/(app)/flashcards/page.tsx` — due-today deck + coming-up list + empty state
- `app/(app)/flashcards/new/page.tsx` — server page reads ?note= searchParam, passes to CardForm
- `app/(app)/flashcards/new/card-form.tsx` — client form: front/back textareas, createFlashcard submit
- `app/(app)/flashcards/[id]/review/page.tsx` — server page loads due queue, reorders from requested id
- `app/(app)/flashcards/[id]/review/review-session.tsx` — client session: flip, RATINGS array, handleRate, Done-for-now finish
- `app/(app)/dashboard/due-cards.tsx` — DueCards tile: Brain icon, calm copy, links to first due card's review
- `app/(app)/dashboard/page.tsx` — added DueCards import, dueCards fetch, DueCards render before TimeBudget
- `components/nav.tsx` — added Brain icon + /flashcards Study item to ITEMS array

## Decisions Made
- rateCard uses sequential await calls rather than a Postgres RPC — consistent with inbox classification pattern; atomicity of log + update is sufficient for FSRS correctness (partial failure leaves card state updated without log, which is a minor scheduling imprecision rather than data loss)
- Flashcard-from-note link deferred: the `?note={id}` query param wiring and the `source_note_id` FK are both in place; adding a "+ Make card" link on `/notes/[id]` is a one-line follow-up in Phase 5 polish or Phase 6
- DueCards tile is a server component (no "use client") — it receives props from the dashboard server page, matching the time-budget.tsx tile pattern

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
None. All data flows are wired: createFlashcard inserts real rows, rateCard reads + updates real rows + inserts review log, DueCards fetches live due count from Supabase. The ?note= pre-fill param is wired (sourceNoteId flows to insert); only the trigger link on /notes/[id] is deferred (documented above).

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- F12 fully delivered: deck list, manual creation, FSRS review session, dashboard tile, nav item
- Flashcard-from-note convenience link (one-liner: add Link to `/notes/[id]` pointing to `/flashcards/new?note={id}`) deferred to Phase 5 polish or Phase 6
- Phase 5 overall: 05-01 and 05-03 complete; 05-02 (Notes UI) is the remaining plan
- Phase 6 (AI feature core) can proceed once Phase 5 is marked complete

---
*Phase: 05-notes-study-layer-slice-4*
*Completed: 2026-05-29*
