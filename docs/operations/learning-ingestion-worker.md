# Material preparation operations

Students can open Preparation progress in Materials, view page counts and resume paused preparation. The original PDF byte hash, source owner, assignment, subject and lease token are rechecked. Native extraction quality signals identify sparse or unconfirmed pages; they are not measured OCR accuracy.

## One owner, private credentials

Both commands require these independently configured environment variables:

- `DIANA_INGESTION_SESSION_FILE`: absolute path to a private file outside the checkout, containing `{ "url": "...", "publicKey": "...", "accessToken": "..." }`.
- `DIANA_INGESTION_OWNER_ID`: the UUID of the explicitly delegated owner.
- `DIANA_INGESTION_SUPABASE_URL`: the pinned Supabase origin, HTTPS or loopback HTTP.

The operator pins the owner and endpoint when starting the process. A new token for that same owner and endpoint may replace the session file atomically between passes. A changed owner or endpoint stops the process. The public key must be a Supabase publishable key or an anon-role legacy key. Service-role keys, secret keys and non-authenticated access tokens are rejected. The local JWT checks are input checks; the worker also verifies identity with Supabase before each claim.

Use a private local directory with access restricted to the current operator. POSIX directory/file ownership must match the operator and permissions must exclude group/other access. On Windows, the loader verifies directory and file ACLs through the existing `verify-private-acl.ps1` check: protected directory inheritance, a trusted owner and access only for the operator, SYSTEM and administrators. Each ACL subprocess has a 10-second limit and fails closed if verification is unavailable. The loader rejects checkout/public files, symlinks and junctions in any path component, hard-linked files and files above 16 KB. It rechecks identity/size/path after a bounded file read. These checks do not defend against a compromised process running as the same operating-system user or an administrator. Do not place the file in a served directory, a synchronized share, repository configuration, a terminal command line or logs.

These access-token-only commands neither obtain passwords nor mint, refresh or impersonate a user session. Session rotation must come from an existing authorized session mechanism. Expired or invalid credentials stop dispatch; this supervisor does not fabricate renewal. A separate, disabled-by-default [bounded renewal adapter](learning-ingestion-renewal.md) can use an explicitly provisioned dedicated owner refresh session; it has not been activated on a production host. Supabase logout can invalidate refresh credentials before an existing access token expires; prompt revocation depends on the server rejecting identity or removing retrieval access, and cannot be inferred from deleting a browser session.

## Independent worker command

`node --conditions=react-server --import=tsx scripts/learning/ingestion-worker.ts`

The worker runs one bounded pass independent of browser requests. It reads only that owner's enabled queue and uses the same claim/checkpoint/finish functions as the browser. It checks authorization immediately before each claim, advances at most 20 batches and starts no additional claim after its 50-second pass budget. Each Supabase fetch has a 15-second timeout and the pass abort signal expires at 55 seconds. An individual extraction batch has its own time limit. CPU extraction already underway may finish before control returns to observe shutdown.

Concurrent browser and worker requests compete for one database lease; they cannot both append the same page batch. Busy/paused jobs are skipped for the rest of the pass. A stopped or interrupted pass can leave a lease until its existing expiry; restart resumes through the queue and existing checkpoints rather than resetting source data.

## Bounded supervisor command

`node --conditions=react-server --import=tsx scripts/learning/ingestion-supervisor.ts`

The supervisor awaits each pass and reloads the private session file before the next pass. No passes overlap within one supervisor. Separate processes still use database leases. It logs only pass count, step count and generic statuses, never tokens, owner IDs, source text or job IDs.

| Setting | Default | Accepted range |
| --- | --- | --- |
| `DIANA_INGESTION_DURATION_MS` | 3600000 (one hour) | 1000 to 86400000 |
| `DIANA_INGESTION_INTERVAL_MS` | 10000 | 1000 to 300000 |
| `DIANA_INGESTION_BACKOFF_MS` | 60000 | Interval through 300000 |
| `DIANA_INGESTION_MAX_PASSES` | 360 | 1 to 1000 |

Transient pass exceptions use capped exponential backoff and stop after five consecutive exceptions. Credential-file errors, expiry, identity rejection or removed retrieval access terminate dispatch immediately when detected. A successful pass resets the error count. A bound or graceful stop exits successfully; unavailable credentials/access or exhausted error retries exit with status 1. Session rotation during an in-flight pass takes effect on the next pass; the existing token is rechecked before every new claim.

Send SIGINT (Ctrl+C in an attached terminal) or SIGTERM for graceful stop. This wakes any interval/backoff wait, aborts Supabase requests and prevents another pass. On Windows, a helper launched with `Start-Process` must use `-WindowStyle Hidden`; `Stop-Process` is an abrupt termination, so allow the existing lease to expire before expecting another process to resume it. No service registration, scheduled task or production credentials are installed by these commands. General multi-tenant service dispatch would need a separately audited job capability; do not replace the owner token with service access.

## Acceptance before deployment

Focused tests cover same-owner token rotation, changed identity/endpoint, expired and unsafe credentials, private file paths and ACL rejection, bounds, sequential dispatch, backoff and cancellation. Windows tests create disposable synthetic credential files with operator-only ACLs; a sandbox that injects broad access rules correctly prevents those acceptance cases from running without an isolated approved test invocation. Test a real long, authorized PDF while its browser is closed, concurrent claims, expired sessions, a restart mid-batch, source changes and indexing completion. Confirm source/page equality and subject/byte hashes in the completed version. The supervisor has not completed that independent runtime acceptance with a real delegated owner session. Existing browser preparation and SQL lease contracts have been exercised separately.
