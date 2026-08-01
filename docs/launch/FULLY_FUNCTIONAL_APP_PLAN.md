# Diana Fully Functional App Plan

## Release definition

Diana is release-ready only when the student can move from sign-in to Today, Work, an imported assignment, the subject workspace, Diana review, study practice, explicit submission, and a saved record without a broken route, cross-student data access, or an unverified provider result.

Passing a build is necessary but not sufficient. Every release also needs migration, Edge Function, browser, recovery, privacy, and operating evidence.

## 1. Application foundation

- Keep Node, Next.js, lockfile, and production dependencies supported and free of high-severity advisories.
- Require typecheck, the full Vitest suite, calm-copy audit, Edge Function parity, and a production build in CI.
- Keep `/api/health` public and shallow. Keep `/api/readiness` public, non-sensitive, and dependent on configuration plus Supabase reachability.
- Apply CSP, clickjacking, MIME sniffing, referrer, permissions, HSTS, and private-cache controls at the response boundary.
- Preserve a rollback artifact for source changes and confirm an available database backup before each migration release.

## 2. Identity, tenancy, and minors

- Derive ownership from the authenticated session in every server action, route, RPC, Storage operation, and Edge Function.
- Deny under-13 AI use without required consent and freeze AI access for every active or partially failed deletion state.
- Keep student uploads private, owner-prefixed, assignment-bound, size-limited, type-checked, and magic-byte verified.
- Store share-link digests instead of relying on plaintext lookups. Use staged, rolling-safe migrations when removing legacy fields.
- Keep OAuth and provider credentials in a service-role-only vault with atomic owner/provider writes.
- Run an external penetration test before a school or district production launch.

## 3. Assignment and study journeys

- Import instructions, rubrics, attachments, and linked material into the assignment source packet.
- Select the work profile automatically for math, worksheets, writing, research, history/DBQ, science/lab, reading, language, coding, arts, projects, PE/health, business, geography, engineering/trades, performance, CAD, and technical labs.
- Save structured work continuously and restore it after refresh or device change.
- Keep one Ask Diana surface grounded in the assignment packet and student work.
- Generate flashcards, study guides, and practice tests from the same owner-scoped source.
- Require explicit student confirmation before LMS submission and persist provider receipts or honest unsupported handoff states.

## 4. AI reliability and safety

- Route every paid model, transcription, and speech call through atomic quota reservation and settlement.
- Charge actual overage and late settlement idempotently; reconcile successful provider calls whose accounting response is interrupted.
- Apply deterministic immediate-danger handling plus contextual text/image moderation before generation and before output delivery.
- Fail closed when a minor-facing moderation or accounting dependency is unavailable.
- Never put raw student prompts, model output, credentials, or source documents in runtime logs.
- Keep all AI calls in Supabase Edge Functions with green/yellow/red policy enforcement, authorship logging, and calm redirects.

## 5. Integrations and background work

- Allow Canvas destinations only through an exact institution registry or approved allowlist, with HTTPS, DNS/private-range checks, safe ports, and rejected cross-origin redirects.
- Make Canvas, Google Classroom, Canva, Resend, push, media retention, and account deletion retries bounded and idempotent.
- Authenticate cron routes with constant-time bearer checks and keep them outside session redirects.
- Report unsupported provider capabilities explicitly. Never imply an import, upload, turn-in, email, or push succeeded without a provider receipt.
- Alert on repeated cron failures, reconciliation backlog, failed imports, deletion retries, and readiness failures.

## 6. Verification matrix

- Unit: pure domain logic, state machines, scoring, FSRS, timer, profile selection, source extraction, provider adapters, moderation, and accounting.
- Database: migration replay, RLS denial, RPC privilege checks, concurrency, idempotency, duplicate-submit prevention, and rollback rehearsal.
- Browser desktop/mobile: sign-up, onboarding, Today, Work, workspace autosave, review, practice, Classes, Calendar, Search, Record, Wellness, Sharing, Settings, export, and deletion.
- Accessibility: automated Axe checks plus keyboard order, focus visibility, zoom, reduced motion, contrast, labels, and screen-reader announcements.
- Resilience: provider timeout, expired OAuth, bad attachment, offline save/reopen, duplicate request, denied submission, partial deletion, and failed settlement.
- Performance: route budget, Core Web Vitals, assignment workspace interaction latency, upload progress, and no layout overflow at supported viewports.

