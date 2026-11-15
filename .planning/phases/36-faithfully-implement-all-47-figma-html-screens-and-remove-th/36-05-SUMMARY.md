---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "05"
subsystem: ui
tags: [screendesign, dashboard, lobby, playwright, responsive, accessibility]

requires:
  - phase: 36-02
    provides: Diana-owned local stadium, athlete, and wordmark assets
  - phase: 36-03
    provides: Deterministic source capture, app visual, and navigation harness
  - phase: 36-04
    provides: Source-faithful viewport, local media, action, and five-nav primitives
provides:
  - Source-faithful authenticated stadium Lobby at /dashboard
  - Real ranked-assignment and attention data adapted into the Lobby hierarchy
  - Reviewed 393x852 dashboard golden plus tablet and desktop safety evidence
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Server-only dashboard records become a minimal serializable Lobby view model
    - Source-specific compositions own hierarchy while shared primitives own only media, actions, viewport, and navigation
    - Visual evidence resets transient keyboard focus before capturing the default reviewed state

key-files:
  created:
    - app/(app)/dashboard/lobby-dashboard.tsx
    - lib/dashboard/lobby-view.ts
    - lib/dashboard/lobby-view.test.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/dashboard-personalized.png
  modified:
    - app/(app)/dashboard/page.tsx
    - app/(app)/dashboard/lobby-background-layer.tsx
    - app/(app)/dashboard/player-photo-slot.tsx
    - app/(app)/dashboard/needs-attention.tsx
    - tests/screendesign-visual.spec.ts

key-decisions:
  - "The dashboard render path now contains only the attached stadium Lobby composition; TodayGamePlan remains orphaned until the repo-wide removal plan deletes obsolete files."
  - "The source's Overdue label is rendered as Due earlier to satisfy Diana's non-negotiable calm-language invariant while preserving factual past-due counts and routes."
  - "The primary Start action uses a semantic anchor because it produced observable route navigation in the deterministic browser harness where the framework Link did not."
  - "The existing background preference contract is narrowed to one canonical stadium option so settings compatibility cannot restore a legacy visual."

patterns-established:
  - "Dashboard view model: adapt authenticated records to display-only strings, counts, tones, and server-derived hrefs before rendering."
  - "Golden capture: finish keyboard accessibility checks, blur the transient focus target, then capture the stable default UI state."

requirements-completed: [P36-FIDELITY, P36-ASSETS, P36-OPERATIONS, P36-QA, P36-REMOVAL]

coverage:
  - id: D1
    description: "Authenticated profile, ranked assignment, reminders, and assignment state produce honest serializable Lobby content with no fabricated records."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/dashboard/lobby-view.test.ts#buildLobbyDashboardView"
        status: pass
      - kind: other
        ref: "npm run test:run"
        status: pass
    human_judgment: false
  - id: D2
    description: "The live /dashboard render path contains the stadium, athlete, Diana wordmark, Lobby heading, one next move, three attention cards, and five-item navigation without the old metric-card game plan."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts dashboard-personalized mobile golden"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-source-capture.spec.ts dashboard-personalized normalized source"
        status: pass
      - kind: other
        ref: "manual source/app image review at 393x852"
        status: pass
    human_judgment: true
  - id: D3
    description: "Primary and attention links use server-derived ids, all five navigation items remain real routes, and larger widths preserve the mobile hierarchy without overflow or hidden keyboard focus."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts dashboard-personalized primary action contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts screendesign-responsive-tablet and screendesign-responsive-desktop"
        status: pass
      - kind: other
        ref: "npm run typecheck; npm run tone-audit; npm run build"
        status: pass
    human_judgment: false

duration: 70 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 05: Stadium Lobby Dashboard Summary

**The authenticated student landing page now uses the separately supplied stadium Lobby composition and real dashboard data, with no Nexus, Mission Control, or metric-card game plan rendered by `/dashboard`.**

## Performance

- **Duration:** 70 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Replaced the live student dashboard hierarchy with the exact stadium, athlete, Diana wordmark, Lobby heading, teal start action, attention stack, and five-item navigation from the supplied source.
- Preserved the authenticated loader, ranked-assignment scorer, learner profile adaptation, task signals, sleep/readiness inputs, dyslexia multiplier, extra-time accommodation, reminders, and explicit done versus submitted semantics.
- Added an honest display-only view model with populated and empty fixtures, stable deep links, and no fake counts or seeded success.
- Locked a reviewed 393x852 golden and proved the same hierarchy has no overflow, console errors, remote requests, or hidden keyboard focus at tablet and desktop widths.

## Task Commits

Task 1 followed RED then GREEN TDD:

1. **Task 1 RED: Define the Lobby view contract** - `8496581` (test)
2. **Task 1 GREEN: Adapt live dashboard data to the Lobby view** - `544c9d8` (feat)
3. **Task 2: Replace the legacy dashboard with the stadium Lobby** - `4dba84d` (feat)
4. **Task 3: Lock reviewed Lobby visual evidence** - `c02afaf` (test)

