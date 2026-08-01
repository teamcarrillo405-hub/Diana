---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "21"
subsystem: billing-ui
tags: [screendesign, billing, checkout, playwright, privacy, responsive]

requires:
  - phase: 36-03
    provides: Deterministic source, app, action, and responsive ScreenDesign evidence harness
  - phase: 36-04
    provides: Source viewport, typed local media, and low-level visual primitives
provides:
  - Canonical standard and community upgrade compositions at 393x852
  - One server-authoritative checkout capability shared by both compositions
  - Reviewed standard and community goldens with action and responsive evidence
affects:
  - phase-36-navigation
  - phase-36-legacy-removal
  - phase-36-release-gallery

tech-stack:
  added: []
  patterns:
    - Upgrade presentation receives only a server-resolved billing capability boolean
    - Unsupported social proof and pricing are replaced with truthful product and privacy evidence
    - Canonical public and QA state selectors resolve to the same community composition

key-files:
  created:
    - app/(app)/upgrade/upgrade-screen.tsx
    - app/(app)/upgrade/upgrade-screen.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/paywall-standard.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/paywall-social-proof.png
  modified:
    - app/(app)/upgrade/page.tsx

key-decisions:
  - "Both upgrade compositions use the same server-resolved checkout authority and the same authenticated billing endpoint."
  - "Unconfigured billing routes to account settings and never presents purchase, trial, or entitlement success."
  - "Unsupported prices, user counts, testimonials, score claims, and time-saved claims are replaced with supported learning capabilities and private membership rules."
  - "The community composition accepts both view=community and the canonical QA sdState=view=community selector."

patterns-established:
  - "Billing truth: UI capability state comes from resolveBillingCheckoutUrl while the API endpoint independently repeats authentication and URL validation."
  - "Social proof substitution: local source art may preserve composition but cannot establish a real person, result, membership, or testimonial."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "The standard upgrade state preserves the canonical hierarchy while showing only supported Diana capabilities and truthful checkout availability."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts#paywall-standard current app evidence"
        status: pass
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts#paywall-standard primary action contract"
        status: pass
      - kind: unit
        ref: "app/(app)/upgrade/upgrade-screen.test.tsx#canonical standard hierarchy"
        status: pass
    human_judgment: true
    rationale: "The 393x852 baseline was explicitly compared with the canonical source during execution, and final source-fidelity judgment remains part of the release gallery review."
  - id: D2
    description: "The community upgrade state preserves the source composition with local media while avoiding fabricated members, testimonials, prices, and outcomes."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts#paywall-social-proof current app evidence"
        status: pass
      - kind: e2e
        ref: "tests/screendesign-navigation.spec.ts#paywall-social-proof primary action contract"
        status: pass
      - kind: unit
        ref: "app/(app)/upgrade/upgrade-screen.test.tsx#community confidence without fabrication"
        status: pass
    human_judgment: true
    rationale: "The privacy substitutions were explicitly reviewed against the source, and final visual judgment remains part of the release gallery review."
  - id: D3
    description: "Configured and unavailable billing states remain server-authoritative and never simulate purchase success."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/billing/checkout.test.ts#resolveBillingCheckoutUrl"
        status: pass
      - kind: unit
        ref: "app/(app)/upgrade/upgrade-screen.test.tsx#server checkout endpoint only for configured capability"
        status: pass
      - kind: integration
        ref: "configured runtime proof: /api/billing/checkout returned 307 to allowlisted HTTPS origin with server-added account reference"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 21: Truthful Canonical Upgrade States Summary

**Standard and community ScreenDesign upgrade compositions now share one authenticated server billing gate, two reviewed mobile goldens, and truthful capability and privacy copy.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-15T21:16:23-07:00
- **Completed:** 2026-07-15T21:27:50-07:00
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Replaced the generic `PageShell` upgrade route with a dedicated 393x852 standard composition that preserves the source hierarchy without unsupported pricing or trial claims.
- Added the community composition with the local athlete image, source-shaped confidence cards, and real membership and privacy rules instead of invented users, testimonials, scores, or time savings.
- Proved unavailable and configured states against one server authority, including a live 307 checkout redirect to the allowlisted HTTPS provider with a server-added account reference.
- Explicitly reviewed and approved both mobile goldens, then passed mobile actions, tablet and desktop safety, local-only request checks, build, full Vitest, type, lint, and tone gates.

## Task Commits

