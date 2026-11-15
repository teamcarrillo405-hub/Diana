# Disposable LMS Certification Cleanup

## Purpose

Canvas and Google Classroom certification may create provider-side courses,
coursework, files, submissions, enrollments, and OAuth grants. Those resources
must be removed by the provider owner after certification. Local beta cleanup
does not receive LMS credentials and cannot claim that provider data was
removed.

The cleanup contract in `lib/beta/lms-cleanup.ts` is fail closed. It binds every
action to one beta run, source identity, release SHA, staging preview, resource
namespace, provider origin, resource tag, parent resource, and expected provider
binding digest.

## Resource Inventory

The certification owner places a credential-free inventory at:

```text
artifacts/beta-gate-inputs/<run-id>/lms-cleanup-resources.json
```

The inventory must:

- identify exactly one Canvas inventory and one Google Classroom inventory;
- use the exact `diana-qa-<run-id>` tenant and resource tag;
- declare itself complete, disposable, and staging-only;
- match the source identity, release SHA, and preview origin in the beta run;
- list every provider resource with its exact parent and a SHA-256 binding
  digest; and
- contain no tokens, secrets, passwords, cookies, student work, or raw provider
  responses.

Canvas must use an origin whose hostname explicitly identifies a sandbox, test,
beta, or staging tenant. Google Classroom has no separate sandbox API origin, so
the contract permits only `https://classroom.googleapis.com` and requires the
testing project, tenant marker, and every resource tag to match the disposable
QA namespace.

## Dry Run

The standalone command never loads credentials and never performs provider
actions:

```text
npx tsx scripts/beta/lms-cleanup.ts --run-id=<run-id> --dry-run
```

It validates the inventory and prints the canonical child-first plan. Missing
configuration, a changed source tree, a non-passing staging receipt, production
origins, loose tags, unknown fields, or secret-like values block the plan with
zero provider calls.

## Provider-Owned Execution

The provider certification worker imports `runBetaLmsCleanup` and injects one
`BetaLmsCleanupProviderWorker` for Canvas and one for Google Classroom. The
standalone script deliberately cannot execute this mode.

Execution requires the exact acknowledgement:

```text
DELETE_DISPOSABLE_STAGING_RESOURCES
```

Each worker owns its credentials and implements two operations:

1. `inspect` returns the current provider state and the exact resource binding.
2. `remove` performs one idempotent provider action using the supplied action
   key.

The orchestrator processes one resource at a time, children before parents. It
inspects before removal and reconciles state after removal. An absent resource
is accepted without another delete. An unknown state blocks immediately. If a
request is interrupted, Diana inspects provider state and never retries the
uncertain action automatically.

## Receipt and Recovery

A fully reconciled run writes one immutable receipt at:

```text
artifacts/beta-gate/<run-id>/provider-cleanup/lms-cleanup.json
```

The receipt stores action and provider-receipt digests, not raw resource IDs or
provider references. Replaying the same plan returns the existing receipt and
performs no provider calls.

Execution uses a run-scoped lock. If a process terminates without releasing the
lock, an operator must inspect both providers and reconcile every listed
resource before removing the lock. Do not delete a lock merely to make a gate
pass.

The provider cleanup receipt is separate from local artifact cleanup. Immutable
beta evidence remains in place, and this worker never recursively deletes local
directories.
