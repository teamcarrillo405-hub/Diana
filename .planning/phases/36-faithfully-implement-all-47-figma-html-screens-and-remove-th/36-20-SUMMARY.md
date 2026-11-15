---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "20"
subsystem: ui
tags: [screendesign, study-groups, tutor-preferences, privacy, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic authenticated fixture, visual, navigation, and source-capture harness
  - phase: 36-04
    provides: Source-faithful viewport, local media, wordmark, and five-item navigation primitives
provides:
  - Source-faithful private Study Room and member-scoped Community activity states
  - Source-faithful Tutor Gallery and Tutor Personalization states with durable profile preferences
  - Explicit authenticated membership filtering on top of study-group RLS
  - Four reviewed 393x852 application goldens plus mobile, tablet, and desktop proof
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Community activity is limited to groups owned by or joined by the authenticated student
    - Source leaderboard excitement is represented as private group activity, never public minor ranking
    - Tutor persona, style, and complexity remain allowlisted profile preferences and do not alter AI policy
    - ScreenDesign portraits and avatars are served from the application-owned local asset library

key-files:
  created:
    - app/(app)/settings/tutor/tutor-preferences.test.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/study-room-social.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/global-leaderboard.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/tutor-gallery.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/tutor-personalization.png
  modified:
    - app/(app)/study-groups/page.tsx
    - app/(app)/study-groups/study-groups-client.tsx
    - app/(app)/settings/tutor/page.tsx
    - app/(app)/settings/tutor/tutor-preferences.tsx
    - lib/social/collaboration.ts
    - lib/social/collaboration.test.ts

key-decisions:
  - "Community cards are derived only from real visible group members and sessions; local avatar art is assigned only to those real records."
  - "Private membership scope is enforced in the loader and again through memberScopedGroupRows in addition to existing RLS."
  - "The former global leaderboard composition is adapted into private community activity with explicit copy that Diana does not publish student rankings."
  - "Tutor presentation persists only supported persona, style, and complexity values and never changes the provider, class AI rules, authorship controls, or safety policy."

requirements-completed: [P36-FIDELITY, P36-ASSETS, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Study Room shows source-faithful private room context and supports real create, join, session, review-card, and collaborative-note operations."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/social/collaboration.test.ts private group and action contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts study-room-social primary action contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts study-room-social mobile, tablet, and desktop"
        status: pass
    human_judgment: false
  - id: D2
    description: "Community activity excludes public and cross-group minor ranking and renders only authenticated owner or member scope."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "lib/social/collaboration.test.ts memberScopedGroupRows cross-owner exclusion"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts global-leaderboard primary navigation contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts global-leaderboard mobile, tablet, and desktop"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tutor Gallery and Personalization preserve selection, save allowlisted preferences, and leave class AI safety and authorship controls unchanged."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/settings/tutor/tutor-preferences.test.tsx selection, back, persistence, and safety contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts tutor-gallery and tutor-personalization mutation contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts tutor-gallery and tutor-personalization mobile, tablet, and desktop"
        status: pass
    human_judgment: false

duration: 24 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 20: Social and Tutor Preference Summary

**Private Study Room, member-scoped Community activity, Tutor Gallery, and Tutor Personalization now match their canonical ScreenDesign sources over real authenticated data and validated operations, with no Nexus composition.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-07-15T20:45:00-07:00
- **Completed:** 2026-07-15T21:09:00-07:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Replaced the generic study-group shell with the source-shaped Study Room, including local library art, focus timer, real member roster, invite code, working join and session controls, shared review cards, and collaborative notes.
- Replaced the public leaderboard implication with authenticated private Community activity. Only groups the student owns or joined can contribute records, and the UI explicitly states that Diana does not publish student rankings.
- Replaced the generic tutor preference grid with the ScreenDesign Tutor Gallery and Tutor Personalization flow using local Diana, Xavier, and Maya portraits.
- Preserved tutor selection across gallery, personalization, and back navigation, then displayed confirmation only after the validated owner-scoped server action returned success.
- Kept tutor style separate from AI infrastructure and policy. Persona, style, and complexity do not alter provider choice, class AI rules, authorship logging, or safety enforcement.
- Captured and reviewed all four normalized sources and 393x852 app views, accepted local-only goldens, and passed mobile, tablet, and desktop checks.

## Task Commits

1. **RED tutor preference flow contracts:** `219663f`
2. **Task 1: Rebuild private Study Room and Community activity:** `a39f520`
3. **Task 2 GREEN: Implement Tutor Gallery and Personalization:** `c04a72a`

## Files Created/Modified

- `app/(app)/study-groups/page.tsx` loads only authenticated group memberships, visible groups, members, and room workspaces before rendering either canonical state.
- `app/(app)/study-groups/study-groups-client.tsx` renders the source-shaped room and community views with real operations and truthful capability boundaries.
- `lib/social/collaboration.ts` adds a defense-in-depth authenticated member-scope filter.
- `lib/social/collaboration.test.ts` proves a nonmember cannot retain another owner's group activity.
- `app/(app)/settings/tutor/page.tsx` supplies the source viewport, local visual system, and route-owned gallery or personalization state.
- `app/(app)/settings/tutor/tutor-preferences.tsx` implements portrait selection, style selection, complexity control, back preservation, and validated save feedback.
- `app/(app)/settings/tutor/tutor-preferences.test.tsx` locks the gallery-to-personalization flow, persisted allowlist values, back behavior, and unchanged safety messaging.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the four reviewed application goldens.

## Decisions Made

- Kept the source's high-energy social hierarchy while converting leaderboard language into private member activity. No public or cross-group minor score is queried or displayed.
- Added loader-level membership filtering on top of Supabase RLS so the UI cannot accidentally retain a group that is outside the authenticated student's owner or member scope.
- Mapped local avatar art only to real member rows. Empty or sparse groups stay honest instead of receiving fabricated friends or activity.
- Kept group departure and membership administration owner-managed because the current supported action surface does not provide a safe general leave operation.
- Reused the existing tutor Zod enums and owner-scoped profile update. The portrait is a preference, not an AI provider switch or a class-policy bypass.
- Used route-scoped CSS to displace obsolete shell presentation without changing shared cleanup targets assigned to later plans.

## Deviations from Plan

### Auto-fixed Issues

**1. Added explicit member-scope defense and unit coverage**
- **Found during:** Task 1 trust-boundary review
- **Issue:** RLS was present, but the page adapter did not have a focused defense-in-depth contract proving another owner's group row is removed.
- **Fix:** Added `memberScopedGroupRows` and a cross-owner exclusion test before rendering community activity.
- **Verification:** Seven collaboration tests and the complete suite passed.
- **Committed in:** `a39f520`

**2. Added Tutor flow coverage before implementation**
- **Found during:** Task 2 TDD execution
- **Issue:** The old generic preference grid had no component contract for preserved selection, supported values, back navigation, saved confirmation, or unchanged safety controls.
- **Fix:** Committed failing interaction tests first, then rebuilt the flow until both tests passed.
- **Verification:** RED commit `219663f` preceded GREEN commit `c04a72a`; focused and complete suites passed.
- **Committed in:** `219663f` and `c04a72a`

**3. Used the configured screenshot template path**
- **Found during:** All four visual reviews
- **Issue:** The plan lists generic snapshot paths, while Playwright stores stable baselines under `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/`.
- **Fix:** Captured normalized sources and current app evidence, reviewed each pair, and accepted each harness-owned baseline.
- **Verification:** Combined mobile visual and action gate passed 8 of 8.
- **Committed in:** `a39f520` and `c04a72a`

---

**Total deviations:** 3 auto-fixed (1 privacy proof, 1 TDD contract, 1 harness path)
**Impact on plan:** The deviations strengthen privacy, persistence proof, and deterministic fidelity. No unsupported social or AI capability was introduced.

## Issues Encountered

- Each initial visual test correctly stopped because its baseline did not exist. The normalized source and current application image were manually compared before accepting all four goldens.
- Running tablet and desktop projects in the same Playwright command started two fixture workers against the same synthetic user and produced a transient seed and focus race. Running each configured project independently with one worker passed all eight responsive checks.
- The source tutor personalization export loses portions of its remote icon treatment after remote resources are removed. The application uses local icons and portraits while retaining the canonical hierarchy, spacing, selection states, and palette.

## Known Stubs

None in the plan-owned supported operations. Group departure and membership administration remain truthfully owner-managed, and free-form room chat is not exposed because the current product does not have a supported moderated minor-chat backend.

## Security and Privacy

- Study-group reads are constrained to authenticated owner or membership scope in both database policy and page adaptation.
- Community activity never exposes public or cross-group minor ranking.
- No fabricated member records, public names, remote avatars, or synthetic identifiers enter screenshots or product output.
- Tutor writes validate persona, style, and complexity through fixed Zod enums and scope the profile update to `profiles.user_id = authenticated user.id`.
- Tutor preferences do not mutate AI traffic-light policy, authorship controls, provider selection, token budgets, or safety enforcement.
- All source and application screenshots use local application media and synthetic data only, with zero allowed remote asset requests.

## Verification

- Normalized source capture: 4 of 4 passed at 393x852 with local-only assets.
- Combined mobile Playwright gate: 8 of 8 passed, including 4 goldens and 4 primary action contracts.
- Focused unit gate: 3 files and 10 tests passed.
- Responsive tablet gate: 4 of 4 passed.
- Responsive desktop gate: 4 of 4 passed.
- Full unit suite: 153 files and 863 tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed through the repository's typecheck-backed lint command.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- Fresh runtime serves `http://127.0.0.1:3005`; `/login` returned HTTP 200.
- `git diff --check` passed, and the plan-owned presentation contains no Nexus composition or remote media.

## User Setup Required

None for these screens.

## Next Phase Readiness

- Plan 36-20 is complete and ready for the remaining canonical screen batches.
- Private social activity and tutor preferences are source-faithful, operational, and explicitly member or owner scoped.
- Plan 36-23 can remove obsolete shared Nexus and Mission Control presentation only after the remaining canonical screens land.
- Final launch validation can rely on the four local-only goldens, member-scope proof, allowlisted tutor persistence, and fresh build evidence established here.

## Self-Check: PASSED

- All four plan-owned states, local assets, validated actions, privacy boundaries, focused tests, and reviewed goldens exist.
- Three atomic RED, task, and GREEN commits exist in Git history.
- Source, visual, action, responsive, privacy, focused behavior, complete-suite, type, lint, tone, production build, and fresh-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
