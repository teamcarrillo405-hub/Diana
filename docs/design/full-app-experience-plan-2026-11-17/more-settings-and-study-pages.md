# More, Settings, Notes, Study and Record: page update plan

Source audit date: November 17, 2026. This document is a source-grounded implementation plan, not a claim that every listed state has been visually retested in production. It preserves the approved Lobby, Work, Classes and Calendar direction and the recently verified Google connection and navigation behavior.

Scope: authenticated secondary pages, every Settings section, learning/practice descendants, sharing and access screens, restricted staff tools, and their legacy aliases. No application code, live data, credentials or external settings were changed by this audit.

## 1. What needs attention first

The remaining pages are not starting from the same design foundation as the four primary tabs.

- Most More destinations and Settings pass `active="More"` to `StudentShell` without `campus`. They inherit the legacy Diana portrait/studio environment, older logo presentation and accent treatment.
- The default shell environment is `/assets/today-now/diana-signature-studio-v1-1678.webp`, with a separate 1280px mobile source. This is a current fallback, not the proposed image for every remaining page.
- Campus scene selection is currently coupled to the active navigation label: Classes selects the Classes room, Calendar selects Calendar, and other campus scenes fall back to Work. More cannot yet select a Library or Student Services room independently.
- More still hardcodes a pink `#bd086f` selected brush and violet `#8622ed` search action. Settings uses a pink clipped selection and violet selected/submit controls. Collection, Notes, Quiz and support styles retain other fixed pink/violet values.
- Some detail and practice pages omit the navigation profile, so the avatar falls back to an initial instead of maintaining the same student identity throughout the flow.
- Secondary pages contain useful tools but need clearer priority, larger supporting text, reliable return context, and the same school-color and brush rules.

These are verified source findings. They are design and consistency gaps, not an assertion that every control currently has a runtime defect.

### Foundation work before individual page redesign

1. Separate scene identity from navigation identity. A page can keep More selected while using the Commons, Library, Seminar or Student Services scene.
2. Define shared browsing, reading/writing and focused-task treatments. The same room can remain visible at the edges while a form, document or question uses an opaque surface.
3. Use the student's two school colors as the main accent authority. Preserve light/dark/device and accessibility preferences without letting an unrelated color picker silently override the school palette.
4. Reuse the approved DIANA wordmark, heading hierarchy, brush selections, boundaries, button treatment, mobile navigation and profile identity.
5. Keep ordinary reading text readable and calm. The campus/game theme belongs in the environment and navigation; it does not justify points, streaks, ranks, reward packs or victory screens.

Source references: [StudentShell](C:/Users/glcar/Diana/components/student-shell/student-shell.tsx), [shell CSS](C:/Users/glcar/Diana/components/student-shell/student-shell.module.css), [navigation CSS](C:/Users/glcar/Diana/components/screen-design/student-navigation.module.css), [section tabs](C:/Users/glcar/Diana/components/student-shell/section-tabs.module.css), [collection CSS](C:/Users/glcar/Diana/components/student-shell/collection.module.css).

## 2. Shared background assignments

Use the master scene IDs in the main plan. Do not commission an image for every route or state.

| Master | Secondary uses | Treatment |
|---|---|---|
| NEW-02 More Commons | More, Search | Student-center wayfinding/commons scene, with clear negative space behind navigation and search results. |
| NEW-03 Notes Library | Notes library, new note, note detail | Library study alcove. Dim or suppress the scene behind the actual editor, transcript and reading surface. |
| NEW-05 Study Seminar | Quiz hub, saved practice, recall, study guides, practice questions/results | Quiet seminar/tutoring room. Questions, answers and long text remain on opaque work surfaces. |
| NEW-06 Student Services Office | Settings, Sharing, staff review perimeter; shared with onboarding as specified in the entry plan | Private advising/support office, not a medical clinic. One coherent family across sections, not ten new room images. |
| NEW-04 Quiet Courtyard | Check-in history / Wellness header | Calm campus courtyard only at the header or perimeter. Charts and daily records have plain, readable surfaces. |
| KEEP-03 Classes Hall | Record / completed-work overview | Reuse the approved academic hall. Avoid trophies, achievement walls and ranking visuals. |
| Originating approved Work/Classes scene | Shared assignment-material readers entered from Work or a class | Keep the source context; do not make a document reader feel like an unrelated location. |

