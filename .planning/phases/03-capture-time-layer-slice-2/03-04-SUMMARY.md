---
phase: 03-capture-time-layer-slice-2
plan: "04"
subsystem: ui
tags: [implementation-intention, adhd-intervention, server-action, client-component, url-param]

dependency_graph:
  requires:
    - phase: 03-01
      provides: assignment_intentions table (migration 0009)
    - phase: 03-02
      provides: assignment detail page + form patterns
    - phase: 03-03
      provides: breadcrumb + searchParams pattern on detail page
  provides:
    - app/(app)/assignments/[id]/intention-prompt.tsx (IntentionPrompt client component)
    - app/(app)/assignments/[id]/actions.ts (saveIntention server action)
    - F14 complete: implementation-intention prompt wired end-to-end
  affects:
    - Phase 4+ (IntentionPrompt renders post-creation; future phases may read intentions for reminders)

tech-stack:
  added: []
  patterns:
    - URL param ?intent=new triggers one-time inline prompt, cleaned immediately by useEffect
    - useEffect(router.replace(pathname)) pattern (Pitfall 6 guard) to prevent refresh re-showing prompt
    - useTransition for non-blocking server action calls with inline status feedback

key-files:
  created:
    - app/(app)/assignments/[id]/intention-prompt.tsx
  modified:
    - app/(app)/assignments/[id]/actions.ts
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/assignments/new/form.tsx

key-decisions:
  - "DB column is cue_text (not cue_value) and no action_text column in assignment_intentions — plan spec diverged from actual migration 0009 schema"
  - "cueType made optional in IntentionInput zod schema (defaults to 'other' in server action) so IntentionPrompt call site stays minimal"
  - "IntentionPrompt rendered after all existing sections — non-blocking, below the fold on first load"

patterns-established:
  - "?intent=new URL param pattern: server page reads searchParams, passes to client component; client component cleans URL on mount via router.replace(pathname)"
  - "saveIntention does NOT call revalidatePath — no server-side cache invalidation needed for one-time client state change"

requirements-completed: [F14]

duration: 7min
completed: "2026-05-28"
---

# Phase 3 Plan 04: Implementation-Intention Prompt (F14) Summary

**IntentionPrompt client component + saveIntention server action wire the evidence-backed ADHD intervention inline on assignment creation, with Pitfall 6 URL-cleanup guard preventing prompt reappearance on refresh.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-28T07:55:12Z
- **Completed:** 2026-05-28T08:02:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- `saveIntention` server action appended to existing `actions.ts` — inserts into `assignment_intentions` with `cue_text` + `cue_type` columns
- `IntentionPrompt` client component with immediate URL cleanup, skip button (no DB write), and "Got it. You've got a plan." saved state
- Assignment detail page extended to accept `searchParams` and conditionally render `IntentionPrompt` when `intent === "new"`
- New assignment form redirects to `?intent=new` after successful creation — F14 complete

## Task Commits

1. **Task 1: saveIntention action + IntentionPrompt component** - `1c2fcf7` (feat)
2. **Task 2: Wire intent=new into detail page + form redirect** - `b2897cc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/(app)/assignments/[id]/intention-prompt.tsx` - Client component: URL cleanup on mount, textarea, Save/Skip buttons, saved state
- `app/(app)/assignments/[id]/actions.ts` - Added `saveIntention` server action at bottom of file
- `app/(app)/assignments/[id]/page.tsx` - Added `searchParams` prop + `IntentionPrompt` import + conditional render
- `app/(app)/assignments/new/form.tsx` - Changed `router.push` to include `?intent=new`

## Decisions Made

- `cueType` made optional in zod schema (defaults to `"other"` in action body) — plan spec used `.default("other")` which changes TypeScript inference; making it `optional()` is cleaner
- `saveIntention` does not call `revalidatePath` — the intention data is never rendered server-side, so no cache bust is needed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DB column name mismatch: cue_text vs cue_value**
- **Found during:** Task 1 (saveIntention action)
- **Issue:** Plan spec used `cue_value` as both the Zod field name and the DB column name. Migration 0009 creates `cue_text` (not `cue_value`). TypeScript caught this via generated types.
- **Fix:** Insert uses `cue_text: parsed.data.cueValue` — Zod field name preserved as `cueValue` (camelCase), DB column corrected to `cue_text`
- **Files modified:** `app/(app)/assignments/[id]/actions.ts`
- **Verification:** `npx tsc --noEmit` clean
- **Committed in:** 1c2fcf7 (Task 1 commit)

**2. [Rule 1 - Bug] action_text column does not exist in assignment_intentions**
- **Found during:** Task 1 (saveIntention action)
- **Issue:** Plan spec included `action_text` field in insert. Migration 0009 does not create this column (table has: id, owner_id, assignment_id, cue_type, cue_text, scheduled_for, fired_at, created_at).
- **Fix:** Removed `actionText` from `IntentionInput` schema and from the insert statement
- **Files modified:** `app/(app)/assignments/[id]/actions.ts`
- **Verification:** `npx tsc --noEmit` clean, `npm run build` succeeded
- **Committed in:** 1c2fcf7 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — plan spec diverged from actual migration 0009 schema)
**Impact on plan:** Both fixes necessary for correctness. The IntentionPrompt feature behavior is unchanged — only the DB insert columns were corrected to match the actual schema.

## Issues Encountered

None beyond the schema mismatches documented above.

## User Setup Required

None — no external service configuration required. The `assignment_intentions` table was created by migration 0009 in plan 03-01.

## Next Phase Readiness

- F14 complete: implementation-intention prompt fires once after each new assignment creation
- `assignment_intentions` rows are available for future phases (e.g., reminder notifications, recap summaries)
- No blockers

## Self-Check: PASSED

Files verified:
- FOUND: app/(app)/assignments/[id]/intention-prompt.tsx
- FOUND: app/(app)/assignments/[id]/actions.ts (saveIntention export)
- FOUND: app/(app)/assignments/[id]/page.tsx (searchParams + IntentionPrompt)
- FOUND: app/(app)/assignments/new/form.tsx (intent=new redirect)
- FOUND: .planning/phases/03-capture-time-layer-slice-2/03-04-SUMMARY.md

Commits verified:
- FOUND: 1c2fcf7 — feat(03-04): saveIntention action + IntentionPrompt component
- FOUND: b2897cc — feat(03-04): wire intent=new into detail page + form redirect

Build: clean (npm run build succeeded, npx tsc --noEmit clean)

---
*Phase: 03-capture-time-layer-slice-2*
*Completed: 2026-05-28*
