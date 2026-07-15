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

## Verified Release Evidence

Evidence refreshed on 2026-07-14 for deployment `dpl_6Fu8iyyJAFtako1r2kgQZNoKtN1L` at `https://diana-umber.vercel.app`.

| Gate | Result |
|---|---|
| Production build | Pass. Next.js generated 70 static and dynamic route entries. |
| Type safety | Pass. `tsc --noEmit` reports no errors. |
| Unit and component tests | Pass. 126 files and 754 tests. |
| Responsive visual QA | Pass. 94 checks across public, authenticated, light, dark, phone, tablet, and desktop states. |
| Accessibility | Pass. 10 Axe checks with no serious or critical findings. |
| End-to-end student flows | Pass. Onboarding and adaptive Settings flows both complete. |
| Calm copy | Pass. 0 violations across 397 files. |
| Teen-native repository score | 10/10. The market claim remains gated on real high-school testing. |
| Production performance | Pass. Mobile Lighthouse 99 to 100, LCP 1.67 to 2.05 seconds, CLS at or below 0.001. Desktop Lighthouse 100, LCP 0.43 seconds. |
| Production canary | Pass. 15 authenticated route loads across three passes, with no page failures or console errors. |
| Migration parity | Pass. Every local migration version matches the linked project history. |
| Supabase security advisors | Pass for launch. 0 warnings and 1 informational notice for the service-only retention log table. |
| Vercel | Ready. Production alias points to the verified deployment. |

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

Lighthouse lab runs also record Total Blocking Time. The final production range is 0 to 13 ms on mobile and 0 ms on desktop.

## Critical-Path Coverage

`npm run launch-audit` requires test files beside at least 80 percent of the named critical paths. The current critical paths are scoring, FSRS, timer, AI safety, privacy export, social collaboration, analytics, offline store, mastery, and LMS sync.

## Launch Checklist

- Confirm linked migrations are current through `study_group_rpc_boundary`.
- Run the release gates above.
- Run authenticated browser smoke on dashboard, assignments, notes, flashcards, settings, export/privacy, groups, and insights.
- Confirm Edge Function secrets for AI/TTS providers before enabling green AI modes in production.
- Confirm data-retention job is scheduled with service-role credentials.

## Human Validation Still Required

- Complete the physical-device matrix for iOS Safari, Android Chrome, and managed Chromebooks.
- Run the five-student teen protocol. Market 10/10 requires 4 of 5 students to prefer Diana for stuck tasks and zero final-work confusion.
- Confirm production AI and TTS provider secrets before enabling green AI modes for a school launch.
- Confirm the retention scheduler and operational owner before handling real student records.
