---
phase: 02-evidence-review-gap-closure
plan: "01"
subsystem: database, testing
tags: [vitest, typescript, supabase, postgres, migrations, scoring]

# Dependency graph
requires:
  - phase: 01-slice-1-foundations
    provides: assignments table, task_signals table, next-five-minutes scorer, types.ts baseline
provides:
  - migration 0006: pivot_note + parent_assignment_id columns on assignments
  - migration 0007: compound partial index on task_signals for scorer recency
  - vitest test runner installed and configured (v3.x)
  - lib/scoring/next-five-minutes.test.ts scaffold with 2 passing smoke tests
  - types.ts updated with pivot_note, parent_assignment_id, and FK relationship
affects: [02-02, 02-03, 02-04]

# Tech tracking
tech-stack:
  added: [vitest@^3.0.0, @vitejs/plugin-react@^4.3.0]
  patterns: [forward-only SQL migrations with create index if not exists, vitest with node environment and @ alias]

key-files:
  created:
    - supabase/migrations/0006_pivot_and_parent_assignment.sql
    - supabase/migrations/0007_task_signals_recency_index.sql
    - vitest.config.ts
    - lib/scoring/next-five-minutes.test.ts
  modified:
    - package.json
    - lib/supabase/types.ts

key-decisions:
  - "Vitest pinned to ^3.0.0 (current major); @vitejs/plugin-react added now so wave 4 component tests don't require reinstall"
  - "vitest environment: node — wave 4 component tests can override per-file with @vitest-environment jsdom"
  - "globals: false in vitest config — explicit imports (describe/it/expect) preferred over globals"
  - "pivot_note and parent_assignment_id are nullable with no default — matches GAP-06/GAP-07 spec"
  - "on delete set null for parent_assignment_id FK — deleting a parent must NOT cascade-delete micro-task children"

patterns-established:
  - "SQL migrations: forward-only, no DOWN scripts, create index if not exists for idempotency"
  - "Types.ts manual sync: Row fields in alphabetical order; Insert/Update use optional variants"
  - "Test files: lib/**/*.test.ts glob matched by vitest.config.ts automatically"

requirements-completed: [GAP-03, GAP-06, GAP-07, GAP-08]

# Metrics
duration: 15min
completed: 2026-05-28
---

# Phase 2 Plan 01: Schema Foundations + Vitest Setup Summary

**Two forward-only Postgres migrations (0006/0007) plus Vitest v3 wired to a passing scorer smoke test, with types.ts reflecting the new pivot_note and parent_assignment_id columns**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-28T22:37:00Z
- **Completed:** 2026-05-28T22:52:13Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Migration 0006 adds `assignments.pivot_note` (text, nullable) and `assignments.parent_assignment_id` (uuid, nullable FK with on delete set null) plus a partial index for child-query performance
- Migration 0007 adds compound partial index `task_signals_owner_assignment_time_idx` on (owner_id, assignment_id, occurred_at desc) filtered to kind in ('started','completed') — required by GAP-08 scorer recency query
- Vitest v3 installed and configured with @ alias, node environment, and React plugin; `npx vitest run` exits 0 with 2 smoke tests passing
- types.ts assignments block updated: Row/Insert/Update all include pivot_note and parent_assignment_id; Relationships includes `assignments_parent_assignment_id_fkey`
- `npx tsc --noEmit` exits 0 — no type drift

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0006 — pivot_note + parent_assignment_id** - `43f6bab` (feat)
2. **Task 2: Migration 0007 — task_signals recency index** - `1a20b07` (feat)
3. **Task 3: Vitest install, config, scaffold test, types.ts update** - `5d36cd9` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `supabase/migrations/0006_pivot_and_parent_assignment.sql` - Adds pivot_note + parent_assignment_id columns + partial index
- `supabase/migrations/0007_task_signals_recency_index.sql` - Compound partial index for scorer recency
- `vitest.config.ts` - Vitest v3 config with react plugin, @ alias, node environment
- `lib/scoring/next-five-minutes.test.ts` - Wave 1 scaffold: 2 smoke tests (empty array, single scored assignment)
- `package.json` - Added vitest + @vitejs/plugin-react devDeps; added "test" and "test:run" scripts
- `lib/supabase/types.ts` - assignments Row/Insert/Update updated with pivot_note and parent_assignment_id; FK relationship added

## Decisions Made

- Vitest pinned to ^3.0.0 (latest major); @vitejs/plugin-react added proactively so wave 4 component tests don't need a separate install pass
- `globals: false` in vitest config — wave 2+ tests will use explicit `import { describe, it, expect } from "vitest"` for clarity
- `environment: "node"` is default; component tests can use `// @vitest-environment jsdom` override per-file
- Migration numbers 0006 and 0007 consumed; next available migration is 0008 (used by 02-03 for class_count_hint)

## Notes for Wave 2 (02-02)

- Scorer signature can be extended freely — add `signals` parameter to `rankAssignments`; existing two smoke tests only assert array shape, not score values, so they will remain green after the extension
- vitest.config.ts already supports both `node` (current) and `jsdom` (per-file override) environments
- `lib/scoring/next-five-minutes.test.ts` is the correct place for the four GAP-08 unit cases

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Migrations will be applied on next `supabase db push` to the remote project.

## Next Phase Readiness

- Wave 2 (02-02): scorer extension and 4 GAP-08 unit tests — ready, all infrastructure in place
- Wave 3 (02-03): UI fixes (Lexend font, onboarding step, TimeBar, checklist) — migration 0008 available
- Wave 4 (02-04): new UI logic (micro-task, pivot, breadcrumb) — new columns available in types.ts

---
*Phase: 02-evidence-review-gap-closure*
*Completed: 2026-05-28*
