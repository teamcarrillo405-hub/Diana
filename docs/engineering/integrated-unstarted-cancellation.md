# Cancellation before experiment provider start

The additive RPC was applied after the approved diagnostic shut down on September 29. The updated handler is still local and was not part of that frozen run. Hosted verification is recorded in `artifacts/learning-engine/release/integrated-unstarted-cancellation-hosted-verification-20260929.json`.

After this handler receives a successful fresh monetary reservation, a daily token quota, input moderation, policy/source/expiry, or mandatory assistance stop can cancel that reservation at zero generation cost. The helper calls `learning_cancel_unstarted_experiment(request_id, manifest_hash)` once. The handler sets `providerStartRequested` before awaiting the start RPC. Any start invocation, including false, error, or a thrown/ambiguous acknowledgement, prevents automatic cancellation. Provider failures after start retain the prior accounting behavior.

The additive service-only RPC locks the exact reservation before the month row, matching existing usage settlement. It requires READ COMMITTED for fresh command snapshots after lock waits. It rejects mismatched identities, any provider receipt or output, started reservations, nonnull actual costs on reserved rows, and reservations older than the existing two-minute start window. It updates the monthly reserved amount and sets the row to settled with actual cost zero in the same transaction, without calling the permissive settlement RPC. A repeated exact zero settlement succeeds without another decrement. The reservation remains occupied, so neither reserve nor start can replay it. Existing start and settlement signatures are unchanged.

The application reports `reservationSettlement: settled_zero` only after strict true acknowledgement. A rejected or ambiguous cancellation reports `unconfirmed` and HTTP 503, without retry. If the additive RPC is absent, the early-stop handler fails closed this way. Roll out the reviewed RPC before this handler.

This concerns the experiment generation-money ledger. Daily token reservations keep their existing conservative behavior, including the separate token-start fence. Moderation cost is zero under the verified plan contract; this change introduces no pricing assumption or alternate moderation configuration.

## Verification boundary

`integrated-unstarted-cancellation.test.ts` uses only opaque synthetic data and mocked dependencies. Its concurrent test proves handler calls respect the reservation response; it does not prove PostgreSQL concurrency. The existing integrated execution and accounting suites also pass.

`scripts/learning/test-unstarted-experiment-cancellation-rollback.sql` passed against the hosted database. The first attempt exposed a missing birth date on the synthetic auth fixture; after matching the actual signup trigger contract, the repeated smoke passed. It uses fresh random synthetic UUIDs, no student reads, bounded statement/lock/idle timeouts, no DDL, and a final ROLLBACK. Its sole result is content-free JSON held in a transaction-local setting. It checks grants, zero settlement/idempotency, replay denial, identity/state/receipt/output/age fences, write-failure rollback, and month conservation. Postflight confirms no synthetic profile and unchanged spending/reservations. It does not test concurrent database sessions.

Known review exposure: an earlier symbol search accidentally emitted one generated development fixture line. No protected held-out data was opened, and no fixture was imported or changed for this work. This work makes no fresh-author or independent-blinded-review claim.
