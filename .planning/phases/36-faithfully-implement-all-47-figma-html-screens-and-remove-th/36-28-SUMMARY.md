---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "28"
subsystem: testing
tags: [screendesign, vitest, playwright, source-normalization, security]

requires:
  - phase: 36-01
    provides: Canonical typed registry for all 47 ScreenDesign states and dashboard precedence
  - phase: 36-02
    provides: Checked-in manifest and local files for 24 ScreenDesign assets plus four avatars
provides:
  - Pure normalization of all 47 untrusted ScreenDesign exports into inert local-only documents
  - Deterministic compiled Tailwind capture CSS with attached-dashboard stadium repair
  - Isolated canonical-source origin with exact local asset serving and browser request evidence
  - Fail-closed denial and recording of every remote browser request attempt
affects:
  - phase-36-visual-qa
  - phase-36-source-capture
  - phase-36-fidelity-evidence

tech-stack:
  added: []
  patterns:
    - Exact manifest URL replacement rejects fuzzy and unmapped remote media
    - Source HTML is stripped and rewritten as data without evaluating export JavaScript
    - Browser capture allows only canonical source documents, compiled CSS, and manifest assets on one isolated origin

key-files:
  created:
    - tests/helpers/normalize-screendesign-source.ts
    - tests/fixtures/screendesign-source-server.ts
  modified:
    - tests/screendesign-source-normalization.test.ts
    - vitest.config.ts

key-decisions:
  - "Normalized source documents are generated only from exact canonical registry entries, and the conflicting export-folder dashboard remains rejected."
  - "All 28 remote media dependencies are replaced by exact checked-in manifest paths; fuzzy URLs and every unlisted host fail closed."
  - "Capture Tailwind CSS is compiled once from the full normalized corpus and linked before source inline styles so the exported composition keeps precedence without CDN execution."
  - "The browser policy records every request and aborts anything outside the isolated origin's canonical sources, capture stylesheet, and manifest assets."

patterns-established:
  - "Source normalization: strip executable markup and handlers, repair the one approved malformed declaration, rewrite exact media URLs, then inject local capture CSS."
  - "Request evidence: install a per-screen Playwright route policy, record pending/completed/failed/blocked outcomes, and assert no remote attempts before accepting a capture."

requirements-completed: [P36-QA, P36-ASSETS, P36-FIDELITY]

coverage:
  - id: D1
    description: "All 47 canonical ScreenDesign sources normalize into inert local-only HTML while the excluded folder dashboard and fuzzy URLs are rejected."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "tests/screendesign-source-normalization.test.ts#normalizeScreenDesignSource"
        status: pass
    human_judgment: false
  - id: D2
    description: "The isolated origin serves 47 normalized documents, one compiled capture stylesheet, and all 28 non-empty local manifest assets with restrictive security headers."
    requirement: P36-ASSETS
    verification:
      - kind: integration
        ref: "tests/screendesign-source-normalization.test.ts#isolated ScreenDesign source server"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D3
    description: "Browser request policy aborts and records ScreenDesign, DiceBear, Tailwind, Iconify, font, and arbitrary remote hosts while allowing only exact local capture resources."
    requirement: P36-QA
    verification:
      - kind: integration
        ref: "tests/screendesign-source-normalization.test.ts#aborts and records every remote browser request"
        status: pass
    human_judgment: false

duration: 3h 3m
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 28: Deterministic ScreenDesign Source Capture Summary

**All 47 canonical HTML references now render as inert, local-asset-only documents from a locked test origin whose browser policy blocks and records every attempted internet request.**

## Performance

