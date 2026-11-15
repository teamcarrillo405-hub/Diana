# Public, Auth, Onboarding, and Recovery UI Source Audit

Date: 2026-09-16

Workspace: `C:/Users/glcar/Diana`

Status: **AUDIT ONLY. REVIEW PREVIEWS FIRST. No workflow or production implementation approval.**

## Evidence and Scope

This report is based on current working-tree source, including existing modified and untracked files, not the historical onboarding/landing implementation. No browser, dev server, network action, account operation, data mutation, or rendered verification was performed. Tests were inspected selectively, not executed. Only this document was written. No descendant agents were spawned.

The requested visual references were read at `app/landing-3d/more-concept-review/` and `app/landing-3d/today-now-assets/`, including their imported menu, composition, and interaction sources. Their appearance is described as source intent, not screenshot evidence or user acceptance.

**Inventory count: 21 primary entries: 15 URL entries, five implemented error/loading/not-found boundaries, and one shared auth layout.** The 15 URL entries include the 12 requested App Router routes, two static HTML URLs added to scope, and `/public-not-found`, which middleware actually serves for unknown anonymous URLs. Three URL entries are redirects, not additional screens. Onboarding steps, share variants, policy tabs, and inline states are expanded below, not counted again as routes. Missing boundary files and legacy components are separately recorded.

Scope excludes redesigning authenticated feature destinations, API implementations, provider-hosted OAuth pages, and retired student routes. Supporting routing, persistence, caching, and validation code was read only where it determines these screens' behavior or safe preview boundaries.

## Highest Risks

| Priority | Source finding | Consequence and required decision |
| --- | --- | --- |
| P1 | Existing preview routes are not necessarily inert. `app/landing-3d/onboarding-preview/page.tsx:21` mounts the real onboarding component; `app/onboarding/screendesign-onboarding.tsx:193` saves setup, `:1048` saves a photo, and `:981`/`:996` enter real OAuth routes. `app/early-access/action-status.tsx:9` invokes confirm/unsubscribe on mount. More's preview links/search and Today's shared navigation also reach live routes. | A preview label or development-only URL does not establish isolation. New review fixtures must replace services, navigation, uploads, analytics, and token effects with local simulation before anyone interacts with them. Do not mount these current components unchanged as review fixtures. |
| P1 | `public/sw.js:2` still precaches `/flashcards`, while `lib/student-route-policy.ts:34` retires that prefix and `middleware.ts:22` rewrites retired paths with status 404. The same worker caches all same-origin navigation responses at `public/sw.js:58`, without excluding `/share/` or inspecting `Cache-Control`. | Source-level risk of service-worker installation failing on the retired precache entry and of bearer-token reports being retained/replayed after revocation. Middleware's `private, no-store` header is not an explicit Cache API exclusion. These are supporting recovery/privacy risks, not runtime-proven incidents. Preview offline screens must not promise verified caching/sync; preserve retired status and never suggest restoring `/flashcards`. |
| P1 | `app/trust/page.tsx:25` says account terms/notices will be published before accounts open, while `public/privacy.html` already publishes account-service notices and `/signup` is public in `lib/supabase/middleware.ts:38`. The policy's age/permission sections (`public/privacy.html:768`, `:835`) require guardian permission for minors; current signup has no attestation, and its tests explicitly expect none. `lib/learner-access-policy.ts:83` permits teen account and direct AI access. | Resolve the product/policy wording and eligibility workflow with the owner before approving a new signup or trust flow. This is a source inconsistency, not a legal compliance determination. Do not add consent attestations, loosen age checks, or rewrite legal commitments as part of visual work. |
| P2 | Onboarding's successful save sets `submittingRef.current = true` and advances to Connect, but the Back path does not clear that flag (`screendesign-onboarding.tsx:166-216`, `:297-300`). | Returning to personalization and pressing Continue exits immediately. Include this transition in the preview acceptance contract and separately approve any live behavioral fix. |
| P2 | The current personalization UI has no wellness controls, but initializes sleep/movement to 8/4 and sends them on Continue. `app/onboarding/actions.ts:114` upserts weekly wellness targets, including five check-in days, before updating `profiles.onboarded_at`. | Undisclosed defaults and partial persistence are workflow risks. Keep wellness optional; decide whether to expose optional controls or omit those writes in a later approved implementation. Do not silently preserve them under a new skin. Saving preferences already completes onboarding before the optional connection screen. |
| P2 | Login/signup surface raw auth-provider messages, have no surrounding exception/finally handling, and always navigate to `/dashboard`. Login ignores the `next` query supplied by middleware. Signup does not branch on whether a session was created. `app/auth/callback/route.ts:8` ignores the exchange result and redirects regardless. | Review pending, returned-error, rejected-request, email-confirmation-required, callback-error, and return-destination states explicitly. A mail-confirmation screen is a proposed missing state, not an existing screen. No forgot-password/reset flow exists in the inspected auth tree. |
| P2 | `/offline` is absent from both public allowlists and private route roots in `lib/supabase/middleware.ts`; an anonymous network request is classified as unknown and rewritten to `/public-not-found`. Error/404 copy asserts saved work without checking save state; retry hard-reloads. | Show truthful connection and unsaved-work uncertainty in proposed recovery fixtures. Distinguish public, authenticated, and cached navigation. Do not promise recovery of unpersisted form data. |

