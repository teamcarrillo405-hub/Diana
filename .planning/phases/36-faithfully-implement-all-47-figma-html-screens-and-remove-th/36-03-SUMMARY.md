---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "03"
subsystem: testing
tags: [playwright, visual-regression, screendesign, chromium, synthetic-fixtures]

requires:
  - phase: 36-01
    provides: Canonical 47-screen registry and attached dashboard precedence
  - phase: 36-02
    provides: Checked-in 28-asset local manifest
  - phase: 36-27
    provides: Typed deterministic scenarios and owner-scoped seed/reset API
  - phase: 36-28
    provides: Fail-closed source normalizer and isolated local source server
provides:
  - Controlled 393x852 source and application Chromium projects with larger responsive checks
  - Deterministic synthetic auth, route resolution, clock, media, console, and review-evidence fixtures
  - Exactly 47 source captures, visual comparisons, and primary-action contracts with SCREEN_IDS filtering
affects: [36-05, 36-07, 36-08, 36-09, 36-10, 36-11, 36-12, 36-13, 36-14, 36-15, 36-16, 36-17, 36-18, 36-19, 36-20, 36-21, 36-22, 36-23, 36-24, 36-29, 36-30]

tech-stack:
  added: []
  patterns:
    - Same-browser source and app capture with a fixed 393x852 CSS viewport
    - Single-worker owner-scoped scenario reset before each application case
    - Run-scoped source, app, and action evidence emitted only under explicit review environment variables

key-files:
  created:
    - playwright.config.ts
    - tests/fixtures/screendesign.ts
    - tests/screendesign-source-capture.spec.ts
    - tests/screendesign-visual.spec.ts
    - tests/screendesign-navigation.spec.ts
  modified: []

key-decisions:
  - "Source and app evidence share the same local Windows Chromium, locale, timezone, color scheme, reduced-motion, and font-loading environment."
  - "ScreenDesign app projects run with one worker because every scenario resets an owner-scoped real-record graph before capture."
  - "Synthetic record ids are derived transiently from the QA session, never serialized, and scrubbed from console and action evidence."
  - "Review mode writes one source PNG, app PNG, and action JSON per canonical id without generating or weakening the gallery index."

patterns-established:
  - "SCREEN_IDS filtering: comma-separated canonical ids fail closed on unknown or duplicate input."
  - "Explicit baseline writes: toHaveScreenshot remains authoritative and no test updates a golden implicitly."

requirements-completed: [P36-QA, P36-FIDELITY, P36-OPERATIONS]

coverage:
  - id: D1
    description: "Controlled same-environment Chromium projects and deterministic synthetic auth fixture cover every canonical screen."
    requirement: P36-QA
    verification:
      - kind: other
        ref: "npx playwright test tests/screendesign-source-capture.spec.ts --project=screendesign-source --list"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 47 normalized canonical sources capture at 393x852 with local manifest media and zero remote browser requests."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-source-capture.spec.ts#47 normalized source captures"
        status: pass
      - kind: integration
        ref: "tests/screendesign-source-normalization.test.ts#isolated ScreenDesign source server"
        status: pass
    human_judgment: false
  - id: D3
    description: "The app suites enumerate one stable mobile golden and one primary-action contract per canonical id, with responsive overflow and keyboard-focus checks."
    requirement: P36-OPERATIONS
    verification:
      - kind: automated_ui
        ref: "npx playwright test tests/screendesign-visual.spec.ts tests/screendesign-navigation.spec.ts --project=screendesign-mobile --list"
        status: pass
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 03: Source-Faithful Playwright Evidence Harness Summary

**Deterministic 47-screen source, golden, responsive, and primary-action evidence now runs through one controlled local Chromium contract.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-15T14:37:00-07:00
- **Completed:** 2026-07-15T14:55:27-07:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added controlled source, 393x852 mobile, tablet, and desktop Chromium projects without disrupting the existing Playwright suites.
- Added a reusable synthetic scenario fixture that seeds through the owner-scoped QA API, stores auth state only in ignored test output, freezes time, resolves deterministic routes, waits for local fonts and images, and scrubs generated identifiers.
- Added 47 source captures with export-runtime removal, local-asset assertions, request isolation, console evidence, and exact viewport checks.
- Added 47 stable app screenshot contracts plus 47 primary-action contracts, responsive overflow and focus checks, and run-scoped evidence hooks for Plan 36-30.

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure controlled ScreenDesign test projects and auth fixture** - `2a83a76` (test)
2. **Task 2: Create source, golden, and primary-action data-driven suites** - `235fbe4` (test)

