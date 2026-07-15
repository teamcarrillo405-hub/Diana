# Phase 36 Validation Contract

**Phase:** 36 - Faithful ScreenDesign rebuild  
**Nyquist validation:** enabled  
**Contract status:** required before execution  
**Acceptance viewport:** 393 by 852 in controlled Windows Chromium

This file is the planning-time validation contract. Execution evidence is written later to `36-VERIFICATION.md`. A route existing, a component rendering, or a screenshot file being present is not completion evidence.

## Observable Phase Outcome

Phase 36 is valid only when all of the following are true on one release commit:

1. The canonical registry contains exactly 47 source states and gives the attached dashboard precedence.
2. All 24 ScreenDesign resources and four DiceBear avatars are local, verified, and used by source and app captures.
3. Every source capture is inert, script-free, repaired where malformed, and produces zero remote requests.
4. Every app state uses deterministic owner-scoped records or an explicit honest empty/guarded state.
5. Every one of the 47 states passes source/app visual comparison at 393 by 852 and its declared primary action.
6. Larger viewports, keyboard focus, accessibility, reduced motion, calm copy, and secure server boundaries pass.
7. The linked Supabase preview schema contains and persists the two onboarding fields before onboarding UI execution.
8. Canonical routes contain none of the prohibited old shell, dashboard, Quiet Command, selector, or composition imports.
9. The final gallery contains exactly 47 complete source/app/diff/action rows.
10. Vercel inspection metadata and the served build identity equal the local release commit SHA before human review.
11. Every multi-command gate runs through the checked-in shell-free native-command runner and stops at the first failure in Windows PowerShell 5.1.

## Wave 0 Prerequisites

These validation capabilities must exist before broad screen implementation can be accepted. The implementation plans may be numbered in Waves 1 through 3, but these are the Nyquist Wave 0 contracts for behavior work.

| Prerequisite | Owner | Blocking proof |
|---|---:|---|
| PowerShell 5.1-safe fail-fast runner | 36-01 | `node --test scripts/run-verified-commands.test.mjs` proves native argv execution, environment controls, Windows npm/npx shim resolution, and first-failure short circuiting without invoking a shell. |
| Canonical screen contract | 36-01 | `npx vitest run lib/screendesign/screens.test.ts` proves exactly 47 ids, route/state owners, dashboard precedence, and snapshot names. |
| Local media contract | 36-02 | `node scripts/run-verified-commands.mjs -- node scripts/localize-screendesign-assets.mjs --verify --next npx vitest run lib/screendesign/assets.test.ts` proves 24 plus four owned assets, hashes, dimensions, and complete URL coverage. |
| Typed fixture scenarios | 36-27 | `npx vitest run lib/qa/screendesign-fixtures.test.ts` proves every screen and guarded branch has deterministic real-record requirements. |
| Normalized source capture | 36-28 | `npx vitest run tests/screendesign-source-normalization.test.ts` proves script stripping, all 28 media rewrites, dashboard CSS repair, and remote-request denial. |
| Controlled browser harness | 36-03 | `npx playwright test tests/screendesign-source-capture.spec.ts --project=screendesign-source --list` proves exact projects and 47 enumerated cases. |
| Reusable release evidence validators | 36-30 | `npx vitest run lib/screendesign/release-evidence.test.ts` proves exactly-47 gallery, receipt, and three-way SHA equality failure behavior before production. |
| Independent actual-output validation | 36-29 | `npx tsx scripts/validate-screendesign-review-gallery.ts --expected 47 --require-complete --expected-sha HEAD --run-id phase36-plan30 --write-receipt test-results/screendesign-review/validation.json` accepts the unchanged Plan 36-30 output. |
| Linked onboarding backend | 36-26 | Linked migration apply, live schema verification, and owner-scoped persistence smoke must pass before 36-07. |

No canonical implementation plan may mark a screen complete until the registry, fixture, normalized source, and controlled browser contracts above are available.

