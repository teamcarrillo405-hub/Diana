# Entry, public, loading, and system pages

Date: November 17, 2026. Source baseline: main commit 25477d59.

This is a source-grounded update plan. It does not claim that every state below has received a new rendered-browser review. No application behavior, customer data, credentials, or generated media is changed by this document. Keep the approved Lobby, Work, Classes, and Calendar design as the reference.

## Scope and counting rules

There are 34 page.tsx files outside app/(app): 12 non-redirect route files, including one public Lobby sample, 19 redirect/compatibility routes, and three development-only specimens. Onboarding is a real screen with conditional authentication/completion redirects; it must not be classified as redirect-only merely because its source calls redirect(). A public shared-report route has two recipient layouts plus an unavailable-link state. Onboarding has two reachable steps.

Static HTML policy pages, inline states, global boundaries, OAuth handlers, downloads, and development specimens are recorded separately so the plan does not invent extra student pages or extra rooms.

## Visual direction and scene allocation

- **NEW-01 Campus Entry:** shared arrival/foyer environment for sign-in, signup, account recovery, confirmation, and restrained public-page mastheads. Use an original 4K master with desktop and phone crops, an uncluttered form-safe area, and a lightweight fallback.
- **NEW-06 Student Services:** shared onboarding and Settings environment. Both onboarding steps belong in this one room, with consistent materials and daylight. Root plan uses this master for Settings as well.
- **SYSTEM:** guaranteed local/CSS fallback for loading, error, unavailable, and offline conditions. A small approved destination poster may enhance it, but the state must work when imagery or fonts cannot load.
- Keep the public cinematic structure. Update its product captures, identity, and necessary poster material rather than generating a separate room for each story section.
- Shared reports and policy text need reading surfaces. They do not need additional scenic plates.

These slots are part of the six-master whole-app background plan. No image generation is authorized or performed by this planning document.

Use the approved athletic DIANA wordmark, display typography, paint-brush selections, two-color school identity, and restrained trim. Use readable body text for forms and long explanations. Do not add points, streaks, trophies, ranking, recruitment language, or assumptions that every student is an athlete.

Before authentication, use the neutral Diana identity. Do not reveal a previously signed-in student's school name, logo, or preferences on a shared device. School names, logos, and colors remain live UI layers, never baked into a generated background. Preserve the approved restriction on school-logo placement rather than duplicating it across every page.

## Page-by-page entry and public plan

### 1. Public landing: /

**Current:** app/page.tsx renders CanonicalPublicLanding, then cinematic-v3/cinematic-landing.tsx. That component reads the active public/assets/landing-cinematic-v3/index.html narrative. It includes a 3D/WebGL story, product/video enlargement dialog, fallback story, FAQ, and waitlist. Its abstract gradient-symbol DIANA identity, Outfit typography, and some product imagery do not yet provide the same campus introduction as the current student application.

**Update:** retain the premium narrative and motion structure while bringing its wordmark, navigation, and current-product captures into the approved identity. Connect its arrival story to NEW-01 and the real campus application. Review the product posters against current Work, Homework, and Classes; do not present old product captures as the current program. Use clearly fictional demonstration content.

**Background:** KEEP cinematic structure; REUSE NEW-01 where an arrival plate is useful. Do not replace the narrative with a generic dashboard hero or create a new background for each chapter.

**States to review:** normal motion, reduced motion, no WebGL, video failure/poster fallback, mobile menu, FAQ expansion, product dialog open/close, zoom, Escape/focus return, waitlist idle/sending/success/error.

**Acceptance:** no blocked CTA when motion/media fails; genuine current product imagery; accessible navigation and dialogs; phone crop protects controls; no real student content in demonstrations.

**Priority/dependency:** P2 after canonical entry identity and refreshed product captures are available.

**Sources:** app/page.tsx; components/canonical-public-landing/canonical-public-landing.jsx; components/canonical-public-landing/cinematic-v3/cinematic-landing.tsx; cinematic-landing-client.tsx; public/assets/landing-cinematic-v3/index.html; components/canonical-public-landing/early-access-form.tsx.