## Target Menu Language

Use the references' **composition and interaction model**, not a blanket dark recolor:

- **Shared spatial shell:** one full-bleed Diana studio image, a compact brand/navigation strip, a left selection rail, and an unframed content stage. `more-concept-review.tsx:36-84` and its CSS define the 228px rail, up-to-650px content column, ruled destination rows, and open scene space. Today's composition adds the staged character and task briefing. Public/auth pages should not inherit authenticated navigation.
- **Selection:** raster brush marker from `/assets/today-now/selection-brush-v1.webp`, explicit selected semantics, and a separate visible keyboard focus outline. Use the brush for the current mode, not every field, warning, or paragraph.
- **Typography:** Saira Condensed for menu labels and short headings, Lexend or the student's accessible reading font for forms and long text. Keep letter spacing zero, discrete responsive type sizes, readable sentence-case body copy, and no condensed all-caps policy paragraphs.
- **Surfaces:** full-width rules, stable row dimensions, and a single task/form plane where necessary. No nested cards, giant notched frames, or dashboard stat-card grids for login and policy reading. Keep framed controls at 8px radius or below.
- **Palette:** charcoal/neutral architecture, white text, magenta selection brush, restrained violet command accents, and mint/amber status accents. Do not make everything purple or navy. Errors remain amber; selection is never the sole status indicator.
- **Mobile:** rail becomes an accessible horizontal mode strip when it fits; otherwise a compact labeled menu. Stage becomes document flow, long text remains scrollable, forms stay ahead of decorative art, and action bars must not cover inputs or the software keyboard. Avoid fixed 852px screen assumptions.
- **Motion:** the references use short selection/content transitions and reduced-motion fallbacks. Freeze or remove scene motion while typing, reading policy, or handling errors; static poster and asset-failure fallbacks must work without WebGL/video. Sound is optional and off by default for these flows.
- **Meaning:** Madden-inspired navigation, not ranks, streaks, wins/losses, player ratings, pressure language, paid upgrades, or performance guarantees. Preserve student authorship and explicit turn-in/sharing choices. Do not turn age eligibility or private reports into a competitive status system.

Reference details: `app/landing-3d/more-concept-review/more-concept-review.module.css:5-40`, `:54-92`; `app/landing-3d/today-preview/today-lobby-review.module.css`; `today-now-composition.module.css`; `today-design-preview.tsx:72-146`, `:244-321`. The latter pauses the character for dialogs/sessions and restores focus. These are useful interaction precedents, not approval to import their live destinations.

The shared scene manifest is `app/landing-3d/today-now-assets/diana-signature-background.json`, referencing the 1280/1678px Diana signature studio images. Reuse existing assets for review; do not trigger paid media generation. File references were read, but media appearance/decoding was not verified.

## Public Route Inventory

### P01. `/` - Active Canonical Homepage

**Source:** `app/page.tsx:1` -> `components/canonical-public-landing/canonical-public-landing.jsx:3` -> `public-landing-v2.jsx:918`. Supporting live children: `landing-10k/homework-story.tsx`, `help-modes-rail.tsx`, `subject-rail.tsx`, and `content.ts`. Styling: `app/public-landing-v2.css`, `app/canonical-public-landing.css`, and `landing-10k/homework-story.module.css`.

**Current screen/state inventory:**

- Desktop navigation; mobile menu closed/open; header-hidden state after leaving the hero, which also closes the mobile menu.
- Three hero chapters: life, organized work, and practice. Scroll-driven video, chapter buttons, mobile/desktop media, reduced-motion/static presentation, and poster while media is unavailable/loading. This live hero is `HomeworkStory`, despite its local import alias `CinematicHero`.
- `#how-it-works`: school-connection illustration, actual workspace screenshot, four workflow explanations, and a 12-subject carousel. Subject rail supports drag, arrows, pause/play, focus/hover pause, and reduced motion.
- `#why-diana`: five selectable hotspots, none/one selected, Escape to dismiss, and a mobile detail region.
- `#help-modes`: eight help modes, selected poster/video/editorial-cover states, desktop previous/next and direct selection, desktop playback control, mobile swipe/visibility-driven playback, and reduced-motion posters.
- `#your-control`: three ownership scenes, one expanded at a time: Diana Guides, You Write, You Decide. No separate modal.
- `#early-access`: idle, invalid email, submitting, success/disabled, and service-error/retry. Hidden honeypot field; polite status message. Invokes `early-access-signup`. Footer routes to the static policy hashes through `config/site.js`.