The release-only evidence prerequisite is owned by Plan 36-30 after all screens and the removal gate pass. Its clean producer run must create exactly 47 normalized source PNGs, 47 current app PNGs, 47 diff PNGs, 47 action/navigation records, baseline metadata, hashes, one run id, and the current release SHA. Plan 36-29 then independently validates that unchanged actual output and writes its receipt. Plan 36-24 runs only afterward and must consume the same output and receipt without regenerating evidence.

## Fixture Strategy

### Identity and ownership

- Use synthetic QA identities only. Never use a real student's credentials, rows, text, wellness data, or screenshots.
- `seedScreenDesignScenario` creates records under the selected QA owner. A second synthetic owner is used for negative isolation checks.
- Elevated access may bootstrap a QA auth identity on the server, but service-role keys and arbitrary owner ids never enter client responses or test artifacts.
- Seed and cleanup are idempotent and may delete only rows owned by the QA identities created for the run.

### Determinism

- Freeze the application clock and timezone for source/app comparisons.
- Use fixed names, titles, class labels, dates, counts, and copy from `SCREEN_DESIGN_FIXTURE_SCENARIOS`.
- Use stable aliases in routes while resolving real generated database ids inside the fixture.
- Disable animations for capture while testing reduced motion separately.
- Wait for local fonts and images before assertions.

### Real-record and guarded-state coverage

The fixture contract owns real records for profile, class, assignment lifecycle, checklist, inbox, notes, flashcards/FSRS, study artifacts, mastery/grades, AP plans, notifications, LMS connections, portfolio/proof, privacy/export, wellness, study groups, tutor preferences, AI history/authorship, billing capability, and share tokens. It also declares honest empty states and the following guarded scenarios:

- AI red and yellow policy blocks
- token budget or controlled AI unavailable state
- billing configured and unavailable
- LMS disconnected, connected, sync error, and truthful unavailable
- active, expired, and revoked public shares
- opt-in group member and nonmember
- practice completion without a fabricated score
- onboarding valid, invalid, nullable, and legacy-preservation cases
- reduced motion and loading resolution

Static browser mocks may stabilize network transport but may not replace the real application loader/action records that a screen claims to display or mutate.

## Source Capture Normalization

Every canonical HTML file is treated as untrusted reference input.

1. Resolve the source only through `SCREEN_DESIGN_SCREENS`; reject the excluded folder dashboard.
2. Strip all script/module tags, export runtime tags, remote stylesheets, preloads, and inline event handlers.
3. Rewrite every occurrence of the 24 ScreenDesign and four DiceBear URLs by exact match through `public/screendesign/manifest.json`.
4. Replace export Tailwind/Iconify runtime behavior with controlled local capture CSS and local accessible icon treatment.
5. Repair only the attached dashboard's malformed stadium declaration, preserving separate local stadium and athlete layers.
6. Serve normalized sources on an isolated origin with no application cookies.
7. Abort and record any request outside the isolated origin and local asset path.
8. Require zero attempted or completed remote requests for every source capture.

## Visual Comparison and Baseline Rules

