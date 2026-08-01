# Canvas and Google Classroom provider canary

This harness verifies the provider import, OAuth, submission, and receipt
contracts without requiring a student account or real provider credentials.
Mock mode is the default and intercepts every network request.

## Mock preflight

Run:

```powershell
npm run provider:canary
```

The command exits nonzero if any check fails and prints one JSON report. It
exercises:

- the exact Google student scope contract;
- exact-origin and restricted Vercel preview CORS behavior;
- Canvas and Google Classroom assignment import normalization;
- Canvas text and integrity-bound file submission;
- Google Drive upload, Classroom attachment, and turn-in;
- expired Canvas and Google OAuth refresh;
- missing Google scope and provider `403` handling;
- an ambiguous provider response reconciled to a terminal receipt; and
- duplicate receipt replay with one provider write.

Mock mode does not read staging variables and does not contact Canvas, Google,
Supabase, or the deployed app.

## Preview CORS

Keep the existing comma-separated `DIANA_ALLOWED_ORIGINS` secret. To permit
Vercel branch previews without replacing that secret, add this separate
Supabase Edge Function secret:

```text
DIANA_ALLOWED_PREVIEW_HOST_SUFFIX=-teamcarrillo405-hubs-projects.vercel.app
```

The value must be a concrete team/project suffix beginning with `-` and ending
in `.vercel.app`; bare `.vercel.app` is invalid. With the staging value above,
the shared CORS policy accepts only exact HTTPS origins shaped like
`diana-<deployment>-teamcarrillo405-hubs-projects.vercel.app`. It rejects HTTP,
ports, paths, credentials, other Vercel teams/projects, missing deployment IDs,
wildcard values, and lookalike suffixes.

Setting the secret and redeploying Edge Functions are operator actions. The
canary does not mutate secrets or deploy functions.

## Real staging mode

Staging mode refreshes real OAuth tokens, reads active provider assignments,
and submits disposable text and files. It refuses all provider network calls
unless every required value is present and the write acknowledgement is exact.

```powershell
$env:DIANA_PROVIDER_CANARY_MODE = "staging"
$env:DIANA_PROVIDER_CANARY_ALLOW_WRITES = "true"
npm run provider:canary:staging
```

Use a dedicated test student and disposable assignments. Do not point these
variables at production courses.

### Shared preview configuration

| Variable | Requirement |
| --- | --- |
| `DIANA_CANARY_PREVIEW_ORIGIN` | Exact deployed HTTPS origin, with no path |
| `DIANA_ALLOWED_ORIGINS` | May retain stable exact origins |
| `DIANA_ALLOWED_PREVIEW_HOST_SUFFIX` | Optional exact team/project suffix for `diana-<deployment>` previews |

The preview origin must be accepted by either the exact-origin list or the
restricted suffix policy. OAuth providers still require the exact callback URL
to be registered separately.

### Canvas credentials and fixtures

| Variable | Requirement |
| --- | --- |
| `DIANA_CANARY_CANVAS_BASE_URL` | Exact HTTPS origin of the staging Canvas tenant |
| `DIANA_CANARY_CANVAS_INSTITUTION_ID` | Dedicated canary institution identifier |
| `DIANA_CANARY_CANVAS_ACCESS_TOKEN` | Test student's OAuth access token |
| `DIANA_CANARY_CANVAS_REFRESH_TOKEN` | Refresh token for the same test student |
| `DIANA_CANARY_CANVAS_CLIENT_ID` | Staging Canvas developer key client ID |
| `DIANA_CANARY_CANVAS_CLIENT_SECRET` | Staging Canvas developer key secret |
| `DIANA_CANARY_CANVAS_COURSE_ID` | Disposable course visible to the test student |
| `DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID` | Open assignment allowing `online_text_entry` |
| `DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID` | Open assignment allowing `online_upload` and PDF |

The Canvas administrator must enable the developer key, approve the exact
`/api/lms/canvas-oauth/callback` URL for the staging origin, and keep the
institution on Diana's Canvas allowlist. The assignments must be unlocked and
must accept new submissions from the test student.

### Google credentials, scopes, and fixtures

| Variable | Requirement |
| --- | --- |
| `DIANA_CANARY_GOOGLE_ACCESS_TOKEN` | Test student's OAuth access token |
| `DIANA_CANARY_GOOGLE_REFRESH_TOKEN` | Refresh token for the same test student |
| `DIANA_CANARY_GOOGLE_CLIENT_ID` | Dedicated staging OAuth web client ID |
| `DIANA_CANARY_GOOGLE_CLIENT_SECRET` | Dedicated staging OAuth client secret |
| `DIANA_CANARY_GOOGLE_GRANTED_SCOPES` | Space- or comma-separated granted scope list |
| `DIANA_CANARY_GOOGLE_COURSE_ID` | Disposable Classroom course ID |
| `DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID` | Editable disposable assignment ID |

Required student grants:

```text
https://www.googleapis.com/auth/classroom.courses.readonly
https://www.googleapis.com/auth/classroom.coursework.me
https://www.googleapis.com/auth/drive.readonly
https://www.googleapis.com/auth/drive.file
openid
email
```

The Google Cloud project must have Classroom API and Drive API enabled. The
OAuth consent screen must approve these scopes, the test account must be an
allowed tester while the app is in testing, and the exact
`/api/lms/google-oauth/callback` staging URL must be registered. The disposable
coursework must be an `ASSIGNMENT`, editable by the student, and associated
with the same Google developer project so Classroom permits attachment changes.

## Reading the report

`network: "intercepted"` proves no real provider was contacted. `network:
"blocked"` means staging preflight refused provider access. `network:
"staging-providers"` means the complete staging contract enabled real calls; check individual
results because the report can still fail after one provider write. A failed or
interrupted side effect is held as confirmation pending until provider state is
inspected. Never retry a staging submission blindly.

The receipt scenarios use a deterministic in-memory RPC double so they run
without Supabase credentials. The repository's focused submission and SQL
contract tests cover the production RPC call shape and terminal transition
rules. A staging release still requires the submission receipt migrations to be
deployed and approved through the normal database release process.
