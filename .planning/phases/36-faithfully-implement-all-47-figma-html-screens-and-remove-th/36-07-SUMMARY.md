---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "07"
subsystem: onboarding
tags: [screendesign, onboarding, playwright, supabase, accessibility, visual-regression]

requires:
  - phase: 36-03
    provides: Deterministic synthetic student fixtures and owner-scoped reset
  - phase: 36-04
    provides: Source viewport, local media, and ScreenDesign primitives
  - phase: 36-26
    provides: Applied onboarding schema and linked two-owner persistence proof
provides:
  - Four-state source-faithful welcome, educational, challenge, and schedule onboarding flow
  - Keyboard-operable single-selection cards with preserved back-navigation choices and one-shot completion
  - Authenticated route ownership, success-only dashboard navigation, and four reviewed 393x852 goldens
  - Responsive, action, calm-language, production-build, and linked persistence proof
affects:
  - phase-36-release-validation
  - first-run-student-experience
  - profile-preferences

tech-stack:
  added: []
  patterns:
    - Pure server-safe state selector maps exact QA selectors to one of four local onboarding states
    - Client controller owns transient step state while the existing authenticated action remains the only write boundary
    - ScreenDesign surface selectors outrank broad legacy application rules so old visual chrome cannot leak into canonical screens

key-files:
  created:
    - app/onboarding/screendesign-onboarding.tsx
    - app/onboarding/screendesign-onboarding.test.tsx
    - lib/onboarding/screendesign-step.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-welcome.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-educational.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-quiz-challenge.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-quiz-schedule.png
  modified:
    - app/onboarding/page.tsx
    - app/onboarding/form.tsx
    - app/onboarding/done/page.tsx
    - app/screendesign.css
    - lib/qa/grayson-demo.ts
    - lib/qa/screendesign-fixtures.ts
    - tests/screendesign-navigation.spec.ts
    - tests/screendesign-visual.spec.ts

key-decisions:
  - "The live onboarding route renders only the four canonical source states; the obsolete fifth done composition redirects to the real dashboard."
  - "Source defaults exam_stress and after_practice are real selected values and are included in the final validated submission unless the student changes them."
  - "completeScreenDesignOnboarding remains the sole write boundary and updates only learning_hurdle, study_schedule_preference, and onboarded_at."
  - "Exact sdState selectors make each canonical state deterministic for QA without changing the production flow order."

patterns-established:
  - "Roving radio cards: arrow keys, Home, and End move both focus and the selected source card while preserving one checked value."
  - "Completion discipline: a synchronous ref blocks duplicate clicks before React pending state updates, and navigation occurs only after an ok action result."
  - "Visual isolation: source-specific selectors explicitly override broad application button and heading rules rather than inheriting obsolete command styling."

requirements-completed: [P36-ONBOARDING, P36-FIDELITY, P36-ASSETS, P36-QA]

coverage:
  - id: D1
    description: "Welcome, educational, challenge 1/4, and schedule 2/4 render in the locked order with exact source content and local assets."
    requirement: P36-ONBOARDING
    verification:
      - kind: unit
        ref: "app/onboarding/screendesign-onboarding.test.tsx"
        status: pass
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts#onboarding completes the locked four-screen flow with preserved choices"
        status: pass
    human_judgment: false
  - id: D2
    description: "Single-selection cards are keyboard operable, preserve choices across back navigation, block duplicate submission, and redirect only after success."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "app/onboarding/screendesign-onboarding.test.tsx"
        status: pass
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The authenticated onboarding route owns only the new controller while completed profiles and the obsolete done route resolve to the dashboard."
    requirement: P36-ONBOARDING
    verification:
      - kind: other
        ref: "npm run build"
        status: pass
      - kind: unit
        ref: "resolveScreenDesignOnboardingStep canonical selector test"
        status: pass
    human_judgment: false
  - id: D4
    description: "Valid dedicated answers persist for only the authenticated owner, preserve legacy profile values, reject invalid ids, and remain RLS isolated from a second owner."
    requirement: P36-ONBOARDING
    verification:
      - kind: e2e
        ref: "tests/screendesign-onboarding-persistence.spec.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Four reviewed 393x852 goldens preserve source hierarchy, imagery, rounded selected cards, progress, and gradient actions without legacy command styling."
    requirement: P36-FIDELITY
    verification:
      - kind: visual
        ref: "tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-*.png"
        status: pass
      - kind: manual_procedural
        ref: "Four exact HTML sources compared with final app captures"
        status: pass
    human_judgment: true
    rationale: "The final app captures were inspected after correcting meaningful global-style leakage and before the goldens were accepted."
  - id: D6
    description: "All onboarding media is local, browser evidence contains no remote requests, and tablet and desktop retain the centered source canvas without horizontal overflow or hidden keyboard focus."
    requirement: P36-ASSETS
    verification:
      - kind: e2e
        ref: "tests/screendesign-visual.spec.ts at mobile, tablet, and desktop projects"
        status: pass
    human_judgment: false

