# Deterministic Beta Gate

This framework records one beta decision under
`artifacts/beta-gate/<run-id>`. It does not deploy, target production, retain
raw command output, or store credential values or student source.

## Public Commands

Preflight protects exactly seventeen public package aliases. A release run
starts by checkpointing the intended source, then materializing that exact
checkpoint as a detached clean sibling worktree. Preflight and every gate run
from that worktree, never from the dirty source checkout. Finalization runs only
after two complete certification runs have passed for the same immutable
release SHA:

```powershell
$runId = "beta-20260901-01"
npm run beta:checkpoint -- --name=$runId --profile=release
$receiptPath = "artifacts/beta-checkpoints/release-candidates/$runId.json"
$receipt = Get-Content -LiteralPath $receiptPath -Raw | ConvertFrom-Json
npm run beta:materialize -- --run-id=$runId --receipt=$receiptPath --ref=$receipt.checkpointRef --sha=$receipt.checkpointCommit

# Run the Set-Location command printed by beta:materialize, then run:
npm run beta:dependencies
npm run beta:preflight -- --run-id=beta-20260901-01
# Before the local gate, place a fresh connector-generated staging type snapshot at:
# artifacts/beta-gate-inputs/beta-20260901-01/supabase-types-staging.ts
# with its matching supabase-types-staging.receipt.json. Then set the two
# non-secret variables shown below for this command only.
$env:DIANA_SUPABASE_TYPES_PROJECT_REF = "<20-character-staging-project-ref>"
$env:DIANA_SUPABASE_TYPES_SNAPSHOT = (Join-Path (Get-Location) "artifacts/beta-gate-inputs/beta-20260901-01/supabase-types-staging.ts")
npm run beta:gate:local -- --run-id=beta-20260901-01
npm run beta:evaluation -- corpus
npm run beta:evidence -- validate-all --run-id=beta-20260901-01 --sha=<checkpoint-commit-sha> --url=<diana-vercel-preview-origin>
npm run beta:fixtures -- --run-id=beta-20260901-01
npm run beta:subjects -- --run-id=beta-20260901-01 --full
npm run beta:browser -- --run-id=beta-20260901-01
npm run beta:lms:mock -- --run-id=beta-20260901-01
npm run beta:lms:staging -- --run-id=beta-20260901-01 --ack=DISPOSABLE_STAGING_WRITES
npm run beta:lms:cleanup -- --run-id=beta-20260901-01 --dry-run
npm run beta:lms:cleanup -- --run-id=beta-20260901-01 --apply --ack=DELETE_DISPOSABLE_STAGING_RESOURCES
npm run beta:cleanup -- --run-id=beta-20260901-01
npm run beta:gate:staging -- --run-id=beta-20260901-01 --sha=<checkpoint-commit-sha> --url=<diana-vercel-preview-origin>
npm run beta:report -- --run-id=beta-20260901-01
npm run beta:finalize -- prepare --run-a=<first-run-id> --run-b=<second-run-id> --sha=<full-commit-sha> --url=<diana-vercel-preview-origin> --finalized-at=<iso-time> --producer-id=<id> --producer-kind=<automation-or-operator> --producer-tool=<tool> --producer-version=<version>
npm run beta:finalize -- finalize --run-a=<first-run-id> --run-b=<second-run-id> --sha=<full-commit-sha> --url=<diana-vercel-preview-origin> --finalized-at=<same-iso-time> --producer-id=<same-id> --producer-kind=<same-kind> --producer-tool=<same-tool> --producer-version=<same-version> --key-id=<trusted-key-id> --signature=<detached-base64-signature>
```

Preflight requires these exact package aliases and blocks when any alias,
body, or matching lifecycle boundary differs:

| Alias | Exact package script body |
|---|---|
| `beta:preflight` | `tsx scripts/beta/preflight.ts` |
| `beta:dependencies` | `node scripts/beta/verify-dependency-install.mjs` |
| `beta:checkpoint` | `node scripts/beta/checkpoint.mjs` |
| `beta:materialize` | `node scripts/beta/materialize-checkpoint.mjs` |
| `beta:evaluation` | `tsx scripts/beta/evaluation-harness.ts` |
| `beta:evidence` | `tsx scripts/beta/external-evidence.ts` |
| `beta:gate:local` | `node --experimental-strip-types --experimental-loader ./scripts/beta/typescript-resolution-loader.mjs ./scripts/beta/local-gate.ts` |
| `beta:fixtures` | `tsx scripts/beta/fixtures.ts` |
| `beta:subjects` | `tsx scripts/beta/subjects.ts` |
| `beta:browser` | `tsx scripts/beta/browser.ts` |
| `beta:lms:mock` | `tsx scripts/beta/lms-mock.ts` |
| `beta:lms:staging` | `tsx scripts/beta/lms-staging.ts` |
| `beta:lms:cleanup` | `tsx scripts/beta/lms-cleanup.ts` |
| `beta:gate:staging` | `tsx scripts/beta/staging-gate.ts` |
| `beta:report` | `tsx scripts/beta/report.ts` |
| `beta:cleanup` | `tsx scripts/beta/cleanup.ts` |
| `beta:finalize` | `tsx scripts/beta/finalize.ts` |