For all new masters: 4K desktop source plus an intentionally framed phone composition/crop; blank space for live UI; no baked-in school name, logo, menu, chart or button. Apply school colors and campus name in code. Keep the school logo in the approved Lobby banner placement. Do not add a large foreground tutor to every work page. Use the approved tutor identity consistently wherever a portrait is needed.

## 3. Current More navigation

| Category | Current destinations |
|---|---|
| Study tools | Notes `/notes`; Quiz `/study` |
| Record | Completed work `/proof`; Saved practice `/study?view=saved` |
| Wellness | Check-in history `/wellness`; Goals `/settings?section=goals`; Learning supports `/settings?section=learning` |
| Account | Settings `/settings`; Sharing `/sharing` |
| Search | `/search?q=...` from the Study tools panel |

Saved practice is linked from More, Quiz and Record. Keep one canonical saved-practice surface and make the extra entry points clearly contextual. Do not delete saved artifacts to simplify navigation.

Source references: [More destinations](C:/Users/glcar/Diana/components/student-shell/more-destinations.ts), [MoreMenu](C:/Users/glcar/Diana/components/student-shell/more-menu.tsx), [More styling](C:/Users/glcar/Diana/components/student-shell/more-menu.module.css).

## 4. Page-by-page update scope

### More: `/more`

- Current states: Study tools, Record, Wellness and Account panels; Search; selected and unselected categories; keyboard arrow/Home/End navigation; compact phone tabs.
- Update: opt into the shared campus shell and NEW-02; use the school palette and approved brush rather than fixed pink; retain the same DIANA brand and account identity; make the small-screen category labels and destination rows readable without horizontal clipping.
- Keep the search field and destination list primary. A background is context, not a competing focal image.
- Verify each destination, direct-link entry, keyboard category switching, focus, reduced motion, phone category labels, and search submit/clear.

Source: [More page](C:/Users/glcar/Diana/app/(app)/more/page.tsx).

### Search: `/search`, `?q=...`, `?type=...`

- Current states: directory suggestions; All, Work, Notes, Classes and Saved practice result filters; results; no matches; partial-load notices. Concepts is deliberately suppressed as a selectable result filter.
- Update: NEW-02 subdued behind an opaque result surface; larger source labels and result rows; preserve query, selected filter, originating route and position when opening and returning from a result.
- Keep result descriptions accurate. For example, Wellness directory copy currently mentions meals while the history page currently displays energy, sleep and movement.
- Verify empty query, special characters, no results, partial availability, each source type, browser Back/reload and owner isolation.

Source: [Search page](C:/Users/glcar/Diana/app/(app)/search/page.tsx).

### Notes library: `/notes`

- Current states: Library and Ask Diana; class, general-note, tag and content filters; search snippets; no notes; no matches; partial load; note-to-quiz action.
- Update: NEW-03; approved brush sections; consistent school accents; readable note excerpts and source labels. Resolve class-context navigation and the route back to the originating class when appropriate.
- Keep notes and generated help distinguishable. Searching personal notes should not require opening an AI conversation.
- Verify filter combinations, query persistence, general notes, missing classes, Ask Diana unavailable states, and correct source passed to Quiz.

Source: [Notes library](C:/Users/glcar/Diana/app/(app)/notes/page.tsx).

### Note capture: `/notes/new`

- Inputs/context: optional class, assignment context, title, and Write / Record / Photo or PDF / Audio file modes. `/notes/new?mode=voice` is a valid entry.
- States: microphone permission/unsupported browser, recording, file selection/upload, transcription, editing, pending autosave, saving, saved, saved locally while offline, error/retry and Done.
- Update: reuse NEW-03 at the perimeter; plain writing paper; visible active capture mode and recording status; approved brush selection; no scenic art underneath text.
- Keep one primary next action. Explain the difference between saved locally and synced to the account, and retain unsaved work through errors and navigation.
- Verify every capture mode and denied/cancelled permission path, class inference/manual selection, keyboard flow, offline/reconnect, Done, return context and phone input zoom.

