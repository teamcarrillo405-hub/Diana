# Campus implementation browser QA

Run: campus-brightness-desktop-final-2026-11-18
Target: http://127.0.0.1:3140

Brightness correction only: current gallery scenes and entry/setup states at desktop and phone sizes. No unrelated interaction or subject regression rerun.

- Rendered states: 4/4 passed.
- Interactive checks: 4/4 passed.
- Fixture cleanup: deleted-and-verified.

Only rows in results.json have been exercised. Passing screenshots need visual review; this report does not certify every route or subject.

| Viewport | State | Result | Screenshot |
|---|---|---|---|
| desktop | more-study | Pass | [Open](desktop-more-study.png) |
| desktop | settings-profile | Pass | [Open](desktop-settings-profile.png) |
| desktop | settings-tutor | Pass | [Open](desktop-settings-tutor.png) |
| desktop | settings-security | Pass | [Open](desktop-settings-security.png) |

## Interactive checks

- Pass: polish-layout-desktop-more-study
- Pass: polish-layout-desktop-settings-profile
- Pass: polish-layout-desktop-settings-tutor
- Pass: polish-layout-desktop-settings-security

## Excluded

- Real user data and passwords
- Real Google consent, Calendar account linking, mail delivery, provider billing, and AI/media generation
- Subject accuracy, learning outcomes, every assessment/course/group variation, and offline device guarantees
