---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "10"
subsystem: ui
tags: [screendesign, classes, rubric, syllabus, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and five-destination navigation primitives
provides:
  - Honest empty and populated ScreenDesign class-library states at /classes
  - Owner-scoped Rubric Scout at /classes/[id] with real rubric, syllabus, policy, and assignment context
  - Three reviewed 393x852 source-and-app goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Server-loaded owner-scoped class count alone selects the empty or populated library composition
    - Source-owned class screens isolate obsolete application theme rules at their route boundary
    - Rubric Scout exposes AI assistance only when the owning class policy is green

key-files:
  created:
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/library-empty-state.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/subject-library.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/rubric-scout.png
  modified:
    - app/(app)/classes/page.tsx
    - app/(app)/classes/my-classes-grid.tsx
    - app/(app)/classes/[id]/page.tsx
    - components/rubric-panel.tsx
    - lib/qa/screendesign-fixtures.ts
    - lib/qa/grayson-demo.ts

key-decisions:
  - "The authenticated classes result alone selects the honest empty or populated library composition."
  - "Rubric Scout exposes only owner-scoped rubric, syllabus, class, and assignment context, with Diana help available only under green class policy."
  - "Canonical class QA seeds a real class_syllabi row so source evidence never fabricates course policies."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The /classes route renders distinct source-faithful empty and populated compositions from the authenticated owner's actual class count."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/classes/my-classes-grid.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts library-empty-state and subject-library"
        status: pass
    human_judgment: false
  - id: D2
    description: "Populated subject cards expose factual open-work and completion counts and navigate to the owner-scoped class route, while the add control invokes the real class action."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/classes/my-classes-grid.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts subject-library"
        status: pass
    human_judgment: false
  - id: D3
    description: "Rubric Scout loads only owner-scoped class, rubric, syllabus, and assignment rows and exposes assignment help according to the real class AI policy."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "components/rubric-panel.test.tsx and lib/qa/screendesign-fixtures.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts rubric-scout"
        status: pass
    human_judgment: false
  - id: D4
    description: "Empty Library, Subject Library, and Rubric Scout match their intended dark ScreenDesign compositions at 393x852 without Nexus presentation leakage."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-source-capture.spec.ts and tests/screendesign-visual.spec.ts for all three states"
        status: pass
      - kind: other
        ref: "manual source and app capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and app captures."
  - id: D5
    description: "All plan-owned class states pass exact visual and navigation checks, calm-language audit, type checking, production build, and the complete test suite."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright source, visual, and navigation gates"
        status: pass
      - kind: other
        ref: "npm run tone-audit; npm run typecheck; npm run build; npm run test:run"
        status: pass
    human_judgment: false

duration: 50 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 10: Class Library and Rubric Scout Summary

**The real class count now selects the Empty Library or Subject Library composition, and each class opens an owner-scoped Rubric Scout with factual rubric, syllabus, AI policy, and assignment actions.**

## Performance

- **Duration:** 50 min
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Rebuilt `/classes` as two distinct ScreenDesign compositions selected only by the authenticated owner's class rows.
- Bound subject cards, counts, progress, add-class control, and five-destination navigation to real application data and routes.
- Replaced the old class-detail composition with Rubric Scout using actual rubric parsing, syllabus policies, class AI policy, and assignment ownership.
- Added deterministic real syllabus fixture support and locked three reviewed mobile goldens.

## Task Commits

1. **RED contracts: Class library and Rubric Scout behavior** - `b95fe30`
2. **Task 1: Rebuild the real class library states** - `152738d`
3. **Task 2: Rebuild operational Rubric Scout** - `3c32f67`

## Files Created/Modified

- `app/(app)/classes/page.tsx` - Authenticated owner-scoped class, assignment, and progress loading with honest state selection.
- `app/(app)/classes/my-classes-grid.tsx` - Source-shaped empty and populated library compositions, factual counts, real destinations, and add-class action.
- `app/(app)/classes/[id]/page.tsx` - Owner-scoped class, rubric, syllabus, and open-assignment loading for Rubric Scout.
- `components/rubric-panel.tsx` - Source-shaped operational Rubric Scout with criteria selection, policy-aware Diana help, and real back and assignment actions.
- `lib/qa/screendesign-fixtures.ts` - Canonical real syllabus dependency for Rubric Scout.
- `lib/qa/grayson-demo.ts` - Deterministic class-syllabus seeding and reset support.
- `app/(app)/classes/my-classes-grid.test.tsx` and `components/rubric-panel.test.tsx` - Empty, populated, content, policy, and action contracts.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` - Three reviewed plan-owned goldens.

## Decisions Made

- Used the actual owner-scoped class row count as the only empty versus populated selector. Query flags cannot spoof this state.
- Kept all class, rubric, syllabus, and assignment queries explicitly scoped to the authenticated owner in addition to RLS.
- Kept Diana rubric help behind the existing class AI-policy seam. Yellow and red policies show factual status without an assistance link.
- Seeded a real `class_syllabi` row in the deterministic QA scenario so course-policy evidence remains operational and truthful.

## Deviations from Plan

- Added deterministic `class_syllabi` fixture support because the canonical Rubric Scout requires factual syllabus policies and the shared fixture previously had no syllabus row.
- Added a source-screen skip-link focus correction after the accessibility navigation gate exposed a globally transformed link above the viewport.
- Restarted the stale development listener with `QA_CREATE_USER=true` so deterministic authenticated Playwright evidence could run against the intended test seam.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic snapshot paths shown in the plan.

## Issues Encountered

- The first visual run correctly stopped because the Rubric Scout baseline did not exist. The source and app captures were reviewed before explicit snapshot acceptance.
- An inherited angular clipping rule affected criterion buttons. The screen-local component now explicitly restores the source's rounded card shape.

## Known Stubs

None in the plan-owned routes or actions. Empty collections remain honest, subject cards and add-class controls use real routes and persistence, and Rubric Scout uses actual owner-scoped academic data.

## Verification

- Source capture gate: 3 of 3 passed for `library-empty-state`, `subject-library`, and `rubric-scout` at 393x852.
- Exact app gate: 6 of 6 visual and primary-navigation tests passed for the three plan-owned states.
- Focused unit gate: 3 files and 15 tests passed.
- `npm run typecheck` - passed.
- `npm run tone-audit` - 0 blocking violations; one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` - Next.js production build passed with 78 of 78 static pages generated.
- `npm run test:run` - 140 files and 825 tests passed.
- Live restart - `http://127.0.0.1:3005/login` returned HTTP 200.
- Visual evidence - source and app captures are preserved under `C:\Users\glcar\Diana\test-results\screendesign-review\plan36-10-final`.

## User Setup Required

None. The screens use existing authentication, Supabase records, RLS boundaries, class actions, assignment routes, AI policy, and committed local design assets.

## Next Phase Readiness

- Plan 36-10 is complete and ready for the remaining ScreenDesign route groups.
- The three plan-owned states render no obsolete Nexus composition.
- Plan 36-23 remains responsible for final deletion of obsolete presentation files after all replacements have landed.

## Self-Check: PASSED

- All plan-owned implementation, tests, fixtures, and golden files exist.
- All three implementation and test commits exist in Git history.
- Unit, source, navigation, exact golden, type, tone, production build, complete-suite, and live-runtime gates passed.
- The default class routes render source-owned ScreenDesign compositions instead of Nexus cards, metric lanes, or angular controls.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