The package aliases are part of the release contract. Preflight blocks if any
one is missing, changed, or wrapped by a lifecycle hook.

## Checkpoint And Materialization

`beta:checkpoint -- --name=<run-id> --profile=release` uses an alternate Git
index to capture the intended candidate without staging, resetting, cleaning,
or checking out the source worktree. Before it writes a tree, commit, or ref, it
runs Gitleaks against full Git history and an owned temporary raw-blob mirror of
the exact alternate-index candidate. This exact-candidate scan is mandatory.
Every checkpoint Git process disables replacement objects, hooks, fsmonitor,
and global or system attributes. Repository grafts, alternates, replacement
refs, repository-local attributes, and any effective clean, smudge, process, or
LFS filter block before staging. Built-in Git attribute handling may normalize
the alternate index, but the receipt and scan bind the exact resulting blob
bytes, not source paths or checkout bytes.

Git and the Windows command locator are resolved once from the canonical
Windows system directory before any repository-controlled working directory is
used. Every later Git process receives that exact absolute executable path.
Repository-local `git.*` or `where.*` shadows, relative scanner overrides, and
any pinned executable that resolves inside the checkout block before Git or the
scanner runs. The real index must not contain `assume-unchanged` or
`skip-worktree` entries.

The command creates one ref and one non-overwriting receipt:

```text
refs/beta/release-candidates/<run-id>
artifacts/beta-checkpoints/release-candidates/<run-id>.json
```

Receipt schema v3 records the checkpoint name, ref, commit SHA, tree SHA,
parent SHA, release profile, source-snapshot digest, and proof that the source
index was unchanged. It also binds both the Git-object manifest and a SHA-256
manifest of every raw blob byte sequence, canonical empty scan-report hashes,
the policy-pinned scanner identity, and the Git blob IDs plus SHA-256 digests of
the trusted release manifest and Gitleaks policy. The temporary root is created
by the command, identity-bound to its canonical parent, kept outside the source
checkout, and removed by a link-safe owned-tree walk. Cleanup refuses a replaced
root instead of recursively deleting an unverified path. The walk revalidates
the complete owned-directory identity chain after every enumeration and before
each unlink or directory removal. A raced junction stops cleanup; no path
reached through the replacement is unlinked. The source receipt is canonical
JSON with `materialization: null`; an existing ref or receipt blocks.

`beta:materialize` requires the run ID, fixed receipt path, fixed release ref,
and full lowercase SHA. It rejects extra or duplicate arguments. It validates
receipt schema v3, canonical bytes, the exact ref-to-SHA binding, commit object,
tree, single parent, source-policy descriptors, scanner allowlist, candidate
object and raw-byte manifests, and the complete checkpointed source-snapshot
digest before creating anything. It then resolves a pinned scanner again and
reruns both scans against a newly materialized raw-blob mirror. Only that second
successful scan can add the `materialization` attestation to the receipt copy in
the detached worktree; the source receipt is never rewritten. A candidate Git
symlink, submodule, or external filter is
rejected even if a forged receipt claims that symlinks were already rejected.
Gitleaks 8.30.1 runs with `gitleaks:allow` comments disabled and with its ignore
file redirected to a command-owned empty file. Legitimate synthetic fixtures
are allowed only by the immutable HEAD policy using path-plus-value `AND`
allowlists. Archive traversal is enabled to a fixed depth of five with a fixed
timeout. Before execution, the pinned scanner bytes are copied into the private
temporary root. Windows PowerShell is itself pinned by absolute system path and
holds the private executable open without write or delete sharing while hashing
and executing it, closing the binary-swap window.
The destination is derived only from the validated run ID:

```text
<source-parent>/<source-name>-beta-worktrees/<run-id>
```

