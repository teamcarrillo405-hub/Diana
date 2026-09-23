# Phase 36 Research: Faithful ScreenDesign Rebuild

**Phase:** 36  
**Research date:** 2026-07-15  
**Overall confidence:** HIGH  
**Research mode:** repository, export, runtime-state, security, and official-documentation verification

<user_constraints>

## Locked Decisions

- [D-01] The 47 exported HTML files in `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18` are the visual source of truth for the application screens.
- [D-02] `C:\Users\glcar\Downloads\dashboard_personalized (1).html` is the visual source of truth for the authenticated student's landing page.
- [D-03] The student landing page must use the stadium and athlete composition, Lobby header, one Your Next Move action, Needs Attention stack, and five-item bottom navigation from the attached dashboard source.
- [D-04] The onboarding flow must reproduce the attached welcome, educational, challenge, and schedule screens in that order, including their imagery, hierarchy, selected states, and progress treatment.
- [D-05] Nexus, Nexus Arcade, Mission Control, Today's Game Plan metric cards, and other old dashboard compositions must not appear in the rebuilt student experience.
- [D-06] This is a faithful implementation, not a color and typography reskin of existing layouts.
- [D-07] Screen content must be operational. Existing real profile, assignment, class, study, AI, authorship, notification, and onboarding data should feed the new visual compositions wherever the product already supports it.
- [D-08] All navigation and calls to action must connect to the correct application routes or working interactions. Static HTML links are reference behavior only and must be replaced with application navigation and state.
- [D-09] ScreenDesign-hosted media used by the exports must be copied to application-owned local assets so production does not depend on the design export host.
- [D-10] Mobile fidelity at the 393 by 852 source viewport is the first visual acceptance target, followed by safe responsive behavior for larger viewports.
- [D-11] Calm product invariants remain enforced: no shame language, no red error treatment, no streak guilt, explicit done versus submitted, and server-side AI traffic-light enforcement.
- [D-12] No screen may be counted complete merely because a route exists. It must be visually compared with its source and its primary interactions must work.

## The agent's Discretion

- Choose the internal component boundaries, shared primitives, route adapters, and data-loading strategy that produce the source-faithful result without duplicating backend logic.
- Correct malformed export CSS and inaccessible or nonfunctional static markup while preserving the intended appearance.
- Choose local asset filenames and optimization formats.
- Add focused tests and visual QA tooling needed to prove route, state, and fidelity behavior.

## Deferred Ideas

- New visual directions not represented in the 47 exports.
- New product features beyond wiring the exported screens to capabilities already present in the Diana product scope.
- Desktop-first redesigns that alter the source mobile hierarchy.

</user_constraints>

## Executive Summary

Phase 36 is a full presentation-layer replacement over an already substantial application, not a greenfield app build and not a theme change. The canonical set is exactly 47 screens: 46 HTML files from the export folder after excluding its conflicting `dashboard_personalized.html`, plus the separately attached `dashboard_personalized (1).html` as the `/dashboard` replacement. [VERIFIED: filesystem inventory and 36-CONTEXT.md]

The current application has working Supabase-backed routes and business logic, but much of the presentation is routed through generic `PageShell`/`AppTopNav` structures and the current dashboard still renders `TodayGamePlan` with the prohibited “Today's game plan” metric-card composition. Thirty-three route pages reference `PageShell`, eleven reference `AppTopNav`, and the dashboard owns the old `TodayGamePlan` component. [VERIFIED: repository `rg` inventory, `app/(app)/dashboard/page.tsx`, and `app/(app)/dashboard/today-game-plan.tsx`]

The safest implementation strategy is to preserve server-side loaders, actions, authorization, scoring, AI policy enforcement, and state machines while replacing their visual consumers with screen-specific adapters. Shared primitives should model only genuinely repeated ScreenDesign structures such as the 393 by 852 frame, glass card treatment, brand mark, five-item bottom navigation, chips, and action states. They must not flatten the 47 compositions into another generic shell. [VERIFIED: all canonical HTML exports and current route/data-loader inspection]

The source set contains 24 unique `media.screensdesign.com` resources and four DiceBear avatars. None should remain a production runtime dependency. A checked-in asset manifest with descriptive local filenames, source URL, consumer screen, checksum, and dimensions should be established before screen implementation. [VERIFIED: URL extraction across the canonical 47-screen set]

## Canonical Source Set and Precedence

- The export folder contains 47 HTML files. [VERIFIED: `Get-ChildItem` inventory]
- The attached dashboard creates a 48th physical HTML file, but it replaces the folder dashboard rather than adding a route. [VERIFIED: 36-CONTEXT.md and side-by-side source inspection]
- Therefore the implementation acceptance set is 46 folder exports plus the attached dashboard, totaling 47 screens. [VERIFIED: source precedence calculation]
- The folder dashboard says “Today Grayson” and centers an English Literature resume action, while the attached dashboard says “Lobby Grayson” and uses a stadium, athlete cutout, one “Your Next Move” action, and a stacked “Needs Attention” treatment. [VERIFIED: both dashboard HTML files]
- The attached dashboard contains malformed exported CSS in which a `data-media-ref` fragment follows a URL inside a declaration. The implementation should repair the syntax while retaining the intended stadium/athlete composition. [VERIFIED: `dashboard_personalized (1).html`]

## Project Constraints (from AGENTS.md)

