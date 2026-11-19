# Campus implementation browser QA

Run: campus-brightness-2026-11-18
Target: http://127.0.0.1:3140

Brightness correction only: current gallery scenes and entry/setup states at desktop and phone sizes. No unrelated interaction or subject regression rerun.

- Rendered states: 35/36 passed.
- Interactive checks: 23/23 passed.
- Fixture cleanup: deleted-and-verified.

Only rows in results.json have been exercised. Passing screenshots need visual review; this report does not certify every route or subject.

| Viewport | State | Result | Screenshot |
|---|---|---|---|
| desktop | sign-in | Pass | [Open](desktop-sign-in.png) |
| desktop | signup | Pass | [Open](desktop-signup.png) |
| desktop | forgot-password | Pass | [Open](desktop-forgot-password.png) |
| desktop | offline | Pass | [Open](desktop-offline.png) |
| desktop | lobby-now | Pass | [Open](desktop-lobby-now.png) |
| desktop | work | Pass | [Open](desktop-work.png) |
| desktop | classes | Pass | [Open](desktop-classes.png) |
| desktop | calendar | Pass | [Open](desktop-calendar.png) |
| desktop | more-study | Pass | [Open](desktop-more-study.png) |
| desktop | note-detail | Pass | [Open](desktop-note-detail.png) |
| desktop | quiz-hub | Pass | [Open](desktop-quiz-hub.png) |
| desktop | practice | Pass | [Open](desktop-practice.png) |
| desktop | check-in-history | Pass | [Open](desktop-check-in-history.png) |
| desktop | settings-profile | Browser page error occurred. | [Open](desktop-settings-profile.png) |
| desktop | settings-tutor | Pass | [Open](desktop-settings-tutor.png) |
| desktop | settings-security | Pass | [Open](desktop-settings-security.png) |
| desktop | onboarding-personalize | Pass | [Open](desktop-onboarding-personalize.png) |
| desktop | onboarding-connect | Pass | [Open](desktop-onboarding-connect.png) |
| phone | sign-in | Pass | [Open](phone-sign-in.png) |
| phone | signup | Pass | [Open](phone-signup.png) |
| phone | forgot-password | Pass | [Open](phone-forgot-password.png) |
| phone | offline | Pass | [Open](phone-offline.png) |
| phone | lobby-now | Pass | [Open](phone-lobby-now.png) |
| phone | work | Pass | [Open](phone-work.png) |
| phone | classes | Pass | [Open](phone-classes.png) |
| phone | calendar | Pass | [Open](phone-calendar.png) |
| phone | more-study | Pass | [Open](phone-more-study.png) |
| phone | note-detail | Pass | [Open](phone-note-detail.png) |
| phone | quiz-hub | Pass | [Open](phone-quiz-hub.png) |
| phone | practice | Pass | [Open](phone-practice.png) |
| phone | check-in-history | Pass | [Open](phone-check-in-history.png) |
| phone | settings-profile | Pass | [Open](phone-settings-profile.png) |
| phone | settings-tutor | Pass | [Open](phone-settings-tutor.png) |
| phone | settings-security | Pass | [Open](phone-settings-security.png) |
| phone | onboarding-personalize | Pass | [Open](phone-onboarding-personalize.png) |
| phone | onboarding-connect | Pass | [Open](phone-onboarding-connect.png) |

## Interactive checks

- Pass: polish-layout-desktop-lobby-now
- Pass: polish-layout-desktop-work
- Pass: polish-layout-desktop-classes
- Pass: polish-layout-desktop-calendar
- Pass: polish-layout-desktop-more-study
- Pass: polish-layout-desktop-note-detail
- Pass: polish-layout-desktop-quiz-hub
- Pass: polish-layout-desktop-practice
- Pass: polish-layout-desktop-check-in-history
- Pass: polish-layout-desktop-settings-tutor
- Pass: polish-layout-desktop-settings-security
- Pass: polish-layout-phone-lobby-now
- Pass: polish-layout-phone-work
- Pass: polish-layout-phone-classes
- Pass: polish-layout-phone-calendar
- Pass: polish-layout-phone-more-study
- Pass: polish-layout-phone-note-detail
- Pass: polish-layout-phone-quiz-hub
- Pass: polish-layout-phone-practice
- Pass: polish-layout-phone-check-in-history
- Pass: polish-layout-phone-settings-profile
- Pass: polish-layout-phone-settings-tutor
- Pass: polish-layout-phone-settings-security

## Excluded

- Real user data and passwords
- Real Google consent, Calendar account linking, mail delivery, provider billing, and AI/media generation
- Subject accuracy, learning outcomes, every assessment/course/group variation, and offline device guarantees
