---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "09"
subsystem: ui
tags: [screendesign, inbox, assignments, quick-add, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, and navigation harness
  - phase: 36-04
    provides: Source-faithful viewport, action, media, and five-nav primitives
provides:
  - Source-faithful operational inbox triage at /inbox and /inbox/[id]
  - Real assignment lifecycle Mission Board at /assignments
  - Validated text, voice, and photo capture flow at /quick-add
  - Three reviewed 393x852 capture-and-work goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Source-owned compositions isolate legacy application theme rules at the screen boundary
    - Quick Add persists a real owner-scoped inbox item before routing to its triage state
    - Mission Board derives visible work from authenticated ranked assignment lifecycle data

key-files:
  created:
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/inbox-triage.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/mission-board.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/quick-add.png
  modified:
    - app/(app)/inbox/page.tsx
    - app/(app)/inbox/[id]/page.tsx
    - app/(app)/inbox/[id]/confirm-form.tsx
    - app/(app)/inbox/[id]/actions.ts
    - app/(app)/assignments/page.tsx
    - app/(app)/quick-add/page.tsx
    - app/(app)/quick-add/capture-form.tsx
    - app/(app)/quick-add/actions.ts
    - app/screendesign.css
    - tests/screendesign-navigation.spec.ts

key-decisions:
  - "Inbox list confirmation accepts the already owner-scoped suggestion into classified review state; assignment creation remains behind the detailed student confirmation step."
  - "Quick Add preserves the source mode-selection screen and the navigation harness follows a real multi-step text capture before invoking Add item."
  - "Mission Board uses live ranked lifecycle records and source hierarchy instead of the obsolete metric-lane presentation."
  - "Design imagery is local; an owner-scoped captured photo may use a short-lived signed storage URL because it is user data, not a design dependency."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Inbox list and selected-item states render real owner-scoped captures, persist classification edits, and create assignments only after explicit confirmation."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/inbox/queue.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts inbox-triage"
        status: pass
      - kind: other
        ref: "npm run test:run"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mission Board renders authenticated ranked assignment data with valid status distinctions and real destinations for cards, review, search, and capture actions."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/assignments/[id]/assignment-cockpit.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts mission-board"
        status: pass
    human_judgment: false
  - id: D3
    description: "Quick Add validates text, voice, and photo inputs, preserves offline queue behavior, stores a real inbox record, and routes to that record's triage state."
    requirement: P36-OPERATIONS
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts quick-add"
        status: pass
      - kind: other
        ref: "npm run typecheck and npm run build"
        status: pass
    human_judgment: false
  - id: D4
    description: "Inbox Triage, Mission Board, and Quick Add match their intended dark ScreenDesign compositions at 393x852 without legacy Nexus visual leakage."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts three reviewed mobile goldens"
        status: pass
      - kind: other
        ref: "manual source-structure and app-capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Visual fidelity approval includes human judgment after deterministic source and app captures."
  - id: D5
    description: "All three plan-owned screens pass exact visual and navigation checks, calm-language audit, type checking, production build, and the complete test suite."
    requirement: P36-QA
    verification:
      - kind: automated_ui
        ref: "combined three-screen Playwright visual and navigation gate"
        status: pass
      - kind: other
        ref: "npm run tone-audit; npm run typecheck; npm run build; npm run test:run"
        status: pass
    human_judgment: false

duration: 55 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 09: Capture and Work Board Summary

**Inbox Triage, Mission Board, and Quick Add now use their ScreenDesign compositions with real owner-scoped persistence, assignment lifecycle data, and validated capture behavior.**

## Performance

- **Duration:** 55 min
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Rebuilt Inbox Triage around real captured items, source-shaped selected and empty states, and authenticated classification and confirmation actions.
- Replaced the assignment list with the source Mission Board while retaining real ranking, lifecycle status, due context, and card destinations.
- Rebuilt Quick Add as the source mode selector and operational text, voice, and photo editor with offline queue preservation and exact post-save routing.
- Added stricter owner-path, MIME, size, and mode validation for capture uploads and locked three reviewed mobile goldens.

## Task Commits

1. **Task 1: Rebuild operational Inbox Triage** - `b731233`
2. **Task 2: Rebuild the real Mission Board** - `6aefa46`
3. **Task 3: Rebuild validated Quick Add capture** - `e7df975`
4. **Visual QA: Lock reviewed capture and work visuals** - `0b7b20f`

## Files Created/Modified

- `app/(app)/inbox/page.tsx` - Source-shaped list, selected item, classified confirmation, collapsed records, and factual empty state.
- `app/(app)/inbox/[id]/page.tsx` - Authenticated selected-capture review composition with owner-scoped media.
- `app/(app)/inbox/[id]/confirm-form.tsx` - Editable class, type, date, convert, and dismiss actions.
- `app/(app)/inbox/[id]/actions.ts` - Validated owner-scoped classify, confirmation, assignment creation, and dismiss mutations.
- `app/(app)/assignments/page.tsx` - Ranked real-data Mission Board with lifecycle status and valid destinations.
- `app/(app)/quick-add/page.tsx` - Source Quick Add route ownership.
- `app/(app)/quick-add/capture-form.tsx` - Mode selector, capture editors, local mascot, offline queue, and exact post-save routing.
- `app/(app)/quick-add/actions.ts` - Authenticated input and upload validation with safe storage keys.
- `app/screendesign.css` - Source-specific capture, triage, Mission Board, and legacy-theme isolation styles.
- `tests/screendesign-navigation.spec.ts` - Real multi-step Quick Add persistence and reliable client-navigation assertions.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` - Three reviewed plan-owned goldens.

## Decisions Made

- Kept inbox classification separate from assignment creation. The list action confirms the suggestion, while selected-item review owns editable assignment conversion.
- Kept Quick Add's mode picker as the default source state and exercised the full text flow in the operational test instead of fabricating an Add item button on the picker.
- Kept Mission Board data factual and owner-scoped, including the distinction between done and submitted.
- Kept design assets local. Only authenticated user media uses a short-lived signed storage URL.

## Deviations from Plan

- Normalized source captures for Inbox Triage and Quick Add omit parts of their dark styling. The implementation follows the intended raw HTML structure and was reviewed directly against that structure and the app captures, consistent with the established Plan 36-08 evidence approach.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic snapshot path shown in the plan.
- Quick Add upload validation was strengthened while the touched trust boundary was open: storage keys must belong to the authenticated owner, photo mode requires a supported image under 10 MB, and non-photo modes reject storage references.
- The shared navigation harness now performs the actual Quick Add mode-selection and text-entry steps and waits for client route transitions before asserting destinations.

## Issues Encountered

- The first app evidence run correctly stopped because the three visual baselines did not yet exist. Captures were manually reviewed before explicitly creating the goldens.
- The initial navigation run exposed a global skip link in focus checks and a race between click completion and Next.js client navigation. Source-screen focus isolation and explicit URL waits corrected both without weakening the assertions.

## Known Stubs

None in the plan-owned routes or actions. Empty collections render honest states, and all primary controls have working destinations or owner-scoped mutations.

## Verification

- Combined exact gate: 6 of 6 Playwright visual and navigation tests passed for `inbox-triage`, `mission-board`, and `quick-add`.
- `npm run tone-audit` - 0 blocking violations; one advisory warning for the source label `NEXT DEADLINE`.
- Focused inbox queue and assignment cockpit suites - 6 of 6 tests passed.
- `npm run typecheck` - passed.
- `npm run build` - Next.js production build passed with 78 of 78 static pages generated.
- `npm run test:run` - 139 files and 822 tests passed.
- Live restart - `http://127.0.0.1:3005/login` returned HTTP 200 with title `Diana`.
- Visual evidence - source references and approved app captures are preserved under `C:\Users\glcar\AppData\Local\Temp\diana-36-09-review`.

## User Setup Required

None. The routes use existing authentication, Supabase records, RLS boundaries, storage, assignment actions, and committed local design assets.

## Next Phase Readiness

- Plan 36-09 is complete and ready for the remaining ScreenDesign route groups.
- The three default plan-owned routes render no obsolete Nexus composition.
- Plan 36-23 remains responsible for final deletion of obsolete presentation files after every replacement screen has landed.

## Self-Check: PASSED

- All plan-owned implementation, test, and golden files exist.
- All four implementation and visual-QA commits exist in Git history.
- Unit, navigation, exact golden, type, tone, production build, complete-suite, and live runtime gates passed.
- The default routes render source-owned ScreenDesign compositions instead of Nexus cards, metric lanes, or angular controls.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
