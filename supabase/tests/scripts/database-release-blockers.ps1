param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$preTargetVersion = 20260731135000L
$targetVersion = 20260731205000L
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$migrationsDirectory = Join-Path $repoRoot "supabase\migrations"
$psql = Get-Command psql -ErrorAction Stop
$npx = Get-Command npx -ErrorAction Stop
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
$tempProject = Join-Path ([IO.Path]::GetTempPath()) (
  "diana-database-release-blockers-" + [Guid]::NewGuid().ToString("N")
)

function New-ContractSqlFile {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $sqlFile = Join-Path ([IO.Path]::GetTempPath()) (
    "diana-database-contract-" + [Guid]::NewGuid().ToString("N") + ".sql"
  )
  [IO.File]::WriteAllText($sqlFile, $Sql, $utf8NoBom)
  $bytes = [IO.File]::ReadAllBytes($sqlFile)
  if ($bytes.Length -ge 3 -and
      $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Remove-Item -LiteralPath $sqlFile -Force
    throw "Generated PostgreSQL contract unexpectedly contains a UTF-8 BOM."
  }
  return $sqlFile
}

function Invoke-ContractSql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $sqlFile = New-ContractSqlFile $Sql
  try {
    & $psql.Source -X -v ON_ERROR_STOP=1 "--dbname=$DatabaseUrl" -f $sqlFile
    $exitCode = $LASTEXITCODE
  }
  finally {
    Remove-Item -LiteralPath $sqlFile -Force
  }
  if ($exitCode -ne 0) {
    throw "PostgreSQL contract failed with exit code $exitCode."
  }
}

function Invoke-ContractSqlExpectFailure {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [Parameter(Mandatory = $true)][string]$ExpectedMessage
  )

  $sqlFile = New-ContractSqlFile $Sql
  $priorErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = @(
      & $psql.Source -X -v ON_ERROR_STOP=1 "--dbname=$DatabaseUrl" -f $sqlFile 2>&1 |
        ForEach-Object { $_.ToString() }
    )
    $exitCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $priorErrorActionPreference
    Remove-Item -LiteralPath $sqlFile -Force
  }
  if ($exitCode -eq 0) {
    throw "PostgreSQL contract unexpectedly succeeded."
  }
  if (($output -join "`n") -notmatch [Regex]::Escape($ExpectedMessage)) {
    throw (
      "PostgreSQL contract did not fail with the expected message '$ExpectedMessage'. " +
      "Output: $($output -join ' ')"
    )
  }
}

function Invoke-ScalarSql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $result = & $psql.Source -X -v ON_ERROR_STOP=1 -A -t "--dbname=$DatabaseUrl" -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL query failed with exit code $LASTEXITCODE."
  }
  return @($result | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" })
}

function Get-CredentialRollbackSnapshot {
  return (Invoke-ScalarSql @'
select jsonb_build_object(
  'auth_users', coalesce((
    select jsonb_agg(to_jsonb(user_row) order by user_row.id)
    from auth.users user_row
    where user_row.id in (
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000202',
      '00000000-0000-4000-8000-000000000205'
    )
  ), '[]'::jsonb),
  'lms_connections', coalesce((
    select jsonb_agg(to_jsonb(connection) order by connection.id)
    from public.lms_connections connection
  ), '[]'::jsonb),
  'canva_connections', coalesce((
    select jsonb_agg(to_jsonb(connection) order by connection.owner_id)
    from public.canva_connections connection
  ), '[]'::jsonb),
  'school_organizations', coalesce((
    select jsonb_agg(to_jsonb(organization) order by organization.id)
    from public.school_organizations organization
  ), '[]'::jsonb),
  'organization_memberships', coalesce((
    select jsonb_agg(to_jsonb(membership) order by membership.id)
    from public.organization_memberships membership
  ), '[]'::jsonb),
  'course_mode_courses', coalesce((
    select jsonb_agg(to_jsonb(course) order by course.id)
    from public.course_mode_courses course
  ), '[]'::jsonb),
  'course_mode_lms_links', coalesce((
    select jsonb_agg(to_jsonb(link) order by link.id)
    from public.course_mode_lms_links link
  ), '[]'::jsonb),
  'data_deletion_requests', coalesce((
    select jsonb_agg(to_jsonb(request) order by request.id)
    from public.data_deletion_requests request
  ), '[]'::jsonb),
  'course_mode_lms_link_triggers', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'name', trigger_row.tgname,
        'enabled', trigger_row.tgenabled
      ) order by trigger_row.tgname
    )
    from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.course_mode_lms_links'::regclass
      and not trigger_row.tgisinternal
  ), '[]'::jsonb)
)::text;
'@) -join "`n"
}