1. **Task 1 RED: Define truthful standard upgrade contract** - `b4547e3` (test)
2. **Task 1 GREEN: Rebuild truthful standard upgrade screen** - `7e6f8e8` (feat)
3. **Task 2 RED: Define truthful community upgrade contract** - `328f1a5` (test)
4. **Task 2 GREEN: Add truthful community upgrade state** - `ff3b550` (feat)

## Files Created/Modified

- `app/(app)/upgrade/page.tsx` - Resolves billing capability on the server and selects standard or community state.
- `app/(app)/upgrade/upgrade-screen.tsx` - Owns both canonical compositions, local source media, truthful copy, and action routing.
- `app/(app)/upgrade/upgrade-screen.test.tsx` - Covers unsupported-claim removal and configured versus unavailable behavior.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/paywall-standard.png` - Explicitly reviewed standard mobile golden.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/paywall-social-proof.png` - Explicitly reviewed community mobile golden.

## Decisions Made

- Kept `resolveBillingCheckoutUrl` as the presentation capability authority and `/api/billing/checkout` as the only checkout transition. The endpoint repeats authentication and URL validation before redirecting.
- Used `/settings` as the honest unavailable action. No UI path claims that payment, trial, entitlement, or account upgrade completed.
- Preserved the source visual confidence through geometry, cards, local art, and gradient actions rather than through unsupported numbers or named testimonials.
- Accepted both the public query and deterministic harness state selector for the community route so production and QA exercise the same composition.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Canonical QA selector rendered the standard state**
- **Found during:** Task 2 visual comparison
- **Issue:** The route recognized `view=community` but the canonical fixture uses `sdState=view=community`, so the first community capture rendered the standard composition.
- **Fix:** The server route now recognizes both exact selectors and passes one normalized community view to the screen.
- **Files modified:** `app/(app)/upgrade/page.tsx`
- **Verification:** The recaptured community image rendered its unique hero, proof card, local art, facts, and access state; mobile visual and action tests passed.
- **Committed in:** `ff3b550`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** The fix restored the canonical state contract without widening accepted values or changing the billing authority.

## Issues Encountered

- The first missing-snapshot runs intentionally stopped after emitting app evidence. Each golden was created only after comparing that evidence with the normalized source image.
- The first community comparison exposed the selector mismatch above. No baseline was approved until the correct community composition rendered.

## Known Stubs

None. The unavailable billing state is intentional operational truth, not a placeholder. Both compositions have real navigation and one configured checkout authority.

## Threat Review

- T-36-41 is mitigated because the client receives only the server-resolved capability boolean and cannot supply a configured state or checkout URL.
- T-36-42 is mitigated because both CTAs target the existing authenticated endpoint, which repeats HTTPS allowlist resolution and constructs the account reference server-side.
- No new endpoint, schema, credential path, or external runtime dependency was introduced.

## Verification

- Source capture: 2 of 2 normalized paywall sources passed at 393x852 with no remote requests.
- Mobile app evidence: 2 of 2 visual goldens and 2 of 2 primary actions passed.
- Responsive evidence: standard and community passed at 768x1024 and 1440x1000 with no horizontal overflow or console errors.
- Billing tests: 3 resolver tests and 3 component behavior tests passed.
- Configured runtime: the UI exposed `/api/billing/checkout`; the authenticated endpoint returned 307 to the allowlisted HTTPS provider path with a server-added account reference.
- `npm run build` passed with 77 generated routes.
- `npm run test:run` passed 154 files and 866 tests.
- `npm run lint`, `npm run typecheck`, and `npm run tone-audit` passed. Tone reported one pre-existing non-blocking assignment copy warning outside this plan.
- Runtime restarted on port 3005; authenticated `/upgrade` and `/upgrade?view=community` each returned HTTP 200.

## User Setup Required

None. The current unavailable state is honest. A real checkout appears only when the existing billing environment is intentionally configured.

## Next Phase Readiness

- Plan 36-22 can connect the final navigation graph to both exact upgrade states.
- Plan 36-23 can remove remaining legacy presentation without an upgrade route dependency on `PageShell`.
- The final release gallery can surface both reviewed goldens for human approval.

## Self-Check: PASSED

- All five plan implementation, test, and golden files exist.
- All four RED and GREEN task commits exist and contain no tracked-file deletion.
- Focused source, visual, action, responsive, billing, type, tone, build, full Vitest, and runtime gates passed.
- Only the user-owned newline-only `.planning/config.json` change remains unstaged and untouched.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