Sources: [New note page](C:/Users/glcar/Diana/app/(app)/notes/new/page.tsx), [NoteEditor](C:/Users/glcar/Diana/app/(app)/notes/new/note-editor.tsx).

### Note detail: `/notes/[id]`

- Current states/tools: editable body, unsaved/saved/error, class reassignment, Ask Diana, study-artifact creation, tags and suggested tags, accessible reading/TTS, reading-level adaptation, annotations, selected-text recall cards, transcript/outline generation, visual learning, related notes, delete/keep confirmation.
- Update: NEW-03 perimeter, opaque writing/reading surfaces, editor-first hierarchy, secondary tools progressively disclosed, same account identity in navigation. Original notes, cleaned transcript and generated outline must remain clearly labelled.
- Do not let a long tools rail squeeze the work area. Phone tools should open deliberately and return focus reliably.
- Verify long notes, save errors, unsaved navigation, source/class moves, AI-policy and consent restrictions, selection tools, keyboard deletion confirmation, related-note navigation, TTS and large-text layouts.

Source: [NoteDetail](C:/Users/glcar/Diana/app/(app)/notes/[id]/note-detail.tsx).

### Quiz hub: `/study`, `/study?view=saved`, `?source=...`, `?classId=...`

- Current states: Choose work and Saved practice; source selection; generation pending/unavailable/empty; class-scoped return; optional Recall entry.
- Update: NEW-05 browsing environment; one recognizable Quiz/Saved practice family regardless of entry from More or Classes; source and teacher AI policy visible when they affect available actions.
- Preserve class origin and selected source. Creating a quiz and reopening saved practice should be distinct actions.
- Verify no material, unavailable generation, all supported source types, saved/practice filters, class return, keyboard selection and reload/Back.

Source: [Quiz hub](C:/Users/glcar/Diana/app/(app)/study/page.tsx).

### Saved artifact: `/study-artifacts/[id]`

One route renders several substantially different screens and each needs its own acceptance row.

| Variant | Current states and design work |
|---|---|
| Study guide | Guide sections, source link, authorship receipt, unavailable/not-found. Use NEW-05 only around an opaque, generously spaced long-form reading surface. |
| Recall questions / flashcards | Front/reveal, question/answer editing before saving, previous/next, add-to-recall, saved/error/empty. Use neutral counters and clear reveal controls, not collectible-card or reward framing. |
| Practice test | Question navigator, choice or written response, draft/saved, hints, adaptive support, source disclosure, Ask Diana, finish/save. Keep the question and response workspace dominant; collapse optional help on phone. |
| Practice result | Saved responses, auto-checked results, unscored written-response distinctions, review, another pass. Preserve academic percentages only where meaningful; no XP, ranks, victory scene or reward badge. |

Use NEW-05 around the task, never under question or answer text. Retain the same school accent and profile identity. Verify every artifact type, unfinished progress, resume/reload, unsaved response protection, source and class return, policy/consent limits, hint/help availability, finish/save failure and full keyboard use.

Sources: [Artifact route](C:/Users/glcar/Diana/app/(app)/study-artifacts/[id]/page.tsx), [PracticeSession](C:/Users/glcar/Diana/app/(app)/study-artifacts/[id]/practice-session.tsx), [ArtifactFlashcards](C:/Users/glcar/Diana/app/(app)/study-artifacts/[id]/artifact-flashcards.tsx).

### Recall: `/study/recall`, `?source=...`

- Current states: question, reveal answer, difficulty/rating and next interval, saving/error, no cards, done for now and unavailable.
- Update: reuse NEW-05 in a low-detail focus treatment; large answer/rating controls; same navigation and calm completion screen. The unavailable branch currently renders a bare `main` instead of the usual shell and needs a coherent fallback.
- Preserve FSRS scheduling behavior. A skipped day should not become a penalty, streak loss or guilt message.
- Verify empty queue, reveal and all ratings, save failure/retry, source filtering, read aloud, reload/return and completion.

Source: [RecallSession](C:/Users/glcar/Diana/app/(app)/study/recall/recall-session.tsx).