### 2. Sign in: /login

**Current:** app/(auth)/layout.tsx uses the older raster logo and components/student-shell/public.module.css. The background is /assets/today-now/diana-signature-studio-v1-1678.webp. Purple CTA/focus/link styling differs from the finished campus app. Login includes email/password, pending text, inline provider error, and a validated next destination. Its Suspense fallback is plain Loading text. There is no forgot-password or password visibility control.

**Update:** make this the clear entrance to the same campus experience. Use the approved wordmark, form-first layout, consistent control sizes, optional password visibility, and a real recovery link. Preserve password-manager support and safe return routing.

**Background:** NEW-01, reused throughout account entry and recovery. Compose the form-safe area independently for desktop and phone. Do not force school branding before identity is known.

**States:** empty/populated fields, valid submission, signing in, generic credential error, network error, expired session, safe destination return, confirmation-required result, recovery link.

**Acceptance:** keyboard and password-manager operation; email retained after error; pending state always resolves after network exceptions; 320/390/768/1440 layouts and 200% text; no unsafe redirect; no password printed in logs or screenshots.

**Priority:** P0.

**Sources:** app/(auth)/layout.tsx; app/(auth)/login/page.tsx; app/(auth)/login/form.tsx; components/student-shell/public.module.css.

### 3. Create account: /signup

**Current:** same old entry family. Email, password, optional name, date of birth, age eligibility, pending/error states, and email-confirmation result exist. Success can enter the app directly or show Check your email. There is no designed resend or expired/reused-link path.

**Update:** share the sign-in layout and control system. Keep age eligibility and private-by-default account behavior intact. Distinguish student-account creation from waitlist registration. Use clear, calm field feedback rather than raw technical error strings.

**Background:** REUSE NEW-01; no separate registration illustration.

**States:** allowed/blocked age, invalid date, password validation, existing-account result, optional name omitted, sending, network failure, email sent, confirmation complete, expired/reused link, safe resend.

**Acceptance:** create only the intended account; prevent duplicate submission; retain non-secret inputs appropriately; test same- and cross-device confirmation; do not treat a generic generated magic link as a verified server-authenticated sign-in path.

**Priority:** P0, together with account recovery.

**Source:** app/(auth)/signup/page.tsx.

### 4. Account setup: /onboarding, Make it yours

**Current:** there are two reachable onboarding steps, not four. Personalize includes learning-hurdle choices, Morning/Afternoon/Evening study timing, optional school name/two colors/logo, optional student photo, and save feedback. It mixes the legacy signature-studio background with /images/onboarding-study-sunlight.png. Pink/purple choices and purple CTA styling differ from the approved campus application.

**Update:** use a concise Student Services setup with a useful personalized campus preview. Preview [school name] Campus, school colors, and the approved banner/home logo placement. Keep photo upload optional. Save branding before proceeding. Do not incorrectly flag the unused Hustle/Grind option descriptions as currently displayed: the actual timing buttons use neutral Morning/Afternoon/Evening labels.

**Background:** NEW-06, with room-consistent desktop/phone composition. Replace the unrelated portrait photo column with a crop from this environment or the live personalization preview. No text or logo baked into the plate.

**States:** first load; selected/unselected radio options; school omitted; school provided; color validation/contrast; logo upload/preview/remove/error; optional photo upload/save/error; saving; save conflict/network retry; successful continuation.

**Acceptance:** keyboard radio navigation; two-color contrast; optional branding/photo do not block setup; school changes persist into Lobby; long school name wraps; unsupported image format/size gives usable feedback; shared-device logout does not expose another student's identity.

**Priority:** P1 after entry foundations.

**Sources:** app/onboarding/page.tsx; app/onboarding/form.tsx; app/onboarding/screendesign-onboarding.tsx (PersonalizeScreen); app/onboarding/onboarding-personalize.module.css; components/school-branding-form.tsx; lib/onboarding/screendesign-step.ts.

### 5. Account setup: /onboarding, Connect your school

