---
phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th
plan: "18"
subsystem: ui
tags: [screendesign, settings, profile, lms, ai-history, supabase, playwright]

requires:
  - phase: 36-03
    provides: Deterministic authenticated fixture, visual, navigation, and source-capture harness
  - phase: 36-04
    provides: Source-faithful viewport, local media, wordmark, and five-item navigation primitives
provides:
  - Source-faithful AI Game Film over minimized owner-scoped interaction and authorship evidence
  - Truthful LMS Sync Center whose client props contain no credentials or raw provider config
  - Editable Profile Center with durable core, onboarding, accessibility, privacy, and personalization controls
  - Read-only Profile Center reuse at /me
  - Three reviewed 393x852 application goldens
affects:
  - phase-36-screen-implementation
  - phase-36-linked-onboarding-schema
  - phase-36-obsolete-visual-removal
  - phase-36-release-validation

tech-stack:
  added: []
  patterns:
    - Account screens receive minimized server-derived view models instead of private Supabase rows
    - LMS status is derived only from persisted sync evidence and never from optimistic client state
    - Profile Center is editable only at /settings while /me reuses the composition without duplicate mutations
    - Timestamped onboarding fields degrade truthfully while a linked database migration is pending

key-files:
  created:
    - app/(app)/settings/source-models.ts
    - app/(app)/settings/profile-center.tsx
    - app/(app)/settings/profile-center-form.tsx
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/ai-history-log.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/lms-sync-center.png
    - tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/settings-profile-center.png
  modified:
    - app/(app)/settings/ai-history/page.tsx
    - app/(app)/settings/ai-history/actions.ts
    - app/(app)/settings/lms-connections.tsx
    - app/(app)/settings/page.tsx
    - app/(app)/settings/actions.ts
    - app/(app)/me/page.tsx
    - lib/profile.ts
    - app/api/lms/sync-all/route.ts

key-decisions:
  - "AI History combines ai_interactions and authorship_log only after explicit owner filters, and the client receives no prompt payload or authorship payload."
  - "LMS config remains server-only; the browser receives provider, safe status, last sync time, and a calm scrubbed message only."
  - "Connected and sync-success labels require persisted last_synced_at or a confirmed successful route result; partial sync errors remain amber and actionable."
  - "/settings owns profile mutation and /me reuses the same source composition read-only."
  - "A legacy profile read/save compatibility path keeps current settings operational until Plan 36-26 applies the linked onboarding migration, without inventing values for missing fields."

requirements-completed: [P36-FIDELITY, P36-OPERATIONS, P36-QA]

coverage:
  - id: D1
    description: "AI Game Film renders real owner-scoped interaction and authorship evidence with working search, filters, review links, safe CSV, and deletion."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/settings/source-models.test.ts AI merge and spreadsheet-safe CSV contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts ai-history-log"
        status: pass
    human_judgment: false
  - id: D2
    description: "LMS Sync Center exposes no credential config, derives state from persisted evidence, and reaches real connect, sync, and disconnect operations."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/settings/source-models.test.ts LMS sanitization and partial-error outcome contracts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts lms-sync-center"
        status: pass
    human_judgment: false
  - id: D3
    description: "Profile Center loads and saves owner-scoped core and onboarding values while retaining real accessibility, theme, background, privacy, sharing, import, device, and sign-out controls."
    requirement: P36-OPERATIONS
    verification:
      - kind: unit
        ref: "app/(app)/settings/source-models.test.ts and lib/profile.test.ts"
        status: pass
      - kind: automated_ui
        ref: "tests/screendesign-navigation.spec.ts settings-profile-center successful POST and reload"
        status: pass
    human_judgment: false
  - id: D4
    description: "AI History, LMS Sync Center, and Profile Center preserve the canonical 393x852 hierarchy, local media, keyboard focus, and calm Diana presentation without Nexus composition."
    requirement: P36-FIDELITY
    verification:
      - kind: automated_ui
        ref: "tests/screendesign-visual.spec.ts for all three account screens"
        status: pass
      - kind: other
        ref: "manual source and application capture review at 393x852"
        status: pass
    human_judgment: true
    rationale: "Final source fidelity approval includes visual judgment after deterministic source and application captures."
  - id: D5
    description: "All three screens pass mobile actions and goldens, tablet and desktop safety checks, the complete unit suite, type, tone, build, and live runtime gates."
    requirement: P36-QA
    verification:
      - kind: integration
        ref: "npm run test:run; npm run typecheck; npm run tone-audit; npm run build"
        status: pass
      - kind: automated_ui
        ref: "combined three-screen mobile, tablet, and desktop Playwright gates"
        status: pass
    human_judgment: false