function Get-MigrationVersion {
  param([Parameter(Mandatory = $true)][IO.FileInfo]$MigrationFile)

  return [long](($MigrationFile.BaseName -split "_", 2)[0])
}

function Get-MigrationLedgerDifference {
  param(
    [Parameter(Mandatory = $true)][string[]]$Expected,
    [Parameter(Mandatory = $true)][string[]]$Applied
  )

  $expectedSet = [Collections.Generic.HashSet[string]]::new(
    $Expected,
    [StringComparer]::Ordinal
  )
  $appliedSet = [Collections.Generic.HashSet[string]]::new(
    $Applied,
    [StringComparer]::Ordinal
  )

  return [PSCustomObject]@{
    Missing = @($Expected | Where-Object { -not $appliedSet.Contains($_) })
    Unexpected = @($Applied | Where-Object { -not $expectedSet.Contains($_) })
  }
}

$migrationFiles = Get-ChildItem -LiteralPath $migrationsDirectory -Filter "*.sql" -File |
  Where-Object {
    (Get-MigrationVersion $_) -le $targetVersion
  } |
  Sort-Object { Get-MigrationVersion $_ }

$preTargetVersions = @($migrationFiles |
  Where-Object {
    (Get-MigrationVersion $_) -le $preTargetVersion
  } |
  ForEach-Object { ($_.BaseName -split "_", 2)[0] })

$targetVersions = @($migrationFiles | ForEach-Object { ($_.BaseName -split "_", 2)[0] })
$credentialMigrationFile = @($migrationFiles | Where-Object {
  (Get-MigrationVersion $_) -eq 20260731140000L
})
if ($credentialMigrationFile.Count -ne 1) {
  throw "Expected exactly one integration credential migration file."
}
$credentialMigrationSql = Get-Content -LiteralPath $credentialMigrationFile[0].FullName -Raw

$syntheticOlderExtraVersion = "19000101000000"
$syntheticLedgerDifference = Get-MigrationLedgerDifference `
  -Expected $preTargetVersions `
  -Applied @($preTargetVersions + $syntheticOlderExtraVersion)
if ($syntheticLedgerDifference.Unexpected.Count -ne 1 -or
    $syntheticLedgerDifference.Unexpected[0] -ne $syntheticOlderExtraVersion) {
  throw "Exact migration ledger comparison did not reject a synthetic older extra version."
}

$appliedVersions = Invoke-ScalarSql @"
select version
from supabase_migrations.schema_migrations
order by version;
"@
$preTargetLedgerDifference = Get-MigrationLedgerDifference `
  -Expected $preTargetVersions `
  -Applied $appliedVersions
if ($preTargetLedgerDifference.Missing.Count -gt 0 -or
    $preTargetLedgerDifference.Unexpected.Count -gt 0) {
  throw (
    "Database must be disposable and migrated exactly through $preTargetVersion. " +
    "Missing: [$($preTargetLedgerDifference.Missing -join ', ')]. " +
    "Unexpected: [$($preTargetLedgerDifference.Unexpected -join ', ')]."
  )
}