**Current:** step two offers Google Classroom, Canvas URL input, Back, and Skip. This component's visible link labels do not reflect the provider feature flags. Google Classroom must remain distinct from the separately configured Google Calendar connection.

**Update:** show whether each provider is available, explain its purpose briefly, and keep connection optional. Do not advertise disabled Classroom as ready. Provide visible results for canceled/denied/unconfigured/expired connections. If Calendar is offered here, it must have its own explicit purpose and minimal permissions.

**Background:** REUSE NEW-06, using the same room and a coordinated crop. Provider cards need readable surfaces, not separate generated backgrounds.

**States:** available/unavailable provider; Canvas address empty/invalid/valid; connecting; canceled; denied; configuration unavailable; expired state; connected; connected but import pending; retry; Back; Skip to Lobby.

**Acceptance:** provider feature flags match UI; Classroom and Calendar permissions are clearly separated; Canvas address is validated; provider return does not lose setup or destination; Skip works without an external account.

**Priority:** P1.

**Sources:** app/onboarding/screendesign-onboarding.tsx (ConnectSchoolScreen); app/onboarding/onboarding-connection.module.css; provider start/callback route handlers.

### 6. Trust: /trust

**Current:** PublicPageFrame uses the old raster logo, signature-studio background, and purple CTA. Articles cover early access, student work, privacy/terms, and questions.

**Update:** use the shared approved identity and a readable information sheet. Ensure the explanation of tutoring and answers matches the golden rule while retaining student authorship and explicit hand-in. Keep account creation distinct from joining a waitlist.

**Background:** REUSE a restrained NEW-01 masthead/outer frame or a solid reading surface. No new scenic plate.

**States/acceptance:** readable long text, current links, keyboard navigation, phone and large text, accurate policy anchors and support destination. Content and legal review remain separate from visual editing.

**Priority:** P1 for canonical policy links; P2 for visual polish.

**Sources:** app/trust/page.tsx; components/marketing/public-page-frame.tsx.

### 7. Student control: /student-control

**Current:** same PublicPageFrame; three explanatory articles and /assets/video/diana-work-stays-yours-film-poster-v2.webp.

**Update:** retain a clear explanation of help beside student work, appropriate worked answers when needed, student authorship, and explicit hand-in. Replace any outdated product poster with the actual approved Work/Homework experience. Do not imply every learner is an athlete or restore an outdated blanket refusal to provide answers.

**Background:** REUSE public entry frame. UPDATE product capture/poster if needed; no new scenic room.

**Acceptance:** actual current screen shown; long body text readable; responsive image treatment; accurate tutor behavior and privacy statements.

**Priority:** P2.

**Source:** app/student-control/page.tsx.

### 8. Waitlist email confirmation: /early-access/confirm

**Current:** PublicPageFrame with EarlyAccessActionStatus. It invokes the confirm function from a token and displays loading/success/error/missing-token results.

**Update:** one small, calm confirmation card with a meaningful next action. This confirms waitlist email, not creation of a student account.

**Background:** REUSE NEW-01. No separate confirmation image, confetti, award, or fake progress.

**Acceptance:** valid/missing/expired/reused token; service/network failure; retry and safe navigation; no misleading account-created message.

**Priority:** P1.

**Sources:** app/early-access/confirm/page.tsx; app/early-access/action-status.tsx.

### 9. Waitlist unsubscribe: /early-access/unsubscribe

**Current:** same action-status component, unsubscribe variant.

**Update:** same small card and hierarchy; clear unsubscribe result and recovery from an unusable link.

**Background:** REUSE NEW-01.

**Acceptance:** missing/invalid/used token, already-unsubscribed and network failure; accessible live status and safe return.

**Priority:** P1.

**Sources:** app/early-access/unsubscribe/page.tsx; app/early-access/action-status.tsx.

### 10. External shared report: /share/[token]

This one route has three real display outcomes. It is not a full student navigation shell.

