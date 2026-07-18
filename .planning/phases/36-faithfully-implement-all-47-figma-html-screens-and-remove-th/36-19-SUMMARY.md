---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "19"
subsystem: ui
tags: [screendesign, notifications, search, wellness, privacy, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic authenticated fixture, visual, navigation, and source-capture harness
  - phase: 36-04
    provides: Source-faithful viewport, local media, wordmark, and five-item navigation primitives
provides:
  - Source-faithful Notification Center over real owner-scoped due work, teacher notes, and LMS evidence
  - Private Smart Search over five supported entity types with bounded escaped input and real routes
  - Private Wellness Recovery Log with persisted mood, sleep, activity, and capability-focused goals
  - Three reviewed 393x852 application goldens plus mobile, tablet, and desktop proof
affects:
  - phase-36-screen-implementation
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Supporting screens query authenticated owner records explicitly in addition to database RLS
    - Search input is normalized, bounded, escaped, and applied only to known title or name columns
    - Health-adjacent UI reports private student choices with calm capability-focused copy and no medical claims
    - Saved client feedback is shown only after validated server actions confirm persistence

key-files:
  created:
    - lib/screendesign/support-screens.ts
    - lib/screendesign/support-screens.test.ts
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/notification-center.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/smart-search.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/wellness-recovery-log.png
  modified:
    - app/(app)/notifications/page.tsx
    - app/(app)/search/page.tsx
    - app/(app)/wellness/page.tsx
    - app/(app)/wellness/wellness-client.tsx
    - app/(app)/wellness/actions.ts
    - lib/qa/screendesign-fixtures.ts
    - tests/screendesign-navigation.spec.ts

key-decisions:
  - "Notification Center renders only persisted due work, teacher notes, and LMS evidence. No static notification filler or unsupported read state is invented."
  - "Smart Search supports assignments, notes, classes, concepts, and artifacts only, with explicit owner filters and a tested real route for each type."
  - "Wellness Recovery replaces the source export's medical and cognitive forecast language with calm study-readiness and recovery copy derived from persisted student choices."
  - "Raw database error messages never reach the Wellness client; actions return calm generic errors while retaining authenticated owner-scoped writes."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "Notification Center shows real authenticated due work, teacher notes, and LMS evidence with factual attention labels and supported deep links."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/screendesign/support-screens.test.ts notification label contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts notification-center primary action contract"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts notification-center mobile, tablet, and desktop"
        status: pass
    human_judgment: false
  - id: D2
    description: "Smart Search returns only five supported owner-scoped entity types, escapes bounded input, excludes another synthetic owner's matches, and sends every result to a real route."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "lib/screendesign/support-screens.test.ts search normalization and route contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts smart-search action and cross-owner exclusion contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts smart-search mobile, tablet, and desktop"
        status: pass
    human_judgment: false
  - id: D3
    description: "Wellness Recovery reads and writes private owner-scoped mood, sleep, activity, and goal state with calm copy and saved feedback only after persistence."
    requirement: P36-FIDELITY
    verification:
      - kind: unit
        ref: "lib/wellness/health.test.ts and lib/screendesign/support-screens.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts wellness-recovery-log successful mutation and reload"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts wellness-recovery-log mobile, tablet, and desktop"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 19: Notification, Search, and Wellness Summary

**Notification Center, Smart Search, and Wellness Recovery now match their canonical ScreenDesign hierarchy over real authenticated data, private actions, and supported navigation.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-07-15T20:21:32-07:00
- **Completed:** 2026-07-15T20:43:04-07:00
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments

- Rebuilt Notification Center around real due assignments, recent teacher notes, and LMS connection evidence with factual labels, calm empty state, and working deep links.
- Rebuilt Smart Search around assignments, notes, classes, concepts, and study artifacts, with explicit owner filters, safe input normalization, real routes, filters, and empty states.
- Added deterministic artifact search evidence and a second synthetic owner check that proves matching private records stay absent.
- Rebuilt Wellness Recovery around private mood, sleep, activity, and capability-focused goal state while replacing medical and cognitive forecast claims with calm recovery guidance.
- Added a combined wellness action that persists mood and sleep before displaying saved feedback, and hardened related server actions so raw database errors never reach the student.
- Captured and reviewed all three normalized sources and 393x852 app views, then accepted local-only goldens and passed mobile, tablet, and desktop checks.

## Task Commits

1. **RED support-screen privacy contracts:** `304d6e8`
2. **GREEN support-screen data contracts:** `5a368fa`
3. **Task 1: Rebuild owner-scoped Notification Center:** `51acc93`
4. **Task 2: Rebuild private Smart Search:** `5af4540`
5. **Task 3: Rebuild private Wellness Recovery:** `ff4fdfb`

## Files Created/Modified

- `lib/screendesign/support-screens.ts` owns safe search normalization and routes, factual notification labels, and calm wellness recovery copy.
- `lib/screendesign/support-screens.test.ts` locks the privacy and copy contracts before UI implementation.
- `app/(app)/notifications/page.tsx` renders the source-shaped scouting report from real owner-scoped due work, teacher notes, and LMS evidence.
- `app/(app)/search/page.tsx` renders the source-shaped search surface and explicitly scopes five supported query types to the authenticated owner.
- `lib/qa/screendesign-fixtures.ts` adds deterministic study-artifact search evidence.
- `tests/screendesign-navigation.spec.ts` proves another synthetic owner's matching search records remain invisible.
- `app/(app)/wellness/page.tsx` loads only the signed-in student's profile, activity, goals, and sleep state.
- `app/(app)/wellness/wellness-client.tsx` provides the source-shaped study-readiness, sleep, recovery, activity, and goal controls.
- `app/(app)/wellness/actions.ts` validates private wellness writes, persists the combined check-in, emits supported task signals, and returns calm generic errors.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains all three reviewed application goldens.

## Decisions Made

- Used no fabricated notification filler. The screen stays quiet when the authenticated account has no real event evidence.
- Did not claim notification read or dismiss persistence because the current schema has no durable notification receipt table. Every supported event still opens its real owner route.
- Limited search to known title and name columns and escaped wildcard characters before calling `ilike`; no raw query enters markup, service-role access, or a broad dynamic filter.
- Kept the source's visual hierarchy but renamed the stress control to Study Readiness and the forecast to Recovery Plan so the UI does not make health or cognitive-timing claims.
- Kept activity and goal capture behind the source's floating plus control so working business operations remain available without changing the default 393x852 hierarchy.
- Scoped route CSS strongly enough to override the obsolete global button treatment without changing shared presentation code assigned to later cleanup plans.

## Deviations from Plan

### Auto-fixed Issues

**1. Added explicit support-screen contract tests**
- **Found during:** Pre-implementation privacy review
- **Issue:** Search escaping, result routing, notification labels, and wellness copy had no focused contract surface.
- **Fix:** Added a RED test file and the smallest pure implementation before rebuilding the screens.
- **Verification:** Five focused tests and the complete suite passed.
- **Committed in:** `304d6e8` and `5a368fa`

**2. Added deterministic search artifact and cross-owner evidence**
- **Found during:** Task 2 privacy verification
- **Issue:** The default search scenario did not contain an artifact and did not prove a second owner's matching rows stayed absent.
- **Fix:** Added a deterministic artifact fixture and a Playwright cross-owner test for assignment, note, and artifact matches.
- **Verification:** Smart Search action, visual, and cross-owner tests passed 3 of 3.
- **Committed in:** `5af4540`

**3. Extended the validated wellness action surface**
- **Found during:** Task 3 operations review
- **Issue:** Existing actions persisted activity, goals, and sleep independently but the canonical check-in also needed the real session mood saved before success feedback.
- **Fix:** Added a validated authenticated `saveWellnessCheckIn` action that updates the owner's profile, upserts the owner's sleep log, and emits supported signals before returning success.
- **Verification:** Wellness primary action completed a successful server mutation, reloaded, and retained a healthy authenticated screen.
- **Committed in:** `ff4fdfb`

**4. Isolated Wellness controls from the old global button style**
- **Found during:** 393x852 app capture review
- **Issue:** The old global `.diana-app button` selector clipped and narrowed the canonical Wellness footer and floating plus controls.
- **Fix:** Added route-scoped higher-specificity resets for Wellness buttons only.
- **Verification:** The corrected source hierarchy was reviewed before regenerating the final passing golden.
- **Committed in:** `ff4fdfb`

**5. Used the configured screenshot template path**
- **Found during:** All three visual reviews
- **Issue:** The plan lists generic snapshot paths, while Playwright writes stable baselines under `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/`.
- **Fix:** Captured normalized source and current app evidence, reviewed each 393x852 pair, and accepted each harness-owned baseline.
- **Verification:** Combined mobile visual gate passed 3 of 3.
- **Committed in:** `51acc93`, `5af4540`, and `ff4fdfb`

---

**Total deviations:** 5 auto-fixed (3 privacy or operations, 1 presentation collision, 1 harness path)
**Impact on plan:** Every deviation was required for explicit privacy proof, real persistence, or deterministic source fidelity. No unsupported capability was invented.

## Issues Encountered

- The first development server had not inherited `QA_CREATE_USER=true`, so the deterministic authentication bootstrap returned a disabled message. The server was restarted with the harness environment and all authenticated checks passed.
- Each initial visual test correctly stopped because its baseline did not exist. Source and application captures were reviewed before accepting the three goldens.
- The normalized Wellness source loses much of its dark Tailwind styling after remote export scripts are removed. The local hierarchy and application were reviewed against both the normalized capture and the canonical HTML structure.
- Global legacy button styling initially altered the Wellness footer and plus controls. Route-scoped CSS fixed the collision without touching shared cleanup targets.

## Known Stubs

None in the plan-owned screens or operations. Durable notification read and dismiss receipts do not exist in the current schema, so this plan truthfully omitted that unsupported state instead of fabricating persistence.

## Security and Privacy

- Notifications, search, activity, goals, sleep, and profile reads all include explicit authenticated owner filters in addition to database RLS.
- Search input is trimmed, whitespace-normalized, limited to 80 characters, wildcard-escaped, and applied only to supported columns.
- A second synthetic owner's matching assignment, note, and artifact rows remain absent from Smart Search results.
- Wellness actions validate constrained Zod values, derive `owner_id` from `auth.getUser()`, and scope profile mutation to `profiles.user_id = authenticated user.id`.
- Raw database errors are replaced with calm generic messages before reaching the Wellness client.
- All source and app screenshots use local application media and synthetic data only, with zero allowed remote asset requests.

## Verification

- Normalized source capture: 3 of 3 passed at 393x852 with local-only assets.
- Combined mobile Playwright gate: 7 of 7 passed, including 3 goldens, 3 primary actions, and 1 cross-owner privacy contract.
- Focused unit gate: 3 files and 23 tests passed.
- Responsive tablet gate: 3 of 3 passed.
- Responsive desktop gate: 3 of 3 passed.
- Full unit suite: 152 files and 860 tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed through the repository's typecheck-backed lint command.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- Fresh runtime: listener PID 50728 serves `http://127.0.0.1:3005`; `/login` returned HTTP 200.
- `git diff --check` passed, and the plan-owned presentation contains no Nexus composition or remote media.

## User Setup Required

None for these screens.

## Next Phase Readiness

- Plan 36-19 is complete and ready for the remaining canonical screen batches.
- Notification Center, Smart Search, and Wellness Recovery are source-faithful, operational, and explicitly owner-scoped.
- Plan 36-23 can remove obsolete shared presentation only after the remaining canonical screens land.
- Final launch validation can rely on the local-only goldens, cross-owner search proof, and persisted Wellness action evidence established here.

## Self-Check: PASSED

- All three plan-owned screens, validated actions, explicit owner filters, focused tests, and reviewed goldens exist.
- Five atomic RED, GREEN, and task commits exist in Git history.
- Source, visual, action, responsive, privacy, focused behavior, complete-suite, type, lint, tone, production build, and fresh-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
