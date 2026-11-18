# Campus experience implementation and review

November 17, 2026, America/Los_Angeles. Base: `25477d594afdd83a7ac5b91ee9e09ddbadf579cf`. Review branch: `codex/full-campus-experience`.

The planned application and design changes are implemented and verified locally. Production is unchanged pending the requested desktop/phone visual review. Email delivery and public Google verification remain external release work; neither is represented as completed.

[Open the no-sign-in desktop and phone gallery](previews/index.html). It contains 20 paired views with fictional student data. [Original page inventory and plan](README.md).

## Delivered

| Area | Result |
|---|---|
| Shared design | Scene selection is separate from primary navigation. Campus wordmark, slab navigation, school colors, brush selection, responsive assets, focus/paper modes, accessibility preferences and neutral guest identity carry through the program. Legacy light-screen overrides now exclude every campus shell rather than one version number. |
| Entry and account | Campus Sign in, Create account, Forgot password, Reset password, link-result states and account-security controls. Safe destinations, short-lived recovery proof bound to verified user/session/revision, replay protection, current-password verification and a stable saved-password confirmation. Existing account passwords still work. |
| Onboarding | The actual two-step Personalize/Connect flow, optional school identity, and capability-aware provider choices. |
| More, Search, Settings | Commons/Services rooms, all Settings sections plus Security, one school palette control, honest provider availability, required Canvas school address and genuinely read-only profile view. Obsolete competing accent/background controls are no longer mounted. |
| Work and Classes depth | Accepted layouts retained. Responsive shallow headers, neutral unknown-subject art, URL-persistent Class and Review/Hand-in sections, owned return context and explicit student-controlled submission. |
| Notes and study | Library and Seminar rooms; readable paper, questions and controls; saved reading preferences; retained navigation identity. Quiz selected answers have paired light/dark colors rather than light text on a light selection. |
| Check-in history and Sharing | Courtyard/Services headers, neutral missing values and optional participation. Temporary food/water/break choices remain temporary. Public recipients retain limited aggregate content; expired links and print are verified. |
| Loading, offline, native shell | Truthful indeterminate loading, campus recovery/fallback screens, neutral app icons, public-asset-only caching and a waiting service-worker update. Native error renderer has safe escaping, a safe retry and phone reflow. |
| Public pages | Canonical privacy notice, fixed legacy policy aliases, current fictional product captures with actual phone variants, updated public metadata/brand and outdated launch/connection copy removed. |

The original inventory has 93 physical page files. Three new public page routes were added: `/forgot-password`, `/reset-password`, `/auth/result`. Redirects and gated development specimens remain intentional. No extra production dashboards or game mechanics were added.

## Background delivery

Six new campus families: Entry, Commons, Library, Seminar, Student Services and Courtyard. The four accepted primary rooms remain.

Higgsfield Seedream 4.5 was verified Active under Subscription, Unlimited mode was checked, and each final generation control explicitly said Unlimited. Paid credits spent: **0**. Each source is 5120 by 2880; delivered native 3840 by 2160 masters and separate 1920 desktop and 920-wide portrait derivatives. All 18 derivatives meet the proposed budgets: 4K at most 444,296 bytes, desktop at most 192,322 bytes, phone at most 139,958 bytes. Source/output hashes, crop and focal coordinates are in `public/assets/campus/manifest.json`. A neutral CSS gradient survives image failure.

Original PNG masters and the complete diagnostic screenshot matrices stay local. Only optimized product assets, curated previews and sanitized evidence belong in the review branch.

## Verification