| Outcome | Current content | Update / acceptance |
|---|---|---|
| Parent summary | Completed work, upcoming work, study time, permitted progress notes, concept confidence, expiry, Print | Keep counts neutral and useful. Check empty/populated states, long text, timezone labels, phone layout, and print/PDF. Show only approved fields, not private check-in/IEP detail. |
| Teacher selected work | Portfolio title/description, up to six chosen samples, expandable reflections, empty state, expiry | Keep selected content dominant; test collapsed/expanded details, long titles, phone, and print. Do not accidentally print only collapsed titles when reflections were intended to be shared. |
| Link unavailable | Shared recovery screen for expired/revoked/absent link or unavailable service | Keep a generic private-link response and ask the student for a new link. Do not expose private preview content or diagnostic account details. |

**Current appearance:** warm paper over the old studio photo; old raster wordmark; purple print control.

**Background:** NO new scenic background. Use a readable white/off-white report with a small approved Diana identity strip. Any campus surround must be subtle and absent from print. Do not automatically add a student's school/logo to public shares without an explicit sharing decision.

**Priority:** P1.

**Sources:** app/share/[token]/page.tsx; parent-summary.tsx; teacher-snapshot.tsx; components/student-shell/shared-report.module.css.

### 11. Public sample Lobby: /lobby-preview

**Current:** public read-only specimen uses fictional Tigard data and CampusLobby. The hand-built wrapper still includes the older raster logo plus an extra Diana text span, and inert sample navigation. It is not an authenticated student's Lobby.

**Update:** retain its useful no-sign-in review purpose, but make it a thin specimen of the real approved component/header. Keep a clear sample/read-only label and accessible real Home/Sign in navigation. Do not duplicate the Lobby implementation or introduce live account actions.

**Background:** KEEP the approved Lobby scene. No new render.

**Acceptance:** no real student records; clearly fictional content; no writable actions; usable navigation; responsive current header/wordmark.

**Priority:** P2.

**Sources:** app/lobby-preview/page.tsx; app/lobby-preview/preview-content.tsx.

### 12. Literal public missing-page route: /public-not-found

**Current:** separate dpl-action-page markup, unlike the common recovery component.

**Update:** consolidate its visual behavior with the root missing-page family and retain the appropriate Home destination.

**Background:** SYSTEM. No new image.

**Acceptance:** correct links, calm explanation, readable phone layout, and consistent wordmark/actions.

**Priority:** P1.

**Source:** app/public-not-found/page.tsx.

## Static public policy and trust pages

These are real user-facing HTML destinations, even though they are not page.tsx routes:

1. public/privacy.html: four tab states, Privacy, Terms, Safety, Accessibility. Uses Outfit, the old studio backdrop, and legacy identity.
2. public/assets/landing-cinematic-v3/privacy.html: separate policy implementation and visual identity, reached by the active cinematic landing's rewritten Privacy link.
3. public/trust.html: an additional static trust variant identified in the complete route/asset inventory. Include it in the link/content/style consolidation audit rather than overlooking it.

The active landing's index.html is the fourth relevant public HTML file in this family, but represents the existing root narrative, not another policy page.

**Plan:** choose one canonical policy/trust source and preserve valid anchors or compatibility redirects. PublicPageFrame links to /privacy.html while the cinematic landing remaps to its asset-local policy document. Resolve this duplication before broader Google verification so the app's published privacy/terms destinations are coherent. Do not silently change legal substance during graphics work.

**Background:** NO new scene. Reading surface first, restrained entry masthead if useful, approved identity, minimal ink in print.

**Acceptance:** all policy tab/hash states, keyboard operation, long text and large-text layout, print, external links, and correct return to the live product. Test old URLs after consolidation.

**Priority:** P0/P1 for canonical links and access; P2 for remaining visual polish.

## Offline page and saved-work states: /offline

**Current:** real PWA fallback outside the authenticated route group. It reuses Work's StudentShell and intake presentation. OfflineLearningReader includes an account-scoped saved-pack list, material selection, passage search, practice selection, local calculation/rubric feedback, response editing, local draft save, and visible storage/error notices.

