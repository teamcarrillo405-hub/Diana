# Bounded ingestion session renewal

## What is implemented

The existing owner-scoped ingestion supervisor can run without a browser, but an access token expires. A separate **opt-in** renewing supervisor now supports an already provisioned dedicated Supabase owner session. It uses the public project key, not a service-role key. The existing access-token-only loader and supervisor are unchanged.

An owner access/refresh session has the owner's ordinary database privileges. It is **not a job-only capability**. The worker continues checking owner identity and retrieval authorization before each claim; this does not narrow what a stolen owner session could do. Do not run it on an untrusted host or reuse a browser session whose refresh rotation may race this worker. A future multi-tenant hosted dispatcher needs a separately designed, revocable job-only capability.

The renewal implementation does not obtain passwords, extract browser cookies, create a delegation, obtain production credentials, register a service or install a scheduled task. It must remain inactive until an authorized operator supplies the exact dedicated session, private store and trusted host.

## Private store and independent pins

Use an absolute file path outside the checkout, public directories, cloud-synced folders and shared drives. The same Windows ACL verifier as the existing ingestion loader requires an operator-private protected directory and trusted file ACLs. POSIX mode/ownership checks require operator ownership and no group/other access. All path components reject symlinks/junctions; files reject hard links and have a 24 KB read/write bound.

The externally provisioned JSON has these fields (placeholders are documentation, not usable credentials):

```json
{
  "version": "ingestion-renewal-v1",
  "state": "ready",
  "url": "https://YOUR_PROJECT.supabase.co",
  "publicKey": "YOUR_PUBLIC_PROJECT_KEY",
  "accessToken": "YOUR_DEDICATED_OWNER_ACCESS_TOKEN",
  "refreshToken": "YOUR_DEDICATED_OWNER_REFRESH_TOKEN",
  "delegatedAt": 0,
  "delegationExpiresAt": 0
}
```

The two timestamps are real Unix epoch milliseconds, not the example zeros. The delegation duration must be at most 24 hours, with at least 60 seconds remaining before starting another pass. The operator independently pins the owner UUID, Supabase origin and exact JWT `session_id` in the process configuration. Renewal cannot silently extend the delegation or change any pin.

Configure these names through the trusted host's private environment mechanism. Never paste tokens into shell history:

```text
DIANA_INGESTION_RENEWAL_ENABLED=1
DIANA_INGESTION_SESSION_FILE=<absolute private delegation file>
DIANA_INGESTION_OWNER_ID=<explicit delegated owner UUID>
DIANA_INGESTION_SUPABASE_URL=<pinned Supabase origin>
DIANA_INGESTION_SESSION_ID=<dedicated auth session UUID>
```

Start the bounded command:

```text
node --conditions=react-server --import=tsx scripts/learning/ingestion-renewing-supervisor.ts
```

It awaits each pass, checks the store again before the next pass, and runs for at most one hour or 360 passes. Interval is ten seconds; exception backoff caps at sixty seconds. Existing database leases serialize processing with browsers or other workers. An external scheduler may run this command only after its own operator-reviewed deployment; no scheduler is installed by the command or this implementation.

## Rotation and failure behavior

1. Acquire an exclusive adjacent `.lock` file. An existing lock is never automatically removed.
2. Verify private path, ACL, size, file identity, exact owner/endpoint/session pins, public-only project key and bounded delegation.
3. If access has more than two minutes left, return it to the existing worker. The worker separately verifies live identity before each claim.
4. Before refreshing, durably write `state: "refreshing"` through a private same-directory temporary file and atomic replacement. The previous file must still match its last read.
5. Make one refresh request to the pinned Supabase `/auth/v1/token?grant_type=refresh_token`. Redirects are rejected, browser credentials omitted, responses capped at 32 KB, and the refresh plus identity requests share a twenty-second deadline.
6. Require an authenticated access token for the same owner and exact session, a new usable refresh value, and a successful `/auth/v1/user` identity check. Persist both rotated credentials before returning access to the worker. Never log response bodies, credentials, owner IDs or source contents.

An ambiguous refresh attempt that has not committed verified rotated credentials leaves `refreshing` in the store. A subsequent process sees that journal and stops. It never replays an old refresh credential to guess whether rotation occurred. If the verified replacement already committed before shutdown, the store may be `ready`; returning a session still requires a final cancellation, delegation and access-lifetime check. A process crash can also leave the exclusive lock. The operator must verify no process is active and reauthorize/reprovision the dedicated session before removing such a lock or replacing the ambiguous store. Do not merely change the state back to `ready`.

The store flushes file contents before replacement and flushes the containing directory where the platform permits it. This is a process-crash recovery fence, not a guarantee against storage-controller failure, power loss, an administrator or another compromised process running as the same OS user. After such an event, reconcile the dedicated session before restarting.

This conservative policy follows Supabase's documented rotating refresh-session behavior; uncontrolled reuse may revoke a session. See [Supabase session lifecycle](https://supabase.com/docs/guides/auth/sessions) and [refreshSession contract](https://supabase.com/docs/reference/javascript/auth-refreshsession).

## Deployment evidence still required

Fourteen implementation tests passed using synthetic tokens and responses, with real temporary private-file ACL checks. Independent review identified a deadline gap after slow final persistence; the adapter now rechecks cancellation, delegation and access lifetime after writing, with regression coverage. TypeScript and scoped ESLint also passed. These checks do not establish a live refresh, delegated production authority or a continuously running host. Before activation, provide the dedicated operator-authorized session and approved host, then demonstrate a real authorized PDF completing while its browser is closed, a same-session refresh, interruption/resume, expired/revoked authorization, concurrent claims and exact source/page/hash preservation. Keep credential material out of the evidence report.
