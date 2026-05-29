---
phase: 03-capture-time-layer-slice-2
plan: "03"
subsystem: time-blindness-ui
tags: [dashboard, time-budget, calibration, time-log, state-machine, F05]
dependency_graph:
  requires:
    - 03-01 (lib/time-budget/compute.ts, lib/time-budget/calibration.ts, migration 0009)
  provides:
    - app/(app)/dashboard/time-budget.tsx
    - app/(app)/assignments/[id]/actions.ts (extended with time-log lifecycle)
    - app/(app)/assignments/new/form.tsx (extended with calibration hint)
    - app/(app)/assignments/new/page.tsx (extended with calibration data fetch)
  affects:
    - Dashboard: now shows "What's left tonight?" collapsible budget section
    - transitionAssignment: now opens/closes assignment_time_log rows
    - NewAssignmentForm: now shows factual calibration hints
tech_stack:
  added: []
  patterns:
    - Server-computed budget passed to client component as plain props (no client-side fetch)
    - try/catch guard wrapping non-critical time-log side effects to avoid blocking state transitions
    - IIFE pattern in JSX to inline conditional hint rendering without extracting a component
key_files:
  created:
    - app/(app)/dashboard/time-budget.tsx
  modified:
    - app/(app)/dashboard/page.tsx
    - app/(app)/assignments/[id]/actions.ts
    - app/(app)/assignments/new/form.tsx
    - app/(app)/assignments/new/page.tsx
decisions:
  - Budget computed server-side in dashboard page and passed as props to keep TimeBudget a thin client component
  - time_log open/close wrapped in try/catch so a failed log write never blocks the actual state transition
  - calibrationMap fetched in page.tsx (server) and passed as optional prop to form.tsx (client) to avoid client-side Supabase calls
  - IIFE pattern used in form.tsx JSX to inline the conditional hint without adding a named helper component
metrics:
  duration_minutes: 25
  completed_date: "2026-05-29"
  tasks_completed: 2
  files_changed: 5
---

# Phase 3 Plan 03: Time-Blindness Aids — Dashboard Budget + Calibrated Estimates Summary

TimeBudget collapsible section added to dashboard showing dyslexia-adjusted tonight totals; transitionAssignment extended to open/close assignment_time_log rows on drafting entry/exit; NewAssignmentForm gains factual calibration hint when n>=3 historical samples diverge >20%.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | TimeBudget component + dashboard integration | c06e492 | app/(app)/dashboard/time-budget.tsx, app/(app)/dashboard/page.tsx |
| 2 | Time-log wiring in transitionAssignment + calibration hint in NewAssignmentForm | 4235c5a | app/(app)/assignments/[id]/actions.ts, app/(app)/assignments/new/form.tsx, app/(app)/assignments/new/page.tsx |

## Test Results

Unit tests (lib/time-budget/): 9/9 passing
- compute.test.ts: 5 tests (sum, dyslexia 1.6x, non-dyslexic, null fallback, empty list)
- calibration.test.ts: 4 tests (hint fires, n<3 gate, within-threshold, null estimate)

TypeScript: clean (npx tsc --noEmit — no errors)
Build: clean (npm run build — exit code 0)

## Verification

```
npx vitest run lib/time-budget/
# Test Files  2 passed (2)
# Tests       9 passed (9)
```

```
npx tsc --noEmit
# (no output — clean)
```

```
npm run build
# BUILD_EXIT:0
```

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all wiring is complete. The time_log open/close calls depend on the `assignment_time_log` table created in migration 0009. The calibration hint depends on `assignment_type_estimates` rows populated after students complete 3+ assignments of the same kind.

## Self-Check: PASSED

Files verified:
- FOUND: app/(app)/dashboard/time-budget.tsx
- FOUND: app/(app)/dashboard/page.tsx (modified)
- FOUND: app/(app)/assignments/[id]/actions.ts (modified)
- FOUND: app/(app)/assignments/new/form.tsx (modified)
- FOUND: app/(app)/assignments/new/page.tsx (modified)

Commits verified:
- FOUND: c06e492 — feat(03-03): TimeBudget collapsible component + dashboard integration
- FOUND: 4235c5a — feat(03-03): Time-log wiring in transitionAssignment + calibration hint in NewAssignmentForm

Tests: 9/9 passing
TypeScript: clean
Build: clean
