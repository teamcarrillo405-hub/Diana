---
phase: 8
plan: "08-03"
subsystem: dashboard
tags: [F14, evening-planning, intentions, client-time-gate, optimistic-dismiss]
dependency_graph:
  requires: [08-02]
  provides: [F14-complete, evening-planning-surface]
  affects: [dashboard, assignment_intentions]
tech_stack:
  added: []
  patterns: [client-time-gate, optimistic-dismiss, server-fetch-client-render]
key_files:
  created:
    - app/(app)/dashboard/evening-planning.tsx
    - app/(app)/dashboard/evening-planning.test.tsx
  modified:
    - app/(app)/dashboard/actions.ts
    - app/(app)/dashboard/page.tsx
    - vitest.config.ts
decisions:
  - "Client-side time gate (new Date().getHours()) because Next.js server components run in UTC; gating on server would show/hide based on UTC not student local time (Pitfall 4)"
  - "Optimistic dismiss: local state updated before server call so UI stays calm even if markIntentionFired fails (Pitfall 5)"
  - "17:00–20:00 hardcoded in v1; profiles.timezone exists for future per-user TZ-aware gate"
  - "vitest include extended to app/**/*.test.tsx — test file co-located with component per plan spec"
  - "findByText replaced with getByText after act(vi.runAllTimers()) — fake timers prevent async findBy* polling from resolving"
metrics:
  duration_minutes: 5
  completed_date: "2026-05-29"
  tasks_completed: 2
  files_changed: 5
---

# Phase 8 Plan 03: Evening Planning Surface for Event-Based Intentions (F14) Summary

**One-liner:** F14 complete — client-time-gated evening section (17–20h) surfaces unfired event intentions with optimistic "Mark done" dismiss persisted to `assignment_intentions.fired_at`.

## What Was Built

The F14 implementation-intention loop is now end-to-end:

1. **Capture** (existing) — `IntentionPrompt` component lets students write event-based cues ("after dinner I'll start chemistry homework"), stored with `cue_type='event'` and `fired_at IS NULL`.
2. **Surface** (new) — Between 17:00 and 20:00 local time, `EveningPlanning` renders a list of unfired event intentions on the dashboard.
3. **Mark fired** (new) — "Mark done" button optimistically dismisses locally and calls `markIntentionFired` server action to set `fired_at = now()` on the row.

## Key Decisions

### Client-Side Time Gate (Pitfall 4)

`new Date().getHours()` runs inside `useEffect` on the client. This is essential because Next.js server components execute in UTC — if we gated on the server, a student in UTC-7 at 6 PM (local) would not see the section because the server sees 1 AM UTC the next day. The pattern is: **server component fetches data, client component decides whether to render**.

### Optimistic Dismiss Pattern (Pitfall 5)

When the student taps "Mark done":
1. `setDismissed` adds the intention ID to local Set — UI updates immediately
2. `markIntentionFired` is called in the background (awaited but errors are caught silently)
3. If the server write fails, the item is invisible for the rest of this session but reappears on the next page load — acceptable degradation, never causes user-visible errors

### 17:00–20:00 Hardcode

The window is hardcoded to 17:00–20:00 local time for v1. The `profiles` table already has a `timezone` column (per research file) which could enable per-user TZ-aware gating in a future plan. For v1, local browser time is the right default (students are in their local TZ, not UTC).

### F14 Is Now Complete

The full loop: capture (IntentionPrompt) → store (assignment_intentions) → surface at ~6 PM (EveningPlanning) → mark fired (markIntentionFired server action). No placeholders remain.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended vitest include pattern to cover app/ directory**
- **Found during:** Task 2 — `npx vitest run app/(app)/dashboard/evening-planning.test.tsx` returned "No test files found"
- **Issue:** `vitest.config.ts` include pattern only covered `lib/**` and `components/**`; test file is co-located in `app/(app)/dashboard/` per plan spec
- **Fix:** Added `"app/**/*.test.ts"` and `"app/**/*.test.tsx"` to the `include` array
- **Files modified:** `vitest.config.ts`
- **Commit:** 91c76d3

**2. [Rule 1 - Bug] Replaced async findByText with synchronous getByText in EVENING-02**
- **Found during:** Task 2 test run — EVENING-02 timed out at 5000ms
- **Issue:** `findByText` uses polling with real `setTimeout` internally; `vi.useFakeTimers()` intercepts all timers including Testing Library's internal polling, causing permanent deadlock
- **Fix:** Changed `await screen.findByText(...)` to `screen.getByText(...)` (synchronous query) after `act(() => { vi.runAllTimers(); })` flushes the component's useEffect
- **Files modified:** `app/(app)/dashboard/evening-planning.test.tsx`
- **Commit:** 91c76d3

## Known Stubs

None. `getEventIntentions` fetches from real `assignment_intentions` table. `markIntentionFired` writes to real DB. No mock data flows to the rendered component outside of tests.

## Test Results

- EVENING-01: renders nothing at 13:00 local time — PASS
- EVENING-02: renders the intention list at 18:00 local time — PASS
- EVENING-03: renders nothing when intentions array is empty even at 18:00 — PASS
- Full suite: 99 tests pass (96 pre-existing + 3 new)
- `npm run typecheck` — exit 0
- `npm run tone-audit` — exit 0

## Self-Check: PASSED