- Use the existing Next.js 15 App Router, TypeScript, Tailwind, React 19, Supabase, and Vercel architecture. The `@/` alias resolves to the repository root. [VERIFIED: `AGENTS.md`, `package.json`, and `tsconfig.json`]
- Server Components are the default. Client Components are reserved for browser APIs, state, and event handlers. [VERIFIED: project structure and official Next.js Server/Client Components documentation]
- Keep the three Supabase client roles separate: server/cookie client, browser client, and service-role client. Service-role credentials must not enter browser code. [VERIFIED: `AGENTS.md` and `lib/supabase/*`]
- All hosted AI feature calls remain server-controlled, traffic-light gated, budget checked, safety-prompt composed, and authorship/interaction logged. Screen reconstruction does not authorize bypassing those controls. [VERIFIED: `AGENTS.md` and existing AI/action seams]
- Preserve the calm invariant: no red error treatment, no scolding or guilt, no streak language, no timer `failed`/`missed` states, and no implicit conflation of `done` with `submitted`. [VERIFIED: `AGENTS.md`]
- Keep the published FSRS-5 weights, the 1.6x dyslexia reading multiplier, `effective_minutes`, explicit assignment state transitions, and server-side AI policy enforcement unchanged. [VERIFIED: `AGENTS.md`, `lib/fsrs`, `lib/scoring`, and `lib/state-machine`]
- Required repository gates remain `npm run typecheck`, `npm run test:run`, `npm run tone-audit`, `npm run lint`, and `npm run build`; this phase adds visual and interaction gates rather than replacing those checks. [VERIFIED: `AGENTS.md` and `package.json`]

## Architectural Responsibility Map

| Concern | Existing owner to retain | Phase 36 responsibility |
|---|---|---|
| Authentication and onboarding redirect | `app/(app)/layout.tsx`, Supabase SSR middleware, onboarding route guard | Keep authorization behavior; replace only screen composition. [VERIFIED: repository inspection] |
| Student/profile data | `lib/profile.ts`, Supabase `profiles` row | Adapt values into source-faithful view models. [VERIFIED: repository inspection] |
| Dashboard ranking and attention data | `app/(app)/dashboard/page.tsx`, `lib/scoring/next-five-minutes.ts` | Preserve queries/ranking; replace `TodayGamePlan` with the attached Lobby composition. [VERIFIED: repository inspection] |
| Assignment lifecycle | existing server actions and `lib/state-machine` | Bind source CTA states to explicit transitions, especially `done` versus `submitted`. [VERIFIED: AGENTS.md and repository inspection] |
| AI tools | Supabase functions and existing server actions/routes | Preserve AI-mode, budget, logging, and safety gates; replace presentation only. [VERIFIED: AGENTS.md and code inspection] |
| Authorship and artifacts | `study-artifacts` actions, authorship log, artifact tables | Bind hub/detail/share screens to real rows and existing actions. [VERIFIED: repository inspection] |
| Public sharing | `/share/[token]` service-side token lookup | Preserve expiry/revocation/owner scoping; implement source share views around the safe loader. [VERIFIED: `app/share/[token]/page.tsx`] |
| Billing | `/upgrade`, `resolveBillingCheckoutUrl` | Preserve honest unavailable state; do not turn static export buttons into fake checkout. [VERIFIED: `app/(app)/upgrade/page.tsx`] |
| Visual system | current global CSS plus new ScreenDesign layer | Create faithful primitives and screen modules; retire old dashboard/Nexus visual rules after consumers move. [VERIFIED: CSS and component inventory] |
| Visual QA | existing Playwright specs and QA scripts | Add exact 393x852 source comparisons and 47-screen route/state interaction coverage. [VERIFIED: test inventory] |

## Standard Stack and Environment

No new package is required to execute this phase. The installed environment already provides the framework, schema validation, image processing, unit test, E2E, and accessibility tooling required. [VERIFIED: `npm ls`, tool version checks, and `package.json`]

| Tool/library | Verified local version | Use in Phase 36 |
|---|---:|---|
| Node.js | 24.14.1 | build and scripts. [VERIFIED: `node --version`] |
| npm | 11.11.0 | package scripts. [VERIFIED: `npm --version`] |
| Next.js | 15.5.20 | App Router and local image delivery. [VERIFIED: `npm ls next`] |
| React | 19.0.0 | component rendering. [VERIFIED: `npm ls react`] |
| TypeScript | 5.7.2 | view-model and action contracts. [VERIFIED: `npm ls typescript`] |
| Tailwind CSS | 3.4.15 | existing utility layer; do not use export CDN. [VERIFIED: `npm ls tailwindcss`] |
| Supabase SSR / JS | 0.10.3 / 2.106.2 | authenticated server/client data seams. [VERIFIED: `npm ls`] |
| Playwright | 1.60.0 | exact viewport, route, visual, and accessibility QA. [VERIFIED: `npm ls @playwright/test`] |
| Vitest | 3.2.6 installed | pure adapters, mappings, and interaction tests. [VERIFIED: `npm ls vitest`] |
| Zod | 3.25.76 installed | server input validation. [VERIFIED: `npm ls zod`] |
| Sharp | 0.35.0 | optional checked-in asset optimization script. [VERIFIED: `npm ls sharp`] |
| Vercel CLI | 56.2.0 | preview/production verification after merge. [VERIFIED: `vercel --version`] |

## ScreenDesign Visual System Findings

- Every canonical export targets a fixed 393 by 852 mobile frame. [VERIFIED: source CSS inventory]
- All 47 use the dark navy `#0F172A` and magenta `#FF79DA`; 38 also use blue `#74C0FF`, while nine use teal `#2DD4BF`. [VERIFIED: source color inventory]
- Thirty-eight screens declare a `glass-card` class, but the cards vary in placement, density, prominence, border, and interaction state. [VERIFIED: class inventory]
- The sources repeatedly use black italic uppercase headings, tight mobile hierarchy, icon-forward buttons, neon accent strokes, translucent dark cards, rounded phone framing, and a five-item bottom nav on application hubs. [VERIFIED: visual and markup inspection]
- External Tailwind CDN and Iconify script tags are export-time scaffolding, not dependencies to reproduce. Existing Tailwind and Lucide/Iconify-equivalent accessible SVG components should render the intended shapes locally. [VERIFIED: all HTML heads and `package.json`]
- Faithful implementation means matching hierarchy, spacing, imagery, geometry, and selected/pressed states screen by screen. A shared palette on top of generic `PageShell` is insufficient. [VERIFIED: D-06 and cross-screen comparison]

