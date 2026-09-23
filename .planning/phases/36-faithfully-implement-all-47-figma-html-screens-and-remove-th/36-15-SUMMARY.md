---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "15"
subsystem: ui
tags: [screendesign, mastery, knowledge-graph, insights, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and local ScreenDesign media primitives
provides:
  - Source-faithful Concept Deep Dive backed by owner-scoped mastery, confidence, class, and practice evidence
  - Keyboard-accessible Knowledge Graph backed by real concepts, class relationships, and mastery events
  - Interactive Progress Insights derived from owner-scoped assignments, focus logs, and private activity
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - ScreenDesign evidence surfaces replace inherited shell compositions while preserving authenticated server loaders
    - Academic evidence, student confidence, and grades remain explicitly separate concepts
    - Private analytics are reduced to calm student-facing aggregates before serialization

key-files:
  created:
    - components/screen-design/progress-insights.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/concept-deep-dive.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/knowledge-graph.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/progress-insights.png
  modified:
    - app/(app)/concepts/[id]/page.tsx
    - app/(app)/knowledge-graph/page.tsx
    - app/(app)/insights/page.tsx
    - app/(app)/insights/insights-client.tsx

key-decisions:
  - "Mastery events are the only evidence used for concept mastery; student confidence is displayed separately and never presented as a class grade."
  - "Knowledge Graph connections are derived from authenticated class membership and concept evidence rather than invented semantic relationships."
  - "Progress Insights derives its evidence mix and trend from private assignments, focus logs, and activity events and labels the result as not a grade."
  - "Each route renders its canonical ScreenDesign viewport directly and contains no Nexus presentation."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Concept Deep Dive renders real owner-scoped mastery evidence, confidence, timeline, class context, and operational graph and practice links."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/mastery/concepts.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts concept-deep-dive"
        status: pass
    human_judgment: false
  - id: D2
    description: "Knowledge Graph renders owner-scoped concept nodes and real class-derived connections with keyboard-operable pan, detail, and deep-link alternatives."
    requirement: P36-OPERATIONS
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts knowledge-graph"
        status: pass
      - kind: integration
        ref: "tablet and desktop ScreenDesign accessibility, overflow, console, and local-request gates"
        status: pass
    human_judgment: false
  - id: D3
    description: "Progress Insights uses owner-scoped assignments, focus logs, and activity events for interactive 7-day and 28-day focus, work, and activity views with calm quiet-period explanations."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/grades/insights.test.ts and components/screen-design/progress-insights.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts progress-insights"
        status: pass
    human_judgment: false
  - id: D4
    description: "Concept Deep Dive, Knowledge Graph, and Progress Insights preserve their canonical 393x852 compositions without Nexus presentation leakage."
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
    description: "All plan-owned screens pass visual, navigation, responsive accessibility, focused and complete unit suites, type checking, tone audit, production build, and live-runtime verification."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen mobile, tablet, and desktop Playwright gates"
        status: pass
      - kind: integration
        ref: "npm run test:run; npm run typecheck; npm run tone-audit; npm run build"
        status: pass
      - kind: manual_procedural
        ref: "fresh localhost:3005 listener, login, and authenticated seed HTTP checks"
        status: pass
    human_judgment: false

duration: 64 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 15: Learning Evidence Surfaces Summary

**Concept Deep Dive, Knowledge Graph, and Progress Insights now match their canonical ScreenDesign compositions while displaying only real, owner-scoped learning evidence.**

## Performance

- **Duration:** 64 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Rebuilt `/concepts/[id]` around authenticated concept evidence, class context, separate self-confidence, practice routes, and a real event timeline.
- Rebuilt `/knowledge-graph` as a navigable evidence map with real concept nodes, class-derived connections, keyboard alternatives, reduced-motion-safe scrolling, and honest empty states.
- Rebuilt `/insights` as the canonical Season Stats composition using private assignment, focus-time, and activity records with operational range and metric controls.
- Removed inherited Nexus shell presentation from all three routes and locked three manually reviewed mobile goldens.

## Task Commits

1. **Task 1: Rebuild Concept Deep Dive:** `18323eb`
2. **Task 2: Rebuild the navigable Knowledge Graph:** `c83957b`
3. **Task 3: Rebuild Progress Insights with real trends:** `79e6ef4`

## Files Created/Modified

- `app/(app)/concepts/[id]/page.tsx` owns the source-shaped concept evidence view and explicit owner-scoped concept, event, and flashcard reads.
- `app/(app)/knowledge-graph/page.tsx` derives keyboard-accessible nodes and connections from the authenticated student's concepts, classes, and mastery events.
- `app/(app)/insights/page.tsx` reduces owner-scoped assignments, time logs, and private analytics into student-facing trend inputs.
- `app/(app)/insights/insights-client.tsx` renders the interactive source-shaped range, metric, bar chart, evidence mix, trajectory, and underlying evidence links.
- `components/screen-design/progress-insights.test.tsx` verifies the range and metric interactions and operational primary evidence link.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the three reviewed application goldens.

## Decisions Made

- Mastery evidence, student confidence, and class grades remain separate. Confidence is explicitly marked as self-reported, and evidence mix is explicitly marked as not a grade.
- Knowledge Graph edges represent real shared class context. The app does not invent causal or semantic relationships that the database does not contain.
- Quiet activity periods use factual week-over-week language without guilt, streak, leaderboard, or hustle framing.
- Evidence links target existing assignment, class, graph, portfolio, and flashcard routes. Missing evidence uses source-shaped empty states rather than demo values.
- No route reuses or recreates the Nexus presentation. Each renders its canonical ScreenDesign viewport directly.

## Deviations from Plan

- Added `components/screen-design/progress-insights.test.tsx` to prove that range and metric controls update the real derived display rather than static demo values.
- Updated each plan-owned route's local focus styling after the accessibility harness exposed a hidden skip-link focus position during initial implementation.
- Restarted the local server with `QA_CREATE_USER=true` because the previously running process had synthetic fixture bootstrap disabled.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic paths shown in the plan.
- Tablet and desktop projects were verified sequentially after a parallel two-project run collided while resetting the shared synthetic owner; both sequential gates passed completely.

## Issues Encountered

- Each first visual run correctly stopped because its baseline did not yet exist. Every source and application capture was inspected before the corresponding golden was explicitly accepted.
- A combined tablet and desktop run produced a synthetic-auth race and redirected one worker to login. The same projects passed 3 of 3 each when run sequentially, confirming no route or focus defect.

## Known Stubs

None in the plan-owned production routes. Stub, obsolete-shell, placeholder, and remote-asset scans found no matches.

## Security and Privacy

- Concept reads authenticate the current user and filter concepts, mastery events, and flashcards by `owner_id`.
- Knowledge Graph reads authenticate the current user and filter concepts and mastery events by `owner_id`; destination concept loaders revalidate ownership.
- Insights reads authenticate the current user and filter assignments, time logs, and analytics events by `owner_id`, then serialize only displayed aggregates.
- The visual harness confirmed zero remote requests, zero console errors, zero page errors, and no synthetic identifiers in visible output.

## Verification

- Combined mobile application gate: 6 of 6 reviewed visual and primary-navigation tests passed.
- Responsive application gates: tablet 3 of 3 and desktop 3 of 3 passed for focus visibility, overflow, local-only requests, and runtime errors.
- Focused mastery and insights gate: 3 files and 20 tests passed.
- `npm run typecheck` passed.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- `npm run test:run` passed 145 files and 838 tests.
- Fresh runtime: listener PID 51364 serves `http://127.0.0.1:3005`; `/login` and the authenticated `progress-insights:default` seed returned HTTP 200.
- `git diff --check` passed, and every private route query includes explicit authenticated ownership filters.

## User Setup Required

None beyond Diana's existing Supabase configuration.

## Next Phase Readiness

- Plan 36-15 is complete and ready for the remaining ScreenDesign route groups.
- The three plan-owned routes render no obsolete Nexus composition.
- Plan 36-23 remains responsible for deleting obsolete presentation files after every replacement screen has landed.

## Self-Check: PASSED

- All plan-owned implementation, focused tests, owner-scoped data seams, and reviewed goldens exist.
- Three atomic task commits exist in Git history.
- Visual, navigation, responsive accessibility, focused behavior, complete-suite, type, tone, production build, threat/stub, and live-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
