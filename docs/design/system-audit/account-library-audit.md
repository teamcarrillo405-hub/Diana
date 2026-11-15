# Account, Library, Support, and Main Hub Source Audit

Date: 2026-09-16. Workspace: `C:/Users/glcar/Diana`.

## Decision and Boundaries

**REVIEW PREVIEWS FIRST. Settings/Account is the first next preview family.** Extend the approved More menu language into its destinations before proposing any production presentation replacement. Preserve the existing business logic, data access, persisted settings, and intentional route retirement.

The audit phase was a read-only source review of the requested dashboard, classes, calendar, more, notes, proof, search, wellness, settings, me, sharing, parent-share, teacher-share, notifications, insights, and upgrade families. A subsequent user-authorized, local-only Settings concept was added strictly under `app/landing-3d/settings-concept-review/`; its scope and omissions are recorded below. No production presentation, business logic, data access, settings, or routing was changed. **This agent performed no browser or runtime visual verification.** "Live" below means current production-route source, not a verified running deployment. Main-owner browser observations are attributed separately below, not claimed as this audit's visual acceptance.

The main audit owns the full route census, generated JSON, rendered screenshots, and cross-agent reconciliation. Assignment/workspace, study, study-artifact, public/auth, public sharing-token, and other route implementations are not re-audited here. Their links and imported dependencies are noted only where needed to explain this scope. The five user-designated approved preview directories are comparison references, not proof that every fixture behavior is an approved product feature.

## Scoped Counts

| Unit | Count | Counting rule |
| --- | ---: | --- |
| Requested root families | 16 | Includes active and deliberately retired families. |
| Existing scoped `page.tsx` files | 23 | Includes nested class, note, and settings pages. |
| Policy-active page routes | 15 | Not retired by middleware; still subject to authentication, onboarding, and resource ownership. |
| Deliberately retired page routes | 8 | Middleware rewrites to a 404 before page code executes. |
| Primary view variants | 37 | V01-V37 below; route-level pages and primary tab/mode compositions. Not a count of every empty, pending, error, or responsive permutation. |
| Settings section keys | 11 | Ten distinct panel bodies: `learning` and `learning-loop` share one body. |
| Auxiliary scoped endpoint | 1 | Class mastery PDF export, not a screen. |
| Local loading boundaries | 4 | Dashboard, class detail, notes, proof; inherited application loading/error/not-found are additional shared states. |

The 37 variants deliberately count `/me` separately from `/settings`, and both learning section keys separately, because they have distinct navigation contracts. Hidden retained JSX and retired screens are recorded separately rather than inflated into the active screen count.

## Highest-Priority Findings

1. **Settings/Account is the next preview, not another More redesign.** The approved More reference already has Study tools, Record, Wellness, and Account groups. Current Settings uses a white notched outer frame, photographic classroom, pale form surfaces, and a separate rail treatment. This creates a source-level presentation discontinuity at `/me` and `/settings?...`. Retain its complete section map while previewing the approved studio/rail language.
2. **Retirement is intentional.** Do not revive insights, notifications, upgrade, parent-share, teacher-share, or the three settings subpages. In particular, `/settings?section=notifications` is active while `/notifications` is retired. Existing redirect functions in four retired files do not make them working aliases.
3. **A note detail page is not equivalent to all its retained JSX.** `note-detail.tsx:59` hides `.sd-note-detail-tools` with `display:none!important`. The Study tools subtree contains reading support, TTS, tags, transcript/outline, artifacts, visual learning, related notes, and deletion. Preserve these implementations, but do not call them currently visible or automatically reveal them in the redesign. Their future exposure needs a separate review decision.
4. **Settings labels overstate or duplicate some current bodies.** `learning` and `learning-loop` both mount `AdaptationPanel`; “Export & privacy” targets the same AI panel and email-export anchor, not a complete privacy dashboard. An unknown nonempty section leaves the workspace blank while the mobile section label falls back to Profile. These are source-backed contract issues to represent in previews, not authorization to change behavior now.
5. **`/me` has an ambiguous edit contract.** It passes `editable={false}`, suppressing the Save settings button and photo editor, but `ProfileCenter` still mounts the editable `ProfileCenterForm` with its submit handler. Do not model it as a proven read-only profile or add a new save behavior incidentally. Resolve the intended profile/edit boundary before migration.
6. **Some outgoing links lack a usable destination.** Search concept results are constructed as `/concepts/[id]`, whose prefix is retired. Proof showcase items link back to `#showcase`, not a detail screen, and the empty showcase instructs adding work without a create control. The More preview's saved-artifacts anchor is absent when the artifact list is empty. Record these gaps; do not restore retired routes or invent working detail screens.
7. **Preview state is not production truth.** Classes practice, calendar personal-event editing, Lobby sessions/achievements, and Work examples include fixture/local state. Importing whole preview components could replace real loaders, persistence, consent, and assignment semantics with demonstrations.
8. **Shared styling and components cross the preview/live boundary already.** `TodayStageLayout` is used by both the live dashboard and Today preview; Classes, Calendar, and More previews import Work's CSS module. Live navigation embeds forceful light-theme `!important` rules. A change made to “help the preview” can affect live screens or other approved previews.

## Route and Presentation Inventory

All routes below are not retired by student route policy. Shared auth rules remain in [the authenticated layout](C:/Users/glcar/Diana/app/(app)/layout.tsx:13): under-13 accounts leave the app and incomplete onboarding redirects to onboarding. Most signed-out private paths redirect to login, but `/me` is absent from middleware's private-route roots and is rewritten to the public 404 when signed out before its layout runs. It remains reachable in a signed-in session. Non-retired does not guarantee anonymous reachability.