### Shared primitives that are safe to extract

1. `ScreenDesignViewport`: mobile-first 393 by 852 content canvas with safe area and responsive outer centering. [VERIFIED: all source frames]
2. `DianaBrandMark`: local logo asset and text treatment. [VERIFIED: repeated logo URL usage]
3. `GlassPanel`, `AccentChip`, and `NeonAction`: shared low-level styling with variant props, not fixed content hierarchy. [VERIFIED: repeated source classes]
4. `StudentBottomNav`: Today, Work, Classes, Calendar, More with route-derived active state. [VERIFIED: dashboard source and `docs/design/SCREEN-MAP.md`]
5. `SourceMedia`: local manifest-backed media wrapper that requires dimensions/alt/decorative intent. [VERIFIED: source asset inventory and Next.js image guidance]
6. Screen-specific modules for major compositions such as `LobbyDashboard`, `OnboardingWelcome`, `KnowledgeGraph`, and `StudyRoom`; do not force these into one generic template. [VERIFIED: material structural differences across exports]

### Prohibited visual reuse

- `TodayGamePlan` and its four dashboard metric cards are directly prohibited. [VERIFIED: D-05 and `today-game-plan.tsx`]
- Old “game plan” copy also remains in `app/(auth)/layout.tsx` and `app/onboarding/done/page.tsx`; these surfaces must be reconciled with their canonical source states rather than leaving intermediate design language live. [VERIFIED: source-string search]
- `.student-today-command`, `pm-*`, and other old Mission Control dashboard composition rules should be removed only after all live consumers have moved. [VERIFIED: `app/globals.css` and component references]
- The current `app/screendesign.css` is a generic reskin layer and cannot serve as evidence of source fidelity by itself. [VERIFIED: stylesheet-to-export comparison]
- Business logic, server loaders, actions, scoring, safety gates, and database tables are not “Nexus design” and should not be deleted merely because an old visual consumed them. [VERIFIED: separation of view and data layers in repository]

## Canonical 47-Screen Route and Action Matrix

The route ownership below follows the already approved design screen map, checked against the live App Router. State-specific exports should be implemented at the owning route through query parameters, route segments, modal state, or reusable detail components rather than invented duplicate top-level routes. [VERIFIED: `docs/design/SCREEN-MAP.md` and `app/**/page.tsx`]

