---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "27"
subsystem: testing
tags: [screendesign, vitest, supabase, fixtures, rls, qa]

requires:
  - phase: 36-01
    provides: Canonical typed registry for all 47 ScreenDesign states
provides:
  - Fifty-eight deterministic scenarios covering 47 canonical defaults and 11 guarded branches
  - Owner-scoped real-table seed and reset adapter with deterministic synthetic record identities
  - Anonymous QA session selection for static allowlisted ScreenDesign owners and scenarios
affects:
  - phase-36-visual-qa
  - phase-36-action-evidence
  - phase-36-release-gallery

tech-stack:
  added: []
  patterns:
    - Canonical screen fixtures declare records and guarded capability state before browser execution
    - Synthetic record ids derive deterministically from owner, scenario, and stable alias
    - Supabase cleanup scopes every delete to one static synthetic auth owner

key-files:
  created:
    - lib/qa/screendesign-fixtures.ts
    - lib/qa/screendesign-fixtures.test.ts
  modified:
    - lib/qa/grayson-demo.ts
    - app/api/qa/anonymous-session/route.ts

key-decisions:
  - "Every canonical screen has exactly one default fixture, while 11 additional scenarios make AI, billing, LMS, sharing, membership, onboarding, and reduced-motion branches explicit."
  - "Fixture factories map to real Supabase tables and deterministic synthetic ids; empty and unavailable capabilities create no fabricated success records."
  - "The QA route accepts only catalog scenario ids and three static owner aliases backed by static QA account definitions; it never accepts an auth user id from the request."
  - "Seed responses expose stable record aliases and browser storage-state inputs, never auth ids, emails, passwords, service-role material, or production records."

patterns-established:
  - "Fixture selection: use screen-id:variant, with screen-id:default present exactly once for every registry entry."
  - "Owner isolation: seed resets only the selected synthetic owner and every inserted row carries owner_id or profiles.user_id."

requirements-completed: [P36-QA, P36-OPERATIONS, P36-FIDELITY]

coverage:
  - id: D1
    description: "Typed deterministic defaults cover all 47 canonical screens and explicit guarded branches cover AI, billing, LMS, sharing, groups, no-score practice, onboarding, empty data, and reduced motion."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "lib/qa/screendesign-fixtures.test.ts#SCREEN_DESIGN_FIXTURE_SCENARIOS"
        status: pass
    human_judgment: false
  - id: D2
    description: "Selected scenarios materialize only their declared factories into real owner-scoped Supabase table rows with idempotent reset and cross-owner isolation."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/qa/screendesign-fixtures.test.ts#ScreenDesign owner-scoped seed contract"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D3
    description: "The anonymous QA route selects, seeds, and resets allowlisted synthetic ScreenDesign sessions without serializing elevated credentials."
    requirement: P36-FIDELITY
    verification:
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: true
    rationale: "A live route invocation requires the local QA_CREATE_USER gate and Supabase service environment; structural and serialization behavior is automated, while end-to-end auth bootstrap remains part of the later visual QA environment."

duration: 24 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 27: Deterministic ScreenDesign Fixture Scenarios Summary

**A 58-scenario catalog now drives all 47 canonical ScreenDesign states through deterministic synthetic copy, explicit guarded capabilities, and owner-scoped real Supabase records instead of static component mocks.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-15T10:47:00-07:00
- **Completed:** 2026-07-15T11:11:00-07:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Declared exactly one default scenario for each of the 47 registry entries, plus 11 named branches for AI red/yellow, billing configured/unavailable, LMS disconnected/error/connected, active/expired/revoked sharing, group member/nonmember, onboarding valid/invalid, and reduced motion.
- Added a deterministic factory-to-table adapter for profiles, classes, assignments and support rows, inbox, notes, flashcards, artifacts, mastery, AP, integrations, portfolios, privacy evidence, wellness, groups, AI activity, authorship, and share tokens.
- Added idempotent owner reset, deterministic synthetic ids, live-schema constraint normalization, cross-owner isolation tests, and sanitized seed results containing only aliases and storage-state inputs.
- Extended the disabled-in-production anonymous QA route to choose a catalog scenario, bootstrap one of three static synthetic accounts, seed or reset it, and keep service-role access server-only.