| Variants | Route / primary views | Presentation owner and current composition | Embedded/query coverage |
| --- | --- | --- | --- |
| V01-V06 | `/dashboard`: Now, This Week, Upcoming, Check-In, Subjects, Milestones | [page loader](C:/Users/glcar/Diana/app/(app)/dashboard/page.tsx:20) -> [TodayDashboard](C:/Users/glcar/Diana/components/dashboard/today-dashboard.tsx:18) -> [TodayStageLayout](C:/Users/glcar/Diana/components/dashboard/today-stage-layout.tsx:24); dashboard CSS module, graphics, injected live check-in. Desktop stage/rail; mobile stacked panels. | `energy=low|medium|high` affects ranking, not an extra page. Plan/detail dialogs, weekly explanation, deadline groups, subject selection, milestone detail, check-in save/retry. |
| V07 | `/classes` | [page](C:/Users/glcar/Diana/app/(app)/classes/page.tsx:70) -> [MyClassesGrid / empty composition](C:/Users/glcar/Diana/app/(app)/classes/my-classes-grid.tsx:155); `CLASS_LIBRARY_STYLES`, notched photo/glass library. | Empty/populated; `create=1` adds `ClassForm` in either state; grades available/missing and assignment status summaries. |
| V08 | `/classes/[id]` | [page](C:/Users/glcar/Diana/app/(app)/classes/[id]/page.tsx:49) -> [CourseInsight](C:/Users/glcar/Diana/components/course-insight.tsx:105); imports Classes' shared inline style string. | Current work, grade/no grade, notes/no notes, quiz link, materials disclosure; `materials=1` or `rubric=scan` opens materials; missing class -> not-found. |
| V09 | `/classes/[id]/settings` | [ClassAiSettingsPage](C:/Users/glcar/Diana/app/(app)/classes/[id]/settings/page.tsx:80); local inline CSS, native radio form. | Full help / citations only / AI off; existing save action redirects back to class; missing class -> not-found. Not covered by settings-subpage retirement. |
| V10-V12 | `/calendar`: month, week, day | [StudyCalendarPage](C:/Users/glcar/Diana/app/(app)/calendar/page.tsx:98); route JSX, global calendar styles, local sync component. | `view`, `month`, `day`, legacy `week` month anchor; selected date, all-day and timed lanes, overlap positioning, agenda, assignment vs Google event links, connection/sync states. |
| V13 | `/more` | [MorePage](C:/Users/glcar/Diana/app/(app)/more/page.tsx:102); local `MORE_STYLES`, photographic notched glass frame, four destination cards. | Search, Record, Wellness, Sharing; account entry also comes from shared header. Current page has no four-category preview rail. |
| V14 | `/notes` | [NotesPage](C:/Users/glcar/Diana/app/(app)/notes/page.tsx:51); local light-theme overrides layered over inline token styles; `NoteSynthesisPanel`. | `q`, `tag`, `classId=<id>|general`; all/class/general scopes, results/no rows, contextual create link, synthesis chat and citation links. |
| V15-V18 | `/notes/new`: text, voice, audio, photo-pdf | [page](C:/Users/glcar/Diana/app/(app)/notes/new/page.tsx:12) -> [NoteEditor](C:/Users/glcar/Diana/app/(app)/notes/new/note-editor.tsx:121), `AudioUploadTab`, `DocUploadTab`; local route CSS plus global notes controls. | `mode`, optional `class`, optional `assignment`; invalid mode -> text, validated class preselection; capture/upload/record/transcription and autosave states. |
| V19 | `/notes/[id]` | [page](C:/Users/glcar/Diana/app/(app)/notes/[id]/page.tsx:12) -> [NoteDetail](C:/Users/glcar/Diana/app/(app)/notes/[id]/note-detail.tsx:77); editor plus class/synthesis rail, local inline CSS. | Body editing/save feedback, class reassignment, Ask Diana; not-found. Retained Study tools subtree is CSS-hidden, not another active view. |
| V20-V21 | `/proof`: Record, latest milestone | [ProofPage](C:/Users/glcar/Diana/app/(app)/proof/page.tsx:167), local `PROOF_STYLES`, `proof-state.ts`, SourceMedia. | `celebrate=latest` or `sdState=celebrate=latest`, only if eligible evidence exists; completed work, artifacts, showcase groups, empty states and stable anchors. |
| V22 | `/search` | [SearchPage](C:/Users/glcar/Diana/app/(app)/search/page.tsx:208), local `SEARCH_STYLES`, `SearchDirectoryResults`, support result builder. Desktop directory groups and mobile featured/recent results are separate markup. | `q`; `type=all|concepts|work|notes|classes|artifacts`; empty query, matches, no matches, directory-only matches. Type-filter UI is in the mobile header; retain query semantics across desktop redesign. |
| V23-V24 | `/wellness`: week, month | [page](C:/Users/glcar/Diana/app/(app)/wellness/page.tsx:11) -> [WellnessClient](C:/Users/glcar/Diana/app/(app)/wellness/wellness-client.tsx:23) and `wellness-dashboard.module.css`; framed summary and history. | Client-local view/range, recorded/no entry/partial records, null averages, retention-bound previous/next. This is history, not the live check-in entry form. |
| V25-V35 | `/settings` plus 11 section keys | [SettingsPage](C:/Users/glcar/Diana/app/(app)/settings/page.tsx:13) -> [ProfileCenter / SettingsShell](C:/Users/glcar/Diana/app/(app)/settings/profile-center.tsx:255); local style string and imported field owners. | Complete section matrix below; desktop rail/mobile disclosure, query aliases, hash targets, native and asynchronous form states. |
| V36 | `/me` | [MePage](C:/Users/glcar/Diana/app/(app)/me/page.tsx:11) -> the same `ProfileCenter`, with `editable=false`, default profile section, no email supplied. | Shared profile form remains mounted; Save/photo editor absent. Not a redirect and not a separate visual implementation. |
| V37 | `/sharing` | [SharingPage](C:/Users/glcar/Diana/app/(app)/sharing/page.tsx:28) -> [ParentSharingView](C:/Users/glcar/Diana/app/(app)/sharing/parent-view.tsx:5) -> [ParentDigestForm](C:/Users/glcar/Diana/app/(app)/parent-share/parent-digest-form.tsx:8). | Parent digest only: email, opt-in/off, pending, saved/error. `tab=parent|teacher` is not read by the current page; no active teacher tab. |

