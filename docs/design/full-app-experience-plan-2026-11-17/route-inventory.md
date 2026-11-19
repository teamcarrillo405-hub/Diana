# Complete source route inventory

Baseline: 25477d594afdd83a7ac5b91ee9e09ddbadf579cf. Source mapping only; use README for current-state evidence and proposed work.

Page files: 93. This inventory includes redirects and gated specimens; it does not imply 93 production screens.

| Route | Classification | Destination or family | Scene decision | Source |
| --- | --- | --- | --- | --- |
| / | rendered page candidate | Public welcome | PUBLIC-EXISTING | app/page.tsx |
| /ap | middleware redirect | /study | NONE: destination owns scene | app/(app)/ap/page.tsx |
| /assignments | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/page.tsx |
| /assignments/[id] | page redirect | /assignments/[id]/workspace OR /assignments/[id]/submit (lifecycle; login is a conditional guard) | NONE: destination owns scene | app/(app)/assignments/[id]/page.tsx |
| /assignments/[id]/submit | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/[id]/submit/page.tsx |
| /assignments/[id]/submitted-work | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/[id]/submitted-work/page.tsx |
| /assignments/[id]/workspace | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/[id]/workspace/page.tsx |
| /assignments/captures | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/captures/page.tsx |
| /assignments/captures/[id] | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/assignments/captures/[id]/page.tsx |
| /assignments/new | middleware redirect | /quick-add | NONE: destination owns scene | app/(app)/assignments/new/page.tsx |
| /body-double | middleware redirect | /dashboard | NONE: destination owns scene | app/(app)/body-double/page.tsx |
| /break-down | middleware redirect | /assignments | NONE: destination owns scene | app/(app)/break-down/page.tsx |
| /calendar | rendered page candidate | Calendar | KEEP-04 | app/(app)/calendar/page.tsx |
| /classes | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/page.tsx |
| /classes/[id] | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/page.tsx |
| /classes/[id]/assessments/[assessmentId] | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/assessments/[assessmentId]/page.tsx |
| /classes/[id]/materials/[assignmentId] | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/materials/[assignmentId]/page.tsx |
| /classes/[id]/materials/[assignmentId]/practice | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/materials/[assignmentId]/practice/page.tsx |
| /classes/[id]/practice | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/practice/page.tsx |
| /classes/[id]/reference/[bookId] | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/reference/[bookId]/page.tsx |
| /classes/[id]/reference/[bookId]/ask | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/reference/[bookId]/ask/page.tsx |
| /classes/[id]/settings | rendered page candidate | Classes | KEEP-03 / PLAIN | app/(app)/classes/[id]/settings/page.tsx |
| /concepts/[id] | middleware redirect | /study | NONE: destination owns scene | app/(app)/concepts/[id]/page.tsx |
| /dashboard | rendered page candidate | Lobby | KEEP-01 | app/(app)/dashboard/page.tsx |
| /early-access/confirm | rendered page candidate | Public information | NEW-01 / PLAIN | app/early-access/confirm/page.tsx |
| /early-access/unsubscribe | rendered page candidate | Public information | NEW-01 / PLAIN | app/early-access/unsubscribe/page.tsx |
| /how-it-works | page redirect | /#how-it-works | NONE: destination owns scene | app/how-it-works/page.tsx |
| /inbox | middleware redirect | /assignments/captures | NONE: destination owns scene | app/(app)/inbox/page.tsx |
| /inbox/[id] | middleware redirect | /assignments/captures/[id] | NONE: destination owns scene | app/(app)/inbox/[id]/page.tsx |
| /insights | middleware redirect | /proof | NONE: destination owns scene | app/(app)/insights/page.tsx |
| /knowledge-graph | middleware redirect | /study | NONE: destination owns scene | app/(app)/knowledge-graph/page.tsx |
| /landing-3d/assignment-world | preview/QA candidate; verify gate | Preview and QA | NONE | app/landing-3d/assignment-world/page.tsx |
| /landing-3d/calendar-concept-review | page redirect | /calendar | NONE: destination owns scene | app/landing-3d/calendar-concept-review/page.tsx |
| /landing-3d/classes-concept-review | page redirect | /classes | NONE: destination owns scene | app/landing-3d/classes-concept-review/page.tsx |
| /landing-3d/hero-product-capture | preview/QA candidate; verify gate | Preview and QA | NONE | app/landing-3d/hero-product-capture/page.tsx |
| /landing-3d/logo-mask | preview/QA candidate; verify gate | Preview and QA | NONE | app/landing-3d/logo-mask/page.tsx |
| /landing-3d/more-concept-review | page redirect | /more | NONE: destination owns scene | app/landing-3d/more-concept-review/page.tsx |
| /landing-3d/onboarding-preview | middleware redirect | /onboarding | NONE: destination owns scene | app/landing-3d/onboarding-preview/page.tsx |
| /landing-3d/remaining-concept-review | middleware redirect | /more | NONE: destination owns scene | app/landing-3d/remaining-concept-review/page.tsx |
| /landing-3d/remaining-concept-review/[screen] | page redirect | dynamic target; inspect source | NONE: destination owns scene | app/landing-3d/remaining-concept-review/[screen]/page.tsx |
| /landing-3d/settings-concept-review | middleware redirect | /settings | NONE: destination owns scene | app/landing-3d/settings-concept-review/page.tsx |
| /landing-3d/submission-concept-review | middleware redirect | /assignments?view=ready | NONE: destination owns scene | app/landing-3d/submission-concept-review/page.tsx |
| /landing-3d/test-prep-concept-review | page redirect | /study | NONE: destination owns scene | app/landing-3d/test-prep-concept-review/page.tsx |
| /landing-3d/today-motion-review | page redirect | /dashboard | NONE: destination owns scene | app/landing-3d/today-motion-review/page.tsx |
| /landing-3d/today-now-assets | middleware redirect | /dashboard | NONE: destination owns scene | app/landing-3d/today-now-assets/page.tsx |
| /landing-3d/today-now-composition | middleware redirect | /dashboard | NONE: destination owns scene | app/landing-3d/today-now-composition/page.tsx |
| /landing-3d/today-preview | middleware redirect | /dashboard | NONE: destination owns scene | app/landing-3d/today-preview/page.tsx |
| /landing-3d/today-preview/integration | page redirect | /dashboard | NONE: destination owns scene | app/landing-3d/today-preview/integration/page.tsx |
| /landing-3d/work-capture-review | page redirect | /quick-add | NONE: destination owns scene | app/landing-3d/work-capture-review/page.tsx |
| /landing-3d/work-concept-review | page redirect | /assignments | NONE: destination owns scene | app/landing-3d/work-concept-review/page.tsx |
| /landing-3d/workspace-concept-review | page redirect | /assignments | NONE: destination owns scene | app/landing-3d/workspace-concept-review/page.tsx |
| /lobby-preview | public read-only specimen | Public Lobby specimen | KEEP-01 | app/lobby-preview/page.tsx |
| /login | rendered page candidate | Account entry | NEW-01 | app/(auth)/login/page.tsx |
| /me | rendered page candidate | Account and services | NEW-06 / PLAIN | app/(app)/me/page.tsx |
| /more | rendered page candidate | More and search | NEW-02 | app/(app)/more/page.tsx |
| /notes | rendered page candidate | Notes | NEW-03 / PLAIN | app/(app)/notes/page.tsx |
| /notes/[id] | rendered page candidate | Notes | NEW-03 / PLAIN | app/(app)/notes/[id]/page.tsx |
| /notes/new | rendered page candidate | Notes | NEW-03 / PLAIN | app/(app)/notes/new/page.tsx |
| /notifications | middleware redirect | /calendar | NONE: destination owns scene | app/(app)/notifications/page.tsx |
| /offline | rendered page candidate | System recovery | SYSTEM | app/offline/page.tsx |
| /onboarding | rendered page candidate | Onboarding | NEW-06 | app/onboarding/page.tsx |
| /onboarding/done | page redirect | /dashboard | NONE: destination owns scene | app/onboarding/done/page.tsx |
| /parent-share | middleware redirect | /sharing | NONE: destination owns scene | app/(app)/parent-share/page.tsx |
| /proof | rendered page candidate | Completed work | KEEP-03 | app/(app)/proof/page.tsx |
| /public-not-found | rendered page candidate | System recovery | SYSTEM | app/public-not-found/page.tsx |
| /qa/smart-loading-preview | preview/QA candidate; verify gate | Preview and QA | NONE | app/(app)/qa/smart-loading-preview/page.tsx |
| /qa/smart-loading-probe | retired boundary (404) | Compatibility and retirement | NONE: destination owns scene | app/(app)/qa/smart-loading-probe/page.tsx |
| /quick-add | rendered page candidate | Work and homework | KEEP-02 / PLAIN | app/(app)/quick-add/page.tsx |
| /search | rendered page candidate | More and search | NEW-02 | app/(app)/search/page.tsx |
| /settings | rendered page candidate | Account and services | NEW-06 / PLAIN | app/(app)/settings/page.tsx |
| /settings/ai-history | middleware redirect | /settings?section=ai#ai-history-export | NONE: destination owns scene | app/(app)/settings/ai-history/page.tsx |
| /settings/course-review | rendered page candidate | Staff and access | NEW-06 / PLAIN | app/(app)/settings/course-review/page.tsx |
| /settings/goals | middleware redirect | /settings?section=goals | NONE: destination owns scene | app/(app)/settings/goals/page.tsx |
| /settings/tutor | middleware redirect | /settings?section=tutor | NONE: destination owns scene | app/(app)/settings/tutor/page.tsx |
| /share/[token] | rendered page candidate | Public shared report | PLAIN | app/share/[token]/page.tsx |
| /sharing | rendered page candidate | Sharing | NEW-06 / PLAIN | app/(app)/sharing/page.tsx |
| /signup | rendered page candidate | Account entry | NEW-01 | app/(auth)/signup/page.tsx |
| /student-control | rendered page candidate | Public information | NEW-01 / PLAIN | app/student-control/page.tsx |
| /study | rendered page candidate | Study and practice | NEW-05 / PLAIN | app/(app)/study/page.tsx |
| /study-artifacts | page redirect | /study?view=saved (preserves class context) | NONE: destination owns scene | app/(app)/study-artifacts/page.tsx |
| /study-artifacts/[id] | rendered page candidate | Study and practice | NEW-05 / PLAIN | app/(app)/study-artifacts/[id]/page.tsx |
| /study-artifacts/new | page redirect | /study (preserves source/class context) | NONE: destination owns scene | app/(app)/study-artifacts/new/page.tsx |
| /study-buddy | middleware redirect | /assignments | NONE: destination owns scene | app/(app)/study-buddy/page.tsx |
| /study-groups | middleware redirect | /study | NONE: destination owns scene | app/(app)/study-groups/page.tsx |
| /study/material/[assignmentId] | rendered page candidate | Material reader | ORIGIN / PLAIN | app/(app)/study/material/[assignmentId]/page.tsx |
| /study/recall | rendered page candidate | Study and practice | NEW-05 / PLAIN | app/(app)/study/recall/page.tsx |
| /teacher-share | middleware redirect | /sharing | NONE: destination owns scene | app/(app)/teacher-share/page.tsx |
| /templates | middleware redirect | /quick-add | NONE: destination owns scene | app/(app)/templates/page.tsx |
| /timer | middleware redirect | /dashboard | NONE: destination owns scene | app/(app)/timer/page.tsx |
| /trust | rendered page candidate | Public information | NEW-01 / PLAIN | app/trust/page.tsx |
| /upgrade | rendered page candidate | Staff and access | NEW-06 / PLAIN | app/(app)/upgrade/page.tsx |
| /voice | middleware redirect | /notes/new?mode=voice | NONE: destination owns scene | app/(app)/voice/page.tsx |
| /wellness | rendered page candidate | Check-in history | NEW-04 / PLAIN | app/(app)/wellness/page.tsx |