| # | Canonical source | Route/state owner | Operational contract |
|---:|---|---|---|
| 1 | `ai_history_log.html` | `/settings/ai-history` | Load real interaction/authorship history; filtering and detail links must work. [VERIFIED: SCREEN-MAP and repository routes] |
| 2 | `ai_writing_coach.html` | assignment/note writing surfaces | Preserve original student text, AI policy, prompt safety, and authorship logging. [VERIFIED: SCREEN-MAP and AI constraints] |
| 3 | `ap_command_center.html` | `/ap` | Feed AP class/work data and connect study actions. [VERIFIED: SCREEN-MAP and route inventory] |
| 4 | `assignment_detail.html` | `/assignments/[id]` | Load assignment by authenticated owner; start, break down, mark done, and submit actions use real state transitions. [VERIFIED: SCREEN-MAP and state-machine constraints] |
| 5 | `concept_deep_dive.html` | `/concepts/[id]` | Load concept/mastery evidence; connect practice and back navigation. [VERIFIED: SCREEN-MAP and route inventory] |
| 6 | attached `dashboard_personalized (1).html` | `/dashboard` | Replace `TodayGamePlan`; populate Lobby, next move, attention items, athlete/stadium, and five-nav from real dashboard data. [VERIFIED: context, source, and dashboard loader] |
| 7 | `external_scout_view.html` | `/share/[token]` portfolio state | Use token-scoped, unrevoked, unexpired share data only. [VERIFIED: SCREEN-MAP and share loader] |
| 8 | `flashcards_review.html` | `/flashcards/[id]/review` | Load deck/card state; flip, rate, and advance through real review flow. [VERIFIED: SCREEN-MAP and route inventory] |
| 9 | `focus_session_immersive.html` | `/timer` | Bind controls to valid timer states only: idle, running, paused, break, done. [VERIFIED: SCREEN-MAP and calm invariant] |
| 10 | `global_leaderboard.html` | `/study-groups?view=community` | Opt-in community state only; do not expose a public minor ranking. Localize four DiceBear avatars. [VERIFIED: SCREEN-MAP, source URLs, and privacy constraint] |
| 11 | `inbox_triage.html` | `/inbox`, `/inbox/[id]` | Render real inbox items; triage/update controls must persist. [VERIFIED: SCREEN-MAP and route inventory] |
| 12 | `knowledge_graph.html` | `/knowledge-graph` | Render real concept edges/mastery; graph interactions must navigate to concept detail. [VERIFIED: SCREEN-MAP and source inspection] |
| 13 | `library_empty_state.html` | `/classes` empty state | Display only when no classes exist; CTA must connect to supported class/add flow. [VERIFIED: SCREEN-MAP] |
| 14 | `lms_sync_center.html` | `/settings#connections` | Reflect actual integration state; do not claim a sync that did not occur. [VERIFIED: SCREEN-MAP and operational constraint] |
| 15 | `mastery_tracker.html` | `/grades`, `/classes/[id]` | Populate from mastery/grade data and link to class/concept detail. [VERIFIED: SCREEN-MAP and route inventory] |
| 16 | `mastery_transcript_view.html` | `/grades/transcript` | Render the authenticated student's real transcript view and export/share only when supported. [VERIFIED: SCREEN-MAP and route inventory] |
| 17 | `milestone_celebration.html` | `/proof?celebrate=latest` | Celebrate a real latest proof/milestone; dismiss/back action works without streak guilt. [VERIFIED: SCREEN-MAP and calm invariant] |
| 18 | `mission_board.html` | `/assignments` | Load assignment/work board; cards route to real assignment detail and filters update real state. [VERIFIED: SCREEN-MAP and route inventory] |
| 19 | `notes_surface.html` | `/notes/[id]` | Load/save note content and connect supported study/writing tools. [VERIFIED: SCREEN-MAP and route inventory] |
| 20 | `notification_center.html` | `/notifications` | Load real notifications; mark/read and deep links persist and navigate correctly. [VERIFIED: SCREEN-MAP and route inventory] |
| 21 | `onboarding_welcome.html` | `/onboarding`, step 1 | First exact source screen; continue advances without prematurely completing onboarding. [VERIFIED: D-04 and source] |
| 22 | `onboarding_educational.html` | `/onboarding`, step 2 | Reproduce “Did You Know?” and 40 percent visual; continue advances. [VERIFIED: source inspection] |
| 23 | `onboarding_quiz_challenge.html` | `/onboarding`, step 3 | Preserve 1/4 challenge selected states and map answers into supported profile/support fields or an explicitly planned schema addition. [VERIFIED: source and profile schema] |
| 24 | `onboarding_quiz_schedule.html` | `/onboarding`, step 4 | Preserve 2/4 schedule selection UI; persist only through a validated profile field/schema addition, then complete or continue the retained profile intake. [VERIFIED: source and profile schema] |
| 25 | `paywall_social_proof.html` | `/upgrade?view=community` | Show community-oriented access state; checkout appears only when billing is configured. [VERIFIED: SCREEN-MAP and upgrade loader] |
| 26 | `paywall_standard.html` | `/upgrade` | Preserve honest preview/unavailable behavior and real checkout URL gate. [VERIFIED: SCREEN-MAP and upgrade loader] |
| 27 | `portfolio_gallery.html` | `/portfolio` | Load real artifacts/proof; cards open real detail/share flows. [VERIFIED: SCREEN-MAP and route inventory] |
| 28 | `practice_test_session.html` | `/study-artifacts/[id]`, practice state | Load the real artifact/session; submit/finish actions persist without inventing a score. [VERIFIED: SCREEN-MAP and artifact actions] |
| 29 | `privacy_export_hub.html` | `/export` | Use existing export/privacy controls and make downloads/requests real. [VERIFIED: SCREEN-MAP and route inventory] |
| 30 | `progress_insights.html` | `/insights` | Feed real trends and explanations; no guilt framing for quiet periods. [VERIFIED: SCREEN-MAP and calm invariant] |
| 31 | `quick_add.html` | `/quick-add` | Validate and create a real item; cancel/back and post-save destination work. [VERIFIED: SCREEN-MAP and route inventory] |
| 32 | `review_submit_checkpoint.html` | `/assignments/[id]/submit` | Preserve explicit student-confirmed submitted transition and authorship checkpoint. [VERIFIED: SCREEN-MAP and done-not-submitted constraint] |
| 33 | `rubric_scout.html` | `/classes/[id]`, rubric state | Load actual rubric/class context; navigation returns to owning class/assignment. [VERIFIED: SCREEN-MAP] |
| 34 | `scout_share_view.html` | `/share/[token]` | Render only token-scoped share fields; expired/revoked links use calm inactive state. [VERIFIED: SCREEN-MAP and share loader] |
| 35 | `settings_profile_center.html` | `/settings`, `/me` | Load/save real profile, accessibility, privacy, and personalization values. [VERIFIED: SCREEN-MAP and profile schema] |
| 36 | `smart_loading.html` | owning route `loading.tsx` states | Use as real route/loading treatment with reduced-motion behavior, not a permanent fake delay. [VERIFIED: SCREEN-MAP and source role] |
| 37 | `smart_search.html` | `/search` | Query supported entities and make every result type navigate to a real destination. [VERIFIED: SCREEN-MAP and route inventory] |
| 38 | `study_artifacts_hub.html` | `/study-artifacts` | Load real artifacts; create/open actions use existing action layer and policy gates. [VERIFIED: SCREEN-MAP and `study-artifacts/actions.ts`] |
| 39 | `study_calendar.html` | `/calendar` | Populate real assignments/events and route selected items to detail. [VERIFIED: SCREEN-MAP and route inventory] |
| 40 | `study_goal_wizard.html` | `/settings/goals` | Validate/persist supported goal values; do not present a saved success without a write. [VERIFIED: SCREEN-MAP and operational constraint] |
| 41 | `study_room_social.html` | `/study-groups` | Load real/available groups; join/create controls must be supported or honestly unavailable. [VERIFIED: SCREEN-MAP and route inventory] |
| 42 | `subject_library.html` | `/classes` | Load actual classes/subjects; cards navigate to class detail. [VERIFIED: SCREEN-MAP and route inventory] |
| 43 | `task_breakdown_modal.html` | `/break-down` and assignment overlay | Use real assignment context; generated steps retain AI policy/authorship logging and can be accepted into real state. [VERIFIED: SCREEN-MAP and AI constraints] |
| 44 | `tutor_chat.html` | `/study-buddy` | Preserve current controlled backend seam, AI traffic-light behavior, authorship logging, and conversation state. [VERIFIED: SCREEN-MAP and route/API inspection] |
| 45 | `tutor_gallery.html` | `/settings/tutor` gallery state | Select from supported tutor personas; localize tutor media. [VERIFIED: SCREEN-MAP and profile schema] |
| 46 | `tutor_personalization.html` | `/settings/tutor` personalization state | Persist `tutor_persona`, `tutor_style`, and supported complexity settings. [VERIFIED: SCREEN-MAP and `profiles` type] |
| 47 | `wellness_recovery_log.html` | `/wellness` | Bind mood/recovery controls to supported private wellness state and calm copy. [VERIFIED: SCREEN-MAP, `session_mood`, and route inventory] |