## 7. Deployment sequence

1. Run the complete repository and browser gates against a clean build.
2. Confirm a recent staging backup and record the rollback point.
3. Deploy additive, rolling-compatible database migrations.
4. Deploy Edge Functions in their required migration order.
5. Deploy a Vercel preview using staging services.
6. Run authenticated canaries from Work through workspace, review, practice, and submission.
7. Verify health, readiness, cron authentication, logs, quota settlement, and tenant isolation.
8. Promote the same verified artifact to production.
9. Run production canaries, monitor errors and jobs, then remove legacy compatibility fields in a later release.

## 8. Human and operational gates

- Product owner signs off on the student journey and the supported-subject boundary.
- A qualified privacy/legal reviewer signs off on COPPA, FERPA, school agreements, retention, deletion, subprocessors, and incident handling.
- A security reviewer signs off on the threat model, penetration test, secrets, provider scopes, and rollback evidence.
- A teacher validates assignment fidelity and grading boundaries.
- Teen usability testing validates comprehension, trust, accessibility, and recovery from errors.
- Support owns an incident runbook, provider outage copy, deletion escalation, and school onboarding procedure.

## Current release gate

Do not promote production while any security review finding, migration dry run, authenticated browser journey, readiness probe, backup/restore check, or human signoff remains unresolved.

## Verified baseline as of 2026-07-31

- Production build: passed with Next.js 15.5.22 across 85 generated pages.
- TypeScript and repository tests: typecheck passed; 277 Vitest files and 1,606 tests passed.
- Launch audit: passed, including 212 critical-path tests.
- Browser quality: 87 responsive checks passed across five desktop and mobile widths in light and dark modes, with no blank routes or horizontal overflow.
- Core Work journey: four browser flows passed for desktop, mobile, workspace autosave/reload, practice generation/completion, assignment return, explicit submission, and the saved receipt.
- Accessibility and resilience: five assignment-workspace browser checks passed for keyboard/focus behavior, 200% reflow, reduced motion, offline/reconnect autosave, and expired-session recovery.
- ScreenDesign inventory: the source-removal audit passes with 568 production files, 46 canonical states, and 29 provenance-tracked local assets.
- AI services: 31 local Edge Functions are active in staging with JWT verification; function parity passed with three explicitly deprecated remote functions allowlisted.
- Live AI smoke: 13 of 13 authenticated staging checks passed, including the cross-student ownership boundary.
- Database: staging migrations are current through `20260731205000`; linked database lint is clean; all public tables have RLS; the grade-receipt write ACL was removed and verified.
- Security: the independent release-surface review reported no unresolved critical or high finding. Dependency audit reported zero production vulnerabilities.
- Browser security: same-origin forms and Next.js Server Actions are covered by a regression test; cross-site referrers remain suppressed through the `same-origin` response policy.
- Current preview: deployment `dpl_F8tvDyC87U7mcu4aESvYTdbcVMEG` at `https://diana-ij827nkgg-teamcarrillo405-hubs-projects.vercel.app`; Vercel built all 85 pages and `/api/readiness` passed configuration, Auth, database, and storage probes.
- Recovery: the guarded recovery workflow passed 10 safety tests and a non-connecting PostgreSQL tool preflight. An approved disposable target and protected backup archive are still required for the restore rehearsal.
- Provider canary: the deterministic Canvas/Classroom canary passed 10 of 10 checks with intercepted network traffic. Preview-origin CORS was deployed across the student Edge Functions and verified with a live preflight. Real provider credentials and courses are still required for external canaries.
- Operations: privacy-safe readiness, cron age, retry/dead-letter, worker lease/backlog, tenant error, and ambiguous-submission alerts are implemented with a Prometheus example and operator runbook. Named alert owners remain unassigned.
- Remaining evidence gaps: a staging restore rehearsal, real Canvas and Google Classroom canaries, Chromebook performance evidence, named monitoring ownership, and external product/privacy/security/teacher/teen approvals.