duration: 27 min
completed: 2026-07-15
status: complete
---

# Phase 36 Plan 18: Account and Settings Sources Summary

**AI Game Film, truthful LMS Sync Center, and Profile Center now match their canonical ScreenDesign compositions over minimized, authenticated account state and real operations.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-07-15T19:43:52-07:00
- **Completed:** 2026-07-15T20:10:24-07:00
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Rebuilt AI History as the canonical Game Film screen using both `ai_interactions` and `authorship_log`, with search, actor filters, record review, safe CSV export, owner-scoped deletion, and calm empty state.
- Rebuilt the LMS Sync Center around server-sanitized connection state, real provider routes and actions, owner-scoped queries, honest empty/attention/pending/synced states, and no client credential config.
- Rebuilt Settings Profile Center around the real profile photo, core account fields, onboarding hurdle and schedule, reading/accessibility, personalization, privacy/sharing, imports, notifications, sign-out, and a validated save action.
- Reused the Profile Center composition at `/me` without exposing mutations there.
- Added and explicitly reviewed all three 393x852 goldens, then passed mobile action, tablet, and desktop checks.

## Task Commits

1. **RED account privacy contracts:** `8ca5bb5`
2. **Task 1: Rebuild AI History Game Film:** `d74c580`
3. **RED truthful LMS outcome contract:** `9e780ac`
4. **Task 2: Rebuild truthful LMS Sync Center:** `ed06956`
5. **RED profile school-year truth contract:** `077dc6a`
6. **Task 3: Rebuild Settings Profile Center:** `9550f64`

## Files Created/Modified

- `app/(app)/settings/source-models.ts` merges minimized audit evidence, sanitizes LMS config into safe states, summarizes sync outcomes, and maps persisted school year labels.
- `app/(app)/settings/source-models.test.ts` locks audit, CSV, LMS privacy/status, and school-year truth contracts.
- `app/(app)/settings/ai-history/page.tsx` renders the source-shaped Game Film hierarchy from real account evidence.
- `app/(app)/settings/ai-history/actions.ts` loads both history sources and deletes only owner-scoped selected rows.
- `app/(app)/settings/ai-history/csv-export-button.tsx` exports the minimized merged history as formula-safe CSV.
- `app/(app)/settings/lms-connections.tsx` renders the source-shaped connection center and reaches supported OAuth, token, calendar, school-managed, GitLab, sync, and disconnect operations.
- `app/(app)/settings/page.tsx` selects the canonical Profile or LMS state while loading only owner-scoped account data.
- `app/(app)/settings/profile-center.tsx` composes the canonical editable/read-only profile hierarchy and retains all real settings controls.
- `app/(app)/settings/profile-center-form.tsx` submits validated core and onboarding values without widening the server contract.
- `app/(app)/settings/actions.ts` validates and persists Profile Center values under the authenticated user id.
- `app/(app)/me/page.tsx` reuses Profile Center read-only with minimized connection views.
- `lib/profile.ts` loads the dedicated onboarding fields and truthfully handles a temporarily older linked schema.
- `app/api/lms/*-sync/route.ts` adds explicit owner filters to connection reads, credential refreshes, and last-sync updates.
- `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/` contains the three reviewed application goldens.

## Decisions Made

- Combined `ai_interactions` and `authorship_log` into one source-shaped timeline but never forwarded raw prompt or authorship payloads to the client.
- Treated a saved LMS connection with no confirmed sync as pending, not connected or successful. Only `last_synced_at` creates the synced state.
- Sanitized LMS connection config on the server. The client receives no token, refresh token, password, calendar URL, or arbitrary provider config.
- Kept `/settings` as the sole editable owner and `/me` as a read-only reuse so profile mutations have one validated implementation.
- Preserved accessibility, privacy, personalization, sharing, and integration components below the canonical source hierarchy instead of deleting working business controls.
- Kept a truthful compatibility path for linked databases that have not applied the timestamped onboarding fields yet. Core settings still save, missing onboarding values remain unset, and Plan 36-26 owns the linked migration proof.

## Deviations from Plan

### Auto-fixed Issues

**1. Added explicit LMS owner filters inside sync routes**
- **Found during:** Task 2 privacy review
- **Issue:** Several routes relied on RLS after the authenticated read but did not also include explicit owner filters on credential refresh and sync timestamp updates.
- **Fix:** Added `owner_id = user.id` to connection reads and updates in Canvas, Classroom, calendar, and sync-all routes.
- **Verification:** Typecheck, complete unit suite, focused LMS action/visual gate, and production build passed.
- **Committed in:** `ed06956`

