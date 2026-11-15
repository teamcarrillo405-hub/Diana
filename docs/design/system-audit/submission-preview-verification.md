# Submission review preview

Route: `http://127.0.0.1:3027/landing-3d/submission-concept-review`

This is a local fixture review of W06. It does not import the live submit page, server actions, Supabase client, PDF generator, or provider adapters. Checks, file preparation, pending state, and receipts exist only in component memory. Reload resets the flow.

## Screen contract

- A Review rail item shows the outgoing work as the primary reading surface. Meaningful problem numbers stay with the work; the menu itself has no decorative numbering.
- Final checks gate the Handoff action. Incomplete work stays visible with an amber warning. A changed artifact blocks handoff until the sample review is refreshed.
- Manual hand-in separates sample PDF preparation from the student's explicit confirmation. Its receipt says that Diana recorded the hand-in and has not verified school delivery.
- Connected text and PDF fixtures name the destination, type, and exact output before confirmation. Confirmation first reaches a pending state. Only a sample accepted response opens the receipt. Unavailable and not-accepted states expose recovery without claiming school acceptance.
- Accepted and graded receipts are read-only. The graded sample contains no invented grade value.

## Verification on 2026-09-23

- Rendered at 1440 × 900 desktop, 820 × 1024 tablet, 390 × 844 phone, and 320 × 780 narrow phone. The tablet keeps a left rail and moves checks below the central content. The phone uses horizontal stage tabs. The 320 px page had no horizontal document overflow.
- Exercised manual checks, sample PDF preparation, confirmation, and receipt in the browser. Exercised connected pending and accepted states at phone width. Arrow navigation moved selected stage and focus; receipt stayed locked until available. Focus moved to Receipt after the accepted sample transition.
- Focused Vitest component tests, TypeScript check, and ESLint passed. Browser inspection found no current preview error after the development server was restarted with its existing local environment. An earlier missing-environment error remains in the browser's historical log from before that restart.

## Limits before live integration

The sample artifact is static text. There is no real PDF, file download, payload digest, stale digest comparison, idempotency key, provider request, school acceptance check, persistence, or receipt ID. The current live route and its server-owned boundaries remain unchanged. Production integration requires those contracts and a separate approval for this page.