## Onboarding Data Reconciliation

The existing onboarding form is six generic steps named `welcome`, `brain`, `accommodations`, `school`, `interests`, and `literacy`. It persists diagnoses, accommodations, school year, class count, interests, accessibility defaults, and `onboarded_at`. [VERIFIED: `app/onboarding/form.tsx` and `app/onboarding/actions.ts`]

The four locked source screens do not contain all of those existing choices, and the two quiz screens ask challenge and schedule questions not represented by a dedicated schedule/availability column in the current `profiles` type. `profiles` does contain diagnoses, accommodations, class-count hint, interests, timezone, session mood, tutor preferences, and onboarding completion. [VERIFIED: source screens, migrations, and `lib/supabase/types.ts`]

Planning implication: do not drop existing personalization data and do not silently coerce schedule answers into an unrelated field. The plan needs an explicit product-safe mapping decision before implementation. The preferred low-risk approach is to reproduce the four source screens in order, map challenge selections only where their semantics match supported accommodation/support fields, and place any still-required existing intake behind source-faithful subsequent settings/intake or add a clearly scoped schema field for schedule preference. [VERIFIED: schema comparison; recommended design is an inference]

## Local Media Asset Inventory

Twenty-four unique ScreenDesign-hosted URLs occur in the canonical set, plus four DiceBear avatar URLs in the community screen. [VERIFIED: canonical URL extraction]

The repository currently has no `public/screendesign` asset tree, so the exported imagery has not yet been localized into an owned, canonical bundle. [VERIFIED: `public` filesystem inventory]

| Asset group | Key consumers | Localization requirement |
|---|---|---|
| Diana logo and welcome background | most screens; onboarding welcome | Save as descriptive brand/onboarding files. [VERIFIED: source URL consumers] |
| Diana mascot | AI history, writing coach, flashcards, empty state, quick add, submit, scout share, task breakdown | One shared local transparent asset. [VERIFIED: source URL consumers] |
| Dashboard stadium and athlete cutout | attached dashboard only | Preserve layers separately for faithful responsive composition. [VERIFIED: attached dashboard] |
| Educational/chart imagery | onboarding education, concept deep dive, knowledge graph, notes | Keep intrinsic dimensions and meaningful alt where instructional. [VERIFIED: source URL consumers] |
| Profile, athlete, and social avatars | settings/share/paywall/study room/search/community | Localize; do not depend on third-party avatar generation at runtime. [VERIFIED: source URL consumers] |
| Portfolio and artifact thumbnails | portfolio, artifact hub | Localize each thumbnail and preserve crop focal point. [VERIFIED: source URL consumers] |
| Tutor portraits | tutor gallery | Localize both portraits and use stable identifiers in tutor selection. [VERIFIED: source URL consumers] |
| Ring/milestone art | share, celebration, portfolio | One shared local asset. [VERIFIED: source URL consumers] |

Recommended owned layout: `public/screendesign/<category>/<descriptive-name>.<ext>` plus `public/screendesign/manifest.json`. The manifest should record original URL, local path, SHA-256, intrinsic width/height, alpha requirement, and consumers. [ASSUMED: recommended implementation design]

Asset acquisition should use ordinary GET requests. A direct GET of the stadium source succeeded, while HEAD requests did not, so a HEAD-only downloader would produce false negatives. [VERIFIED: live HTTP checks]

## Backend and Data Wiring Findings

### Dashboard

`app/(app)/dashboard/page.tsx` already loads the profile, assignments, task signals/reminders, classes, and assignment time logs, and it runs the existing priority scorer. This loader should remain the source of operational dashboard data. [VERIFIED: dashboard page inspection]

The view should expose a small source-shaped model, for example `studentName`, `nextMove`, and `attentionItems`, rather than passing raw database rows into a giant client component. [ASSUMED: recommended architecture]

### AI and study tools

The study-artifact action layer already checks AI mode before invoking a Supabase Edge Function, writes the returned artifact, logs authorship, and records task signals. Reuse this seam for source CTAs. [VERIFIED: `app/(app)/study-artifacts/actions.ts`]

The current study-buddy path includes an existing sidecar integration rather than a simple new client-side API call. This phase should preserve its server-side enforcement and logging and should not duplicate provider calls in screen components. [VERIFIED: route/API inspection]

### Public share

`/share/[token]` uses a service-role client only on the server, requires an exact token, filters revoked rows, filters expired rows, and derives `owner_id` from the matching link rather than query parameters. That security boundary must remain intact. [VERIFIED: `app/share/[token]/page.tsx`]

### Billing

The upgrade page resolves checkout capability on the server and only links to checkout when configured; otherwise it shows settings and an honest unavailable state. Static paywall exports must retain this behavior. [VERIFIED: `app/(app)/upgrade/page.tsx`]

## Runtime State Inventory

Because Phase 36 removes an old visual system, removal must be assessed beyond source files. The five required runtime-state categories are below. [VERIFIED: refactor/removal research protocol]