duration: 36min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 07: Source-Faithful Four-Screen Onboarding Summary

**Diana now opens with the four attached ScreenDesign onboarding compositions in their locked order, persists only dedicated validated answers, and reaches the real dashboard after a proven owner-scoped save.**

## Performance

- **Duration:** 36 min
- **Started:** 2026-07-15T22:36:00-07:00
- **Completed:** 2026-07-15T23:12:00-07:00
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Replaced the generic onboarding presentation with welcome, educational, challenge 1/4, and schedule 2/4 source compositions using the local Diana logo, stadium background, and GPA chart.
- Added accessible radio-card semantics, roving arrow/Home/End selection, preserved back-navigation state, disabled invalid continuation, calm persistence feedback, a synchronous duplicate-submit guard, and success-only dashboard navigation.
- Made `/onboarding` own only the new controller for incomplete profiles, preserved the completed-profile dashboard redirect, and redirected the obsolete `/onboarding/done` composition so no fifth legacy state remains reachable.
- Corrected broad old application styles that were leaking angular command buttons and display fonts into the canonical onboarding surface, then visually inspected and regenerated all four exact mobile goldens.
- Proved the full four-screen flow, live linked Supabase owner-scoped persistence, local-only requests, keyboard focus, reduced motion, responsive safety, production build, and the complete repository test suite.

## Task Commits

Each implementation task was committed atomically. Task 2 followed RED then GREEN TDD:

1. **Task 1: Reproduce welcome and educational states** - `a39e580` (feat)
2. **Task 2 RED: Define onboarding selection behavior** - `f413b62` (test)
3. **Task 2 GREEN: Implement onboarding answer selection** - `1838a0a` (feat)
4. **Task 3: Own onboarding route and lock four goldens** - `5e058f8` (feat)
5. **Task 3 hardening: Correct responsive focus accounting** - `b9d51fc` (test)

## Files Created/Modified