### Settings: Every Active Section

Authoritative section rail and conditional rendering: [profile-center.tsx](C:/Users/glcar/Diana/app/(app)/settings/profile-center.tsx:315). The profile section is the default for `/settings`; explicit `section=profile` is the same screen. An array-valued section uses its first value in the loader.

| Variant | Section / entry | Actual body and controls to retain | Required preview states |
| --- | --- | --- | --- |
| V25 | `profile` | `ProfileCenterForm`: display name, school year, timezone, learning hurdle, study schedule, AI consent. `PlayerPhoto`: upload, clear, reposition. External Save settings button targets `desktop-profile-center-form`. | No photo/photo, upload/position/remove feedback, edited/pending/saved/error; save button-to-form linkage; consent restrictions. |
| V26 | `appearance` | `ThemePicker`, `AccentPicker`, `LobbyBackgroundPicker`. Theme/accent providers and device-local background preference are separate from profile persistence. | Each existing theme/accent choice, current background selection, keyboard focus. Do not invent a new selection catalog. |
| V27 | `notifications` | `PushSettings` plus `PwaSettings`; Web Push is distinct from local PWA reminders and offline sync. | Push unsupported or missing key (currently omitted), off/on/blocked/working; installation eligibility, service-worker readiness, queued item counts, sync/reminders. |
| V28 | `accessibility` | `AccessibilityPrefs`: font size, line spacing, reading font, reduced motion, high contrast, TTS enabled/provider/voice/speed/pitch, bionic reading, visual pacing, line focus, letter/word spacing; provider-specific ElevenLabs controls. | Provider-specific controls, TTS off/on, changed/saving/saved, high contrast, all supported reading fonts and enlarged spacing. |
| V29 | `goals` | `GoalsPanel`, active goal list and new goal form: title/category/target/next step; loader fetches up to three active goals. | Empty/list, incomplete draft, pending, saved/error. No invented completion or deletion controls. |
| V30 | `learning` | `AdaptationPanel`, headed “Do the work”: learned summary, pause/resume, reset, last reset. | No learned summary/populated/paused/reset timestamp. Same underlying data and actions as V34. |
| V31 | `study` | One Flashcards row linking to `/study`. | Single link with focus/hover. Not a hidden collection of study preferences. |
| V32 | `ai` | `AiHistoryExport` email-export control only. AI consent itself is in Profile. | Idle/pending/success/error; `#ai-history-export` anchor. No history table, delete-account form, or tutor chooser in this body. |
| V33 | `connections` | Sanitized LMS status rows; when there are no connections, Canvas LMS and Google Classroom OAuth links. `IepImport` and `CanvaSection`. | No connections/pending/synced/attention/school-managed; IEP draft/import result/error; Canva unavailable/disconnected/connected/disconnect. Existing connected branch does not mount full LMS sync/disconnect UI. |
| V34 | `learning-loop` | Same `AdaptationPanel` as V30, headed “Learning loop”. | Preserve both URLs while presenting this duplication explicitly for review. |
| V35 | `sign-out` | Signed-in identity and `SignOutButton`. | Ready/pending navigation; use a sandboxed preview action, never a real sign-out. |

Additional settings address variants, not extra primary screens:

- `section=reading` aliases Accessibility without redirecting the URL.
- `section=ai#ai-history-export` is a second rail entry, “Export & privacy”; both AI rail entries can receive `aria-current` because selection compares only the section key.
- `section=connections#school-materials` targets the school-platform block. The More preview's “Learning supports” link points to the connections section without a supports-specific anchor.
- Unknown nonempty section keys, including an assumed `privacy`, `sharing`, or `tutor`, do not select a supported panel. Keep an invalid-section review case rather than silently treating them as available screens.
- Preserve sections even when a component is environment-dependent or returns no UI, such as unsupported push. Do not remove the user's notification settings because the separate notification-center route is retired.

### Deliberately Retired Routes

Authority: [student-route-policy.ts](C:/Users/glcar/Diana/lib/student-route-policy.ts:8) and [middleware.ts](C:/Users/glcar/Diana/middleware.ts:19). These are **404s, not functioning redirects**. Do not allocate standalone redesign previews or reconnect navigation to them.

| Route | Retained source/state evidence | Disposition |
| --- | --- | --- |
| `/parent-share` | Page declares `/sharing?tab=parent` redirect; digest form/actions are imported by active Sharing. | Redirect is intercepted. Preserve shared digest implementation. |
| `/teacher-share` | Page declares `/sharing` redirect. `teacher-portal-client.tsx` contains assignment creation/policy, analytics, roster, progress notes, accommodation confirmation. | Redirect is intercepted. Teacher surface is not mounted by current Sharing; do not revive. |
| `/settings/goals` | Page declares `/settings?section=goals` redirect. | Intercepted; V29 is the actual active screen. |
| `/settings/ai-history` | Page immediately redirects to retired `/export#ai-history-export`; retained list with `q`, `actor=student|diana`, selected `entry`, export and entry deletion follows unreachable code. | Retired. The list is unreachable even without middleware retirement. Active AI panel is email export, not this UI. Preserve action dependencies where still imported. |
| `/settings/tutor` | Retained gallery/playbook views, persona, style, complexity, saved/error feedback; `view` and `sdState` selectors. | Retired. Do not invent a tutor settings destination in Account. |
| `/notifications` | Due-work priority, coming-up rows, teacher feedback, LMS updates, empty case. | Retired. Notification preferences remain V27. |
| `/insights` and descendants | Retained 7/28-day metric controls, focus/work/activity evidence, charts and evidence links. | Retired prefix. Lobby Progress and Wellness are not authorization to re-enable analytics routes. |
| `/upgrade` | Standard/community views via `view` or `sdState`; billing enabled/unavailable branches. | Retired. No preview checkout calls or new purchase funnel. |

