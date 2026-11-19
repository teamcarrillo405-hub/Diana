# Campus implementation browser QA

Run: campus-2026-11-18T07-06-30-446Z
Target: http://127.0.0.1:3140

Targeted superseding evidence for initial reading, contrast, navigation, callback, and diagnostic-selector findings. Initial 110-state report remains unchanged.

- Rendered states: 12/12 passed.
- Interactive checks: 6/8 passed.
- Fixture cleanup: retained-by-request.

Only rows in results.json have been exercised. Passing screenshots need visual review; this report does not certify every route or subject.

| Viewport | State | Result | Screenshot |
|---|---|---|---|
| desktop | public-home | Pass | [Open](desktop-public-home.png) |
| desktop | auth-callback-empty | Pass | [Open](desktop-auth-callback-empty.png) |
| desktop | note-detail | Pass | [Open](desktop-note-detail.png) |
| desktop | practice | Pass | [Open](desktop-practice.png) |
| desktop | check-in-history | Pass | [Open](desktop-check-in-history.png) |
| desktop | account-access | Pass | [Open](desktop-account-access.png) |
| phone | public-home | Pass | [Open](phone-public-home.png) |
| phone | auth-callback-empty | Pass | [Open](phone-auth-callback-empty.png) |
| phone | note-detail | Pass | [Open](phone-note-detail.png) |
| phone | practice | Pass | [Open](phone-practice.png) |
| phone | check-in-history | Pass | [Open](phone-check-in-history.png) |
| phone | account-access | Pass | [Open](phone-account-access.png) |

## Interactive checks

- Pass: fake-sign-in-error-desktop
- Pass: reading-preferences-desktop
- Pass: theme-and-contrast-desktop
- Needs review: lobby-router-refresh-desktop: router.refresh requested a stale Lobby URL: /dashboard?_rsc=b0iRp4K9J-CG1-IY
- Pass: fake-sign-in-error-phone
- Pass: reading-preferences-phone
- Pass: theme-and-contrast-phone
- Needs review: lobby-router-refresh-phone: router.refresh requested a stale Lobby URL: /dashboard?_rsc=b0iRp4K9J-CG1-IY

## Excluded

- Real user data and passwords
- Real Google consent, Calendar account linking, mail delivery, provider billing, and AI/media generation
- Subject accuracy, learning outcomes, every assessment/course/group variation, and offline device guarantees