## Boundaries and layouts

| Source | Type | Scope |
| --- | --- | --- |
| app/(app)/assignments/loading.tsx | loading | Authenticated /assignments |
| app/(app)/assignments/not-found.tsx | not-found | Authenticated /assignments |
| app/(app)/assignments/[id]/loading.tsx | loading | Authenticated /assignments/[id] |
| app/(app)/classes/[id]/loading.tsx | loading | Authenticated /classes/[id] |
| app/(app)/dashboard/layout.tsx | layout | Authenticated /dashboard |
| app/(app)/dashboard/loading.tsx | loading | Authenticated /dashboard |
| app/(app)/error.tsx | error | Authenticated / |
| app/(app)/layout.tsx | layout | Authenticated / |
| app/(app)/loading.tsx | loading | Authenticated / |
| app/(app)/not-found.tsx | not-found | Authenticated / |
| app/(app)/notes/loading.tsx | loading | Authenticated /notes |
| app/(app)/proof/loading.tsx | loading | Authenticated /proof |
| app/(app)/template.tsx | template | Authenticated / |
| app/(auth)/layout.tsx | layout | / |
| app/early-access/layout.tsx | layout | /early-access |
| app/error.tsx | error | / |
| app/landing-3d/logo-mask/layout.tsx | layout | /landing-3d/logo-mask |
| app/layout.tsx | layout | / |
| app/not-found.tsx | not-found | / |

