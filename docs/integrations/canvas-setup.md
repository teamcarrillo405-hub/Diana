# Canvas OAuth and staging certification

Diana requires an administrator-issued Canvas Developer Key. Signing in to a
Canvas tenant with Google does not create that key and cannot substitute for it.

## Required configuration

- `CANVAS_CLIENT_ID`
- `CANVAS_CLIENT_SECRET`
- `CANVAS_ALLOWED_ORIGINS` or `CANVAS_INSTITUTIONS_JSON`
- `DIANA_LMS_CANVAS_IMPORT_ENABLED`
- `DIANA_LMS_CANVAS_SUBMISSION_ENABLED`

Keep both feature switches `false` until the matching staging certification
gate has passed. Import and submission are released independently.

## Staging setup

1. Provision a disposable Canvas tenant, teacher, student, course, text-entry
   assignment, and file-upload assignment.
2. Create a scoped Developer Key and register the exact callback URL:
   `https://<preview-domain>/api/lms/canvas-oauth/callback`.
3. Store credentials only in the protected preview environment. Never put
   access tokens, refresh tokens, passwords, or cookies in repository files or
   beta evidence.
4. Run `npm run beta:lms:staging -- --run-id=<id>
   --ack=DISPOSABLE_STAGING_WRITES` against the disposable fixtures.
5. Enable `DIANA_LMS_CANVAS_IMPORT_ENABLED=true` only after the import receipt
   passes. Enable `DIANA_LMS_CANVAS_SUBMISSION_ENABLED=true` only after text and
   multi-step file-upload receipts pass and provider state has been reconciled.

Missing, stale, revoked, or unrefreshable credentials must return
`reconnect_required`. An uncertain submission is never retried until Canvas is
queried and the provider-side state is known.