Invoke-ContractSql @'
begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-4000-8000-000000000201',
    'authenticated', 'authenticated', 'credential-release-contract@example.invalid', '', now(),
    '{}'::jsonb, '{"date_of_birth":"2008-01-01"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000202',
    'authenticated', 'authenticated', 'deletion-release-contract@example.invalid', '', now(),
    '{}'::jsonb, '{"date_of_birth":"2008-01-01"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000205',
    'authenticated', 'authenticated', 'credential-verifier@example.invalid', '', now(),
    '{}'::jsonb, '{"date_of_birth":"1980-01-01"}'::jsonb, now(), now()
  );

insert into public.lms_connections (
  id, owner_id, provider, config, last_synced_at, created_at
)
values
  (
    '00000000-0000-4000-8000-000000000211',
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"base_url":"https://canvas.invalid","institution_id":"school-a","institution_name":"Release Contract School","connection_mode":"teacher","token":"  older-valid-access  ","refresh_token":"  older-valid-refresh  "}'::jsonb,
    '2026-07-07 00:00:00+00',
    '2026-07-01 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000212',
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"connection_mode":"student","refresh_token":"  newest-valid-refresh  ","expires_at":"2026-08-01T00:00:00Z"}'::jsonb,
    '2026-07-04 00:00:00+00',
    '2026-07-02 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000213',
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"connection_mode":"teacher","teacher_section":"A","token":"","refresh_token":"   "}'::jsonb,
    null,
    '2026-07-03 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000215',
    '00000000-0000-4000-8000-000000000201',
    'gitlab',
    '{"base_url":"https://gitlab.example.invalid","project":"group/alpha","token":"gitlab-alpha-token","labels":"homework"}'::jsonb,
    '2026-07-05 00:00:00+00',
    '2026-07-04 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000216',
    '00000000-0000-4000-8000-000000000201',
    'gitlab',
    '{"base_url":"https://gitlab.example.invalid","project":"group/beta","token":"gitlab-beta-token","labels":"lab"}'::jsonb,
    '2026-07-06 00:00:00+00',
    '2026-07-05 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000217',
    '00000000-0000-4000-8000-000000000201',
    'google_classroom',
    '{"connection_mode":"student","access_token":" google-older-access ","classroom_domain":"school.example"}'::jsonb,
    '2026-07-03 00:00:00+00',
    '2026-07-01 12:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000218',
    '00000000-0000-4000-8000-000000000201',
    'google_classroom',
    '{"connection_mode":"teacher","refresh_token":" google-newest-refresh ","delegated_customer_id":"customer-a"}'::jsonb,
    '2026-07-09 00:00:00+00',
    '2026-07-02 12:00:00+00'
  );

insert into public.canva_connections (
  owner_id, access_token, refresh_token, expires_at, scope, created_at, updated_at
) values (
  '00000000-0000-4000-8000-000000000201',
  '  canva-valid-access  ',
  '  canva-valid-refresh  ',
  '2026-08-01 00:00:00+00',
  'design:content:read',
  '2026-07-01 00:00:00+00',
  '2026-07-01 00:00:00+00'
);

insert into public.school_organizations (id, name, organization_type)
values (
  '00000000-0000-4000-8000-000000000203',
  'Database release contract school',
  'school'
);

insert into public.organization_memberships (
  id, organization_id, user_id, role, verification_status, verified_at, verified_by
) values (
  '00000000-0000-4000-8000-000000000206',
  '00000000-0000-4000-8000-000000000203',
  '00000000-0000-4000-8000-000000000201',
  'teacher',
  'verified',
  '2026-07-01 00:00:00+00',
  '00000000-0000-4000-8000-000000000205'
);

insert into public.course_mode_courses (
  id, organization_id, title, subject_domain, grade_band, status, created_by
) values (
  '00000000-0000-4000-8000-000000000204',
  '00000000-0000-4000-8000-000000000203',
  'Database release contract course',
  'computer_science',
  '9-12',
  'draft',
  '00000000-0000-4000-8000-000000000201'
);

