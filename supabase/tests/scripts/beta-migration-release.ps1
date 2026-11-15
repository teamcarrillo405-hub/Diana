[CmdletBinding(DefaultParameterSetName = "Linked")]
param(
  [Parameter(Mandatory = $true, ParameterSetName = "Linked")]
  [switch]$Linked,

  [Parameter(Mandatory = $true, ParameterSetName = "Replay")]
  [string]$DatabaseUrl,

  [Parameter(Mandatory = $true, ParameterSetName = "Replay")]
  [switch]$ConfirmDisposable
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$cliVersion = "2.111.0"
$stagingHead = "20260902215000"
$releaseHead = "20260902215000"
$expectedPendingVersions = @()
$historicalHashes = @{
  "20260811103918_assignment_problem_progress.sql" = "5539306f55be4c8621cc6124d40fb19d317146cb288769c37ec00636ed0a6fa6"
  "20260811120000_assignment_problem_progress.sql" = "34eefacb6a7e61b65401e14fc109b38ded7f8145c6b1df7fcd348b6967e5d23e"
}
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$migrationsDirectory = Join-Path $repoRoot "supabase\migrations"
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$npx = Get-Command npx -ErrorAction Stop
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false

function Assert-ExactSequence {
  param(
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]]$Expected,
    [Parameter(Mandatory = $true)][AllowEmptyCollection()][string[]]$Actual,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if ($Expected.Count -ne $Actual.Count) {
    throw "$Label count mismatch. Expected $($Expected.Count), received $($Actual.Count)."
  }

  for ($index = 0; $index -lt $Expected.Count; $index += 1) {
    if ($Expected[$index] -cne $Actual[$index]) {
      throw (
        "$Label mismatch at position $index. " +
        "Expected $($Expected[$index]), received $($Actual[$index])."
      )
    }
  }
}

function Get-NormalizedSql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $normalized = $Sql.Replace("`r`n", "`n")
  $normalized = [Regex]::Replace(
    $normalized,
    "(?im)^\s*begin;\s*$|^\s*commit;\s*$",
    ""
  )
  $normalized = [Regex]::Replace($normalized, ";+", ";")
  return [Regex]::Replace($normalized, "\s+", " ").Trim()
}

function Get-NormalizedSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)

  $content = [IO.File]::ReadAllText($Path).Replace("`r`n", "`n")
  $bytes = [Text.Encoding]::UTF8.GetBytes($content)
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  }
  finally {
    $sha.Dispose()
  }
}

function Invoke-PsqlScalar {
  param(
    [Parameter(Mandatory = $true)][string]$PsqlPath,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $output = @(
    & $PsqlPath -X -v ON_ERROR_STOP=1 -A -t "--dbname=$DatabaseUrl" -c $Sql 2>&1 |
      ForEach-Object { $_.ToString().Trim() } |
      Where-Object { $_ -ne "" }
  )
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL verification failed with exit code $LASTEXITCODE."
  }
  return $output
}

function Invoke-PsqlFile {
  param(
    [Parameter(Mandatory = $true)][string]$PsqlPath,
    [Parameter(Mandatory = $true)][string]$Sql
  )

  $contractPath = Join-Path ([IO.Path]::GetTempPath()) (
    "diana-beta-migration-contract-" + [Guid]::NewGuid().ToString("N") + ".sql"
  )
  [IO.File]::WriteAllText($contractPath, $Sql, $utf8NoBom)
  try {
    & $PsqlPath -X -v ON_ERROR_STOP=1 "--dbname=$DatabaseUrl" -f $contractPath
    if ($LASTEXITCODE -ne 0) {
      throw "PostgreSQL migration contract failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Remove-Item -LiteralPath $contractPath -Force -ErrorAction SilentlyContinue
  }
}

$migrationFiles = @(Get-ChildItem -LiteralPath $migrationsDirectory -Filter "*.sql" -File |
  Sort-Object Name)
if ($migrationFiles.Count -eq 0) {
  throw "No migration files were found."
}

$migrationVersions = @()
foreach ($migrationFile in $migrationFiles) {
  if ($migrationFile.Name -notmatch "^(\d+)_[a-z0-9_]+\.sql$") {
    throw "Migration name does not follow the required version_name.sql format: $($migrationFile.Name)"
  }
  $migrationVersions += $Matches[1]
}

if (@($migrationVersions | Sort-Object -Unique).Count -ne $migrationVersions.Count) {
  throw "Migration versions are not unique."
}
Assert-ExactSequence `
  -Expected @($migrationVersions | Sort-Object) `
  -Actual $migrationVersions `
  -Label "Local migration ordering"

if ($migrationVersions[-1] -cne $releaseHead) {
  throw "Expected release head $releaseHead, found $($migrationVersions[-1])."
}

$expectedStagingVersions = @($migrationVersions | Where-Object {
  [long]$_ -le [long]$stagingHead
})
$pendingVersions = @($migrationVersions | Where-Object {
  [long]$_ -gt [long]$stagingHead
})
Assert-ExactSequence `
  -Expected $expectedPendingVersions `
  -Actual $pendingVersions `
  -Label "Local-only migration set"

foreach ($entry in $historicalHashes.GetEnumerator()) {
  $path = Join-Path $migrationsDirectory $entry.Key
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Applied historical migration is missing: $($entry.Key)"
  }
  $actualHash = Get-NormalizedSha256 -Path $path
  if ($actualHash -cne $entry.Value) {
    throw "Applied historical migration changed: $($entry.Key)"
  }
}