- **Duration:** 3h 3m elapsed, including an interrupted handoff
- **Started:** 2026-07-15T11:23:39-07:00
- **Completed:** 2026-07-15T14:26:42-07:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Normalized exactly 47 canonical references without running export scripts, inline handlers, remote stylesheets, preload runtimes, iframes, objects, embeds, refresh redirects, or unsafe URL schemes.
- Replaced every occurrence of the 24 ScreenDesign URLs and four DiceBear URLs through the checked-in manifest, rejected fuzzy substitutions, and repaired only the attached dashboard's malformed stadium declaration while retaining separate stadium and athlete layers.
- Added a test-only source origin that compiles the full export utility set locally, serves only canonical screen IDs and manifest assets, applies restrictive CSP and response headers, and verifies every local file before listening.
- Added Playwright-compatible per-screen request evidence that permits exact isolated-origin resources and aborts every ScreenDesign, DiceBear, Tailwind, Iconify, font, or other internet request.

## Task Commits

Task 1 followed RED then GREEN TDD:

1. **Task 1 RED: Define failing source normalization contract** - `0ba1474` (test)
2. **Task 1 GREEN: Normalize canonical ScreenDesign sources** - `c49ec35` (feat)
3. **Task 2: Serve normalized sources from an isolated zero-remote origin** - `9afb515` (feat)

## Files Created/Modified

- `tests/helpers/normalize-screendesign-source.ts` - Pure canonical validation, export-runtime stripping, unsafe attribute removal, exact manifest rewriting, dashboard CSS repair, and local stylesheet injection.
- `tests/fixtures/screendesign-source-server.ts` - Local-only HTTP fixture, full-corpus Tailwind compiler, manifest asset server, restrictive response headers, and Playwright request evidence.
- `tests/screendesign-source-normalization.test.ts` - Eight tests covering 47 sources, 28 assets, dashboard precedence and CSS, canonical isolation, missing files, and remote host denial.
- `vitest.config.ts` - Includes the Phase 36 root test suite in Vitest discovery.

## Decisions Made

- Kept normalization pure and deterministic. The source registry and checked-in manifest are the only accepted inputs, and no source JavaScript is evaluated.
- Linked compiled capture CSS at the beginning of the document head. This keeps local Tailwind base and utility output available while allowing each export's later inline styles to retain intended precedence.
- Used exact same-origin and pathname allowlists in the browser policy. Merely sharing the server host is insufficient; queries, fragments, unsupported methods, unknown source IDs, and unlisted asset paths are denied.
- Exposed immutable request records with screen ID, URL, method, resource type, locality, allow decision, outcome, and failure text so Plan 36-03 can prove isolation per capture.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The resumed Task 2 implementation initially left the `stat` result possibly undefined under strict TypeScript analysis. The asset preflight was expressed as a fail-closed promise catch, preserving behavior and satisfying the type checker.

## Known Stubs

None. The fixture serves real checked-in source assets and complete normalized documents; no placeholder data or empty rendering path was introduced.

## Verification

- `node scripts/run-verified-commands.mjs -- npx vitest run tests/screendesign-source-normalization.test.ts --next npm run typecheck` - eight tests passed and TypeScript passed.
- Corpus contract - exactly 47 canonical sources normalized, all 28 manifest resources rewritten locally, conflicting dashboard rejected, and malformed dashboard CSS parsed successfully.
- Server contract - 47 documents, one compiled stylesheet, and 28 non-empty assets returned successfully; unknown source IDs returned 404.
- Remote denial contract - ScreenDesign, DiceBear, Tailwind, Iconify, Google Fonts, and arbitrary external hosts were aborted and recorded as blocked while exact local resources completed.
- `git show --check 9afb515` - passed with no whitespace errors or unexpected deletions.

## User Setup Required

None - the source fixture uses only checked-in files and an ephemeral loopback port.

## Next Phase Readiness

- Plan 36-03 can launch each canonical source URL, install the per-screen request policy, capture the 393 by 852 reference, and reject any run with remote request evidence.
- The dashboard reference now includes valid local stadium CSS and separate athlete imagery, so its future source/app comparison measures composition rather than export damage.

## Self-Check: PASSED

- Both created files, both modified files, and this summary exist.
- RED `0ba1474`, GREEN `c49ec35`, and isolated-server `9afb515` exist in Git history in order.
- The required focused test suite and TypeScript gate pass after the final implementation commit.
- The unrelated `.planning/config.json` working-tree change remains unstaged and unmodified by this plan.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