- Source and app are captured with the same Chromium build, Windows host, fonts, device scale factor, color scheme, and 393 by 852 viewport.
- Stable deterministic fixture copy is mandatory. Dynamic student copy is not masked merely to make a diff pass.
- Default tolerance is exact for geometry and stable pixels. A screen may declare a reviewed `maxDiffPixelRatio` no greater than `0.005` only for documented font antialiasing or image decode variance.
- Masks are allowed only for a registry-declared caret or platform-rendered transient that cannot be frozen. Each mask requires a reason in the review row.
- A tolerance never excuses wrong hierarchy, imagery, crop, selected state, spacing, overflow, route owner, or missing control.
- Baseline writes require the explicit update flag, the normalized source capture, the app capture, a generated diff, the fixture scenario id, and reviewer metadata.
- Silent snapshot updates, blanket thresholds, missing diffs, and cross-platform baseline reuse fail validation.
- The Plan 36-30 producer always cleans `test-results/screendesign-review`, reruns the unfiltered capture/action suites, generates a review diff for every passing or nonpassing pair, stamps every artifact row with one run id and the current full release SHA, and writes the only machine-readable index accepted by Plan 36-29.
- Playwright `toHaveScreenshot` remains the visual pass/fail authority. Sharp may render the all-screen review visualization, but its output does not determine acceptance or weaken tolerance/mask rules.
- Baseline-review metadata must identify a tracked clean golden, its Git blob hash, last review commit and author name without email, owning implementation plan, fixture scenario, tolerance/masks, and current passing Playwright result. The review commit must be an ancestor of the indexed release SHA.

## Exact 47-Screen Sampling

The full run has exactly these ids. Counts in the right column total 47.

| Owning plan | Required screen ids | Count |
|---:|---|---:|
| 36-05 | `dashboard-personalized` | 1 |
| 36-07 | `onboarding-welcome`, `onboarding-educational`, `onboarding-quiz-challenge`, `onboarding-quiz-schedule` | 4 |
| 36-08 | `assignment-detail`, `review-submit-checkpoint`, `task-breakdown-modal` | 3 |
| 36-09 | `inbox-triage`, `mission-board`, `quick-add` | 3 |
| 36-10 | `library-empty-state`, `subject-library`, `rubric-scout` | 3 |
| 36-11 | `ap-command-center`, `mastery-tracker`, `mastery-transcript-view` | 3 |
| 36-12 | `ai-writing-coach`, `notes-surface`, `tutor-chat` | 3 |
| 36-13 | `flashcards-review`, `study-artifacts-hub`, `practice-test-session` | 3 |
| 36-14 | `focus-session-immersive`, `study-calendar`, `study-goal-wizard` | 3 |
| 36-15 | `concept-deep-dive`, `knowledge-graph`, `progress-insights` | 3 |
| 36-16 | `milestone-celebration`, `portfolio-gallery`, `privacy-export-hub` | 3 |
| 36-17 | `external-scout-view`, `scout-share-view` | 2 |
| 36-18 | `ai-history-log`, `lms-sync-center`, `settings-profile-center` | 3 |
| 36-19 | `notification-center`, `smart-search`, `wellness-recovery-log` | 3 |
| 36-20 | `study-room-social`, `global-leaderboard`, `tutor-gallery`, `tutor-personalization` | 4 |
| 36-21 | `paywall-standard`, `paywall-social-proof` | 2 |
| 36-25 | `smart-loading` | 1 |
| **Total** | **Exact canonical registry set** | **47** |

For each id, sample all of the following:

1. Normalized source at 393 by 852
2. App default deterministic scenario at 393 by 852
3. Pixel diff with declared tolerance metadata
4. Primary action destination or persisted result
5. Represented back control and primary-nav ownership
6. Required honest empty or guarded state
7. Console errors and remote requests
8. Keyboard focus and reduced-motion behavior where interactive

Larger viewport sampling uses 768 by 1024, 1024 by 768, and 1440 by 1000 after exact mobile acceptance. These checks enforce no horizontal overflow, visible focus, safe centering/expansion, and unchanged mobile information hierarchy.

## Task-to-Command Coverage

