-- Phase 1 of the credential-vault rollout. The legacy credential fields stay
-- populated until every old serverless instance has drained. A later release
-- must remove the compatibility triggers before stripping those fields.

-- Choose one stable row for each supported owner/provider before enforcing the
-- vault invariant. Unsupported providers retain every row and every config key.
-- Credential-bearing rows outrank blank rows, while supported-provider metadata
-- and the newest nonblank access and refresh values are reconciled independently.
do $$
declare
  v_link_validator_enabled "char";
begin
  if exists (
    select 1
    from public.lms_connections connection
    where connection.provider = 'canvas'
    group by connection.owner_id, connection.provider
    having count(*) > 1
      and (
        count(distinct nullif(btrim(connection.config ->> 'base_url'), '')) > 1
        or count(distinct nullif(btrim(connection.config ->> 'institution_id'), '')) > 1
      )
  ) then
    raise exception 'Canvas credential dedupe found conflicting destination metadata';
  end if;

  create temporary table lms_connection_dedupe_plan on commit drop as
  with normalized_connections as (
    select
      connection.id,
      connection.owner_id,
      connection.provider,
      connection.config,
      connection.last_synced_at,
      connection.created_at,
      case
        when connection.provider = 'canvas'
          and nullif(btrim(connection.config ->> 'token'), '') is not null
          then nullif(btrim(connection.config ->> 'token'), '')
        when connection.provider = 'google_classroom'
          and nullif(btrim(connection.config ->> 'access_token'), '') is not null
          then nullif(btrim(connection.config ->> 'access_token'), '')
      end as access_token,
      case
        when connection.provider in ('canvas', 'google_classroom')
          and nullif(btrim(connection.config ->> 'refresh_token'), '') is not null
          then nullif(btrim(connection.config ->> 'refresh_token'), '')
      end as refresh_token
    from public.lms_connections connection
    where connection.provider in ('canvas', 'google_classroom')
  ), grouped_connections as (
    select
      normalized.owner_id,
      normalized.provider,
      (array_agg(
        normalized.id
        order by
          (normalized.access_token is not null or normalized.refresh_token is not null) desc,
          normalized.created_at desc,
          normalized.id desc
      ))[1] as keep_id,
      (array_agg(
        normalized.access_token
        order by normalized.created_at desc, normalized.id desc
      ) filter (where normalized.access_token is not null))[1] as access_token,
      (array_agg(
        normalized.refresh_token
        order by normalized.created_at desc, normalized.id desc
      ) filter (where normalized.refresh_token is not null))[1] as refresh_token,
      (array_agg(
        nullif(btrim(normalized.config ->> 'connection_mode'), '')
        order by
          (normalized.config ->> 'connection_mode' = 'teacher') desc,
          normalized.created_at desc,
          normalized.id desc
      ) filter (
        where nullif(btrim(normalized.config ->> 'connection_mode'), '') is not null
      ))[1] as connection_mode,
      max(normalized.last_synced_at) as last_synced_at,
      count(*) as connection_count
    from normalized_connections normalized
    group by normalized.owner_id, normalized.provider
  )
  select
    grouped.owner_id,
    grouped.provider,
    grouped.keep_id,
    grouped.access_token,
    grouped.refresh_token,
    grouped.connection_mode,
    grouped.last_synced_at,
    coalesce(metadata.merged_config, '{}'::jsonb) as merged_config
  from grouped_connections grouped
  left join lateral (
    select jsonb_object_agg(
      config_entry.key,
      config_entry.value
      order by candidate.created_at, candidate.id
    ) as merged_config
    from normalized_connections candidate
    cross join lateral jsonb_each(candidate.config) config_entry
    where candidate.owner_id = grouped.owner_id
      and candidate.provider = grouped.provider
  ) metadata on true
  where grouped.connection_count > 1;

  update public.lms_connections connection
  set config = plan.merged_config
    || case
      when plan.connection_mode is not null
        then jsonb_build_object('connection_mode', plan.connection_mode)
      else '{}'::jsonb
    end
    || case
      when plan.provider = 'canvas' and plan.access_token is not null
        then jsonb_build_object('token', plan.access_token)
      when plan.provider = 'google_classroom' and plan.access_token is not null
        then jsonb_build_object('access_token', plan.access_token)
      else '{}'::jsonb
    end
    || case
      when plan.refresh_token is not null
        then jsonb_build_object('refresh_token', plan.refresh_token)
      else '{}'::jsonb
    end,
    last_synced_at = plan.last_synced_at
  from pg_temp.lms_connection_dedupe_plan plan
  where connection.id = plan.keep_id;

  -- This is the relational equivalent of validate_course_mode_lms_link with
  -- auth.uid() represented by the persisted link.created_by actor. Abort before
  -- suspending the trigger or deleting a duplicate if any repoint would fail it.
  if exists (
    select 1
    from public.course_mode_lms_links link
    join public.lms_connections duplicate_connection
      on duplicate_connection.id = link.connection_id
    join pg_temp.lms_connection_dedupe_plan plan
      on plan.owner_id = duplicate_connection.owner_id
      and plan.provider = duplicate_connection.provider
      and plan.keep_id <> duplicate_connection.id
    join public.lms_connections kept_connection
      on kept_connection.id = plan.keep_id
    where link.created_by is distinct from kept_connection.owner_id
      or link.provider is distinct from kept_connection.provider
      or kept_connection.config ->> 'connection_mode' is distinct from 'teacher'
      or not exists (
        select 1
        from public.course_mode_courses course
        join public.organization_memberships membership
          on membership.organization_id = course.organization_id
        where course.id = link.course_id
          and membership.user_id = link.created_by
          and membership.verification_status = 'verified'
          and membership.role in ('district_admin', 'school_admin', 'teacher')
      )
  ) then
    raise exception 'LMS credential dedupe would invalidate a Course Mode link';
  end if;

  select trigger_row.tgenabled
  into strict v_link_validator_enabled
  from pg_trigger trigger_row
  where trigger_row.tgrelid = 'public.course_mode_lms_links'::regclass
    and trigger_row.tgname = 'course_mode_lms_link_validate'
    and not trigger_row.tgisinternal;

  alter table public.course_mode_lms_links
    disable trigger course_mode_lms_link_validate;

  update public.course_mode_lms_links link
  set connection_id = plan.keep_id
  from pg_temp.lms_connection_dedupe_plan plan
  where link.connection_id <> plan.keep_id
    and exists (
      select 1
      from public.lms_connections duplicate_connection
      where duplicate_connection.id = link.connection_id
        and duplicate_connection.owner_id = plan.owner_id
        and duplicate_connection.provider = plan.provider
    );

  case v_link_validator_enabled
    when 'O' then
      alter table public.course_mode_lms_links
        enable trigger course_mode_lms_link_validate;
    when 'D' then
      alter table public.course_mode_lms_links
        disable trigger course_mode_lms_link_validate;
    when 'R' then
      alter table public.course_mode_lms_links
        enable replica trigger course_mode_lms_link_validate;
    when 'A' then
      alter table public.course_mode_lms_links
        enable always trigger course_mode_lms_link_validate;
    else
      raise exception 'unexpected course_mode_lms_link_validate state: %',
        v_link_validator_enabled;
  end case;

  delete from public.lms_connections connection
  using pg_temp.lms_connection_dedupe_plan plan
  where connection.owner_id = plan.owner_id
    and connection.provider = plan.provider
    and connection.id <> plan.keep_id;

  if exists (
    select 1
    from pg_temp.lms_connection_dedupe_plan plan
    left join public.lms_connections connection on connection.id = plan.keep_id
    where connection.id is null
      or (
        plan.access_token is not null
        and case
          when plan.provider = 'canvas' then connection.config ->> 'token'
          when plan.provider = 'google_classroom' then connection.config ->> 'access_token'
        end is distinct from plan.access_token
      )
      or (
        plan.refresh_token is not null
        and connection.config ->> 'refresh_token' is distinct from plan.refresh_token
      )
  ) then
    raise exception 'LMS credential dedupe did not preserve newest nonblank credentials';
  end if;
