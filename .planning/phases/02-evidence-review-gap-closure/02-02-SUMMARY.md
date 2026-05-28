---
phase: 02-evidence-review-gap-closure
plan: "02"
subsystem: scoring, dashboard
tags: [vitest, typescript, tdd, scorer, signals, dyslexia, gap-08]

# Dependency graph
requires:
  - phase: 02-evidence-review-gap-closure
    plan: "01"
    provides: vitest setup, next-five-minutes.test.ts scaffold, task_signals recency index
provides:
  - RecentSignal exported type in lib/scoring/next-five-minutes.ts
  - rankAssignments extended: (assignments, signals, now, energy, profile)
  - Signal-recency decay: <2h → +25, 2-8h → +10, >8h → 0
  - 4 GAP-08 unit tests + 2 smoke tests = 6 total passing
  - Dashboard wired to fetch task_signals and pass to scorer
affects: [02-03, 02-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN in same wave: test file compiled against future type export (RecentSignal) causes runtime errors in RED state"
    - "Signal-recency decay: signals.find() per assignment, age bucketed into 3 bands"
    - "Supabase RLS handles owner filtering — no explicit eq('owner_id') needed"

key-files:
  created: []
  modified:
    - lib/scoring/next-five-minutes.ts
    - lib/scoring/next-five-minutes.test.ts
    - app/(app)/dashboard/page.tsx

key-decisions:
  - "signals parameter inserted as second positional arg to rankAssignments — before now/energy/profile; dashboard updated accordingly; no other callers existed"
  - "Status-based momentum bump ('drafting'/'checking' → +25 'already started') fully removed; signals are the sole momentum source"
  - "assignment_id nullable in task_signals schema — filter applied in dashboard before passing to scorer to satisfy TypeScript and avoid false IDs from energy signals"
  - "1.6x dyslexia reading_load multiplier codified in REQUIREMENTS.md GAP-08 (was 1.5x in initial spec); existing implementation matches, test verifies it"

# Metrics
duration: 3min
completed: 2026-05-28
---

# Phase 2 Plan 02: Signal-Recency Scorer + Dashboard Wiring Summary

**JWT-free scorer extended with task_signals recency decay (replacing status-based momentum), 6 unit tests green, dashboard wired to fetch and pass recent signals**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-05-28T22:55:09Z
- **Completed:** 2026-05-28T22:58:08Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `rankAssignments` extended with `signals: RecentSignal[] = []` as second parameter (fully backward-compatible default)
- `RecentSignal` type exported from scorer for callers to use
- Status-based momentum removed; signal-recency decay implemented:
  - Signal < 2h old → +25 score, reason "recently worked on"
  - Signal 2–8h old → +10 score, reason "worked on earlier today"
  - Signal > 8h old → 0 bonus (decay floor)
- Dyslexia 1.6x reading_load inflation verified and preserved (GAP-08.1/GAP-08.2)
- 4 GAP-08 unit tests + 2 existing smoke tests = 6 total — all green
- Dashboard fetches last 4 hours of started/completed signals via RLS-protected Supabase query
- `recentSignals` filtered to non-null assignment_id (energy signals have no assignment) before passing to scorer
- `npx vitest run` exits 0 with 6 tests
- `npx tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: TDD RED — 4 GAP-08 failing tests + updated smoke tests** - `59d3767` (test)
2. **Task 2: GREEN — RecentSignal type + signal-recency decay** - `34ed17d` (feat)
3. **Task 3: Dashboard wiring — signals fetch + scorer call updated** - `71bb348` (feat)

## Files Created/Modified

- `lib/scoring/next-five-minutes.ts` — RecentSignal type added; rankAssignments signature extended; status-based bump replaced with signal-recency decay; score() inner function updated
- `lib/scoring/next-five-minutes.test.ts` — makeAssignment helper; GAP-08 describe block with 4 tests; smoke tests updated to pass [] explicitly
- `app/(app)/dashboard/page.tsx` — signals fetch query (last 4h, started/completed, RLS-filtered); recentSignals filter + rankAssignments call updated

## Decisions Made

- Scorer signature: `signals` inserted as second positional parameter (before `now`) so callers can omit it for backward compat via default `[]`
- Status-based momentum (`drafting`/`checking` → +25) fully removed — signals are now the sole momentum source; this is intentional
- Dashboard does not add explicit `.eq("owner_id", user.id)` — RLS already enforces this, matching the pattern from the assignments query
- `occurred_at` type in `task_signals` is a non-nullable string (ISO 8601) per schema; nullable `assignment_id` is the field that needs filtering

## Notes for Waves 3 + 4

- **Scorer is stable** — waves 3 and 4 (UI fixes and new UI logic) must NOT touch `lib/scoring/next-five-minutes.ts`
- Wave 3 UI work: Lexend font, onboarding step, TimeBar, checklist — scorer signature unchanged, dashboard wiring unchanged
- Wave 4 UI logic: micro-task, pivot, breadcrumb — if these components call rankAssignments they must pass `signals` as second arg using the `RecentSignal[]` type
- `kind: "other"` used in test fixtures — if new assignment kinds are added in wave 4, makeAssignment helper in test file may need updating but core test logic is unaffected

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — signals are fetched from real Supabase data and passed through to the scorer. No hardcoded or placeholder values in the data flow.

## Self-Check: PASSED
