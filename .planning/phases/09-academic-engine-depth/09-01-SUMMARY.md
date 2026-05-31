---
phase: 09-academic-engine-depth
plan: 01
subsystem: ai
tags: [haiku, task-breakdown, assignment, supabase, edge-function, jsonb, rls]

# Dependency graph
requires:
  - phase: 06-ai-feature-core-slice-5
    provides: safety.ts pattern, Edge Function structure, aiMode gating
  - phase: 02-evidence-review-gap-closure
    provides: assignments table + assignment detail page
provides:
  - assignment_steps table with JSONB steps column and RLS policies (0015 migration)
  - task-breakdown Edge Function (Haiku 4.5) returning raw content
  - lib/task-breakdown/parse.ts robust JSON parser (parseStepsFromContent, isValidStep)
  - TaskBreakdown client component on assignment detail page
  - requestTaskBreakdown + toggleStepDone server actions
affects: [09-02, 09-03, assignment-detail, ai-tools-actions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Raw content return from Edge Function — parsing deferred to server action so parser is testable in vitest (not Deno)"
    - "Prose-wrapped JSON extraction via /\[[\s\S]*\]/ regex (Pitfall 3 guard)"
    - "Upsert on assignment_id unique index — one row per assignment, regenerate replaces"
    - "Optimistic checkbox toggle — local state updated before fire-and-forget server call"

key-files:
  created:
    - supabase/migrations/0015_assignment_steps.sql
    - supabase/functions/task-breakdown/index.ts
    - lib/task-breakdown/types.ts
    - lib/task-breakdown/parse.ts
    - lib/task-breakdown/parse.test.ts
    - app/(app)/assignments/[id]/task-breakdown.tsx
  modified:
    - lib/supabase/types.ts
    - lib/ai/safety.ts
    - supabase/functions/_shared/safety.ts
    - app/(app)/assignments/[id]/ai-tools-actions.ts
    - app/(app)/assignments/[id]/page.tsx

key-decisions:
  - "Edge Function returns raw content string — parsing happens in server action via parseStepsFromContent so the parser is testable in vitest (node) instead of Deno"
  - "task-breakdown gates only on aiMode=red (not yellow) — task breakdown is pure planning, not content generation; yellow = citations only per F16 traffic-light spec"
  - "Upsert on assignment_id unique index — regenerating replaces previous steps cleanly without needing to DELETE first"
  - "Optimistic checkbox update with fire-and-forget toggleStepDone — mirrors EveningPlanning pattern (Pitfall 5); UI stays calm even if server write fails"
  - "task_breakdown added to LogParams.feature union in both lib/ai/safety.ts and supabase/functions/_shared/safety.ts per Deno mirror convention (Phase 6 decision)"

patterns-established:
  - "Robust Claude JSON extraction: regex to find array, then JSON.parse in try/catch, fallback step on any failure"
  - "Step validation: isValidStep checks type, non-empty action, and minutes in [1, MAX_MINUTES_PER_STEP]"

requirements-completed: [F6]

# Metrics
duration: 15min
completed: 2026-05-30
---

# Phase 9 Plan 01: F6 AI Task Breakdown Summary

**Haiku 4.5 task-breakdown Edge Function that splits assignments into up to 12 atomic steps (each ≤15 min), persists them in assignment_steps with JSONB + RLS, and renders interactive checkboxes on the assignment detail page.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-30T17:27:00Z
- **Completed:** 2026-05-30T17:37:00Z
- **Tasks:** 3 (TDD Task 1 + Task 2 + Task 3)
- **Files modified:** 10

## Accomplishments

- Migration 0015 creates `assignment_steps` table with owner-scoped RLS (SELECT/INSERT/UPDATE/DELETE policies) and unique index on `assignment_id` for upsert
- New `task-breakdown` Edge Function (Haiku 4.5, max_tokens=600) mirrors `math-step` pattern: CORS, budget check, fire-and-forget logging, gates only on `aiMode=red`
- Parser library (`lib/task-breakdown/parse.ts`) robustly handles prose-wrapped JSON, clamps minutes, truncates to 12, renumbers, defaults `done: false` — 15 passing unit tests
- `TaskBreakdown` client component renders "Break this down" button when empty, ordered checkbox list when steps present, optimistic tick updates, "Regenerate" link at bottom
- `requestTaskBreakdown` and `toggleStepDone` server actions extend `ai-tools-actions.ts`; breakdown panel added to every assignment detail page

## Task Commits

1. **Task 1: Migration 0015 + types sync + parser library with tests** - `e59a51e` (feat — TDD: 15 tests pass)
2. **Task 2: task-breakdown Edge Function** - `3d050ce` (feat)
3. **Task 3: Server actions + BreakdownPanel component + page wiring** - `2e5b3a6` (feat)

## Files Created/Modified

- `supabase/migrations/0015_assignment_steps.sql` — assignment_steps table, unique index, 4 RLS policies
- `lib/task-breakdown/types.ts` — BreakdownStep interface, MAX_STEPS=12, MAX_MINUTES_PER_STEP=15
- `lib/task-breakdown/parse.ts` — parseStepsFromContent, isValidStep exports
- `lib/task-breakdown/parse.test.ts` — 15 unit tests (parser cases + isValidStep cases)
- `supabase/functions/task-breakdown/index.ts` — Edge Function, Haiku 4.5, red-only gate
- `lib/ai/safety.ts` — added "task_breakdown" to LogParams.feature union
- `supabase/functions/_shared/safety.ts` — added "task_breakdown" to Deno mirror LogParams
- `lib/supabase/types.ts` — added assignment_steps Row/Insert/Update type block
- `app/(app)/assignments/[id]/ai-tools-actions.ts` — requestTaskBreakdown + toggleStepDone
- `app/(app)/assignments/[id]/task-breakdown.tsx` — TaskBreakdown client component
- `app/(app)/assignments/[id]/page.tsx` — initialSteps fetch + TaskBreakdown render

## Decisions Made

- **Raw content return from Edge Function**: Edge Function returns `{ content: string }` (raw Claude text). `parseStepsFromContent` runs in the server action so it's testable in vitest (node) rather than Deno. Mirrors research §"Pitfall 3 — Haiku JSON robustness".
- **Yellow aiMode allowed**: `task-breakdown` only blocks `red`. Yellow = citation-help only per F16 spec, but task breakdown is pure planning (no content written for student) so yellow restriction doesn't apply.
- **Upsert pattern**: `onConflict: "assignment_id"` against the unique index. Regenerating replaces the previous breakdown row cleanly.
- **Optimistic toggleStepDone**: Local `setSteps` called before `void toggleStepDone(...)`. Same pattern as `markIntentionFired` in EveningPlanning.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria verified:
- `npx vitest run lib/task-breakdown/parse.test.ts` → 15 tests pass
- `npm run typecheck` → exit 0
- `npm run tone-audit` → exit 0 (0 violations)
- `npm run test:run` → 160 tests pass (no regression)
- `grep -c '"task_breakdown"' lib/ai/safety.ts` → 1
- `grep -c '"task_breakdown"' supabase/functions/_shared/safety.ts` → 1

## Issues Encountered

Pre-existing tone-audit violations in `lib/reminders/` and `app/(app)/dashboard/reminder-banner.tsx` (from parallel agent Phase 9 work) were present before this plan's changes. These are out of scope — not in any files created or modified by this plan. Deferred to `deferred-items.md`.

## User Setup Required

**Migration must be applied manually:**
1. Go to Supabase dashboard → SQL Editor
2. Run `supabase/migrations/0015_assignment_steps.sql`

Or via CLI: `supabase db push` (if local dev stack configured).

## Known Stubs

None — `requestTaskBreakdown` calls the live Edge Function and persists real data. `initialSteps` is fetched from the real `assignment_steps` table on every page load.

## Next Phase Readiness

- F6 fully delivered: "Break this down" available on all assignment kinds, persists with check-off
- Edge Function follows established safety pattern — ready for production
- Parser library is independent utility usable by future plans

## Self-Check: PASSED

- `supabase/migrations/0015_assignment_steps.sql` — FOUND
- `lib/task-breakdown/parse.ts` — FOUND
- `lib/task-breakdown/parse.test.ts` — FOUND (15 tests pass)
- `supabase/functions/task-breakdown/index.ts` — FOUND
- `app/(app)/assignments/[id]/task-breakdown.tsx` — FOUND
- Commit `e59a51e` — FOUND (Task 1)
- Commit `3d050ce` — FOUND (Task 2)
- Commit `2e5b3a6` — FOUND (Task 3)
- Commit `5c8a1e7` — FOUND (metadata)

---
*Phase: 09-academic-engine-depth*
*Completed: 2026-05-30*
