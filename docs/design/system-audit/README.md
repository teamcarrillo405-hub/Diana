# Diana System Design Audit

Date: 2026-09-16. Decision: **review previews first**. No live-screen promotion is authorized by this audit.

## Current Status

- [x] Enumerate App Router pages, layouts, loading/error/not-found boundaries, static policy pages, and the HTML review handler.
- [x] Independently inspect public/onboarding, work/study, and account/library workflow source.
- [x] Separate intentionally retired URLs from the active components that still use their source.
- [x] Inspect representative live screens in the signed-in browser, without submitting work or saving settings.
- [x] Define a screen-specific migration sequence and acceptance contract.
- [ ] Render and exercise every reachable screen and every important state. Source coverage is not a substitute.
- [x] Finish and visually verify the first new Account/Settings review preview.
- [x] Build and verify isolated Work capture and representative Algebra/English workspace previews.
- [ ] Obtain workflow-by-workflow approval before production integration.

Baseline before the new Settings preview: **74 page files**, of which **22 are deliberately retired**, **25 are policy-active student pages**, **13 are public/auth source pages**, and **13 are review pages**. Two QA pages include one of the retired pages, so those counts are not mutually exclusive. There are also **11 boundary files**, **5 layouts**, and **3 additional static/HTML-handler entries**. Redirects, auth-gated pages, and internal fixtures are not additional working product screens.

The generated inventory below reflects the current checkout, including any new preview page created in this pass. The baseline count above remains fixed for comparison.

## Evidence Index

- [Every route and boundary](routes.generated.md): generated coverage matrix with proposed design family and source disposition.
- [Machine-readable inventory](routes.generated.json): imports, components, literal headings, inline styles, direct dialog/tab/form tags, and redirect calls. It does not recursively enumerate every component state.
- [Account, library, and hub audit](account-library-audit.md): 37 primary variants, all 11 Settings section keys, class/note detail, calendar modes, hidden tools, and retirement decisions.
- [Work and study audit](work-study-audit.md): 23 source route patterns, canonical capture/workspace/submit contracts, embedded tools, artifact modes, and retired capability mapping.
- [Public, onboarding, and recovery audit](public-onboarding-audit.md): 21 primary entries, onboarding steps, auth/token states, public shares, static policy reading, and recovery risks.
- [Rendered baseline observations](runtime-baseline.md): screenshots inspected in this task, explicit gaps, and no live mutation claims.
- [Account preview verification](settings-preview-verification.md): tested behavior, viewport evidence, deliberate omissions, and approval boundary.
- [Work preview verification](work-preview-verification.md): capture and active-work checks, fixes found in the browser, and unimplemented production capabilities.
- [Workspace preview contract](workspace-preview-contract.md): fixture ownership, interaction semantics, and isolation boundaries.
- [Remaining pages review verification](remaining-pages-verification.md): 31 direct review specimens across classes, study, notes, record, entry, public, and recovery screens, plus verification and limits.

These reports include state inventories and source-level risks. They are not claims that each feature is currently functional or visually accepted. Existing unrelated working-tree changes were included as current source and were not reverted.

Counts in the three specialist reports use different units and must not be added together. The 25 policy-active student page files reconcile as 15 account/library pages plus 10 work/study pages. Source group names such as `public` do not establish anonymous access: onboarding requires auth, and `/me` currently falls through the anonymous unknown-path rule to a 404 because its root is absent from the middleware's private-route list. Root/app/auth boundary files can share a normalized route, so coverage keys retain their source filename.

## What The Game Reference Actually Changes

EA's [Franchise Hub guide](https://help.ea.com/hu/articles/madden-nfl/franchise-hub/) describes a shared navigation structure with specialized weekly matchups, prioritized action cards, roster management, and settings. Its [accessibility reference](https://www.ea.com/able/resources/madden-nfl/madden-nfl-26) also treats narration, contrast, icon sizing, and menu audio as part of the interface.

**Our design inference:** borrow the hierarchy and interaction discipline, not football terminology, EA artwork, or the same layout everywhere. A selection menu, a long-form editor, and a consent screen have different jobs. A game-like shell cannot justify obscuring student work, disguising privacy choices, or adding fictitious scores.

No numerical AAA rating is assigned. Finish is judged against actual rendered compositions, interaction behavior, accessibility, and the user's workflow approval.

## Reviews Ready