alter table public.course_mode_lms_links
  disable trigger course_mode_lms_link_validate;
insert into public.course_mode_lms_links (
  id, course_id, provider, connection_id, external_course_id, created_by
) values (
  '00000000-0000-4000-8000-000000000214',
  '00000000-0000-4000-8000-000000000204',
  'canvas',
  '00000000-0000-4000-8000-000000000213',
  'release-contract-course',
  '00000000-0000-4000-8000-000000000201'
);
alter table public.course_mode_lms_links
  enable trigger course_mode_lms_link_validate;

insert into public.data_deletion_requests (
  id, owner_id, status, requested_at, ai_disabled_at, export_offered, notes
) values (
  '00000000-0000-4000-8000-000000000220',
  '00000000-0000-4000-8000-000000000202',
  'requested',
  '2026-06-01 00:00:00+00',
  '2026-06-01 00:00:00+00',
  true,
  'release contract fixture'
);

commit;
'@

Invoke-ContractSql @'
insert into public.lms_connections (
  id, owner_id, provider, config, last_synced_at, created_at
)
values
  (
    '00000000-0000-4000-8000-000000000221',
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"base_url":"https://canvas-east.invalid","institution_id":"school-east","connection_mode":"teacher","token":"conflict-east-access","refresh_token":"conflict-east-refresh","fixture":"base-url-institution-conflict"}'::jsonb,
    '2026-07-10 00:00:00+00',
    '2026-07-06 00:00:00+00'
  ),
  (
    '00000000-0000-4000-8000-000000000222',
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"base_url":"https://canvas-west.invalid","institution_id":"school-west","connection_mode":"teacher","token":"conflict-west-access","refresh_token":"conflict-west-refresh","fixture":"base-url-institution-conflict"}'::jsonb,
    '2026-07-11 00:00:00+00',
    '2026-07-07 00:00:00+00'
  );
'@

$conflictRollbackSnapshotBefore = Get-CredentialRollbackSnapshot
Invoke-ContractSqlExpectFailure `
  -Sql $credentialMigrationSql `
  -ExpectedMessage "Canvas credential dedupe found conflicting destination metadata"
$conflictRollbackSnapshotAfter = Get-CredentialRollbackSnapshot

if ($conflictRollbackSnapshotAfter -cne $conflictRollbackSnapshotBefore) {
  throw (
    "Conflicting Canvas destination failure changed an original row, token, " +
    "config, Course Mode link, deletion fixture, or trigger state."
  )
}

Invoke-ContractSql @'
delete from public.lms_connections
where id in (
  '00000000-0000-4000-8000-000000000221',
  '00000000-0000-4000-8000-000000000222'
);
'@

$invalidLinkFixture = @'
begin;
insert into public.course_mode_courses (
  id, organization_id, title, subject_domain, grade_band, status, created_by
) values (
  '00000000-0000-4000-8000-000000000207',
  '00000000-0000-4000-8000-000000000203',
  'Invalid repoint rollback course',
  'computer_science',
  '9-12',
  'draft',
  '00000000-0000-4000-8000-000000000201'
);
alter table public.course_mode_lms_links
  disable trigger course_mode_lms_link_validate;
insert into public.course_mode_lms_links (
  id, course_id, provider, connection_id, external_course_id, created_by
) values (
  '00000000-0000-4000-8000-000000000219',
  '00000000-0000-4000-8000-000000000207',
  'canvas',
  '00000000-0000-4000-8000-000000000213',
  'invalid-owner-course',
  '00000000-0000-4000-8000-000000000202'
);
alter table public.course_mode_lms_links
  enable trigger course_mode_lms_link_validate;
'@

Invoke-ContractSqlExpectFailure `
  -Sql ($invalidLinkFixture + "`n" + $credentialMigrationSql) `
  -ExpectedMessage "LMS credential dedupe would invalidate a Course Mode link"

