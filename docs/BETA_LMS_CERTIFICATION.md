# Canvas and Google Classroom Beta Certification

## Decision Boundary

The deterministic MOCK portion of the user-approved LMS beta plan is covered.
It does not certify either provider's live consent screen, tenant configuration,
payload behavior, or side effects.

No provider network call or provider write is permitted in MOCK mode. The
standalone canary installs an outer deny handler, then allows only fixture-local
interceptors. A passing report must contain:

```json
{
  "ok": true,
  "mode": "mock",
  "network": "intercepted"
}
```

Real staging certification remains blocked until dedicated disposable Canvas
and Google Classroom tenants, users, courses, assignments, credentials, and
approved scopes are available.

## Deterministic Coverage

| Beta requirement | Deterministic evidence | Current boundary |
| --- | --- | --- |
| No external traffic | `runProviderCanary({ mode: "mock" })` blocks every unhandled request. `provider-canary.test.ts` also installs an ambient fetch trap and proves it is unused. | Certifies local interception only. |
| Separate import and submission flags | `feature-flags` isolates all four Canvas/Google switches and proves disabled adapter calls return `provider_feature_disabled` before fetch. | The combined staging command still requires all four flags because it certifies both providers in one run. Each deployed flag must also be exercised independently. |
| Operation-scoped grants | `oauth-scopes` proves import-only grants exclude write scopes and submission-only grants exclude import-only Drive/coursework scopes. | Provider consoles must approve the exact requested grants. |
| OAuth denial | `provider-canary-oauth.test.ts` invokes both real callback handlers with `error=access_denied` and proves no token exchange or credential save occurs. | A valid-state provider cancellation returns `denied`; missing or mismatched state still returns `state-mismatch` and fails closed. |
| OAuth state mismatch | The real Canvas and Google callback handlers reject a wrong state before token exchange. | Browser cookie attributes and callback registration still require deployed verification. |
| OAuth replay | A successful callback response clears its one-time state cookie; replay with the consumed cookie state is rejected before a second exchange or save. | Real browser and provider redirect behavior still require staging verification. |
| Scope denial | `scope-denied` detects a missing Google Drive grant and a provider `403`. The real Google callback test rejects an incomplete token scope before saving credentials. | Canvas enforcement is endpoint-scope and provider-admin dependent, so a disposable developer key is required. |
| Expired token refresh | `oauth-expired` intercepts both refresh endpoints and proves fresh access tokens are returned. | Actual refresh-token issuance and rotation are provider behavior. |
| Revocation | `oauth-revoked` maps intercepted `invalid_grant` responses from both providers to `reconnect_required`. | Revoke each disposable grant in the provider console and verify propagation timing. |
| Missing refresh path | `oauth-reconnect` proves incomplete OAuth credentials require reconnect without contacting a token endpoint. | Reconnect UI and re-consent require deployed browser testing. |
| Pagination | `pagination` follows Canvas `Link: rel="next"` URLs and Google course/coursework page tokens across multiple pages. | Real page boundaries, ordering, rate limits, and tenant-specific payloads remain external. |
| Stable identity and deduplication | `identity-removal` proves Classroom course-qualified keys are stable. `provider-canary-sync.test.ts` calls the production sync helper twice and verifies one row through `owner_id,external_source,external_id`. | The unique index and concurrent database behavior still require the normal migration/database gate. |
| Provider removal | Complete snapshots mark missing provider assignments for local preservation; partial snapshots infer no removal. The production sync test proves no local row is deleted. | A real complete provider snapshot must confirm missing-item behavior and eventual consistency. |
| Assignment variants | `assignment-variants` covers dated/undated work, Canvas rubrics, ready/partial attachments, and Classroom Drive/link/video/form materials. | Real HTML, custom Canvas fields, malformed attachments, locked work, and provider-specific variants need tenant fixtures. |
| Submission variants | `submission-capabilities` covers Canvas text, file, locked, and external-only work plus Classroom editable, unassociated, and already-turned-in work. | Actual provider eligibility fields must be observed in disposable courses. |
| Submission digest | `submission-digest` changes bytes after SHA-256 binding and proves neither provider receives a write. | Real stored-object download and version binding remain covered by storage/database gates, not this canary. |
| Receipt idempotency | `duplicate-submit` runs concurrent claims, allows one provider-write branch, and replays the terminal receipt. | The MOCK receipt store is deterministic. Database RPC concurrency and real provider retry behavior require disposable infrastructure. |
| Reconciliation | `ambiguous-reconciliation` holds an uncertain Canvas result pending, applies one terminal transition, prevents overwrite, and classifies Google pending/submitted/absent states. | Provider eventual consistency and interruption after a real side effect require disposable assignments and operator review. |

## Local Verification

Run the focused deterministic suite:

```powershell
npx vitest run lib/lms/provider-canary.test.ts lib/lms/provider-canary-cli.test.ts lib/lms/provider-canary-oauth.test.ts lib/lms/provider-canary-sync.test.ts
```

Run the credential-free certification report:

```powershell
npm run provider:canary
```

The current report contains 19 passing checks. MOCK startup does not load local
environment files, and the report contains no credentials, student data, or raw
provider responses.

## Disposable Canvas Tenant

The Canvas certification owner must provision one non-production institution,
developer key, teacher, student, course, and disposable assignments that cover:

1. Exact preview callback registration, consent approval, consent denial,
   one-time state handling, logout/relogin, revocation, and reconnect.
2. At least two pages of active courses or assignments, plus an assignment
   removed between two complete snapshots.
3. Dated and undated work, HTML instructions, rubric criteria, valid and missing
   attachment URLs, locked work, text entry, PDF upload, unsupported submission,
   and extension restrictions.
4. Expired access-token refresh, invalid refresh-token recovery, `403`, `429`,
   timeout, malformed response, and pagination-loop protection.
5. One accepted text submission and one accepted multi-step file submission,
   followed by provider-state inspection and receipt reconciliation.
6. A repeated click and interrupted confirmation using the same durable receipt,
   with no blind second provider write.

## Disposable Google Classroom Tenant

The Google certification owner must provision one testing-mode Cloud project,
approved test student, teacher, course, Drive access, and disposable coursework
that cover:

1. Exact preview callback registration, consent approval, consent denial,
   incomplete scope grant, refresh-token issuance, revocation, and reconnect.
2. Multiple course and coursework pages with Drive, link, video, form, dated,
   timed, and undated assignment variants.
3. Developer-associated editable work, unassociated work, already turned-in
   work, returned work, and unsupported coursework types.
4. Drive upload, Classroom attachment modification, turn-in, immediate
   inspection, delayed inspection, and final receipt reconciliation.
5. `403`, `429`, timeout, malformed response, repeated page token, duplicate
   click, and interruption after each write step.

## Release Evidence Still Required

Before enabling a beta flag, retain a release-bound receipt for the matching
operation and provider. Import may be enabled while submission remains off, but
submission must not be enabled from import-only evidence.

The remaining external evidence is:

- exact deployed callback origins and cookie behavior in a real browser;
- provider-admin approval, API enablement, test-user enrollment, and grants;
- real refresh, revocation, re-consent, and reconnect behavior;
- real pagination, removal, payload variants, rate limits, and eventual consistency;
- real Canvas text/file acceptance and Google Drive attach/turn-in acceptance;
- durable database receipt concurrency and reconciliation against observed provider state;
- independently deployed import/submission flags and rollback; and
- provider-owned cleanup of every disposable resource created by staging certification.

No staging canary or provider write was run as part of this deterministic audit.
