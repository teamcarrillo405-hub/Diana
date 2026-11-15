# Supabase Disaster Recovery Verification

This runbook verifies that Diana can produce and inspect a logical PostgreSQL backup without restoring into staging or production. The repository workflow never executes `pg_restore`. A real restore rehearsal remains a separately approved operator action against an empty, disposable local database.

## Safety contract

- `preflight` validates local PostgreSQL tools and the shape of a dedicated database URL. It does not connect.
- `backup` is the only mode that connects to a source database. It requires `--confirm-create-backup`, requires a new output path, and removes a partial archive if creation or verification fails.
- `verify` only reads an existing custom-format archive with `pg_restore --list`, computes SHA-256, and reports an object inventory.
- `dry-run` verifies the archive and emits a restore plan. It never executes that plan.
- Restore planning accepts only `localhost`, `127.0.0.1`, or `::1`. The database name must clearly contain `recovery`, `restore`, `disposable`, or `_dr_`.
- The generated restore plan omits `--clean` and `--create`. It cannot drop or replace an existing database through this workflow.
- Database passwords are passed to PostgreSQL tools through `PGPASSWORD` and are never written to evidence output.

## Coverage and limits

The logical archive covers database schemas and rows visible to the backup role, including Supabase database metadata. It does not preserve Supabase Storage object bytes, project settings, Auth provider secrets, Edge Function secrets or deployments, Vercel configuration, DNS, or third-party provider state. Supabase managed backups and point-in-time recovery are separate controls and must remain enabled and owned according to the service plan.

Archive verification proves that `pg_restore` can read the archive catalog and that the artifact has a stable hash. It does not prove application correctness after restore. That requires an isolated restore rehearsal plus application, Auth, RLS, Storage, and migration-ledger checks.

## Prerequisites

1. Install PostgreSQL client tools so `pg_dump` and `pg_restore` are on `PATH`. Use a client major version equal to or newer than the source PostgreSQL major version.
2. Obtain a dedicated, least-privileged backup connection URL from the Supabase operator. Do not use the browser anon key or service-role API key.
3. Confirm network access to the Supabase session endpoint. Transaction-pooler URLs may not support a complete logical dump.
4. Choose an operator-controlled evidence directory outside source control. Backup archives contain student data and must be encrypted, access-controlled, retained, and deleted according to the approved policy.

## 1. Test the workflow

This test does not need PostgreSQL, Docker, network access, or secrets.

```powershell
npm run recovery:test
```

## 2. Run preflight

Set the URL only in the current process. Preflight parses it but does not connect.

```powershell
$env:DIANA_RECOVERY_DB_URL = '<operator-provided-postgresql-url>'
npm run recovery:verify -- preflight --source=staging --evidence='C:\secure-evidence\diana\preflight.json'
```

Expected evidence has `status: "pass"`, both tool versions, `databaseConnectionAttempted: false`, the source classification, and a credential-present boolean. It never includes the password.

## 3. Create a logical backup

Creation must be an explicit operator action. The command refuses to overwrite either the archive or evidence file.

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "C:\secure-evidence\diana\diana-staging-$stamp.dump"
$evidence = "C:\secure-evidence\diana\diana-staging-$stamp.json"
npm run recovery:verify -- backup --source=staging --output="$backup" --confirm-create-backup --evidence="$evidence"
```

Successful output records the archive path, byte size, SHA-256, `pg_dump` and `pg_restore` versions, and catalog counts. The backup is verified immediately after creation. This command is read-only against the source database, but it can add load; schedule it with the Supabase operator.

Do not run this repository workflow as evidence that production restore works. It creates a logical archive only and performs no restore.

## 4. Verify an existing archive

This is the CI-safe artifact check when PostgreSQL client tools and a protected backup artifact are available. It needs no database URL and makes no network connection.

```powershell
npm run recovery:verify -- verify --backup="$backup" --evidence='C:\secure-evidence\diana\archive-verification.json'
```

CI should retain the JSON evidence separately from the encrypted archive. Treat the SHA-256 as integrity evidence, not as proof that the artifact is confidential.

## 5. Produce a disposable restore plan

Provision an empty local PostgreSQL database with a clearly disposable name. The workflow validates the target URL, verifies the archive again, and prints the exact non-cleaning `pg_restore` arguments without executing them.

```powershell
$env:DIANA_RECOVERY_TARGET_DB_URL = 'postgresql://recovery_operator:<password>@127.0.0.1:5432/diana_recovery_verify'
npm run recovery:verify -- dry-run --backup="$backup" --evidence='C:\secure-evidence\diana\restore-plan.json'
```

Before a real rehearsal, a database owner must confirm that the target is disposable, empty, local, and contains no shared data. Execution of the emitted plan is intentionally outside this script and requires separate approval. Never substitute a staging or production URL.

## Acceptance evidence

A recovery-readiness record is complete only when it includes:

1. Source environment and immutable application release identifier.
2. Archive timestamp, byte size, SHA-256, and PostgreSQL tool versions.
3. Non-empty archive inventory from `pg_restore --list`.
4. Protected evidence and archive locations, retention deadline, and named owner.
5. For a real isolated rehearsal: target identifier, start/end time, restore result, migration-ledger comparison, RLS checks with two users, Auth and Storage validation, application smoke results, and cleanup confirmation.
6. Separate confirmation of Supabase managed backup or PITR status and Storage-object recovery coverage.

## Failure handling

- Missing tool: install a compatible PostgreSQL client and rerun preflight.
- Missing URL variable: set the dedicated variable in the operator or CI secret store. Do not place it in repository files.
- `pg_dump` connection or permission error: preserve the JSON/error output, check session-endpoint access and backup-role grants, and do not weaken production privileges ad hoc.
- Archive inventory error: quarantine the archive, preserve its failed evidence, create a new backup explicitly, and investigate before release.
- Existing output or evidence path: choose a new timestamped path. The workflow intentionally has no overwrite switch.
- Restore-plan target rejection: create a new disposable local database with an allowed name. Do not bypass the host or naming guard.

## External prerequisites

Repository automation cannot complete these controls: Supabase backup/PITR entitlement and retention configuration, protected Storage-object backup, access to a suitable backup role, an isolated PostgreSQL restore host, operator approval for an actual rehearsal, post-restore application credentials, and documented custody/deletion of student-data archives.
