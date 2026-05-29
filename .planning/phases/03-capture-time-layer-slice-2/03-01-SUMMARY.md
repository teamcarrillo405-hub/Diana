---
phase: 03-capture-time-layer-slice-2
plan: "01"
subsystem: inbox-and-time-budget
tags: [schema, pure-logic, idb-keyval, time-budget, calibration, unit-tests]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/0009_inbox_and_time_layer.sql
    - lib/inbox/types.ts
    - lib/inbox/queue.ts
    - lib/time-budget/compute.ts
    - lib/time-budget/calibration.ts
  affects:
    - Phase 3 plans 02, 03, 04 (all depend on these libs + migration)
tech_stack:
  added:
    - idb-keyval (IndexedDB key-value store for offline queue)
    - jsdom (vitest jsdom environment for browser-API tests)
  patterns:
    - idb-keyval Map-mock pattern for unit testing IndexedDB-dependent code
    - Running-mean atomic upsert via Postgres function to prevent race conditions
    - KIND_DEFAULT_MINUTES fallback map for null estimated_minutes
key_files:
  created:
    - supabase/migrations/0009_inbox_and_time_layer.sql
    - lib/inbox/types.ts
    - lib/inbox/queue.ts
    - lib/inbox/queue.test.ts
    - lib/time-budget/compute.ts
    - lib/time-budget/compute.test.ts
    - lib/time-budget/calibration.ts
    - lib/time-budget/calibration.test.ts
  modified:
    - package.json (added idb-keyval dependency + jsdom devDependency)
    - package-lock.json
decisions:
  - Dyslexia multiplier 1.6x applied only when reading_load >= 3 (not for all tasks)
  - Calibration hint threshold 20% of historical mean (not absolute difference)
  - n >= 3 gate before surfacing calibration hint to prevent premature guidance
  - KEY_PREFIX "inbox-queue:" used in idb-keyval to namespace queue items from other IDB data
  - jsdom installed as devDependency (required by @vitest-environment jsdom annotation in queue.test.ts)
metrics:
  duration_minutes: 30
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_changed: 8
---

# Phase 3 Plan 01: Schema Foundation + Pure-Logic Libraries Summary

Migration 0009 creates four RLS-protected tables plus an atomic Postgres upsert function; inbox queue uses idb-keyval for offline capture; time-budget compute applies dyslexia 1.6x reading multiplier; calibration gating uses n>=3 with 20% threshold.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Migration 0009 + inbox type contracts | e3dac4e | supabase/migrations/0009_inbox_and_time_layer.sql, lib/inbox/types.ts |
| 2 | Offline inbox queue | 9064a9f | lib/inbox/queue.ts, lib/inbox/queue.test.ts, package.json |
| 3 | Time-budget compute + calibration libs | c5de55b | lib/time-budget/compute.ts, lib/time-budget/compute.test.ts, lib/time-budget/calibration.ts, lib/time-budget/calibration.test.ts |

## Test Results

All 13 unit tests passing:
- `lib/inbox/queue.test.ts`: 4 tests (enqueue, retrieve, remove, no-op)
- `lib/time-budget/compute.test.ts`: 5 tests (sum, dyslexia multiplier, non-dyslexic, null fallback, empty list)
- `lib/time-budget/calibration.test.ts`: 4 tests (hint fires, n<3 gate, within-threshold, null estimate)

TypeScript check: clean (`npx tsc --noEmit` no errors)

## Verification

```
npx vitest run lib/inbox/ lib/time-budget/
# Test Files  3 passed (3)
# Tests      13 passed (13)
```

```
npx tsc --noEmit
# (no output — clean)
```

```
ls supabase/migrations/0009_inbox_and_time_layer.sql
# supabase/migrations/0009_inbox_and_time_layer.sql
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed jsdom for vitest jsdom environment**
- **Found during:** Task 2
- **Issue:** queue.test.ts uses `// @vitest-environment jsdom` annotation; vitest requires jsdom package to be installed separately but it was missing from devDependencies
- **Fix:** `npm install -D jsdom`
- **Files modified:** package.json, package-lock.json
- **Commit:** 9064a9f

## Decisions Made

- **Dyslexia 1.6x multiplier gating:** Applied in computeNightBudget only when `reading_load >= 3`, consistent with existing scorer in lib/scoring/next-five-minutes.ts
- **Calibration n >= 3 gate:** Surface hint only after 3 completed time logs; prevents premature misleading guidance on first use
- **20% threshold for calibration hint:** Ignores minor (<= 20%) estimate variances; only surfaces hint when student is substantially underestimating
- **idb-keyval KEY_PREFIX:** `inbox-queue:` prefix namespaces queue items from any other IDB usage in the app
- **upsert_type_estimate as Postgres function:** Atomic running-mean update avoids client-side read-modify-write race condition (Pitfall 7 from research)

## Known Stubs

None — all functions are fully wired. The Supabase functions (`recordElapsedTime`, `openTimeLog`) depend on real Supabase tables created in migration 0009; they will work when migration is applied.

## Self-Check: PASSED

Files verified:
- FOUND: supabase/migrations/0009_inbox_and_time_layer.sql
- FOUND: lib/inbox/types.ts
- FOUND: lib/inbox/queue.ts
- FOUND: lib/inbox/queue.test.ts
- FOUND: lib/time-budget/compute.ts
- FOUND: lib/time-budget/compute.test.ts
- FOUND: lib/time-budget/calibration.ts
- FOUND: lib/time-budget/calibration.test.ts

Commits verified:
- FOUND: e3dac4e — feat(03-01): Migration 0009 + inbox type contracts
- FOUND: 9064a9f — feat(03-01): Offline inbox queue with idb-keyval + jsdom dev dep
- FOUND: c5de55b — feat(03-01): Time-budget compute + calibration libs with 9 unit tests

Tests: 13/13 passing
TypeScript: clean