## Definition of fully functional

The app is fully functional when all five conditions hold at the same time:

1. A student can sign up, onboard, connect or upload schoolwork, complete work in the automatically selected subject workspace, save and reopen it, ask Diana for grounded help, practice, submit with confirmation, and find the result in Record.
2. Every supported subject profile has a validated fixture, a useful native work surface, source-aware review, save/restore, export, and an honest fallback when Diana cannot perform a native action.
3. Canvas and Google Classroom imports and supported submissions succeed with real provider credentials, receipts, retries, expired-consent recovery, and duplicate-submit protection.
4. Tenant isolation, minor safety, privacy export/deletion, quotas, moderation, background jobs, backups, monitoring, and incident response are verified under failure as well as success.
5. Product, teacher, teen usability, privacy/legal, and security reviewers approve the same immutable release candidate that will be promoted.

## Recommended delivery order

### Milestone 1: Release candidate and provider test environment

- Create a clean release branch or commit from the reviewed working tree so the artifact is reproducible.
- Configure a Vercel preview against staging Supabase and staging-only model/provider credentials.
- Provision test Canvas and Google Classroom courses, assignments, rubrics, attachments, students, and teacher accounts.
- Verify `/api/health`, `/api/readiness`, cron authentication, required secrets, migration ledger, and Edge Function versions from the preview.

Exit: one immutable preview URL and recorded build identifier can be tested without relying on a developer machine.

### Milestone 2: End-to-end student loop

- Run Canvas, Classroom, manual upload, and no-source assignments through Work, automatic profile selection, workspace, autosave, Diana review, practice, submission, and Record.
- Cover text entry, file upload, unsupported submission, expired OAuth, denied scope, provider timeout, duplicate click, refresh, logout/relogin, and a second student account.
- Repair each defect at its owning layer and add a regression test before closing it.

Exit: every supported provider path has a receipt or an explicit unsupported handoff, and no student can read or mutate another student's data.

### Milestone 3: Subject and assessment completeness

- Validate all subject profiles with teacher-authored fixtures, including math, writing, DBQ, lab, reading, language, coding, arts, PE/health, accounting, economics, geography, engineering/trades, performance, CAD, and technical labs.
- Validate practice quizzes and tests for generation grounding, answer formats, scoring, explanations, retry behavior, accommodations, save/reopen, and authorship records.
- Record capability limits for graphing, equation editing, code execution, spreadsheets, drawing/CAD, and audio/video review. A missing native tool must have a clear, usable fallback.

Exit: the subject matrix is complete, reviewed by a teacher, and linked to deterministic fixtures and browser coverage.

### Milestone 4: Reliability, privacy, and recovery hardening

- Run migration replay and rollback tests in a disposable database and perform a documented staging restore rehearsal.
- Exercise account deletion, privacy export, token settlement, failed moderation, dead-letter recovery, media cleanup, LMS sync, email, and push retries.
- Add alert thresholds and dashboards for readiness failure, Edge Function errors, provider failures, reconciliation backlog, deletion retries, job age, and submission ambiguity.
- Assign an owner and runbook to every alert. Remove student work, credentials, and provider payloads from logs and error trackers.

Exit: a staging incident drill demonstrates detection, diagnosis, recovery, communication, and evidence preservation.

### Milestone 5: Product quality on school hardware

- Test keyboard-only use, screen readers, 200% zoom, reduced motion, dyslexia settings, visible focus, touch targets, and all empty/loading/error states.
- Measure Core Web Vitals and workspace interaction latency on a representative school Chromebook and constrained network.
- Validate offline save/reopen, interrupted uploads, expired sessions, browser back/forward behavior, and cross-device restoration.
- Run structured teen usability sessions focused on finding Work, starting an assignment, understanding Diana's role, recovering from errors, and submitting confidently.

Exit: accessibility has no serious or critical issue, performance stays within the recorded budgets, and teen testing finds no task-blocking comprehension problem.

### Milestone 6: Release and controlled rollout

