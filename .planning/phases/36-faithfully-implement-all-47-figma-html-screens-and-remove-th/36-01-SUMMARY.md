---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "01"
subsystem: testing
tags: [screendesign, registry, vitest, node-test, powershell, qa]

requires: []
provides:
  - Typed authoritative registry for exactly 47 canonical ScreenDesign states
  - Human-readable 47-row source, route, state, and primary-action map
  - Shell-free fail-fast native command runner for PowerShell 5.1 gates
affects:
  - phase-36-screen-implementation
  - phase-36-visual-qa
  - phase-36-release-gates

tech-stack:
  added: []
  patterns:
    - Readonly source metadata contracts that never import or execute export HTML
    - Native argv command groups separated by --next with one explicit child environment

key-files:
  created:
    - lib/screendesign/screens.ts
    - lib/screendesign/screens.test.ts
    - scripts/run-verified-commands.mjs
    - scripts/run-verified-commands.test.mjs
  modified:
    - docs/design/SCREEN-MAP.md

key-decisions:
  - "The separately attached dashboard is the exclusive /dashboard source; the export-folder dashboard is absent from the 47-state contract."
  - "Every screen owns a route, explicit state selector where needed, real primary action, auth class, data owner, 393x852 viewport, and stable snapshot name."
  - "Windows npm and npx resolve through their .cmd locations but execute the sibling npm Node CLI directly so spawnSync remains shell-free."

patterns-established:
  - "Canonical screen contract: downstream implementation and QA filter SCREEN_DESIGN_SCREENS by stable id instead of re-enumerating exports."
  - "Verified command gate: environment options precede -- and native argv command groups use --next with first-failure propagation."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Exactly 47 unique canonical ScreenDesign states with attached-dashboard precedence and complete operational ownership metadata."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "lib/screendesign/screens.test.ts#SCREEN_DESIGN_SCREENS"
        status: pass
    human_judgment: false
  - id: D2
    description: "Production screen map mirrors all 47 registry ids in order and documents safety substitutions and the D-12 completion rule."
    requirement: P36-OPERATIONS
    verification:
      - kind: other
        ref: "PowerShell registry-to-map id and row alignment check"
        status: pass
    human_judgment: false
  - id: D3
    description: "PowerShell 5.1-safe runner executes shell-free native argv groups sequentially with explicit environment controls and first-failure propagation."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "scripts/run-verified-commands.test.mjs"
        status: pass
      - kind: integration
        ref: "node scripts/run-verified-commands.mjs -- npx vitest run lib/screendesign/screens.test.ts --next npx tsc --noEmit --pretty false"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 01: Canonical Screen Contract Summary

**A tested 47-state ScreenDesign registry, reconciled production map, and shell-free Windows command runner now form the source and verification contract for the rebuild.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-15T10:16:17-07:00
- **Completed:** 2026-07-15T10:22:00-07:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Encoded the exact 46-folder-source plus attached-dashboard set as 47 typed, immutable screen contracts with no conflicting folder dashboard.
- Reconciled the production map to the same 47 ids, routes, states, actions, data owners, public-share rules, billing truthfulness, and minor-community privacy substitution.
- Added a strict ESM command runner that supports `--env`, `--env-copy`, `--unset`, and `--next`, stops at the first error, signal, or nonzero status, and runs npm/npx without shell chaining.

## Task Commits

TDD tasks produced separate RED and GREEN commits:

1. **Task 1 RED: Define canonical registry behavior** - `bf00125` (test)
2. **Task 1 GREEN: Implement the typed 47-screen registry** - `5da2643` (feat)
3. **Task 2: Reconcile the production screen map** - `fe864a5` (docs)
4. **Task 3 RED: Define fail-fast runner behavior** - `66c8846` (test)
5. **Task 3 GREEN: Implement the verified command runner** - `046c467` (feat)

## Files Created/Modified