[Open the connected Lobby preview](http://127.0.0.1:3027/landing-3d/today-now-assets?character=relit). Lobby, Work, Classes, Calendar, and More now use one shared primary navigation across the student review screens. More contains Quiz, Notes, Record, Wellness, and account access. Settings owns preferences and connections. Public, Entry, and Recovery remain review categories in the collapsed catalog, not student destinations. [Navigation and quiz verification](remaining-pages-verification.md) records the current checks.

[Open Account options](http://127.0.0.1:3017/landing-3d/settings-concept-review). Ten visible sections cover the existing eleven section keys; `learning-loop` maps to the same preview body as `learning`. `reading` remains an Accessibility alias. Drafts survive category changes, Apply is memory-only, and Reset/Undo are available. No live account/settings screen changed.

[Open Work capture](http://127.0.0.1:3017/landing-3d/work-capture-review) and [open Active work](http://127.0.0.1:3017/landing-3d/workspace-concept-review). Capture offers sample-file and pasted-text intake, original-source comparison, editable metadata, and explicit confirmation. The workspace preserves the original center order: problem, Diana conversation and message/voice controls, then Work tools/Review and the typed/handwritten work pad. Source and rubric stay secondary. All results are memory-only; voice and attachment controls use explicit disconnected/sample states. The capture receipt opens a prepared workspace example, not an assignment created from the capture inputs.

[Open Submission review](http://127.0.0.1:3027/landing-3d/submission-concept-review) for local manual and connected handoff fixtures, preflight checks, pending and recovery states, and truthful sample receipts. [Verification and limits](submission-preview-verification.md) record the rendered checks and the production contracts still missing.

[Open remaining pages review](http://127.0.0.1:3027/landing-3d/remaining-concept-review/study) for 31 directly addressable, synthetic specimens covering class settings, Study, Notes and Search, Record, Wellness, Sharing, entry, public, and recovery. [Coverage and verification](remaining-pages-verification.md) distinguish rendered examples from the unresolved production workflows.

These are review slices, not completion of the system-wide redesign. The remaining specialist editors and real persistence contracts still require their own coverage. Full visual/state coverage and user acceptance remain open in the checklist above.

## One Graphic Language

1. **Scene:** reuse the approved Diana signature environment. Menu artwork is full-bleed, not another image inside a card. Active writing/reading surfaces use quiet, opaque or frosted contrast planes; they do not compete with a moving character.
2. **Type:** Saira Condensed for brief navigation and display labels. Lexend or the selected accessible reading font for body copy, assignments, forms, and source material. Discrete responsive sizes, zero letter spacing, no forced all-caps paragraphs.
3. **Selection versus action:** pink raster brush identifies the current section. Violet identifies an immediate primary command. White focus outlines are separate from selection. Mint means completed/saved; amber means attention/decision; neutral blue/graphite means planned. No red error treatment.
4. **Structure:** consistent safe-area margins, stable menu rows, aligned data columns, restrained rules, and one clear primary action. No nested cards, decorative stat grids, or extra containers added to make a screen seem more detailed.
5. **Interaction:** selection feedback first, then content arrival, then any optional character response. Do not replay scene animation while typing. Sound is optional and off unless the student opts in. Reduced motion removes nonessential animation.
6. **Semantics:** selected, focused, disabled, pending, unavailable, saved, and error are distinct states, with text/icon cues as well as color. Native controls remain operable by keyboard and touch.
7. **Responsive:** layouts recompose, not shrink. Phones use document order and compact selectors; editors and dialogs remain usable with the keyboard open. Test narrow screens, long labels, enlarged text, and empty data.

## Workflow Migration Map

Every route belongs to a family in the generated matrix. The detailed audit owns query variants, modal states, and embedded tools.

| Order | Family and routes | Diana game-menu treatment | What stays unchanged |
| --- | --- | --- | --- |
| 1 | Account/options: `/settings`, `/me`, all section keys | Options rail, aligned setting rows, focused help, stable Apply/Undo footer; profile as identity setup rather than a dashboard | Existing preferences, local-versus-server persistence, learning supports, AI consent, connection permissions |
| 2 | Work selection/capture: `/assignments`, `/quick-add`, `/assignments/captures/[id]` | Approved Work schedule as selection surface; one source-intake stage with upload/paste modes; capture review compares original source and extracted fields | File constraints, classification confidence, class ownership, explicit confirmation, retained source |
| 3 | Active work: `/assignments/[id]`, `/assignments/[id]/workspace` | Compact session HUD and problem roster; original center problem/conversation/composer/work-pad order; source/rubric secondary; tools revealed on demand | Drafts, autosave, teacher directions, handwriting, specialist tools, AI policy, voice permissions, actual elapsed time |
| 4 | Submission: `/assignments/[id]/submit` | Preflight review and a separate confirmed receipt, not a celebratory automatic completion screen | Student-confirmed submission, destination, evidence, honest pending/error/receipt states |
| 5 | Class detail/setup: `/classes`, `/classes/[id]`, `/classes/[id]/settings` | Approved roster selection plus class profile, current work and materials; focused setup/policy menus | Teacher data, confirmed grades, rubrics, class AI rules, create/material flows |
| 6 | Calendar: `/calendar` month/week/day; proposed personal-event editor remains preview-only | Personal schedule with time lanes and event detail; sports, plays, appointments, and school work visibly distinguishable | Existing time zones, all-day/timed display, overlaps, assignment versus personal-event semantics, integration status; do not imply preview event editing is persisted live |
| 7 | Study: `/study`, `/study-artifacts`, `/study-artifacts/new`, `/study-artifacts/[id]` | Practice selection, source briefing, quiet one-question session, then evidence-backed review | Source selection, quiz state, study guide reading, save/restart, provenance; FSRS core stays unchanged, while the missing canonical flashcard-review continuation is a separate unresolved integration issue |
| 8 | Notes/search: `/notes`, `/notes/new`, `/notes/[id]`, `/search` | Searchable library roster with selected-item preview; writing is a focused editor with compact capture tools | Text/audio/photo input, transcription, tags, class links, draft continuity, citations, filter URLs |
| 9 | Record/wellness/sharing: `/proof`, `/wellness`, `/sharing`, `/share/[token]` | Evidence collection; private history timeline; clear audience/permission review | No invented achievements, public ranking, health score, streak pressure, or automatic sharing |
| 10 | Entry: `/login`, `/signup`, `/onboarding`, `/onboarding/done` | Title/setup sequence with focused forms, optional connection stage, explicit completion/confirmation states | Eligibility, authentication, optional photo, genuine integration availability, consent boundaries |
| 11 | Public/trust/token pages and static policy | Branded title/menu composition with readable content; quiet action receipts and policy reader | Product truth, approved policy text, waitlist versus account distinction, token privacy |
| 12 | Shared loading/error/not-found/offline/dialogs | Same brand/type/action language with stable skeletons and truthful recovery controls | No unverified promise that unsaved work is safe; no destructive retries; working focus restoration |

Lobby, Work, Classes, Calendar, and More previews are visual references, not replacement data layers. Their fixture metrics and local interactions must never be imported as production truth. Retired routes have no migration slot unless separately reauthorized.

## Blocking Decisions Before Promotion

These are source-backed issues to investigate and resolve separately, not changes made by this design pass:

- **Preview isolation:** existing review pages can reach real actions/OAuth or live destinations. New fixtures must be explicitly inert. A development-only URL is insufficient protection.
- **Navigation:** search can link to retired concept routes; two learning settings keys share one body; an unknown settings key can leave an empty panel. Decide canonical destinations without reviving retired routes.
- **Draft and submission continuity:** changing the work shell must not remount editors, discard specialist tool state, change assignment lifecycle, or equate completion with submission. The detailed audit notes the live `exporting` handoff contract; use source rather than old architectural shorthand.
- **Entry flow:** onboarding back/continue and silent default writes, login return-destination handling, signup confirmation, and raw service errors require functional review before entry previews are integrated.
- **Offline/privacy:** service-worker precache includes a retired route and navigation caching needs explicit private-share review. These are source risks, not demonstrated incidents.
- **Policy consistency:** the public notices, signup experience, and eligibility rules do not all say the same thing. Owner/policy review is required; visual work must not invent legal requirements or remove existing checks.

## Per-Workflow Acceptance Gate

1. **Contract:** list current routes, query keys, APIs/actions, visible controls, draft ownership, and sensitive side effects. Map each into the preview, or explicitly mark it out of the current preview's scope.
2. **Isolation:** sample data only, mocked services, and preview-local navigation; no server actions, OAuth, account uploads, analytics writes, live tokens, or account mutations. Simulated results must say preview. Explicit production exits must be labeled and use `prefetch={false}`; they still leave the isolated fixture and require separate read-only handling. Synthetic props alone do not isolate a component that imports live actions.
3. **Composition:** verify 1920px, 1440px, tablet, 390px, and 320px. Check long text and enlarged text; no horizontal page overflow or overlapping controls; real assets loaded and readable hierarchy preserved.
4. **Interaction:** keyboard focus/order, tabs and dialogs, selection versus focus, cancel/undo, dirty changes, all pending/empty/error states, touch targets, and reduced motion. Data survives switching sections.
5. **Engineering:** targeted tests, typecheck, scoped lint, and source inspection for unintended live imports. Automated success is not visual approval.
6. **User review:** leave the verified preview visibly open, state exactly what was tested, and obtain approval for that workflow.
7. **Integration:** only then bind the approved presentation to existing real data/actions and repeat functional checks. Keep a scoped rollback path. Do not globally recolor unrelated pages as a shortcut.

## Reproduce The Source Census

```powershell
node --experimental-strip-types --experimental-loader ./scripts/beta/typescript-resolution-loader.mjs ./scripts/design-screen-inventory.ts
```

The native Node TypeScript path avoids the sandbox's esbuild child-process restriction. Do not change package module type merely to silence the experimental loader warning.