$firstHistoricalSql = [IO.File]::ReadAllText(
  (Join-Path $migrationsDirectory "20260811103918_assignment_problem_progress.sql")
)
$secondHistoricalSql = [IO.File]::ReadAllText(
  (Join-Path $migrationsDirectory "20260811120000_assignment_problem_progress.sql")
)
if ((Get-NormalizedSql $firstHistoricalSql) -cne (Get-NormalizedSql $secondHistoricalSql)) {
  throw "The applied assignment-progress migrations no longer have equivalent semantics."
}

if ($Linked) {
  $output = @(
    & $npx.Source --yes "supabase@$cliVersion" migration list --linked --output-format json 2>&1 |
      ForEach-Object { $_.ToString() }
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Linked migration lookup failed with exit code $LASTEXITCODE."
  }

  $jsonLine = @($output | Where-Object {
    $_.TrimStart().StartsWith('{"migrations"')
  } | Select-Object -Last 1)
  if ($jsonLine.Count -ne 1) {
    throw "Linked migration lookup did not return the expected JSON payload."
  }

  $payload = $jsonLine[0] | ConvertFrom-Json
  $localVersions = @($payload.migrations |
    Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_.local) } |
    ForEach-Object { [string]$_.local })
  $remoteVersions = @($payload.migrations |
    Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_.remote) } |
    ForEach-Object { [string]$_.remote })
  $remoteMismatches = @($payload.migrations | Where-Object {
    -not [string]::IsNullOrWhiteSpace([string]$_.local) -and
    -not [string]::IsNullOrWhiteSpace([string]$_.remote) -and
    [string]$_.local -cne [string]$_.remote
  })
  if ($remoteMismatches.Count -gt 0) {
    throw "Linked migration history contains a local/remote version mismatch."
  }

  Assert-ExactSequence `
    -Expected $migrationVersions `
    -Actual $localVersions `
    -Label "Linked local ledger"
  Assert-ExactSequence `
    -Expected $expectedStagingVersions `
    -Actual $remoteVersions `
    -Label "Linked staging ledger"

  $pendingLabel = if ($pendingVersions.Count -eq 0) { "none" } else { $pendingVersions -join ", " }
  Write-Output (
    "Linked staging migration ledger is exact through $stagingHead; " +
    "local-only versions: $pendingLabel."
  )
  exit 0
}

if (-not $ConfirmDisposable) {
  throw "Full replay requires -ConfirmDisposable."
}

try {
  $databaseUri = [Uri]$DatabaseUrl
}
catch {
  throw "DatabaseUrl must be an absolute PostgreSQL URL."
}
if ($databaseUri.Scheme -notin @("postgres", "postgresql")) {
  throw "DatabaseUrl must use the postgres or postgresql scheme."
}
if ($databaseUri.Host -notin @("localhost", "127.0.0.1", "::1")) {
  throw "Full replay is restricted to a local disposable database."
}

$psql = Get-Command psql -ErrorAction Stop
$baseline = Invoke-PsqlScalar -PsqlPath $psql.Source -Sql @'
select concat_ws('|',
  (to_regclass('auth.users') is not null)::text,
  (to_regprocedure('auth.uid()') is not null)::text,
  (to_regclass('storage.buckets') is not null)::text,
  (to_regclass('storage.objects') is not null)::text,
  (select exists(select 1 from pg_roles where rolname = 'authenticated'))::text,
  (select exists(select 1 from pg_roles where rolname = 'service_role'))::text
);
'@
if ($baseline.Count -ne 1 -or $baseline[0] -cne "true|true|true|true|true|true") {
  throw "Disposable database is missing the required clean Supabase platform baseline."
}

