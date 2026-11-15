# Integrated diagnostic continuation, September 29

## Current outcome and repair

The latest approved run reached the provider once. The raw Responses body was
complete, with 1,523 input, 179 output and 1,702 total tokens, but supplemental
`input_tokens_details` and `output_tokens_details` objects exposed a validator bug:
it required every usage property to be a number. The handler retained the raw body
and withheld the response before output screening. The second request was not
attempted; the unrelated no-evidence case stayed unscheduled. All three remain in
the diagnostic denominator, with zero released responses and no semantic score.

Using the exact raw-body/request hashes, reservation, owner and pinned prices,
the existing usage RPC settled **3 cents**. The monetary month now records 544
cents spent and the pre-existing unrelated 1-cent hold. The immutable original
`generation_error` output state and raw record remain unchanged; reconciliation
is a separate accounting receipt, not a recovered successful release. QA token
counters remain 168,516, the cap is restored to 50,000, and both permits are revoked.

The fix validates explicit billing counters and identifier types, allowing
ancillary usage details without persisting them through the content-free RPC.
Independent review, 62 focused tests and native Deno compilation pass. The exact
single-runtime-file repair over the previously reviewed null-plan package deployed
through the same connector as hosted version 10. Runtime readback, JWT, null plan,
disabled authenticated 404 and unauthenticated 401 checks pass. No retry or further
model call occurred.

- Run closeout: `artifacts/learning-engine/research/integrated-diagnostic-receipt-approved-20260929/operational-closeout-v2.json`.
- Reconciliation: `artifacts/learning-engine/research/integrated-diagnostic-receipt-approved-20260929/reconciliation.json`.
- Deployed repair: `artifacts/learning-engine/release/integrated-v7-null-accounting-deployment-20260929/ready.json`.

## Latest authorization and deployment history

The user's subsequent explicit approval covers the exact v6 replacement in
`oitipayrriupcitgmzju` and the separate plan
`db66b22a3ddc2f9740bb387ecbf634dad6c2ec313e447165ef179a28fc1148b3`.
The current attempt is recorded in
`artifacts/learning-engine/research/integrated-diagnostic-receipt-approved-20260929/`.
The 25-cent reservation, $1 cap, two generation/four moderation maximum, no-retry
identities and September 30 06:44:23 UTC price expiry are unchanged. QA-only cap
190,000 is allowed only after both permit readiness checks; cleanup restores
50,000 without rewriting usage counters and disables the endpoint.

After the initial automatic approval-review rejection, authenticated read-only
project and organization queries established the exact destination's ownership.
The same deployment connector then accepted the approved frozen package as
version 7 with JWT verification enabled. All 15 returned files match; three
type-only modules are absent from the hosted runtime bundle. Authenticated disabled
404 and unauthenticated 401 checks pass. No alternate upload route was used.
Ready receipt:
`artifacts/learning-engine/release/integrated-v6-authorized-deployment-20260929/ready.json`
(SHA-256 `93bd0679062f9b5dcf4a5feff6342c696f46185e3b1d924c8ab6b3bd6f0a3f9b`).

The operational diagnostic preflight is in progress. This section supersedes the
historical pending-approval and blocked-deployment statements below; prior attempts
are retained separately and their outcomes are not overwritten.

## Earlier authorization

The user answered the pending bounded-run approval with: **"yes i approve. continue"**.
This authorizes the separately proposed two-request GPT-6 Astra diagnostic:

- Canonical plan `592a5461295a3b24455c94ac35e7d7a02f5dcf919f0d6e57d116f322aa257077`.
- Two generation calls, at most four moderation calls, 25-cent reservation and $1 hard cap.
- The existing frozen request bodies and source pins; no retries.
- Temporary synthetic QA-owner daily token cap of 175,000, restored to 50,000 in cleanup.
- Preserve usage counters; disable the isolated research endpoint in cleanup.

The earlier stopped run and its zero settlement remain unchanged. Approval does not
authorize additional experiments, model downloads, training recipes or student model
activation. Educator validation remains deferred.

## Execution

The exact frozen v4 proposal passed native Deno 2.5.6 compilation with source and
configuration hashes checked before and after. Receipt:
`artifacts/learning-engine/release/integrated-deno-check-1790689812164.json`.

Hosted source reconciliation passed. The first request stopped with HTTP 503 before
generation because `learning_begin_assignment_assistance` requires the database
assistance control, which remains staged off. One input moderation call completed;
zero generation calls, provider usage receipts or raw outputs exist. The second
request was not attempted. The third case remains unscheduled with no evidence.

The research endpoint is disabled, verified by authenticated 404 and gateway 401.
The QA cap was restored to 50,000. The generic token guard conservatively charged
7,343 tokens before the invocation stopped, leaving 161,173 used; no counter was
reset or refunded. Locked zero-generation checks allowed the exact unused 12-cent
reservation to settle at zero. Monthly spending remains 541 cents and the unrelated
one-cent hold remains. There was no retry.

Actual-run evidence: `artifacts/learning-engine/research/integrated-diagnostic-approved-20260929/postflight.json`
(SHA-256 `c04f275d2d5ee17a570d2113e1faa8916548bcae72d410bade34f0e94d41184d`).

## Parallel engineering

