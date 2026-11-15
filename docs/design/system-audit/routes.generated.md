# Route Coverage Matrix

Generated from route source and retirement policy. This is NOT rendered verification or approval. Source area is not access policy: onboarding requires auth and /me currently returns a middleware 404 when signed out. See README.md and the specialist audits for states and evidence.

| Route | Kind | Source disposition | Design family | Source |
| --- | --- | --- | --- | --- |
| `/ap` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/ap/page.tsx) |
| `/assignments/[id]` | loading | student | Shared recovery and loading | [source](../../../app/(app)/assignments/[id]/loading.tsx) |
| `/assignments/[id]` | page | student | Assignment briefing | [source](../../../app/(app)/assignments/[id]/page.tsx) |
| `/assignments/[id]/submit` | page | student | Explicit submission confirmation | [source](../../../app/(app)/assignments/[id]/submit/page.tsx) |
| `/assignments/[id]/workspace` | page | student | Active work HUD | [source](../../../app/(app)/assignments/[id]/workspace/page.tsx) |
| `/assignments/captures/[id]` | page | student | Source capture and review | [source](../../../app/(app)/assignments/captures/[id]/page.tsx) |
| `/assignments` | loading | student | Shared recovery and loading | [source](../../../app/(app)/assignments/loading.tsx) |
| `/assignments/new` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/assignments/new/page.tsx) |
| `/assignments` | page | student | Work schedule and selection | [source](../../../app/(app)/assignments/page.tsx) |
| `/body-double` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/body-double/page.tsx) |
| `/break-down` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/break-down/page.tsx) |
| `/calendar` | page | student | Personal schedule and event detail | [source](../../../app/(app)/calendar/page.tsx) |
| `/classes/[id]` | loading | student | Shared recovery and loading | [source](../../../app/(app)/classes/[id]/loading.tsx) |
| `/classes/[id]` | page | student | Class roster and profile | [source](../../../app/(app)/classes/[id]/page.tsx) |
| `/classes/[id]/settings` | page | student | Class roster and profile | [source](../../../app/(app)/classes/[id]/settings/page.tsx) |
| `/classes` | page | student | Class roster and profile | [source](../../../app/(app)/classes/page.tsx) |
| `/concepts/[id]` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/concepts/[id]/page.tsx) |
| `/dashboard` | layout | student | Shared shell and route guards | [source](../../../app/(app)/dashboard/layout.tsx) |
| `/dashboard` | loading | student | Shared recovery and loading | [source](../../../app/(app)/dashboard/loading.tsx) |
| `/dashboard` | page | student | Lobby and utility menu | [source](../../../app/(app)/dashboard/page.tsx) |
| `/` | error | student | Shared recovery and loading | [source](../../../app/(app)/error.tsx) |
| `/inbox/[id]` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/inbox/[id]/page.tsx) |
| `/inbox` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/inbox/page.tsx) |
| `/insights` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/insights/page.tsx) |
| `/knowledge-graph` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/knowledge-graph/page.tsx) |
| `/` | layout | student | Shared shell and route guards | [source](../../../app/(app)/layout.tsx) |
| `/` | loading | student | Shared recovery and loading | [source](../../../app/(app)/loading.tsx) |
| `/me` | page | student | Account and options menu | [source](../../../app/(app)/me/page.tsx) |
| `/more` | page | student | Lobby and utility menu | [source](../../../app/(app)/more/page.tsx) |
| `/` | not-found | student | Shared recovery and loading | [source](../../../app/(app)/not-found.tsx) |
| `/notes/[id]` | page | student | Notes library and editor | [source](../../../app/(app)/notes/[id]/page.tsx) |
| `/notes` | loading | student | Shared recovery and loading | [source](../../../app/(app)/notes/loading.tsx) |
| `/notes/new` | page | student | Notes library and editor | [source](../../../app/(app)/notes/new/page.tsx) |
| `/notes` | page | student | Notes library and editor | [source](../../../app/(app)/notes/page.tsx) |
| `/notifications` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/notifications/page.tsx) |
| `/parent-share` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/parent-share/page.tsx) |
| `/proof` | loading | student | Shared recovery and loading | [source](../../../app/(app)/proof/loading.tsx) |
| `/proof` | page | student | Evidence collection and record | [source](../../../app/(app)/proof/page.tsx) |
| `/qa/smart-loading-preview` | page | qa | Internal QA fixture | [source](../../../app/(app)/qa/smart-loading-preview/page.tsx) |
| `/qa/smart-loading-probe` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/qa/smart-loading-probe/page.tsx) |
| `/quick-add` | page | student | Source capture and review | [source](../../../app/(app)/quick-add/page.tsx) |
| `/search` | page | student | Search directory | [source](../../../app/(app)/search/page.tsx) |
| `/settings/ai-history` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/settings/ai-history/page.tsx) |
| `/settings/goals` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/settings/goals/page.tsx) |
| `/settings` | page | student | Account and options menu | [source](../../../app/(app)/settings/page.tsx) |
| `/settings/tutor` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/settings/tutor/page.tsx) |
| `/sharing` | page | student | Sharing and audience permissions | [source](../../../app/(app)/sharing/page.tsx) |
| `/study-artifacts/[id]` | page | student | Practice selection and study session | [source](../../../app/(app)/study-artifacts/[id]/page.tsx) |
| `/study-artifacts/new` | page | student | Practice selection and study session | [source](../../../app/(app)/study-artifacts/new/page.tsx) |
| `/study-artifacts` | page | student | Practice selection and study session | [source](../../../app/(app)/study-artifacts/page.tsx) |
| `/study-buddy` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/study-buddy/page.tsx) |
| `/study-groups` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/study-groups/page.tsx) |
| `/study` | page | student | Practice selection and study session | [source](../../../app/(app)/study/page.tsx) |
| `/teacher-share` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/teacher-share/page.tsx) |
| `/templates` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/templates/page.tsx) |
| `/timer` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/timer/page.tsx) |
| `/upgrade` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/upgrade/page.tsx) |
| `/voice` | page | Retired | Retired: preserve 404 boundary | [source](../../../app/(app)/voice/page.tsx) |
| `/wellness` | page | student | Private check-in history | [source](../../../app/(app)/wellness/page.tsx) |
| `/` | layout | auth | Shared shell and route guards | [source](../../../app/(auth)/layout.tsx) |
| `/login` | page | auth | Entry and player setup | [source](../../../app/(auth)/login/page.tsx) |
| `/signup` | page | auth | Entry and player setup | [source](../../../app/(auth)/signup/page.tsx) |
| `/early-access/confirm` | page | public | Public product and trust | [source](../../../app/early-access/confirm/page.tsx) |
| `/early-access/unsubscribe` | page | public | Public product and trust | [source](../../../app/early-access/unsubscribe/page.tsx) |
| `/` | error | public | Shared recovery and loading | [source](../../../app/error.tsx) |
| `/how-it-works` | page | public | Public product and trust | [source](../../../app/how-it-works/page.tsx) |
| `/landing-3d/assignment-world` | page | review | Existing review reference | [source](../../../app/landing-3d/assignment-world/page.tsx) |
| `/landing-3d/calendar-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/calendar-concept-review/page.tsx) |
| `/landing-3d/classes-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/classes-concept-review/page.tsx) |
| `/landing-3d/hero-product-capture` | page | review | Existing review reference | [source](../../../app/landing-3d/hero-product-capture/page.tsx) |
| `/landing-3d/logo-mask` | layout | review | Shared shell and route guards | [source](../../../app/landing-3d/logo-mask/layout.tsx) |
| `/landing-3d/logo-mask` | page | review | Existing review reference | [source](../../../app/landing-3d/logo-mask/page.tsx) |
| `/landing-3d/more-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/more-concept-review/page.tsx) |
| `/landing-3d/onboarding-preview` | page | review | Existing review reference | [source](../../../app/landing-3d/onboarding-preview/page.tsx) |
| `/landing-3d/settings-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/settings-concept-review/page.tsx) |
| `/landing-3d/today-motion-review` | page | review | Existing review reference | [source](../../../app/landing-3d/today-motion-review/page.tsx) |
| `/landing-3d/today-now-assets` | page | review | Existing review reference | [source](../../../app/landing-3d/today-now-assets/page.tsx) |
| `/landing-3d/today-now-composition` | page | review | Existing review reference | [source](../../../app/landing-3d/today-now-composition/page.tsx) |
| `/landing-3d/today-preview/integration` | page | review | Existing review reference | [source](../../../app/landing-3d/today-preview/integration/page.tsx) |
| `/landing-3d/today-preview` | page | review | Existing review reference | [source](../../../app/landing-3d/today-preview/page.tsx) |
| `/landing-3d/work-capture-review` | page | review | Existing review reference | [source](../../../app/landing-3d/work-capture-review/page.tsx) |
| `/landing-3d/work-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/work-concept-review/page.tsx) |
| `/landing-3d/workspace-concept-review` | page | review | Existing review reference | [source](../../../app/landing-3d/workspace-concept-review/page.tsx) |
| `/` | layout | public | Shared shell and route guards | [source](../../../app/layout.tsx) |
| `/` | not-found | public | Shared recovery and loading | [source](../../../app/not-found.tsx) |
| `/offline` | page | public | Shared recovery and loading | [source](../../../app/offline/page.tsx) |
| `/onboarding/done` | page | public | Entry and player setup | [source](../../../app/onboarding/done/page.tsx) |
| `/onboarding` | page | public | Entry and player setup | [source](../../../app/onboarding/page.tsx) |
| `/` | page | public | Public product and trust | [source](../../../app/page.tsx) |
| `/public-not-found` | page | public | Shared recovery and loading | [source](../../../app/public-not-found/page.tsx) |
| `/share/[token]` | page | public | Sharing and audience permissions | [source](../../../app/share/[token]/page.tsx) |
| `/student-control` | page | public | Public product and trust | [source](../../../app/student-control/page.tsx) |
| `/trust` | page | public | Public product and trust | [source](../../../app/trust/page.tsx) |
| `/privacy.html` | static-html | canonical | Public product and trust | [source](../../../public/privacy.html) |
| `/trust.html` | static-html | redirected by next.config.ts to /privacy.html#privacy | Public product and trust | [source](../../../public/trust.html) |
| `/landing-3d/today-idle-review` | html-route-handler | development review only | Existing review reference | [source](../../../app/landing-3d/today-idle-review/route.ts) |
