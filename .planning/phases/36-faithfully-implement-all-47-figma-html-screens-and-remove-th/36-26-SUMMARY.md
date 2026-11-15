---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "26"
subsystem: database-verification
tags: [supabase, onboarding, rls, playwright, migration, screendesign]

requires:
  - phase: 36-03
    provides: Deterministic 393x852 Playwright harness
  - phase: 36-06
    provides: Additive onboarding preference migration and authenticated completion action
  - phase: 36-27
    provides: Two-owner deterministic QA seed and owner-scoped reset
provides:
  - Three-way linked Supabase identity proof across the CLI, local app, and Vercel preview
  - Applied live onboarding migration with exact nullable-column and check-constraint verification
  - Real completion-action persistence, legacy-value preservation, invalid-input, and two-owner RLS proof
affects:
  - phase-36-onboarding-ui
  - phase-36-release-validation
  - preview-database-operations

tech-stack:
  added: []
  patterns:
    - Fail-closed linked database mutation after CLI, local, and preview project-ref equality
    - Ephemeral in-memory CLI database credentials with read-only pg_catalog schema inspection
    - Development-only authenticated QA seam that delegates ownership to the real server action

key-files:
  created:
    - scripts/verify-phase36-onboarding-schema.mjs
    - tests/verify-phase36-onboarding-schema.test.ts
    - tests/screendesign-onboarding-persistence.spec.ts
    - app/api/qa/onboarding-persistence/route.ts
  modified:
    - playwright.config.ts

key-decisions:
  - "A linked schema write is permitted only after the Supabase CLI, local NEXT_PUBLIC_SUPABASE_URL, and Vercel Preview NEXT_PUBLIC_SUPABASE_URL resolve to the same project ref."
  - "The verifier uses Supabase CLI-issued ephemeral credentials only in memory and queries pg_catalog through the local psql client because Docker is unavailable on this workstation."
  - "The persistence QA route is development-only, accepts no owner id, and invokes completeScreenDesignOnboarding with the authenticated caller's cookies so the normal action and RLS boundaries remain authoritative."

patterns-established:
  - "Linked migration gate: prove one intended pending migration, apply it, recheck history, and assert the live catalog before continuing."
  - "Owner-isolation smoke: valid owner write and reload, invalid input no-op, second-owner select/update denial, primary-owner invariance, then owner-scoped cleanup."