**2. Added timestamped-schema compatibility for Profile Center**
- **Found during:** Task 3 navigation verification
- **Issue:** The connected QA database is behind the committed onboarding migration, so selecting both new profile columns returned no profile and the authenticated login route redirected to the dashboard.
- **Fix:** Load legacy profile fields only when the missing-column error names the two known onboarding fields, assign no invented values, and save existing core fields truthfully while the migration is pending.
- **Verification:** Profile navigation now performs a successful authenticated POST and reload; visual, unit, type, build, and complete-suite gates pass.
- **Committed in:** `9550f64`

**3. Used the configured screenshot template path**
- **Found during:** All three task reviews
- **Issue:** The plan lists generic snapshot paths, while Playwright writes stable baselines under `tests/__screenshots__/screendesign-visual.spec.ts/screendesign-mobile/`.
- **Fix:** Explicitly reviewed source and app captures, then accepted each baseline at the harness-owned path.
- **Verification:** Combined mobile visual gate passed 3 of 3.
- **Committed in:** `d74c580`, `ed06956`, and `9550f64`

---

**Total deviations:** 3 auto-fixed (2 correctness/security, 1 harness path)
**Impact on plan:** Every deviation was required for truthful state, owner safety, or deterministic verification. No unsupported capability was added.

## Issues Encountered

- Each first visual run correctly stopped because no baseline existed. The normalized source and current application captures were inspected at 393x852 before accepting the golden.
- The global skip-link transition left the first keyboard focus sample above the viewport on AI History. A route-scoped immediate focus transform fixed the accessibility gate.
- Running three Playwright projects concurrently caused synthetic seed/auth races because the projects share deterministic fixture owners. Mobile, tablet, and desktop were rerun sequentially and all 12 relevant checks passed.
- The normalized LMS source capture loses some Tailwind-export styling after remote-script removal. The local HTML hierarchy and app capture were therefore reviewed directly against the canonical source document as well as the deterministic normalized capture.

## Known Stubs

None in the plan-owned screens or operations. The linked database migration application and persistence proof remain explicitly assigned to Plan 36-26.

## Security and Privacy

- AI History queries both audit tables with explicit authenticated owner filters and sends only whitelisted fields to the client.
- AI CSV cells prevent spreadsheet formula execution, and the export contains no raw prompt or authorship payload.
- LMS connection config is sanitized on the server. Tokens, refresh tokens, passwords, URLs, and arbitrary config never enter the component props or visual evidence.
- LMS route reads and writes include explicit owner filters in addition to RLS.
- Profile Center updates only zod-validated fields under `profiles.user_id = authenticated user.id`; existing accessibility, privacy, personalization, and onboarding values are not replaced by unrelated saves.
- All source and app screenshots use local application media and synthetic data only, with zero allowed remote asset requests.

## Verification

- Normalized source capture: 3 of 3 passed at 393x852 with local-only assets.
- Focused settings model/profile suite: 2 files and 12 tests passed.
- Combined mobile gate: 3 visual goldens and 3 primary-action contracts passed.
- Responsive tablet gate: 3 of 3 passed.
- Responsive desktop gate: 3 of 3 passed.
- Full unit suite: 151 files and 855 tests passed.
- `npm run typecheck` passed.
- `npm run lint` passed through the repository's typecheck-backed lint command.
- `npm run tone-audit` reported 0 blocking violations and one unrelated advisory for `deadline` in `app/(app)/assignments/page.tsx`.
- `npm run build` passed with 77 of 77 static pages generated.
- Fresh runtime: listener PID 3412 serves `http://127.0.0.1:3005`; `/login` returned HTTP 200 with Diana content.
- `git diff --check` passed, and the plan-owned presentation contains no Nexus composition or remote media.

## User Setup Required

None for these screens. Plan 36-26 remains responsible for applying and proving the existing onboarding preference migration against the linked database before launch.

## Next Phase Readiness

- Plan 36-18 is complete and ready for notifications, search, and wellness recovery in Plan 36-19.
- Account history, LMS state, and Profile Center are source-faithful and contain no obsolete Nexus presentation.
- Plan 36-23 can remove obsolete presentation files only after all remaining canonical screens land.
- Plan 36-26 must apply and verify the timestamped onboarding migration before final launch validation.

## Self-Check: PASSED

- All three plan-owned screen components, minimized view models, validated actions, explicit owner filters, focused tests, and reviewed goldens exist.
- Six atomic RED/GREEN commits exist in Git history.
- Source, visual, action, responsive, privacy, focused behavior, complete-suite, type, lint, tone, production build, and fresh-runtime gates passed.

---
*Phase: 36-faithfully-implement-all-47-figma-html-screens-and-remove-th*
*Completed: 2026-07-15*
