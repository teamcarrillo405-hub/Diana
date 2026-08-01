---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "31"
subsystem: ui-auth
tags: [nextjs, react, supabase-auth, session-storage, playwright, screendesign]

requires:
  - phase: 36
    provides: Source-faithful onboarding compositions, truthful upgrade compositions, and the locked 47-screen release registry
provides:
  - Complete public ScreenDesign acquisition sequence from welcome through signup
  - Fail-closed versioned onboarding draft carried into validated signup metadata
  - Security-definer profile projection with explicit onboarding preference allowlists
  - Canonical navigation and release-gate evidence for the corrected public flow
affects: [36-24-exact-preview, public-acquisition, signup, onboarding, auth-profile-trigger]

tech-stack:
  added: []
  patterns:
    - Session-only anonymous preference drafts with strict versioned parsing
    - Optional client callback seams around authenticated ScreenDesign compositions
    - Allowlisted auth metadata projection inside a fixed-search-path trigger

key-files:
  created:
    - app/public-home-funnel.tsx
    - lib/onboarding/public-draft.ts
    - lib/onboarding/public-draft.test.ts
    - supabase/migrations/20260717090000_public_home_onboarding_metadata.sql
    - tests/public-home-funnel.spec.ts
  modified:
    - app/page.tsx
    - app/onboarding/screendesign-onboarding.tsx
    - app/(app)/upgrade/upgrade-screen.tsx
    - app/(auth)/signup/page.tsx
    - tests/screendesign-navigation.spec.ts

key-decisions:
  - "Anonymous onboarding stores only the two canonical quiz choices in a strict versioned session draft; identity, credentials, billing, and owner data are never accepted."
  - "The public flow reuses both truthful upgrade compositions with local next and back callbacks; authenticated billing remains server-resolved and unchanged."
  - "The signup trigger marks onboarding complete only when both metadata values pass explicit SQL allowlists."

patterns-established:
  - "Public composition reuse: authenticated components retain their default server actions while explicit callbacks enable a local anonymous sequence."
  - "Fail-closed browser draft: malformed, partial, unknown-version, extra-key, oversized, or unavailable storage becomes no draft and never blocks direct signup."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Validated public onboarding choices survive the anonymous flow and enter signup metadata without widening the auth trust boundary."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/onboarding/public-draft.test.ts#public onboarding draft"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "The public root presents welcome, education, challenge, schedule, community access, and standard access in the requested operational order."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/public-home-funnel.spec.ts#public home includes the complete attached ScreenDesign sequence"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts#47 no-update canonical current app evidence tests"
        status: pass
    human_judgment: true
    rationale: "Automation proves composition identity, order, controls, and unchanged canonical baselines; the corrected end-to-end public presentation still requires the planned exact-preview human review."
  - id: D3
    description: "The corrected public sequence is bound to canonical navigation, accessibility, responsive, build, tone, and obsolete-design removal gates."
    requirement: P36-QA
    verification:
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts#58 passing navigation contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/a11y.spec.ts and tests/responsive-qa.spec.ts#104 passing checks"
        status: pass
      - kind: unit
        ref: "npm run test:run#923 passing tests across 162 files"
        status: pass
      - kind: other
        ref: "npm run build and scripts/verify-screendesign-removal.ts"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-07-17
status: complete
---

# Phase 36 Plan 31: Public ScreenDesign Home Funnel Summary

**The public root now carries the attached ScreenDesign onboarding and both truthful access compositions through a keyboard-operable signup journey, with validated choices projected safely into the new profile.**

## Performance

- **Duration:** 45 min
- **Started:** 2026-07-17T14:37:00-07:00
- **Completed:** 2026-07-17T15:22:00-07:00
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Replaced the one-screen public root with the complete welcome, educational, challenge, schedule, social-proof-layout, standard-access-layout, and signup sequence.
- Added a strict 512-byte versioned session draft and passed only canonical quiz choices through Supabase signup metadata.
- Added an idempotent fixed-search-path auth trigger migration that projects allowlisted choices and sets `onboarded_at` only when both are valid.
- Preserved the authenticated onboarding server action, authenticated upgrade checkout authority, truthful paywall copy, the 47-screen registry, and every existing visual baseline.
- Passed 1 focused public-funnel test, 58 navigation contracts, 47 no-update visual comparisons, 104 accessibility/responsive checks, and 923 unit/component tests.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define a validated public onboarding draft and signup projection**
   - `0489562` (test: RED draft contract)
   - `aaaa335` (feat: GREEN draft, signup metadata, and profile trigger)
2. **Task 2: Make the attached compositions the operational public home sequence**
   - `3acc3de` (test: RED public journey)
   - `829bb73` (feat: GREEN public state machine and composition seams)
3. **Task 3: Bind the correction to the canonical navigation and release gates**
   - `85035c4` (test: canonical public journey)

Additional correctness fix:

- `4c629fe` (fix: privacy-mode storage access remains non-blocking)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `app/page.tsx` - Renders the operational public acquisition funnel.
- `app/public-home-funnel.tsx` - Owns the deterministic onboarding, community, standard, and signup sequence.
- `app/onboarding/screendesign-onboarding.tsx` - Adds an optional validated public completion callback while preserving authenticated completion by default.
- `app/(app)/upgrade/upgrade-screen.tsx` - Adds optional local next/back controls while retaining server-resolved authenticated billing links.
- `app/(auth)/signup/page.tsx` - Reads validated public answers into auth metadata and clears them only after accepted signup.
- `lib/onboarding/public-draft.ts` - Implements strict versioned session draft parsing, writing, and clearing.
- `lib/onboarding/public-draft.test.ts` - Covers canonical, malformed, partial, oversized, unavailable, and identity-bearing draft cases.
- `supabase/migrations/20260717090000_public_home_onboarding_metadata.sql` - Projects allowlisted signup metadata into new profiles.
- `tests/public-home-funnel.spec.ts` - Proves the full route, keyboard selection, reverse navigation, draft, viewport, and signup handoff.
- `tests/screendesign-navigation.spec.ts` - Adds the public acquisition journey to canonical release navigation evidence.

## Decisions Made

- The two attached paywall layouts are sequential public acquisition states, community first and standard second, but they do not choose checkout, price, entitlement, or subscription state.
- Unsupported prices, trials, testimonials, member counts, score claims, and time-saved claims remain absent. Existing truthful replacement copy is reused.
- A missing or invalid public draft leaves `onboarded_at` null so direct signup continues to use the authenticated onboarding flow.
- The migration is committed but not applied to production during this plan. Database rollout remains inside the identity-checked preview/release gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Browser storage getter could throw before the fail-closed adapter ran**
- **Found during:** Task 3 final review
- **Issue:** Privacy modes can deny access while evaluating `window.sessionStorage`, before the adapter receives a storage object.
- **Fix:** Guarded public write, signup read, and post-signup clear call sites so storage denial cannot trap the visitor or block account creation.
- **Files modified:** `app/public-home-funnel.tsx`, `app/(auth)/signup/page.tsx`, `app/onboarding/screendesign-onboarding.tsx`
- **Verification:** 18 targeted unit/component tests, focused Playwright journey, typecheck, and tone audit passed.
- **Committed in:** `4c629fe`

**2. [Rule 3 - Blocking] Plan 31 referenced stale release-gate file and script names**
- **Found during:** Task 3 release verification
- **Issue:** `tests/screendesign-a11y-responsive.spec.ts` and the `screendesign:removal-check` npm script do not exist. The canonical navigation and visual suites are assigned to the `screendesign-mobile` Playwright project, not `chromium`.
- **Fix:** Ran the established equivalents: `tests/a11y.spec.ts`, `tests/responsive-qa.spec.ts`, the navigation and visual suites under `screendesign-mobile`, plus `scripts/verify-screendesign-removal.ts --source` and `--compiled`.
- **Files modified:** None.
- **Verification:** 104 accessibility/responsive checks, 58 navigation contracts, 47 visual comparisons, and both removal audits passed.
- **Committed in:** Not applicable; verification-only correction.

---

**Total deviations:** 2 auto-fixed (1 implementation bug, 1 verification blocker)
**Impact on plan:** Both fixes preserved the requested scope and strengthened release evidence without changing production or visual baselines.

## Issues Encountered

- The full navigation run outlived the invoking shell timeout, continued in its child process, and completed with Playwright status `passed`; `--list` confirms 58 tests in the suite.
- The first accessibility/responsive attempt used the tests' default `localhost:3000` and lacked the QA bootstrap flag. It was rerun with `QA_BASE_URL=http://127.0.0.1:3005` and `QA_CREATE_USER=true`, producing 104/104 passing checks.
- Tone audit remains at the three unchanged non-blocking `deadline` warnings in `app/(app)/assignments/page.tsx` and `scripts/generate-screendesign-review-gallery.ts`.

## User Setup Required

None - no external service configuration is required. The new migration remains queued for the identity-checked preview/release database step.

## Verification Results

- `npx vitest run lib/onboarding/public-draft.test.ts`: 10/10 passed.
- `npx playwright test tests/public-home-funnel.spec.ts --project=chromium --workers=1`: 1/1 passed at 393x852.
- `npx playwright test tests/screendesign-navigation.spec.ts --project=screendesign-mobile --workers=1`: 58/58 passed.
- `npx playwright test tests/screendesign-visual.spec.ts --project=screendesign-mobile --workers=1`: 47/47 passed with no baseline updates.
- `npx playwright test tests/a11y.spec.ts tests/responsive-qa.spec.ts --project=chromium --workers=1`: 104/104 passed with the QA environment above.
- `npm run test:run`: 923/923 passed across 162 files.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run tone-audit`: 0 blocking, 3 unchanged warnings.
- `npm run build`: passed, 79 static pages generated.
- `npx tsx scripts/verify-screendesign-removal.ts --source`: passed across 466 production files, 47 canonical states, and 28 local assets.
- `npx tsx scripts/verify-screendesign-removal.ts --compiled`: passed across 554 build artifacts.

## Next Phase Readiness

- Plan 36-31 implementation is complete and ready for the refreshed Plan 36-30 evidence, Plan 36-29 independent receipt, and Plan 36-24 exact-preview human review.
- Production remains untouched.
- The preview/release path must apply `20260717090000_public_home_onboarding_metadata.sql` only after the existing Supabase identity and dry-run gates pass.

## Self-Check: PASSED

- Every key file listed in frontmatter exists.
- Six Plan 36-31 production/test commits exist and all plan acceptance gates pass.
- The public acquisition correction preserves the canonical 47-screen registry and obsolete Nexus removal.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-17*