| Category | Verified current state | Required completion action |
|---|---|---|
| Stored data | No `Nexus`, `Mission Control`, or `Today's Game Plan` storage/schema identifier was found in Supabase migrations or generated database types. The old design is not a database model. [VERIFIED: migration/type search] | No destructive data migration is justified. Preserve user data and remove only obsolete view code after consumers move. [VERIFIED: schema result] |
| Live service config | `.vercel/project.json` links the checkout to the Diana Vercel project. A branch change will not alter production until merge/deploy. [VERIFIED: local Vercel project metadata and Git state] | After merge, verify the production deployment SHA and `/dashboard` rendering before declaring removal complete. [ASSUMED: launch procedure] |
| OS state | No Windows service or scheduled task with Nexus or Diana in its name/path was found. [VERIFIED: `Get-Service` and `Get-ScheduledTask` filtered inventory] | No OS-level removal is required for this visual rebuild. [VERIFIED: inventory result] |
| Secrets/environment | Environment key-name inventory contains Diana/Supabase/AI/worker/QA keys but no Nexus-named key. Values were not exposed. [VERIFIED: key-name-only `.env*` scan] | Preserve required secrets; do not copy values into tests, screenshots, manifests, or docs. [VERIFIED: security constraint] |
| Build artifacts | `.next` and `dist` exist, and `.next` contains compiled occurrences of old “game plan” content. [VERIFIED: build artifact search] | Run a clean production build and redeploy after source removal so cached bundles cannot be mistaken for current source. [ASSUMED: standard build hygiene] |

## Validation Architecture

Nyquist validation is enabled for this project. Phase 36 needs an automated validation contract before broad screen conversion because route existence alone is explicitly insufficient. [VERIFIED: `.planning/config.json` and D-12]

### Current validation gaps

- Playwright is installed and three E2E specs exist, but no `playwright.config.*` is present. [VERIFIED: filesystem and package inventory]
- Existing responsive QA covers 375x812, 390x844, 768x1024, 1024x768, and 1440x1000, but not the exact 393x852 source viewport. [VERIFIED: `tests/responsive-qa.spec.ts`]
- Existing QA takes JPEG captures but does not use Playwright golden assertions such as `toHaveScreenshot`. [VERIFIED: test source inspection]
- Existing required-route coverage spans only a subset of the 47 screen states. [VERIFIED: E2E test inventory]
- Some E2E expectations are tied to old or intermediate copy such as “YOUR NEXT MOVE”/“start next mission” and do not prove the attached dashboard composition. [VERIFIED: `tests/e2e-flows.spec.ts` versus attached source]
- The responsive QA blanket-bans the word `overdue`, while the attached source uses “Overdue” as a neutral Needs Attention category. The test should ban shame phrases/context, not a factual category label required by the source. [VERIFIED: test and source comparison]

### Required test layers

1. **Source manifest test:** assert exactly 47 canonical screen entries, one route/state owner each, attached dashboard precedence, and every remote media URL mapped locally. [ASSUMED: recommended gate]
2. **Adapter unit tests:** test view-model mapping, empty states, attention ordering, nav ownership, and onboarding answer serialization without rendering database rows directly. [ASSUMED: recommended gate]
3. **Component interaction tests:** test selected states, modal/dialog semantics, buttons, form validation, timer state transitions, and explicit done/submitted confirmation. [ASSUMED: recommended gate]
4. **Authenticated E2E fixture:** seed deterministic synthetic student data through the existing QA path and save authenticated `storageState`; never use a real student's credentials or screenshots as baselines. [VERIFIED: existing QA seed/env and official Playwright auth options; recommendation inferred]
5. **Visual golden suite:** capture each canonical route/state at 393x852 in the same Windows/Chromium/font environment and compare with reviewed baselines using `expect(page).toHaveScreenshot()`. [VERIFIED: official Playwright screenshot documentation; recommendation inferred]
6. **Navigation matrix:** assert every primary CTA and the five-item nav reaches the route/state in the screen map, including browser back behavior where represented. [ASSUMED: recommended gate]
7. **Responsive safety:** after mobile fidelity passes, test existing larger viewports for clipping, focus visibility, horizontal overflow, and safe centering without changing mobile hierarchy. [VERIFIED: D-10; recommended assertions inferred]
8. **Accessibility and calm gates:** retain axe coverage, keyboard focus, semantic controls, reduced motion, tone audit, no red error treatment, and safe loading semantics. [VERIFIED: AGENTS.md and existing a11y tooling]
9. **Repository and launch gates:** typecheck, unit tests, tone audit, lint, production build, preview smoke, then production canary against the deployed SHA. [VERIFIED: package scripts and Vercel linkage]