The prior quota stop revealed that automatic cancellation needs a database operation
that can settle only a definitely unstarted reservation. The existing settlement
function also accepts started rows. An additive, service-only cancellation function
and corresponding handler checks were implemented separately. The 66 focused tests,
lint and full typecheck passed. After the run shut down, the additive database RPC
was installed and a rollback-only hosted smoke passed identity, state, receipt,
output, replay, grants and money-conservation checks. The first smoke exposed a
missing synthetic signup birth date; that fixture was corrected and both outcomes
are preserved. No synthetic profile remains and monetary balances are unchanged.
Concurrency was not exercised. The frozen diagnostic package remains unchanged;
the new handler has not yet been deployed.

Database verification: `artifacts/learning-engine/release/integrated-unstarted-cancellation-hosted-verification-20260929.json`.
The source fix now checks exact research authorization before reservation or
moderation. A separate service-only research permit binds the approved request,
plan, owner, assignment, provider-body hash, assistance-payload hash and expiry.
Its receipt writes the ordinary assignment-wide assistance ledger without
activating global independence enforcement or changing ordinary product RPCs.

The additive permit schema is installed as `20260929141355`. Its hosted
rollback-only smoke passed payload parity, exact identity, teen/adult policy,
guardian withdrawal, deletion, class policy, expiry, revocation, replay and
provider/output fences. Postflight confirms zero permits, synthetic profiles or
synthetic assignments, unchanged production function hashes, global enforcement
false, and spending/reservations still 541/1 cents. No real request was authorized.
The final combined local sweep passed **133 tests across eight files**. Full
typecheck, scoped lint and independent source review also passed. Database
concurrency remains untested.

Hosted verification: `artifacts/learning-engine/release/integrated-research-assistance-hosted-verification-20260929.json`.
The frozen v5 package retains a literal null plan and JWT checks; native Deno
compilation passed with all 19 source/configuration hashes verified before and
after. Automatic approval review rejected its deployment before mutation, stating
that destination ownership and authorization for the exact target/source payload
were not established by the prior generic approval. No retry or alternate tool
was used. Fresh readback confirms the existing live function remains at version 6,
JWT enabled, with all 14 remote files byte-identical before and after the rejection.
Its source bundle digest matches the earlier stopped run; the new repair is not live.
No generation retry is part of these engineering repairs.

Prepared null-package manifest: `23bacfe3e793e072e598a576f4886622d561044c583281ff4cc683a44d91707d`.
Exact blocked target: Supabase project `oitipayrriupcitgmzju`, function
`learning-integrated-execution`. Evidence:
`artifacts/learning-engine/release/integrated-execution-null-repair-deployment-blocked-20260929-v5.json`.

A separate offline diagnostic assembler now binds the actual source capture,
execution plan, response envelopes and available accounting evidence. Nineteen
synthetic tests, full typecheck, lint and independent code review pass. The actual
stopped-run assembly retains all three rows, with zero released responses, zero
raw provider receipts and unavailable judgments. Previous runs appear only as hash
references and are not merged. The existing integrated evaluation format assumes
a different generation configuration and fresh family attestations; those fields
were not invented to make this diagnostic fit.

Verification: `artifacts/learning-engine/research/integrated-diagnostic-review-20260929-v2/verification.json`
(SHA-256 `cce0912e1784297c9d2f5ed8ccba7a85acea248840dfd5cd45feaa90fe34a780`).
Independent review: `artifacts/learning-engine/release/integrated-diagnostic-independent-code-review-20260929-v2.json`.

## Separate next proposal, not authorized

A concrete new proposal is prepared in
`artifacts/learning-engine/research/integrated-diagnostic-receipt-proposal-20260929/`.
It retains the two provider bodies, model and source pins, uses fresh request
identities, reserves 25 cents under a $1 cap, and forbids retries. The temporary
QA cap would be 190,000, restored to 50,000 with counters unchanged. The permit
readiness checks must pass before changing that cap or invoking the endpoint.
The original price evidence was not refreshed and expires September 30 at
06:44:23 UTC.

The plan-bearing local package differs from the verified null package only in
its plan JSON. Native compilation and source parity checks pass. No deployment,
permit or model call is authorized by the proposal files.

- Canonical plan: `db66b22a3ddc2f9740bb387ecbf634dad6c2ec313e447165ef179a28fc1148b3`.
- Candidate manifest: `72f98e74fa103ce7afb47647540764e29a1cfa6b3d7e79eb1bb7bd16d57e1a88`.
- Exact target: `oitipayrriupcitgmzju` / `learning-integrated-execution`, JWT enabled.
- Human-readable scope: `artifacts/learning-engine/research/integrated-diagnostic-receipt-proposal-20260929/approval-summary.md`.

Independent final review reproduced plan and permit hashes, unchanged request
bytes/source pins, the 12+13-cent reservations, token estimates, expiry and exact
plan-only package delta with no findings. Receipt:
`artifacts/learning-engine/research/integrated-diagnostic-receipt-proposal-20260929/independent-final-review.json`
(SHA-256 `f8a3d43b0a77859450368dec71e2a46a6abfbe6f16a5a54ca254b26bc634a5ae`).
An explicit user approval request is pending for the exact remote source upload
and new bounded diagnostic. Until answered, no deployment retry, real permit,
quota increase, enable flag or provider request is authorized.

## Claim boundary

This is a small engineering diagnostic: two scheduled generation requests and one
unscheduled no-evidence case. It cannot establish 95% production grounding, a complete
curriculum, educator validation or an accepted fine-tuned model. The all-three-case
denominator and every unsuccessful outcome remain visible.
