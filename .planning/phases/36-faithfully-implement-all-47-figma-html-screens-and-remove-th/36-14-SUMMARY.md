---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "14"
subsystem: ui
tags: [screendesign, focus-timer, calendar, goals, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and local ScreenDesign media primitives
provides:
  - Source-faithful immersive focus session backed by the calm timer state machine and owner-scoped time logs
  - Owner-scoped monthly study calendar with imported context, accommodation-aware workload, and real assignment links
  - Persistent study-goal wizard that confirms success only after the authenticated server write completes
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - ScreenDesign compositions replace the inherited app shell while retaining existing authenticated server seams
    - Client controls retain calm local state until owner-scoped mutations succeed
    - Calendar workload is derived from authenticated assignments and profile accommodations instead of display fixtures

key-files:
  created:
    - app/(app)/timer/actions.ts
    - app/(app)/settings/goals/goal-wizard.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/focus-session-immersive.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/study-calendar.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/study-goal-wizard.png
  modified:
    - app/(app)/timer/page.tsx
    - app/(app)/timer/timer-ui.tsx
    - app/(app)/timer/timer-ui.test.tsx
    - app/(app)/calendar/page.tsx
    - app/(app)/settings/goals/page.tsx
    - app/(app)/settings/goals/goal-wizard.tsx
    - app/(app)/wellness/actions.ts
    - app/screendesign.css

key-decisions:
  - "Focus persistence uses authenticated assignment_time_log records while the existing useTimer state machine remains the only timer-state authority."
  - "The calendar anchors its initial month to the earliest real scheduled assignment when no month is requested, keeping sparse and deterministic data useful without inventing events."
  - "Goal submission uses a normal prevented form submit so a calm server error cannot reset the student's selected grade, date, or availability."
  - "Source fidelity is implemented with route-scoped ScreenDesign compositions; the obsolete Nexus shell is not rendered by any plan-owned route."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The immersive Focus Session renders the canonical ring, assignment context, ambient controls, reward, break, and completion states while writing owner-scoped focus time."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/timer/timer.test.ts and app/(app)/timer/timer-ui.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts focus-session-immersive"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Study Calendar shows authenticated assignments, import context, effective workload, selected dates, month navigation, and links to real assignment owners."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/calendar/week.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts study-calendar"
        status: pass
    human_judgment: false
  - id: D3
    description: "The Study Goal Wizard preserves student selections, validates through the existing private action, persists the goal, and displays success only after the write succeeds."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/settings/goals/goal-wizard.test.tsx and lib/wellness/health.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts study-goal-wizard save and reload action"
        status: pass
    human_judgment: false
  - id: D4
    description: "Focus Session, Study Calendar, and Study Goal Wizard preserve their canonical 393x852 compositions without Nexus presentation leakage."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts for all three screens"
        status: pass
      - kind: other
        ref: "manual source and application capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D5
    description: "All plan-owned screens pass combined visual and action checks, focused and complete unit suites, type checking, tone audit, production build, and fresh-runtime verification."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright visual and navigation gate"
        status: pass
      - kind: integration
        ref: "npm run test:run; npm run typecheck; npm run tone-audit; npm run build"
        status: pass
      - kind: manual_procedural
        ref: "fresh localhost:3005 listener and HTTP route checks"
        status: pass
    human_judgment: false

duration: 30 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 14: Focus, Calendar, and Goal Planning Summary

**Focus, calendar, and goal-planning routes now match their canonical ScreenDesign compositions while retaining real owner-scoped timing, assignment, accommodation, and goal data.**

## Performance

- **Duration:** 30 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Rebuilt `/timer` as the immersive focus composition with the existing calm state machine, reduced-motion and hidden-countdown preferences, adaptive break and reward controls, and authenticated time-log writes.
- Rebuilt `/calendar` as the canonical monthly study schedule using real owner assignments, import context, selected-day links, period navigation, and accommodation-adjusted workload.
- Rebuilt `/settings/goals` as the canonical study-goal wizard with durable private persistence, post-write confirmation, calm error handling, and preserved choices.
- Removed the inherited Nexus shell composition from all three plan-owned routes and locked three manually reviewed mobile goldens.

## Task Commits

1. **Task 1: Rebuild the immersive Focus Session:** `145b6a1`
2. **Task 2: Rebuild Study Calendar with real work:** `5bcc747`
3. **Task 3: Rebuild and persist Study Goal Wizard:** `d69f619`

## Files Created/Modified

- `app/(app)/timer/actions.ts` starts and finishes owner-scoped assignment time logs.
- `app/(app)/timer/page.tsx`, `timer-ui.tsx`, and `timer-ui.test.tsx` own the source-shaped operational focus experience and its calm-state contract.
- `app/(app)/calendar/page.tsx` derives its calendar grid and workload from authenticated assignments and profile accommodations.
- `app/(app)/settings/goals/page.tsx` loads the latest private goal and owns the source-shaped goal route.
- `app/(app)/settings/goals/goal-wizard.tsx` and `goal-wizard.test.tsx` implement and verify post-write confirmation and choice preservation.
- `app/(app)/wellness/actions.ts` revalidates the canonical goal route after a successful save.
- `app/screendesign.css` defines the three route-scoped mobile compositions and suppresses inherited chrome on those routes.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the three reviewed application goldens.

## Decisions Made

- The existing `useTimer` union remains the single focus-state source. New actions only persist authenticated session boundaries and do not create competing timer states.
- The calendar opens the month containing the earliest real scheduled assignment when the URL has no requested month, then uses explicit query parameters for prior and next navigation.
- Imported assignment context and accommodation-adjusted duration are displayed only when backed by owner data. Empty dates stay factual and calm.
- The goal form prevents native action reset so a rejected write does not erase the student's current selections. Success replaces the form only after `saveWellnessGoal` returns `ok`.
- No route reuses or recreates the Nexus presentation. Each renders its canonical ScreenDesign viewport directly.

## Deviations from Plan

- Added `app/(app)/timer/actions.ts` because the visual timer needed real owner-scoped start and finish persistence rather than client-only controls.
- Updated the timer and goal route loaders, focused component tests, and the shared ScreenDesign stylesheet because the canonical compositions and authenticated data seams span beyond the three files listed in the plan header.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic paths shown in the plan.
- `requirements.mark-complete` is attempted through GSD metadata, but the Phase 36 requirements are broad phase records shared by remaining plans and must not be falsely closed early if the tracker declines the update.

## Issues Encountered

- The first goal unit run exposed that React form-action reset behavior could discard a selected grade after a rejected write. The wizard now prevents native submission and calls the existing server action explicitly; the preservation test passes.
- The first exact goal visual run correctly stopped because no baseline existed. The source and app pair was inspected before the golden was explicitly accepted, then the visual and primary-action checks passed twice.

## Known Stubs

None in the plan-owned production routes or actions. The only `mock` references are isolated server-action mocks in component tests, and the focus reward placeholder is live input guidance.

## Security and Privacy

- Timer reads and writes authenticate the current user, verify assignment ownership, and filter open time logs by `owner_id`.
- Calendar reads authenticate the current user and filter assignments by `owner_id`; profile accommodations are read only for that authenticated profile.
- Goal reads filter by `owner_id`, and goal writes authenticate before inserting with the authenticated owner ID and existing server validation.
- A plan-owned stub and Nexus scan found no obsolete Nexus presentation or production fixture path.

## Verification

- Combined application gate: 6 of 6 visual and primary-navigation tests passed for all three plan-owned screens.
- Focused behavior gate: 5 test files and 32 tests passed.
- `npm run typecheck` passed.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- `npm run test:run` passed 144 files and 836 tests.
- Fresh runtime: listener PID 12156 serves `http://127.0.0.1:3005`; `/login` returned HTTP 200 and all three protected routes returned the expected HTTP 307 authenticated redirect.
- Visual evidence is preserved under `C:\Users\glcar\Diana\test-results\screendesign-review\36-14-*`.

## User Setup Required

None beyond Diana's existing Supabase configuration.

## Next Phase Readiness

- Plan 36-14 is complete and ready for the remaining ScreenDesign route groups.
- The three plan-owned routes render no obsolete Nexus composition.
- Plan 36-23 remains responsible for deleting obsolete presentation files after every replacement screen has landed.

## Self-Check: PASSED

- All plan-owned implementation, tests, real action seams, and reviewed goldens exist.
- Three atomic task commits exist in Git history.
- Visual, navigation, focused behavior, complete-suite, type, tone, production build, threat/stub, and live-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