### Shared assignment material: `/study/material/[assignmentId]`

- This is a shared learning route, not a separate Library product. Class-bound assignments redirect to the class material route.
- Current states: source/version/page selection, original reader or enhanced retrieval, directions, rubric, worksheet material, unavailable and missing source.
- Keep the originating approved Work or Classes scene and return context. Use an opaque document surface and the same reader/tool design specified in the primary-page plan.
- Do not budget new background art for this alias to the shared reader.

Source: [AssignmentMaterialPage](C:/Users/glcar/Diana/components/learning/assignment-material-page.tsx).

### Record: `/proof`

- Current states: Completed work, Saved practice and Showcase; selection/filter; submitted receipt or open work; grouped weekly showcase details; empty and load error.
- Already uses the campus shell, but currently without a photographic campus scene.
- Update: KEEP-03 Classes Hall as a header/perimeter treatment, strong readable records, clear distinction between long-term completed work and Lobby This Week. Reconcile Saved practice duplication with the Quiz hub.
- Use evidence and project history, not trophies or a ranking wall. Preserve student work, reflections and submitted copies.
- Verify all status/action destinations, completed versus submitted meaning, showcase expansion, absent data, saved practice return and mobile long titles.

Source: [Record](C:/Users/glcar/Diana/app/(app)/proof/page.tsx).

### Check-in history / Wellness: `/wellness`

- Current states: year-to-date summaries; week/month; earlier/newer date range; recorded/no entry; three-month daily-detail retention explanation.
- Current daily display contains energy, sleep and movement. It does not show all optional food/water/break responses from the newer Lobby Check-in. Align the history contract and copy deliberately rather than promising data the page does not render.
- Update: NEW-04 Quiet Courtyard in the header only, with plain chart and record surfaces. Align naming with More's Check-in history and the Lobby Check-in language.
- Review the monthly check-in completion percentage and “X of Y days” emphasis. Optional check-ins should read as a personal record, not a graded completion target. Prefer a neutral recorded-entry count and clearly marked missing data.
- Verify no entries, partially answered entries, date/timezone boundaries, week/month navigation, chart text alternatives, large text, retention/archive boundaries and private ownership. Avoid medical conclusions or moral judgments about food, sleep or mood.

Sources: [Wellness page](C:/Users/glcar/Diana/app/(app)/wellness/page.tsx), [WellnessClient](C:/Users/glcar/Diana/app/(app)/wellness/wellness-client.tsx), [history model](C:/Users/glcar/Diana/lib/wellness/history.ts).

### Sharing: `/sharing`

- Current screen configures a weekly parent/guardian digest: recipient email, on/off, save/pending/error. Copy says no grades or AI chat contents.
- Update: reuse NEW-06 around an opaque privacy-first form. Make the exact recipient, frequency and fields being shared understandable before enabling or changing them. Add a suitable preview/confirmation flow where needed.
- This settings screen is distinct from the recipient's public token-share viewer, which belongs to the entry-page plan.
- Verify opt-in/off, changed or invalid recipient, save failure, privacy fields, keyboard switch semantics and phone layouts. Do not send real test mail without explicit authorization.

Sources: [Sharing](C:/Users/glcar/Diana/app/(app)/sharing/page.tsx), [ParentDigestForm](C:/Users/glcar/Diana/app/(app)/parent-share/parent-digest-form.tsx).

### Account access / upgrade: `/upgrade`

- An active route although absent from the current More menu. The same UpgradeScreen component is embedded in the public funnel.
- Current variants: standard/community, billing available/unavailable, access options and benefits, close/back and external checkout. Legacy styling includes fixed-height mobile framing, pink/cyan gradients and very small supporting text.
- Update as a clear Account/Access surface, not a game store. Use NEW-06 or the approved entry family only at the perimeter; no new scenic master. Keep plan/eligibility and available actions readable.
- Confirm actual configured offers before pricing or capability claims. Preserve billing-disabled states and account/guardian protections.
- Verify desktop width, short-height phone scrolling, text enlargement, unavailable checkout, return/cancel and correct supported external destination. No purchases are part of this audit.

