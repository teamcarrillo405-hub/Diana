---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "25"
subsystem: route-loading-ui
tags: [screendesign, suspense, nextjs, accessibility, playwright, reduced-motion]

requires:
  - phase: 36-03
    provides: Deterministic 393x852 visual and primary-action evidence harness
  - phase: 36-04
    provides: Source viewport and typed local media primitives
provides:
  - Canonical semantic Smart Loading composition for authenticated App Router suspense
  - Four bounded route loading owners with generic route-safe labels
  - Controlled real Server Component suspense proof and reviewed 393x852 golden
affects:
  - phase-36-navigation
  - phase-36-release-gallery
  - authenticated-route-loading

tech-stack:
  added: []
  patterns:
    - Server-owned suspense fallback with no client timer, polling, or fabricated completion
    - QA-only request gate for deterministic loading and immediate-resolution evidence
    - Generic pre-resolution labels that disclose no private route records

key-files:
  created:
    - components/screen-design/smart-loading.tsx
    - components/screen-design/smart-loading.test.tsx
    - app/(app)/loading.tsx
    - lib/qa/screendesign-suspense-gate.ts
    - app/(app)/qa/smart-loading-probe/page.tsx
    - app/api/qa/suspense-gate/route.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/smart-loading.png
  modified:
    - app/(app)/assignments/[id]/loading.tsx
    - app/(app)/notes/loading.tsx
    - app/(app)/proof/loading.tsx
    - tests/screendesign-visual.spec.ts
    - tests/screendesign-navigation.spec.ts

key-decisions:
  - "Loading duration belongs only to the owning Server Component request; SmartLoading has no timer, retry loop, polling, percentage, or completion state."
  - "Pre-resolution copy is generic to its route segment and never includes record titles, IDs, profile fields, or private request details."
  - "The source ring remains a complete decorative orbit so motion communicates activity without claiming measurable completion."
  - "The deterministic suspense probe and release endpoint are available only when QA_CREATE_USER is explicitly enabled."

patterns-established:
  - "Suspense delegation: route loading.tsx files provide only a truthful generic label and delegate all presentation to SmartLoading."
  - "Request-controlled QA: a server gate proves the fallback before resolution and resolved content after release without adding a time delay to production routes."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Smart Loading preserves the canonical 393x852 source hierarchy with local Diana media, orbit, fact, study tip, and truthful status."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "components/screen-design/smart-loading.test.tsx#source hierarchy without fabricated completion"
        status: pass
      - kind: automated_ui
        ref: "tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/smart-loading.png"
        status: pass
    human_judgment: true
    rationale: "The 393x852 golden was explicitly inspected against smart_loading.html during execution, and final visual approval remains part of the release gallery."
  - id: D2
    description: "The authenticated segment, assignment detail, notes, and proof owners share one generic semantic fallback and resolve immediately with their Server Components."
    requirement: P36-OPERATIONS
    verification:
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts#smart-loading primary action contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts#smart-loading current app evidence"
        status: pass
    human_judgment: false
  - id: D3
    description: "The fallback exposes polite atomic status semantics, removes looping movement for reduced motion, and has no artificial duration control."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "components/screen-design/smart-loading.test.tsx#visible static reduced-motion fallback and no artificial delay"
        status: pass
      - kind: integration
        ref: "npm run test:run, npm run typecheck, npm run lint, npm run tone-audit, npm run build"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 25: Real Smart Loading Suspense Summary

**Authenticated route work now uses one semantic ScreenDesign loading composition that appears only for real App Router suspense and disappears as soon as its Server Component resolves.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-15T21:29:00-07:00
- **Completed:** 2026-07-15T21:54:00-07:00
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Rebuilt `smart_loading.html` as a canonical 393x852 local-media composition with semantic status, truthful generic copy, and a static reduced-motion fallback.
- Replaced the authenticated segment plus assignment detail, notes, and proof loading owners with one shared component and route-appropriate private-safe labels.
- Added a deterministic Server Component suspense probe that proves the loading state is visible only while work is unresolved and is replaced immediately after request release.
- Explicitly reviewed and locked the mobile golden, then passed focused interaction, full unit, type, lint, tone, production build, and runtime checks.

## Task Commits

1. **Task 1 RED: Define the semantic Smart Loading contract** - `993d474` (test)
2. **Task 1 GREEN: Build the source-faithful Smart Loading component** - `673fce1` (feat)
3. **Task 2: Delegate bounded owners and prove real suspense resolution** - `469a430` (feat)

## Files Created/Modified

