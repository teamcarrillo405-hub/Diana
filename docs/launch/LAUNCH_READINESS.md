# Diana v2.0 Launch Readiness

## Release Gates

| Gate | Evidence |
|------|----------|
| Build | `npm run build` |
| Type safety | `npm run typecheck` |
| Unit/component coverage | `npm run test:run` |
| Calm copy | `npm run tone-audit` |
| Launch checklist | `npm run launch-audit` |
| Migration parity | `npx supabase migration list --linked` |

## Accessibility

- Keyboard: primary app navigation, assignment actions, timer controls, notes, flashcards, export/privacy, and groups must be reachable without pointer input.
- Screen reader: app routes use headings, labels, link text, and live regions for status messages.
- Motion: reduced-motion profile class disables animated affordances where CSS supports it.
- Contrast: high-contrast profile class and amber caution palette avoid red error states.
- Reading support: OpenDyslexic, Lexend, Atkinson, bionic reading, line focus, visual pacing, TTS, and synchronized read-aloud are available in authenticated reading surfaces.

## Performance Budgets

- LCP: less than or equal to 2.5 seconds.
- FID: less than or equal to 100 ms.
- CLS: less than or equal to 0.1.
- Runtime telemetry: `/api/monitoring/vitals` writes route-level budget status and `/insights` shows over-budget reports.

## Critical-Path Coverage

`npm run launch-audit` requires test files beside at least 80 percent of the named critical paths. The current critical paths are scoring, FSRS, timer, AI safety, privacy export, social collaboration, analytics, offline store, mastery, and LMS sync.

## Launch Checklist

- Confirm linked migrations are current through `0034`.
- Run the release gates above.
- Run authenticated browser smoke on dashboard, assignments, notes, flashcards, settings, export/privacy, groups, and insights.
- Confirm Edge Function secrets for AI/TTS providers before enabling green AI modes in production.
- Confirm data-retention job is scheduled with service-role credentials.
