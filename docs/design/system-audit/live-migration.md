# Gamer design migration: released

Updated 2026-09-24. The user authorized finishing the previews, promoting the new design, retiring old screens and verifying connected workflows. The public release is complete.

## Published release

- Public app: https://diana-umber.vercel.app
- Vercel project: diana / prj_lI3gtW45D2xNmAb4b34frYDL2R5L
- Published deployment: dpl_BeHpu2Dt7rQnJdm8fyptBdLwsS3y
- Immutable release: https://diana-jnx7vp8uh-teamcarrillo405-hubs-projects.vercel.app
- Promotion succeeded and the public alias resolves to this READY deployment.
- Previous public release for rollback: dpl_DDTcEg5BMCkqzpwP2PcFuT9QvHXx, commit bd7a32d81e2a0ec29f086eb9113232d2c52b1fa6.
- Supabase project shared by local and public app: oitipayrriupcitgmzju.
- Updated functions: study-buddy v8 and study-artifacts v23, both ACTIVE with JWT verification.

## Completed design and connections

- Primary navigation: Lobby, Work, Classes, Calendar, More.
- Signature studio environment, dark frosted panels, pink selection, violet actions, mint completion and amber attention.
- Short labels, no redundant decorative problem numbering, unified Quiz with recall.
- Lobby Start/Resume opens the actual subject workspace with Diana, source material and work tools.
- Work, Classes, Calendar, Capture, Notes, Search, Record, Sharing, Wellness and Settings use actual application routes and data.
- Authentication, onboarding, public, privacy and recovery surfaces match the new design.
- Old preview and obsolete page entry points redirect to their replacements. Shared server actions and unused archived fixtures remain where needed; old preview screens are not the active entry points.
- Student ownership, reading accommodations, serialized draft saves, tutoring policy and explicit hand-in are preserved. Done remains distinct from submitted.
- Newer published cinematic landing assets and the Next 15.5.26 dependency were preserved.

## Functional verification

Desktop rendered checks covered Lobby, Work, Classes, Calendar, Settings, Notes list/detail, Record, Sharing, capture review, Quiz source selection, actual math/history workspaces, Search, Wellness, sign-in, signup, Trust and privacy/terms tabs.

Phone checks at 390px covered Settings, Work, Classes, Calendar, Quiz, More, math workspace and sign-in. Math was also checked at 834px. No horizontal overflow was observed in those checked routes.

Calendar create/save/soft delete/undo were verified with disposable event 3cd36561-e7d4-4ad2-93d1-da559013ee56, which is soft deleted. No student assignment was submitted or externally shared for testing. The explicit hand-in guard is covered by tests.

The global Diana drawer returned a real reply. The actual math workspace returned and saved a genuine bounded hint; that conversation remained present after navigating away and back.

Quiz generation initially exposed an invalid JSON-mode provider request and a missing connection to assignment problem text. Both were repaired. Actual problem content now precedes longer tutor metadata, and generated questions test subject skills rather than assignment directions. No student draft answers are included in the problem source list.

Live-backend quiz 056a34eb-3ce3-4c2e-8666-a6cbf55918d6 contains exactly three distinct algebra questions: 4x + 7 = 31, 3(x - 2) = 21, and 7x - 4 = 3x + 20. Correct answers 6, 9 and 6 were independently checked, saved and scored. Completion showed three saved responses and 100% on auto-checked questions. Earlier QA quiz ced962eb-faab-4d40-abdb-8d4108ecb83d verified that completion persists after reload.

Authenticated end-to-end checks ran through the local application connected to the live backend. The public browser was not signed in. Post-promotion public verification covered the actual published sign-in page, correct studio artwork, no browser warnings/errors, and HTTP success for signup, Trust, privacy and artwork. The three user-referenced review URLs were confirmed to redirect to the new sign-in shell with the correct authenticated destination: dashboard, assignments and study.

## Engineering gates

- Final hosted build passed on Next 15.5.26, including lint, types, route generation and function packaging.
- Latest local TypeScript and scoped lint passed.
- Full suite: 466 test files, 3247 passing assertions and four skipped. Two asynchronous signup fixture errors were isolated, fixed and checked with a clean targeted run.
- Final edge request/accounting regressions: 27/27 passed.
- Final quiz, practice and provider regressions: 27/27 passed.
- Final assignment-source and practice regressions: 16/16 passed.
- Entry, signup and onboarding regressions: 14/14 passed.
- Cinematic timing: 9/9 passed.
- Tone audit: no blocking violations, 65 advisory warnings.
- Secret scan passed across 3942 releasable source files and Git history.

## Usage correction and release notes

The user approved continuing after the specific service deployment and subsequent two-record usage correction requests. Two provider HTTP 400 rejections had incorrectly retained 12,009 units each. The approved correction marked only reservations 78bfae4e-7b59-4b96-b239-9cbb2f4b8ffb and 300f6095-b3e9-464e-ad8e-7f96d33f61fc as released and restored 24,018 units for owner ad37c468-67f5-4b5f-9e28-b5e947a4075c. Recorded usage moved from 42,783 to 18,765 at correction time; the daily limit stayed 50,000 and audit rows were retained. Future explicit validation rejections use the existing known-not-consumed release path. Ambiguous transport/server failures retain conservative accounting.

Calendar migration 20260924010000 was applied to the shared backend. The app URL normalizer removes a leading BOM found in the hosted public URL setting. Legacy global CSS now excludes new public and entry shells, so auth headings and actions retain their intended colors.

Use normal Vercel uploads for this worktree. Archive mode recursively included ignored directory contents in an earlier unpromoted candidate, which was removed. Later normal-upload contents were inspected; ignored folders had empty placeholders only. Local artifacts and env files were excluded. No public release used the removed candidate.

Evidence: artifacts/live-migration/promotion.log, hosted-build.log, public-route-checks.json, retired-route-checks.json, final-service-regressions.log, production-sync.json and earlier verification logs. These artifacts are ignored by deployment. Browser tabs retain the published sign-in and authenticated local Lobby for review.
