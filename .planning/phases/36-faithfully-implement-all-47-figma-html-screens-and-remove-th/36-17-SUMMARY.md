---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "17"
subsystem: ui
tags: [screendesign, public-share, privacy, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic source capture, app visual, navigation, and fixture harness
  - phase: 36-04
    provides: Source-faithful viewport and local ScreenDesign media primitives
provides:
  - Exact-token External Scout portfolio state backed only by owner-derived approved evidence
  - Minimized Academic Report state with a loaded-report-only print action
  - Calm inactive share state with explicit expired and revoked token coverage
  - Two reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Public share authorization completes before any owner-scoped evidence query begins
    - The matching share row is the only source of owner identity and report type
    - Portfolio and report components receive minimized typed payloads instead of private profile records
    - Public ScreenDesign surfaces use local media and never create a general student-profile route

key-files:
  created:
    - app/share/[token]/page.test.tsx
    - app/share/[token]/parent-summary.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/external-scout-view.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/scout-share-view.png
  modified:
    - app/share/[token]/page.tsx
    - app/share/[token]/teacher-snapshot.tsx
    - app/share/[token]/parent-summary.tsx
    - lib/sharing/types.ts
    - app/screendesign.css

key-decisions:
  - "Existing teacher_snapshot and parent_summary share types remain intact because the deployed database constraint supports those types; the UI maps them to the canonical portfolio and report compositions."
  - "The portfolio share queries the newest owner-scoped portfolio, then separately scopes portfolio items by both owner_id and portfolio_id."
  - "The public portfolio omits profile identity, GPA, grades, diagnoses, classes, honors, and AI policy even where the visual source includes richer promotional data."
  - "The report renders only aggregate completed work, upcoming work, closed study time, concept confidence, and parent-visible teacher notes."
  - "Expired and revoked tokens resolve at the share_links boundary and do not trigger any downstream table read."
  - "Print uses the browser print surface for the already-loaded scoped report and adds no broader download or export query."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "External Scout renders only approved portfolio evidence authorized by an exact active token and owner derived from that share row."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/share/[token]/page.test.tsx external portfolio trust contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts external-scout-view"
        status: pass
    human_judgment: false
  - id: D2
    description: "Academic Report renders minimized aggregate progress and prints only the already-loaded scoped report."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/share/[token]/page.test.tsx and parent-summary.test.tsx"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts scout-share-view"
        status: pass
    human_judgment: false
  - id: D3
    description: "External Scout and Academic Report preserve their canonical 393x852 hierarchy and local ScreenDesign presentation without Nexus composition."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts for both public share screens"
        status: pass
      - kind: other
        ref: "manual source and application capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D4
    description: "Expired and revoked tokens render the calm inactive state and make no owner-data query after the exact-token check."
    requirement: P36-QA
    verification:
      - kind: unit
        ref: "app/share/[token]/page.test.tsx expired-token and revoked-token cases"
        status: pass
      - kind: manual_procedural
        ref: "live /share/not-real HTTP and inactive-copy check"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both public screens pass focused trust, visual, navigation, type, tone, build, full-suite, and live-runtime gates."
    requirement: P36-QA
    verification:
      - kind: integration
        ref: "npm run test:run; npm run typecheck; npm run tone-audit; npm run build"
        status: pass
      - kind: automated_ui
        ref: "combined two-screen mobile Playwright gate"
        status: pass
    human_judgment: false

duration: 19 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 17: Public Share States Summary

**External Scout and Academic Report now match their canonical ScreenDesign compositions while preserving Diana's exact-token, owner-derived, minimized public-share boundary.**

## Performance

- **Duration:** 19 min
- **Completed:** 2026-07-15
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Rebuilt the public External Scout route around a token-authorized portfolio and its approved evidence, with no general student profile or private academic fields.
- Rebuilt the public Academic Report around minimized progress aggregates, parent-visible notes, concept confidence, and an in-place print action.
- Kept service-role access server-only and preserved exact token, revocation, expiry, and owner-derived query boundaries.
- Added focused contracts proving active-token field scope and proving expired plus revoked tokens stop before private evidence reads.
- Added and reviewed both mobile application goldens after source and app capture comparison.

## Task Commits

1. **RED public-share trust contracts:** `af9db79`
2. **Task 1: Rebuild token-scoped External Scout portfolio:** `3272275`
3. **Task 2: Rebuild scoped Academic Report:** `aaa686a`
4. **Tone-audit fallback correction:** `a7862fa`

## Files Created/Modified

- `app/share/[token]/page.tsx` authorizes the exact active token before dispatching the minimized type-specific payload.
- `app/share/[token]/teacher-snapshot.tsx` renders the canonical External Scout portfolio with approved owner-scoped evidence and local media.
- `app/share/[token]/parent-summary.tsx` renders the canonical Academic Report with aggregate progress and loaded-report-only printing.
- `lib/sharing/types.ts` narrows the public portfolio and report contracts to approved fields.
- `app/share/[token]/page.test.tsx` locks exact token, expiry, revocation, owner scope, and field-minimization behavior.
- `app/share/[token]/parent-summary.test.tsx` proves the print action operates on the rendered report without exposing grade data.
- `app/screendesign.css` makes the public-share skip link immediately visible and stable during keyboard-focus verification.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the two reviewed application goldens.

## Decisions Made

- Retained the existing database share types rather than adding a migration solely for UI naming. `teacher_snapshot` owns the portfolio view and `parent_summary` owns the academic report.
- Derived the owner only from the matching active `share_links` record. No user-controlled owner id enters an evidence query.
- Replaced source-only profile, GPA, honors, mastery, and identity details with approved portfolio evidence rather than imitating unsafe source content.
- Kept report data aggregate and consent-aware. The public payload includes no assignment titles, class records, diagnoses, private notes, raw AI interactions, or profile row.
- Implemented printing as `window.print()` on the loaded report, with controls hidden in print media, so the action does not fetch a broader export.
- Rendered invalid, expired, and revoked links through one calm inactive state without confirming whether a token ever existed.

## Deviations from Plan

- Added focused page and report tests before implementation to lock the exact-token boundary, approved field set, inactive-token behavior, and print operation.
- Updated `lib/sharing/types.ts` because the former component contract contained fields that the minimized public payload no longer permits.
- Added a route-scoped skip-link transition override in `app/screendesign.css` after the keyboard gate sampled the global animated transform before focus settled.
- The configured Playwright snapshot template writes goldens under `tests/__screenshots__/...` instead of the generic paths shown in the plan.

## Issues Encountered

- The first report review exposed a global Diana button rule that forced the print action into an angular cyan command style. A component-scoped override restored the canonical full-width white control.
- The final tone audit found an em dash in the empty-mastery fallback. The fallback now uses `N/A`, and the rerun has zero blocking violations.
- Initial visual runs correctly stopped when the new baselines did not exist. Both application captures were inspected before the goldens were explicitly accepted.

## Known Stubs

None in the plan-owned public-share route or type-specific components.

## Security and Privacy

- The unauthenticated route requires an exact token match, `revoked_at IS NULL`, and `expires_at` later than the server's current time.
- The matching share row is the sole source of `owner_id` and `share_type`; inactive token tests prove no downstream table read occurs.
- Portfolio queries scope by owner, and item queries scope by both owner and portfolio.
- Report queries include only owner-scoped aggregate activity, closed study time, concept confidence, and explicitly parent-visible teacher notes.
- Public components receive minimized typed payloads and never receive a general profile record, diagnosis, grade, class, or raw AI history.
- Local assets and synthetic fixture data keep source and app captures free of remote media and real minor data.

## Verification

- Normalized source capture: 2 of 2 passed at 393x852 with local-only assets.
- Focused trust and print suite: 3 files and 11 tests passed.
- Active, expired, and revoked share-token cases passed, with inactive cases proving exactly one `share_links` table read and no private evidence query.
- Reviewed mobile application gate: 2 visual goldens and 2 primary-action contracts passed.
- Full unit suite: 150 files and 850 tests passed.
- `npm run typecheck` passed.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run lint` passed through the repository's typecheck-backed lint command.
- `npm run build` passed with 77 of 77 static pages generated.
- Fresh runtime: listener PID 51412 serves `http://127.0.0.1:3005`; `/login` returned HTTP 200 and `/share/not-real` returned HTTP 200 with the calm inactive copy.
- `git diff --check` passed, and the plan-owned public components contain no Nexus presentation, remote media, private profile path, or unfinished stub.

## User Setup Required

None beyond Diana's existing Supabase configuration and share-link workflow.

## Next Phase Readiness

- Plan 36-17 is complete and ready for the remaining ScreenDesign route groups.
- Both public share compositions are source-faithful and contain no obsolete Nexus presentation.
- Plan 36-23 remains responsible for deleting obsolete presentation files after every replacement screen has landed.

## Self-Check: PASSED

- Both plan-owned routes, minimized payload types, focused tests, exact-token seams, and reviewed goldens exist.
- Four atomic implementation and correction commits exist in Git history.
- Source, visual, navigation, trust, focused behavior, complete-suite, type, tone, production build, threat/stub, and live-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