Source: [UpgradeScreen](C:/Users/glcar/Diana/app/(app)/upgrade/upgrade-screen.tsx).

## 5. Every Settings section

All ten sections below are separate designed screens and state checklists, even though they share `/settings`. All reuse NEW-06 Student Services Office behind opaque, low-distraction form surfaces. Keep the same room orientation, section rail, wordmark, campus identity and palette. Section changes should not feel like moving to a different product.

| URL | Current content / important states | Required update |
|---|---|---|
| `/settings` or `?section=profile` | Display name, school year, timezone, main learning hurdle, best study time, age-sensitive AI consent; lobby photo selection/crop; save/status/error | Group student identity and learning preferences clearly; readable labels; one understandable save model; retain age/consent restrictions, timezone validation and image cancel/error handling. |
| `?section=appearance` | Light/Dark/Device, five-color AccentPicker, LobbyBackgroundPicker, school name/two colors/logo and save | Establish one school-palette authority and clear fallback; honor accessibility theme preferences; remove or replace stale background choices after checking the current Lobby contract. Preview school colors and logo in their permitted placements. |
| `?section=notifications` | Push enable/disable/unsupported/denied/working; offline app install; permissions; queued drafts and status sync, retry/dismiss | Give understandable permission and unsupported states; distinguish install, notification permission and actual subscription. Make saved-on-device and synced-to-account states explicit and calm. |
| `?section=accessibility` | Text size, line spacing, reading font, fine text spacing, voice provider/voice/speed/pitch; saving/saved | Use progressive groups and a real reading preview. Preserve dyslexia/large-text overrides and robust keyboard control rather than forcing the display font onto reading text. |
| `?section=goals` | Up to three current goals, goal/category/progress description/first action, save/pending/error | Clear optional goals and a workable next action; neutral progress descriptions, no streaks or reward framing. |
| `?section=learning` | Learned support summary, personalization pause/resume/reset, reset date | Explain the effects in student language; make reset consequences and confirmation clear; maintain private learned data and meaningful unavailable/empty states. |
| `?section=tutor` | Diana/Xavier/Maya presentations; Ask questions/Encouraging/Direct styles; Simple/Balanced/Advanced complexity; gallery/details/save | Align portrait assets and panel styling with one product. Keep supported preferences without changing the answer-help golden rule or implying teaching style bypasses class policy. |
| `?section=ai` | AI activity export by email; preparing/success/error | Coherent privacy/integrity explanation, accessible export status and accurate recipient/delivery language. No independent AI-history page is needed for the same action. |
| `?section=connections` | School-platform rows; Google Calendar/Classroom state and reconnect/remove; IEP/504 import; Canva connection | Capability-aware actions and truthful provider availability; explicit scope and data boundaries; readable IEP import/apply states; consistent connect, reconnect, sync and remove where supported. Preserve owner-bound actions and Calendar-only grant isolation. |
| `?section=sign-out` | Signed-in account and sign-out action | Clear account identity and sign-out result; coherent expired-session behavior. Account security additions below require proper new screens. |

### Appearance controls that need deliberate consolidation

- `AccentPicker` currently stores one of five independent colors in local storage. The school branding form separately saves two school colors. Do not let these silently compete.
- The compatibility Lobby picker exposes only key `football`, labelled **Gamer high school**, with `/images/today-gamer-high-school.png`. Its text says it changes the Today lobby on this device.
- Replace or remove that obsolete presentation control after verifying the approved Lobby scene mechanism. Do not regenerate or promote the old gamer image as part of the new plan.
- Preserve useful light/dark/device and reading accessibility choices; a school palette should not defeat contrast or dyslexia settings.

### Account screens that are missing, not already finished

The current Account rail contains Sign out. A proper password-change screen, forgot-password/recovery request screen, recovery completion screen, invalid/expired recovery-link state and associated session/security feedback must be explicitly designed and implemented with the entry-page plan. Do not list them as existing working routes. Any email-change, session-management or account-deletion surface must likewise be scoped against actual supported behavior before being promised.

### Connections details to retain and improve