The [class mastery export handler](C:/Users/glcar/Diana/app/(app)/classes/[id]/mastery/export/route.ts:1) remains a separate PDF response endpoint. It is not a page, and a missing visible link does not establish that the endpoint is dead.

## Embedded, Responsive, and Retained States

This checklist supplements V01-V37; it is intentionally not multiplied into a combinatorial “screen count”. Visible, conditional, CSS-hidden, and unmounted source are different categories.

| Family | State inventory and visibility notes |
| --- | --- |
| Today | Six desktop panels; mobile stacks the same content. Plan available/empty/unavailable; capped plan with View all; week totals available/unavailable; upcoming/earlier/ready-to-submit/empty; subject totals and selected subject; earned/unearned/unavailable milestones. Native dialog variants: full plan, upcoming list, progress explanation, milestone record. Check-in choosing/saving/saved/error with energy, explicitly recorded sleep, movement, and retry. Focus restoration, inactive-panel `inert`, and breakpoint focus transfer belong to `TodayStageLayout`. |
| Classes | Empty/populated roster with create form closed/open; class name/teacher/color, validation/pending/error. Detail: active work empty/populated, grade available/unavailable, notes present/absent, quiz with/without source. Materials closed/open, rubric/syllabus missing/saved, upload/remove/pending/error, signed attachment link unavailable. Rubric shortcut tile is CSS-hidden in `course-insight.tsx:67`, but the actual materials disclosure remains rendered. |
| Calendar | Month grid, week timeline, day timeline; selected date, adjacent period/today navigation, no selected-day items versus fallback agenda; all-day events and timed overlaps. Assignment and Google-origin rows keep different actions. Google connect available/unavailable; connected idle/syncing/done/error. Current Add route goes to work capture rather than the preview's personal-event persistence feature. |
| Notes library | All/class/general filters, tag and text combinations, no rows/results; existing empty rows omit the notes-list section. Synthesis empty conversation/pending/error/answer with citations. Exclusion of `grayson-demo` tagged records is data behavior, not a styling choice. |
| Note capture | Four modes, general/class/assignment context, draft/autosave pending/saving/saved/offline-error. Record idle/recording/uploading/ready/transcribing/done/too-short/error plus permission/device problems. Photo/PDF idle/HEIC conversion/uploading/processing/structuring/done/too-short/error and warnings. Transcript return changes mode back to text. Done flushes pending save before navigation. |
| Note detail | Active editor/class selector/synthesis rail and save status. **Hidden retained** Study tools: artifact generation, selection-to-card, manual/suggested tags, accessible reader, TTS/vocabulary/annotations/reading-level adapter, lecture action items, transcript/no transcript/structure generation, outline, four visual modes, diagram upload/annotation, related notes, delete confirmation. Preserve code and contracts; explicit exposure decision needed. |
| Record | Completed work empty/populated; artifacts conditional; showcase empty/grouped by week. Milestone branch requires requested mode plus real qualifying evidence; otherwise normal Record. Authorship receipt present/absent affects milestone copy. Keep normal Record anchors even if the preview reorganizes content into tabs. |
| Search | No query differs by responsive markup: desktop prompts for a search, mobile can show loaded featured/recent results. Six type filters, grouped data matches, directory-only results, no matches. Do not let desktop/mobile redesign change result construction or falsely repair concept links by reviving retired routes. |
| Wellness | Week/month with separate date windows, prior/next bounds, recorded/no entry, partial sleep/energy/movement, null summary values. Monthly check-in percentage and year-to-date averages use different denominators. Three-month detail and yearly archive semantics must remain distinct. No current wellness capture form. |
| Settings/Account | All section states in the matrix; desktop full rail and mobile disclosure; profile/no photo, form linkage, save messages, provider-specific accessibility controls, environment-dependent integrations, preference changes and account operations. `/me` is a duplicate presentation owner with an unresolved edit affordance. |
| Sharing | Digest disabled/enabled; email absent/invalid/valid; pending/saved/error. Weekly summary remains opt-in and student-controlled, with the existing no-grades/no-AI-chat disclosure. No current teacher tab, share-token manager, or artifact-specific sharing action in this screen. |
| Shared boundaries | Four scoped `SmartLoading` wrappers plus inherited app loading; app error retry/back-to-Today and resource not-found via `DianaRecoveryScreen`. Keep calm copy, amber failure feedback, reduced-motion behavior, and accessible focus. Main audit owns rendered boundary screenshots. |

### Duplicate and Unmounted Presentation Flags

