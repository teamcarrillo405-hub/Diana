[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

try {
  $databaseUri = [Uri]$DatabaseUrl
}
catch {
  throw "DatabaseUrl must be an absolute PostgreSQL URL."
}
if (
  $databaseUri.Scheme -notin @("postgres", "postgresql") -or
  $databaseUri.Host -notin @("localhost", "127.0.0.1", "::1")
) {
  throw "Guardian boundary verification is restricted to a local disposable database."
}

$psql = Get-Command psql -ErrorAction Stop
$contractPath = Join-Path ([IO.Path]::GetTempPath()) (
  "diana-guardian-boundary-" + [Guid]::NewGuid().ToString("N") + ".sql"
)
$utf8NoBom = New-Object System.Text.UTF8Encoding -ArgumentList $false
$contractSql = @'
begin;

do $guardian_boundary$
declare
  v_under13_id uuid := '00000000-0000-4000-8000-000000001301';
  v_teen_id uuid := '00000000-0000-4000-8000-000000001302';
  v_adult_id uuid := '00000000-0000-4000-8000-000000001303';
  v_registry jsonb;
  v_state_constraint text;
begin
  if not exists (
    select 1
    from public.guardian_foundation_config
    where singleton_key = 'guardian_foundation'
      and foundation_enabled = false
      and child_accounts_enabled = false
      and direct_ai_enabled = false
  ) then
    raise exception 'guardian foundation is not hard disabled';
  end if;

  begin
    update public.guardian_foundation_config
    set foundation_enabled = true;
    raise exception 'guardian foundation unexpectedly enabled';
  exception
    when check_violation then null;
  end;

  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_under13_id,
      'authenticated',
      'authenticated',
      'synthetic-under13-boundary@example.invalid',
      '',
      now(),
      '{}'::jsonb,
      jsonb_build_object(
        'date_of_birth', ((current_date - interval '10 years')::date)::text
      ),
      now(),
      now()
    );
    raise exception 'under-13 auth signup unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%Diana accounts require an age of at least 13%' then
        raise;
      end if;
  end;

  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_teen_id,
      'authenticated',
      'authenticated',
      'synthetic-teen-boundary@example.invalid',
      '',
      now(),
      '{}'::jsonb,
      jsonb_build_object(
        'date_of_birth', ((current_date - interval '15 years')::date)::text
      ),
      now(),
      now()
    );
    raise exception 'teen signup without permission unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%Parent or guardian permission attestation required%' then
        raise;
      end if;
  end;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_adult_id,
    'authenticated',
    'authenticated',
    'synthetic-adult-boundary@example.invalid',
    '',
    now(),
    '{}'::jsonb,
    jsonb_build_object(
      'date_of_birth', ((current_date - interval '25 years')::date)::text
    ),
    now(),
    now()
  );

  begin
    update public.profiles
    set date_of_birth = (current_date - interval '10 years')::date,
        age_bracket = 'under_13',
        consent_ai = true
    where user_id = v_adult_id;
    raise exception 'direct under-13 profile mutation unexpectedly succeeded';
  exception
    when others then
      if sqlerrm not like '%Diana accounts require an age of at least 13%' then
        raise;
      end if;
  end;

  select public.validate_child_data_registry_coverage()
  into v_registry;
  if coalesce((v_registry->>'valid')::boolean, false) is not true
    or coalesce((v_registry->>'collectionEnabled')::boolean, true) is not false then
    raise exception 'SQL child-data registry coverage is incomplete or enabled';
  end if;

  select pg_get_constraintdef(constraint_row.oid)
  into v_state_constraint
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'public.guardian_account_requests'::regclass
    and constraint_row.contype = 'c'
    and pg_get_constraintdef(constraint_row.oid) like '%foundation_disabled%';
  if v_state_constraint not like '%suspended%'
    or v_state_constraint not like '%withdrawn%' then
    raise exception 'guardian account state constraint lacks suspension or withdrawal';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'guardian_consent_records'
      and column_name = 'consent_scope_versions'
      and data_type = 'jsonb'
  ) then
    raise exception 'versioned guardian consent scope storage is missing';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.guardian_account_requests',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.guardian_consent_records',
    'INSERT'
  ) then
    raise exception 'authenticated users can write disabled guardian foundation tables';
  end if;
end;
$guardian_boundary$;

rollback;
'@

[IO.File]::WriteAllText($contractPath, $contractSql, $utf8NoBom)
try {
  & $psql.Source -X -v ON_ERROR_STOP=1 "--dbname=$DatabaseUrl" -f $contractPath
  if ($LASTEXITCODE -ne 0) {
    throw "Guardian under-13 database boundary failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item -LiteralPath $contractPath -Force -ErrorAction SilentlyContinue
}

Write-Output "Guardian under-13 database boundary passed in the disposable database."
