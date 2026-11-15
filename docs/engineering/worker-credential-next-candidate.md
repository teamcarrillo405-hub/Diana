# Worker credential boundary: next candidate

This protocol was developed separately after the frozen 34-file tutoring release of 2026-09-29. Its reviewed SQL and matching web routes are now deployed and verified. Current production `dpl_HBXKsD78zJXyKB5iHFJHvfbmPiak` preserves those routes and adds the subsequent disclosure/policy fixes. The managed queue remains disabled; no worker image or host was provisioned and no model was activated. Existing non-managed sidecar callers keep their request recipe.

## Protocol

1. `POST /api/workers/claim` requires the existing worker bearer and a bounded worker ID. The server checks the stored owner's consent, age, deletion state and assignment policy. The response contains a trace, tenant, expiry and a random 256-bit capability, with no student input. Only the capability's SHA-256 digest is stored.
2. `POST /api/workers/authorize` requires the bearer and `{traceId, workerId, capability}`. The service-only transition consumes the capability's authorization phase and returns the stored job to the server. The server rechecks eligibility, screens that input, and computes a conservative token reservation from the actual sidecar messages. The next transaction checks current eligibility and atomically reserves tokens, records the provider-start marker, and advances to `authorized`. Only then does the response contain the input, lease expiry and a timeout capped at 30 seconds.
3. The replica calls the existing local sidecar once with `max_tokens: 500`, bounded by the remaining lease and configured timeout. It has no database client, service key or moderation key.
4. `POST /api/workers/complete` requires the same capability. The server validates a bounded result, locks an immutable digest of the normalized completion, checks current eligibility, and screens output. The finish transaction settles the full reserved amount, writes metadata-only audit records and stores the result atomically. Successful output also receives a final database policy check. The existing student status endpoint still gates actual assistance release and records its receipt.

The execution record binds owner, tenant, feature, queue, input, constraints, worker ID, attempt and exact lease expiration. It is not transferable across jobs or later attempts. The table and RPC are inaccessible to anonymous or authenticated Supabase clients; only the server service role can use them. The record cascades with deletion of the original worker job.

## Replay and failure rules

- A second authorization request never returns the permit again. This also prevents repeated moderation through the same authorization phase.
- An expired lease can be reclaimed only before provider authorization. A new attempt receives a new capability and the previous capability stops working.
- Once provider authorization is marked, lease recovery cannot dispatch the job again. A lost permit response is treated as an ambiguous provider boundary, so reserved tokens remain conservatively charged by the existing budget expiry mechanism. No replica can request a refund or report lower usage.
- Completion consumes its phase once. An exact replay after a committed completion returns an acknowledgement without payload, moderation, audit duplication or a second charge. A changed completion or in-progress duplicate is rejected.
- If output screening, policy, settlement or audit is unavailable, no successful result is released. Screening denial is stored as a fixed error code and settled conservatively. A lost completion response or server crash can leave a pending job until normal lease exhaustion; operators should not manually redispatch an authorized trace.
- The model name and image metadata are bounded replica reports, not attestation of which model ran. This boundary does not make a compromised replica incapable of calling its own local sidecar outside the protocol. It does protect Diana's database, budget authority, moderation and student result release from a worker bearer alone.

## Verification and release order

The next-candidate manifest lists exact files and hashes. Tests exercise server ordering and rejection, replica execution without database credentials, and actual PostgreSQL transitions against the existing budget RPCs in a rollback-only disposable database. The compiled replica proof uses synthetic loopback endpoints and a clean temporary directory; it makes no external or paid calls.

The execution migration is applied and independently verified under server-assigned version `20260929035711_worker_execution_capabilities.sql`. Frozen next-candidate evidence retains the historical expected version `20260929100000`; the working filename is reconciled with identical bytes. Do not apply that historical version again. The prior result-column hardening migration has been applied and verified by the root rollout under server-assigned version `20260929034718`. The historical frozen evidence calls it `20260929040000_worker_result_release_boundary.sql`; the workspace now uses `20260929034718_worker_result_release_boundary.sql` with identical content. Do not apply the historical version a second time.

The reviewed SQL and server-route phases are complete, including source parity, authenticated application access and unauthorized worker endpoint denial. A separately authorized rollout must build/deploy the matching worker image to a configured host and then run an approved synthetic canary. An old worker image cannot use the new protocol. Managed queue flags remain off until a separate activation decision. If the execution migration is absent, its RPC fails closed and the routes cannot return a provider permit or successful completion. With managed/sidecar flags inactive, the student entry point does not enqueue managed jobs. No long-running replica receives `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY`; the existing server configuration supplies accounting and moderation credentials.

Independent review found and fixed two issues before the revised candidate: a concurrent consent change could commit while dispatch waited for a profile budget lock, and operational smoke launchers inherited their operator's environment. Dispatch and successful storage now lock policy rows before evaluating them, with deterministic two-session PostgreSQL tests for consent and class revocation. Both compiled-worker launchers use an OS-settings allowlist plus explicit worker configuration. The replica entrypoint never loads `.env.local`. An actual child-process sentinel test verifies that server, QA and process-injection credentials are absent.

The September 29 continuation also fixed `smoke-worker-runtime.mjs` to use an
OS-settings allowlist and explicit synthetic configuration. Image CI now requires
the full claim/authorize/sidecar/complete credential proof, and pushed-image
acceptance requires successful push steps rather than an image-name file alone.
All 155 worker tests across 19 files pass, including 10 packaging checks; the
compiled runtime smoke, loopback protocol proof, typecheck and lint pass.
Independent review is recorded in
`artifacts/learning-engine/release/worker-packaging-independent-review-20260929.json`.
No container image was built or published in this continuation: the local Linux
Docker engine is unavailable, the documented deployment has no kubeconfig secret,
and no target host has been supplied. Source and protocol readiness do not prove
hosted execution.