$preReplayVersions = Invoke-PsqlScalar -PsqlPath $psql.Source -Sql @'
select version from supabase_migrations.schema_migrations order by version;
'@
if ($preReplayVersions.Count -ne 0) {
  throw "Disposable database already contains project migration history."
}

$tempProject = Join-Path ([IO.Path]::GetTempPath()) (
  "diana-beta-migration-release-" + [Guid]::NewGuid().ToString("N")
)
try {
  $tempMigrations = Join-Path $tempProject "supabase\migrations"
  New-Item -ItemType Directory -Path $tempMigrations -Force | Out-Null
  [IO.File]::WriteAllText(
    (Join-Path $tempProject "supabase\config.toml"),
    "project_id = `"diana-beta-migration-release`"`n",
    $utf8NoBom
  )
  foreach ($migrationFile in $migrationFiles) {
    Copy-Item -LiteralPath $migrationFile.FullName -Destination $tempMigrations
  }

  $migrationOutput = @(
    & $npx.Source --yes "supabase@$cliVersion" migration up --include-all `
      --db-url $DatabaseUrl --workdir $tempProject 2>&1 |
      ForEach-Object { $_.ToString() }
  )
  if ($LASTEXITCODE -ne 0) {
    throw "Full migration replay failed with exit code $LASTEXITCODE."
  }

  $appliedVersions = Invoke-PsqlScalar -PsqlPath $psql.Source -Sql @'
select version from supabase_migrations.schema_migrations order by version;
'@
  Assert-ExactSequence `
    -Expected $migrationVersions `
    -Actual $appliedVersions `
    -Label "Disposable replay ledger"

  Invoke-PsqlFile -PsqlPath $psql.Source -Sql @'
begin;

do $acl_contract$
declare
  function_row record;
begin
  select p.prosecdef, p.proconfig
  into function_row
  from pg_proc p
  where p.oid = 'public.merge_assignment_problem_work(uuid,jsonb)'::regprocedure;

  if function_row.prosecdef then
    raise exception 'assignment problem merge must remain security invoker';
  end if;
  if function_row.proconfig is null
     or not ('search_path=public, pg_temp' = any(function_row.proconfig)) then
    raise exception 'assignment problem merge has an unexpected search_path';
  end if;
  if has_function_privilege(
    'anon', 'public.merge_assignment_problem_work(uuid,jsonb)', 'EXECUTE'
  ) then
    raise exception 'anonymous role can execute assignment problem merge';
  end if;
  if not has_function_privilege(
    'authenticated', 'public.merge_assignment_problem_work(uuid,jsonb)', 'EXECUTE'
  ) then
    raise exception 'authenticated role cannot execute assignment problem merge';
  end if;
  if not has_function_privilege(
    'service_role', 'public.merge_assignment_problem_work(uuid,jsonb)', 'EXECUTE'
  ) then
    raise exception 'service role cannot execute assignment problem merge';
  end if;
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.assignment_problems'::regclass
      and conname = 'assignment_problems_progress_status_check'
      and pg_get_constraintdef(oid) like '%not_started%in_progress%done%'
  ) then
    raise exception 'assignment problem progress constraint is missing';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignments'
      and column_name = 'provider_missing_at'
      and data_type = 'timestamp with time zone'
      and is_nullable = 'YES'
  ) then
    raise exception 'assignment provider-missing tombstone is missing';
  end if;
  if to_regclass('public.course_mode_lms_student_links') is null then
    raise exception 'verified LMS student link table is missing';
  end if;
  if to_regprocedure('public.claim_lms_grade_sync_receipt(uuid,text)') is null then
    raise exception 'verified LMS grade receipt claim signature is missing';
  end if;
  if to_regprocedure('public.claim_lms_grade_sync_receipt(uuid,text,text)') is not null then
    raise exception 'legacy client-targeted grade receipt claim still exists';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.reconcile_assignment_submission_receipt(uuid,text,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated role can reconcile provider submission success';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.reconcile_assignment_submission_receipt(uuid,text,text,text,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'service role cannot reconcile provider submission success';
  end if;
  if not has_function_privilege(
    'authenticated',
    'public.claim_lms_grade_sync_receipt(uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated role cannot claim a verified grade receipt';
  end if;
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.assignments'::regclass
      and tgname = 'assignments_provider_success_guard'
      and not tgisinternal
  ) then
    raise exception 'assignment provider-success guard is missing';
  end if;
  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.lms_grade_sync_receipts'::regclass
      and tgname = 'lms_grade_sync_receipts_student_binding_guard'
      and not tgisinternal
  ) then
    raise exception 'grade receipt student-binding guard is missing';
  end if;
  if not has_table_privilege(
    'authenticated', 'public.assignment_problem_messages', 'INSERT'
  ) then
    raise exception 'authenticated role cannot insert assignment problem messages';
  end if;
  if not has_table_privilege(
    'authenticated', 'public.assignment_workspace_preferences', 'INSERT'
  ) then
    raise exception 'authenticated role cannot insert workspace preferences';
  end if;