- Complete professional penetration testing, privacy/legal review, teacher fidelity review, and school agreement approval.
- Rotate production secrets, confirm backups, freeze the release artifact, and rehearse rollback.
- Promote the verified preview artifact, run production canaries, and start with a small pilot cohort.
- Monitor errors, provider receipts, AI safety events, support requests, and assignment completion before expanding the rollout.

Exit: the pilot observation window closes without an unresolved release blocker, and rollback remains immediately available.

## Engineering ownership map

| Release area | Primary code surface | Next engineering work |
| --- | --- | --- |
| Assignment import | `lib/assignment-sources.ts`, `lib/lms/materials.ts`, `lib/lms/sync.ts`, `app/(app)/assignments/[id]/workspace/source-actions.ts` | Run real provider fixtures, harden partial imports, preserve source anchors, and expose retry states without duplicate records. |
| Work profile and tools | `lib/assignment-profile.ts`, `lib/assignment-workspace.ts`, `components/assignment-workspace.tsx`, `components/assignment-native-tools.tsx`, `components/assignment-technical-tools.tsx` | Complete the teacher-reviewed subject matrix and verify every native capability or fallback on school hardware. |
| Diana review | `supabase/functions/assignment-review/index.ts`, `lib/ai/safety.ts`, assignment workspace actions | Validate source citations, policy modes, minor safety, prompt-injection resistance, quota settlement, and calm recovery when AI is unavailable. |
| Practice quizzes and tests | `supabase/functions/study-artifacts/index.ts`, `app/(app)/study-artifacts/actions.ts`, `app/(app)/study-artifacts/[id]/practice-session.tsx`, `lib/study-helper/` | Add teacher-authored golden sets, accommodation coverage, scoring audits, answer-review clarity, and browser tests from assignment source to saved results. |
| Submission | `lib/lms/submission.ts`, `lib/lms/submission-capabilities.ts`, `app/(app)/assignments/[id]/actions.ts`, `app/(app)/assignments/[id]/delivery-actions.ts` | Run real Canvas/Classroom canaries, test every capability combination, reconcile ambiguous receipts, and prove duplicate-submit prevention under concurrency. |
| Data protection | `supabase/migrations/`, `lib/security/`, account export/deletion actions, Storage policies | Rehearse restore and deletion, test RLS with two students and service roles, rotate secrets, and complete the external penetration test. |
| Background jobs | `app/api/cron/`, `app/api/workers/`, Edge Functions, queue migrations | Add dead-letter dashboards, age/backlog alerts, bounded retries, ownership, and incident-runbook links. |
| Observability | `app/api/monitoring/`, `app/api/health/`, `app/api/readiness/`, deployment configuration | Connect error, event, and vital ingestion to staging and production dashboards; add release markers and privacy-safe correlation IDs. |
| Release automation | `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/`, `scripts/`, `vercel.json` | Make the verified build, test, migration, parity, browser, and canary commands required CI/deployment gates and retain their evidence artifacts. |

## Debugging and defect closure

Every release defect must have a single record containing severity, route, account role, assignment/provider state, correlation ID, reproduction, owning layer, regression test, fix, verification, and recovery instructions. Triage in this order:

1. P0: cross-student access, unsafe AI output, credential exposure, data loss, false submission success, or inability to restore service.
2. P1: blocked sign-in/onboarding, assignment import, workspace save, Diana review, practice, submission, export, or deletion.
3. P2: broken secondary route, inaccessible control, incorrect empty/error state, provider retry defect, or severe performance regression.
4. P3: visual inconsistency, copy defect, or non-blocking polish.

A defect is closed only after the focused regression, adjacent contract tests, typecheck, and affected desktop/mobile browser journey pass. Production data edits, silent catch blocks, optimistic success messages, and clearing a cache are recovery actions, not permanent fixes.

## Execution board

