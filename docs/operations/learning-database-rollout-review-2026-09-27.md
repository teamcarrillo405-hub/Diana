# Database and Edge rollout review

## Approved scope and order

The user approved the database rollout on September 27 after the prior request named `learning_recognition_provenance_guard` and `learning_experiment_usage_receipts`. Both were subsequently applied, with provider-assigned versions `20260928043131` and `20260928043147`; `learning-experiment` version 8 was deployed after catalog verification. The date difference is UTC versus America/Los_Angeles. Neither migration depends on the three response-review migrations. See [deployment evidence](../engineering/learning-database-release-2026-09-27.md).

The recognition guard depends on the existing `learning_problem_records`/`learning_problem_revisions` schema and `extensions.hmac`/`extensions.digest`. It does not provision a signing secret. Browser recognition saves a student-entered draft and does not need a signed machine claim. Existing manual responses remain valid. A new machine-origin response without proof is intentionally rejected. An identical historical unproved machine response may be preserved in a later revision; the exception does not permit new unproved machine records.

The accounting migration depends on the existing experiment reservation ledger and `learning_settle_experiment`. It does not backfill, refund, restart, or reinterpret earlier uncertain charges. Service-role RPCs persist usage and monetary settlement atomically before output moderation. Authenticated students cannot read receipts or call those accounting functions.

## Verification

- `scripts/learning/verify-production-learning-rollout.sql` is read-only. Expect one receipt table with RLS, no anonymous/authenticated read, service SELECT but no direct write. Expect service-only execution of the three accounting RPCs. Recognition readiness permits authenticated execution; the private trigger function does not. Expect an enabled BEFORE INSERT recognition trigger and no anonymous/authenticated private-schema or key-table access.
- `scripts/learning/probe-production-recognition-rollback.sql` is an optional bounded transaction using the existing synthetic QA owner/class. It creates only random new notebook records, checks typed and browser voice drafts, rejects an unsigned machine claim, and rolls everything back. It does not modify real student records, auth identities, signing keys, or money.
- Existing `test-recognition-real-schema.sql`, `test-experiment-accounting.sql`, and concurrency fixtures are **isolated database tests only**. Do not run them in production. Their synthetic users and failure triggers are deliberately unsuitable for a live schema.
- Focused local contracts passed: 15 tests across recognition, recognition provenance, and experiment accounting on September 27. The initial sandbox worker startup was blocked; the approved local test invocation passed outside the sandbox.

## Edge source closure

Deploy `learning-experiment/index.ts` with these local imports, preserving relative paths:

- `_shared/auth-policy.ts`
- `_shared/cors.ts`
- `_shared/learning/approved-fixtures.ts`
- `_shared/learning/experiment-accounting.ts`
- `_shared/learning/rollout.ts`
- `_shared/safety.ts`
- `_shared/student-auth.ts`
- `_shared/student-handler.ts`
- `_shared/student-model.ts`
- `_shared/system-prompts.ts`

The closure also uses declared remote imports (`jsr:@supabase/functions-js/edge-runtime.d.ts`, pinned npm packages). Preserve the function's existing authentication deployment configuration. A schema rollout or function deployment must not turn on experiments, change operator IDs, update prices, or send a paid provider request merely as a health check. An unauthenticated request should be rejected and must never invoke the provider.

## Separate educator-review work

`learning_response_review_delivery`, `learning_response_review_seal`, and `learning_response_review_invitations` form their own ordered dependency chain. They govern disclosure to two qualified educators, signed packets, current credentials, adult eligibility, and invitations. They are not prerequisites for the two approved migrations or this Edge deployment. They remain a separate release scope with gates off; do not combine their rollout with the present approval or fabricate reviewer eligibility.