**Concrete preview layout:** a public title-menu composition with DIANA prominent over the shared studio, a vertical menu for Overview / How It Works / Student Control / Early Access, and an inspectable work/practice screenshot on the main stage. Overview's three chapters become directly selectable stage views instead of a mandatory long pinned scroll. Keep the public sections and deep-link anchors in document flow below, with a visible hint of the next section. Convert help modes to a ruled mode roster that changes one large media area; convert hotspots to an adjacent labeled selection list with the image still legible. Keep the waitlist as one short form in a dedicated stage, not a modal or account-creation gate.

**Constraints:** preview email is synthetic and submission stays in memory. No analytics or outbound calls. Waitlist success is not account creation, account access, a paid plan, or guaranteed admission. Preserve reduced motion, alternative text, keyboard access, and the distinction between product imagery and available features. The hard-coded November 1, 2026 early-access date is source content requiring owner confirmation, not a verified launch commitment.

### P02. `/trust` - Active Public Summary

**Source:** `app/trust/page.tsx`; `components/marketing/public-page-frame.tsx`.

**States:** four static articles with `#privacy`, `#student-control`, `#legal`, and `#contact`; shared public navigation and early-access anchor. No form, tabs, consent dialog, account state, or policy-management controls. The content is an early-access summary, not the full legal notice.

**Concrete preview layout:** a Trust menu rail with the four existing topics as hash-preserving section links, a narrow readable policy stage with ruled sections, and an unobtrusive public header. Keep all content accessible in document order, even if the preview adds topic selection. Put the link to the full static privacy/terms reader alongside the summary, not behind a purchase or signup action.

**Constraints:** resolve the pre-account-launch wording conflict before workflow approval. Do not certify privacy/security claims from appearance. Preserve the difference between this summary and `/privacy.html`.

### P03. `/student-control` - Active Public Explanation

**Source:** `app/student-control/page.tsx`; `components/marketing/public-page-frame.tsx`.

**States:** three static explanations and one image: assistance beside work, student-owned draft, student-confirmed turn-in. No real draft editor, submit action, or dialog.

**Concrete preview layout:** a three-row menu, Diana Guides / You Write / You Decide, selecting a clear annotated product screenshot and a short explanation in the main stage. The writing and guidance areas remain visibly separate. A bottom ruled workflow strip ends at a student-controlled review/turn-in illustration, not a functioning submit button. On mobile, the three explanations and corresponding media stack.

**Constraints:** `done` must not imply `submitted`; no automatic submission, generated student response, live work, or fake authorship history. Preserve the existing product-specific image's explanatory role instead of replacing it with decorative character art.

### P04. `/how-it-works` - Redirect Only

**Source:** `app/how-it-works/page.tsx:4` redirects to `/#how-it-works`.

**States:** redirect and destination anchor. No standalone page or wizard.

**Concrete preview choice:** target P01's selected How It Works menu state and its four-step source/work/help/review sequence. Keep this an alias; do not add a second landing page or resurrect an older explainer route. Verify anchor arrival later, after preview review is authorized.

### P05. `/early-access/confirm` - Active Token Action Screen

**Source:** `app/early-access/confirm/page.tsx`; `app/early-access/action-status.tsx:6-22`.

**States:** initial updating; missing token -> generic error; invoke rejection/returned error -> same generic error; success. Token-bearing mount invokes `early-access-confirm`. No retry button, status live region, detailed invalid/expired distinction, or return link is rendered in the shared status component.

**Concrete preview layout:** a compact receipt/status stage aligned to the menu content column: Confirm Early Access heading, one status line, explicit home destination, and a stable progress-to-receipt region. Use a check icon on success, amber text on inability to confirm, and no confetti, unlock animation, or account dashboard navigation. Simulate pending/confirmed/unavailable states with inert fixture controls outside the product surface.

**Constraints:** no real token input, token echo, URL logging, request on mount, or account-access claim. Review action-specific recovery copy without changing the real confirmation workflow.

### P06. `/early-access/unsubscribe` - Active Token Action Screen

**Source:** `app/early-access/unsubscribe/page.tsx`; shared `action-status.tsx`.

**States:** updating; missing/unusable token; invoke error; removed successfully. The shared generic error currently asks the visitor to join the list again, including on unsubscribe.

**Concrete preview layout:** a quiet Preferences receipt using the same placement as P05, with the removal outcome dominant and a plain Back to Diana link. The error specimen must say removal could not be confirmed and provide an appropriate review-approved recovery destination. Do not make rejoining the primary action or add a retention/confirmation modal to a presently direct removal flow.

**Constraints:** removal must remain distinct from confirmation/signup. No live unsubscribe, promotional upsell, automatic resubscription, or invented support endpoint in previews.

## Auth and Onboarding Inventory

### S01. Shared Auth Layout - Active Shell, Not a Route

**Source:** `app/(auth)/layout.tsx`; `app/screendesign.css:150-302`; `components/screen-design/app-mark.tsx`. Root font/style ownership: `app/layout.tsx`.

**Current composition:** background image, large notched outer frame, left-side story heading, brand home link, and a separate form card. Children supply their own h2. No auth-specific error/loading/not-found boundary files exist.