There is no destination override. The command refuses an escaped path, a
symbolic-link worktree root or receipt path, and any existing target, including
an empty directory. It reserves the absent target and records the filesystem
identity of the worktree root and target. Those identities and canonical paths
are revalidated immediately before Git use, after checkout, and before and
after the attested receipt bytes are written through an exclusive file handle
under real directories in the detached worktree. Node does not expose `openat`
or a Windows no-rename directory handle, so an identity or canonical-path change
at any observable boundary fails closed and preserves the worktree for
inspection. A path swap, junction, symbolic link, or escape blocks. Hooks are
disabled for every materialization Git command; the new worktree must have the
requested `HEAD`, detached state, and `dirty=false`. Materialization also
verifies that source `HEAD`, branch attachment, index bytes, status bytes, and
tracked or nonignored source bytes still match the checkpoint receipt after the
independent scan, checkout, receipt publication, and final verification.
Before any gate runs, a fresh isolated index is loaded from the checkpoint tree,
refreshed against the materialized filesystem, and compared without consulting
the real index cache. Nonignored files outside the tree block. The downstream
validation boundary reruns the pinned scanner over both Git history and a new
raw-blob mirror; receipt fields that merely claim independent reverification do
not satisfy this boundary. The new report digests and scanner identity must
reproduce the immutable source and materialization evidence.

On success, materialization prints the exact `Set-Location`, dependency,
preflight, and local-gate commands for that run. It never runs those commands
and never removes a worktree. If a post-creation verification blocks, the
worktree is preserved for inspection instead of being deleted automatically.

Provider cleanup apply mode is available only through the protected cleanup
worker boundary. It requires the exact acknowledgement shown above plus
`DIANA_BETA_LMS_CLEANUP_WORKER_URL` and
`DIANA_BETA_LMS_CLEANUP_WORKER_TOKEN` in the protected staging environment.
The worker executes one action at a time, reconciles provider state after every
action, and does not retry an uncertain write. Local disposable cleanup runs
after that receipt and before the staging gate, so the immutable report records
the completed cleanup lifecycle.

## Run IDs

A run ID is 3 to 64 lowercase letters or digits separated by single hyphens.
It is an exact directory name, not a path. Traversal, absolute paths,
uppercase text, underscores, repeated separators, Windows device names, and
existing run directories are refused.

`QA_RUN_ID` equals the validated beta run ID. Every disposable resource name
contains that value.

## Local Gates

Preflight runs only after checkpoint materialization. It verifies the Diana
package, pinned Node major, exact package scripts, absence of matching `pre*`
and `post*` hooks, safe evidence location, source identity for the materialized
SHA, and the local-only boundary.

The dependency contract first verifies the pinned Node and npm versions, exact
lockfile identity, lifecycle policy, and installed dependency tree produced by
`npm ci`. The local gate then runs these fixed scripts in order:

1. `npm run beta:dependencies`
2. `npm run security:audit`
3. `npm run security:secrets`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run supabase:types:check`
7. `npm run test:run`
8. `npm run guardian:gate`
9. `npm run worker:deployment-check`
10. `npm run recovery:test`
11. `npm run tone-audit`
12. `npm run launch-audit`
13. `npm run build`

The secret scan uses official Gitleaks against full Git history and a temporary
mirror of every tracked or nonignored source file. It never copies ignored
local environment, secret, or browser-session files. Those local files must be
Git-ignored and cannot be tracked. The scan report contains no matched values.
This gate scan is in addition to the exact alternate-index candidate scan that
must pass before checkpoint creation.

Commands use shell-free execution and a small child-environment allowlist.
Only status, time, exit code, signal, and the fixed command enter evidence.

### Staging Type Snapshot

The generated database types gate must not depend on a linked Supabase project
inside a disposable worktree. Before the local gate, use the approved,
read-only Supabase connector to generate TypeScript types from the designated
staging project. Store its exact output at:

```text
artifacts/beta-gate-inputs/<run-id>/supabase-types-staging.ts
```

Place a matching `supabase-types-staging.receipt.json` beside it with this
exact schema:

```json
{
  "schemaVersion": 1,
  "kind": "diana-supabase-types-snapshot",
  "runId": "<run-id>",
  "projectRef": "<20-character-staging-project-ref>",
  "generator": "supabase-mcp.generate_typescript_types",
  "generatedAt": "<canonical ISO timestamp>",
  "sha256": "<snapshot SHA-256>",
  "byteCount": 0,
  "sensitiveDataExcluded": true
}
```

Set `DIANA_SUPABASE_TYPES_PROJECT_REF` to that same non-secret project ref and
`DIANA_SUPABASE_TYPES_SNAPSHOT` to the absolute snapshot path when starting
`beta:gate:local`. The gate validates the run ID, timestamp, byte count, hash,
project ref, and generated type content. It does not inherit an access token
or use a developer machine's linked-project state.

## Fixtures

`beta:fixtures` derives unique student, course, assignment, submission, and
browser-profile names from `QA_RUN_ID`. It writes one exact disposable
registry:

```text
artifacts/beta-gate/<run-id>/disposable/qa-resources.json
```

The registry contains deterministic names only. It has no credentials,
student records, or student source.

## Full Subjects Gate

`beta:subjects` requires `--full`. Without that flag, it writes a blocked
receipt and invokes nothing.

Full mode accepts one fixed input:

```text
artifacts/beta-gate-inputs/<run-id>/educational-evaluation-results.json
```

The input must contain the same `runId`. The command boundary is derived only
from that validated ID:

```text
npx tsx scripts/educational-evaluation-gate.ts gate --input=artifacts/beta-gate-inputs/<run-id>/educational-evaluation-results.json --format=text --detail-limit=0
```

This is the complete 996-case educational evaluation path. If the evaluator
script or fixed result bundle is absent, the subjects surface blocks. It never
accepts an operator-provided path or partial mode.

## Browser And LMS

`beta:browser` invokes only:

```text
npx playwright test tests/beta-browser.spec.ts --project=chromium --reporter=line --workers=1 --retries=0 --trace=retain-on-failure
```

It uses a run-derived localhost port and Next directory,
`QA_CREATE_USER=false`, and no hosted target.

`beta:lms:mock` runs the existing provider canary with intercepted traffic.
It performs no external provider writes.

`beta:lms:staging` requires the exact
`--ack=DISPOSABLE_STAGING_WRITES` acknowledgement plus:

- explicit disposable and staging environment markers
- `DIANA_BETA_QA_RUN_ID=<run-id>`
- Canvas and Classroom resource tags equal to `diana-qa-<run-id>`
- one full release SHA
- one exact non-production Diana Vercel preview origin
- an HTTPS Canvas host labeled beta, sandbox, staging, or test
- all existing provider write flags, identifiers, and credential variable names
- identifiers for the separate disposable Canvas grade assignment, student, and score
- no production environment marker

The wrapper checks sensitive variable names only. It invokes no provider
command unless every guard passes.

## Staging Gate

The staging gate is offline. It validates local Git state and fixed receipts,
but does not contact Vercel, Supabase, AI, voice, Canvas, or Classroom.

It requires:

1. A clean worktree and full SHA that names both a commit object and local `HEAD`.
2. An exact non-production Diana Vercel preview origin.
3. Passing full-subject and fixed-browser receipts.
4. Preview identity bound to the inspected and served SHA.
5. Passing migration, generated-types, Edge name parity, and Edge deployment-content receipts.
6. Passing database restore, security scan, dependency audit, and accessibility receipts.
7. Passing AI and voice smoke receipts plus proof that the uncertified managed
   voice worker is disabled in the deployed staging environment.
8. Passing physical iOS, Android, and Chromebook receipts.
9. Passing alerts-ready and 72-hour staging-soak receipts.
10. Passing intercepted and disposable-staging LMS receipts.
11. Product owner, privacy, security, teacher, teen, accessibility, physical-device, and operations approvals.

Read-only staging inputs live at:

```text
artifacts/beta-gate-inputs/<run-id>/
  subjects.json
  browser.json
  lms-mock.json
  lms-staging.json
  educational-evaluation-results.json
  preview-identity.json
  migration-parity.json
  types-parity.json
  edge-parity.json
  edge-deployment-content.json
  database-restore.json
  security-scan.json
  dependency-audit.json
  accessibility.json
  ai-smoke.json
  voice-smoke.json
  managed-voice-disabled.json
  ios-device.json
  android-device.json
  chromebook-device.json
  alerts-ready.json
  soak-72h.json
  human-approvals.json
  evidence/
    <redacted-machine-evidence>.json
