# Campus implementation browser QA

Run: campus-polish-2026-11-18
Target: http://127.0.0.1:3140

Focused visual polish: selected menu, form, paper and navigation states at desktop, phone, narrow phone and tablet widths. No full application regression rerun.

- Rendered states: 42/42 passed.
- Interactive checks: 14/44 passed.
- Fixture cleanup: deleted-and-verified.

Only rows in results.json have been exercised. Passing screenshots need visual review; this report does not certify every route or subject.

| Viewport | State | Result | Screenshot |
|---|---|---|---|
| desktop | lobby-now | Pass | [Open](desktop-lobby-now.png) |
| desktop | work | Pass | [Open](desktop-work.png) |
| desktop | workspace | Pass | [Open](desktop-workspace.png) |
| desktop | classes | Pass | [Open](desktop-classes.png) |
| desktop | calendar | Pass | [Open](desktop-calendar.png) |
| desktop | more-study | Pass | [Open](desktop-more-study.png) |
| desktop | notes | Pass | [Open](desktop-notes.png) |
| desktop | note-detail | Pass | [Open](desktop-note-detail.png) |
| desktop | quiz-hub | Pass | [Open](desktop-quiz-hub.png) |
| desktop | practice | Pass | [Open](desktop-practice.png) |
| desktop | check-in-history | Pass | [Open](desktop-check-in-history.png) |
| desktop | settings-profile | Pass | [Open](desktop-settings-profile.png) |
| desktop | settings-appearance | Pass | [Open](desktop-settings-appearance.png) |
| desktop | settings-security | Pass | [Open](desktop-settings-security.png) |
| phone | lobby-now | Pass | [Open](phone-lobby-now.png) |
| phone | work | Pass | [Open](phone-work.png) |
| phone | workspace | Pass | [Open](phone-workspace.png) |
| phone | classes | Pass | [Open](phone-classes.png) |
| phone | calendar | Pass | [Open](phone-calendar.png) |
| phone | more-study | Pass | [Open](phone-more-study.png) |
| phone | notes | Pass | [Open](phone-notes.png) |
| phone | note-detail | Pass | [Open](phone-note-detail.png) |
| phone | quiz-hub | Pass | [Open](phone-quiz-hub.png) |
| phone | practice | Pass | [Open](phone-practice.png) |
| phone | check-in-history | Pass | [Open](phone-check-in-history.png) |
| phone | settings-profile | Pass | [Open](phone-settings-profile.png) |
| phone | settings-appearance | Pass | [Open](phone-settings-appearance.png) |
| phone | settings-security | Pass | [Open](phone-settings-security.png) |
| narrow | lobby-now | Pass | [Open](narrow-lobby-now.png) |
| narrow | work | Pass | [Open](narrow-work.png) |
| narrow | classes | Pass | [Open](narrow-classes.png) |
| narrow | calendar | Pass | [Open](narrow-calendar.png) |
| narrow | more-study | Pass | [Open](narrow-more-study.png) |
| narrow | quiz-hub | Pass | [Open](narrow-quiz-hub.png) |
| narrow | settings-profile | Pass | [Open](narrow-settings-profile.png) |
| tablet | lobby-now | Pass | [Open](tablet-lobby-now.png) |
| tablet | work | Pass | [Open](tablet-work.png) |
| tablet | classes | Pass | [Open](tablet-classes.png) |
| tablet | calendar | Pass | [Open](tablet-calendar.png) |
| tablet | more-study | Pass | [Open](tablet-more-study.png) |
| tablet | quiz-hub | Pass | [Open](tablet-quiz-hub.png) |
| tablet | settings-profile | Pass | [Open](tablet-settings-profile.png) |

## Interactive checks

- Pass: polish-layout-desktop-lobby-now
- Pass: polish-layout-desktop-work
- Pass: polish-layout-desktop-workspace
- Pass: polish-layout-desktop-classes
- Pass: polish-layout-desktop-calendar
- Pass: polish-layout-desktop-more-study
- Pass: polish-layout-desktop-notes
- Pass: polish-layout-desktop-note-detail
- Pass: polish-layout-desktop-quiz-hub
- Pass: polish-layout-desktop-practice
- Pass: polish-layout-desktop-check-in-history
- Pass: polish-layout-desktop-settings-profile
- Pass: polish-layout-desktop-settings-appearance
- Pass: polish-layout-desktop-settings-security
- Needs review: polish-interactions-desktop: Quiz action has no keyboard focus indicator.
- Needs review: polish-layout-phone-lobby-now: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-work: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-workspace: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-classes: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-calendar: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-more-study: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-notes: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-note-detail: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-quiz-hub: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-practice: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-check-in-history: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-settings-profile: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-settings-appearance: Compact navigation consumes more than 100px.
- Needs review: polish-layout-phone-settings-security: Compact navigation consumes more than 100px.
- Needs review: polish-interactions-phone: Quiz action has no keyboard focus indicator.
- Needs review: polish-layout-narrow-lobby-now: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-work: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-classes: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-calendar: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-more-study: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-quiz-hub: Compact navigation consumes more than 100px.
- Needs review: polish-layout-narrow-settings-profile: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-lobby-now: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-work: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-classes: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-calendar: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-more-study: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-quiz-hub: Compact navigation consumes more than 100px.
- Needs review: polish-layout-tablet-settings-profile: Compact navigation consumes more than 100px.

## Excluded

- Real user data and passwords
- Real Google consent, Calendar account linking, mail delivery, provider billing, and AI/media generation
- Subject accuracy, learning outcomes, every assessment/course/group variation, and offline device guarantees