**Update:** make offline status understandable without replacing the learning workspace. Use the current Work/reading typography and control family; explain which actions work locally and which require reconnection. Maintain account ownership and preserve local drafts.

**Background:** REUSE a small approved Work poster only if explicitly cached; otherwise SYSTEM solid/CSS treatment. No new photograph, network-dependent 4K launch requirement, or large video. Background failure must not block the saved material.

**State inventory:**

- No saved packs for this account/device.
- Pack list, selected pack, and changing packs.
- Search idle, matching passages, no matching passage, long source text.
- Practice selection and restored local draft.
- Reading-rubric versus supported calculation feedback.
- Empty/nonempty response, checking, local feedback.
- Draft save pending, confirmed saved, save unavailable.
- Storage unavailable, offline model/chat unavailable.
- Reconnecting, queued work, sync paused, conflict/review required.
- Account switch, locked/quarantined older saves, sign-in required.

**Acceptance:** test an optimized production build with the connection actually disabled, full reload, pack search, draft save, app restart and draft reopen, reconnect/sync and account isolation. Do not use a development server as proof of production service-worker behavior. Show Saved only after persistence succeeds.

**Priority:** P0 system dependency.

**Sources:** app/offline/page.tsx; components/learning/offline-learning-reader.tsx; components/learning/learning-material.module.css; components/pwa-runtime.tsx; lib/learning-engine/offline-client.ts; public/sw.js.

## Missing account flows to implement

These are planned gaps, not existing screens. Source inspection found no forgot-password, reset-password, authenticated password-change UI, signInWithOtp, resetPasswordForEmail, verifyOtp, or password updateUser flow in app/components/lib.

| Planned screen/state | Required behavior | Background |
|---|---|---|
| Forgot password | Email entry, sending, generic sent result, retry/rate/network error; no account enumeration | REUSE NEW-01 |
| Recovery or account-confirmation result | Missing, invalid, expired, reused, and cross-device link handling; clear next action | REUSE NEW-01 |
| Set new password | New password/confirmation, validation, updating, success; secure return to the intended account flow | REUSE NEW-01 or NEW-06 if already authenticated |
| Authenticated Change password | Current-session/account confirmation, private entry, validation, success/error; appropriate session handling | REUSE NEW-06 |
| Session expired | Safe sign-in return destination with owned draft protection and honest saved-work status | REUSE NEW-01 plus SYSTEM fallback |

The final route names should follow the chosen verified Supabase recovery design; do not invent a working recovery URL merely by naming a page.

app/auth/callback/route.ts is a handler, not a visible page. It currently exchanges a PKCE code and redirects to /dashboard without a designed error result. It must not be assumed to support an arbitrary emailed recovery or implicit magic link. Implement and test the actual server-authenticated flow, including email delivery and same-/cross-device use, before presenting it as available.

These normal student-managed account flows should replace reliance on administrator-issued temporary credentials for routine access problems.

## Loading and route-transition family

Seven actual loading boundaries use components/screen-design/smart-loading.tsx:

| Scope | File | Current status text |
|---|---|---|
| General authenticated application | app/(app)/loading.tsx | Getting your next view ready |
| Lobby | app/(app)/dashboard/loading.tsx | Getting Today ready |
| Work list | app/(app)/assignments/loading.tsx | Getting your work ready |
| Assignment detail | app/(app)/assignments/[id]/loading.tsx | Getting this assignment ready |
| Class detail | app/(app)/classes/[id]/loading.tsx | Getting this class ready |
| Notes | app/(app)/notes/loading.tsx | Getting your notes ready |
| Record/proof | app/(app)/proof/loading.tsx | Getting your record ready |

Login also has its own plain Suspense fallback. In-page uploads, generation, exports, provider connection, and draft saves are additional inline loading states to capture in their respective page families; they are not extra room backgrounds.

**Current appearance:** SmartLoading uses recovery.module.css, the old signature-studio image, an older wordmark asset, purple accents, and a bar that visually moves toward 90 percent over 3.6 seconds without actual task progress. This can stop looking useful during a slow request. Lobby copy still says Today.

