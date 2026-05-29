---
phase: 02-evidence-review-gap-closure
plan: "04"
subsystem: ui
tags: [state-machine, server-actions, react, supabase, next-router, client-components, interrupt-recovery]

# Dependency graph
requires:
  - phase: 02-evidence-review-gap-closure
    provides: "02-01 added pivot_note + parent_assignment_id columns; 02-03 introduced TimeBar createdAt prop and checklist server-action pattern"

provides:
  - "createMicroTask server action: inserts 5-min child assignment linked via parent_assignment_id"
  - "PastDueMicroTaskButton client component: amber callout button on dashboard for todo/drafting past-due assignments"
  - "TimeBar: status-aware past-due messaging (todo/drafting vs checking/exporting), no 'past due' string"
  - "pivotAssignment server action: drafting→todo transition with pivot_note persistence and status race-guard"
  - "PivotForm client component: inline 'Pause and revisit' toggle form with 'What changed?' textarea"
  - "Breadcrumb: auto-focus via ?focus=breadcrumb URL param + 'You left off here' callout when initial note exists"
  - "StatusButtons: todo→drafting redirects to /assignments/[id]?focus=breadcrumb"
  - "pivotSummary helper in state-machine/assignment.ts"

affects:
  - "Phase 3 — parent_assignment_id chain now available for reading-heavy parent → 5-min micro-task flow (F5/F14)"
  - "Phase 4 — pivot_note and last_thought both available for TTS/AI context injection"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client button embedded in server component: extract to separate *-button.tsx client component, import into server component"
    - "Focus-on-navigate pattern: router.push with ?focus=param, useSearchParams + useEffect in target component"
    - "Race-guard server action: .eq('status', expectedStatus) guard on update to prevent stale-state writes"

key-files:
  created:
    - "app/(app)/dashboard/past-due-button.tsx"
    - "app/(app)/assignments/[id]/pivot-form.tsx"
  modified:
    - "app/(app)/assignments/[id]/actions.ts"
    - "app/(app)/dashboard/time-bar.tsx"
    - "app/(app)/dashboard/page.tsx"
    - "app/(app)/assignments/[id]/page.tsx"
    - "app/(app)/assignments/[id]/breadcrumb.tsx"
    - "app/(app)/assignments/[id]/status-buttons.tsx"
    - "lib/state-machine/assignment.ts"

key-decisions:
  - "PastDueMicroTaskButton extracted to its own client component — TimeBar stays a server component"
  - "inProgress = todo || drafting (not checking/exporting) — students near done don't need a micro-task escape hatch"
  - "pivotAssignment uses .eq('status','drafting') race-guard — prevents double-pivot in concurrent tabs"
  - "PivotForm copy: 'Pause and revisit' / 'Pause this' (not 'Pivot') — per Pitfall 6, avoid failure framing"
  - "Breadcrumb useSearchParams auto-focus: scrollIntoView + focus on mount when focus=breadcrumb param present"
  - "pivotSummary rendering deferred — helper exported, rendering in detail page is a Phase 3 follow-up"
  - "State machine transitions unchanged — drafting→todo was already allowed; no new TRANSITIONS entry needed"

patterns-established:
  - "Client button in server component: extract to *-button.tsx with 'use client', import into server component"
  - "Focus-on-navigate: router.push('?focus=X') + useSearchParams useEffect in destination component"
  - "Race-guard update: .eq('status', guard) on Supabase update to prevent stale concurrent writes"

requirements-completed: [GAP-06, GAP-07]

# Metrics
duration: 25min
completed: 2026-05-29
---

# Phase 2 Plan 04: Past-due micro-task + pivot + breadcrumb focus Summary

**createMicroTask and pivotAssignment server actions wire up GAP-06/GAP-07: past-due todo/drafting assignments show a 5-min task creation button, drafting assignments expose a 'Pause and revisit' inline form, and todo→drafting now auto-focuses the Breadcrumb textarea via ?focus=breadcrumb redirect**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-29T04:45:00Z
- **Completed:** 2026-05-29T05:06:50Z
- **Tasks:** 3 (2 automated + 1 human-verify checkpoint — approved)
- **Files modified:** 9 (7 modified, 2 new)

## Accomplishments

