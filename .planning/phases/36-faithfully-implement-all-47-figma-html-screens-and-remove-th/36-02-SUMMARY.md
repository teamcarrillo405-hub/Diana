---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "02"
subsystem: assets
tags: [screendesign, sharp, manifest, sha256, local-media, vitest]

requires:
  - phase: 36-01
    provides: Canonical typed registry for the 47 ScreenDesign source states
provides:
  - Diana-owned copies of all 24 ScreenDesign resources and four DiceBear avatars
  - Deterministic GET acquisition and offline verification with checksums and intrinsic dimensions
  - Typed local-only asset lookup that omits remote source URLs and integrity fields from rendering metadata
affects:
  - phase-36-dashboard
  - phase-36-onboarding
  - phase-36-screen-implementation
  - phase-36-visual-qa

tech-stack:
  added: []
  patterns:
    - Allowlisted acquisition validates HTTP MIME, binary signatures, Sharp decode, exact counts, and SHA-256 before writes
    - Rendering code consumes frozen local metadata while source URLs remain internal manifest provenance

key-files:
  created:
    - scripts/localize-screendesign-assets.mjs
    - public/screendesign/manifest.json
    - public/screendesign/dashboard/stadium-background.jpg
    - public/screendesign/dashboard/athlete-cutout.png
    - lib/screendesign/assets.ts
    - lib/screendesign/assets.test.ts
  modified: []

key-decisions:
  - "The canonical registry is the only source inventory: 46 folder exports plus the attached dashboard override must resolve to exactly 24 ScreenDesign resources and four avatars."
  - "Stadium and athlete imagery remain separate local layers so the attached dashboard composition can preserve its crop and responsive positioning."
  - "The typed rendering lookup exposes local paths, dimensions, alpha intent, semantic role, and consumers, but not remote provenance URLs or checksums."
  - "Original image formats and focal crops remain unchanged; Sharp is used for decode and metadata validation without a lossy conversion step."

patterns-established:
  - "Owned media contract: every source URL has one stable id, one /screendesign path, one checksum, intrinsic dimensions, alpha metadata, semantic role, and canonical consumer list."
  - "Offline integrity gate: --verify performs no network requests or file writes and fails on any manifest, file, hash, dimension, MIME, consumer, or source-inventory drift."

requirements-completed: [P36-ASSETS, P36-FIDELITY]

coverage:
  - id: D1
    description: "Exactly 24 ScreenDesign resources and four DiceBear avatars are checked in under Diana-owned public paths with complete provenance and integrity metadata."
    requirement: P36-ASSETS
    verification:
      - kind: integration
        ref: "node scripts/localize-screendesign-assets.mjs --verify"
        status: pass
      - kind: unit
        ref: "lib/screendesign/assets.test.ts#matches every checked-in file to the manifest checksum and dimensions"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typed lookup resolves every canonical id to frozen local-only rendering metadata and rejects unknown ids."
    requirement: P36-ASSETS
    verification:
      - kind: unit
        ref: "lib/screendesign/assets.test.ts#ScreenDesign asset integrity"
        status: pass
    human_judgment: false
  - id: D3
    description: "Dashboard stadium and athlete layers, welcome and brand art, tutor portraits, and four community avatars have distinct stable ids and paths."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "lib/screendesign/assets.test.ts#keeps dashboard layers, brand art, tutors, and community avatars distinct"
        status: pass
    human_judgment: false

duration: 18 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 02: Local ScreenDesign Asset Ownership Summary

**A verified 28-file local media bundle now owns every ScreenDesign and community-avatar dependency, including separate stadium and athlete layers for the attached dashboard.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-15T10:17:30-07:00
- **Completed:** 2026-07-15T10:35:30-07:00
- **Tasks:** 2
- **Files modified:** 32

## Accomplishments

- Parsed all 47 canonical registry sources and localized exactly 24 ScreenDesign resources plus four DiceBear avatars into seven semantic asset categories.
- Added a deterministic acquisition and offline verification script that checks allowlisted hosts, response MIME, binary signatures, Sharp decoding, exact counts, checksums, dimensions, alpha metadata, consumer coverage, and unexpected files.
- Added a validated typed asset loader whose public lookup returns only frozen Diana-owned rendering metadata and cannot return a remote URL.
- Preserved the attached dashboard stadium and athlete as separate full-resolution local files for faithful layered composition.

## Task Commits

Each task was committed atomically. Task 2 followed RED then GREEN TDD:

1. **Task 1: Build the canonical asset acquisition pipeline** - `060a412` (feat)
2. **Task 2 RED: Define the asset integrity and lookup contract** - `114532a` (test)
3. **Task 2 GREEN: Implement validated local-only typed lookup** - `b994495` (feat)