- Google-only rows have specific reconnect and confirmed-remove controls. Imported saved data remains after disconnect and Google permissions remain unchanged; that explanation must stay accurate.
- The no-connections view currently renders Canvas and Classroom start links without first expressing feature availability. Make provider availability and disabled/setup-needed states truthful.
- Only Google rows currently expose the new removal control. Audit other actually supported providers and the older unmounted connection manager before claiming all provider controls are equivalent. Do not revive unsupported providers only to fill the UI.
- IEP import supports pasted text and text/Markdown/PDF files, then reports applied extra time, TTS, reading font and detected accommodations. Make file parsing, apply, empty, error and confirmation states understandable; retain the student's control over sensitive supports.
- Keep Canva connect/disconnect status clear. Browser/OAuth callbacks are transitions and states, not extra decorative pages.
- Preserve the verified distinction between Google Calendar read-only access and Classroom/Drive permissions. Production Google publishing/verification remains an operational dependency; design must not imply public availability before that is complete.

Sources: [Settings route](C:/Users/glcar/Diana/app/(app)/settings/page.tsx), [ProfileCenter](C:/Users/glcar/Diana/app/(app)/settings/profile-center.tsx), [settings CSS](C:/Users/glcar/Diana/components/student-shell/settings.module.css), [ProfileCenterForm](C:/Users/glcar/Diana/app/(app)/settings/profile-center-form.tsx), [SchoolBrandingForm](C:/Users/glcar/Diana/components/school-branding-form.tsx), [AccentPicker](C:/Users/glcar/Diana/components/accent-picker.tsx), [LobbyBackgroundPicker](C:/Users/glcar/Diana/app/(app)/settings/lobby-background-picker.tsx), [legacy picker contract](C:/Users/glcar/Diana/app/(app)/dashboard/lobby-background-layer.tsx), [AccessibilityPrefs](C:/Users/glcar/Diana/app/(app)/settings/accessibility-prefs.tsx), [PwaSettings](C:/Users/glcar/Diana/components/pwa-settings.tsx), [PushSettings](C:/Users/glcar/Diana/components/push-settings.tsx).

## 6. Profile and restricted staff surfaces

### `/me`

This renders ProfileCenter with `editable=false` and has no current primary-nav entry. It is a consolidation candidate with canonical Profile settings, not a new scene family. Check dependent links and features before redirecting it. It hides the external Save button but still mounts ProfileCenterForm; verify true read-only behavior and Enter submission before calling it a read-only profile.

Source: [Me page](C:/Users/glcar/Diana/app/(app)/me/page.tsx).

### `/settings/course-review`

There is no dedicated parent, teacher or admin dashboard route in this audited application tree. The current extra-role surface is Course Review. The Settings link appears only after an API access check, and the tools branch by operator/reviewer role.

Current states and tools:

- Loading, empty/unavailable and unauthorized response.
- Course version, status, compatibility and current content selection.
- Operator submission for review, publication and withdrawal.
- Reviewer invitations and acceptance.
- Activity source/rubric/method/hints/example review.
- Response-rating request, criterion selection, selected evidence passages, rationale and no-conflict declaration.
- Independent-review submission, publication notes and action errors.

Update: reuse NEW-06 at the perimeter and a plain, wide staff work surface. Do not mix staff actions into the student's More menu. Use a deliberate access-denied state, readable rubrics and evidence, clear version/status labels, appropriate confirmations for permanent review/publication actions, and keyboard selection. Technical checking specifications may remain in staff-only disclosure rather than becoming primary student UI.

Preserve server-side role authorization, version compatibility and independent review requirements. The public recipient view at `/share/[token]` belongs to the entry-page inventory, not this staff surface.

Sources: [Course Review route](C:/Users/glcar/Diana/app/(app)/settings/course-review/page.tsx), [access-aware link](C:/Users/glcar/Diana/components/learning/course-review-link.tsx), [CourseReview](C:/Users/glcar/Diana/components/learning/course-review.tsx), [review invitations](C:/Users/glcar/Diana/components/learning/course-response-review-invitations.tsx), [response rater](C:/Users/glcar/Diana/components/learning/course-response-review-rater.tsx).

## 7. Redirects, retired pages and internal-only screens

