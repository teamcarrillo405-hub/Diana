---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "08"
subsystem: ui
tags: [screendesign, assignments, submission, ai-policy, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, and navigation harness
  - phase: 36-04
    provides: Source-faithful viewport, action, and five-nav primitives
provides:
  - Source-faithful operational assignment cockpit at /assignments/[id]
  - Explicit review and submit checkpoint that preserves done versus submitted
  - Server-gated task breakdown with accepted-only step persistence
  - Three reviewed 393x852 assignment-flow goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Source-owned compositions override legacy application theme rules at the screen boundary
    - AI-generated assignment steps remain proposals until explicit student acceptance
    - Assignment mutations repeat owner scoping even when route loaders already authorize the record

key-files:
  created:
    - app/(app)/assignments/[id]/assignment-cockpit.tsx
    - app/(app)/assignments/[id]/assignment-cockpit.test.tsx
    - app/(app)/assignments/[id]/submit/submit-checkpoint.test.tsx
    - app/(app)/break-down/break-down-client.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/assignment-detail.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/review-submit-checkpoint.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/task-breakdown-modal.png
  modified:
    - app/(app)/assignments/[id]/page.tsx
    - app/(app)/assignments/[id]/actions.ts
    - app/(app)/assignments/[id]/ai-tools-actions.ts
    - app/(app)/assignments/[id]/homework-mission.tsx
    - app/(app)/assignments/[id]/submit/page.tsx
    - app/(app)/assignments/[id]/submit/checklist.tsx
    - app/(app)/break-down/page.tsx
    - app/(app)/break-down/break-down-client.tsx
    - app/screendesign.css
    - lib/qa/screendesign-fixtures.ts

key-decisions:
  - "The default assignment route renders only the ScreenDesign cockpit; the older full subject workspace remains available only through the explicit workspace query state until Plan 36-23 removes obsolete presentation code."
  - "Task breakdown generation returns a proposal and persists no steps until the authenticated student selects Use these steps."
  - "Submission accepts only the exporting to submitted transition and renders an immediate local confirmation state after the mutation."
  - "Source-owned controls use high-specificity screen resets so legacy Diana application button and card rules cannot reintroduce the Nexus presentation."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The assignment detail route renders the canonical timer cockpit with real assignment, checklist, lifecycle, note, timer, AI-policy, and navigation behavior."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/assignments/[id]/assignment-cockpit.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts assignment-detail"
        status: pass
      - kind: other
        ref: "npm run test:run"
        status: pass
    human_judgment: false
  - id: D2
    description: "The review checkpoint requires explicit student confirmation, keeps done distinct from submitted, and task breakdown persists generated steps only after acceptance under server-effective AI policy."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/assignments/[id]/submit/submit-checkpoint.test.tsx"
        status: pass
      - kind: unit
        ref: "app/(app)/break-down/break-down-client.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts review-submit-checkpoint and task-breakdown-modal"
        status: pass
      - kind: other
        ref: "npx vitest run assignment, breakdown, AI safety, and teacher AI policy suites"
        status: pass
    human_judgment: false
  - id: D3
    description: "Assignment detail, submit checkpoint, and task breakdown match their intended dark ScreenDesign compositions at 393x852 without legacy angular theme leakage."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts three reviewed mobile goldens"
        status: pass
      - kind: other
        ref: "manual source and app side-by-side review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Visual fidelity approval includes human judgment after deterministic source and app captures."
  - id: D4
    description: "The three assignment-flow routes pass exact visual and navigation checks, calm-language audit, type checking, production build, and the complete test suite."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright visual and navigation gate"
        status: pass
      - kind: other
        ref: "npm run tone-audit; npm run typecheck; npm run build; npm run test:run"
        status: pass
    human_judgment: false

duration: 45 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 08: Assignment Lifecycle Screens Summary

**The assignment detail, review checkpoint, and task breakdown now use their ScreenDesign compositions with real owner-scoped state, explicit submission, and accepted-only AI step persistence.**

## Performance

- **Duration:** 45 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 17

## Accomplishments

- Replaced the default assignment detail presentation with the source timer cockpit while preserving real checklist, timer, note, lifecycle, AI-policy, and destination behavior.
- Rebuilt the review checkpoint around factual assignment, checklist, and time-log data, with an explicit exporting to submitted confirmation.
- Rebuilt task breakdown as a source-shaped operational state where server-effective green AI policy permits generation and only accepted steps persist.
- Removed legacy angular button, card, and app-gutter leakage from the three source-owned screens and locked three reviewed mobile goldens.

## Task Commits

1. **Task 1 RED: Define assignment cockpit lifecycle contract** - `2a872fc`
2. **Task 1 GREEN: Rebuild assignment detail as source cockpit** - `6d97109`
3. **Task 2 RED: Define submit and breakdown acceptance contracts** - `9c1aeab`
4. **Task 2 GREEN: Connect submit and breakdown source flows** - `9a885d9`
5. **Task 3: Lock reviewed assignment flow visuals** - `1df0d1d`

## Files Created/Modified

- `app/(app)/assignments/[id]/assignment-cockpit.tsx` - Canonical timer, drills, coach, and bottom-navigation assignment composition.
- `app/(app)/assignments/[id]/page.tsx` - Authenticated owner-scoped loader and source cockpit route ownership.
- `app/(app)/assignments/[id]/actions.ts` - Owner-scoped lifecycle, checklist, and step mutations.
- `app/(app)/assignments/[id]/ai-tools-actions.ts` - Server-effective AI mode, proposal generation, and accepted-only persistence.
- `app/(app)/assignments/[id]/submit/page.tsx` - Owner-scoped review data and valid submission-state guard.
- `app/(app)/assignments/[id]/submit/checklist.tsx` - Source checkpoint controls and explicit confirmation behavior.
- `app/(app)/break-down/page.tsx` - Authenticated assignment loader for the breakdown state.
- `app/(app)/break-down/break-down-client.tsx` - Source breakdown composition, generation, acceptance, and optimistic step toggles.
- `app/screendesign.css` - Screen-specific source fidelity and legacy-theme isolation.
- `lib/qa/screendesign-fixtures.ts` - Deterministic lifecycle fixtures for all three states.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` - Three reviewed assignment-flow goldens.

## Decisions Made

- Preserved every authorization boundary and added explicit owner filters to plan-owned assignment mutations.
- Kept AI policy authority on the server. Client-supplied policy values do not grant breakdown generation.
- Kept generated steps transient until the student accepts them, then logged the accepted breakdown as authorship evidence.
- Kept the older subject workspace behind `?workspace=1&start=1` only to preserve its operational tools during the staged 47-screen replacement. It is not the default assignment design.

## Deviations from Plan

- The normalized captures for the review checkpoint and task breakdown rendered white because their raw exports depend on source styling that does not survive normalization. The implementation follows the intended dark raw HTML composition and was reviewed directly against that source structure.
- The submit client renders a local submission-confirmed acknowledgement immediately after the successful mutation. This avoids a shared-layout hydration race while preserving the same server transition and reload guard.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic snapshot path shown in the plan.

## Issues Encountered

- Legacy global `.diana-app button` and card rules initially overrode source controls, producing the angular Nexus-like appearance the replacement must eliminate. High-specificity source-screen resets now isolate these three compositions, and the reviewed captures confirm the correction.
- The raw review and breakdown exports needed direct structural review because normalized source capture omitted their intended dark styling.

## Known Stubs

None in the plan-owned routes or action contracts. Empty or missing records render factual states, and no new backend endpoint or security bypass was introduced.

## Verification

- Combined exact gate: 6 of 6 Playwright visual and navigation tests passed for `assignment-detail`, `review-submit-checkpoint`, and `task-breakdown-modal`.
- `npm run tone-audit` - 0 violations across 429 files.
- Focused assignment, submit, breakdown, parser, teacher AI-policy, and AI-safety suites - 31 of 31 tests passed.
- `npm run typecheck` - passed.
- `npm run build` - Next.js production build passed with 78 of 78 static pages generated.
- `npm run test:run` - 139 files and 822 tests passed.
- Live restart - `http://127.0.0.1:3005/login` returned HTTP 200 with the final build running.
- Visual evidence - source baselines and approved app captures are preserved under `C:\Users\glcar\AppData\Local\Temp\diana-36-08-review`.

## User Setup Required

None. The screens use existing authenticated records, Supabase policies, assignment actions, and committed local assets.

## Next Phase Readiness

- Plan 36-08 is complete and ready for the remaining ScreenDesign route groups.
- Plan 36-23 still owns final deletion of the legacy presentation files after all replacement screens land; none of that presentation is used by the default plan-owned routes.

## Self-Check: PASSED

- All plan-owned implementation, test, and golden files exist.
- All five task and TDD commits exist in Git history.
- Unit, navigation, exact golden, type, tone, production build, and complete-suite gates passed.
- The three default routes render no Nexus composition, metric-card shell, or legacy angular controls.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
