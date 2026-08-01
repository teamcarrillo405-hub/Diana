---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "32"
subsystem: public-home
tags: [screendesign, scroll, onboarding, paywall, accessibility, nexus-removal]
completed: 2026-07-17
---

# Phase 36 Plan 32: Continuous public ScreenDesign home

## Outcome

The public root is now one vertical document containing all six attached compositions in this order:

1. Welcome
2. Educational overview
3. Learning challenge
4. Study schedule
5. Community access
6. Standard access

The previous public stage state machine was removed. Every section exists after hydration, the browser owns the vertical scroll, adjacent controls use reduced-motion-aware `scrollIntoView`, and only the final standard-access action routes to signup.

Authenticated `/onboarding` remains a one-screen wizard. Authenticated `/upgrade` retains its server-authoritative billing behavior.

## Implementation

- Added a `scroll` presentation to `ScreenDesignOnboarding` that reuses all four source-faithful compositions as uniquely labelled sibling sections.
- Replaced the public funnel stage state with one `<main>` landmark and six ordered ScreenDesign panels.
- Added a public-scroll presentation seam to `UpgradeScreen` so both paywall compositions participate in document flow without nested main landmarks or internal scroll traps.
- Preserved validated session draft writes after the schedule selection.
- Rebound public and canonical navigation tests to real section positions rather than state replacement.
- Kept the 47-screen registry and all standalone visual baselines unchanged.

## Verification

- Public continuous-scroll browser contract: 1/1 passed.
- Directly affected canonical navigation and authenticated onboarding: 7/7 passed.
- Canonical 393x852 visual baselines: 47/47 passed with no updates.
- Accessibility and responsive matrix: 104/104 passed.
- Unit/component tests: 923/923 passed across 162 files.
- Typecheck: passed.
- Lint: passed.
- Tone audit: passed with three pre-existing non-blocking `deadline` warnings.
- Production build: passed, 79 static pages generated.
- Source removal audit: 466 production files, 47 canonical states, and 28 local assets passed.
- Compiled removal audit: 554 build artifacts passed.
- Live local inspection: six panels, one main landmark, 5,459-pixel document, correct first and last section ids, no prohibited Nexus/Mission Control/command-deck text.

## Test harness note

Playwright and manual inspection cannot run simultaneous Next.js development servers from the same checkout because both own `.next`. The final evidence used one stable QA server on port 3005. Earlier `ERR_CONNECTION_REFUSED` results were discarded as harness failures and rerun successfully with explicit `QA_BASE_URL` and `QA_CREATE_USER`.

## User-owned work preserved

`.planning/config.json` contains a pre-existing newline-only change and was not modified, staged, or committed by this plan.