end;
$$;

create unique index if not exists lms_connections_owner_provider_unique
  on public.lms_connections (owner_id, provider)
  where provider in ('canvas', 'google_classroom');

create unique index if not exists lms_connections_id_owner_unique
  on public.lms_connections (id, owner_id);

create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('canvas', 'google_classroom', 'canva')),
  credential_key text not null,
  lms_connection_id uuid,
  canva_connection_owner_id uuid references public.canva_connections(owner_id) on delete cascade,
  access_token text,
  refresh_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_credentials_has_secret
    check (
      nullif(btrim(access_token), '') is not null
      or nullif(btrim(refresh_token), '') is not null
    ),
  constraint integration_credentials_tokens_normalized
    check (
      (
        access_token is null
        or (
          nullif(btrim(access_token), '') is not null
          and access_token = nullif(btrim(access_token), '')
        )
      )
      and (
        refresh_token is null
        or (
          nullif(btrim(refresh_token), '') is not null
          and refresh_token = nullif(btrim(refresh_token), '')
        )
      )
    ),
  constraint integration_credentials_matches_connection_type
    check (
      (
        provider = 'canva'
        and credential_key = 'primary'
        and lms_connection_id is null
        and canva_connection_owner_id = owner_id
      )
      or
      (
        provider in ('canvas', 'google_classroom')
        and credential_key = lms_connection_id::text
        and lms_connection_id is not null
        and canva_connection_owner_id is null
      )
    ),
  constraint integration_credentials_lms_owner_fkey
    foreign key (lms_connection_id, owner_id)
    references public.lms_connections(id, owner_id)
    on delete cascade,
  constraint integration_credentials_owner_provider_key_unique
    unique (owner_id, provider, credential_key)
);