- `lib/screendesign/screens.ts` - Immutable canonical source, route/state, action, auth, data-owner, viewport, snapshot, and safety metadata.
- `lib/screendesign/screens.test.ts` - Exact inventory, uniqueness, precedence, ownership, and security-substitution gates.
- `docs/design/SCREEN-MAP.md` - Human-readable mirror of the 47 registry rows and completion rules.
- `scripts/run-verified-commands.mjs` - Strict native argv runner with explicit environment construction and first-failure exits.
- `scripts/run-verified-commands.test.mjs` - Node tests for parsing, ordering, failure, signal, environment, malformed input, and Windows resolution behavior.

## Decisions Made

- Stable ids derive from canonical filenames, with `dashboard-personalized` assigned to the separately attached source.
- `stateSelector` is always present and becomes non-null for every shared or stateful route owner, so downstream visual and action tests can address states deterministically.
- Public token screens, billing references, and the leaderboard reference carry explicit substitutions rather than relying on prose outside the contract.
- npm/npx `.cmd` files cannot be passed directly to Windows `spawnSync` with `shell: false`; the runner locates the shim and safely invokes its adjacent npm CLI JavaScript with Node.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept Windows npm/npx execution shell-free despite `.cmd` spawn failure**
- **Found during:** Task 3 (PowerShell-safe fail-fast runner)
- **Issue:** Windows returned `EINVAL` when `spawnSync("npx.cmd", ..., { shell: false })` was exercised directly.
- **Fix:** Retained `.cmd` resolution as the authoritative shim lookup, then invoked the shim's sibling `npm-cli.js` or `npx-cli.js` through `process.execPath` using argv arrays and `shell: false`.
- **Files modified:** `scripts/run-verified-commands.mjs`, `scripts/run-verified-commands.test.mjs`
- **Verification:** Node runner tests pass and the runner successfully launches `npx vitest` on Windows.
- **Committed in:** `046c467`

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** The fix is required for the planned Windows behavior and preserves the no-shell security boundary.

## Issues Encountered

- `.planning/PROJECT.md` was requested by the execution context but does not exist in this checkout. The complete `STATE.md`, Phase 36 context, research, source coverage, and plan supplied the required project and phase truth.
- The legacy `STATE.md` lacked the current-plan and total-plans fields required by the GSD handlers. Phase 36 position fields were seeded once, after which the handlers advanced the state to plan 2 and recorded progress, metrics, decisions, and session continuity.
- `requirements.mark-complete` could not find checkbox records for the three Phase 36 requirement headings because `REQUIREMENTS.md` stores them as prose-only sections. The requirement file was left unchanged so broad phase requirements are not falsely marked complete before the remaining 29 plans run.

## Known Stubs

None. A scan of all created and modified plan files found no placeholder, TODO, FIXME, coming-soon, or unavailable implementation text.

## Threat Flags

| Flag | File | Description |
|---|---|---|
| `threat_flag: process-execution` | `scripts/run-verified-commands.mjs` | The planned verification runner starts child processes. Strict option parsing, argv arrays, `shell: false`, explicit environments, and first-failure termination constrain the surface. |

## Verification

- `node --test scripts/run-verified-commands.test.mjs` - 8 tests passed.
- `node scripts/run-verified-commands.mjs -- npx vitest run lib/screendesign/screens.test.ts --next npx tsc --noEmit --pretty false` - 6 registry tests passed and TypeScript completed successfully.
- Registry-to-map alignment - 47 registry ids, 47 map rows, 47 unique map ids, exact ordered match.
- `git diff --check HEAD` - passed for all owned files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 36-02 through 36-30 can consume `SCREEN_DESIGN_SCREENS` as the single source list and use the verified command runner for PowerShell-safe multi-command gates.
- The registry and map are metadata contracts only. Visual source normalization, assets, application screens, action evidence, and release verification remain owned by later Phase 36 plans.

## Self-Check: PASSED

- All five planned files exist.
- All five task/TDD commits exist in Git history.
- Registry, command-runner, TypeScript, map-alignment, and stub-scan checks pass.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
