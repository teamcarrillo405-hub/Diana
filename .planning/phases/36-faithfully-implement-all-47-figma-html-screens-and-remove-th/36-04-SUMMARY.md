---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "04"
subsystem: ui
tags: [screendesign, react, next-image, navigation, accessibility, responsive]

requires:
  - phase: 36-01
    provides: Canonical typed registry for the 47 ScreenDesign source states
  - phase: 36-02
    provides: Validated local-only asset ids and Diana-owned media
provides:
  - Exact 393x852 mobile-first viewport with safe centering and expansion
  - Typed SourceMedia plus low-level glass, chip, action, wordmark, and mascot primitives
  - Route-derived accessible five-item student bottom navigation
affects:
  - phase-36-dashboard
  - phase-36-onboarding
  - phase-36-screen-implementation
  - phase-36-visual-qa

tech-stack:
  added: []
  patterns:
    - Screen-specific compositions consume low-level source primitives without a shared page shell
    - Pathname ownership selects exactly one active primary navigation destination
    - Local media requires a typed asset id, explicit dimensions, and alt or decorative intent

key-files:
  created:
    - components/screen-design/screen-design-viewport.tsx
    - components/screen-design/source-media.tsx
    - components/screen-design/primitives.tsx
    - components/screen-design/student-bottom-nav.tsx
    - components/screen-design/screen-design.test.tsx
  modified:
    - app/screendesign.css

key-decisions:
  - "The shared ScreenDesign layer contains geometry, media, accents, actions, and navigation only; content hierarchy stays inside each source-specific screen."
  - "The source canvas uses min(100%, 393px), a minimum 852px height, viewport-height expansion, safe-area padding, and centered larger-viewport placement."
  - "Today, Work, Classes, and Calendar own their route prefixes; every other authenticated route resolves to More so exactly one item remains active."
  - "SourceMedia never accepts a URL and requires the caller to state both dimensions and whether the image is content or decorative."

patterns-established:
  - "Source canvas: ScreenDesignViewport owns only the 393x852 framing and never injects headings, cards, or navigation."
  - "Primary nav: usePathname is isolated to StudentBottomNav while getStudentNavOwner remains a deterministic route ownership function."

requirements-completed: [P36-FIDELITY, P36-ASSETS, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Source-faithful 393x852 viewport, local media wrapper, and low-level glass, accent, action, and brand primitives."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "components/screen-design/screen-design.test.tsx#ScreenDesign source primitives"
        status: pass
      - kind: automated_ui
        ref: "@playwright/test Chromium geometry smoke at 393x852 and 900x900"
        status: pass
    human_judgment: false
  - id: D2
    description: "Five source destinations use Next links, local icons, and exactly one pathname-derived active state."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "components/screen-design/screen-design.test.tsx#StudentBottomNav"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shared controls preserve visible focus, safe overflow, reduced-motion fallbacks, decorative image semantics, and amber caution treatment."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "components/screen-design/screen-design.test.tsx#ScreenDesign responsive and calm contracts"
        status: pass
      - kind: other
        ref: "npm run tone-audit"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false

duration: 25 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 04: Source-Faithful Visual Primitives Summary

**A narrow ScreenDesign layer now reproduces the exact mobile canvas, local media contract, recurring glass and neon mechanics, and route-owned five-item footer without introducing another generic page shell.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-15T10:25:00-07:00
- **Completed:** 2026-07-15T10:50:00-07:00
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a 393x852 source canvas that fills narrow screens, centers at larger widths, expands safely with viewport height, respects safe areas, and clips horizontal overflow.
- Added typed local media and only the low-level glass, chip, neon action, wordmark, and mascot primitives downstream compositions need.
- Rebuilt the five-item source footer with Next.js links, local Lucide icons, route-prefix ownership, one `aria-current` item, visible focus, and reduced-motion behavior.
- Proved exact and larger viewport geometry in Chromium and kept the shared caution palette amber through the repository tone gate.

## Task Commits

Task 2 followed RED then GREEN TDD:

1. **Task 1: Implement viewport, local media, and visual primitives** - `8efb4e1` (feat)
2. **Task 2 RED: Define route-owned student navigation** - `0923e7c` (test)
3. **Task 2 GREEN: Derive student nav from route ownership** - `71d31c6` (feat)
4. **Task 3: Prove responsive and calm primitive behavior** - `8380b6c` (test)

## Files Created/Modified

- `components/screen-design/screen-design-viewport.tsx` - Mobile-first 393x852 source framing with no screen content hierarchy.
- `components/screen-design/source-media.tsx` - Typed local asset rendering with explicit dimensions and alt or decorative intent.
- `components/screen-design/primitives.tsx` - Glass panel, accent chip, semantic neon actions, and Diana brand media.
- `components/screen-design/student-bottom-nav.tsx` - Client-only pathname ownership and accessible five-item source navigation.
- `components/screen-design/screen-design.test.tsx` - Component, route, semantics, viewport, focus, motion, and calm contract coverage.
- `app/screendesign.css` - Source geometry, glass, accent, action, footer, focus, safe-area, and reduced-motion rules.

## Decisions Made

- Kept all reusable code below the composition level. No `PageShell`, `AppTopNav`, `Nexus`, or dashboard hierarchy was recreated.
- Used the manifest-backed `ScreenDesignAssetId` as the only SourceMedia input so arbitrary or remote URLs cannot reach markup.
- Used the attached dashboard footer geometry as the navigation baseline: five equal destinations, teal active state, slate inactive state, 24px icons, and safe bottom padding.
- Routed unmatched authenticated screens to More. This keeps a single primary owner without pretending unrelated routes belong to Work or Classes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `.planning/PROJECT.md` is absent from this checkout. The complete `STATE.md`, Phase 36 research, dependency summaries, canonical registry, and asset contract supplied the required project truth.
- The optional gstack browse binary is not built in this checkout. The installed `@playwright/test` Chromium runtime executed the required browser smoke directly and passed at both target viewports.

## Known Stubs

None. The completed plan-owned files contain no TODO, FIXME, placeholder, coming-soon, unavailable, empty-data, or mock-data implementation.

## Verification

- `node scripts/run-verified-commands.mjs -- npx vitest run components/screen-design/screen-design.test.tsx --next npm run typecheck --next npm run tone-audit` - 13 tests passed, TypeScript passed, and tone audit reported 0 violations across 420 files.
- Playwright Chromium smoke - 393x852 produced a 393x852 canvas at left 0 with document width 393; 900x900 produced a centered 393x900 canvas at left 253.5 with no horizontal overflow.
- Reduced-motion Chromium smoke - focused NeonAction kept a solid 2px outline and transition duration resolved to 0 seconds.
- `git diff --check HEAD~4..HEAD` - passed for all task commits.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard, onboarding, assignment, class, calendar, and supporting screen plans can compose the new primitives without inheriting a generic page structure.
- Plan 36-03 can later use the stable viewport and route ownership contracts in its controlled visual harness after its fixture dependencies are complete.

## Self-Check: PASSED

- All six plan-owned implementation and test files plus this summary exist.
- All four task and TDD commits exist in Git history.
- Coverage classification reports all three deliverables automatically covered by passing evidence.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