## Files Created/Modified

- `lib/dashboard/lobby-view.ts` - Minimal serializable profile, next-move, and three-category attention contract.
- `lib/dashboard/lobby-view.test.ts` - Populated and empty fixtures proving real counts, estimates, routes, and fallbacks.
- `app/(app)/dashboard/page.tsx` - Existing authenticated/scored data loader now renders only the new Lobby composition.
- `app/(app)/dashboard/lobby-dashboard.tsx` - Source-specific stadium Lobby hierarchy and responsive presentation.
- `app/(app)/dashboard/lobby-background-layer.tsx` - Canonical local stadium layer with legacy background alternatives removed.
- `app/(app)/dashboard/player-photo-slot.tsx` - Separate local athlete cutout required by the attached composition.
- `app/(app)/dashboard/needs-attention.tsx` - Real linked attention cards shaped like the source.
- `tests/screendesign-visual.spec.ts` - Stable default-state capture after keyboard focus verification.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/dashboard-personalized.png` - Reviewed 393x852 app golden.

## Decisions Made

- Kept all records and scoring server-side, then serialized only the fields the Lobby displays. Supabase RLS and destination loaders remain the ownership boundary.
- Used the canonical athlete cutout for source fidelity instead of restoring the old profile-photo placeholder composition.
- Kept exactly three factual attention categories: upcoming tests, due-earlier open work, and work marked done/exporting but not submitted.
- Kept the shared five-destination navigation so Today, Work, Classes, Calendar, and More remain real reachable routes.

## Deviations from Plan

- The attached source says `OVERDUE`; the implementation says `DUE EARLIER` because the repository's calm-language gate prohibits shame/scolding wording. Counts, descriptions, and href behavior are unchanged.
- The Start control uses a standard semantic anchor instead of the framework Link after the deterministic navigation harness showed the Link click without an observable route transition. The anchor passed the exact navigation contract.
- The configured Playwright snapshot template writes the golden to `tests/__screenshots__/...` rather than the plan's generic `tests/screendesign-visual.spec.ts-snapshots/...` example path.
- The visual harness now blurs the element used during its keyboard-focus sweep before taking the default-state golden. This prevents test instrumentation from becoming part of the accepted design.
- The background settings export remains for compatibility, but its options are narrowed to the one canonical stadium backdrop.

## Issues Encountered

- Global application heading rules initially overrode the source typography and tracking. Screen-scoped selector specificity restored the attached hierarchy without affecting other routes.
- A transitioning skip link briefly occupied the visual canvas after the focus sweep. The dashboard disables that transition and the harness clears transient focus before capture.
- The old `today-game-plan.tsx` implementation still exists as an unreferenced file. It is absent from the `/dashboard` import and render path; Plan 36-23 owns repo-wide obsolete-file deletion.

## Known Stubs

None in the plan-owned implementation. Empty dashboard records render honest zero states and safe creation/list routes.

## Verification

- `npx vitest run lib/dashboard/lobby-view.test.ts` - 2 tests passed.
- `node scripts/run-verified-commands.mjs --env SCREEN_IDS=dashboard-personalized -- npm run typecheck --next npx playwright test tests/screendesign-navigation.spec.ts --project=screendesign-mobile` - typecheck and exact primary navigation passed.
- `npx playwright test tests/screendesign-source-capture.spec.ts --project=screendesign-source` - normalized attached source capture passed with local-only requests.
- `npx playwright test tests/screendesign-visual.spec.ts --project=screendesign-mobile` - reviewed 393x852 golden passed.
- Responsive visual harness - tablet and desktop projects passed overflow, focus, local-request, and console checks.
- `npm run tone-audit` - 0 violations across 428 files.
- `npm run build` - production build passed with `/dashboard` included.
- `npm run test:run` - 136 files and 818 tests passed.
- Legacy render-path scan - the only `TodayGamePlan` result is its orphaned component definition; `/dashboard/page.tsx` has no old composition import or render reference.
- Live restart - `http://127.0.0.1:3005/login` returned 200 after the final build.

## User Setup Required

None. The implementation uses existing authenticated data and committed local assets.

## Next Phase Readiness

- The most visible student landing page is source-faithful and operational, ready for the remaining 46 ScreenDesign states to connect through the same fixture and evidence contracts.
- Plan 36-23 must delete the now-orphaned legacy dashboard files and other obsolete visual-system code after all replacement screens land.

## Self-Check: PASSED

- All plan-owned implementation, test, and golden files exist.
- All four task and TDD commits exist in Git history.
- Unit, navigation, source, exact golden, responsive, type, tone, production build, and full-suite evidence passed.
- `/dashboard` imports and renders no Nexus, Mission Control, TodayGamePlan, or legacy metric-card composition.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