**Concrete preview layout:** a compact public header, Account rail with Sign In / Create Account, and one unframed form column on a stable opaque-enough plane over the signature studio. The active route gets the brush marker. Replace the competing oversized story headline with a short route title and keep the right-hand scene as unobstructed background, not another card. On mobile, account choices become two text tabs above the form and the background is static.

**Constraints:** no authenticated Lobby/Work/Classes navigation, no live account avatar, no global CSS overrides. Preserve a single main landmark and coherent page heading in the proposed shell. Typing, password-manager filling, and validation must not move the layout.

### P07. `/login` - Active Anonymous Account Entry

**Source:** `app/(auth)/login/page.tsx`, `login/form.tsx`; auth middleware in `lib/supabase/middleware.ts:108-121`.

**States:** local Suspense text fallback; empty/filled email and password; browser-required validation; signing-in disabled submit; returned provider error in `role=status`; success -> `/dashboard` plus refresh. Signed-in visitors are redirected away by middleware. No show-password, forgot-password, magic-link, OAuth-login, verification-email, or session-expiry-specific UI is present. The middleware `next` destination is not consumed.

**Concrete preview layout:** Sign In selected in the shared rail; a 440-520px form stack on the content stage; one submission command, a reserved amber inline-message row, and a separate Create Account destination row. Treat a proposed recovery link as a workflow decision, not a working feature. A visibility icon can be a clearly scoped preview interaction without changing authentication.

**Constraints:** preserve native labels, autocomplete, password masking, keyboard submission, and pending affordances. Use dummy credentials; no Supabase client. Preview rejected-network and session-expired states as proposed missing coverage. Do not imply error-boundary retry restores a password or unsaved input. Any approved return-to behavior must retain a validated local destination.

### P08. `/signup` - Active Anonymous Account Creation

**Source:** `app/(auth)/signup/page.tsx:24-79`, `:89-156`; `lib/age.ts`; `lib/learner-access-policy.ts`; `lib/onboarding/public-draft.ts`; supporting callback `app/auth/callback/route.ts`.

**States:** email/password/name/date-of-birth entry; name optional; minimum eight-character password; required/invalid date; under-13 blocked; teen/adult eligible; creating-account disabled submit; raw provider error; success clears any public draft and navigates to `/dashboard`. Auth metadata includes DOB, timezone, optional name, and optional draft hurdle/schedule. Blocked sessionStorage is nonfatal. Signed-in visitors redirect away.

**Concrete preview layout:** Create Account selected in the same rail, one aligned four-field form, age eligibility adjacent to DOB, and a compact policy-reference footer near the submit command. Keep the optional name visually secondary. Include separate fixture outcomes for eligible submission, age block, service error, and confirmation email required; do not claim the last is implemented. No multi-screen account wizard or guardian dialog is approved by this audit.

**Constraints:** DOB and guardian/account eligibility are sensitive. Preserve the current under-13 block and do not interpret support for middle-school coursework as account permission. Keep the current test-backed no-attestation behavior until a specific policy/workflow decision changes it. Policy links/consent semantics and confirmation handling need approval. A preview must not write user metadata, send email, clear a real draft, or exchange an auth code.

### P09. `/onboarding` - Active Auth-Gated Two-Step Flow

**Source:** `app/onboarding/page.tsx:12-18`, `form.tsx`, `screendesign-onboarding.tsx`, `onboarding-personalize.module.css`, `onboarding-connection.module.css`; `lib/onboarding/screendesign-step.ts`; `actions.ts`.

**Routing:** no profile -> `/login`; `onboarded_at` -> `/dashboard`. Default step is Personalize. `sdState` resolves only Personalize or Connect; old challenge/schedule/connect query aliases map to those two, not to the old four-screen flow. Unknown/array state defaults to Personalize. A direct Connect alias can skip the first screen locally, but dashboard still enforces incomplete onboarding.

#### P09a. Personalize, 1 of 2

**States/controls:** four hurdle radios; three schedule radios displayed as Morning/Afternoon/Evening while persisted IDs remain `morning`/`after_practice`/`late_night`; initial profile values or exam-stress/afternoon defaults; missing-choice disabled Continue; saving; validation/auth/persistence/exception feedback; keyboard arrow/Home/End selection with actual focus transfer. Optional photo action opens the OS file picker, converts/resizes the image locally, then immediately saves via a server action. Photo states are absent, choosing, saving, saved/replace, and decode/server error. There is no in-app crop, remove, or photo-preview dialog in this component.

**Concrete preview layout:** two-step setup rail, Personalize selected; central two-question sheet made of ruled radio rows and a three-part time selector; optional small camera row below; stable Continue footer. Keep the scene open to the right, without a second promotional image card. On mobile use the step count, one column, and ordinary document scrolling. Preserve selection focus independently from the brush's visual state.

**Sensitive constraints:** do not infer diagnosis from a hurdle. Photo is optional and must not gate progress. No real file upload/profile write in fixtures; use supplied synthetic images or an in-memory file demonstration only. The current hidden sleep/movement defaults are not approved user choices. Expose that discrepancy to workflow review.

#### P09b. Connect School, 2 of 2

