---
phase: 02-evidence-review-gap-closure
plan: "03"
subsystem: ui
tags: [next-font, lexend, dyslexia, onboarding, timebar, checklist, supabase, migrations]

requires:
  - phase: 02-evidence-review-gap-closure
    provides: "02-01 set up Vitest, migrations 0006/0007, signal-recency scorer; 02-02 extended scorer with dyslexia multiplier"

provides:
  - "Lexend font loaded via next/font/google; --font-lexend CSS variable on <html>"
  - "Onboarding step 4: class-count picker (1-8), profiles.class_count_hint column"
  - "TimeBar formula: (due-now)/(due-created), clamped, with 1h fallback to 7-day window"
  - "Submit checklist add/remove: addChecklistItem + deleteChecklistItem server actions"

affects:
  - "02-04 (wave 4) — TimeBar pattern and checklist server-action pattern are reference for wave 4 micro-task button"
  - "Phase 4 — TTS, font controls, Lexend variable already loaded"

tech-stack:
  added: ["next/font/google (Lexend)"]
  patterns:
    - "Font-as-CSS-variable: load via next/font, apply on <html>, toggle via body class"
    - "Checklist server-action pattern: addChecklistItem + deleteChecklistItem + revalidatePath + router.refresh()"
    - "Type-safe created_at lookup: find() from original Supabase row array by id, avoids scorer type coupling"

key-files:
  created:
    - "supabase/migrations/0008_class_count_hint.sql"
  modified:
    - "app/layout.tsx"
    - "app/globals.css"
    - "app/onboarding/form.tsx"
    - "app/onboarding/actions.ts"
    - "lib/supabase/types.ts"
    - "lib/profile.ts"
    - "app/(app)/dashboard/time-bar.tsx"
    - "app/(app)/dashboard/page.tsx"
    - "app/(app)/assignments/[id]/actions.ts"
    - "app/(app)/assignments/[id]/submit/checklist.tsx"
    - "app/(app)/assignments/[id]/submit/page.tsx"

key-decisions:
  - "lexend.variable only (not lexend.className) — Lexend is opt-in via .dyslexia-font, not global default"
  - "class_count_hint nullable with no default — null = user skipped during onboarding"
  - "TimeBar createdAt lookup by assignment id from original Supabase array — avoids modifying scorer's Assignment type"
  - "TimeBar fallback: totalWindow < 1h falls to 7-day window (handles last-minute task creation)"
  - "Custom checklist items inserted as required=false — never blocks submission"
  - "deleteChecklistItem allows removing required items — student owns their own checklist"

patterns-established:
  - "Font-as-CSS-variable: variable on <html>, consumed by opt-in body class, literal name as secondary fallback"
  - "Server-action add/remove: zod schema, auth check, position append, revalidatePath, router.refresh() in client"

requirements-completed: [GAP-01, GAP-02, GAP-04, GAP-05]

duration: 30min
completed: 2026-05-28
---

# Phase 2 Plan 03: Low-risk UI gap closure Summary

**Lexend loaded via next/font, 4-step onboarding with class-count, TimeBar spec formula with createdAt, and checklist add/remove server actions**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-05-28T16:00:00Z
- **Completed:** 2026-05-28T16:07:00Z
- **Tasks:** 4 of 4
- **Files modified:** 11

## Accomplishments
- GAP-01: Lexend font is now actually downloaded by the browser via next/font/google; CSS variable --font-lexend is always present on `<html>` and consumed by .dyslexia-font opt-in rule
- GAP-02: Onboarding has a 4th fieldset with a 1-8 chip picker; class_count_hint persisted to profiles via migration 0008
- GAP-05: TimeBar formula is now (dueAt - now) / (dueAt - createdAt) with a 1-hour floor fallback; no red added (F20 constraint honored)
- GAP-04: Students can add custom checklist items and remove any item; two new zod-validated server actions persist changes to submission_checklist

## Task Commits

1. **Task 1: GAP-01 Lexend via next/font/google** - `fcf5d87` (feat)
2. **Task 2: GAP-02 class-count step + migration 0008** - `ea58d0a` (feat)
3. **Task 3: GAP-05 TimeBar spec formula** - `ae6d9fc` (feat)
4. **Task 4: GAP-04 checklist add/remove** - `8e66abb` (feat)

## Files Created/Modified
- `app/layout.tsx` - Added Lexend import, variable config, className on html element
- `app/globals.css` - Prepended var(--font-lexend) to .dyslexia-font font stack
- `supabase/migrations/0008_class_count_hint.sql` - New: adds class_count_hint smallint CHECK (1-8) to profiles
- `lib/supabase/types.ts` - Added class_count_hint to profiles Row/Insert/Update
- `lib/profile.ts` - Added class_count_hint to ProfilePrefs Pick and select string
- `app/onboarding/form.tsx` - Added CLASS_COUNTS constant, classCount state, 4th fieldset, updated payloads
- `app/onboarding/actions.ts` - Added class_count_hint to zod Input schema and patch object
- `app/(app)/dashboard/time-bar.tsx` - Rewrote with spec formula, optional createdAt prop, fallbacks
- `app/(app)/dashboard/page.tsx` - Added created_at to SELECT, pass createdAt to TimeBar via id lookup
- `app/(app)/assignments/[id]/actions.ts` - Appended addChecklistItem and deleteChecklistItem
- `app/(app)/assignments/[id]/submit/checklist.tsx` - Add/remove handlers, inline form, Remove button per row
- `app/(app)/assignments/[id]/submit/page.tsx` - Added descriptive copy about add/remove

## Decisions Made
- `lexend.variable` only (not `lexend.className`) — Lexend is opt-in via .dyslexia-font, not the global body font
- `class_count_hint` nullable with no default — null means the student skipped the step during onboarding
- TimeBar `createdAt` looked up from original `assignments` array by `.find(a => a.id === top.id)` — avoids modifying the scorer's Assignment type or the Supabase query cast
- TimeBar fallback to 7-day window when `totalWindow < 60 * 60 * 1000` — prevents meaningless empty bar for tasks created right before their due time
- Custom checklist items inserted as `required=false` — they never block the "mark submitted" button
- `deleteChecklistItem` allows removing required items — the student owns their own checklist data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - migration 0008 is a local SQL file. Applies on next `supabase db push` or CI migration run.

## Notes for Wave 4 (02-04)

- TimeBar now accepts an optional `createdAt` prop; wave 4 can extend it further (e.g., optional `status` prop for live updates)
- The checklist add-item pattern (`startTransition → server action → router.refresh()`) is the reference implementation for wave 4's micro-task creation button
- `addChecklistItem` and `deleteChecklistItem` are already exported from actions.ts — wave 4 can call them directly or extend the pattern

## Next Phase Readiness

- All 4 low-risk UI gaps closed; wave 3 is complete
- 02-04 (wave 4) can now proceed: it targets breadcrumb interrupt-recovery, micro-task creation button on TimeBar, and test coverage
- 6 existing Vitest tests still pass; no regressions

## Self-Check: PASSED

All files created/modified exist on disk. All 4 task commits verified in git log (fcf5d87, ea58d0a, ae6d9fc, 8e66abb). npx tsc --noEmit exits 0. npm run build exits 0. npx vitest run: 6/6 tests pass.

---
*Phase: 02-evidence-review-gap-closure*
*Completed: 2026-05-28*