| Plan | Task coverage | Fast feedback command | Wave or release gate |
|---:|---|---|---|
| 36-01 | Registry, screen map, and native fail-fast runner | `npx vitest run lib/screendesign/screens.test.ts` | Runner unit test plus exact registry count 47 |
| 36-02 | Acquisition, lookup, integrity | `npx vitest run lib/screendesign/assets.test.ts` | `node scripts/localize-screendesign-assets.mjs --verify` |
| 36-03 | Browser projects, source/app/action suites | Single `SCREEN_IDS` source capture | Full 47 source/visual/action run |
| 36-04 | Viewport, media, primitives, five-nav | `npx vitest run components/screen-design/screen-design.test.tsx` | Focused responsive and tone gate |
| 36-05 | Lobby adapter, composition, golden | Lobby unit test or one-screen Playwright filter | Source/app/action dashboard row |
| 36-06 | Migration, serializer, completion action | `npx vitest run lib/onboarding/screendesign.test.ts` | 36-26 live backend gate |
| 36-07 | Four-screen controller and goldens | Component interaction test | Four-id visual/action filter |
| 36-08 | Detail, submit, breakdown | One-id primary-action filter | Three-id visual/action filter |
| 36-09 | Inbox, board, quick add | One-id primary-action filter | Three-id visual/action filter |
| 36-10 | Empty/populated classes and rubric | One-id primary-action filter | Three-id visual/action filter |
| 36-11 | AP, mastery, transcript | One-id primary-action filter | Three-id visual/action filter plus tone |
| 36-12 | Writing, notes, tutor chat | One-id primary-action filter | Three-id visual/action and AI safety gate |
| 36-13 | FSRS and artifacts | Targeted FSRS test or one-id filter | Three-id visual/action filter |
| 36-14 | Timer, calendar, goals | Targeted timer test or one-id filter | Three-id visual/action filter |
| 36-15 | Concepts, graph, insights | One-id primary-action filter | Three-id visual/action filter |
| 36-16 | Proof, portfolio, export | One-id primary-action filter | Three-id visual/action and privacy gate |
| 36-17 | Token-scoped public shares | One-id token-state filter | Two-id visual/action plus active/expired/revoked checks |
| 36-18 | AI history, LMS, profile | One-id primary-action filter | Three-id visual/action plus persistence checks |
| 36-19 | Notifications, search, wellness | One-id primary-action filter | Three-id visual/action plus privacy/tone checks |
| 36-20 | Study groups and tutor settings | One-id primary-action filter | Four-id visual/action plus membership isolation |
| 36-21 | Both billing states | One-id primary-action filter | Two-id configured/unavailable billing gate |
| 36-22 | Route ownership and all primary actions | `npx vitest run tests/screendesign-route-coverage.test.ts` | Full 47 navigation suite with no filter |
| 36-23 | Old-system removal and clean bundle | `npx tsx scripts/verify-screendesign-removal.ts --source` | Full clean repository/build/removal gate |
| 36-24 | Existing independently validated gallery, preview, human approval | Revalidate `phase36-plan30` with the Plan 36-29 receipt and no producer invocation | Full local suite, SHA-equal preview canary, human gate |
| 36-25 | Real Smart Loading | Focused component test | One-id controlled suspense visual/action filter |
| 36-26 | Linked schema and persistence | Live schema verifier | Owner A write/reload plus owner B denial |
| 36-27 | Typed fixtures and QA seed | `npx vitest run lib/qa/screendesign-fixtures.test.ts` | Complete seed/reset and isolation gate |
| 36-28 | Source normalization | `npx vitest run tests/screendesign-source-normalization.test.ts` | 47-source zero-remote capture gate |
| 36-29 | Independent actual-output acceptance | `npx vitest run lib/screendesign/release-evidence.test.ts` | Validate the unchanged `phase36-plan30` gallery and write its bound receipt |
| 36-30 | Reusable validators and clean exactly-47 gallery producer | `npx vitest run lib/screendesign/review-gallery.test.ts lib/screendesign/release-evidence.test.ts` | Clean unfiltered producer run followed by same-plan self-check; Plan 36-29 performs independent acceptance |

Every implementation task uses the smallest relevant `SCREEN_IDS` filter for feedback. The complete unfiltered suite is reserved for Wave 6 and release gates.

## Latency Expectations