**States/controls:** optional Google Classroom link; Canvas URL form with native URL/required validation; Back; Skip for now -> `/dashboard`. Google and Canvas requests use `return_to=/dashboard`. There is no in-page connecting/success/denied/retry provider-state UI. External consent and callback/status handling live outside this component. Preference save already sets `onboarded_at`, so a reload can bypass this screen. Back currently triggers the submission-latch issue described above.

**Concrete preview layout:** Connect selected in the rail; Google Classroom and Canvas as two provider rows rather than competing cards; selecting Canvas reveals the school-address field inline in the stage. Keep Back and Skip separately reachable. Model provider handoff/pending/canceled/unavailable as local specimens, not a recreated provider login. A simple connection outcome should leave the same Skip/Continue destination visible.

**Sensitive constraints:** school connection stays optional and uses approved OAuth, never password/token collection. Do not relabel a connection as successful before a provider result. Review Back -> edit -> Continue, reload, direct Connect, and skip/incomplete-profile behavior before agreeing the final workflow.

### P10. `/onboarding/done` - Redirect Only

**Source:** `app/onboarding/done/page.tsx:4` -> `/dashboard`.

**States:** redirect; no celebration, completion summary, or fourth setup step. Dashboard access can redirect an incomplete user back to onboarding.

**Concrete preview choice:** preserve the alias. If approved, show a brief completion status inside the existing setup-to-Lobby transition, not a newly revived Done page. Do not gate entry behind a rewards/upgrade screen or imply that school connection is mandatory.

## Shared Links and Recovery Routes

### P11. `/share/[token]` - Active Accountless, Server-Validated Share

**Source:** `app/share/[token]/page.tsx:17-105`, `parent-summary.tsx`, `teacher-snapshot.tsx`; supporting `lib/sharing/token.ts`, `lib/sharing/types.ts`; middleware response header at `middleware.ts:36`.

**Access/state selection:** force-dynamic route; server service client; digest lookup with legacy plaintext-token fallback; unrevoked and unexpired link required. Missing service configuration, lookup error, invalid token, expired token, and revoked token collapse to the same unavailable presentation. `parent_summary` renders the report; other share types take the portfolio branch. A development QA query can change the reference date; it does not replace DB access with fixtures.

| Variant | Current states/details | Concrete preview composition |
| --- | --- | --- |
| Parent summary | Weekly completed-work count, study time, computed confidence percentage, next-seven-days count, optional concept list, latest visible-to-parent teacher note or fallback insight, expiry, and Print report -> `window.print()`. Zero metrics and no concepts show neutral counts/N/A. Native browser print dialog, not a custom export modal. | A read-only Report menu with Overview / Concepts / Shared Note and a document-like stage. Put neutral totals in a single ruled strip, not competitive score tiles. Persistent scope/week/expiry header; print icon with tooltip. Mobile reads top to bottom; print becomes black-on-white content with all selected report sections visible. |
| Teacher/external portfolio | Most recent owner portfolio; up to six ordered items; optional description/reflection; native `details` collapsed/expanded; no portfolio/items -> empty state; expiry. No file download or real share dialog. The Share2 affordance is an in-page anchor. | An evidence roster on the left and selected work/reflection on the stage, with a scoped-count/expiry line. Keep disclosure semantics or equivalent keyboard controls. Use actual approved evidence when available, not trophy art standing in for work. Empty roster gets one neutral message, not a grade or rank. |
| Unavailable | One common message asking the student for a new link; no owner identity or reason detail. | A minimal locked-report status stage with neutral icon and readable explanation. No authenticated nav, student name, expired report thumbnail, account login demand, or button that pretends to renew someone else's token. |

**Sensitive constraints:** preserve accountless scope, revocation/expiry checks, and non-enumerating errors. Never ship a token, service credential, real student content, or report in fixtures/screenshots. Source currently fetches live owner data, not an immutable per-token snapshot. The portfolio branch chooses the latest portfolio and items rather than a token-specific item list, while the UI says selected evidence; this binding needs review before stronger snapshot/selection claims. Parent metrics also use current rows and query failures can collapse to empty/zero output; distinguish unavailable data from genuine zero in proposed specimens.

**Copy accuracy:** current report labels completed work as Sessions; its confidence percentage is derived from up to five lowest-level concepts, not a GPA or overall grade. The portfolio's Verified student share badge is not evidence of academic certification. Keep the redesign's labels tied to the actual fields. Link recipients are viewers, not logged-in student players. `/parent-share`, `/teacher-share`, and `/portfolio/*` are retired creation/management routes, not alternate destinations to revive.

### P12. `/offline` - Implemented Offline View, Routing Caveat

**Source:** `app/offline/page.tsx`; shared `components/screen-design/diana-recovery-screen.tsx`; supporting `public/sw.js`, `components/pwa-runtime.tsx`, `lib/offline/store.ts`, and `lib/supabase/middleware.ts`.

**States:** static Connection paused / You are offline text and Back to today -> `/dashboard`. No online/offline subscription, queue count, retry control, cache-status query, or sync progress is displayed. The generic text claims recent pages remain available and queued changes will sync. Anonymous network routing currently rewrites this URL to public 404; cached service-worker navigation is a different path.