Routing policy executes before the physical page file. These entries need redirect/link tests and a documented canonical owner, not new background images or a second redesign of retired UI.

| Legacy entry | Actual destination / disposition |
|---|---|
| `/inbox` | Middleware redirects to `/assignments/captures`; the physical old page says `/assignments`, but it does not win. |
| `/inbox/[id]` | `/assignments/captures/[id]` |
| `/templates`, `/assignments/new` | `/quick-add` |
| `/voice` | `/notes/new?mode=voice` |
| `/body-double`, `/timer` | `/dashboard` |
| `/break-down`, `/study-buddy` | `/assignments` |
| `/ap`, `/study-groups`, `/knowledge-graph`, `/concepts/*` | `/study` |
| `/insights/*`, `/portfolio/*` | `/proof` |
| `/flashcards/*` | `/study/recall` |
| `/parent-share`, `/teacher-share` | `/sharing` |
| `/settings/goals` | `/settings?section=goals` |
| `/settings/tutor` | `/settings?section=tutor` |
| `/settings/ai-history`, `/export` | `/settings?section=ai#ai-history-export` |
| `/notifications` | `/calendar` |
| `/grades`, `/grades/transcript` | `/proof` |
| `/course-mode/*` | `/classes` |
| `/study-artifacts` | `/study?view=saved`, preserving class context |
| `/study-artifacts/new` | `/study?source=...` or `/study` |

The old `/concepts/[id]` source contains a pink/cyan mobile design with “Game film breakdown,” but middleware redirects the route to Study. Treat the old source as an archive/consolidation candidate after dependency checks; do not commission art to revive it.

`/qa/smart-loading-preview` is available only with the QA creation flag and otherwise returns not-found. `/qa/smart-loading-probe` also falls inside the retired-prefix boundary. They are internal verification surfaces, not student menu destinations.

The same principle applies to old `landing-3d` concept/review entry points: the root route inventory and routing policy decide whether each is redirected, gated or genuinely live. Never count physical files alone as all distinct student experiences.

Sources: [route policy](C:/Users/glcar/Diana/lib/student-route-policy.ts), [middleware](C:/Users/glcar/Diana/middleware.ts), [artifact index alias](C:/Users/glcar/Diana/app/(app)/study-artifacts/page.tsx), [artifact new alias](C:/Users/glcar/Diana/app/(app)/study-artifacts/new/page.tsx), [QA preview](C:/Users/glcar/Diana/app/(app)/qa/smart-loading-preview/page.tsx).

## 8. Loading, empty, error and modal coverage

The page plan must track states as well as routes. Each family needs consistent shell, reserved layout dimensions, truthful progress and a clear next action. Do not create new scenic masters for each spinner, error or dialog.

| Family | Required state coverage |
|---|---|
| More/Search | Initial load, no query, query/results, no matches, partial source unavailable, invalid filter, keyboard category/search focus. |
| Notes library | Loading, empty library, no search matches, unavailable notes/classes, selected/filter state and Ask Diana unavailable. |
| Note capture | Microphone denied/unavailable, record/pause/finish, upload/cancel/import/transcribe, pending autosave, saved locally, synced, save failure/retry and unsaved departure. |
| Note detail | Loading/not-found, source unavailable, unsaved/saving/saved, policy-limited help, transcription/outline states, tags, selected-text actions, delete/keep and return focus. |
| Quiz/Saved practice | No source, creating, unavailable, saved list empty, source denied or missing, unfinished/resumed response, hint/help states, save/finish errors, result and retry. |
| Recall | No due cards, front/reveal, rating pending/error, complete, source filter and unavailable branch. |
| Record | No completed work, missing/partial data, every supported completion/submission state, showcase expansion, correct submitted receipt destination. |
| Wellness | No entries, partial answers, missing days, week/month, retained/archive boundaries, accessible chart alternatives and optional check-in language. |
| Settings | Loading, section selection, clean/unsaved/saving/saved/error, invalid values, upload/crop/cancel, unsupported capability/permission denial, reconnect and remove confirmation. |
| Sharing | Disabled, recipient edit/invalid address, enabled, save pending/error, preview/confirmation, accurate limited shared content. |
| Staff review | Unauthorized, loading/empty, incompatible version, invitation/acceptance, review draft/validation/submission, publish/withdraw confirmation and errors. |
| Account/Access | Billing unavailable, supported offer, checkout redirect/cancel/return, short screen scrolling; new recovery and password states as defined with entry work. |