```

Machine receipts use the exact `diana-beta-certification` schema and bind to
the run ID, `QA_RUN_ID`, SHA, URL, environment, issue time, producer identity,
and `sensitiveDataExcluded: true`. Each receipt references one redacted JSON
evidence file under `evidence/`, verifies its byte count and SHA-256 digest,
and carries an Ed25519 signature from a source-controlled trusted public key.

Each human role signs its own approval for the exact run, SHA, preview URL, and
issue time. The gate validates every signature independently. Trusted public
keys and allowed purposes live in
`config/beta-attestation-public-keys.json`, whose exact digest is pinned by the
fixed `config/beta-attestation-trust-root.json`; private keys never enter the
repository. Caller-selected trust-registry paths and digests are rejected. The
registry is empty by default, so staging cannot pass until reviewed automation
and approver public keys plus the matching trust-root digest are provisioned in
an intentional release-candidate change before preflight captures the source
identity.

## Evidence

```text
artifacts/beta-gate/<run-id>/
  .beta-gate-owned.json
  manifest.json
  report.md
  disposable/
    qa-resources.json
  gates/
    dependency-install.json
    dependency-audit.json
    secret-scan.json
    typecheck.json
    lint.json
    supabase-types.json
    unit-tests.json
    guardian-gate.json
    worker-deployment.json
    recovery-contract.json
    tone-audit.json
    launch-audit.json
    production-build.json
  surfaces/
    fixtures.json
    subjects.json
    browser.json
    lms-mock.json
    lms-staging.json
    staging-gate.json
    cleanup.json
```

The report is immutable once written. It is run evidence, not a beta-release
approval. Cleanup may append its own receipt to the manifest after the report
snapshot, but does not rewrite the report.

The release-status reader fails closed unless the manifest registers `report.md`
and that artifact still exists as a regular file. It does not reconstruct a
passing result from gate and surface receipts after the report is removed.
Finalization additionally verifies the report's exact canonical bytes.

## Signed Release Finalization

`beta:finalize` is the final release authority. It requires two distinct,
complete certification runs for the same SHA and staging URL. Both runs must
contain every required gate and surface, signed machine certifications, human
approvals, and verified provider cleanup. `prepare` validates every digest and
prints the exact canonical bytes. Protected release infrastructure signs those
bytes with Ed25519 outside this process. `finalize` accepts only the detached
public signature and creates one immutable bundle. Private keys are never read
by Diana tooling or stored in the repository or beta evidence directory.

The corresponding public key and purpose must already be reviewed in the
registry pinned by `config/beta-attestation-trust-root.json` in the clean
release commit. The bundle records both trust-root and registry fingerprints,
and verification recomputes them from that fixed repository path. CI may carry
only the validated trust-root SHA-256 into a real subjects child as a continuity
check. An empty registry is intentionally blocking. A per-run report, local
green test result, or unsigned artifact is not authorization to promote
production.

Finalization and verification evaluate all evidence freshness against the
actual current validation time, with a seven-day maximum age and five-minute
future allowance. They do not restart the age window at `finalizedAt`.

## Cleanup

`beta:cleanup -- --run-id=<id>` is intentionally evidence preserving. It
does not accept a deletion confirmation because it never removes the beta run
directory.

Cleanup validates and unlinks only:

```text
artifacts/beta-gate/<run-id>/disposable/qa-resources.json
```

It then removes the now-empty `disposable` directory with non-recursive file
operations and writes `surfaces/cleanup.json`. The manifest registers that
receipt. The ownership marker, manifest, report, gate receipts, other surface
receipts, and `artifacts/beta-gate-inputs` remain.

If the disposable directory contains an unknown file, cleanup removes nothing.
If an LMS staging receipt records provider writes, cleanup requires a signed,
immutable provider-cleanup receipt proving the exact disposable provider
resources were removed. It does not retry or infer cleanup from provider
errors. Without that receipt it blocks and preserves all evidence for operator
review.

### Materialized Worktree Cleanup

`beta:cleanup` does not remove the detached Git worktree. Keep that worktree
registered while it has an active process, unfinished work, or the only copy of
run evidence. Before removing it, preserve the complete
`artifacts/beta-gate/<run-id>` and required input evidence in the approved
immutable evidence location.

After preservation is verified and all work in the materialized checkout is
finished, return to the source checkout and use the exact non-forced command
printed by `beta:materialize`:

```powershell
Set-Location -LiteralPath '<source-worktree>'
& '<absolute-pinned-git-path>' worktree remove -- '<materialized-worktree>'
```

This removal deletes the materialized directory, including ignored dependency
and evidence files. Do not add `--force`. The materialization command never
runs cleanup automatically, and a materialization failure preserves any
created worktree for inspection.