## Files Created/Modified

- `scripts/localize-screendesign-assets.mjs` - Canonical source scan, allowlisted GET acquisition, metadata generation, and offline integrity verification.
- `public/screendesign/manifest.json` - 28-entry provenance, checksum, dimension, alpha, semantic-role, and consumer manifest.
- `public/screendesign/brand/` - Diana logo and assistant mascot.
- `public/screendesign/dashboard/` - Separate stadium backdrop and athlete foreground.
- `public/screendesign/onboarding/` - Welcome background and GPA progress illustration.
- `public/screendesign/instructional/` - Ring, graph, concept, search, and artifact imagery.
- `public/screendesign/portfolio/` - Calculus and biology project thumbnails.
- `public/screendesign/social/` - Profile, room, social-proof, and four community avatars.
- `public/screendesign/tutors/` - Math and science tutor portraits.
- `lib/screendesign/assets.ts` - Module-load manifest validation, literal asset-id union, frozen safe metadata, and lookup helper.
- `lib/screendesign/assets.test.ts` - Independent file integrity, lookup, required-id, and complete canonical source coverage tests.

## Decisions Made

- Used the Plan 36-01 registry directly instead of re-enumerating HTML filenames in a second source list.
- Kept the remote URLs in the provenance manifest but excluded them and SHA-256 values from all exported rendering metadata.
- Retained original PNG, JPEG, and SVG formats and exact dimensions. Sharp validates decodability and metadata without introducing a lossy conversion or changing focal crop.
- Made acquisition fail closed on non-HTTPS or non-allowlisted hosts, redirects, unexpected MIME, empty bodies, signature mismatch, decode failure, duplicate ids or paths, count drift, unmapped URLs, and unmanaged local files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept the Sharp integrity test type-safe under the repository's bundler module resolution**
- **Found during:** Task 2 GREEN (typed lookup and integrity gates)
- **Issue:** TypeScript could execute installed Sharp, but its declaration path was not resolvable through the package export map under `moduleResolution: bundler`.
- **Fix:** Loaded the installed package through Node `createRequire` in the test and supplied the narrow metadata interface used by the assertion. No package or production configuration changed.
- **Files modified:** `lib/screendesign/assets.test.ts`
- **Verification:** `npm run typecheck` and the complete Vitest suite pass.
- **Committed in:** `b994495`

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** The fix preserves independent Sharp dimension verification without adding dependencies or changing production behavior.

## Issues Encountered

- `.planning/PROJECT.md` was requested by the execution context but is absent from this checkout. `STATE.md`, the Phase 36 context and research, the canonical registry, and Plan 36-01 summary supplied the project and phase truth.
- `requirements.mark-complete` could not find checkbox records for `P36-ASSETS` or `P36-FIDELITY` because Phase 36 requirements are prose sections. `REQUIREMENTS.md` remains unchanged instead of falsely completing broad phase requirements before the remaining plans run.
- Node prints a non-blocking module-type warning when the acquisition script imports the canonical TypeScript registry. The command succeeds and the warning does not affect acquisition or verification; changing the repository package module type was outside this plan.
- The first combined PowerShell verification command used a newer-shell `||` form. It was immediately rerun with PowerShell 5.1-compatible exit handling, and every gate passed.

## Known Stubs

None. The plan-owned source, test, script, and manifest files contain no TODO, FIXME, placeholder, coming-soon, or unavailable implementation text.

## Verification

- `node scripts/localize-screendesign-assets.mjs --verify` - verified 24 ScreenDesign assets and four avatars without changing local file timestamps or sizes.
- `npx vitest run lib/screendesign/assets.test.ts` - 5 tests passed for local lookup, required stable ids, unknown ids, hashes, dimensions, alpha metadata, and complete source-to-consumer coverage.
- `npm run typecheck` - passed.
- `npm run test:run` - 131 test files and 772 tests passed.
- Runtime code scan across `app`, `components`, and `lib` - no `media.screensdesign.com` or `api.dicebear.com` references outside the integrity provenance test/loader boundary.
- `git diff --check HEAD` - passed for all owned changes; the unrelated `.planning/config.json` newline-only change remains preserved and unstaged.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 36-03 onward can use `getScreenDesignAsset(id)` as the local media contract for every rebuilt screen.
- Dashboard and onboarding plans have the exact local imagery required for source-faithful composition.
- No remote design-host or DiceBear request is needed at application runtime.

## Self-Check: PASSED

- All six key files and both dashboard layers exist.
- All three task/TDD commits exist in Git history.
- The 28-entry manifest count and local asset tree are complete.
- GSD coverage classification reports all three deliverables automatically covered by passing verification.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