## Files Created/Modified

- `playwright.config.ts` - Defines legacy, isolated source, exact mobile, tablet, and desktop Chromium projects.
- `tests/fixtures/screendesign.ts` - Selects typed scenarios, seeds synthetic auth, resolves safe routes, stabilizes pages, and emits review evidence.
- `tests/screendesign-source-capture.spec.ts` - Captures all normalized canonical sources and proves the browser made no remote request.
- `tests/screendesign-visual.spec.ts` - Enforces stable mobile goldens plus responsive overflow, focus, console, and local-request checks.
- `tests/screendesign-navigation.spec.ts` - Exercises declared primary actions and records destination or successful persisted-mutation evidence.

## Decisions Made

- Kept source capture on the isolated Plan 36-28 origin so exported HTML never receives Diana application cookies or privileges.
- Used transient ignored storage-state files and in-memory synthetic owner resolution rather than returning owner UUIDs from the QA endpoint.
- Kept `toHaveScreenshot` authoritative. Review PNG emission happens before the matcher so passing images are still available, but no baseline is written without Playwright's explicit update flag.
- Made ScreenDesign app projects single-worker to prevent scenario resets for the shared synthetic owner from racing each other.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Excluded Vitest files from Playwright discovery**
- **Found during:** Task 1 project-list verification
- **Issue:** Playwright's default matcher also loaded `tests/screendesign-source-normalization.test.ts`, causing Vitest's ESM entry point to be imported as a Playwright CommonJS test.
- **Fix:** Restricted Playwright discovery to `*.spec.ts` while preserving all existing end-to-end specs.
- **Files modified:** `playwright.config.ts`
- **Verification:** `npx playwright test --list` completed and the exact source project listed 47 cases.
- **Committed in:** `2a83a76`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** The matcher correction is required for valid tool separation and does not change application behavior or scope.

## Issues Encountered

- A live dashboard harness smoke run reached the current application state and then caught an offscreen keyboard-focus target before the screenshot matcher. This is evidence that the new gate is active against the still-present legacy dashboard. Plan 36-05 owns the source-faithful dashboard replacement, and no golden was created or updated by this run.

## Authentication Gates

None.

## Known Stubs

None. Empty arrays in the harness are evidence accumulators populated during each browser run, not application data placeholders.

## User Setup Required

None. Application suites require the existing local QA environment (`QA_CREATE_USER=true` plus the configured development Supabase service role); the source suite is fully local and credential-free.

## Verification

- `npx playwright test tests/screendesign-source-capture.spec.ts --project=screendesign-source --list` - 47 tests listed.
- `node scripts/run-verified-commands.mjs --env SCREEN_IDS=dashboard-personalized -- npx playwright test tests/screendesign-source-capture.spec.ts --project=screendesign-source --next npx vitest run tests/screendesign-source-normalization.test.ts` - 1 dashboard capture and 8 normalization tests passed.
- Full `screendesign-source` run - 47/47 captures passed in 31.2 seconds.
- Mobile visual and navigation list - 94 tests listed with 47 unique snapshots and 47 action contracts.
- `npm run typecheck` - passed.
- `npm run tone-audit` - 0 violations across 426 files.
- `npm run build` - passed, 78 static pages generated.
- `npm run test:run` - 135 files and 816 tests passed.

## Next Phase Readiness

- The evidence harness is ready to gate each source-faithful route conversion beginning with Plan 36-05.
- Reviewed golden creation remains intentionally deferred to explicit implementation review and the final Plan 36-24/36-30 evidence workflow.
- Plan 36-30 can consume the run-scoped `source`, `app`, and `actions` directories without the suites creating a gallery index.

## Self-Check: PASSED

- All five plan-owned files exist.
- Task commits `2a83a76` and `235fbe4` exist.
- Exact source, list, type, tone, build, and full Vitest gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
