# Diana Teen Visual + Future Mode 10/10 Build Plan

## Goal
Raise Diana's visible teen appeal from useful/calm to memorable, teen-native, and voice-forward while preserving the calm invariant: no shame language, no red error states, no streak pressure, no final-work generation, source-anchored help, accessibility-first UI, and no medical claims.

## Starting Scores
| Area | Starting Confidence | Target |
|---|---:|---:|
| Actual teen "would they love the look?" confidence | 8.0-8.3/10 | 10/10 repo-verifiable readiness, live-gated |
| Public landing first impression | 8.7/10 | 10/10 |
| Login/signup visual appeal | 7.5/10 | 10/10 |

## 10/10 Definition
Repo-verifiable 10/10 means the codebase and screenshots prove the product has the right surfaces, responsive behavior, and visual hierarchy. Market 10/10 still requires live high-school testing: 4 of 5 teens say Diana gets them unstuck faster than generic chat, 4 of 5 can explain the next move, and 0 confuse Diana's support with final work.

## Product Changes
- Public landing: make the first viewport a richer product moment with the existing next-5-minutes hero, a realistic product preview, a visible voice/future mode path, and student-owned proof cues.
- Login/signup: replace generic form-only impression with a command-center auth shell, voice/source/privacy cues, and Future Mode access on both desktop and mobile.
- Future Mode: add an optional persisted visual mode that changes the interface into a restrained futuristic command layer using grid, voice waveform, and listening states without sci-fi clutter.
- Voice communication: replace the `/voice` placeholder with a working voice/text surface that turns a spoken stuck point into one student-owned academic next move.
- Global capture: make Quick Capture accept mic dictation where the browser supports it, with text fallback.
- Navigation: make Voice reachable from the authenticated app shell.

## Proof Changes
- Extend `lib/teen-testing/ux-scorecard.ts` with visual confidence metrics for the three requested scores.
- Extend `npm run teen-ux-score` so visual confidence reaches 10 only when the new UI surfaces exist and responsive QA is clean.
- Render the visual confidence metrics on the proof page through `TeenNativeUxEvidencePanel`.

## Test Plan
- `npx vitest run lib/teen-testing/ux-scorecard.test.ts`
- `npm run typecheck`
- `npm run test:run`
- `npm run tone-audit`
- `npm run launch-audit`
- `npm run teen-ux-score`
- `npm run competitive-score`
- `npm run build`
- Browser screenshot pass at 375, 390, 768, 1024, and 1440 widths for landing, login, signup, and proof surfaces.

## Live Teen Test Questions
- Does this look like it was made for high school students?
- Would you rather open Diana or a generic chat tool when you are stuck?
- Does Future Mode make the product feel easier to talk to?
- Can you tell what Diana will do and what remains your work?
- Would you describe the look as calm, useful, and something you would come back to?