| Validation class | Expected duration | Handling |
|---|---:|---|
| Pure Vitest contract or adapter file | 5 to 30 seconds | Required after each related edit |
| TypeScript check | 30 to 60 seconds | Required at plan completion |
| One-screen Playwright source/visual/action filter | 20 to 60 seconds | Required after each screen task |
| Two-to-four screen cluster | 45 seconds to 3 minutes | Plan completion gate, not per-edit feedback |
| Full 47 source captures | 3 to 8 minutes | Wave/release gate |
| Full 47 app visual and navigation suites | 8 to 20 minutes | Wave/release gate |
| Clean exactly-47 gallery production and self-check | 12 to 30 minutes | Wave 8; includes all source/app/action captures and 47 review diffs |
| Independent exactly-47 gallery validation | 1 to 5 minutes | Wave 9; rehashes and accepts the unchanged Plan 36-30 output |
| Full unit, tone, lint, and production build | 4 to 10 minutes | Removal/release gate |
| Vercel preview deployment and SHA canary | 5 to 15 minutes | Release gate |

If a targeted feedback command exceeds 60 seconds twice, split its `SCREEN_IDS` set or run the focused unit contract first. Do not weaken assertions or skip screens to meet a latency target.

## Fail-Fast Command Rules

- Use `scripts/run-verified-commands.mjs` whenever one automated verification contains two or more native commands. Pass each executable and argument as an argv group after `--`, separated by `--next`.
- Use the runner's `--env KEY=VALUE`, `--env-copy TARGET=SOURCE`, and `--unset KEY` options to control `SCREEN_IDS`, `BASE_URL`, review run ids, and other child environment values without PowerShell-specific chaining.
- The runner uses `spawnSync` with `shell: false`, resolves Windows npm/npx shims, inherits output, stops at the first spawn error, signal, or nonzero exit, and returns that failure code.
- Do not concatenate native command strings, use conditional chain operators, or place independent native commands after PowerShell semicolons. The Phase 36 blocks must parse and execute in Windows PowerShell 5.1.
- A test filter must be printed in evidence; the final 47-state gates run in a fresh shell with no `SCREEN_IDS` filter.
- Missing authentication produces a dynamic auth checkpoint. It does not convert a live backend or deployment proof into a local-only pass.

## Manual Review Gates

### Baseline review gate

Each new or changed baseline must have a source image, app image, diff image, fixture scenario id, tolerance/mask metadata, action result, and reviewer metadata. A baseline update flag alone is insufficient.

### Final human gate

Plan 36-24 is the only blocking human checkpoint. It starts only after:

1. The clean `phase36-plan30` producer run completes and Plan 36-29's later independent validator reports exactly 47 unique complete rows plus a matching receipt for that run id and current HEAD.
2. All automated local release gates pass on one commit.
3. `vercel inspect` succeeds.
4. The served build SHA, inspection SHA, and local release SHA are equal.
5. The hosted 47-route/action canary passes with local assets and no prohibited visual system.

The user then reviews the complete source/app/diff gallery and preview, with special attention to the attached Lobby dashboard, four onboarding screens, five-item navigation, explicit done versus submitted flow, AI blocked state, expired share, unavailable billing, and wellness save. Production merge or deployment remains blocked until the user types the explicit approval signal.

## Release Command Order

Run these as fail-fast stages, never as best-effort checks:

1. Typecheck, unit tests, tone audit, lint, and production build
2. Source and compiled removal audits
3. Accessibility and responsive suites
4. Clean exactly-47 producer run, which executes all normalized source, current app visual, primary-action, and navigation suites and writes all diffs plus metadata
5. Exactly-47 validator with the same producer run id and `--expected-sha HEAD`
6. Vercel preview deploy and successful inspection
7. Three-way SHA equality validator
8. Hosted 47-route/action canary
9. Final human approval

Any missing, skipped, duplicate, unreviewed, mismatched, remote-dependent, fabricated, cross-owner, or prohibited-composition result returns the work to the owning plan.