create unique index if not exists integration_credentials_lms_connection_idx
  on public.integration_credentials (lms_connection_id)
  where lms_connection_id is not null;

create index if not exists integration_credentials_owner_provider_idx
  on public.integration_credentials (owner_id, provider);

alter table public.integration_credentials enable row level security;
alter table public.integration_credentials force row level security;

revoke all on table public.integration_credentials from public;
revoke all on table public.integration_credentials from anon;
revoke all on table public.integration_credentials from authenticated;
grant select, insert, update, delete on table public.integration_credentials to service_role;

comment on table public.integration_credentials is
  'Service-role-only OAuth and integration credentials. Never query from browser or user-scoped clients.';

create or replace function public.sync_lms_connection_credential()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_access_token text;
  next_refresh_token text;
begin
  if new.provider not in ('canvas', 'google_classroom') then
    return new;
  end if;

  next_access_token := nullif(btrim(
    case
      when new.provider = 'canvas' then new.config ->> 'token'
      else new.config ->> 'access_token'
    end
  ),
    ''
  );
  next_refresh_token := nullif(btrim(new.config ->> 'refresh_token'), '');
  if next_access_token is null and next_refresh_token is null then
    return new;
  end if;

  insert into public.integration_credentials (
    owner_id,
    provider,
    credential_key,
    lms_connection_id,
    access_token,
    refresh_token
  ) values (
    new.owner_id,
    new.provider,
    new.id::text,
    new.id,
    next_access_token,
    next_refresh_token
  )
  on conflict (owner_id, provider, credential_key) do update
  set
    lms_connection_id = excluded.lms_connection_id,
    access_token = coalesce(excluded.access_token, public.integration_credentials.access_token),
    refresh_token = coalesce(excluded.refresh_token, public.integration_credentials.refresh_token),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_lms_connection_credential()
  from public, anon, authenticated;
grant execute on function public.sync_lms_connection_credential()
  to service_role;

create or replace function public.sync_canva_connection_credential()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_access_token text;
  next_refresh_token text;
begin
  next_access_token := nullif(btrim(new.access_token), '');
  next_refresh_token := nullif(btrim(new.refresh_token), '');
  if next_access_token is null and next_refresh_token is null then
    return new;
  end if;

  insert into public.integration_credentials (
    owner_id,
    provider,
    credential_key,
    canva_connection_owner_id,
    access_token,
    refresh_token
  ) values (
    new.owner_id,
    'canva',
    'primary',
    new.owner_id,
    next_access_token,
    next_refresh_token
  )
  on conflict (owner_id, provider, credential_key) do update
  set
    access_token = coalesce(excluded.access_token, public.integration_credentials.access_token),
    refresh_token = coalesce(excluded.refresh_token, public.integration_credentials.refresh_token),
    updated_at = now();

  return new;
end;
$$;

revoke all on function public.sync_canva_connection_credential()
  from public, anon, authenticated;
grant execute on function public.sync_canva_connection_credential()
  to service_role;

drop trigger if exists lms_connections_sync_credential on public.lms_connections;
create trigger lms_connections_sync_credential
after insert or update of config on public.lms_connections
for each row execute function public.sync_lms_connection_credential();

drop trigger if exists canva_connections_sync_credential on public.canva_connections;
create trigger canva_connections_sync_credential
after insert or update of access_token, refresh_token on public.canva_connections
for each row execute function public.sync_canva_connection_credential();

insert into public.integration_credentials (
  owner_id,
  provider,
  credential_key,
  lms_connection_id,
  access_token,
  refresh_token
)
select
  owner_id,
  provider,
  id::text,
  id,
  nullif(btrim(
    case
      when provider = 'canvas' then config ->> 'token'
      when provider = 'google_classroom' then config ->> 'access_token'
    end
  ),
    ''
  ),
  nullif(btrim(config ->> 'refresh_token'), '')
