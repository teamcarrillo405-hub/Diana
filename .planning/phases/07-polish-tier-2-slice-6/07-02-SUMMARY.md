---
phase: 07-polish-tier-2-slice-6
plan: "02"
subsystem: database, ui
tags: [supabase, migration, assignment-templates, reading-load, nextjs, vitest, lucide-react]

requires:
  - phase: 06-ai-feature-core-slice-5
    provides: Supabase client, server actions, types.ts shape, dashboard energy-picker URL-param pattern

provides:
  - assignment_templates table with 3 seed rows (DBQ, CER, 5-paragraph essay)
  - assignment_checklists table for per-assignment custom checklist storage
  - lib/templates/templates.ts pure helpers (parseTemplateRow, templateToDescription, templateToChecklistItems, getTemplates, getTemplateById)
  - /assignments/new template picker that pre-fills kind + description + seeds checklist on submit
  - Dashboard ?view=reading-load toggle that re-sorts by reading_load desc with book-icon badges

affects:
  - 07-03-PLAN (shares dashboard; should not conflict — reading-load toggle is additive)
  - Any future admin/teacher panel that manages assignment_templates

tech-stack:
  added: []
  patterns:
    - "URL-param toggle pattern (same as ?energy=): ?view=reading-load preserved across navigation"
    - "Template picker as first form field — BEFORE title — so student picks scaffold then adds assignment-specific title"
    - "Best-effort checklist seeding: assignment_checklists insert never blocks assignment creation"
    - "parseTemplateRow: defense-in-depth jsonb coercion (non-array becomes [])"

key-files:
  created:
    - supabase/migrations/0013_templates_and_reading_load.sql
    - lib/templates/templates.ts
    - lib/templates/templates.test.ts
    - app/(app)/dashboard/reading-load-toggle.tsx
  modified:
    - lib/supabase/types.ts
    - app/(app)/assignments/new/page.tsx
    - app/(app)/assignments/new/form.tsx
    - app/(app)/assignments/new/actions.ts
    - app/(app)/inbox/[id]/actions.ts
    - app/(app)/dashboard/page.tsx

key-decisions:
  - "assignment_checklists table added in migration 0013 — was missing from prior migrations despite being referenced by Phase 3/4 plans"
  - "getTemplates and getTemplateById added to templates.ts — helpers operate on pre-fetched arrays to avoid extra round trips"
  - "reading-load view shows up to 5 items (not 3) — student sorting by load wants to see the heavy items"
  - "inbox/[id]/actions.ts updated with templateId: null — callers of createAssignment must provide the new optional field"

requirements-completed:
  - T2-01
  - T2-02

duration: 20min
completed: "2026-05-29"
---

# Phase 7 Plan 02: Templates and Reading-Load View Summary

**assignment_templates table (3 seeded templates) + /assignments/new picker pre-filling checklist, plus dashboard ?view=reading-load toggle with book-icon badges using lucide-react BookOpen**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-29T17:09:58Z
- **Completed:** 2026-05-29T17:29:00Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Migration 0013 creates `assignment_templates` (3 seed rows: DBQ, CER, 5-para essay) and `assignment_checklists` tables with RLS
- `lib/templates/templates.ts` exports 5 functions + 3 interfaces; 9 Vitest tests all pass
- `/assignments/new` template picker (rendered before Title field) pre-fills `kind` and `description`; on submit seeds `assignment_checklists` row
- Dashboard gains `?view=reading-load` toggle that re-sorts "Also on deck" by `reading_load` desc with `ReadingLoadBadge` book icons; preserves `?energy=` param

## Task Commits

1. **Task 1: Migration 0013 + template helpers + types sync** - `9a35a0f` (feat)
2. **Task 2: Template picker in /assignments/new + server-action seeding** - `ba57101` (feat)
3. **Task 3: Dashboard reading-load view (T2-02)** - `adf31d4` (feat)

## Files Created/Modified