- **Old dashboard tree:** current `/dashboard` imports `components/dashboard/TodayDashboard`, not `dashboard/lobby-dashboard.tsx`. The latter imports `today-dashboard-panels.tsx` and `LobbyPageBackground`; do not redesign it as the main live hub. Several older cards, including DueCards, NeedsAttention, GradeMoveCard, MoodCheckIn, EveningPlanning, and WeeklyReflection, have no active non-test `app`/`components` importer found in the source search. This is an unmounted-source flag, not permission to delete actions or models.
- **Background preference mismatch:** `LobbyBackgroundPicker` still writes `diana-lobby-bg` and imports constants from the old background module; the active `TodayStageLayout` takes a fixed image prop/default and does not consume that preference. Only one background key is currently defined. Preserve the stored value; do not claim that the new preview has implemented a live preference effect.
- **Teacher tree:** `sharing/teacher-view.tsx` imports `TeacherPortalClient`, but current Sharing imports only ParentSharingView. Its comment about a Teacher tab is stale relative to current composition.
- **Settings legacy modules:** `LmsConnections` and `SharingSection` have no active non-test `app`/`components` importer found. Their richer sync/disconnect and link-create/copy/revoke tools are not the visible connections/digest controls. `PrivacyDashboard` is likewise not the body of Export & privacy.
- **Class mastery:** `mastery-panel.tsx` has no active page importer found; its PDF endpoint still exists. Do not conflate UI reachability with endpoint availability.
- **Do not delete by directory:** active Sharing depends on code under retired `parent-share`; active AI export imports `export/actions.ts` although the old export page is retired. Retirement of a route does not imply retirement of every module below that directory.

## Approved Preview Comparison

| Reference and source owner | Source-level design contract | Live mismatch / extension rule |
| --- | --- | --- |
| [today-now-assets/page.tsx](C:/Users/glcar/Diana/app/landing-3d/today-now-assets/page.tsx:26) -> [TodayDesignPreview](C:/Users/glcar/Diana/app/landing-3d/today-preview/today-design-preview.tsx:72) | Enables motion/composition/assets/lobby review together. Actual consolidated modes are Now, Progress, Achievements, with check-in embedded in Now and subject mix in Progress. Signature background config, character media, launch/detail/session feedback, motion/audio controls. | Live Today still has six modes and a fixed stage image. Preserve all live information when consolidating: do not lose Upcoming/earlier/ready-to-submit, subject breakdown, or check-in. Character relit assets and access gates are local-review concerns, not deployment-ready proof. |
| [WorkConceptReview](C:/Users/glcar/Diana/app/landing-3d/work-concept-review/work-concept-review.tsx:52) and [base CSS](C:/Users/glcar/Diana/app/landing-3d/work-concept-review/work-concept-review.module.css:1) | Default franchise layout plus carousel alternative; status/date selection, search/subject filtering, assignment brief, material disclosure, saved-progress marks, launch preview. Shared studio bitmap, dark neutral base, pink selection, violet command, mint progress; Saira condensed headings, Lexend body, Barlow metadata. | Reference for density, rails, selection, lists and detail hierarchy only. No live Work route audit here. The source still includes an alternative concept; do not infer that both layouts should migrate. |
| [ClassesConceptReview](C:/Users/glcar/Diana/app/landing-3d/classes-concept-review/classes-concept-review.tsx:91) | Selected course lineup plus course profile; Overview, Assignments, Notes & Materials, Practice; search/status/type filters, detail dialogs, local practice feedback/completion. Imports Work base CSS. | Live Classes is a card grid with a separate CourseInsight route and material forms, not one fixture-backed roster. Preserve route IDs, create-class entry, real grades, attachments and AI-rule route. Class detail dialogs do not replace assignment workspace ownership. |
| [CalendarConceptReview](C:/Users/glcar/Diana/app/landing-3d/calendar-concept-review/calendar-concept-review.tsx:39) | Schedule/Week/Month, date strip, due-today lane separate from scheduled events, selected event details. Personal event add/edit/delete, repeats/reminders/conflict notices are local preview state. Imports Work base CSS. | Live calendar defaults to Month and uses server query navigation, real assignments and Google events. No matching production personal-event write flow was identified in scoped UI. Preserve event provenance, duration/overlap logic and sync. A new label or editor must not imply a shipped backend. |
| [MoreConceptReview](C:/Users/glcar/Diana/app/landing-3d/more-concept-review/more-concept-review.tsx:10) and [destinations](C:/Users/glcar/Diana/app/landing-3d/more-concept-review/destinations.ts:13) | Four rail categories: Study tools, Record, Wellness, Account; 15 destination links plus search form. Open row layout, selection-brush asset, no large white notched container. Imports Work base CSS. | Current More has four cards, not the reference IA. Extend the existing approved menu language to Settings/Account first. Keep section/query/hash contracts; study/flashcard/artifact destinations belong to the other audit agents. |

Source-local preview guards must remain intact: Work, Classes, Calendar and More require loopback, reject Vercel, and require development or local QA allowance. Today has its own development/local-QA and relit-host checks. Preview links sometimes leave for live routes, so a new Account preview must isolate mutation controls rather than rendering live forms with live server actions.

The desired Madden influence is **menu hierarchy, immediate selection feedback, a consistent environment, clear current context, and focused detail**, not competitive pressure. Retain no-shame/no-streak language, truthful progress and explicit submission. Avoid carrying legacy all-caps microcopy, tiny type, large nested cards, or arbitrary sports vocabulary into accessibility, consent, and privacy forms.

## Presentation Ownership and Migration Boundaries