**Concrete preview layout:** a Connection status strip across the shared static scene and a compact menu of available destinations. Show a cached-pages list only when supplied by a truthful fixture/data contract; distinguish nothing cached, locally queued edits, reconnecting, and restored connection as proposed states. Keep the offline action stage usable if imagery/fonts fail. No moving character or network-dependent scene.

**Constraints:** do not mount `PwaRuntime` in the review: it drains real queues and, in development, unregisters workers/deletes caches. Do not modify installed workers, browser data, or actual queues. Recovery guarantees require separate engineering verification, especially the retired precache entry and token-cache risk above.

### P13. `/privacy.html` - Active Static Policy Reader

**Source:** `public/privacy.html:657-1135`; linked by `components/canonical-public-landing/config/site.js` and the homepage footer. It is a standalone HTML document, outside the React/root-layout design system; middleware's matcher excludes HTML assets.

**Actual panels:** Privacy, Terms, Safety, Accessibility. **Age is an embedded section in Privacy and Terms, not a separate tab. Student Control is the page heading and a recurring safety/authorship theme, not a separate fifth tab.** Preserve this source distinction rather than inventing current screens.

**States/interactions:** four hash-selected tabs; default/unknown hash -> Privacy; keyboard Left/Right/Home/End; selected tab focus and roving tabindex; `hashchange` handling; history updates; document-title updates; hidden inactive panels when JS runs. With no JS the source retains all articles in document order. Skip-to-policy and home links exist; Accessibility includes an email support link. No checkbox, acceptance submission, cookie/settings dialog, sign-in, age form, or personal-data controls execute here.

| Panel | Source content requiring preservation/review | Concrete preview layout |
| --- | --- | --- |
| Privacy | Public/account data, optional sensitive information, service providers, sharing, age, retention/deletion, controls, security, and contact placeholders. | Privacy selected in a More-style four-topic rail; a 65-75ch reading column with a compact section index and ruled subsections. Age and Controls are prominent section links within that column. No privacy toggles that suggest this informational page changes an account. |
| Terms | Agreement, age/permission, academic integrity, ownership, connected services, availability, disclaimers, and unresolved operator/governing details. | Same reader stage with Terms selected, concise section headings, readable long-form text, and version/effective-date footer. No game-style Accept command unless an actual consent workflow is separately approved. |
| Safety | Authorship, consequential-action confirmation, AI limits, privacy/sharing, optional wellness, adult access, reporting, and not-an-emergency-service notice. | Safety selected; three clear section groups for student control, sharing, and getting help, with the full existing text still available. Keep serious assistance/emergency text as readable document content, not a challenge, reward, or menu sound event. |
| Accessibility | Font/reading/motion preferences and support contact. | Accessibility selected; a plain capability/support list. If demonstrating font or motion controls, label their preview-only scope outside the document and do not change user preferences. Preserve the support link as a reviewed destination. |

**Sensitive constraints:** legal/privacy content is not decorative filler and must not be rewritten or strengthened by the design pass. Preserve the effective date/version and maintain a no-JS readable fallback. Operator/contact placeholders and discrepancies with `/trust` and signup need owner review before launch. Source declarations are not verification of legal compliance, provider settings, or actual data retention. On mobile, use compact top tabs and a reading column; hide decorative background under opaque reading content where needed.

### P14. `/trust.html` - Configured Permanent Redirect, Legacy File Retained

**Source:** `next.config.ts:63-66` redirects to `/privacy.html#privacy`. `public/trust.html` still contains an older complete three-tab Privacy/Terms/Safety reader and no Accessibility panel; the file itself is not a redirect script.

**States:** normal configured route -> canonical Privacy panel. Directly opening/serving the raw legacy file outside that configuration would show the old reader. This report did not verify deployed HTTP behavior.

**Concrete preview choice:** represent this URL only as a redirect/arrival specimen for P13, not a redesigned second trust document. Preserve redirect intent; do not revive the retained file as a separate active screen. Include historical hash/link compatibility in a later routing check because the configured destination explicitly names `#privacy`.

### P15. `/public-not-found` - Active Supporting Anonymous 404

**Source:** `app/public-not-found/page.tsx`; `lib/supabase/middleware.ts:108-109`.

**States:** standalone public 404 message and Back to Diana; no retry or auth requirement. Unknown anonymous routes can render this instead of `app/not-found.tsx`. Metadata is noindex/nofollow. Current main lacks the root skip-link target ID.

**Concrete preview layout:** the public unavailable-page menu state, compact DIANA header, one explanation and Back to Diana action aligned with the public title-menu rail. Share the visual vocabulary with B02, but keep the middleware-backed route as a distinct test target. Do not redirect anonymous visitors to the authenticated Lobby.

## Implemented Boundaries