- Full regression run: 683 files, 5,417 passed tests, 4 skipped and two obsolete source/wordmark assertions. Those assertions were updated to the actual preserved age gate and campus wordmark. The affected suites and navigation/age checks then passed: 48 tests in 7 files. The 16-minute full suite was not repeated.
- Final production compilation and TypeScript passed. Earlier full lint found one unused native-renderer argument, corrected and checked directly; subsequent production lint/type checks and scoped changed-script checks passed. The final print-only build reused the already completed lint gate.
- Launch audit passed, including 230 critical-path tests, reviewed dependency remediation, type checking and calm-copy checks. Calm-copy audit has 85 non-blocking existing warnings, zero blocking findings. Under-13 access remains blocked; child-release prerequisites were not enabled.
- Browser matrix: 110 initial captured states. Real contrast/spacing problems were corrected; 12/12 affected page captures then passed. Reading preferences, dark selected-answer contrast (11.03:1), high contrast, reduced motion and calm synthetic sign-in rejection passed on desktop/phone. Native IEP PDF extraction/review/Apply and five-tab navigation passed on desktop, phone and tablet.
- Lobby save/refresh/reload passed on desktop/phone. An absent `view` parameter intentionally means Now. The earlier explicit-`view=now` assertion was a harness false positive, not a remaining product defect.
- Actual provider-backed authentication passed 12/12 desktop/phone checks with 14 captures. A real password-save display issue was fixed and retested. Recovery-token reuse, stale proof on render/submission and an unconfirmed current password were denied. Disposable account deletion was verified.
- Production service worker: a dedicated proxy physically cut the network. Saved packs remained searchable, an offline draft survived reload, an unvisited assignment route received the public saved-packs fallback, public font/scene assets cached, and sensitive HTML/API/RSC/private files did not enter shared Cache Storage. Native renderer follow-up passed 10/10, including 320/390px reflow and escaped diagnostics. Native Electron itself was not launched.
- Actual Hand-in Download PDF produced a parsed, visually reviewed one-page synthetic PDF; owner/assignment binding was verified and the work remained unsubmitted. Valid/expired public summary and restricted aggregate content passed desktop/phone. Its printed PDF now has margins and excludes the Print action; final print follow-up passed 3/3.
- Final function-trace gate passed: 185 routes, largest estimated function 39,344,237 bytes, below the 240 MB gate.
- Gallery verification: all 40 images decoded, filters work, and desktop/phone have no overflow or browser errors.

[Browser findings and corrected evidence](implementation-qa/findings-and-corrections.md) · [Authentication proof](implementation-qa/auth-recovery/README.md) · [Offline proof](implementation-qa/offline/README.md) · [PDF and public-share proof](implementation-qa/pdf/README.md).

This is representative rendered and functional verification, not exhaustive certification of every route permutation, assignment subject or device. Existing tutoring, IEP time adjustments, teacher policy, ownership, authorship and export logic were preserved.

## Menu polish follow-up

November 18: stronger brush selection and primary actions, bounded Settings and Quiz composition, brighter secondary room depth with opaque controls, compact 93px phone / 95px tablet navigation, and corrected campus-name wrapping and profile initials. Saved reading preferences still apply to form fields. [Polish changes and final desktop/phone evidence](implementation-qa/polish.md). The gallery now includes the final captures. No new images were generated, and production remains held for visual review.

## Cloud verification follow-up

Read-only checks on November 18 confirm draft [PR #36](https://github.com/teamcarrillo405-hub/Diana/pull/36) remains open and mergeable at application commit `9aa94135`. [CI](https://github.com/teamcarrillo405-hub/Diana/actions/runs/44259810131) and [Worker image](https://github.com/teamcarrillo405-hub/Diana/actions/runs/44259809956) completed successfully. The full migration job passed after one retry for a runner port conflict, with no source change.

[Authentication release readiness](implementation-qa/release-readiness.md) separates provider-backed recovery proof from the remaining SMTP, template, redirect and real-mailbox checks. The hosted email settings could not be inspected because the Dashboard requires private sign-in. Production was not changed. This follow-up adds documentation only; the verified application checks were not repeated.

## Cleanup and release boundary

The primary synthetic account and child records were deleted and deletion rechecked. Every separate recovery owner was deleted and verified. The synthetic submission storage object and database binding were removed and verified. No real student account, password, Google connection or calendar event was changed. No emails were sent.

Production Vercel metadata confirms the existing production LMS signing key, Google secret and Calendar flag remain configured; secret values were not decrypted or printed. Local auth testing used an ephemeral in-memory test key. Existing Google testing-mode limitations remain; Classroom/Canvas were not broadly enabled.

Before publishing the new visual families, review the desktop/phone gallery as previously requested. Production email delivery, recovery-email template, allowed redirects and the emailed PKCE round trip still need external verification. The tested token-hash recovery path does not prove SMTP delivery. Public Google verification remains a separate owner/provider process.

The pre-existing untracked `docs/design/college-campus-page-audit-2026-11-15.md` is preserved outside this change. No credentials, local browser state or full raw media masters belong in the commit.
