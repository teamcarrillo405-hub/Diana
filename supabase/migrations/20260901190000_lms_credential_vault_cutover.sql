begin;

-- Old application instances can still write lms_connections.config while this
-- migration starts. Hold both write paths until the backfill, verification,
-- compatibility removal, and redaction commit together.
lock table public.lms_connections in share row exclusive mode;
lock table public.integration_credentials in share row exclusive mode;

do $cutover$
begin
  if exists (
    select 1
    from public.lms_connections connection
    where connection.provider in ('canvas', 'google_classroom')
      and nullif(btrim(connection.config ->> 'token'), '') is not null
      and nullif(btrim(connection.config ->> 'access_token'), '') is not null
      and nullif(btrim(connection.config ->> 'token'), '') is distinct from
        nullif(btrim(connection.config ->> 'access_token'), '')
  ) then
    raise exception 'LMS credential vault cutover found conflicting access token fields';
  end if;
end;
$cutover$;

with legacy_credentials as (
  select
    connection.id as connection_id,
    connection.owner_id,
    connection.provider,
    case
      when connection.provider = 'canvas' then coalesce(
        nullif(btrim(connection.config ->> 'token'), ''),
        nullif(btrim(connection.config ->> 'access_token'), '')
      )
      when connection.provider = 'google_classroom' then coalesce(
        nullif(btrim(connection.config ->> 'access_token'), ''),
        nullif(btrim(connection.config ->> 'token'), '')
      )
    end as access_token,
    nullif(btrim(connection.config ->> 'refresh_token'), '') as refresh_token
  from public.lms_connections connection
  where connection.provider in ('canvas', 'google_classroom')
)
insert into public.integration_credentials as credential (
  owner_id,
  provider,
  credential_key,
  lms_connection_id,
  access_token,
  refresh_token
)
select
  legacy.owner_id,
  legacy.provider,
  legacy.connection_id::text,
  legacy.connection_id,
  legacy.access_token,
  legacy.refresh_token
from legacy_credentials legacy
where legacy.access_token is not null
  or legacy.refresh_token is not null
on conflict (owner_id, provider, credential_key) do update
set
  lms_connection_id = excluded.lms_connection_id,
  access_token = coalesce(excluded.access_token, credential.access_token),
  refresh_token = coalesce(excluded.refresh_token, credential.refresh_token),
  updated_at = now()
where credential.lms_connection_id is distinct from excluded.lms_connection_id
  or (
    excluded.access_token is not null
    and credential.access_token is distinct from excluded.access_token
  )
  or (
    excluded.refresh_token is not null
    and credential.refresh_token is distinct from excluded.refresh_token
  );

-- Compare in-database without logging or returning credential values. Any
-- mismatch aborts the transaction before owner-readable config is changed.
do $cutover$
begin
  if exists (
    with legacy_credentials as (
      select
        connection.id as connection_id,
        connection.owner_id,
        connection.provider,
        case
          when connection.provider = 'canvas' then coalesce(
            nullif(btrim(connection.config ->> 'token'), ''),
            nullif(btrim(connection.config ->> 'access_token'), '')
          )
          when connection.provider = 'google_classroom' then coalesce(
            nullif(btrim(connection.config ->> 'access_token'), ''),
            nullif(btrim(connection.config ->> 'token'), '')
          )
        end as access_token,
        nullif(btrim(connection.config ->> 'refresh_token'), '') as refresh_token
      from public.lms_connections connection
      where connection.provider in ('canvas', 'google_classroom')
    )
    select 1
    from legacy_credentials legacy
    left join public.integration_credentials credential
      on credential.owner_id = legacy.owner_id
      and credential.provider = legacy.provider
      and credential.credential_key = legacy.connection_id::text
    where (
        legacy.access_token is not null
        and credential.access_token is distinct from legacy.access_token
      )
      or (
        legacy.refresh_token is not null
        and credential.refresh_token is distinct from legacy.refresh_token
      )
      or (
        (legacy.access_token is not null or legacy.refresh_token is not null)
        and credential.lms_connection_id is distinct from legacy.connection_id
      )
  ) then
    raise exception 'LMS credential vault cutover did not preserve every legacy credential';
  end if;
end;
$cutover$;

drop trigger if exists lms_connections_sync_credential
  on public.lms_connections;
drop function if exists public.sync_lms_connection_credential();