| Layer | Current owners | Migration boundary |
| --- | --- | --- |
| Shared shell and type | [root layout](C:/Users/glcar/Diana/app/layout.tsx:3), global CSS, tokens, ScreenDesign CSS; [authenticated layout](C:/Users/glcar/Diana/app/(app)/layout.tsx:13), profile body classes | Do not change auth/onboarding, theme/accent providers, analytics, session handoff, PWA runtime, or profile-class application to restyle screens. |
| Navigation | [StudentDesktopNav](C:/Users/glcar/Diana/components/screen-design/student-desktop-nav.tsx:15), [StudentBottomNav](C:/Users/glcar/Diana/components/screen-design/student-bottom-nav.tsx:14), [navigation policy](C:/Users/glcar/Diana/lib/navigation.ts:7) | Five canonical destinations are Today, Work, Classes, Calendar, More. `ownsScreenDesignNavigation` also controls shared floating utilities. Preview Lobby naming is not a route rename. |
| Today presentation | `components/dashboard` CSS, stage layout and graphics; route-local check-in; route layout's scoped reset | Shared stage code is used by the approved preview too. Prefer a preview-scoped presentation layer for review; no global CSS rewrite now. |
| Class presentation | `my-classes-grid.tsx` exports `CLASS_LIBRARY_STYLES` used by CourseInsight; class AI settings owns another style string | Keep one future family treatment for roster, detail, materials and rules, without merging their loaders/actions. |
| Secondary pages | Route-local inline CSS plus global ScreenDesign rules for More, Calendar, Proof, Search, Sharing and note capture/detail; Wellness has a CSS module | Trace final overrides rather than judging the first legacy navy declaration. Consolidation is future scoped work, not an audit edit. |
| Account presentation | `ProfileCenter` owns rail, frame and section selection; field components own interaction; `ProfileCenterForm` owns form submission | New preview should use typed fixture values and inert/mock callbacks, not import mutation-bearing forms unchanged. Future integration must retain field names, defaults and server-action validation. |
| Preview dependencies | Classes/Calendar/More consume Work's module; Today consumes live `TodayStageLayout` | Existing previews are interconnected. Coordinate any shared-preview change with the main owner; do not adjust all approved references while reviewing Account. |

## Concrete Screen-Family Mapping and Order

This is the recommended **review order**, not an implementation authorization. The new preview names below are proposals only; no preview route was created.

| Order | Family and coverage | Concrete preview treatment | Acceptance decision before any live migration |
| ---: | --- | --- | --- |
| 1 | **Settings/Account**: V25-V36 | Proposed Account concept review derived from More's shared studio and vertical selection rail. Keep Personal/Diana/School/Account grouping; compact section heading, one unframed form workspace, field rows, discrete save/status area. Native selects, switches/checkboxes, swatches and sliders; photo upload secondary. Include all 11 section keys, aliases/anchors, and the `/me` composition. Mobile becomes a compact section selector and full-width form, not a compressed desktop rail. | Review Profile, Accessibility, Connections and Notifications first as the highest-risk forms; then Appearance, Goals, both learning entries, Study, AI export and Sign out. Decide `/me` edit semantics and duplicate labels without dropping settings. |
| 2 | **Sharing**: V37 | Same account shell and readable consent form; parent email, opt-in switch, explicit save and status, factual disclosure. Keep the scene secondary to recipient/privacy controls. | Approve digest-only presentation; no teacher-tab or share-token revival. Mock save only. |
| 3 | **Notes library and capture**: V14-V19 | Classes Notes & Materials row vocabulary for library; restrained Work-style contextual rail for class/general scope. Dedicated wide editor with persistent capture-mode tabs and compact save/upload feedback. Right-side context becomes stacked content on mobile. | Review four capture modes, offline/error feedback and a separate labeled inventory of hidden tools. Decide which hidden tools should ever be exposed; do not silently add them. |
| 4 | **Record and milestone**: V20-V21 | More Record grouping plus Classes' record rows; Completed work, Saved artifacts, Showcase as clear sections or reviewed tabs. Reuse Lobby achievement detail language for a real-evidence milestone; source-backed artifact and authorship metadata remain explicit. | Decide showcase detail/create affordances and empty-artifact anchor behavior. Do not fabricate a submitted state or publish/share action. |
| 5 | **Search**: V22 | More's search control above a dense results list; Work/Class filter vocabulary; one coherent hierarchy for data results and Pages/tools across desktop/mobile. Use actual content labels rather than arbitrary biology/economics imagery on unrelated results. | Review all six types, empty query, no results and long labels. Resolve retired concept-link handling through the main route owner, without restoring the route. |
| 6 | **Wellness history**: V23-V24 | Calendar date/range controls plus Lobby Progress typography; modest summary band and legible week rows/month cells. Missing values remain neutral; no streaks, rankings or implied diagnoses. | Preserve three-month detail/yearly summaries and current read-only role. Any new capture flow is out of this visual migration. |
| 7 | **Class adjuncts**: V07-V09 states | Extend approved Classes reference with class creation, real-material upload states and a compact class-rule form using the Account control system. Preserve class route and Back to class context. | Require preview coverage of empty roster, no grade, absent/expired attachment link, save/upload error and all three AI modes. Do not replace signed documents with fixture resources. |
| 8 | **Existing main-hub parity pass**: V01-V13 | Reconcile current Today six-mode content with approved Lobby three-mode composition; current class roster/detail and calendar modes with their approved references; More routes with destination previews. | Main owner coordinates the approved hub previews and screenshots. This agent does not recreate Work or other assigned routes. No live promotion until source contracts and visible review are separately accepted. |

Account preview sizing should be fixed/readable rather than viewport-scaled: compact display headings, normal-case Lexend field labels/body, zero tracking, 44px-class interaction targets, small-radius controls, and no form section nested inside another decorative card. Borrow the selection brush only for the active rail item; use neutral form surfaces and clear status text, with pink/violet/mint as limited functional accents. Retain user-selected fonts, spacing, high contrast and reduced motion over ornamental theme choices.

## Business and Data Contracts to Preserve

