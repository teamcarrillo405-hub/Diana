# Exact research assistance permits

The reviewed schema is installed and its hosted rollback smoke passed. The
endpoint deployment is tracked separately in the diagnostic continuation report.
No real request permits were provisioned. All frozen diagnostic plans and
attempted runs remain unchanged.

## Scope

The dedicated research endpoint now requires a service-owned permit for the
exact request ID, plan hash, authenticated owner, assignment, provider request
body hash and distinct assistance payload hash. The permit also records the
approval artifact hash and an expiry within 24 hours of creation. Its scope is
`synthetic_diagnostic`. The trusted operator asserts synthetic scope and reviews
the approval artifact; a hash or scope label does not independently establish
authorization, novelty or synthetic provenance.

Only the service role can invoke provisioning, revocation, readiness and receipt
RPCs. Anonymous and authenticated clients cannot call them. Runtime roles cannot
directly insert/update/delete permit rows. There is no provisioning HTTP route,
no automatic permit creation, no upsert and no expiry extension. A new request
requires a new reviewed identity. Provisioning is a trusted operator capability;
possession of the service key remains privileged.

The payload digest is SHA256 of UTF-8 newline-separated fields, in this order:
`integrated-research-assistance-v1`, owner UUID, assignment UUID, request UUID,
plan hash, request body hash, `api`, `hint`. SQL and TypeScript share a fixed
opaque parity vector in tests. This binds scope separately from raw request bytes.

## Execution order

1. Validate deployed exact plan/configuration, operator authentication and policy.
2. Derive and verify the exact body/payload identity. Read the permit through the
   service-only readiness RPC before cents, moderation or token reservation.
   Missing/revoked/expired/consumed/mismatched permits fail closed. A missing RPC
   also fails closed, so deploying code before schema cannot call the provider.
3. Reserve the once-only experiment identity, recheck source/policy, and run input
   moderation plus existing token guard.
4. Consume the exact research permit and append the normal assignment-wide
   assistance receipt before the monetary provider-start fence.
5. Continue the unchanged bounded generation, raw storage, accounting and output
   screening. No production model/request bytes were changed.

Consumption holds the existing owner/assignment advisory lock (seed 814), then
profile and assignment/class policy row locks, the permit row and reservation
row. It requires READ COMMITTED and rechecks wall-clock expiry after waits, a
recent reserved request with matching plan, and no provider receipt/raw output.
Revocation locks the same permit row. A revoke that commits before consumption
denies it; revocation is not retroactive cancellation after receipt commit.
Idempotent receipt replay must still satisfy scope, live policy, expiry/revoke,
and unstarted reservation checks. Consumed permit and ledger rows are retained.

Supported age/consent rules remain unchanged: adults and 13-to-17 users need AI
consent, and teens additionally need a current existing guardian-permission
attestation/version/source with no withdrawal. Active deletion and non-green
assignment/class policy deny. No account profile is altered by these RPCs.

## Global independence remains staged

This research-specific path supersedes the research endpoint's earlier global
control-only readiness check. It never updates global enforcement, changes the
ordinary product help RPC, grants activation authority or provisions a reviewed
transfer. It records actual broad assignment exposure in the existing ledger.
It grants no independent knowledge credit and does not claim that legacy staged
independence callers are globally protected. Global activation retains its own
reviewed transfer and application-release prerequisites.

## Verification and rollout

The additive migration was installed by root as
`20260929141355_learning_research_assistance.sql`, retaining exactly the bytes
prepared under version `20260929160000`. Root owns the release inventory and
hosted verification. The local v1 receipt retains its original prepared path.
`scripts/learning/test-research-assistance-rollback.sql` exercises exact scope,
TypeScript/SQL payload parity, real synthetic teen/adult profile contracts,
guardian withdrawal, class policy, revocation, expiry, no-reset provisioning,
fresh reservation, receipt replay and invalid consumption. It ends in ROLLBACK;
all two synthetic profiles, six permits, one assistance receipt and six cents
of temporary reservations must disappear. It makes no network/model calls and
does not test cross-session concurrency. The hosted execution passed, including
the added deletion and provider-receipt checks. Postflight confirmed zero test
profiles, assignments and permits, unchanged production function hashes and
unchanged spending/reservations. See
`artifacts/learning-engine/release/integrated-research-assistance-hosted-verification-20260929.json`.

Deploying the schema alone creates an empty allowlist and does not activate any
run. Next package must keep the literal null plan and default-off server flag.
Any future real diagnostic needs a separately reviewed exact plan, fresh quote,
explicit approval, matching permit and bounded operational shutdown. No retry
of either historical stopped attempt is authorized by this engineering work.