Playwright warns that screenshot output varies by operating system, browser version, hardware, settings, and fonts. Baselines must be generated and compared in a controlled environment; source HTML screenshots and app screenshots should use the same viewport and browser environment. [CITED: https://playwright.dev/docs/test-snapshots]

## Security and Privacy Review

### Trust boundaries

- Treat every exported HTML file as untrusted design reference. Do not ship its CDN scripts, inline event handlers, remote URLs, or arbitrary HTML injection. [VERIFIED: export contents and untrusted-input research protocol]
- Use typed React markup and local assets. Do not render export fragments through `dangerouslySetInnerHTML`. [ASSUMED: recommended mitigation]
- Keep all mutations in validated server actions/route handlers and keep AI/provider credentials out of Client Components. [VERIFIED: AGENTS.md and current architecture]
- Golden screenshots must use synthetic QA identities and content because the screens contain student names, grades, tasks, wellness signals, and accommodations. [VERIFIED: source content categories and privacy risk]

### ASVS-oriented controls

| ASVS area | Phase requirement |
|---|---|
| V2 Authentication | Preserve Supabase `auth.getUser()` and authenticated route wall. [VERIFIED: middleware] |
| V3 Session management | Preserve SSR cookie refresh/propagation; do not add client-only auth decisions. [VERIFIED: middleware and Supabase SSR pattern] |
| V4 Access control | Keep owner filters/RLS for authenticated data and strict token/expiry/revocation scoping for public shares. [VERIFIED: repository policies and share loader] |
| V5 Validation | Keep Zod/server validation for onboarding, quick add, goals, settings, and AI inputs; HTML selected states are not authorization. [VERIFIED: current action patterns] |
| V6 Cryptography | Introduce no custom cryptography; retain platform TLS and provider-generated share tokens/secrets. [VERIFIED: current architecture] |
| V8 Data protection | Do not place profile data or secrets in asset manifests, source snapshots, logs, or client bundles. [VERIFIED: data categories and security boundary] |
| V14 Configuration | Verify deployed SHA, environment presence by key name, CSP/external-host removal, and production asset locality. [ASSUMED: recommended release gate] |

### Primary threats and mitigations

- **Remote design-host dependency/tracking:** localize all media and remove export CDN scripts. [VERIFIED: remote URL inventory]
- **Static mock data replacing real user state:** require adapters from existing loaders and deterministic synthetic fixtures only in tests. [VERIFIED: D-07]
- **Client-side authorization through hidden buttons:** enforce access and state transitions on the server. [VERIFIED: current auth/action architecture]
- **Over-broad public share:** retain exact token, expiry, revocation, and owner-derived lookup. [VERIFIED: share loader]
- **Accidental minor ranking exposure:** community leaderboard remains opt-in and authenticated, never public-by-default. [VERIFIED: SCREEN-MAP privacy rule]
- **Visual removal mistaken for data deletion:** delete obsolete view code only after route consumers move; do not drop user tables. [VERIFIED: runtime inventory]

## Implementation Patterns

### Server loader to source-shaped view model

```tsx
// Server Component: retain queries/scoring here.
const view = buildLobbyDashboardView({ profile, rankedAssignments, reminders });
return <LobbyDashboard view={view} />;
```

`LobbyDashboard` should receive the minimum serializable fields needed by the attached source and emit route-aware links. It should not query Supabase in a Client Component. [ASSUMED: recommended pattern consistent with current architecture]

### Route-derived bottom navigation

```tsx
const items = [
  { label: "Today", href: "/dashboard" },
  { label: "Work", href: "/assignments" },
  { label: "Classes", href: "/classes" },
  { label: "Calendar", href: "/calendar" },
  { label: "More", href: "/settings" },
] as const;
```

Active state should derive from pathname/route ownership, not a static source class. [ASSUMED: recommended pattern based on D-08]

### Visual assertion

```ts
test.use({ viewport: { width: 393, height: 852 } });

test("student lobby matches the reviewed source", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /Lobby/i })).toBeVisible();
  await expect(page).toHaveScreenshot("dashboard-lobby.png", {
    animations: "disabled",
    fullPage: true,
  });
});
```

Stabilize clocks, fixtures, fonts, images, and animations before capturing baselines. [CITED: https://playwright.dev/docs/test-snapshots]

## Do Not Hand-Roll

- Do not create a new router or static HTML navigation layer; use Next.js `Link`, App Router segments, and server actions. [VERIFIED: existing stack]
- Do not create a second auth/session mechanism; use current Supabase SSR middleware/client patterns. [VERIFIED: current architecture]
- Do not build a custom screenshot-diff engine; use Playwright's existing snapshot matcher. [CITED: https://playwright.dev/docs/test-snapshots]
- Do not add another icon CDN/runtime; use local, accessible React icon components already installed. [VERIFIED: dependencies and export CDN inventory]
- Do not duplicate ranking, time-budget, timer, FSRS, authorship, billing, or AI policy logic in visual components. [VERIFIED: existing business modules]
- Do not invent checkout, LMS sync success, grades, AI results, social membership, or leaderboard identities when the backend cannot substantiate them. [VERIFIED: D-07 and current capability seams]

## Common Pitfalls

1. **Counting 48 files instead of 47:** the attached dashboard replaces the folder dashboard. [VERIFIED: source precedence]
2. **Keeping old composition under new colors:** route/component ownership must move away from `TodayGamePlan` and generic shells. [VERIFIED: D-05/D-06 and current code]
3. **Premature abstraction:** repeated colors/cards do not make every export the same page template. [VERIFIED: structural source comparison]
4. **Losing backend behavior:** replacing Server Components with static client mockups would break real data, authorization, and safety. [VERIFIED: current architecture]
5. **Treating all source links as valid routes:** static hrefs must be mapped through the approved route matrix. [VERIFIED: D-08]
6. **Using remote media in production:** every ScreenDesign and DiceBear media dependency needs a local manifest entry. [VERIFIED: D-09 and asset inventory]
7. **Calling a screen complete after it renders:** every screen needs source comparison and primary-action proof. [VERIFIED: D-12]
8. **Overwriting calm/safety rules for exact copy:** reproduce visual intent while adapting scolding/error copy and red error semantics. [VERIFIED: D-11]
9. **Blanket-banning neutral status words:** “Overdue” can be a factual attention category without guilt; tests should reject shaming context instead of breaking the locked composition. [VERIFIED: source/test conflict]
10. **Deleting data because the user said delete Nexus:** the verified Nexus residue is presentation/build output, not a database entity. [VERIFIED: runtime inventory]
11. **Ignoring old compiled output:** a stale `.next` bundle can still contain removed copy until a clean build/deploy. [VERIFIED: build artifact inventory]
12. **Using visual baselines from different platforms:** screenshot diffs become noisy across OS/browser/font environments. [CITED: https://playwright.dev/docs/test-snapshots]

## Recommended Planning Sequence

1. **Foundation gate:** establish the 47-entry source manifest, route/state manifest, local asset manifest, exact viewport harness, deterministic QA fixture, and reviewed visual baseline method. [ASSUMED: planning recommendation]
2. **Shell and navigation:** implement low-level source primitives and route-derived five-item navigation without changing business loaders. [ASSUMED: planning recommendation]
3. **Hard replacement gate:** implement attached `/dashboard` and four onboarding screens first; remove the live `TodayGamePlan`/old dashboard consumer only after the replacement passes visual and action checks. [ASSUMED: planning recommendation]
4. **Core learning wave:** assignments, classes, calendar, detail, breakdown, notes, tutor/chat, timer, and artifacts. [ASSUMED: planning recommendation]
5. **Progress and sharing wave:** mastery, transcript, concepts, knowledge graph, portfolio/proof, insights, privacy/export, and token shares. [ASSUMED: planning recommendation]
6. **Settings and supporting states:** notifications, search, integrations, tutor settings, wellness, paywalls, community, loading, and empty states. [ASSUMED: planning recommendation]
7. **Removal and launch gate:** remove unreferenced old visual components/CSS, clean build artifacts, run all automated gates, verify preview, merge/deploy, and production canary against the intended SHA. [ASSUMED: planning recommendation]

Each implementation plan should keep work in coherent route/data clusters and include visual plus functional acceptance criteria for every source entry it owns. [ASSUMED: planning recommendation]

## State of the Art and Official Guidance

- Next.js App Router renders Server Components by default; Client Components are needed only for state, event handlers, effects, browser APIs, or client hooks. [CITED: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- Files in `public` are served from the root path, and local static images can provide intrinsic dimensions to prevent layout shift. [CITED: https://nextjs.org/docs/app/getting-started/images]
- Playwright supports exact viewport/device emulation, reusable authenticated storage state, and reviewed screenshot snapshots. [CITED: https://playwright.dev/docs/emulation, https://playwright.dev/docs/test-use-options, https://playwright.dev/docs/test-snapshots]
- Supabase's Next.js SSR guidance uses separate browser/server clients and cookie-based session refresh; authorization remains backed by authenticated context and database access controls. [CITED: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs]

## Assumptions and Resolutions

### Assumptions

- Existing route capabilities remain the product truth even where a static export depicts richer demo data. [VERIFIED: D-07]
- Exact mobile layout can be preserved while larger viewports center or safely expand without changing mobile information hierarchy. [VERIFIED: D-10]
- The existing Grayson QA seed can be extended or normalized to produce deterministic synthetic data for all 47 states. [VERIFIED: `lib/qa/grayson-demo.ts`; feasibility is assumed]

### Open Questions (RESOLVED)

1. **Onboarding persistence:** Add dedicated nullable `profiles.learning_hurdle` and `profiles.study_schedule_preference` fields with constrained values. Do not coerce either answer into diagnoses, accommodations, interests, timezone, or another legacy field. [RESOLVED: Phase 36 planning decision consistent with D-07]
2. **Legacy intake:** Retain the existing optional diagnoses, accommodations, school year, class load, interests, accessibility, and AI-literacy intake in Settings after the four locked source screens. The four-screen route completes onboarding; Settings remains the editable owner of the optional legacy values. [RESOLVED: Phase 36 planning decision consistent with D-04 and D-07]
3. **Insufficient records:** Render an honest source-shaped empty or unavailable state. Do not create starter classes, achievements, scores, sync success, group membership, or other fabricated product success. The QA fixture may create deterministic synthetic records only inside its owner-scoped test identity. [RESOLVED: Phase 36 planning decision consistent with D-07]
4. **Golden governance:** Use deterministic fixture copy and one controlled Windows Chromium/font environment. Exact geometry, hierarchy, imagery, selected state, and route ownership are reviewed against the normalized source. Dynamic text regions may use only registry-declared masks or a reviewed per-screen pixel threshold, never a blanket tolerance. Baseline creation or update requires an explicit update flag, a source/app/diff row, and human review; silent snapshot updates are prohibited. [RESOLVED: Phase 36 validation contract consistent with D-10 and D-12]

All four questions are resolved and represented in Plans 36-06, 36-07, 36-26, 36-27, 36-28, and 36-24 plus the Phase 36 validation contract. [VERIFIED: revised planning coverage]

## Sources and Provenance

### Primary local sources

- `C:\Users\glcar\Diana\AGENTS.md` [VERIFIED]
- `C:\Users\glcar\Diana\.planning\phases\36-faithfully-implement-all-47-figma-html-screens-and-remove-th\36-CONTEXT.md` [VERIFIED]
- `C:\Users\glcar\Diana\docs\design\SCREEN-MAP.md` [VERIFIED]
- Canonical 47 HTML set under `C:\Users\glcar\Downloads\ai-tutor-app-html-2026-07-14-15-18` plus attached dashboard override [VERIFIED]
- Live `app`, `lib`, `supabase`, `tests`, `public`, package, environment-key-name, OS task/service, build-artifact, Git, and Vercel metadata inventories [VERIFIED]

### Official documentation

- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components [CITED]
- Next.js images/public assets: https://nextjs.org/docs/app/getting-started/images [CITED]
- Playwright visual comparisons: https://playwright.dev/docs/test-snapshots [CITED]
- Playwright emulation: https://playwright.dev/docs/emulation [CITED]
- Playwright test options/auth state: https://playwright.dev/docs/test-use-options [CITED]
- Supabase with Next.js: https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs [CITED]

## Research Metadata

- **Canonical screen inventory confidence:** HIGH, enumerated from disk and reconciled with source precedence. [VERIFIED: filesystem]
- **Route mapping confidence:** HIGH, based on the approved screen map and live route inventory. [VERIFIED: SCREEN-MAP and app routes]
- **Visual-system confidence:** HIGH, based on direct parsing/inspection of all canonical sources. [VERIFIED: HTML set]
- **Backend-wiring confidence:** HIGH for existing loaders/actions and MEDIUM for onboarding schedule persistence until a schema/product decision is made. [VERIFIED: code/schema]
- **Asset count confidence:** HIGH, canonical URL extraction produced 24 ScreenDesign resources plus four DiceBear avatars. [VERIFIED: extraction]
- **Launch-readiness confidence:** MEDIUM before implementation because no exact-viewport golden suite or deployed replacement exists yet. [VERIFIED: test and deployment-state inventory]
