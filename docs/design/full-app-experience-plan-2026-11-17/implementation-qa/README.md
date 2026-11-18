# Campus implementation QA

The browser harness is prepared, syntax checked, and lint checked. No rendered run has been performed yet. Run-specific folders will contain actual screenshots, an honest result JSON, and a readable report after the local production build is available.

Run from the Diana repository using the installed Playwright browser:

```powershell
node scripts/qa-campus-experience.mjs --plan
$env:QA_BASE_URL = 'http://127.0.0.1:3140'
node scripts/qa-campus-experience.mjs --keep-fixture
```

The harness creates one uniquely tagged synthetic adult account with fictional Casey Morgan / Ridgeview Campus information, authored Algebra II assignments, notes, saved practice, and seven fictional daily records. It sends no mail, starts no tutoring or media generation, and does not open checkout or Google consent. The browser blocks external provider requests. The sign-in rejection is supplied by a fake browser provider response. Password recovery email delivery and real Google account connection remain external verification tasks.

Credentials remain only in ignored `.tmp/campus-experience-qa/fixture-private.json`. They are never included in reports, screenshots, or console output. The harness only verifies and deletes the exact owner carrying its matching synthetic metadata marker. It does not enumerate existing users. Cleanup normally runs in `finally`; `--keep-fixture` is useful while captures are being refreshed.

```powershell
node scripts/qa-campus-experience.mjs --reuse-fixture --keep-fixture
node scripts/qa-campus-experience.mjs --cleanup-fixture
```

Default target dimensions are 1440 by 1000 desktop and 390 by 844 phone. Five-tab navigation is also checked at 768 by 1024. The route matrix currently includes 13 public states and 39 authenticated states per desktop/phone, plus both onboarding steps. Separate checks exercise More category selection, Class/Review refresh continuity, profile-backed reading font and spacing, and native PDF extraction followed by review and explicit Apply in the synthetic owner's IEP section.

The synthetic PDF contains harmless example accommodation text. Its bytes stay local; only the reviewed text enters the existing importer. The check verifies that upload alone does not change the profile, then verifies the reviewed application against that synthetic account. This is not an actual student IEP.

Product capture candidates are separate viewport images named `desktop-<state>-product.png` and `phone-<state>-product.png`: Lobby Now, Lobby Check-in, Work, workspace, saved practice, and Calendar. They use fictional school and student names, contain no school logo or real calendar data, and must be visually reviewed before replacing public site images.

A route only counts as exercised when it has a result row and screenshot. Passing this representative matrix does not prove every route, subject, assessment, group variation, device, or offline workflow. The harness deliberately blocks service workers to keep sessions isolated, so the `/offline` screenshot proves the recovery screen renders and does not prove a full disconnected reload or sync.

The interactive gate also samples the saved Light/Dark/Device setting, paired reading-paper contrast, selected quiz-choice contrast, high contrast, and reduced motion. A real synthetic Lobby save observes the subsequent `router.refresh` request and verifies it uses the updated `view=now` URL. Class and Hand-in checks separately exercise browser reload. These checks distinguish actual framework navigation from a source-only history assertion.

Targeted follow-up after the final incremental production build:

```powershell
node scripts/qa-campus-experience.mjs --reuse-fixture --keep-fixture --follow-up
```

This follow-up captures only the affected callback, Note detail, and practice pages on desktop/phone and repeats the corrected fake-provider sign-in, reading preference, theme/contrast, and actual Lobby router-refresh checks. It creates a new report; it does not overwrite the initial 110-state result. Local `127.0.0.1`, `localhost`, and `[::1]` redirects are permitted only on the exact selected local port. External providers remain blocked.
