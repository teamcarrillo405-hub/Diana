# Canonical production campus gate

This is a targeted developer QA harness for the approved release, not a general test framework. It never enables the dev QA routes and does not change the loopback restrictions in the older campus/recovery gates.

## Read-only plan

```powershell
node scripts/qa-campus-production.mjs --expected-sha=<full-40-character-main-merge-sha> --plan
```

The expected SHA is required even for planning. This command validates arguments and prints the fixed scope only; it does not read credentials, contact a server, create files, launch a browser or create an account. The target is always `https://diana-umber.vercel.app`; it accepts no alternate origin.

## Authorized live run

After the merge and canonical deployment are ready:

```powershell
node scripts/qa-campus-production.mjs --expected-sha=<full-40-character-main-merge-sha>
```

The existing local Supabase URL/service-role configuration must identify `oitipayrriupcitgmzju.supabase.co`. The browser needs the installed Playwright Chromium runtime; actual PDF text validation needs the existing `pdftotext` utility. There are no model downloads or dependency-install steps.

Before creating an Auth account, `/api/build-info` must return the requested SHA and a deployment ID from the exact canonical HTTPS origin. Identity is checked again after the browser pass, so a deployment change invalidates the run.

The normal run creates a unique marked adult `@local.test` account with random credentials, no AI consent and a zero token budget. It seeds only its class, two assignments, note and authored practice. It signs in through the actual form at desktop and phone sizes, saves both onboarding steps, visits the main/deeper pages, checks five-tab fit and errors/assets, verifies More/Class/Review state, saves and reloads its note, checks saved reading font/spacing/high contrast, and downloads/parses the real hand-in PDF without recording submission.

Browser requests are restricted to the canonical app, the exact backend's token/user/logout Auth endpoints, and signed PDF storage URLs under this fixture's ready-assignment prefix. AI/voice/worker/tutoring endpoints and other external providers are blocked. No external school connection, real calendar link, mail request or AI generation is performed. Contexts never export raw storage state. Passwords remain in memory; screenshot masking protects any filled password fields and the synthetic email.

Results and raw synthetic captures go under `implementation-qa/production-<run>/`. They establish only the named rendered states and interactions. Signup/recovery email delivery, actual callbacks, provider consent, all subject accuracy and physical-device offline behavior require separate evidence.

## Exact-owned cleanup

Cleanup verifies the unique email and Auth metadata marker before deleting anything. It removes only PDFs under the marked owner's two seeded assignment prefixes, verifies storage removal, removes owned child rows, deletes the synthetic Auth user and verifies 404. An exclusive `wx` reservation with a per-invocation identity is persisted before provider work. Concurrent invocations of the same run fail before provider calls and cannot overwrite the other run report. The reserved marker/email and phase are synced before Auth creation; the full owned IDs are then written through the same held file handle. A private rescue manifest contains IDs/markers but no password or session. Removal rechecks the exact reservation identity and run. On verified cleanup it is removed.

If interrupted or cleanup cannot finish, use the exact run named in its sanitized failure report:

```powershell
node scripts/qa-campus-production.mjs --expected-sha=<full-40-character-sha> --cleanup=<exact-run>
```

Cleanup writes a separate `cleanup-results.json`, preserving the original run evidence. Cleanup mode reads only that private manifest and verifies its exact owner marker. It does not launch a browser or require the old deployment still to be current. An ambiguous Auth creation result retains this run reservation, marker and email as `needs-auth-reconciliation`; it does not claim no account exists or attempt user enumeration. Reconcile the exact Auth record before supplying its known ID to the private rescue manifest. Cleanup will then verify the email/metadata marker before deletion. A marker mismatch or unexpected object shape stops cleanup rather than widening its scope. Preserve the manifest if cleanup needs attention; never replace it with a real user's identifiers.

Preparation checks were read-only `--plan`, local syntax/scoped lint, and a pure filesystem contention check: one same-run winner, loser blocked before the simulated provider continuation, wrong-identity removal rejected, reconcilable marker/email retained, password excluded, and owned reservation removed. No real service was contacted. It has not been run against production, and it is not live release evidence until an authorized run passes and fixture cleanup is verified.