| Contract | Preserve during a later approved integration |
| --- | --- |
| Dashboard recommendations | Keep `rankAssignments`, effective-time adjustments, diagnoses/extra-time, mood/readiness/sleep adaptation, last-class cookie, timezone/week boundaries, and independent query-unavailable flags. Preview plans or local timer totals must not replace `buildTodayView` data. |
| Completion and achievements | `done` is not `submitted`; all real transitions remain with existing owners. Record milestones require evidence; achievements must not be manufactured from selection clicks or local demo counters. |
| Class and calendar data | Owner/RLS constraints, final-grade provenance, rubric/syllabus storage and signed URLs, assignment links, effective-minute adjustments, event origin, duration/all-day/overlap calculations, and Google connection/sync behavior. Preview Pacific-time fixtures are not the live timezone contract. |
| Note creation and learning | Existing row creation before upload, class/assignment associations, autosave/offline queue, flush-before-Done, upload limits/HEIC conversion, media cleanup, transcription/structure lifecycle, citations and underlying AI safety/consent checks. Keep AI calls at existing server/Edge Function boundaries. |
| Profile and access | Form fields/defaults/validation, age-sensitive consent, photo storage/offsets, profile prefs and provider values. Separate device-local theme/background/reminder state from persisted profile fields. Do not reset hidden controls on section navigation. |
| School integrations and accommodations | Sanitized LMS view models, credential/OAuth boundaries, integration capability states, IEP extra-time/reading changes, learning-loop pause/resume/reset and existing server-side validation. Canva is not Canvas LMS. |
| Sharing and exports | Student-controlled digest recipient and enabled state; no broadened sharing, real email, token creation/revocation, export request, account sign-out or checkout from review previews. Keep active form/actions under retired directories available. |
| Wellness privacy | Existing `maintainWellnessHistory` call and archive/detail rules. A request that appears read-only can perform retention work; do not mount the live loader in a fixture preview or change this behavior during styling. |

## Key Migration Risks and Handoff

- **P1: Incidental production mutation from a preview.** Reusing live `ProfileCenter`, Goals, IEP, push, digest or export controls would execute real actions. Build review fixtures with explicit mock behavior and no live data loader, notification permission prompt, microphone capture, email, sync or payment call.
- **P1: Lost settings or weakened accessibility.** High-specificity type/color overrides can defeat profile-selected reading preferences; fewer rail entries can hide persisted controls. Keep a field-by-field parity checklist and verify visual preferences during the main owner's later screenshot review.
- **P1: Retired routes accidentally restored.** Do not “repair” redirect files or links by relaxing middleware. Surface dead-link decisions to the main audit and keep retirement as an acceptance invariant.
- **P1: Incorrect ownership and demo-data promotion.** Old Lobby code is not the live dashboard; hidden/unmounted components are not active screens. Calendar personal events and local practice/session demonstrations require separate product/integration decisions, not a CSS replacement.
- **P2: CSS/nav coupling.** Shared inline header `!important` rules, page-level `:has()` resets, viewport wrappers and preview CSS dependencies can produce mixed themes or hidden controls. Keep preview-only roots and avoid changing shared live components for this review.
- **P2: URL and state loss.** Preserve settings query keys/hash targets, class material queries, note context/filter parameters, calendar period URLs, proof celebration selectors and browser back behavior. Do not treat client tabs as interchangeable with server-selected pages.
- **P2: Misleading empty/error/data labels.** Missing rows do not always have explicit load-error handling; no grade is not zero; no wellness entry is not poor performance; showcase rows currently do not open details. Keep these distinctions in review fixtures without claiming new functionality.
- **P2: Responsive and focus regressions.** Today uses 761px stage behavior while shared desktop navigation commonly starts at 901px; other previews have their own compact breakpoints. Cover intermediate widths, long values, enlarged text, rail keyboard navigation, focus after modal close, and reduced motion.

For the main owner's rendered review, cover desktop, intermediate-width and narrow-mobile Account first, including enlarged reading text, high contrast, reduced motion, no photo, integration unavailable, validation feedback and long-name cases. Real save-error handling remains an integration requirement, not simulated server behavior in the preview. Then capture the remaining family states above. Screenshots and runtime checks are owned by main, not performed by this audit agent.

Source inspection and scoped counts are complete. Business-logic correctness, deployed reachability, computed CSS and visual acceptance have not been runtime-verified by this agent. The subsequent preview's focused test boundary and external verification status follow.

## Bounded Settings Concept Handoff

Review URL: `/landing-3d/settings-concept-review`. This is a local design preview with a visible **DESIGN PREVIEW / SAMPLE SETTINGS** banner. It cannot save an account, upload files, request notification permission, connect a service, export email, or sign out. It imports no production actions, Supabase clients, auth controls, or live settings components. Existing Work CSS and approved local bitmap assets are reused read-only; all overrides are local to the new preview.

### Navigation Decision

**Ten visible sections preserve all eleven live query keys.** `learning` and `learning-loop` resolve to one visible **Do the work** panel, subtitled Personalization. This avoids duplicating the same body in the menu. `reading` resolves to Accessibility. These are preview-only alias decisions; live routing and middleware are unchanged.

| Live query entry | Preview panel |
| --- | --- |
| `profile` | Profile |
| `appearance` | Appearance |
| `notifications` | Notifications |
| `accessibility`, `reading` | Accessibility |
| `goals` | Goals |
| `learning`, `learning-loop` | Do the work / Personalization |
| `study` | Study |
| `ai`, `ai#ai-history-export` | AI & integrity; Export & privacy opens the same email-export review |
| `connections`, `connections#school-materials` | Connections & IEP, with school-platform anchor |
| `sign-out` | Sign out, sandbox no-op |

The source inventory stays at 37 variants because it counts live entry contracts, not the preview's consolidated rail. Unknown preview keys fall back to Profile; this is deliberately not a fix to the live blank-section behavior. Existing anchors remain available. Keyboard arrows, Home and End move selection and focus together. Inactive panels stay mounted, hidden and inert so section switches retain drafts. Mobile uses a horizontal rail. At the detail-stacking breakpoint (1240px), explicit Review clicks focus and scroll to detail; Back to selected option restores the exact triggering control. Hover and field focus never initiate scrolling.

