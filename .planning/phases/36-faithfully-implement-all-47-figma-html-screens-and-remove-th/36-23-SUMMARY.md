---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "23"
subsystem: ui
tags: [screendesign, legacy-removal, playwright, nextjs, assets]

requires:
  - phase: 36-22
    provides: All 47 canonical route owners and primary actions verified
provides:
  - Physical deletion of obsolete Nexus and Quiet Command presentation, including the root marketing route
  - Deterministic source and compiled-output legacy-removal gates
  - Local-only runtime design assets with deploy-safe production inputs
  - Clean production build and complete 47-state navigation and visual proof
affects:
  - phase-36-release-validation
  - phase-36-preview-canary

tech-stack:
  added: []
  patterns:
    - Local-only ScreenDesign runtime media with documentation-only provenance
    - Registry-driven source, route-owner, stylesheet, and compiled-output removal audit
    - Public-token visual evidence reloads after interaction and accessibility checks

key-files:
  created:
    - app/page.tsx
    - scripts/verify-screendesign-removal.ts
    - tests/screendesign-removal-audit.test.ts
  modified:
    - app/globals.css
    - app/screendesign.css
    - tests/screendesign-navigation.spec.ts
    - tests/screendesign-visual.spec.ts
    - tests/fixtures/screendesign.ts

key-decisions:
  - "Delete presentation consumers only and preserve assignment actions, scoring, state machines, safety, storage, and owner-scoped data modules."
  - "The App Router root owns the ScreenDesign onboarding welcome composition; no parallel Pages Router or Quiet Command landing remains."
  - "Visual evidence uses one screenshot buffer and reduced-motion browser settings instead of global zero-duration CSS overrides."

requirements-completed: [P36-REMOVAL, P36-FIDELITY, P36-ASSETS, P36-QA]

coverage:
  - id: D1
    description: "Production source, route-owner graphs, stylesheets, and clean compiled output contain none of the prohibited Nexus, Mission Control, Quiet Command, TodayGamePlan, PageShell, AppTopNav, or obsolete selector families."
    requirement: P36-REMOVAL
    verification:
      - kind: unit
        ref: "tests/screendesign-removal-audit.test.ts and source audit across 461 production files"
        status: pass
      - kind: other
        ref: "compiled removal audit across 542 clean build artifacts"
        status: pass
    human_judgment: false
  - id: D2
    description: "All ScreenDesign runtime media remains local, documented, and included in the production build."
    requirement: P36-ASSETS
    verification:
      - kind: other
        ref: "source removal audit verified 28 local assets and npm run build passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "All 47 canonical primary actions and all 47 mobile compositions remain operational and visually locked after legacy deletion."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts bounded chunks, 47 of 47 canonical actions plus second-owner isolation"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts bounded chunks, 47 of 47 mobile evidence screens"
        status: pass
    human_judgment: false
  - id: D4
    description: "A normal production build and runtime serve the new ScreenDesign root without Nexus, Quiet Command, or Mission Control copy."
    requirement: P36-QA
    verification:
      - kind: other
        ref: "typecheck, tests, tone audit, lint, build, HTTP 200 root and login checks"
        status: pass
    human_judgment: false

duration: 1h 47m
completed: 2026-07-16
status: complete
---

# Phase 36 Plan 23: Obsolete Presentation Removal Summary

**The Nexus and Quiet Command presentation is physically deleted from authenticated routes and the public root, while all 47 ScreenDesign states remain operational, visually verified, and backed by the existing secure application logic.**

## Performance

- **Duration:** 1h 47m
- **Started:** 2026-07-16T02:02:23-07:00
- **Completed:** 2026-07-16T03:49:32-07:00
- **Tasks:** 3
- **Files modified:** 55

## Accomplishments

- Deleted the obsolete authenticated dashboard, assignment, navigation, menu, shell, and Quiet Command presentation files without deleting business logic, actions, scoring, state machines, safety, or owner-scoped data.
- Removed the parallel Pages Router root and 1,885-line Quiet Command landing stylesheet, then made `/` the source-faithful ScreenDesign onboarding welcome composition.
- Added a deterministic removal gate that rejects prohibited source imports, route-owner dependencies, copy, selectors, remote media, export scripts, and stale clean-build output.
- Preserved all 28 local ScreenDesign assets and verified all 47 canonical actions plus all 47 mobile visual evidence screens after deletion.
- Passed the complete normal production gate and verified the running root and login routes return HTTP 200 without Nexus, Quiet Command, or Mission Control content.

## Task Commits

1. **Task 1: Remove obsolete dashboard and assignment presentation consumers** - `922ed13`
2. **Task 2: Remove stale CSS and add deterministic removal audit** - `6cd7f05` (red test), `cc0c8a6` (implementation)
3. **Task 3: Lock deploy inputs and pass the clean production gate** - `95afa44`
4. **Auto-fix: Remove the parallel legacy public root and harden visual evidence** - `833fd70`

## Files Created/Modified