- `components/screen-design/smart-loading.tsx` - Canonical local-media loading hierarchy, semantics, orbit, and reduced-motion fallback.
- `components/screen-design/smart-loading.test.tsx` - Covers accessible status, source content, local media, no fake completion, and no artificial duration controls.
- `app/(app)/loading.tsx` - Authenticated segment fallback owner.
- `app/(app)/assignments/[id]/loading.tsx` - Generic assignment loading delegate.
- `app/(app)/notes/loading.tsx` - Generic notes loading delegate.
- `app/(app)/proof/loading.tsx` - Generic proof-folder loading delegate.
- `lib/qa/screendesign-suspense-gate.ts` - Deterministic in-process QA request gate without a clock or polling loop.
- `app/(app)/qa/smart-loading-probe/page.tsx` - Authenticated QA-only Server Component that suspends until release.
- `app/api/qa/suspense-gate/route.ts` - QA-only reset and release controls, unavailable without explicit QA mode.
- `tests/screendesign-visual.spec.ts` - Captures the real fallback interval and asserts resolved replacement.
- `tests/screendesign-navigation.spec.ts` - Records suspense-before and resolved-after action evidence with no writes.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/smart-loading.png` - Reviewed 393x852 golden.

## Decisions Made

- Kept Smart Loading as a Server-compatible presentational component. App Router request completion, not client state, owns when it leaves the screen.
- Used four generic labels: the authenticated segment, assignment, notes, and proof folder. None includes a title, identifier, profile field, or secret request detail.
- Replaced the source percentage and syncing claim with a complete decorative orbit and Diana mark. The UI communicates activity but does not claim completion it cannot measure.
- Restricted the deterministic suspense gate to `QA_CREATE_USER=true`. Production requests cannot activate the probe or gate.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a deterministic Server Component request gate**
- **Found during:** Task 2 controlled suspense verification
- **Issue:** Holding a browser RSC network request prevented the client from receiving the route tree, so the App Router could not render its fallback deterministically.
- **Fix:** Added a QA-only Server Component probe and in-process release gate. The page truly suspends at the server boundary, with no timeout, while Playwright controls release through an authenticated QA request.
- **Files modified:** `lib/qa/screendesign-suspense-gate.ts`, `app/(app)/qa/smart-loading-probe/page.tsx`, `app/api/qa/suspense-gate/route.ts`, and both ScreenDesign Playwright specs.
- **Verification:** Focused mobile visual and navigation tests passed 2 of 2 and asserted fallback visible before release and hidden after resolved content rendered.
- **Committed in:** `469a430`

**2. [Rule 3 - Blocking] Stored the golden at the repository's configured snapshot path**
- **Found during:** Task 2 golden creation
- **Issue:** The plan listed a legacy `tests/screendesign-visual.spec.ts-snapshots` path, while `playwright.config.ts` authoritatively writes ScreenDesign images under `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile`.
- **Fix:** Created and verified the baseline at the configured deterministic path used by all other canonical mobile goldens.
- **Files modified:** `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/smart-loading.png`
- **Verification:** The focused suite passed without `--update-snapshots` after the explicit review.
- **Committed in:** `469a430`

---

**Total deviations:** 2 auto-fixed blocking issues.
**Impact on plan:** Both changes were required to prove the planned real suspense behavior and use the existing canonical evidence system. No production delay or private-data surface was added.

## Issues Encountered

- Browser-level interception alone held the RSC response before the client learned about the destination loading boundary. Moving control to a real QA-only Server Component suspension produced deterministic fallback evidence.
- The Next development tools badge appears only in the development capture environment. It is not part of the Smart Loading component or production build.

## Threat Review

- T-36-49 is mitigated because each loading label is a fixed generic string and no route title, identifier, owner value, or secret state enters the component.
- T-36-50 is mitigated because SmartLoading has no timer, timeout, retry, client gate, percentage, or polling. Server Component completion owns replacement.
- The suspense probe and release API require explicit QA mode and remain behind the authenticated application boundary. Normal runtime requests are redirected to login before the QA endpoint.

## Verification

- Component contract: 3 of 3 focused Smart Loading tests passed.
- Focused mobile evidence: visual and navigation tests passed 2 of 2 without snapshot updates.
- Full Vitest: 155 files and 869 tests passed.
- `npm run typecheck` and `npm run lint` passed.
- `npm run tone-audit` passed with one pre-existing non-blocking assignment copy warning outside this plan.
- `npm run build` passed and generated 79 static pages.
- Runtime restarted on port 3005; `/login` returned HTTP 200 and unauthenticated QA-gate access returned HTTP 307 to login.

## User Setup Required

None. No service, credential, schema, or production environment change is required.

## Next Phase Readiness

- Plan 36-22 can use the shared fallback while proving the complete navigation matrix.
- Plan 36-23 can remove old loading presentation without touching request behavior or private data.
- The release gallery has one reviewed Smart Loading golden and deterministic resolution evidence.

## Self-Check: PASSED

- All component, owner, QA probe, harness, and golden files exist.
- RED, GREEN, and Task 2 commits exist and are atomic.
- Focused, full test, type, lint, tone, build, and runtime gates passed.
- Only the user-owned newline-only `.planning/config.json` change remains unstaged and untouched.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
