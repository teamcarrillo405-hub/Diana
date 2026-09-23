---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "06"
subsystem: onboarding
tags: [supabase, postgres, zod, server-actions, onboarding]

requires:
  - phase: 36-01
    provides: Canonical ScreenDesign registry and four-screen onboarding route ownership
provides:
  - Nullable constrained profile fields for learning hurdle and study schedule preference
  - Typed Zod allowlists and a pure exact-key onboarding update serializer
  - Authenticated owner-scoped server action for source onboarding completion
affects:
  - phase-36-onboarding-ui
  - phase-36-linked-schema-proof
  - profile-settings

tech-stack:
  added: []
  patterns:
    - Additive nullable preference columns preserve existing profile rows and optional legacy intake
    - Pure validation constructs the only onboarding completion update accepted by the server action
    - Authenticated profile mutations use the caller user id under existing profiles RLS

key-files:
  created:
    - supabase/migrations/20260715050000_screendesign_onboarding_preferences.sql
    - lib/onboarding/screendesign.ts
    - lib/onboarding/screendesign.test.ts
  modified:
    - lib/supabase/types.ts
    - app/onboarding/actions.ts

key-decisions:
  - "Learning hurdle and study schedule remain dedicated nullable preferences and never overwrite diagnoses, accommodations, interests, school data, accessibility values, or timezone."
  - "Onboarding completion time is serialized only after both source selections pass exact Zod allowlists."
  - "The completion action returns calm discriminated results while existing profiles RLS and an authenticated user_id filter enforce ownership."

patterns-established:
  - "Exact update serializer: valid answers produce only learning_hurdle, study_schedule_preference, and onboarded_at."
  - "Source onboarding errors: field-specific validation stays calm and never produces a completion update."

requirements-completed: [P36-ONBOARDING, P36-OPERATIONS]

coverage:
  - id: D1
    description: "Profiles have additive nullable constrained fields and synchronized Row, Insert, and Update TypeScript contracts."
    requirement: P36-ONBOARDING
    verification:
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: manual_procedural
        ref: "git diff inspection of 20260715050000_screendesign_onboarding_preferences.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "Only the four hurdle ids and three schedule ids serialize, with exact update keys and calm field errors for invalid or missing selections."
    requirement: P36-ONBOARDING
    verification:
      - kind: unit
        ref: "lib/onboarding/screendesign.test.ts#ScreenDesign onboarding answers"
        status: pass
    human_judgment: false
  - id: D3
    description: "The completion action authenticates the caller and performs an owner-scoped update containing only both preferences and onboarded_at."
    requirement: P36-OPERATIONS
    verification:
      - kind: other
        ref: "node scripts/run-verified-commands.mjs -- npx vitest run lib/onboarding/screendesign.test.ts --next npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "Plan 36-26 intentionally owns the linked migration apply, live schema check, and owner-scoped persistence round trip before the onboarding UI executes."

duration: 10min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 06: Durable ScreenDesign Onboarding Preferences Summary

**Additive nullable profile preferences, exact-key Zod serialization, and an authenticated owner-scoped completion action preserve every legacy onboarding value.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-15T14:26:00-07:00
- **Completed:** 2026-07-15T14:36:00-07:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added nullable constrained `learning_hurdle` and `study_schedule_preference` columns without defaults, destructive changes, or new RLS policy surface, then synchronized the profile Row, Insert, and Update types.
- Added typed Zod-backed answer ids and a pure serializer whose successful update contains exactly both preferences and `onboarded_at`; twelve focused tests cover all accepted ids, missing answers, unknown answers, exact keys, and legacy-field preservation.
- Added `completeScreenDesignOnboarding`, which validates before completion, authenticates through the server Supabase client, scopes the profile update to the caller's `user_id`, and returns calm discriminated validation, authentication, persistence, or success results.

## Task Commits

Each task was committed atomically. Task 2 followed RED then GREEN TDD:

1. **Task 1: Add semantically correct nullable onboarding fields** - `ad38dc7` (feat)
2. **Task 2 RED: Define onboarding answer contract** - `fe017ae` (test)
3. **Task 2 GREEN: Validate and serialize onboarding answers** - `7d8a115` (feat)
4. **Task 3: Add authenticated completion action** - `24aa854` (feat)

## Files Created/Modified

- `supabase/migrations/20260715050000_screendesign_onboarding_preferences.sql` - Additive nullable columns, exact check constraints, and semantic column comments.
- `lib/supabase/types.ts` - Manual generated-style Row, Insert, and Update fields matching the migration.
- `lib/onboarding/screendesign.ts` - Zod allowlists, answer types, calm validation result, and exact-key update serializer.
- `lib/onboarding/screendesign.test.ts` - Twelve tests for allowlists, accepted values, exact serialization, and invalid or missing selections.
- `app/onboarding/actions.ts` - Authenticated owner-scoped completion action while preserving the existing optional legacy onboarding action.

## Decisions Made

- Kept both new answers in dedicated nullable columns. No answer is coerced into diagnosis, accommodation, interest, timezone, school, or accessibility data.
- Used a pure serializer as the completion boundary. `onboarded_at` cannot be produced until both exact answer ids validate.
- Kept redirect ownership with the client flow after an `ok: true` result, matching the existing onboarding navigation pattern while the server action revalidates the authenticated layout.
- Deferred all linked Supabase mutation and runtime proof to Plan 36-26 as required by the phase dependency order.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `npm run tone-audit` reports seven pre-existing violations in the Plan 36-28 source-capture fixture and helper. None is in a Plan 36-06 file, and the focused unit and TypeScript gates pass. This out-of-scope phase issue was not modified here.

## Known Stubs

None. The migration, generated-style types, validator, tests, and authenticated action are complete. The intentionally deferred linked apply is a separate Plan 36-26 deliverable, not a stub in this plan.

## Verification

- `node scripts/run-verified-commands.mjs -- npx vitest run lib/onboarding/screendesign.test.ts --next npm run typecheck` - twelve tests passed and TypeScript passed after the final action commit.
- Migration inspection - both fields are nullable, constrained to the approved ids, have no default, and leave existing profile rows and RLS policies untouched.
- Exact update contract - tests prove the serializer emits only `learning_hurdle`, `study_schedule_preference`, and `onboarded_at`, with no legacy profile key.
- Git inspection - all four task commits exist in order, contain no tracked-file deletions, and the unrelated `.planning/config.json` newline remains unstaged.
- Remote apply was not run. Plan 36-26 owns linked application, live information-schema verification, and the owner-scoped persistence round trip.

## User Setup Required

None for this plan. No new package, secret, or external configuration was introduced.

## Next Phase Readiness

- Plan 36-26 must apply `20260715050000_screendesign_onboarding_preferences.sql` to the linked preview project, verify both live columns and constraints, and prove an owner-scoped persistence round trip.
- Plan 36-07 must not execute against preview until that Plan 36-26 proof passes. Once it does, the four source screens can call `completeScreenDesignOnboarding` and navigate using the existing success behavior.

## Self-Check: PASSED

- All three created files, both modified files, and this summary exist.
- Schema `ad38dc7`, RED `fe017ae`, GREEN `7d8a115`, and action `24aa854` exist in Git history in the required order.
- The focused twelve-test suite and TypeScript gate pass after the final implementation commit.
- The unrelated `.planning/config.json` newline remains unstaged and unmodified by this plan.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