**Plan:** preserve the destination shell and stable header/nav geometry when possible. Use a destination-family skeleton, small cached poster or SYSTEM layer, clear actual phase or truthful indeterminate activity, and restrained motion. Use current Lobby naming. Avoid forced intro videos, loading tricks, fake percentage completion, or an entirely different room between every navigation.

**Acceptance:** fast and slow network, delayed fonts/image failure, reduced motion, screen-reader status, 200% text, phone/tablet, and navigating Back during a pending request. Loading must not erase Calendar date/view/item or workspace draft context. Avoid flashing a previous user's school identity during authentication/account changes.

**Priority:** P0 shared foundation.

**Sources:** components/screen-design/smart-loading.tsx; components/student-shell/recovery.module.css; the seven loading.tsx files above; app/(auth)/login/page.tsx.

## Error, unavailable, and missing-page family

There are two error boundaries and three not-found boundaries, not five independent scenic rooms:

- app/error.tsx: root error, safe return to start.
- app/(app)/error.tsx: authenticated error, safe return to Lobby.
- app/not-found.tsx: root unavailable page.
- app/(app)/not-found.tsx: application unavailable page.
- app/(app)/assignments/not-found.tsx: unavailable assignment context.

The literal /public-not-found route and unavailable shared reports are additional consumers/outcomes to unify.

DianaRecoveryScreen already centralizes the main error presentation, reporting and retry behavior, but its recovery.module.css still has the legacy studio image, fixed purple primary action/focus color, and older identity. Keep its calm amber approach and useful Retry/Back actions.

**Plan:** one coherent recovery component with destination-appropriate return labels. Preserve safe owned drafts and only claim a draft is saved when the system knows that it is. Explain unsaved work honestly. Keep technical diagnostics out of the student's main message. Generic private-link outcomes must not expose an account or unpublished content.

**Background:** SYSTEM, optionally reusing an already available destination poster. No new error, missing-page, empty-state, or connection-failure image.

**Acceptance:** retry success and repeated failure, safe return, auth expiry, stale links, revoked sharing, missing/deleted assignment, image/font failure, keyboard focus, and no infinite refresh loop.

**Priority:** P0/P1.

**Sources:** components/screen-design/diana-recovery-screen.tsx; components/student-shell/recovery.module.css; app/error.tsx and boundary files above.

## Installed app, launch, updates, permissions, and reconnect

**Current identity seam:** app/manifest.ts uses a white launch background, purple #4f46e5 theme, /dashboard start URL, and the old purple D/yellow-dot /icons/diana-icon.svg. This is a different launch identity from the current campus application.

**Plan:** use a purpose-designed approved application/maskable icon and appropriate neutral launch color. Keep small icons legible without squeezing a detailed campus crest or full wordmark into them. Launch directly into the valid authenticated destination or sign-in, with a lightweight SYSTEM state. No cinematic video as a required app splash.

PwaSettings includes these real states:

- Install available/unavailable, accepted/dismissed, installed browser/standalone behavior.
- Reminders unsupported, permission not requested, denied/granted, on/off.
- Sync worker starting/ready.
- No queued work versus queued notes/status/reviews.
- Sync requested, syncing/paused, review-required/conflict.
- Older device saves needing account review.

Bring its generic rounded utility cards into the approved control system; keep the actual options plain and optional. No new scenic background is required.

**Important asset dependency:** public/sw.js explicitly caches /offline, its /_next/static references, vendor recognition files, manifest and /icon. It does not explicitly cache the campus /assets images or /icons/diana-icon.svg. Do not assume a newly designed offline plate will be available after a cold offline restart.

Add a narrow safe static allowlist for approved small fallback posters, fonts, and application icons. Preserve the existing invariant that authenticated HTML/RSC/private source documents are not globally cached. School branding must remain owned/account-scoped and be cleared or quarantined appropriately on account changes.

Current worker installation immediately calls skipWaiting() and activation claims clients. Plan an understandable update-available/safe-refresh state with draft protection rather than a forced reload while a student is writing.

