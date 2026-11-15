---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "11"
subsystem: ui
tags: [screendesign, ap, mastery, transcript, canvas, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and five-destination navigation primitives
provides:
  - Source-faithful AP Command Center backed by authenticated plans and attempts
  - Owner-scoped Mastery Tracker backed by concepts, events, classes, and optional Canvas evidence
  - Private mastery transcript with honest evidence labels and a real export handoff
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Server-generated time anchors keep date-derived AP UI stable across SSR and hydration
    - Academic percentages are rendered only when persisted mastery or grade evidence supports them
    - Synthetic LMS connections never trigger remote Canvas requests during deterministic QA

key-files:
  created:
    - app/(app)/ap/ap-client.test.tsx
    - tests/screendesign-reporting-contract.test.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/ap-command-center.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/mastery-tracker.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/mastery-transcript-view.png
  modified:
    - app/(app)/ap/actions.ts
    - app/(app)/ap/ap-client.tsx
    - app/(app)/ap/page.tsx
    - app/(app)/grades/page.tsx
    - app/(app)/grades/transcript/page.tsx
    - lib/qa/grayson-demo.ts

key-decisions:
  - "AP progress and score bands appear only when owner-scoped saved attempts contain valid scored counts."
  - "Mastery, self-confidence, and Canvas grades remain explicitly separate evidence types instead of being collapsed into one score."
  - "The transcript removes source-only GPA, honors, rank, record ID, school, and AI-verification claims and routes export through the existing owner-scoped privacy center."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The AP Command Center renders the authenticated owner's saved exam plans and attempts, calculates score bands server-side, and exposes real plan and practice actions."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/ap/ap-client.test.tsx and lib/ap/command.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts ap-command-center"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Mastery Tracker uses owner-scoped classes, concepts, evidence events, and optional real Canvas reads while labeling mastery and self-confidence independently."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "tests/screendesign-reporting-contract.test.ts and lib/mastery/concepts.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts mastery-tracker"
        status: pass
    human_judgment: false
  - id: D3
    description: "The private transcript derives subject rows from saved mastery or recorded Canvas grades and hands export to the existing owner-scoped privacy export flow without claiming completion early."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "tests/screendesign-reporting-contract.test.ts and lib/grades/insights.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts mastery-transcript-view"
        status: pass
    human_judgment: false
  - id: D4
    description: "AP Command Center, Mastery Tracker, and Mastery Transcript preserve their intended ScreenDesign compositions at 393x852 without Nexus presentation leakage or fabricated source data."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-source-capture.spec.ts and tests/screendesign-visual.spec.ts for all three screens"
        status: pass
      - kind: other
        ref: "manual source and app capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D5
    description: "All plan-owned academic report screens pass exact visual and navigation checks, calm-language audit, type checking, production build, complete unit suite, and live runtime verification."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright visual and navigation gate"
        status: pass
      - kind: other
        ref: "npm run tone-audit; npm run typecheck; npm run build; npm run test:run"
        status: pass
    human_judgment: false

duration: 35 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 11: AP and Mastery Reporting Summary

**AP planning, mastery tracking, and the private transcript now reproduce their canonical ScreenDesign compositions using only authenticated academic evidence and real application destinations.**

## Performance

- **Duration:** 35 min
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Rebuilt `/ap` around owner-scoped exam plans and practice attempts with honest empty states, real plan and attempt forms, server-derived score bands, and stable date calculations.
- Rebuilt `/grades` as the canonical Academic Mastery composition using real concept levels, self-confidence, evidence counts, class routes, and optional Canvas grade context.
- Rebuilt `/grades/transcript` as a private source-shaped academic record without invented GPA, school, honors status, rank, verification, or record identifiers.
- Connected transcript export to the existing owner-scoped privacy export center and locked three reviewed mobile goldens.

## Task Commits

1. **Task 1: Rebuild operational AP Command Center** - `68b2375`
2. **Task 2: Rebuild mastery reports from real evidence** - `a23d611`

## Files Created/Modified

- `app/(app)/ap/page.tsx` - Authenticated owner-scoped AP plan and attempt loader with a stable server time anchor.
- `app/(app)/ap/ap-client.tsx` - Canonical AP composition with factual practice evidence, study-plan navigation, and operational plan/practice workbench.
- `app/(app)/ap/actions.ts` - Validated owner-plan relationship before persisting a practice attempt.
- `app/(app)/grades/page.tsx` - Canonical mastery composition from concepts, events, classes, and optional credentialed Canvas reads.
- `app/(app)/grades/transcript/page.tsx` - Honest private transcript with evidence rows and real export navigation.
- `lib/qa/grayson-demo.ts` - Valid nullable score seeding for unscored AP practice fixtures.
- `app/(app)/ap/ap-client.test.tsx` and `tests/screendesign-reporting-contract.test.ts` - Factual evidence, ownership, shell-removal, and anti-fabrication contracts.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` - Three reviewed plan-owned goldens.

## Decisions Made

- Kept a missing AP score visually empty instead of converting an unscored saved attempt into a percentage or band.
- Passed the server render time into the AP client so days-to-exam and milestone copy cannot disagree during hydration.
- Used the published mastery scale of zero through four for mastery percentages and displayed self-confidence separately.
- Called Canvas only for a credentialed, non-synthetic owner connection. Local mastery evidence still renders when Canvas is absent or temporarily unavailable.
- Treated the existing privacy export center as the truthful transcript-export capability. The transcript button navigates there and does not claim that a PDF already exists.

## Deviations from Plan

- Fixed deterministic AP fixture seeding because the prior unscored attempt used `total_count = 0`, which violated the database constraint. It now persists nullable counts for an honest unscored state.
- Added an explicit owner-plan validation query in the AP practice action to prevent a caller from attaching an attempt to another owner's plan ID.
- Added route-source contract tests to guard owner filters, legacy shell removal, confidence labeling, and removal of fabricated academic claims.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic paths shown in the plan.
- `requirements.mark-complete` could not update the Phase 36 IDs because they are prose sections rather than checkbox records. Plan coverage is recorded here and in the roadmap without falsely closing the broad phase requirements while other plans remain.

## Issues Encountered

- The first AP visual run exposed an SSR/client date mismatch because the browser clock is frozen after the server render. A server-provided ISO time now anchors both date calculations.
- The initial transcript review exposed inherited white heading text on the white transcript paper. Screen-local navy text rules restored the student and subject labels before baseline approval.
- The first exact visual runs correctly stopped because the three baselines did not exist. Source and app captures were reviewed before explicit snapshot acceptance.

## Known Stubs

None in the plan-owned routes or actions. Missing academic data stays visibly empty, Canvas reads are optional and truthful, class details open real routes, and export uses the existing privacy capability.

## Verification

- Source capture gate: 3 of 3 passed at 393x852.
- Exact application gate: 6 of 6 visual and primary-navigation tests passed for all three plan-owned screens.
- Focused academic reporting gate: 3 files and 22 tests passed.
- `npm run typecheck` - passed.
- `npm run tone-audit` - 0 blocking violations; one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` - Next.js production build passed with 77 of 77 static pages generated.
- `npm run test:run` - 142 files and 831 tests passed.
- Live restart - `http://127.0.0.1:3005/login` returned HTTP 200 from listener PID 35704.
- Visual evidence - source and app captures are preserved under `C:\Users\glcar\Diana\test-results\review\36-11-mastery-review1` and `36-11-transcript-review2`.

## User Setup Required

None for local mastery and AP data. Canvas evidence appears only after the student connects a real Canvas account through the existing settings flow.

## Next Phase Readiness

- Plan 36-11 is complete and ready for the remaining ScreenDesign route groups.
- The three plan-owned routes render no obsolete Nexus composition.
- Plan 36-23 remains responsible for final deletion of obsolete presentation files after all replacement screens have landed.

## Self-Check: PASSED

- All plan-owned implementation, tests, fixtures, and golden files exist.
- Both atomic implementation commits exist in Git history.
- Unit, source, navigation, exact golden, type, tone, production build, complete-suite, and live-runtime gates passed.
- The default academic reporting routes render source-owned ScreenDesign compositions instead of Nexus cards, fabricated previews, or generic legacy shells.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