- GAP-06: Past-due assignments in `todo`/`drafting` show "Still possible — start with 5 minutes?" callout + "Create a 5-min task" button; `checking`/`exporting` show softer "Still open — want to take a next step?" without the button; no "past due" string anywhere in rendered UI
- GAP-07 (pivot): `pivotAssignment` server action writes `pivot_note` and transitions `drafting→todo` with a `.eq("status","drafting")` race-guard; `PivotForm` renders as "Pause and revisit" toggle then expands to "What changed?" inline form
- GAP-07 (focus): `StatusButtons` redirects to `?focus=breadcrumb` after `todo→drafting`; `Breadcrumb` auto-scrolls and focuses the textarea via `useSearchParams` + `useEffect`; "You left off here:" callout shows prior `last_thought` on next visit
- `pivotSummary` helper added to state machine for future use (Phase 3 detail page)

## Task Commits

1. **Task 1: GAP-06 createMicroTask + past-due button + TimeBar status props** - `c2b1e83` (feat)
2. **Task 2: GAP-07 pivotAssignment + PivotForm + focus-breadcrumb redirect** - `303b167` (feat)
3. **Task 3: Human checkpoint** - approved by user

## Files Created/Modified

- `app/(app)/dashboard/past-due-button.tsx` - New: client component with "Create a 5-min task" button; calls createMicroTask, router.refresh on success
- `app/(app)/assignments/[id]/pivot-form.tsx` - New: client component with "Pause and revisit" toggle + "What changed?" textarea; calls pivotAssignment
- `app/(app)/assignments/[id]/actions.ts` - Appended createMicroTask (GAP-06) and pivotAssignment (GAP-07) server actions
- `app/(app)/dashboard/time-bar.tsx` - Added status + assignmentId props; past-due branch is now status-aware; embeds PastDueMicroTaskButton
- `app/(app)/dashboard/page.tsx` - Passes status and assignmentId to TimeBar
- `app/(app)/assignments/[id]/page.tsx` - Imports and renders PivotForm when status=drafting
- `app/(app)/assignments/[id]/breadcrumb.tsx` - Added useSearchParams + useEffect auto-focus; added "You left off here" callout; added ref on textarea
- `app/(app)/assignments/[id]/status-buttons.tsx` - todo→drafting now redirects to ?focus=breadcrumb instead of router.refresh
- `lib/state-machine/assignment.ts` - Exported pivotSummary helper

## Decisions Made

- TimeBar stays a server component — the micro-task button is extracted to `PastDueMicroTaskButton` client component and imported; this avoids marking the entire TimeBar as a client boundary
- `inProgress` is `todo || drafting` only — students in `checking`/`exporting` are close to done and don't need the micro-task escape hatch
- `pivotAssignment` uses `.eq("status","drafting")` race-guard — prevents a race where two tabs both try to pivot at the same time
- PivotForm copy uses "Pause and revisit" / "Pause this" (not "Pivot") per research Pitfall 6: landing in `todo` should feel like a pause, not a failure
- `pivotSummary` helper exported but not rendered on detail page yet — deferred to Phase 3 to keep this plan's scope contained

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Checkpoint Approval

Task 3 was a blocking `human-verify` checkpoint. Approved by user after visual verification of:
- Scenario A (past-due micro-task button for todo/drafting)
- Scenario B (pivot transition, focus redirect, "You left off here" callout)
- Scenario C (checking state shows softer message, no button)
- DevTools check: `document.body.innerText.toLowerCase().includes('past due')` returned `false`

## User Setup Required

None — no new migrations in this plan. The `pivot_note` and `parent_assignment_id` columns were added in 02-01 (migration 0006).

## Notes for Phase 3 Hand-off

- `parent_assignment_id` chain is now populated by `createMicroTask`. Phase 3 can query children via `parent_assignment_id = originalId` to show micro-task progress alongside the parent.
- `reading_load` + `parent_assignment_id` together enable the "reading-heavy parent → 5-min reading micro-task" flow planned for F5/F14.
- `pivot_note` is persisted; `pivotSummary` helper is ready to surface it on the detail page whenever Phase 3 wires the render.
- Breadcrumb `?focus=breadcrumb` pattern can be reused for any future "deep link to a specific section" need.

## Next Phase Readiness

- Phase 2 is fully complete: all 8 GAPs closed across plans 02-01 through 02-04
- Run `/gsd:verify-work` to confirm full phase verification before starting Phase 3
- 6/6 Vitest tests still pass; `npx tsc --noEmit` exits 0; `npm run build` exits 0

## Self-Check: PASSED

Files verified on disk:
- `app/(app)/dashboard/past-due-button.tsx` — exists
- `app/(app)/assignments/[id]/pivot-form.tsx` — exists
- All 7 modified files confirmed updated

Commits verified: `c2b1e83` and `303b167` in git log.
`npx tsc --noEmit` exits 0. `npm run build` exits 0. `npx vitest run`: 6/6 tests pass.

---
*Phase: 02-evidence-review-gap-closure*
*Completed: 2026-05-29*