## Task Commits

Task 1 followed RED then GREEN TDD:

1. **Task 1 RED: Define failing fixture coverage contract** - `dbebd40` (test)
2. **Task 1 GREEN: Add deterministic screen fixture catalog** - `027fc6c` (feat)
3. **Task 2: Seed owner-scoped screen scenarios** - `6410738` (feat)

## Files Created/Modified

- `lib/qa/screendesign-fixtures.ts` - Typed 47-screen default catalog, 11 guarded scenarios, record-factory union, stable copy, route inputs, actions, and persisted-result expectations.
- `lib/qa/screendesign-fixtures.test.ts` - Registry coverage, guard coverage, type/runtime contract, schema constraint, idempotence, sanitization, and cross-owner isolation tests.
- `lib/qa/grayson-demo.ts` - Real Supabase seed-plan builder, deterministic synthetic row identities, cleanup targets, testable store boundary, and seed/reset functions.
- `app/api/qa/anonymous-session/route.ts` - Static synthetic scenario account selection plus server-only scenario seed/reset responses.

## Decisions Made

- Kept fixture definitions declarative and screen-owned. Each browser test can select one scenario without receiving a static rendered component or a cross-screen mega-seed.
- Used stable aliases in the fixture and response contracts. Actual synthetic UUIDs remain inside the server seed adapter and are derived from owner, scenario, and alias.
- Represented unavailable billing, disconnected LMS, nonmembership, invalid onboarding, expired/revoked tokens, and no-score practice by the absence or guarded state of real records rather than fabricated success.
- Kept the legacy `variant=grayson` QA path intact while adding `scenario`, static `owner=secondary`, and `operation=reset` behavior for Phase 36 evidence runs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `.planning/PROJECT.md` is absent from this checkout. The complete `STATE.md`, `AGENTS.md`, Phase 36 context/research/coverage, canonical registry, and prior summaries supplied the project contract.
- The repository's optional ESLint invocation cannot start because ESLint 10 does not find an `eslint.config.*` file. The plan-authoritative Vitest and TypeScript gates both pass; no lint configuration was changed in this plan.

## Known Stubs

None. Honest empty and unavailable branches are intentional fixture states, not placeholder implementations, and every declared record factory maps to a real owner-scoped table.

## Verification

- `node scripts/run-verified-commands.mjs -- npx vitest run lib/qa/screendesign-fixtures.test.ts --next npm run typecheck` - 11 tests passed and TypeScript passed.
- Fixture catalog - 58 unique scenarios, exactly 47 defaults, and every required guarded state declared.
- Owner contract - every prepared row carries the selected owner, repeated seeds are idempotent, resetting one owner preserves the second owner's rows, and sanitized results contain no auth ids or credentials.
- Live-schema contract - assignment sources, task signals, LMS providers, sleep quality, study-room status, and required foreign-key aliases match current database constraints.
- `git diff --check` - passed for all plan-owned implementation changes.

## User Setup Required

None - the existing `QA_CREATE_USER=true` local-only gate and Supabase service environment remain the established QA bootstrap requirements.

## Next Phase Readiness

- Visual and action evidence plans can select `screen-id:variant`, seed only its declared real records, and use the returned route and storage-state inputs.
- Public sharing, billing, LMS, onboarding, and group tests have explicit honest branches instead of ad hoc conditional setup.

## Self-Check: PASSED

- Both created fixture files, both modified runtime files, and this summary exist.
- RED `dbebd40`, GREEN `027fc6c`, and seed/route `6410738` exist in Git history.
- Coverage classification contains automated proof for the catalog and owner-scoped seed adapter, plus an explicit later live-environment judgment for auth bootstrap.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