| ID / source | Current state and sensitive behavior | Concrete Madden-inspired preview choice |
| --- | --- | --- |
| B01 `app/error.tsx` | Root segment error. Shared recovery screen, Refresh page, Back to start `/`. Reports client error with pathname; development console logging. Retry calls reset, router refresh, then hard reload through `lib/error-recovery.ts`. Does not cover an exception in the root layout itself. | A paused public stage with an amber status line, primary refresh command, and a separate home destination row. Static/fallback scene only; no account context or raw error/digest. Mock retry and telemetry; show unsaved-state uncertainty instead of guaranteeing all work is saved. |
| B02 `app/not-found.tsx` | Root unavailable-page message and `/` return, no retry. Uses shared recovery component. Not the only anonymous 404 path. | A missing-destination menu composition: small path-unavailable label, readable heading, one home row, and no dead selected menu items. No error modal or competitive loss language. |
| B03 `app/(app)/error.tsx` | App segment error, same reporting and hard-reload sequence, return to `/dashboard`. Parent app layout enforces user/profile access and provides surrounding runtime/shell behavior. | The same paused stage inside a simulated authenticated shell with Back to Today/Lobby as the reviewed destination. Preserve route semantics regardless of final visible label. No mutation retry that might replay a submission; no fabricated saved-work assurance. |
| B04 `app/(app)/loading.tsx` | `SmartLoading` with route-safe label, polite atomic status. Current full-screen studio/notched glass frame; decorative progress fills to 90% over 3.6s and becomes static at 68% for reduced motion. No actual percentage exposed and no application delay imposed. | Hold the menu's geometry and show one indeterminate content-loading strip in the stage, with a small wordmark and truthful label. Use a solid/static reduced-motion mark. Do not animate a measured percentage or fill the screen with a separate framed splash every route change. Slow/error specimens must be clearly proposed states, not invented real progress. |
| B05 `app/(app)/not-found.tsx` | Shared recovery message claims saved work and returns to `/dashboard`; no retry. Retired routes are rewritten by middleware toward `/not-found` with 404, not a restoration flow. | A missing app destination in the same rail/stage geometry, one reviewed Today/Lobby destination, and neutral explanation. No links back to retired pages. Avoid including private task details when route lookup failed. |

Shared recovery source: `components/screen-design/diana-recovery-screen.tsx:24-154` currently uses a centered 520px translucent panel over `/images/diana-loading-empty-studio.png`, a logo, h1, message, and optional refresh button. All variants use `role=alert`/assertive announcement, even non-error 404/offline contexts. Preview polite status versus alert urgency deliberately rather than inheriting it blindly.

Shared loading source: `components/screen-design/smart-loading.tsx` also hides capture/help shell affordances using `:has()` and global selectors. Do not change that shared live CSS to make a preview work. App shell plus fallback may introduce nested main landmarks/duplicate `main-content` IDs; future rendered accessibility checks must inspect the actual composition rather than validating the component in isolation.

### Missing Boundary and Recovery States

- No `app/loading.tsx` or `app/global-error.tsx` exists in the inspected tree. Do not report the app-group loader as a root/public loader. A root-layout-failure specimen should be dependency-light and distinct from B01 if approved later.
- No `app/(auth)/error.tsx`, `loading.tsx`, or `not-found.tsx` exists. Login's Suspense text is the only local auth loading presentation found. Root boundaries provide fallback behavior where applicable; middleware determines whether an unknown auth/public URL reaches them.
- Literal `app/auth/` contains the callback route, not a second rendered auth shell, and has no error/loading/not-found UI files. Expired/missing callback code, email-verification-required, password-reset request, reset-email-sent, and reset-token-invalid screens are absent, not retired implementations to restore.
- Proposed fixtures should expose these gaps for approval, but this audit does not authorize adding routes, sending reset emails, changing callback behavior, or promising a recovery workflow that does not exist.

## Retired and Legacy Status

`lib/student-route-policy.ts` is authoritative over the existence of page files. It declares 21 exact retired routes and eight retired prefixes. `middleware.ts:22-29` checks retirement before session routing and returns a 404 rewrite. None of the 15 inventoried URLs is explicitly retired by that helper; their redirects/auth caveats are listed individually above.

Relevant exclusions are `/parent-share`, `/teacher-share`, `/settings/goals`, `/settings/ai-history`, `/settings/tutor`, `/upgrade`, `/landing-editor-preview`, `/portfolio/*`, `/flashcards/*`, and `/design/*`. Other retired student pages remain outside this audit. Retained actions/adapters do not make their old UI routes active. Canonical destinations include `/sharing`, `/settings`, `/study`, and `/proof`, but this sidecar does not redesign those destinations or route public users into them.