from public.lms_connections
where provider in ('canvas', 'google_classroom')
  and (
    nullif(btrim(
      case
        when provider = 'canvas' then config ->> 'token'
        when provider = 'google_classroom' then config ->> 'access_token'
      end
    ), '') is not null
    or nullif(btrim(config ->> 'refresh_token'), '') is not null
  )
on conflict (owner_id, provider, credential_key) do update
set
  lms_connection_id = excluded.lms_connection_id,
  access_token = coalesce(excluded.access_token, public.integration_credentials.access_token),
  refresh_token = coalesce(excluded.refresh_token, public.integration_credentials.refresh_token),
  updated_at = now();

insert into public.integration_credentials (
  owner_id,
  provider,
  credential_key,
  canva_connection_owner_id,
  access_token,
  refresh_token
)
select
  owner_id,
  'canva',
  'primary',
  owner_id,
  nullif(btrim(access_token), ''),
  nullif(btrim(refresh_token), '')
from public.canva_connections
where nullif(btrim(access_token), '') is not null
  or nullif(btrim(refresh_token), '') is not null
on conflict (owner_id, provider, credential_key) do update
set
  access_token = coalesce(excluded.access_token, public.integration_credentials.access_token),
  refresh_token = coalesce(excluded.refresh_token, public.integration_credentials.refresh_token),
  updated_at = now();

do $$
begin
  if exists (
    select 1
    from public.lms_connections connection
    left join public.integration_credentials credential
      on credential.owner_id = connection.owner_id
      and credential.provider = connection.provider
      and credential.credential_key = connection.id::text
    where connection.provider in ('canvas', 'google_classroom')
      and (
        nullif(btrim(
          case
            when connection.provider = 'canvas' then connection.config ->> 'token'
            when connection.provider = 'google_classroom'
              then connection.config ->> 'access_token'
          end
        ), '') is not null
        or nullif(btrim(connection.config ->> 'refresh_token'), '') is not null
      )
      and credential.id is null
  ) then
    raise exception 'integration credential migration did not copy every LMS credential';
  end if;

  if exists (
    select 1
    from public.canva_connections connection
    left join public.integration_credentials credential
      on credential.owner_id = connection.owner_id
      and credential.provider = 'canva'
      and credential.credential_key = 'primary'
    where (
        nullif(btrim(connection.access_token), '') is not null
        or nullif(btrim(connection.refresh_token), '') is not null
      )
      and credential.id is null
  ) then
    raise exception 'integration credential migration did not copy every Canva credential';
  end if;
end;
$$;

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
  legacy_config jsonb;
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
    raise exception using errcode = '22023', message = 'owner and access token are required';
  end if;

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
    raise exception using errcode = '22023', message = 'unsupported credential provider';
  end if;

  select coalesce(
    nullif(btrim(credential.refresh_token), ''),
    nullif(btrim(connection.config ->> 'refresh_token'), '')
  )
  into current_refresh_token
  from public.lms_connections connection
  left join public.integration_credentials credential
    on credential.owner_id = connection.owner_id
    and credential.provider = connection.provider
    and credential.credential_key = connection.id::text
  where connection.owner_id = p_owner_id and connection.provider = p_provider;

  if p_metadata is null then
    select config
    into legacy_config
    from public.lms_connections
    where owner_id = p_owner_id and provider = p_provider;
  end if;
  legacy_config := coalesce(legacy_config, p_metadata, '{}'::jsonb)
    - 'token'
    - 'access_token'
    - 'refresh_token';
  if p_provider = 'canvas' then
    legacy_config := legacy_config || jsonb_build_object('token', normalized_access_token);
  else
    legacy_config := legacy_config || jsonb_build_object(
      'access_token',
      normalized_access_token
    );
  end if;
  if coalesce(normalized_refresh_token, current_refresh_token) is not null then
    legacy_config := legacy_config || jsonb_build_object(
      'refresh_token',
      coalesce(normalized_refresh_token, current_refresh_token)
    );
  end if;

  insert into public.lms_connections (id, owner_id, provider, config)
  values (coalesce(p_connection_id, gen_random_uuid()), p_owner_id, p_provider, legacy_config)
  on conflict (owner_id, provider)
    where provider in ('canvas', 'google_classroom')
  do update
  set config = excluded.config
  returning id into saved_connection_id;

  return saved_connection_id;
end;
$$;

revoke all on function public.upsert_integration_connection(uuid, text, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.upsert_integration_connection(uuid, text, jsonb, text, text, uuid)
  to service_role;

-- Do not strip lms_connections.config credentials or drop Canva token columns
-- in this migration. That cleanup belongs in a later release after old instances
-- drain and must also remove the two compatibility triggers above.