- `supabase/migrations/0013_templates_and_reading_load.sql` - Creates assignment_templates + assignment_checklists tables, seeds 3 template rows
- `lib/supabase/types.ts` - Added assignment_templates and assignment_checklists type entries
- `lib/templates/templates.ts` - Pure helper module: parseTemplateRow, templateToDescription, templateToChecklistItems, getTemplates, getTemplateById
- `lib/templates/templates.test.ts` - 9 Vitest tests covering all helpers
- `app/(app)/assignments/new/page.tsx` - Loads templates from Supabase, passes to form
- `app/(app)/assignments/new/form.tsx` - Template picker as first field; pre-fills kind + description on selection
- `app/(app)/assignments/new/actions.ts` - Input schema extended with templateId; seeds assignment_checklists on submit
- `app/(app)/inbox/[id]/actions.ts` - Added templateId: null to createAssignment call (backward compat fix)
- `app/(app)/dashboard/reading-load-toggle.tsx` - ReadingLoadToggle (URL-param toggle) + ReadingLoadBadge (book icons)
- `app/(app)/dashboard/page.tsx` - Reads ?view= param; conditional sort + badge render; ReadingLoadToggle placed below EnergyPicker

## Decisions Made

- `assignment_checklists` created in migration 0013: it was described as "existing" in the plan interfaces but was absent from all prior migrations. Added it here as a blocking fix (Rule 3).
- `getTemplates` and `getTemplateById` added even though plan code didn't show them — the success criteria explicitly required them. Added as simple array wrappers (no extra DB calls).
- `inbox/[id]/actions.ts` required `templateId: null` to satisfy TypeScript after the Input schema was extended — Rule 1 auto-fix applied.
- Reading-load view shows 5 items (vs 3 for normal view) per plan spec: students want to see the full heavy-reading set.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] assignment_checklists table missing from all prior migrations**
- **Found during:** Task 1 (migration authoring)
- **Issue:** Plan interface section described `assignment_checklists` as "existing from migration 0008 area" but grep of all 12 migrations showed no such table
- **Fix:** Created `assignment_checklists` table as part of migration 0013 with appropriate RLS
- **Files modified:** supabase/migrations/0013_templates_and_reading_load.sql, lib/supabase/types.ts
- **Verification:** TypeScript compiles clean; server action insert references the new table
- **Committed in:** 9a35a0f (Task 1 commit)

**2. [Rule 1 - Bug] inbox/[id]/actions.ts broke TypeScript after templateId added to Input schema**
- **Found during:** Task 2 (typecheck after updating actions.ts)
- **Issue:** `createAssignment` call in inbox actions was missing the new required `templateId` field
- **Fix:** Added `templateId: null` to the `createAssignment` call — preserves existing behavior, no template seeding for inbox conversions
- **Files modified:** app/(app)/inbox/[id]/actions.ts
- **Verification:** `npx tsc --noEmit` exits 0
- **Committed in:** ba57101 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking infrastructure, 1 TypeScript breakage)
**Impact on plan:** Both fixes necessary for correctness. No scope creep — assignment_checklists was already part of the plan's design, just not shipped in prior migrations.

## Issues Encountered

- `npm run tone-audit` script does not exist in package.json — verified manually via grep that no banned words ("deadline", "past due", "overdue") appear in any new files.

## Known Stubs

None — all template data is seeded from migration 0013; form wires to real DB queries; reading-load sort operates on real `reading_load` column from assignments table.

## User Setup Required

The `assignment_templates` and `assignment_checklists` tables need to be applied via Supabase migration. Run:

```
supabase db push
```

or apply `supabase/migrations/0013_templates_and_reading_load.sql` via the Supabase dashboard SQL editor.

## Next Phase Readiness

- T2-01 and T2-02 requirements delivered
- Phase 7 plan 07-03 may proceed — reading-load toggle and template picker are fully independent of timer/body-double features
- Future: admin panel for managing `assignment_templates` (Phase 8+); per-user template customization deferred

---
*Phase: 07-polish-tier-2-slice-6*
*Completed: 2026-05-29*