Existing Notes and Record route loading files use SmartLoading with route-specific labels. Retheme the shared loading system and preserve those labels. Give any new loading state the same campus family and accessible status treatment, rather than switching back to the old portrait/gradient UI. Do not fake percentage progress when the underlying operation cannot measure it.

Sources: [Notes loading](C:/Users/glcar/Diana/app/(app)/notes/loading.tsx), [Record loading](C:/Users/glcar/Diana/app/(app)/proof/loading.tsx), [SmartLoading](C:/Users/glcar/Diana/components/screen-design/smart-loading.tsx).

## 9. Recommended implementation order and dependencies

1. **Shared presentation foundation.** Scene registry, navigation-independent image assignment, campus header/profile, brush selections, school-color precedence, reading/focus treatment and accessibility tokens. Preserve the four approved primary scenes and their verified behavior.
2. **Settings and Account.** Resolve competing appearance controls and the stale gamer picker; design missing password/recovery with the entry flow; improve supported connection and privacy controls without weakening consent, owner checks or provider gates.
3. **More and Search.** Give students a coherent Commons navigation hub, canonical destination names, retained queries and reliable direct links.
4. **Notes.** Library, capture modes, note workspace and all supporting tools; protect drafts, original text, source references and offline behavior.
5. **Quiz, saved practice and Recall.** One Seminar family with focused question/reading surfaces, preserved responses and calm results.
6. **Record, Check-in history and Sharing.** Distinct purposes, optional personal histories, understandable exports and sharing. Reuse KEEP-03, NEW-04 and NEW-06 rather than adding more masters.
7. **Staff and Access.** Role-specific review and truthful billing/access states; verify aliases and remove old source only after dependency and history checks.
8. **Cross-family journey check.** Notes or class material to practice to saved record; class to note to class; More search to source and Back; Profile appearance to every shell; offline note/draft to reconnection; account session loss and return to the intended route.

This is an execution order, not a request to redo already verified behavior broadly after every cosmetic edit. Tests should match each change, then the final release should run the integrated journeys once the whole batch is coherent.

## 10. Acceptance gates for each implemented batch

- Screens at 320px and 390px phone, 768px tablet, 1440px desktop, and high-DPI desktop; include short-height screens and long titles/content.
- Large text, dyslexia font, line-spacing controls, light/dark/device, reduced motion and forced-color/focus checks. Generated art must not be the only way to understand a state.
- No clipped controls, inaccessible horizontal text, hidden primary action or body text on visually busy scenery. Preserve 44px interaction targets and 16px phone form text where appropriate.
- Keyboard ordering, roving tabs, visible focus, Escape/cancel, dialog focus return, screen-reader labels and status announcements.
- Correct route/query/class/source/selection retention through direct entry, save, reload, browser Back and contextual return. Reuse the lessons from the verified Calendar navigation fix.
- Draft and saved-data retention through pending operations, failure/retry, offline/reconnect and interrupted navigation. Do not turn cosmetic work into destructive data cleanup.
- Authentication, owner isolation, staff authorization, AI/teacher policy and consent restrictions continue to be enforced on the server.
- Provider-specific connected, unavailable, reconnect and remove states are truthful. The existing real Google Calendar connection and its Calendar-only permissions must remain intact.
- Show desktop and phone previews for approval before publishing the next design batch. Record actual checked routes/states and distinguish source inspection, local proof, preview proof and production proof.
- Do not generate paid art during this planning phase. Exact final asset calls must follow the repository's current Higgsfield credit-approval rules; new scene IDs here are briefs, not approved generation jobs.

## 11. Completion record for this audit

This document was written from the completed source audit. It does not create new pages, change application code, reset user settings, send messages, publish a release or generate assets. Preserve the unrelated user-owned audit document and any other concurrent work.