| Retained source | Current status | Inventory consequence |
| --- | --- | --- |
| `app/public-home-funnel.tsx` | Not used by `app/page.tsx`. A retained landing-editor component references it; the editor route family is retired. | Record its legacy welcome -> education -> challenge -> schedule -> community -> standard flow, but do not add six active screens to the redesign count. It writes a sessionStorage draft and can navigate to signup. |
| `WelcomeScreen`, `EducationalScreen`, `ChallengeScreen`, `ScheduleScreen` in `app/onboarding/screendesign-onboarding.tsx` | Retained scroll-presentation components, not the current authenticated two-step wizard. Challenge/schedule selection and older wellness sliders remain in source. | No proposal to revive the old four-step quiz, sports-pressure copy, GPA imagery, or an extra wellness setup step. Current wizard states are P09a/P09b. |
| `app/onboarding/actions.ts:49` `saveOnboarding` | Retained broader diagnoses/accommodations/accessibility persistence action; no current UI caller was found in the searched app/components/lib sources. | Do not claim diagnosis, IEP extra-time, class count, interests, font size, or TTS are current onboarding screens. Do not collect them through a redesign without workflow approval. |
| `app/(app)/upgrade/upgrade-screen.tsx` | Retained standard/community component used by the old public funnel with billing disabled; `/upgrade` itself is explicitly retired. | No paid-plan, checkout, unlock, or tier-selector page should enter the new public flow by inheritance. |
| `components/canonical-public-landing/landing-app.jsx`; local `HeroFilm` and `HelpModesPreview` in `public-landing-v2.jsx` | Not selected by the current canonical homepage render/import chain. | Do not audit these as the current hero/help-mode interaction. The active children are identified in P01. |
| `public/trust.html` | Legacy static payload behind the configured redirect. | Redirect specimen only, not a second source of approved policy content. |

## Preview-Only Approval Contract

All choices in this report are recommendations for **review previews**, not requests to patch production routes. Keep the public, account, policy, sharing, and recovery navigation graphs distinct even when they share the visual shell.

1. **Isolated fixture layer.** Use synthetic users, dates, assignments, provider results, emails, reports, and errors. State changes remain component-local and resettable. No auth/session client, real server action, storage mutation, telemetry, service worker, paid render, token lookup, email, billing, OAuth handoff, or queue drain. A server dependency import audit is necessary; hiding buttons is insufficient.
2. **Isolated review entry.** Preserve existing routes, retirement policy, settings, environment, redirects, shared CSS, and assets. Any later review route needs its own local-only guard, noindex, and preview-local navigation. More's strict loopback/non-Vercel checks are a useful source pattern; Today's unparameterized development path is less restrictive, so do not assume all existing `/landing-3d` routes are equally guarded. No guard/config changes are authorized now.
3. **State coverage before styling sign-off.** Include every existing inline state listed above and label proposed missing states in review controls/documentation. In particular: unsubscribe error, under-13 block, signup without session, Back/edit/Continue, photo error, optional school skip, token unavailable, empty report, no-JS policy text, and offline with no cache. Do not silently turn a redirect into a new screen.
4. **Workflow approval record.** Obtain decisions on public entry/CTA and launch-date wording; trust/policy authority and minor-permission language; signup confirmation/recovery; onboarding save timing and optional wellness; provider return/error handling; token report scope/expiry/print; and public versus authenticated recovery destinations. Visual approval alone is not data/auth workflow approval.
5. **Later verification, separately authorized.** Desktop/mobile screenshots, keyboard/focus, 200% zoom/reflow, touch targets, forced colors, accessible fonts, reduced motion, missing assets, long input/errors, print, deep links/back/forward, and zero-mutation network assertions. Verify private-content caching/revocation and actual offline support in a separately approved engineering test, not by browsing real token links in design review.
6. **Only after explicit workflow approval:** plan narrowly scoped production integration and regression tests. Maintain the under-13 gate, authorship/submission rules, canonical routes, retirement 404s, and live-data ownership boundaries. No live implementation work is included in this sidecar.

## Verification Gaps and Recommended Review Order

Source tests found include `app/onboarding/screendesign-onboarding.test.tsx` for the two-step flow, keyboard selection, save-before-connect, and persistence errors; `app/(auth)/signup/page.test.tsx` for age boundaries and absent guardian metadata; `app/share/[token]/page.test.tsx` for report/portfolio scope and legacy-token fallback; `parent-summary.test.tsx` for print behavior; and recovery/loading tests under `app/`, `app/(app)/`, `components/screen-design/`, and `lib/error-recovery.test.ts`. Their presence is not a passing test result. Back/edit/resubmit, real email-confirmation behavior, service-worker retirement/cache interactions, and rendered responsive/accessibility outcomes were not verified here.

Recommended sequence for future preview work:

1. Build an inert shared public/account menu specimen plus error/loading/404 states to establish the reusable rail/stage geometry without live services.
2. Review signup and both onboarding steps first, including hidden defaults and Back behavior, because they collect sensitive information and currently mutate state.
3. Review the complete static policy reader and `/trust` summary together to settle authority, age, consent, and contact copy before connecting account navigation.
4. Review public homepage/menu interactions and both token-action receipts, retaining waitlist-versus-account separation.
5. Review synthetic shared reports, empty/unavailable variants, print presentation, and offline states with explicit truthfulness constraints.

**Acceptance status:** source inventory and design recommendations only. No rendered visual fidelity, browser behavior, accessibility conformance, deployed routing, auth/persistence correctness, legal compliance, or user approval is claimed.
