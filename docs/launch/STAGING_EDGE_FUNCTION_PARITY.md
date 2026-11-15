# Staging Edge Function Content Parity

The staging release gate verifies deployed Edge Function content, not only
function names. It uses a deterministic local source fingerprint plus a
protected deployment receipt that binds the local source to Supabase's live
deployment metadata.

This workflow is staging-only. The deployment command refuses production
project refs and dirty worktrees.

## Source-owned function inventory

`config/edge-function-manifest.json` is the canonical inventory. It assigns
every named function one of three classifications:

- `managed`: source must exist locally, must be present in staging, is the only
  classification the deployment command can deploy, and is included in the
  receipt.
- `deprecated`: may remain remote-only for retirement compatibility. It must
  not have a local function directory and is never deployed or included in a
  receipt.
- `local-only`: source must exist locally but must not exist in staging. It is
  never deployed or included in a receipt.

The manifest parser rejects unknown fields, duplicate names, invalid names, and
unsorted entries. The deployment command refuses an unclassified local
directory, a deprecated directory that has reappeared locally, a local-only
function found remotely, or any unknown remote function. This makes folder
creation insufficient authorization to deploy a function.

## Source fingerprint

`diana-edge-source-sha256-v1` starts at each function's
`supabase/functions/<name>/index.ts` and recursively follows relative imports
that resolve inside `supabase/functions`. This includes every direct and
transitive repository-local dependency under `supabase/functions/_shared` and
also covers a repository-local function wrapper that imports another function.

External `jsr:`, `npm:`, and HTTPS modules are not downloaded or hashed. Local
source text has its UTF-8 BOM removed and CRLF or CR line endings normalized to
LF. The fingerprint is SHA-256 over a canonical, path-sorted list containing
each repository-relative source path and its normalized-content SHA-256.
Unreferenced `_shared` files do not affect a function.

The result is deterministic across supported operating systems and contains no
source text, credentials, environment values, or student data.

## Receipt format

The command writes schema version 2 as JSON:

```json
{
  "schema": "diana-staging-edge-deployment-receipt",
  "schemaVersion": 2,
  "environment": "staging",
  "sourceFingerprintAlgorithm": "diana-edge-source-sha256-v1",
  "functionManifestSha256": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "projectRef": "abcdefghijklmnopqrst",
  "releaseSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "createdAt": "2026-08-31T07:00:00.000Z",
  "sensitiveDataExcluded": true,
  "functions": [
    {
      "name": "example-function",
      "sourceFingerprint": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "remoteVersion": 7,
      "remoteEzbrSha256": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
    }
  ]
}
```

The parser rejects unknown fields, duplicate or unsorted function entries,
non-staging environments, unsupported schema versions, malformed refs or
hashes, and `sensitiveDataExcluded` values other than `true`. This keeps the
receipt minimal and prevents credentials from being added to evidence.
The manifest digest binds the evidence to the exact source-owned inventory that
authorized the managed functions in the receipt.

## Guarded staging deployment

Start from the exact release commit in a clean worktree. Configure these values
in the operator environment:

```powershell
$env:DIANA_DEPLOY_ENVIRONMENT = "staging"
$env:SUPABASE_PROJECT_REF = "<20-character-staging-project-ref>"
$env:SUPABASE_STAGING_PROJECT_REF = "<20-character-staging-project-ref>"
$env:SUPABASE_PRODUCTION_PROJECT_REF = "<20-character-production-project-ref>"
$env:SUPABASE_ACCESS_TOKEN = "<operator-token>"
```

Then run the guarded command with the full 40-character SHA for the current
`HEAD`:

```powershell
npx tsx scripts/deploy-staging-edge-functions.ts --release-sha=<full-commit-sha>
```

Before any deployment, the command requires all of the following:

1. `DIANA_DEPLOY_ENVIRONMENT` is exactly `staging`.
2. The target ref exactly equals `SUPABASE_STAGING_PROJECT_REF`.
3. Staging and production refs are present and different.
4. The target does not equal `SUPABASE_PRODUCTION_PROJECT_REF`.
5. The requested SHA is a commit object and exactly equals local `HEAD`.
6. `git status --porcelain=v1 --untracked-files=all` is empty.
7. The checked-in manifest covers every local directory and permits every
   remote function. Only managed functions are fingerprinted and deployed.
8. No receipt already exists for that release SHA.

The command uses Supabase CLI `2.111.0`, deploys functions in sorted order,
then repeats the clean `HEAD` guard, source fingerprint snapshot, and manifest
digest before it reads live metadata. A receipt is written only after every
managed name has matching remote metadata with a positive version and a valid
`ezbr_sha256`.
The output path is:

```text
artifacts/staging-edge-deployments/<release-sha>.json
```

`artifacts/` is ignored by Git. The receipt contains the project ref and
deployment metadata but no access token or secret value. If a deployment stops
partway through, no receipt is written. Resolve the cause and rerun from the
same clean release commit.

## Protected CI handoff

After a successful staging deployment, place the exact receipt JSON in the
GitHub `staging` environment secret named
`STAGING_EDGE_DEPLOYMENT_RECEIPT_JSON`. The receipt itself is secret-free, but
the protected environment prevents an untrusted workflow from replacing the
release evidence.

On each push to `main`, `staging-edge-parity` writes that value to a temporary
mode-600 file and runs content parity against `github.sha`. The job fails for:

- an unclassified local function, missing managed or local-only source, or a
  deprecated function that appears locally
- a managed function missing remotely, a local-only function deployed remotely,
  or an unknown remote function
- a receipt manifest digest mismatch, missing-receipt function, or
  receipt-only function
- a receipt project ref or release SHA mismatch
- a current source fingerprint that differs from the deployment receipt
- a live remote version that differs from the deployment receipt
- a live remote `ezbr_sha256` that differs from the deployment receipt
- malformed or missing live metadata or receipt fields

For a manual content check, use:

```powershell
$env:SUPABASE_PROJECT_REF = "<20-character-staging-project-ref>"
$env:SUPABASE_ACCESS_TOKEN = "<read-capable-token>"
npm run edge-functions:parity -- --receipt=<receipt-path> --release-sha=<full-commit-sha>
```

Name comparison remains available only as an explicit diagnostic:

```powershell
npm run edge-functions:parity -- --name-only
```

`--name-only` does not read a receipt or verify source, versions, or hashes. It
must not be used as staging release evidence.
