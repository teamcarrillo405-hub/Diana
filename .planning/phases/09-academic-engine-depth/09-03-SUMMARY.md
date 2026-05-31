---
phase: 09-academic-engine-depth
plan: "03"
subsystem: wins-feed
tags: [wins, task_signals, f8, nav, calm-ui, tdd]
dependency_graph:
  requires: [task_signals table, assignments table, classes table]
  provides: [/wins route, WinsList component, group-by-day helpers, Wins nav item]
  affects: [components/nav.tsx, app/(app)/wins/]
tech_stack:
  added: []
  patterns: [Server Component + Client Component split, useEffect local time pattern, TDD red-green]
key_files:
  created:
    - lib/wins/group-by-day.ts
    - lib/wins/group-by-day.test.ts
    - app/(app)/wins/wins-list.tsx
  modified:
    - app/(app)/wins/page.tsx
    - components/nav.tsx
decisions:
  - "D-01: keyed on task_signals.kind='completed', NOT assignments.status='done'"
  - "D-02: no new table — task_signals is the source of truth"
  - "D-03: neutral counts only — 'N things done.' never streak language"
  - "D-04: text-ok (green) for counts, no red anywhere"
  - "D-05: empty state uses exact calm copy from plan"
  - "D-06: Sparkles icon from lucide-react"
  - "D-07: Wins inserted between Timer and Classes in nav ITEMS (7 total)"
  - "WinsList is 'use client' with useEffect time display to avoid UTC hydration mismatch"
  - "as unknown as cast used for task_signals rows because Supabase generated type has id:number not id:string"
metrics:
  duration_seconds: 473
  completed_date: "2026-05-31"
  tasks_completed: 2
  files_changed: 5
---

# Phase 09 Plan 03: F8 Wins Feed Summary

**One-liner:** Shame-free wins feed at /wins backed by task_signals.kind='completed' with neutral daily/weekly counts, grouped-by-day view, and a Wins nav item — 15 unit tests for the pure helper.

## What Was Built

### Task 1: Wins grouping helper + unit tests (TDD)

Created `lib/wins/group-by-day.ts` — pure functions only, no React, no DB:

- `groupCompletionsByDay(items, now)` — buckets completions into DayGroup[] by local calendar day, sorted most-recent day first; items within each day sorted by occurred_at descending
- `countToday(items, now)` — count of items on same local calendar day as `now`
- `countThisWeek(items, now)` — rolling 7-day window count (inclusive boundary at exactly 7 days)
- `isoDay(d)` — produces zero-padded YYYY-MM-DD using local time (avoids UTC date shift)
- `dayLabel(iso, now)` — returns "Today", "Yesterday", or formatted weekday string via `toLocaleDateString`
- Exports: `groupCompletionsByDay`, `countToday`, `countThisWeek`, `Completion` type, `DayGroup` type

`lib/wins/group-by-day.test.ts` — 15 passing tests covering:
- empty array
- single item today (day_label "Today")
- day_iso YYYY-MM-DD format validation
- 2 today + 1 yesterday → 2 groups in correct order
- most-recent day first sorting
- items within day sorted descending
- 3-day-old item gets formatted label (not Today/Yesterday)
- countToday: empty → 0, mixed days → correct count, none today → 0
- countThisWeek: empty → 0, 3 recent + 1 old → 3, at-boundary included, past-boundary excluded

### Task 2: /wins page + WinsList + nav item

**`app/(app)/wins/page.tsx`** — Server Component (replaced ComingSoon stub):
- Queries `task_signals` with `.eq("kind", "completed")` and `.eq("owner_id", user.id)`
- Joins `assignments(title, kind, classes(name, color))`
- Calls `groupCompletionsByDay`, `countToday`, `countThisWeek`
- Renders neutral count cards (`text-ok`, never red)
- Empty state: "Nothing here yet. When you submit something, it lands here."
- No streak language, no banned words

**`app/(app)/wins/wins-list.tsx`** — Client Component (`"use client"`):
- `WinsList` — renders DayGroup[] list with day headers and assignment cards
- `WinsItemTime` — internal helper using `useState("")` + `useEffect` for local time display (mirrors evening-planning.tsx pattern; avoids hydration mismatch where server would render UTC time)
- Color dot for class color; kind label mapping; truncated title

**`components/nav.tsx`** — Nav updated:
- Added `Sparkles` to lucide-react imports
- ITEMS now has 7 entries: Focus, Assignments, Study, Timer, **Wins**, Classes, Settings
- Wins inserted between Timer and Classes per D-07

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase generated type has id:number for task_signals**
- **Found during:** Task 2 typecheck
- **Issue:** Supabase generated types give `task_signals.id` as `number`, but our `Completion` type uses `string`. Direct `as Array<...>` cast caused TS2352 "neither type sufficiently overlaps".
- **Fix:** Changed to `as unknown as Array<{...}>` double cast; added eslint-disable comment
- **Files modified:** `app/(app)/wins/page.tsx`
- **Commit:** ce8f69f

**2. Pre-existing tone-audit violations (out of scope)**
- `lib/reminders/reminder-rules.ts` and related files contain "past due" which triggers tone-audit
- These were introduced by parallel agent 09-02 and are not caused by this plan's changes
- Logged to deferred items; not fixed here

**3. Pre-existing test failures (out of scope)**
- `lib/reminders/reminder-rules.test.ts` has 3 failing tests from parallel agent 09-02 changes
- Wins tests (15) all pass; not related to this plan's scope

## Verification

- `npx vitest run lib/wins/group-by-day.test.ts` — 15 passed, 0 failed
- `npm run typecheck` — clean (exits 0)
- `npm run tone-audit` — no violations in wins/* or nav.tsx (pre-existing violations in reminders files are out of scope)
- New files created: `lib/wins/group-by-day.ts`, `lib/wins/group-by-day.test.ts`, `app/(app)/wins/wins-list.tsx`
- `app/(app)/wins/page.tsx` — no longer contains `ComingSoon`

## Known Stubs

None. Data is wired from live `task_signals` table. Empty state is intentional design, not a stub.

## Commits

- `a602721` — test(09-03): add failing tests for group-by-day wins helper (TDD RED)
- `fac5a9a` — feat(09-03): wins grouping helper — groupCompletionsByDay, countToday, countThisWeek (TDD GREEN)
- `ce8f69f` — feat(09-03): /wins page + WinsList client component + Wins nav item

## Self-Check: PASSED

- lib/wins/group-by-day.ts: FOUND
- lib/wins/group-by-day.test.ts: FOUND
- app/(app)/wins/page.tsx: FOUND (no ComingSoon)
- app/(app)/wins/wins-list.tsx: FOUND (has "use client")
- components/nav.tsx: FOUND (has Sparkles + /wins entry)