**Acceptance:** supported browser installation, platform instructions when prompt is unavailable, launch offline and online, notification allow/deny/unsupported, worker update with a draft, delayed sync, account switching, and status-review resolution. Use production service-worker tests.

**Priority:** P0/P1.

**Sources:** app/manifest.ts; public/icons/diana-icon.svg; public/sw.js; components/pwa-runtime.tsx; components/pwa-settings.tsx.

## Redirect and specimen register

### Compatibility redirects: no additional scene generation

These 19 route files lead to canonical content. Keep useful compatibility routes until a link/reference audit supports removal. They do not represent 19 additional student rooms.

| Route | Destination / disposition |
|---|---|
| /how-it-works | /#how-it-works |
| /onboarding/done | /dashboard; no graduation/confetti screen required |
| /landing-3d/calendar-concept-review | /calendar |
| /landing-3d/classes-concept-review | /classes |
| /landing-3d/more-concept-review | /more |
| /landing-3d/onboarding-preview | /onboarding |
| /landing-3d/remaining-concept-review | /more |
| /landing-3d/remaining-concept-review/[screen] | Mapped canonical destination; invalid screen becomes not-found |
| /landing-3d/settings-concept-review | /settings |
| /landing-3d/submission-concept-review | /assignments?view=ready |
| /landing-3d/test-prep-concept-review | /study |
| /landing-3d/today-motion-review | /dashboard |
| /landing-3d/today-now-assets | /dashboard |
| /landing-3d/today-now-composition | /dashboard |
| /landing-3d/today-preview | /dashboard |
| /landing-3d/today-preview/integration | /dashboard |
| /landing-3d/work-capture-review | /quick-add |
| /landing-3d/work-concept-review | /assignments |
| /landing-3d/workspace-concept-review | /assignments |

The three development-only specimens /landing-3d/assignment-world, /landing-3d/hero-product-capture, and /landing-3d/logo-mask explicitly return not-found outside development. Keep them out of the production student navigation and artwork count. Use real product components for specimens rather than reviving a second design implementation.

Older landing-app.jsx, public-landing-v2.jsx, and unused onboarding presentation branches should receive an import/reference audit before archival or deletion. The active root is the cinematic-v3 implementation. Existing source files alone do not prove another UI is live.

### Handlers and downloads are not extra pages

/auth/callback; /api/lms/google-oauth/callback; /api/lms/canvas-oauth/callback; /api/canva/callback; /api/share-target; exports; and confirmation edge functions are actions/handlers. Design the visible pending, success, cancellation, and error result on the originating or destination page. Do not generate scenic callback pages merely because an endpoint exists.

Preserve the safe originating destination and actual connection status. Calendar connection, Classroom import, Canvas connection, and Canva permission must retain their own meanings. Never replace a true denied/unconfigured/pending response with a decorative Connected state.

## Image production and reuse requirements

1. Write one brief and asset manifest per approved master scene. This scope requests only NEW-01 and NEW-06 within the root plan's six masters.
2. Use coherent modern/traditional American campus architecture, matched daylight/materials, believable depth, and foreground quiet areas. No cathedral, stadium, trophy room, generic robot chamber, or unrelated stock study photo.
3. Compose a 4K landscape master and intentional desktop and phone treatments. A blindly center-cropped desktop scene is not adequate if it cuts out the useful environment or places busy windows behind the form.
4. Specify safe content zones, focal coordinates, responsive breakpoints, decoded dimensions, delivery format/width, file budget, and tiny fallback. Keep imagery in CSS/picture layers with solid readable form/content surfaces.
5. Add school identity and navigation in HTML/CSS, not into generated pixels. Avoid an image full of permanently green props that clashes when the student selects another valid school palette.
6. Diana's approved human appearance, if present, must match the established character and physically fit the room's light and perspective. An actor is not necessary in every room or on every system state.
7. Use existing approved product imagery where possible. Update demonstrative screenshots/posters from the actual current app using sample students, never private student data.
8. Optimize and inspect desktop/phone delivery before any visual approval. Verify that a correct 4K source is actually selected on high-density/large displays.