## Static HTML surfaces

| URL | Source | Classification |
| --- | --- | --- |
| /assets/landing-cinematic-v3/index.html | public/assets/landing-cinematic-v3/index.html | bundled HTML asset / standalone preview; verify exposure |
| /assets/landing-cinematic-v3/privacy.html | public/assets/landing-cinematic-v3/privacy.html | bundled HTML asset / standalone preview; verify exposure |
| /privacy.html | public/privacy.html | bundled HTML asset / standalone preview; verify exposure |
| /trust.html | public/trust.html | bundled HTML asset / standalone preview; verify exposure |

## Technical handlers: result states belong to the invoking page

These routes are not additional designed rooms or customer pages. Their pending, denied, expired, download and retry results still need visible UI coverage.

| Endpoint | Source |
| --- | --- |
| /api/assignments/[id]/submission-artifact | app/api/assignments/[id]/submission-artifact/route.ts |
| /api/assignments/[id]/submitted-file/[fileId] | app/api/assignments/[id]/submitted-file/[fileId]/route.ts |
| /api/billing/checkout | app/api/billing/checkout/route.ts |
| /api/build-info | app/api/build-info/route.ts |
| /api/calendar.ics | app/api/calendar.ics/route.ts |
| /api/calendar/google-sync | app/api/calendar/google-sync/route.ts |
| /api/canva/callback | app/api/canva/callback/route.ts |
| /api/canva/connect | app/api/canva/connect/route.ts |
| /api/cron/account-deletion | app/api/cron/account-deletion/route.ts |
| /api/cron/ai-budget-reconciliation | app/api/cron/ai-budget-reconciliation/route.ts |
| /api/cron/assignment-media-cleanup | app/api/cron/assignment-media-cleanup/route.ts |
| /api/cron/lms-sync | app/api/cron/lms-sync/route.ts |
| /api/cron/media-retention | app/api/cron/media-retention/route.ts |
| /api/diana/assignment-realtime | app/api/diana/assignment-realtime/route.ts |
| /api/diana/assignment-realtime/reason | app/api/diana/assignment-realtime/reason/route.ts |
| /api/diana/break-down | app/api/diana/break-down/route.ts |
| /api/diana/openai-status | app/api/diana/openai-status/route.ts |
| /api/diana/study-buddy | app/api/diana/study-buddy/route.ts |
| /api/diana/study-buddy/stream | app/api/diana/study-buddy/stream/route.ts |
| /api/diana/today-realtime | app/api/diana/today-realtime/route.ts |
| /api/diana/today-tools | app/api/diana/today-tools/route.ts |
| /api/diana/voice-candidate | app/api/diana/voice-candidate/route.ts |
| /api/diana/voice-candidate/status | app/api/diana/voice-candidate/status/route.ts |
| /api/email/parent-digest | app/api/email/parent-digest/route.ts |
| /api/health | app/api/health/route.ts |
| /api/language-tool/check | app/api/language-tool/check/route.ts |
| /api/learning/attempts | app/api/learning/attempts/route.ts |
| /api/learning/chapter-practice | app/api/learning/chapter-practice/route.ts |
| /api/learning/course-practice | app/api/learning/course-practice/route.ts |
| /api/learning/course-review | app/api/learning/course-review/route.ts |
| /api/learning/documents | app/api/learning/documents/route.ts |
| /api/learning/exercises | app/api/learning/exercises/route.ts |
| /api/learning/index | app/api/learning/index/route.ts |
| /api/learning/ingest | app/api/learning/ingest/route.ts |
| /api/learning/jobs | app/api/learning/jobs/route.ts |
| /api/learning/local-recognition | app/api/learning/local-recognition/route.ts |
| /api/learning/material-practice | app/api/learning/material-practice/route.ts |
| /api/learning/offline-package | app/api/learning/offline-package/route.ts |
| /api/learning/problem-state | app/api/learning/problem-state/route.ts |
| /api/learning/response-review | app/api/learning/response-review/route.ts |
| /api/learning/retrieve | app/api/learning/retrieve/route.ts |
| /api/learning/session | app/api/learning/session/route.ts |
| /api/learning/source | app/api/learning/source/route.ts |
| /api/learning/sync | app/api/learning/sync/route.ts |
| /api/learning/tutor | app/api/learning/tutor/route.ts |
| /api/lms/canvas-oauth/callback | app/api/lms/canvas-oauth/callback/route.ts |
| /api/lms/canvas-oauth/start | app/api/lms/canvas-oauth/start/route.ts |
| /api/lms/canvas-sync | app/api/lms/canvas-sync/route.ts |
| /api/lms/classroom-sync | app/api/lms/classroom-sync/route.ts |
| /api/lms/gitlab-sync | app/api/lms/gitlab-sync/route.ts |
| /api/lms/google-oauth/callback | app/api/lms/google-oauth/callback/route.ts |
| /api/lms/google-oauth/start | app/api/lms/google-oauth/start/route.ts |
| /api/lms/ics-sync | app/api/lms/ics-sync/route.ts |
| /api/lms/sync-all | app/api/lms/sync-all/route.ts |
| /api/materials/source | app/api/materials/source/route.ts |
| /api/materials/textbook | app/api/materials/textbook/route.ts |
| /api/monitoring/error | app/api/monitoring/error/route.ts |
| /api/monitoring/event | app/api/monitoring/event/route.ts |
| /api/monitoring/vitals | app/api/monitoring/vitals/route.ts |
| /api/operations/metrics/prometheus | app/api/operations/metrics/prometheus/route.ts |
| /api/profile/handoff | app/api/profile/handoff/route.ts |
| /api/push/send-due | app/api/push/send-due/route.ts |
| /api/push/subscribe | app/api/push/subscribe/route.ts |
| /api/pwa/reminders | app/api/pwa/reminders/route.ts |
| /api/qa/anonymous-session | app/api/qa/anonymous-session/route.ts |
| /api/qa/onboarding-persistence | app/api/qa/onboarding-persistence/route.ts |
| /api/qa/reset-onboarding | app/api/qa/reset-onboarding/route.ts |
| /api/qa/suspense-gate | app/api/qa/suspense-gate/route.ts |
| /api/readiness | app/api/readiness/route.ts |
| /api/research/integrated-retrieval | app/api/research/integrated-retrieval/route.ts |
| /api/share-target | app/api/share-target/route.ts |
| /api/workers/authorize | app/api/workers/authorize/route.ts |
| /api/workers/claim | app/api/workers/claim/route.ts |
| /api/workers/complete | app/api/workers/complete/route.ts |
| /api/workers/metrics | app/api/workers/metrics/route.ts |
| /api/workers/metrics/prometheus | app/api/workers/metrics/prometheus/route.ts |
| /api/workers/version | app/api/workers/version/route.ts |
| /auth/callback | app/auth/callback/route.ts |
| /calendar/events/[id]/export | app/(app)/calendar/events/[id]/export/route.ts |
| /classes/[id]/mastery/export | app/(app)/classes/[id]/mastery/export/route.ts |
| /landing-3d/today-idle-review | app/landing-3d/today-idle-review/route.ts |
| /landing-3d/today-motion-review/clip | app/landing-3d/today-motion-review/clip/route.ts |
| /landing-3d/today-now-assets/relit-media | app/landing-3d/today-now-assets/relit-media/route.ts |
| /qa-session | app/qa-session/route.ts |

## Conditional desktop wrapper surfaces

These do not imply a shipped native channel and are not extra App Router pages.

- Native startup/backing window; electron/main.cjs; Conditional desktop wrapper; no shipped channel inferred; SYSTEM fallback.
- Standalone launch-failure data HTML; electron/main.cjs; Conditional desktop wrapper; no new room; SYSTEM fallback.

## Branding outside page files

- app/icon.tsx
- app/manifest.ts
- public/icons/diana-icon.svg
- app/layout.tsx
