# Diana v2.0 Launch Readiness

Evidence refreshed on 2026-07-14 for the production app at `https://diana-umber.vercel.app`.

## Current release

| Surface | Result |
|---|---|
| Vercel production | Ready. Deployment `dpl_7qZQY8DupvdaoUDP6RaGbtWWoepq` is aliased to the canonical production URL. |
| Supabase project | Linked project `oitipayrriupcitgmzju` is current through `20260715033431_inbox_schema_advisor_fixes`. |
| Student Edge Functions | Twelve student AI functions are active with JWT verification and shared provider routing. |
| Production AI smoke | Pass. 13 of 13 checks, including all twelve functions and a cross-student ownership denial. |
| Production browser canary | Pass. 15 of 15 authenticated route loads across three passes, all HTTP 200, with zero console errors. |

## Repository gates

| Gate | Result |
|---|---|
| Production build | Pass. Next.js 15.5.20 generated 70 route entries. |
| Type safety and lint | Pass. `tsc --noEmit` reports no errors. |
| Unit and component tests | Pass. 127 files and 757 tests. |
| Calm copy | Pass. 0 violations across 405 audited files. The audit includes rendered em-dash detection. |
| Dependency audit | Pass. 0 production vulnerabilities. |
| Launch audit | Pass. 100 percent critical-path coverage. |
| Responsive browser QA | Pass. 94 checks across public, authenticated, light, dark, phone, tablet, and desktop states. |
| End-to-end flows | Pass. 2 flows cover onboarding and adaptive Settings surfaces. |
| Accessibility | Pass. 10 Axe checks found no serious or critical issues across five core routes in light and dark modes. |
| GitHub PR checks | Pass. Repository gates, worker-image builds, and Vercel preview checks are green on PR #5. |

## Production data and AI evidence

- Canonical inbox columns, constraints, indexes, and row-level security are applied.
- Inbox ownership policies use the optimized authenticated-user lookup.
- The inbox classifier verifies the bearer token and hides rows owned by another student.
- Production AI smoke creates temporary test rows, verifies responses, checks the ownership boundary, and removes temporary data.
- Study artifacts use a source-anchored deterministic fallback when the provider is slow or unavailable.
- OpenAI is the default student provider. Anthropic is optional and not required for the current production path.
- OpenAI and ElevenLabs production secrets are present. Secret values are not stored in the repository.
- The daily retention job `coppa-purge-daily` runs at `0 9 * * *` and calls the approved deletion workflow.
- Supabase security advisors report no warnings. The remaining informational notice is for the service-only retention log table.

## Release gates to rerun for every candidate

```text
npm run typecheck
npm run test:run
npm run tone-audit
npm run launch-audit
npm run build
npm audit --omit=dev
```

Browser and production checks:

```text
npm run qa:responsive
npm run test:e2e
npx playwright test tests/a11y.spec.ts --reporter=line --workers=1
npm run qa:student-ai-live
```

## Accessibility and performance contract

- Keyboard: primary navigation, assignment actions, notes, timer, flashcards, sharing, export, and Settings remain usable without a pointer.
- Screen reader: routes use headings, useful link or button names, status labels, progress labels, and live status regions.
- Motion: reduced-motion settings disable optional animated affordances where supported.
- Contrast: high-contrast controls and the amber attention palette preserve the calm invariant.
- Reading support: OpenDyslexic, Lexend, Atkinson, bionic reading, line focus, pacing, text-to-speech, and synchronized read-aloud remain available.
- LCP budget: at or below 2.5 seconds.
- FID budget: at or below 100 milliseconds.
- CLS budget: at or below 0.1.

## Human validation still required

These steps cannot be completed by repository or production automation:

Record all four gates in `docs/launch/HUMAN_SIGNOFF.md`. That sheet is the authoritative human handoff for the release candidate.

1. Test the current production build on physical iOS Safari, Android Chrome, and a managed Chromebook.
2. Run the five-student teen protocol. The market claim requires at least four of five students to prefer Diana for stuck tasks and zero final-work confusion.
3. Assign a named operational owner for student-record incidents, deletion requests, provider failures, and launch-day monitoring.
4. Approve and merge PR #5. The branch is deployed and verified, but merge authorization remains a human decision.

Do not call the school launch fully approved until these four gates are signed off.