### Contract Fidelity and Deliberate Omissions

| Area | Represented and bounded behavior |
| --- | --- |
| Profile | All six actual field contracts and choices: name, school year 6-16, timezone, learning hurdle, study schedule and AI consent. Sample Grade 10 identity; under-13 consent restrictions are not a separate fixture. Photo upload, removal and positioning are review-only, with no file input. Name/timezone validation is local; timezone recognition is stricter than the current nonempty server-string schema. |
| Appearance | Existing theme and five accent choices retained. Theme changes only the preview root; color appears only in the functional selected swatch demonstration. Reading-sample separator is neutral. The live one-option background picker is a review row, not another asset catalog or device-storage write. |
| Accessibility | All existing preference keys represented, including provider-specific voices, exact speed/pitch presets, custom ElevenLabs voice ID, reading font, size, spacing, contrast, motion, bionic reading, pacing and focus. Provider changes preserve the live default-voice reset rule. Applied font size, line/word spacing and bionic emphasis affect the reading sample; theme, contrast and motion affect the preview root. Letter spacing, line focus and animated pacing are retained draft values, not full reader implementations. No speech is played; font availability/fallback needs rendered review. |
| Preference ownership | Live Profile uses explicit submit; Accessibility auto-commits individual values and custom voice on blur; theme/accent/background and PWA behavior are device/provider-specific. Preview intentionally uses one reversible local Apply snapshot and does not claim those live mechanisms are interchangeable. Preserve the distinctions during integration. |
| Notifications | Web Push and local PWA reminders remain separate sample toggles. Unsupported/blocked/working permissions, install eligibility, service-worker readiness and sync queues are explained in review details, not executed or exhaustively simulated. |
| Goals | Existing title/category/target/next-step model; exact skill, consistency and recovery categories. Adding a sample goal stages it locally and supports global Undo/Reset. Goal-entry text survives navigation but is a separate composer draft until Add sample goal; global Apply/Undo/Reset do not act on unsubmitted composer text. Simplified one-line text controls/200-character limits differ from live title/textarea limits. No completion, deletion or real save. |
| Do the work | One shared pause/resume sample state and sample learner summary. Reset learned history is review-only; no history is deleted. No-learned-data and last-reset timestamp variants are documented but not separate fixtures. |
| Study | The revised Settings and More previews show one **Quiz** entry linking to `/landing-3d/remaining-concept-review/study`; More no longer presents Flashcards and Study artifacts as separate menu choices. The local destination selects assignments and carries the selection through a three-question quiz. Canonical saved-artifact and FSRS review continuation remains unresolved in the work audit, and the production data model is unchanged. The preview introduces no Study preferences. |
| AI & integrity | Email-export review only. No actual export, email, history editor, privacy score, account-health score or new privacy/deletion functionality. AI consent stays in Profile. |
| Connections & IEP | Sample Canvas LMS, Google Classroom, Clever and Canva statuses plus reviewable illustrative scopes; empty-connection fixture. Scopes describe the sample, not an OAuth grant manifest. Canvas LMS is distinguished from Canva design tools. IEP name/text drafts persist across tabs; the result is explicitly fixed/illustrative, not parsed or imported. IEP composer text and connection-fixture selection are not account preferences and are outside global Apply/Undo/Reset. No OAuth, sync, disconnect, upload or accommodation update. |
| Sign out | Sandbox message only; real session and location remain unchanged. |

Apply says **Applied to preview**, never server-saved. Draft Reset restores the last applied preview snapshot and can itself be undone. Undo retains up to forty draft snapshots. No local/session storage writes are used, and reload returns to sample defaults. No new privacy, sharing, scoring or study product behavior is introduced.

### Exact Owned Files

- `docs/design/system-audit/account-library-audit.md`
- `app/landing-3d/settings-concept-review/page.tsx`
- `app/landing-3d/settings-concept-review/fixtures.ts`
- `app/landing-3d/settings-concept-review/settings-concept-review.tsx`
- `app/landing-3d/settings-concept-review/settings-concept-review.module.css`
- `app/landing-3d/settings-concept-review/page.test.ts`
- `app/landing-3d/settings-concept-review/settings-concept-review.test.tsx`

### Verification Boundary

Focused command, no whole-suite or build:

```powershell
node node_modules/vitest/vitest.mjs run app/landing-3d/settings-concept-review/page.test.ts app/landing-3d/settings-concept-review/settings-concept-review.test.tsx --maxWorkers=1
```

Tests cover local-only route gating/no-index metadata, all eleven entry keys and aliases, query arrays, mounted hidden/inert panels, keyboard focus, draft preservation, Apply/Undo/Reset, validation, TTS provider behavior, scoped visual preferences, sample connections/export/sign-out, accurate Study link, and click-only compact detail focus/return. Static boundary assertions exclude live actions/auth/data imports, network operations and browser-storage writes.

Main reported an earlier revision passing **33 tests in 2 files**, plus browser checks for local Apply, Reset, keyboard focus, draft preservation, one active panel/inert others, asset loading, no overflow at 320/390/834/1440/1920 widths and zero animations under reduced motion. Main also identified native-input CSS leakage, corrected here with scoped checkbox/radio resets. Four additional compact-detail cases bring the final defined suite to **37 tests**; this agent's targeted run was blocked before execution by sandbox `spawn EPERM`. Main owns the final rerun and typecheck. The reducer discriminant and unsupported Testing Library `exact` options have been corrected; broad typecheck was not duplicated here.

The compact detail handoff, final checkbox styles and final consolidated revision still require main's final rendered validation. **No runtime visual verification was performed by this agent.** Keep preview approval separate from permission to migrate production.
