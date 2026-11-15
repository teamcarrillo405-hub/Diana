# Learning experiment usage accounting

The research endpoint has two budgets: the student token ledger and the experiment monetary ledger. An answer can be withheld after generation while both budgets still need to account for consumed usage. This implementation records a content-free provider receipt before output moderation, separately from an answer eligible for release.

## Forward migration and execution

`20260928043147_learning_experiment_usage_receipts.sql` was applied to the production-linked Supabase project on September 27, 2026 (September 28 UTC), followed by the updated `learning-experiment` Edge Function, version 8. The local filename now matches the provider-assigned migration version; its contents are unchanged from the reviewed candidate previously named `20260926130000_learning_experiment_usage_receipts.sql`. Catalog checks verified the receipt table, RLS, and RPC/table privileges. See [rollout evidence](../engineering/learning-database-release-2026-09-27.md). Experiment enablement, approved synthetic inputs, operator authorization, recently reviewed model prices, and existing safety/token-budget checks still apply.

1. Reserve the experiment monetary ceiling using the existing atomic reservation RPC.
2. The existing student safety wrapper checks input and obtains its token reservation/provider-start fence.
3. Immediately before the model request, commit the experiment provider-start record. It binds request ID, operator ID, full input fingerprint, requested model, configured input/output prices, and their review timestamp. Only a fresh reservation can start, and a second start cannot authorize another request.
4. Validate the provider ID/model and exact nonnegative integer usage arithmetic. Record only provider identity and usage metadata. The database computes rounded cents from the persisted rates and commits the receipt and monetary settlement in one transaction.
5. Parse output and run existing output moderation. Record `released`, `blocked`, or `screening_unavailable` for the original attempt. Generation or accounting errors retain an explicit error status when that write is available.
6. Save answer text only through the existing successful guarded-output path. Withheld output is never placed in the usage receipt table.

The immutable receipt holds the provider response ID, resolved model, input/output/total tokens, configured prices, review time, provider-start time, usage-received time, and computed cents. There is no prompt, source, student answer, generated answer, or moderation explanation field. The receipt table is unavailable to browser roles; service role can read it and use its bounded RPCs but cannot directly update rows. RPC identity checks bind owner and input fingerprint to the original start record.

## Retries and uncertain outcomes

An exact repeated receipt returns the already-settled amount. A changed ID, model, token split, owner, or input fingerprint is rejected. The reservation and receipt locks serialize concurrent settlement; both receipt and cents updates roll back if either write fails. An acknowledged provider response whose receipt cannot commit still leaves the original monetary hold available for reconciliation. No automatic retry makes a second model request.

Existing saved successful outputs replay through the original idempotent settlement path. If the original output was stored but its terminal status write failed, a replay can return that safe output while the first-attempt status remains `pending` or `accounting_error`. Operators must reconcile that status against the saved output; it is not the authoritative billing record. Do not overwrite terminal output states to erase an earlier moderation result.

Input moderation or token-budget failure before experiment provider start remains conservatively reserved in the monetary ledger. The absent start record alone is not sufficient evidence for an automatic refund of older executions. This migration does not repair historical reservations, assume zero usage, enable experiments, or replay a request.

## Historical Luna request

Read-only checks on September 26, 2026 found the following for `a262a6d7-e023-48ea-8d45-7130706445c2` (`reading.comparison.01`):

- Experiment monetary state: reserved, one cent, no saved output.
- Exact token ledger: provider start September 25 at 18:29:32.237 UTC; settled 860 measured tokens at 18:29:34.803 UTC; 5,878 reserved and 5,018 refunded; no known-not-consumed marker.
- A nearby function log at 18:29:34.731 UTC reports moderation HTTP 500, correlation `req_db2d43a6854b456ea8fa87a86163cf11`, execution `6c365ab2-95a6-4b60-93b6-26c5142c432e`. The log does not itself include the experiment request ID.
- The experiment month had 29 cents spent and one cent held.

The token evidence supports consumed generation followed by an output-moderation failure, rather than a request that never reached generation. The historical code settled token usage after output moderation, then returned before storing the provider response ID, token split, price basis, or monetary receipt.

Keep the one-cent hold until the historical provider usage and configured price basis are reconciled. An operator may explicitly choose conservative ceiling accounting with an immutable reason, but must not label that as measured billing. Do not refund zero or issue a replacement request to recover the answer. This implementation leaves the historical request untouched.

## Verification

- `lib/learning-engine/experiment-accounting.test.ts`: nine tests passed, including the actual existing safety wrapper with output rejection and output-moderation unavailability; usage commits before moderation, exact token settlement is retained, no generated text enters the receipt, invalid arithmetic and receipt-write failure stop the flow.
- `scripts/learning/test-experiment-accounting.sql`: passed on isolated PostgreSQL 16 against the original experiment ledger functions and this forward migration. Checks exact replay, receipt conflict, owner/input mismatch, role privileges and actual authenticated denial, immutable outcome, legacy reservation preservation, and a forced monetary write failure that rolls back the receipt and preserves the held amount. Fixtures roll back.
- `scripts/learning/test-experiment-accounting-concurrency.sql`: passed with two real database connections. The second settlement waits for the first reservation lock; both return one cent and the monthly ledger records one charge. Dedicated-port synthetic fixtures are removed in dependency order.
- Targeted ESLint passed for the helper, Edge Function, and unit test. The original isolated verification used no model request or shared database mutation. The later approved production migration and deployment are recorded separately above.

The isolated harness needs the earlier `learning_experiment_months`, `learning_experiment_reservations`, `learning_reserve_experiment`, and `learning_settle_experiment` definitions unchanged from `20260924214937_learning_engine.sql`, plus the standard Supabase roles (`service_role` with `BYPASSRLS`) and a minimal `auth.users` table. The concurrency script requires a private PostgreSQL instance listening only on `127.0.0.1:55439` with `dblink` installed. Never run that script against shared databases.
