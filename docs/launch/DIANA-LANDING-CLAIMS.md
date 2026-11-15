# Diana Public Claim Ledger

Scope: the canonical public route, `/`.

The public page is one cinematic implementation:

`app/page.tsx` -> `components/canonical-public-landing/canonical-public-landing.jsx` -> `components/canonical-public-landing/cinematic-v3/cinematic-landing.tsx`.

The published story, styles, and media are under `public/assets/landing-cinematic-v3`. No alternate public landing or legacy rollback route remains in this checkout.

## Claim status

| Claim | Status | Evidence and release boundary |
| --- | --- | --- |
| Your AI Tutor | VERIFIED | The canonical narrative supplies the page `h1` and hero copy. This is a product category, not a claim of human or certified tutoring. |
| Homework organization and a clear next step | VERIFIED | The public narrative shows the Lobby and Work surfaces; the product logic is in `lib/scoring/next-five-minutes.ts` and the assignment workspace. Do not promise completion or an always-optimal rank. |
| Help that keeps student thinking and turn-in decisions in student control | VERIFIED | The public narrative, `app/student-control/page.tsx`, the assignment state machine, and authorship logging all preserve the student's control. Do not present AI output as the student's work. |
| Support across classes | VERIFIED, bounded | Diana supports a shared assignment workflow. Do not claim equal specialist depth, accredited instruction, or universal tool parity. |
| File and source context | VERIFIED | The current quick-add and assignment workspace flows accept supported sources and preserve their context. Browser and device upload smoke remains release QA. |
| Google Classroom and Canvas connections | PLANNED | Local flows and deterministic coverage exist, but a disposable staging OAuth, sync, submit, reconciliation, and cleanup receipt is required before present-tense marketing. |
| Live realtime help | PLANNED | The public narrative may describe it as planned or conditional only until deployed service, authorization, latency, failure, and real-browser evidence are complete. |
| Pricing, subscription tiers, and launch date | PLANNED | Do not treat the page's future-facing FAQ wording as a binding release or pricing commitment without owner approval. |
| Early-access signup | IMPLEMENTED, deployment pending | The shared `EarlyAccessForm` invokes the early-access Edge Function. Do not promise an invite or email delivery until a deployed lifecycle smoke passes. |
| Native iOS and Android availability | PLANNED | Do not show app-store badges or launch dates until store approvals and supported-device testing exist. |
| Food, meal, calorie, diet, or nutrition tracking | BLOCKED | It is not a Diana landing capability and must not be introduced without a separate safety, privacy, and product review. |

## Release evidence still required

1. Canonical desktop and mobile browser smoke for navigation, waitlist validation, legal links, reduced motion, keyboard access, and no horizontal overflow.
2. A production performance check against the budgets in `docs/design/diana-cinematic-landing.md`.
3. Disposable Google Classroom and Canvas staging receipts before either connection is marketed as live.
4. A deployed early-access signup, confirmation, unsubscribe, rate-limit, and failure-state smoke.
5. Student comprehension evidence and independent visual review before calling the landing production-ready.

## Non-negotiable wording limits

- Do not promise grades, time savings, submission success, or guaranteed lifestyle outcomes.
- Do not describe Diana as a human tutor, plagiarism detector, medical advisor, or food-tracking service.
- Keep AI-policy and teacher-rule limits visible wherever a workflow could affect schoolwork authorship.