Invoke-ContractSql @'
do $failed_repoint_rollback$
begin
  if (select count(*) from public.lms_connections
      where owner_id = '00000000-0000-4000-8000-000000000201'
        and provider = 'canvas') <> 3 then
    raise exception 'invalid link preflight deleted a duplicate before aborting';
  end if;
  if exists (
    select 1 from public.course_mode_lms_links
    where id = '00000000-0000-4000-8000-000000000219'
  ) then
    raise exception 'invalid link preflight transaction did not roll back';
  end if;
end;
$failed_repoint_rollback$;
'@

$triggerStates = @(
  [PSCustomObject]@{ Code = "O"; Command = "enable" },
  [PSCustomObject]@{ Code = "D"; Command = "disable" },
  [PSCustomObject]@{ Code = "R"; Command = "enable replica" },
  [PSCustomObject]@{ Code = "A"; Command = "enable always" }
)

foreach ($triggerState in $triggerStates) {
  Invoke-ContractSql (
    "alter table public.course_mode_lms_links $($triggerState.Command) " +
    "trigger course_mode_lms_link_validate;"
  )

  $triggerStateAssertion = @'
do $trigger_state_contract$
begin
  if not exists (
    select 1
    from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.course_mode_lms_links'::regclass
      and trigger_row.tgname = 'course_mode_lms_link_validate'
      and trigger_row.tgenabled = '__EXPECTED_TRIGGER_STATE__'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'course_mode_lms_link_validate was not restored to state __EXPECTED_TRIGGER_STATE__';
  end if;
end;
$trigger_state_contract$;
'@.Replace("__EXPECTED_TRIGGER_STATE__", $triggerState.Code)

  Invoke-ContractSql (
    "begin;`n" +
    $credentialMigrationSql +
    "`n" +
    $triggerStateAssertion +
    "`nrollback;"
  )
}

Invoke-ContractSql @'
alter table public.course_mode_lms_links
  enable trigger course_mode_lms_link_validate;
'@

try {
  $tempMigrations = Join-Path $tempProject "supabase\migrations"
  New-Item -ItemType Directory -Path $tempMigrations -Force | Out-Null
  @"
project_id = "diana-database-release-blockers"
"@ | Set-Content -LiteralPath (Join-Path $tempProject "supabase\config.toml") -Encoding ascii

  foreach ($migrationFile in $migrationFiles) {
    Copy-Item -LiteralPath $migrationFile.FullName -Destination $tempMigrations
  }

  Push-Location $repoRoot
  try {
    # Preserve the "supabase migration up" source marker used by release-contract tests.
    & $npx.Source --yes supabase@2.111.0 migration up --include-all --db-url $DatabaseUrl --workdir $tempProject
    if ($LASTEXITCODE -ne 0) {
      throw "Supabase migration runner failed with exit code $LASTEXITCODE."
    }
  }
  finally {
    Pop-Location
  }

  $postMigrationAppliedVersions = Invoke-ScalarSql @"
select version
from supabase_migrations.schema_migrations
order by version;
"@
  $targetLedgerDifference = Get-MigrationLedgerDifference `
    -Expected $targetVersions `
    -Applied $postMigrationAppliedVersions
  if ($targetLedgerDifference.Missing.Count -gt 0 -or
      $targetLedgerDifference.Unexpected.Count -gt 0) {
    throw (
      "Migration ledger does not exactly match the target set through $targetVersion. " +
      "Missing: [$($targetLedgerDifference.Missing -join ', ')]. " +
      "Unexpected: [$($targetLedgerDifference.Unexpected -join ', ')]."
    )
  }

  Invoke-ContractSql @'
do $contract$
declare
  v_claim record;
begin
  if (select count(*) from public.lms_connections
      where owner_id = '00000000-0000-4000-8000-000000000201'
        and provider = 'canvas') <> 1 then
    raise exception 'credential duplicate rows were not reduced to one';
  end if;

  if not exists (
    select 1
    from public.lms_connections connection
    where connection.id = '00000000-0000-4000-8000-000000000212'
      and connection.config ->> 'token' = 'older-valid-access'
      and connection.config ->> 'refresh_token' = 'newest-valid-refresh'
      and connection.config ->> 'connection_mode' = 'teacher'
      and connection.config ->> 'base_url' = 'https://canvas.invalid'
      and connection.config ->> 'institution_id' = 'school-a'
      and connection.config ->> 'institution_name' = 'Release Contract School'
      and connection.config ->> 'teacher_section' = 'A'
      and connection.config ->> 'expires_at' = '2026-08-01T00:00:00Z'
      and connection.last_synced_at = '2026-07-07 00:00:00+00'::timestamptz
  ) then
    raise exception 'Canvas credentials, teacher mode, or metadata were not reconciled';
  end if;

  if (select count(*) from public.lms_connections
      where owner_id = '00000000-0000-4000-8000-000000000201'
        and provider = 'gitlab') <> 2
     or not exists (
       select 1 from public.lms_connections
       where id = '00000000-0000-4000-8000-000000000215'
         and config ->> 'project' = 'group/alpha'
         and config ->> 'token' = 'gitlab-alpha-token'
         and config ->> 'labels' = 'homework'
     )
     or not exists (
       select 1 from public.lms_connections
       where id = '00000000-0000-4000-8000-000000000216'
         and config ->> 'project' = 'group/beta'
         and config ->> 'token' = 'gitlab-beta-token'
         and config ->> 'labels' = 'lab'
     ) then
    raise exception 'unsupported GitLab connections or provider-specific config were changed';
  end if;

  if not exists (
    select 1
    from public.lms_connections connection
    where connection.id = '00000000-0000-4000-8000-000000000218'
      and connection.config ->> 'access_token' = 'google-older-access'
      and connection.config ->> 'refresh_token' = 'google-newest-refresh'
      and connection.config ->> 'connection_mode' = 'teacher'
      and connection.config ->> 'classroom_domain' = 'school.example'
      and connection.config ->> 'delegated_customer_id' = 'customer-a'
      and connection.last_synced_at = '2026-07-09 00:00:00+00'::timestamptz
  ) then
    raise exception 'Google Classroom credentials or metadata were not reconciled';
  end if;

  if not exists (
    select 1
    from public.integration_credentials credential
    where credential.owner_id = '00000000-0000-4000-8000-000000000201'
      and credential.provider = 'canvas'
      and credential.lms_connection_id = '00000000-0000-4000-8000-000000000212'
      and credential.access_token = 'older-valid-access'
      and credential.refresh_token = 'newest-valid-refresh'
  ) then
    raise exception 'merged credentials were not preserved in the vault';
  end if;

  if not exists (
    select 1
    from public.integration_credentials credential
    where credential.owner_id = '00000000-0000-4000-8000-000000000201'
      and credential.provider = 'canva'
      and credential.credential_key = 'primary'
      and credential.access_token = 'canva-valid-access'
      and credential.refresh_token = 'canva-valid-refresh'
  ) then
    raise exception 'Canva credentials were not normalized during backfill';
  end if;

  if not exists (
    select 1
    from public.course_mode_lms_links link
    where link.id = '00000000-0000-4000-8000-000000000214'
      and link.connection_id = '00000000-0000-4000-8000-000000000212'
  ) then
    raise exception 'linked duplicate connection was not repointed';
  end if;

  if not exists (
    select 1
    from pg_trigger trigger_row
    where trigger_row.tgrelid = 'public.course_mode_lms_links'::regclass
      and trigger_row.tgname = 'course_mode_lms_link_validate'
      and trigger_row.tgenabled = 'O'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'course_mode_lms_link_validate was not restored exactly';
  end if;

  update public.lms_connections
  set config = config || jsonb_build_object(
    'token', '   ',
    'refresh_token', '   '
  )
  where owner_id = '00000000-0000-4000-8000-000000000201'
    and provider = 'canvas';

  update public.canva_connections
  set access_token = '   ', refresh_token = '   '
  where owner_id = '00000000-0000-4000-8000-000000000201';

  if not exists (
    select 1
    from public.integration_credentials credential
    where credential.owner_id = '00000000-0000-4000-8000-000000000201'
      and credential.provider = 'canvas'
      and credential.access_token = 'older-valid-access'
      and credential.refresh_token = 'newest-valid-refresh'
  ) then
    raise exception 'LMS compatibility whitespace write replaced a valid vaulted credential';
  end if;

  if not exists (
    select 1
    from public.integration_credentials credential
    where credential.owner_id = '00000000-0000-4000-8000-000000000201'
      and credential.provider = 'canva'
      and credential.access_token = 'canva-valid-access'
      and credential.refresh_token = 'canva-valid-refresh'
  ) then
    raise exception 'Canva compatibility whitespace write replaced a valid vaulted credential';
  end if;

  perform public.upsert_integration_connection(
    '00000000-0000-4000-8000-000000000201',
    'canvas',
    '{"base_url":"https://canvas-rpc.invalid","token":"metadata-access","refresh_token":"metadata-refresh"}'::jsonb,
    '  rpc-canvas-access  ',
    '   ',
    null
  );

  perform public.upsert_integration_connection(
    '00000000-0000-4000-8000-000000000201',
    'canva',
    '{}'::jsonb,
    '  rpc-canva-access  ',
    '   ',
    null
  );

  if not exists (
    select 1
    from public.lms_connections connection
    join public.integration_credentials credential
      on credential.lms_connection_id = connection.id
    where connection.owner_id = '00000000-0000-4000-8000-000000000201'
      and connection.provider = 'canvas'
      and connection.config ->> 'token' = 'rpc-canvas-access'
      and connection.config ->> 'refresh_token' = 'newest-valid-refresh'
      and credential.access_token = 'rpc-canvas-access'
      and credential.refresh_token = 'newest-valid-refresh'
  ) then
    raise exception 'LMS connection RPC did not normalize tokens and preserve vaulted refresh';
  end if;

  if not exists (
    select 1
    from public.canva_connections connection
    join public.integration_credentials credential
      on credential.canva_connection_owner_id = connection.owner_id
    where connection.owner_id = '00000000-0000-4000-8000-000000000201'
      and connection.access_token = 'rpc-canva-access'
      and connection.refresh_token = 'canva-valid-refresh'
      and credential.access_token = 'rpc-canva-access'
      and credential.refresh_token = 'canva-valid-refresh'
  ) then
    raise exception 'Canva connection RPC did not normalize tokens and preserve vaulted refresh';
  end if;

  select claim.* into v_claim
  from public.claim_account_deletion_request(
    '00000000-0000-4000-8000-000000000220',
    '2026-08-01 00:00:00+00'
  ) claim;

  if v_claim.request_id is distinct from '00000000-0000-4000-8000-000000000220'::uuid
     or v_claim.owner_id is distinct from '00000000-0000-4000-8000-000000000202'::uuid
     or v_claim.purge_phase is distinct from 'claimed'
     or v_claim.manifest_version is distinct from 1
     or v_claim.claim_token is null then
    raise exception 'due account deletion request was not claimed';
  end if;

  if (select count(*) from supabase_migrations.schema_migrations
      where version in ('20260731140000', '20260731150000')) <> 2 then
    raise exception 'target migrations were not recorded exactly once in the migration ledger';
  end if;
end;
$contract$;
'@
}
finally {
  if (Test-Path -LiteralPath $tempProject) {
    Remove-Item -LiteralPath $tempProject -Recurse -Force
  }
}

Write-Output "Database release blocker regression passed."