| Phase | Required work | Exit evidence | Status |
| --- | --- | --- | --- |
| 0. Stabilize | Close upload, deletion, submission, credential, quota, and tenant-isolation findings. Pin reproducible dependencies. | Independent code review has no unresolved high or critical finding; focused adversarial tests pass. | Completed |
| 1. Database | Re-run the migration dry run, record the backup, apply pending additive migrations to staging, verify the exact migration ledger, RPC privileges, RLS, indexes, and recovery jobs. | Database release-blocker harness and Supabase advisors pass against staging. | Migrations and linked lint complete through `20260731205000`; restore drill pending |
| 2. AI services | Deploy all local Edge Functions, configure origins and model secrets, verify policy modes, minor consent, budget reservation, moderation, logging, and provider-error recovery. | Function parity and live authenticated smoke tests pass; no raw student content appears in logs. | Staging complete |
| 3. Core student loop | Verify sign-in, onboarding, Today, Work, source import, automatic workspace, autosave, Diana review, practice, explicit hand-in, LMS receipt, and Record. | Desktop and mobile browser journeys pass for Canvas, Classroom, manual upload, and no-source fallback. | Work, autosave, practice, reload, and receipt browser flows pass; real provider canaries pending |
| 4. Subject coverage | Exercise every work profile and native tool, including math, writing, DBQ, lab, reading, language, coding, arts, PE/health, business, geography, engineering/trades, performance, CAD, and technical labs. | Fixture matrix proves correct profile, save/restore, review grounding, export, and honest unsupported states. | Automated fixtures pass; teacher validation pending |
| 5. Secondary pages | Finish Classes, Calendar, Search, Record, Wellness, Sharing, Settings, privacy export, deletion, study guides, flashcards, practice quizzes, and tests. Remove dead routes and duplicate navigation. | Route inventory has an owner and disposition for every page; browser coverage has no broken link or blank screen. | Automated route coverage complete; product signoff pending |
| 6. Product quality | Complete responsive, accessibility, performance, offline/retry, provider-failure, duplicate-request, and cross-device restoration checks. | Axe, keyboard, viewport, Core Web Vitals, resilience, and data-integrity gates meet their budgets. | 87 responsive checks and 5 focused accessibility/resilience checks pass; physical device, performance, and teen testing pending |
| 7. Operations | Configure monitoring, alerts, cron ownership, incident response, backups, restore rehearsal, secrets rotation, support workflow, and provider outage copy. | Named owner signs each runbook and a staging incident drill succeeds. | Cron ledger, job-age metrics, privacy-safe client errors, and recovery tooling complete; alert owners and restore drill pending |
| 8. Release | Deploy one immutable preview artifact, run the full canary, obtain product, teacher, teen usability, privacy/legal, and security signoff, then promote that same artifact. | Production canary passes and rollback remains available during the observation window. | Verified staging preview deployed; clean release commit and external approvals pending |

## Debugging protocol

1. Reproduce every defect against an isolated local or staging URL and capture route, account role, assignment/provider state, console output, request failure, and correlation ID.
2. Reduce the defect to the lowest responsible layer: UI state, server action, route, Edge Function, provider adapter, Storage, RPC, RLS, or migration.
3. Add a failing regression test before the fix whenever the failure can be made deterministic.
4. Fix the owning layer without weakening authorization, calm-copy rules, confirmation boundaries, or provider truthfulness.
5. Re-run the focused test, adjacent contract tests, typecheck, and the affected browser journey.
6. Record remaining risk and operational recovery steps. A hidden exception, optimistic success message, or manual database edit is not a fix.

## Release budgets

- Security: zero unresolved critical or high findings in the reviewed release surface.
- Correctness: zero failing deterministic tests, zero migration drift, and zero false provider-success states.
- Reliability: all durable jobs are idempotent, retry-bounded, monitored, and recoverable from a dead letter.
- Accessibility: no serious or critical automated issue, complete keyboard access, visible focus, and usable 200% zoom.
- Performance: no horizontal overflow; the assignment workspace remains interactive on a typical school Chromebook and avoids loading subject tools until selected.
- Privacy: owner scoping is enforced server-side; exports and deletion are tested; logs and analytics exclude student work and secrets.

## External launch blockers

Code completion cannot replace these gates: production OAuth credentials, provider approval and scopes, school agreements, privacy/legal review, a professional penetration test, teacher fidelity review, teen usability testing, and an owned incident-response process. The staging app can be made fully testable before those approvals, but it must not be represented as school-ready production until they are signed.