- `app/page.tsx` now owns the public ScreenDesign onboarding welcome composition and routes its action to sign-up.
- `scripts/verify-screendesign-removal.ts` scans production source, canonical route-owner graphs, 28 local assets, and clean compiled output.
- `tests/screendesign-removal-audit.test.ts` locks the removal policy so prohibited presentation entry points cannot return.
- `app/globals.css` and `app/screendesign.css` retain current accessibility and ScreenDesign rules while removing obsolete presentation selector families.
- `tests/screendesign-visual.spec.ts` captures one stable screenshot buffer with browser-level reduced motion and focused public-token isolation.
- `.vercelignore` excludes planning and QA-only source inputs while retaining required `public/screendesign` assets.

## Decisions Made

- Presentation deletion does not authorize removal of operational logic. Assignment actions, subject metadata, scoring, state-machine, safety, storage, and data access modules remain intact.
- `/` belongs to the App Router and shows the attached ScreenDesign onboarding welcome state. The old Pages Router and Quiet Command landing cannot shadow it.
- The removal audit checks both source and a clean `.next` build. Old cached build text is never accepted as evidence.
- Visual comparison uses a single browser screenshot buffer. Global zero-duration overrides were removed because they changed Chromium compositing rather than merely reducing motion.

## Deviations from Plan

### Auto-fixed Issues

**1. The public root still used the old Quiet Command landing**
- **Found during:** Final visual and runtime comparison
- **Issue:** The authenticated legacy presentation had been removed, but `/` was still owned by a parallel Pages Router implementation with old Quiet Command markup and CSS.
- **Fix:** Deleted `pages/index.tsx`, `pages/_app.tsx`, `pages/_document.tsx`, `components/landing/quiet-command-landing.tsx`, and `styles/quiet-command.css`; added the source-faithful App Router root; extended the audit to ban the deleted entry points and `qc-*` markers.
- **Verification:** `/` returns HTTP 200, contains `AI TUTOR`, and contains none of Nexus, Quiet Command, or Mission Control.
- **Committed in:** `833fd70`

**2. Global test CSS corrupted fixed and backdrop compositing**
- **Found during:** Full 47-screen visual evidence run
- **Issue:** The visual harness forced all animation and transition durations to zero, which changed Chromium backdrop and sticky-layer composition even when the live DOM was correct.
- **Fix:** Removed the global style override, used browser reduced motion, captured one screenshot buffer, and compared that exact buffer.
- **Verification:** All 47 mobile visual screens passed in bounded chunks.
- **Committed in:** `833fd70`

**3. Two truthful golden images contained stale deterministic raster state**
- **Found during:** Full 47-screen visual evidence run
- **Issue:** Onboarding educational had a consistent 2 to 3 pixel baseline shift, and the scout share fixture still displayed the previous fixed-clock week.
- **Fix:** Inspected each controlled screenshot, confirmed content and layer ownership, then refreshed only those two golden images.
- **Verification:** Each refreshed screen passed independently and in its bounded visual chunk.
- **Committed in:** `833fd70`

---

**Total deviations:** 3 auto-fixed presentation and evidence-integrity issues.
**Impact on plan:** The fixes removed the last user-visible old design and made the 47-screen proof more trustworthy without weakening production authorization or data boundaries.

## Issues Encountered

- A shared development server produced stale streamed hydration artifacts on practice test, quick add, and review-submit checkpoint. A fresh `.next` and server run passed all three screens three consecutive times, 9 of 9 total.
- The production QA harness intentionally rejects its anonymous fixture endpoint, so browser interaction tests run under the explicit QA development scenario. The normal production build and runtime were verified separately with QA flags removed.
- Tone audit continues to report one unrelated nonblocking `deadline` advisory outside this plan.

## Known Stubs

- No Plan 36-23 presentation or removal stubs remain.
- Final preview canary and human visual approval remain assigned to Plan 36-24.
- Reusable release gallery validation remains assigned to Plans 36-29 and 36-30.

## Verification

- Source removal audit passed across 461 production files, 47 canonical states, and 28 local assets.
- Compiled removal audit passed across 542 clean production build artifacts.
- Canonical primary actions passed 47 of 47 in bounded chunks; the additional owner-isolation check also passed.
- Mobile visual evidence passed 47 of 47 in bounded chunks.
- Fresh-server hydration stress passed 9 of 9 repeated targeted checks.
- `npm run typecheck` passed.
- `npm run test:run` passed.
- `npm run tone-audit` passed with one unrelated nonblocking advisory.
- `npm run lint` passed.
- `npm run build` passed.
- `http://127.0.0.1:3005/` and `http://127.0.0.1:3005/login` return HTTP 200 from the normal production server.

## User Setup Required

None for legacy removal and local production verification.

## Next Phase Readiness

- Plan 36-24 can run preview canary and final human visual approval against a production source tree with no old presentation owners.
- Plans 36-29 and 36-30 can produce and independently validate the final release-SHA-stamped 47-screen gallery.
- No Plan 36-23 blocker remains.

## Self-Check: PASSED

- The obsolete Nexus and Quiet Command presentation files are physically absent.
- No canonical owner graph imports a prohibited legacy entry point.
- No production source or clean compiled output contains the prohibited visual markers.
- All 47 actions and all 47 visual states pass after deletion.
- Only the user's pre-existing `.planning/config.json` change remains unstaged.