end;
$acl_contract$;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000301',
  'authenticated',
  'authenticated',
  'migration-release@example.invalid',
  '',
  now(),
  '{}'::jsonb,
  '{"date_of_birth":"1990-01-01"}'::jsonb,
  now(),
  now()
);

insert into public.classes (id, owner_id, name)
values (
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000301',
  'Migration release contract'
);

insert into public.assignments (id, owner_id, class_id, title)
values (
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  'Assignment progress contract'
);

insert into public.assignment_problems (
  id, owner_id, assignment_id, problem_number, problem_text,
  progress_status, reviewed_at, completed_at
) values (
  '00000000-0000-4000-8000-000000000304',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000303',
  1,
  'Verify forward-only progress semantics',
  'done',
  now(),
  now()
);

insert into public.assignments (id, owner_id, class_id, title)
values (
  '00000000-0000-4000-8000-000000000305',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000302',
  'Separate assignment relationship contract'
);

insert into public.assignment_problems (
  id, owner_id, assignment_id, problem_number, problem_text
) values (
  '00000000-0000-4000-8000-000000000306',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000305',
  1,
  'Separate problem relationship contract'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000301',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',
  true
);

do $workspace_rls_contract$
begin
  begin
    insert into public.assignment_problem_messages (
      owner_id, assignment_id, problem_id, role, client_turn_id, content
    ) values (
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000305',
      '00000000-0000-4000-8000-000000000304',
      'student',
      'cross-assignment-message',
      'must be rejected'
    );
    raise exception 'assignment message cross-assignment write was accepted';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.assignment_workspace_preferences (
      owner_id, assignment_id, problem_id, paper_style, work_height
    ) values (
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000305',
      '00000000-0000-4000-8000-000000000304',
      'blank',
      240
    );
    raise exception 'workspace preference cross-assignment write was accepted';
  exception
    when insufficient_privilege then null;
  end;
end;
$workspace_rls_contract$;

do $rpc_contract$
begin
  if not public.merge_assignment_problem_work(
    '00000000-0000-4000-8000-000000000304',
    '{"work":"42"}'::jsonb
  ) then
    raise exception 'authenticated assignment problem merge returned false';
  end if;
end;
$rpc_contract$;

reset role;

do $result_contract$
begin
  if not exists (
    select 1
    from public.assignment_problems
    where id = '00000000-0000-4000-8000-000000000304'
      and student_work ->> 'work' = '42'
      and progress_status = 'in_progress'
      and reviewed_at is null
      and completed_at is null
  ) then
    raise exception 'assignment problem progress transition is incorrect';
  end if;
  if not exists (
    select 1
    from public.authorship_log
    where owner_id = '00000000-0000-4000-8000-000000000301'
      and assignment_id = '00000000-0000-4000-8000-000000000303'
      and event_type = 'problem_patch_saved'
  ) then
    raise exception 'assignment problem merge did not record authorship';
  end if;
end;
$result_contract$;

rollback;
'@
}
finally {
  if (Test-Path -LiteralPath $tempProject) {
    $resolvedTempProject = [IO.Path]::GetFullPath(
      (Resolve-Path -LiteralPath $tempProject).Path
    )
    if (-not $resolvedTempProject.StartsWith(
      $tempRoot,
      [StringComparison]::OrdinalIgnoreCase
    )) {
      throw "Refusing to remove a replay project outside the temp directory."
    }
    Remove-Item -LiteralPath $resolvedTempProject -Recurse -Force
  }
}

Write-Output (
  "Full clean migration replay passed through $releaseHead with an exact ledger " +
  "and release-head schema and ACL contracts."
)