Higgsfield credits remain reserved for an exactly approved final render. This plan does not authorize paid drafts, variants, tests, retries, or batch generation. A future paid call requires its model, duration if relevant, resolution, reference inputs, output count and total cost reviewed before that exact render. Any claimed free/Unlimited web generation must satisfy the visible subscription, mode, and zero-credit checks in the repository instructions. Use local tools for iteration as required. Do not spend the old project-wide credit cap by inference.

## Recommended delivery sequence for this scope

1. **P0 shared entry and system foundations:** approved identity/control tokens, NEW-01 composition, SYSTEM fallback, truthful loading, valid-date/destination recovery, canonical public policy links, and the real account-recovery design.
2. **P0 account behavior:** signup/confirmation/recovery/change-password and session expiry, including verified email delivery and cross-device use. Keep private credential entry separate from public artifacts.
3. **P1 onboarding:** NEW-06, saved school look, optional profile photo, coherent two-step flow, honest provider availability, and useful Skip/Back outcomes.
4. **P1 installed/offline/recovery:** app icon/launch, offline static allowlist, local saved work, update/reconnect/conflict states, shared-device ownership and safe refresh.
5. **P1 public recipient and policy family:** readable reports, expiry/revocation, print, canonical policy/trust sources and destinations.
6. **P2 public story and specimen polish:** keep cinematic strengths, refresh true product captures, update the public sample Lobby wrapper, and audit obsolete implementations/references.

Each family is a reviewable unit. Finish its core page and every listed state before moving to the next family. Do not publish an isolated attractive default screen while its failure, phone, loading, or return states still use the old design.

## Per-family completion gate

- Page route, entry points, outgoing actions, dialogs, and return destinations are recorded.
- Idle, loading, empty, error, successful, denied/expired, and offline states are checked where applicable; no invented state or progress is displayed.
- Background is explicitly KEEP/REUSE/NEW/SYSTEM/NO scenic image. New artwork comes from the approved asset manifest, not ad hoc page-specific variants.
- Review 320px, 390px, 768px and 1440px layouts, high-density selection, 200% text, keyboard/focus, screen-reader names/status, contrast, reduced motion and image/font failure.
- Preserve IEP/accessibility typography, no shame/red/streak conventions, explicit student submission, and the tutoring golden rule.
- Preserve form values and owned drafts where appropriate; no cross-user identity or cached private-content leak.
- Test real optimized-runtime auth, persistence, email/provider return and production offline behavior. A mocked success or development-server service worker is not final proof.
- Capture desktop and phone previews for review. Public/demo artifacts contain sample data only. Private account verification uses minimal status/count evidence.
- Record what was actually tested, unresolved external prerequisites, image/source hashes and current deployment identity before claiming the family finished.

## Source audit limits

These findings establish current source wiring and planned acceptance work. They are not a new visual certification of every route, nor proof that every external provider or email delivery path is configured. Google remains separate from Classroom and its broader public rollout has external prerequisites. Legal copy changes require their own substantive review. Existing approved campus scenes should receive parity checks rather than an automatic redesign.


## Additional conditional desktop and brand surfaces

Two Electron wrapper surfaces exist outside App Router: native startup/backing color and the standalone launch-failure data HTML in `electron/main.cjs`. No shipped native channel is inferred. Match the campus launch/recovery identity, supply a compatible local window icon, keep developer commands in optional technical detail, and verify unavailable local server, external/OAuth handoff and safe return before desktop distribution. Preserve existing navigation and permission boundaries. No separate native settings/offline page or new scene is needed.

Global brand work also includes `app/icon.tsx`, `public/icons/diana-icon.svg`, `app/manifest.ts` and `app/layout.tsx` metadata. Align browser/install/maskable/shortcut/desktop icons and neutral launch color. Replace the old Today social-image reference with approved public sample imagery. Do not expose school identity or private content through public social previews.