-- Replace the phase-one compatibility RPC. Canvas and Classroom metadata stays
-- owner-readable, but all credentials are written only to the service-role
-- vault in the same function transaction.
create or replace function public.upsert_integration_connection(
  p_owner_id uuid,
  p_provider text,
  p_metadata jsonb,
  p_access_token text,
  p_refresh_token text default null,
  p_connection_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_connection_id uuid;
  clean_config jsonb;
  existing_config jsonb;
  normalized_access_token text;
  normalized_refresh_token text;
  current_refresh_token text;
  current_expires_at timestamptz;
  current_scope text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'upsert_integration_connection requires service_role';
  end if;

  normalized_access_token := nullif(btrim(p_access_token), '');
  normalized_refresh_token := nullif(btrim(p_refresh_token), '');
  if p_owner_id is null or normalized_access_token is null then
    raise exception using
      errcode = '22023',
      message = 'owner and access token are required';
  end if;

  -- Canva retains its phase-one storage until its separate cutover.
  if p_provider = 'canva' then
    select
      coalesce(
        nullif(btrim(credential.refresh_token), ''),
        nullif(btrim(connection.refresh_token), '')
      ),
      connection.expires_at,
      connection.scope
    into current_refresh_token, current_expires_at, current_scope
    from public.canva_connections connection
    left join public.integration_credentials credential
      on credential.owner_id = connection.owner_id
      and credential.provider = 'canva'
      and credential.credential_key = 'primary'
    where connection.owner_id = p_owner_id;

    insert into public.canva_connections (
      owner_id,
      access_token,
      refresh_token,
      expires_at,
      scope,
      updated_at
    ) values (
      p_owner_id,
      normalized_access_token,
      coalesce(normalized_refresh_token, current_refresh_token),
      coalesce((p_metadata ->> 'expires_at')::timestamptz, current_expires_at),
      coalesce(p_metadata ->> 'scope', current_scope),
      now()
    )
    on conflict (owner_id) do update
    set
      access_token = excluded.access_token,
      refresh_token = coalesce(excluded.refresh_token, public.canva_connections.refresh_token),
      expires_at = coalesce(excluded.expires_at, public.canva_connections.expires_at),
      scope = coalesce(excluded.scope, public.canva_connections.scope),
      updated_at = now();

    return p_owner_id;
  end if;

  if p_provider not in ('canvas', 'google_classroom') then
    raise exception using
      errcode = '22023',
      message = 'unsupported credential provider';
  end if;

  select
    connection.config,
    credential.refresh_token
  into existing_config, current_refresh_token
  from public.lms_connections connection
  left join public.integration_credentials credential
    on credential.owner_id = connection.owner_id
    and credential.provider = connection.provider
    and credential.credential_key = connection.id::text
  where connection.owner_id = p_owner_id
    and connection.provider = p_provider
  for update of connection;

  clean_config := coalesce(p_metadata, existing_config, '{}'::jsonb);
  if jsonb_typeof(clean_config) is distinct from 'object' then
    raise exception using
      errcode = '22023',
      message = 'connection metadata must be a JSON object';
  end if;
  clean_config := clean_config
    - 'access_token'
    - 'token'
    - 'refresh_token'
    - 'client_secret';

  insert into public.lms_connections (id, owner_id, provider, config)
  values (
    coalesce(p_connection_id, gen_random_uuid()),
    p_owner_id,
    p_provider,
    clean_config
  )
  on conflict (owner_id, provider)
    where provider in ('canvas', 'google_classroom')
  do update
  set config = excluded.config
  returning id into saved_connection_id;

  insert into public.integration_credentials as credential (
    owner_id,
    provider,
    credential_key,
    lms_connection_id,
    access_token,
    refresh_token
  ) values (
    p_owner_id,
    p_provider,
    saved_connection_id::text,
    saved_connection_id,
    normalized_access_token,
    coalesce(normalized_refresh_token, current_refresh_token)
  )
  on conflict (owner_id, provider, credential_key) do update
  set
    lms_connection_id = excluded.lms_connection_id,
    access_token = excluded.access_token,
    refresh_token = coalesce(excluded.refresh_token, credential.refresh_token),
    updated_at = now();

  return saved_connection_id;
end;
$$;

revoke all on function public.upsert_integration_connection(
  uuid,
  text,
  jsonb,
  text,
  text,
  uuid
)
  from public, anon, authenticated;
grant execute on function public.upsert_integration_connection(
  uuid,
  text,
  jsonb,
  text,
  text,
  uuid
)
  to service_role;

update public.lms_connections
set config = config
  - 'access_token'
  - 'token'
  - 'refresh_token'
  - 'client_secret'
where provider in ('canvas', 'google_classroom')
  and config ?| array[
    'access_token',
    'token',
    'refresh_token',
    'client_secret'
  ]::text[];

do $cutover$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_row
    where constraint_row.conrelid = 'public.lms_connections'::regclass
      and constraint_row.conname = 'lms_connections_public_config_no_credentials'
  ) then
    alter table public.lms_connections
      add constraint lms_connections_public_config_no_credentials
      check (
        provider not in ('canvas', 'google_classroom')
        or not (
          config ?| array[
            'access_token',
            'token',
            'refresh_token',
            'client_secret'
          ]::text[]
        )
      ) not valid;
  end if;
end;
$cutover$;

alter table public.lms_connections
  validate constraint lms_connections_public_config_no_credentials;

do $cutover$
begin
  if exists (
    select 1
    from public.lms_connections connection
    where connection.provider in ('canvas', 'google_classroom')
      and connection.config ?| array[
        'access_token',
        'token',
        'refresh_token',
        'client_secret'
      ]::text[]
  ) then
    raise exception 'LMS owner-readable config still contains a credential field';
  end if;
end;
$cutover$;

commit;