requirements-completed: [P36-ONBOARDING, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The preview application's exact linked Supabase project contains migration 20260715050000 plus both nullable text columns with exact allowed-value constraints."
    requirement: P36-ONBOARDING
    verification:
      - kind: integration
        ref: "node scripts/verify-phase36-onboarding-schema.mjs --linked"
        status: pass
      - kind: unit
        ref: "tests/verify-phase36-onboarding-schema.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "The real completion action persists and reloads both answers, preserves legacy profile fields byte-for-byte, rejects invalid ids, and prevents a second owner from reading or mutating the row."
    requirement: P36-OPERATIONS
    verification:
      - kind: e2e
        ref: "tests/screendesign-onboarding-persistence.spec.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The linked verifier and owner-isolation smoke are repeatable, remove their temporary artifacts, clean only their two synthetic owners, and keep the full project gates green."
    requirement: P36-QA
    verification:
      - kind: integration
        ref: "npm run test:run, npm run typecheck, npm run lint, npm run tone-audit, npm run build"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 26: Linked Onboarding Schema and Persistence Proof Summary

**The exact Supabase preview project now contains the additive ScreenDesign onboarding schema, and the real authenticated completion path has passed valid persistence, legacy-field preservation, invalid-input, and cross-owner RLS checks.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-07-15T21:55:00-07:00
- **Completed:** 2026-07-15T22:25:00-07:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Proved that the Supabase CLI link, local application configuration, and Vercel Preview environment all target project `oitipayrriupcitgmzju` before allowing a database write.
- Confirmed the linked migration history was aligned through `20260715040000`, dry-ran exactly one pending migration, applied only `20260715050000_screendesign_onboarding_preferences.sql`, and reverified local and remote history.
- Added a reusable verifier that proves both live profile fields are nullable text columns with the exact four-value and three-value check constraints while deleting all temporary environment and schema artifacts.
- Exercised `completeScreenDesignOnboarding` through the real authenticated action boundary with two synthetic owners and proved reload, unchanged legacy values, validation no-op behavior, select/update isolation, primary-owner invariance, and owner-scoped cleanup.
- Passed the focused live proofs, full unit suite, type, lint, calm-language, production build, runtime, and diff gates.

## Task Commits

1. **Task 1 RED: Define linked onboarding schema proof** - `e079b44` (test)
2. **Task 1 GREEN: Verify linked onboarding schema** - `e3303a0` (feat)
3. **Task 1 hardening: Make Windows linked verification deterministic** - `2b69a49` (fix)
4. **Task 2 RED: Define owner-scoped persistence smoke** - `458f4b0` (test)
5. **Task 2 GREEN: Prove live onboarding owner isolation** - `c719335` (feat)

## Files Created/Modified

- `scripts/verify-phase36-onboarding-schema.mjs` - Fail-closed project identity, linked history, and live pg_catalog verifier with ephemeral cleanup.
- `tests/verify-phase36-onboarding-schema.test.ts` - Covers ref parsing, migration parsing, exact constraint parsing, and temporary-artifact cleanup behavior.
- `tests/screendesign-onboarding-persistence.spec.ts` - Two-owner linked-backend persistence, preservation, validation, isolation, invariance, and cleanup proof.
- `app/api/qa/onboarding-persistence/route.ts` - Development-only authenticated bridge to the real onboarding completion action.
- `playwright.config.ts` - Routes the linked persistence smoke only to the deterministic ScreenDesign mobile project.

## Decisions Made

- Required equality among all three relevant project identities before `supabase db push --linked`. Project names alone were not accepted as proof.
- Required the migration dry run to identify exactly `20260715050000` as pending. No unrelated migration, reset, destructive DDL, or data deletion was permitted.
- Used the locally installed `psql` client with the CLI's temporary linked login because the Supabase schema-dump path requires Docker, which is not installed. Credentials remain in process memory, and output contains only safe project and schema facts.
- Queried `pg_catalog` rather than `information_schema` because the CLI temporary role can inspect the catalog and constraints but its `information_schema.columns` visibility omits these rows.
- Kept the QA bridge behind both non-production mode and `QA_CREATE_USER=true`. It receives only validated selections, accepts no user identifier, and obtains identity from the normal authenticated request cookies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced Docker-dependent schema dump with ephemeral read-only catalog inspection**
- **Found during:** Task 1 live schema verification
- **Issue:** The Supabase CLI's linked schema dump requires a running Docker daemon, which is unavailable on this workstation.
- **Fix:** Reused the Supabase CLI's temporary linked login only in memory and invoked local `psql` for a read-only `pg_catalog` JSON snapshot. The verifier still deletes the temporary snapshot and never prints credentials.
- **Files modified:** `scripts/verify-phase36-onboarding-schema.mjs`
- **Verification:** Live verifier passed against project `oitipayrriupcitgmzju` with both columns and exact constraints.
- **Committed in:** `e3303a0`, hardened in `2b69a49`

**2. [Rule 1 - Bug] Hardened Windows CLI invocation and catalog parsing**
- **Found during:** Task 1 post-push verification
- **Issue:** Direct Windows `npx.cmd` spawning and the CLI's object-or-array JSON shape made the first local verifier run fail after the migration and history checks had already succeeded. The temporary role also returned no relevant `information_schema.columns` rows.
- **Fix:** Invoked the installed Node CLI directly, accepted both documented JSON shapes, and sourced live nullable-column facts from `pg_catalog` alongside the constraints.
- **Files modified:** `scripts/verify-phase36-onboarding-schema.mjs`, `tests/verify-phase36-onboarding-schema.test.ts`
- **Verification:** Five focused verifier tests and the live linked verifier passed.
- **Committed in:** `2b69a49`

**3. [Rule 2 - Missing Critical Functionality] Added a narrowly gated action test seam**
- **Found during:** Task 2 persistence proof
- **Issue:** Plan 36-07's onboarding UI is intentionally downstream, so no browser route yet invoked the real completion action with authenticated request cookies.
- **Fix:** Added a development-only POST route that delegates to `completeScreenDesignOnboarding`, receives no owner id, and remains subject to the action's auth and owner-scoped Supabase update.
- **Files modified:** `app/api/qa/onboarding-persistence/route.ts`, `tests/screendesign-onboarding-persistence.spec.ts`, `playwright.config.ts`
- **Verification:** The linked two-owner persistence smoke passed twice. The production build replaces the handler with the unavailable response, and unauthenticated production runtime access does not expose it.
- **Committed in:** `c719335`

---

**Total deviations:** 3 auto-fixed issues.
**Impact on plan:** The changes preserve the planned live proof while adapting only local tooling and a QA-only action bridge. They do not widen the production surface or alter application data semantics.

## Issues Encountered

- The guarded migration chain successfully applied the migration and confirmed linked history before the first verifier process hit Windows-only local runner and parser issues. The subsequent hardening made the full live verifier repeatable.
- An unauthenticated POST to the production QA path is rejected at the application boundary before the route handler. The compiled production handler itself is also the intended unavailable response.

## Threat Review

- T-36-51 is mitigated because the write followed three-way project-ref equality, a single-pending-migration dry run, exact post-apply history, and live column and constraint assertions.
- T-36-52 is mitigated because only two allowlisted synthetic identities were used, the QA bridge accepts no owner id, normal RLS denied cross-owner select and update, and cleanup used each owner's existing reset boundary.
- No credential, connection string, Supabase URL, service key, owner UUID, or synthetic password is printed or persisted by the verifier or browser test.
- The migration is additive and nullable. No existing profile value, user row, business record, or unrelated schema object was deleted or rewritten.

## Verification

- Project identity: Supabase CLI link, local app ref, and Vercel Preview ref all matched `oitipayrriupcitgmzju`.
- Migration history: local and remote aligned through `20260715050000` after applying exactly the one pending migration.
- Live schema: both fields are nullable text, `learning_hurdle` has exactly four allowed values, and `study_schedule_preference` has exactly three.
- Verifier unit contract: 5 of 5 tests passed.
- Linked two-owner persistence smoke: 1 of 1 Playwright test passed twice under Vercel Preview environment values.
- Full Vitest: 156 files and 874 tests passed.
- `npm run typecheck` and `npm run lint` passed.
- `npm run tone-audit` passed with one pre-existing non-blocking assignment copy advisory outside this plan.
- `npm run build` passed and generated 79 static pages.
- Production runtime returned HTTP 200 for `/login`; the QA action seam was unavailable at the production boundary.
- `git diff --check` passed.

## User Setup Required

None. The linked migration is already applied to the verified preview project, and no new secret or provider configuration is required.

## Next Phase Readiness

- Plan 36-07 can now implement the four-screen onboarding sequence against a live, verified schema and persistence action.
- Release validation can reuse the verifier before preview approval to catch project-link or migration drift.
- The only remaining work for this plan is repository tracking metadata; no schema or persistence blocker remains.

## Self-Check: PASSED

- All planned and deviation files exist.
- All five task commits exist and are atomic.
- The intended linked migration is present remotely and the exact live schema passed verification.
- The real action, invalid-input, preservation, owner-isolation, cleanup, full static, test, build, and runtime gates passed.
- Only the user-owned newline-only `.planning/config.json` change remains unstaged and untouched.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