- `app/onboarding/screendesign-onboarding.tsx` - Four-state controller, source compositions, keyboard radio cards, calm completion, and duplicate-submit protection.
- `app/onboarding/screendesign-onboarding.test.tsx` - Eight interaction tests covering order, selection, preservation, error, one-shot submission, and success-only navigation.
- `lib/onboarding/screendesign-step.ts` - Pure server-safe mapping for the four exact QA state selectors.
- `app/onboarding/page.tsx` and `app/onboarding/form.tsx` - Authenticated route ownership and existing-profile defaults.
- `app/onboarding/done/page.tsx` - Redirect from the obsolete extra completion screen to the real dashboard.
- `app/screendesign.css` - Source geometry, visual states, local assets, and scoped isolation from broad old theme rules.
- `lib/qa/grayson-demo.ts` and `lib/qa/screendesign-fixtures.ts` - Deterministic source-valid onboarding defaults and expected evidence.
- `tests/screendesign-navigation.spec.ts` - Local-state navigation recognition, mutation polling, destination stabilization, and the complete preserved-choice flow.
- `tests/screendesign-visual.spec.ts` - Framework-chrome isolation and accurate roving-focus accounting for visual evidence.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/onboarding-*.png` - Four reviewed canonical mobile goldens.

## Decisions Made

- Kept the four attached states as the entire live first-run flow. The prior generic form and separate done composition are not alternate onboarding designs.
- Treated the source-selected `exam_stress` and `after_practice` cards as real defaults because they are visibly selected and are submitted through the same validated action as student changes.
- Kept answer persistence at the existing authenticated Server Action and profile RLS boundary. Client route selectors and visual state never become trusted write inputs.
- Used a full destination wait in the action QA before reload so the evidence verifies the completed Server Action navigation rather than racing a client transition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved the QA state selector out of the client module**
- **Found during:** Task 3 Playwright route verification
- **Issue:** The Server Component called a helper exported by a `use client` module, producing a runtime 500 even though TypeScript passed.
- **Fix:** Moved the pure selector and shared step type into `lib/onboarding/screendesign-step.ts`.
- **Verification:** Every onboarding route returned below 500, mobile visual tests passed, and the production build passed.
- **Committed in:** `5e058f8`

**2. [Rule 1 - Bug] Isolated source styling from broad legacy theme selectors**
- **Found during:** Task 3 manual source/app image inspection
- **Issue:** Broad `.diana-app button` and heading rules overrode rounded cards, full-width gradient actions, and source typography with angular command styling.
- **Fix:** Raised the canonical onboarding selector boundary, restored source button/card behavior, removed a non-source welcome overlay, and regenerated all four goldens only after inspection.
- **Verification:** Four of four mobile visuals pass and final captures show the source rounded cards, selected states, and pink-to-blue actions.
- **Committed in:** `5e058f8`

**3. [Rule 2 - Missing Critical Functionality] Extended deterministic navigation evidence for local onboarding steps**
- **Found during:** Task 3 interaction verification
- **Issue:** The generic navigation harness recognized URL changes but not source-faithful local state transitions on the same route.
- **Fix:** Added explicit `data-onboarding-step` transition evidence plus a complete forward/back/selection/completion flow.
- **Verification:** Five of five onboarding navigation contracts pass.
- **Committed in:** `5e058f8`

**4. [Rule 1 - Bug] Corrected responsive focus accounting and deterministic test ordering**
- **Found during:** Responsive release verification
- **Issue:** The focus count included roving controls with `tabindex=-1`, and running tablet and desktop together raced the same deterministic seed owner.
- **Fix:** Excluded non-tabbable controls and ran shared-owner responsive projects sequentially.
- **Verification:** Four of four tablet and four of four desktop checks pass.
- **Committed in:** `b9d51fc`

## Issues Encountered

- The first Playwright run exposed the Server/Client helper boundary as a real runtime 500. It was fixed before any golden was accepted.
- The linked persistence smoke requires the preview publishable key in the Playwright process. The final run obtained the CLI-issued value in memory, wrote no credential to disk, and passed the two-owner proof.
- `npm run tone-audit` reports one pre-existing non-blocking `deadline` advisory in `app/(app)/assignments/page.tsx`. No Plan 36-07 file has a blocking calm-language issue.

## Known Stubs

None. All four source states, route guards, assets, selections, completion behavior, live persistence, and visual baselines are implemented and verified.

## Threat Review

- **T-36-13 tampering:** Client values are revalidated against exact server allowlists before the exact-key update; the linked test proves invalid values are a no-op and a second owner cannot read or update the first owner.
- **T-36-14 repeated submit:** A synchronous ref blocks the second click before React pending state changes, the button is disabled while pending, and the update remains idempotent.
- No credential, owner UUID, synthetic password, remote URL, or private record enters the four goldens or tracked evidence.

## Verification

- Focused onboarding contracts: 4 files and 36 tests passed.
- Source capture: 4 of 4 normalized local source documents passed isolation and asset checks.
- Mobile visual evidence: 4 of 4 reviewed 393x852 goldens passed.
- Mobile navigation and save evidence: 5 of 5 passed, including preserved choices and dashboard completion.
- Responsive evidence: 4 of 4 tablet and 4 of 4 desktop checks passed.
- Linked preview persistence: 1 of 1 two-owner Playwright smoke passed.
- Full Vitest: 157 files and 882 tests passed.
- `npm run typecheck`, `npm run lint`, and `npm run build` passed.
- `npm run tone-audit` passed with zero blockers and one unrelated advisory.
- Runtime: `http://127.0.0.1:3005/login` returned HTTP 200 on PID 65112.
- `git diff --check` passed; the unrelated `.planning/config.json` newline remains unstaged.

## User Setup Required

None. No package, local asset, database migration, or secret setup remains for this plan.

## Next Phase Readiness

- The four attached onboarding screens are ready for Phase 36 release validation and final preview approval.
- Plan 36-22 can remove remaining obsolete visual files globally after all canonical consumers are verified; this plan already prevents those broad old styles from affecting onboarding.

## Self-Check: PASSED

- All five task commits exist in order.
- All four golden files are tracked at the active Playwright snapshot path.
- The live route renders only the four source states and redirects completed or obsolete done routes to the dashboard.
- Focused, visual, navigation, responsive, persistence, full test, type, lint, tone, build, runtime, and diff gates pass.
- The unrelated `.planning/config.json` newline remains unstaged and untouched.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
