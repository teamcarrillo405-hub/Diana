---
phase: 09-academic-engine-depth
plan: "06"
subsystem: calendar
tags: [calendar, workload, scheduler, F9, pure-functions, tdd]
dependency_graph:
  requires: [09-01, 09-02, 09-03, 09-04]
  provides: [F9-calendar-week-view]
  affects: [nav, lib/scoring/next-five-minutes]
tech_stack:
  added: [date-fns]
  patterns: [server-component-searchparam, pure-functions, tdd-red-green]
key_files:
  created:
    - lib/calendar/week.ts
    - lib/calendar/week.test.ts
  modified:
    - app/(app)/calendar/page.tsx
    - lib/scoring/next-five-minutes.ts
    - components/nav.tsx
decisions:
  - "Calendar groups by UTC date to match Postgres due_at storage convention"
  - "Workload tiers use calm colors: emerald-100 (light), amber-100 (moderate), amber-300 (heavy), violet-200 (overloaded) — never red"
  - "adjustForUser exported from next-five-minutes.ts for reuse across calendar and scorer"
  - "Empty day columns show no copy — calm invariant, no encouraging or scolding language"
  - "date-fns v4.1.0 already in package.json — no new dependency"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-30"
  tasks_completed: 3
  files_changed: 5
---

# Phase 09 Plan 06: F9 Calendar Week View Summary

7-day calendar grid at `/calendar` showing assignments by due date with per-day workload bars using calm color tiers (emerald/amber/violet — no red anywhere).

## What Was Built

### lib/calendar/week.ts (new)
Pure functions for the calendar feature:
- `buildWeek(anchor)` — returns 7 Date objects starting Monday of the week containing `anchor`
- `groupByDay(assignments, week)` — buckets assignments by UTC date key into a `Map<string, Assignment[]>`
- `workloadTier(totalMinutes)` — classifies 0-90 as "light", 91-150 "moderate", 151-240 "heavy", 241+ "overloaded"
- `workloadBarClass(tier)` — maps tier to Tailwind class (emerald-100 / amber-100 / amber-300 / violet-200)
- `WorkloadTier` type exported

### lib/calendar/week.test.ts (new)
12 unit tests covering all functions and boundary values. All pass green.

### lib/scoring/next-five-minutes.ts (modified)
`adjustForUser` function changed from module-private to `export function adjustForUser` — enabling reuse in the calendar page's per-day workload math.

### app/(app)/calendar/page.tsx (modified)
Replaced ComingSoon stub with a real Server Component:
- Reads `?week=YYYY-MM-DD` searchParam, defaults to current week
- Queries `assignments` table filtered to the 7-day window for `owner_id = user.id`
- Reads `profiles` for `diagnoses` and `extra_time_pct` to apply accommodations math
- Computes per-day `effective_minutes` using `adjustForUser` (consistent with scorer + nightly budget)
- Renders 7-column grid with day header + workload bar + assignment list
- Prev / This week / Next nav are `<Link>` components — no client state, fully SSR

### components/nav.tsx (modified)
Added `Calendar` icon from lucide-react and `/calendar` entry in the ITEMS array between `/timer` and `/wins`.

## Design Decisions

1. **UTC grouping** — `groupByDay` uses `date-fns isSameDay` with UTC-parsed dates. Timezone note documented in both `week.ts` and `calendar/page.tsx` comments: "A midnight-UTC due date appears on its UTC calendar day, which may differ from the student's local day — documented design decision."

2. **Tier colors (calm invariant)** — All four tiers avoid red. Overloaded uses `bg-violet-200` (calming) not `bg-red-*`. Tier label for overloaded is "Heavy day" (not "Warning" or "Too much").

3. **Empty day** — Renders `&nbsp;` in the workload bar, nothing in the assignment list. No "Nothing due!" or encouraging copy.

4. **`owner_id` not `user_id`** — The `assignments` table uses `owner_id` column per the DB schema. Plan template used `user_id` — adjusted to match actual schema (deviation Rule 1 auto-fix).

5. **`createClient` not `createSupabaseServerClient`** — The actual export from `lib/supabase/server.ts` is `createClient`. Adjusted import accordingly (deviation Rule 1 auto-fix).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `user_id` → `owner_id` in assignments query**
- **Found during:** Task 2, typecheck
- **Issue:** Plan template used `.eq("user_id", user.id)` but `assignments` table uses `owner_id` column
- **Fix:** Changed to `.eq("owner_id", user.id)`
- **Files modified:** `app/(app)/calendar/page.tsx`
- **Commit:** 1f7ef1b

**2. [Rule 1 - Bug] Fixed `createSupabaseServerClient` → `createClient` import**
- **Found during:** Task 2, reading server.ts
- **Issue:** Plan template used `createSupabaseServerClient` but `lib/supabase/server.ts` exports `createClient`
- **Fix:** Changed import to use `createClient`
- **Files modified:** `app/(app)/calendar/page.tsx`
- **Commit:** 1f7ef1b

**3. [Rule 1 - Bug] Fixed test date timezone — Monday detection**
- **Found during:** Task 1, test run
- **Issue:** `new Date("2026-05-11T00:00:00Z")` is Sunday evening in local timezone (US Central); `date-fns startOfWeek` uses local time, giving the wrong week
- **Fix:** Changed test anchor from `T00:00:00Z` to `T12:00:00Z` for safe midday UTC value
- **Files modified:** `lib/calendar/week.test.ts`
- **Commit:** cc5b788

**4. [Rule 1 - Bug] Fixed test factory `kind: "task"` → `kind: "other"`**
- **Found during:** Task 1, typecheck
- **Issue:** `AssignmentKind` enum doesn't include `"task"`, only `"essay" | "lab" | "problem_set" | "presentation" | "test_prep" | "reading" | "other"`
- **Fix:** Changed makeAssignment factory to use `kind: "other"`
- **Files modified:** `lib/calendar/week.test.ts`
- **Commit:** cc5b788

## Known Stubs

None — calendar page queries real data from the `assignments` and `profiles` tables. Workload bars render real per-day totals.

## Verification Results

- `npx vitest run lib/calendar/week.test.ts` — 12/12 tests pass
- `npm run test:run` — 188/188 tests pass (20 test files), no regressions
- `npm run typecheck` — 0 errors in new/modified files (pre-existing canvas-sync errors unrelated)
- `npm run tone-audit` — 0 blocking violations

## Self-Check: PASSED
