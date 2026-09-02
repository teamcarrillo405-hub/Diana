-- Disabled guardian foundation. This migration adds contracts and storage
-- skeletons only. The existing profile trigger remains the authority that
-- rejects under-13 accounts, and no object below can enable child AI access.

create table public.guardian_foundation_config (
  singleton_key text primary key default 'guardian_foundation'
    check (singleton_key = 'guardian_foundation'),
  contract_version integer not null default 1 check (contract_version = 1),
  foundation_enabled boolean not null default false check (foundation_enabled = false),
  child_accounts_enabled boolean not null default false check (child_accounts_enabled = false),
  direct_ai_enabled boolean not null default false check (direct_ai_enabled = false),
  updated_at timestamptz not null default now()
);

insert into public.guardian_foundation_config (singleton_key)
values ('guardian_foundation');

create table public.guardian_vpc_providers (
  provider_key text primary key
    check (provider_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  adapter_key text not null
    check (adapter_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  contract_version integer not null default 1 check (contract_version = 1),
  status text not null default 'disabled' check (status = 'disabled'),
  verification_methods text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardian_account_requests (
  id uuid primary key default gen_random_uuid(),
  contract_version integer not null default 1 check (contract_version = 1),
  guardian_user_id uuid not null references auth.users(id) on delete cascade,
  child_subject_id uuid not null default gen_random_uuid(),
  provider_key text references public.guardian_vpc_providers(provider_key) on delete restrict,
  state text not null default 'foundation_disabled'
    check (state in (
      'foundation_disabled',
      'guardian_verification_pending',
      'guardian_verification_recorded',
      'consent_pending',
      'consent_recorded',
      'suspended',
      'consent_revoked',
      'withdrawn',
      'closed'
    )),
  child_account_enabled boolean not null default false check (child_account_enabled = false),
  direct_ai_enabled boolean not null default false check (direct_ai_enabled = false),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guardian_user_id, child_subject_id),
  unique (id, child_subject_id, provider_key)
);

create table public.guardian_consent_records (
  id uuid primary key default gen_random_uuid(),
  contract_version integer not null default 1 check (contract_version = 1),
  guardian_account_request_id uuid not null,
  child_subject_id uuid not null,
  provider_key text not null,
  notice_version text not null check (length(trim(notice_version)) between 1 and 120),
  consent_scope_contract_version integer not null default 1
    check (consent_scope_contract_version = 1),
  consent_scopes text[] not null check (
    cardinality(consent_scopes) > 0
    and consent_scopes <@ array[
      'account_request',
      'learning_records',
      'ai_assistance',
      'file_uploads',
      'voice_inputs',
      'saved_audio',
      'wellness',
      'school_integrations'
    ]::text[]
  ),
  consent_scope_versions jsonb not null check (
    jsonb_typeof(consent_scope_versions) = 'object'
    and consent_scope_versions <@ '{
      "account_request": "account_request_v1",
      "learning_records": "learning_records_v1",
      "ai_assistance": "ai_assistance_v1",
      "file_uploads": "file_uploads_v1",
      "voice_inputs": "voice_inputs_v1",
      "saved_audio": "saved_audio_v1",
      "wellness": "wellness_v1",
      "school_integrations": "school_integrations_v1"
    }'::jsonb
    and consent_scope_versions ?& consent_scopes
    and consent_scope_versions = jsonb_strip_nulls(jsonb_build_object(
      'account_request', case when 'account_request' = any(consent_scopes)
        then 'account_request_v1' end,
      'learning_records', case when 'learning_records' = any(consent_scopes)
        then 'learning_records_v1' end,
      'ai_assistance', case when 'ai_assistance' = any(consent_scopes)
        then 'ai_assistance_v1' end,
      'file_uploads', case when 'file_uploads' = any(consent_scopes)
        then 'file_uploads_v1' end,
      'voice_inputs', case when 'voice_inputs' = any(consent_scopes)
        then 'voice_inputs_v1' end,
      'saved_audio', case when 'saved_audio' = any(consent_scopes)
        then 'saved_audio_v1' end,
      'wellness', case when 'wellness' = any(consent_scopes)
        then 'wellness_v1' end,
      'school_integrations', case when 'school_integrations' = any(consent_scopes)
        then 'school_integrations_v1' end
    ))
  ),
  status text not null check (
    status in ('recorded', 'suspended', 'revoked', 'withdrawn', 'expired')
  ),
  evidence_digest text not null check (evidence_digest ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null,
  suspended_at timestamptz,
  revoked_at timestamptz,
  withdrawn_at timestamptz,
  child_account_enabled boolean not null default false check (child_account_enabled = false),
  direct_ai_enabled boolean not null default false check (direct_ai_enabled = false),
  created_at timestamptz not null default now(),
  check (
    (status = 'suspended'
      and suspended_at is not null
      and revoked_at is null
      and withdrawn_at is null)
    or (status = 'revoked'
      and suspended_at is null
      and revoked_at is not null
      and withdrawn_at is null)
    or (status = 'withdrawn'
      and suspended_at is null
      and revoked_at is null
      and withdrawn_at is not null)
    or (status in ('recorded', 'expired')
      and suspended_at is null
      and revoked_at is null
      and withdrawn_at is null)
  ),
  unique (id, guardian_account_request_id),
  foreign key (guardian_account_request_id, child_subject_id, provider_key)
    references public.guardian_account_requests(id, child_subject_id, provider_key)
    on delete cascade
);

create table public.guardian_consent_audit_events (
  id uuid primary key default gen_random_uuid(),
  contract_version integer not null default 1 check (contract_version = 1),
  guardian_account_request_id uuid
    references public.guardian_account_requests(id) on delete cascade,
  consent_id uuid,
  event_type text not null check (event_type in (
    'foundation_status_checked',
    'account_request_blocked',
    'verification_result_recorded',
    'consent_recorded',
    'consent_suspended',
    'consent_revoked',
    'consent_withdrawn',
    'registry_validated'
  )),
  actor_kind text not null check (actor_kind in ('guardian', 'service', 'operator')),
  actor_user_id uuid references auth.users(id) on delete set null,
  reason_code text not null check (length(trim(reason_code)) between 1 and 120),
  event_digest text not null check (event_digest ~ '^[0-9a-f]{64}$'),
  previous_event_digest text check (
    previous_event_digest is null or previous_event_digest ~ '^[0-9a-f]{64}$'
  ),
  occurred_at timestamptz not null,
  child_account_enabled boolean not null default false check (child_account_enabled = false),
  direct_ai_enabled boolean not null default false check (direct_ai_enabled = false),
  created_at timestamptz not null default now(),
  check (consent_id is null or guardian_account_request_id is not null),
  foreign key (consent_id, guardian_account_request_id)
    references public.guardian_consent_records(id, guardian_account_request_id)
    on delete cascade
);

create table public.child_data_registry_entries (
  entry_key text primary key
    check (entry_key ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  contract_version integer not null default 1 check (contract_version = 1),
  surface text not null unique check (surface in (
    'account_request',
    'learning_records',
    'ai_assistance',
    'file_uploads',
    'voice_inputs',
    'saved_audio',
    'wellness',
    'school_integrations'
  )),
  data_categories text[] not null check (
    cardinality(data_categories) > 0
    and data_categories <@ array[
      'child_profile',
      'learning_activity',
      'ai_input_output',
      'uploaded_content',
      'voice_recording',
      'saved_audio',
      'wellness_record',
      'school_record'
    ]::text[]
  ),
  consent_scopes text[] not null check (
    cardinality(consent_scopes) > 0
    and consent_scopes <@ array[
      'account_request',
      'learning_records',
      'ai_assistance',
      'file_uploads',
      'voice_inputs',
      'saved_audio',
      'wellness',
      'school_integrations'
    ]::text[]
  ),
  collection_enabled boolean not null default false check (collection_enabled = false),
  storage_targets text[] not null default '{}'::text[] check (cardinality(storage_targets) = 0),
  retention_policy_key text not null default 'not_configured'
    check (length(trim(retention_policy_key)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.child_data_registry_entries (
  entry_key,
  surface,
  data_categories,
  consent_scopes
)
values
  ('account_request_v1', 'account_request', array['child_profile'], array['account_request']),
  ('learning_records_v1', 'learning_records', array['learning_activity'], array['learning_records']),
  ('ai_assistance_v1', 'ai_assistance', array['ai_input_output'], array['ai_assistance']),
  ('file_uploads_v1', 'file_uploads', array['uploaded_content'], array['file_uploads']),
  ('voice_inputs_v1', 'voice_inputs', array['voice_recording'], array['voice_inputs']),
  ('saved_audio_v1', 'saved_audio', array['saved_audio'], array['saved_audio']),
  ('wellness_v1', 'wellness', array['wellness_record'], array['wellness']),
  ('school_integrations_v1', 'school_integrations', array['school_record'], array['school_integrations']);

create index guardian_account_requests_guardian_created_idx
  on public.guardian_account_requests (guardian_user_id, created_at desc);

create index guardian_consent_records_request_created_idx
  on public.guardian_consent_records (guardian_account_request_id, created_at desc);

create index guardian_consent_audit_request_occurred_idx
  on public.guardian_consent_audit_events (guardian_account_request_id, occurred_at desc);

alter table public.guardian_foundation_config enable row level security;
alter table public.guardian_foundation_config force row level security;
alter table public.guardian_vpc_providers enable row level security;
alter table public.guardian_vpc_providers force row level security;
alter table public.guardian_account_requests enable row level security;
alter table public.guardian_account_requests force row level security;
alter table public.guardian_consent_records enable row level security;
alter table public.guardian_consent_records force row level security;
alter table public.guardian_consent_audit_events enable row level security;
alter table public.guardian_consent_audit_events force row level security;
alter table public.child_data_registry_entries enable row level security;
alter table public.child_data_registry_entries force row level security;

create policy "guardian foundation config disabled"
  on public.guardian_foundation_config as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "guardian vpc providers disabled"
  on public.guardian_vpc_providers as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "guardian account requests disabled"
  on public.guardian_account_requests as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "guardian consent records disabled"
  on public.guardian_consent_records as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "guardian consent audit disabled"
  on public.guardian_consent_audit_events as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "child data registry disabled"
  on public.child_data_registry_entries as restrictive for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.guardian_foundation_config
  from public, anon, authenticated, service_role;
revoke all on table public.guardian_vpc_providers
  from public, anon, authenticated, service_role;
revoke all on table public.guardian_account_requests
  from public, anon, authenticated, service_role;
revoke all on table public.guardian_consent_records
  from public, anon, authenticated, service_role;
revoke all on table public.guardian_consent_audit_events
  from public, anon, authenticated, service_role;
revoke all on table public.child_data_registry_entries
  from public, anon, authenticated, service_role;

grant select on table public.guardian_foundation_config to service_role;
grant select on table public.guardian_vpc_providers to service_role;
grant select on table public.guardian_account_requests to service_role;
grant select on table public.guardian_consent_records to service_role;
grant select on table public.guardian_consent_audit_events to service_role;
grant select on table public.child_data_registry_entries to service_role;

create function public.guardian_foundation_status()
returns table (
  contract_version integer,
  state text,
  foundation_enabled boolean,
  child_accounts_enabled boolean,
  direct_ai_enabled boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    config.contract_version,
    'foundation_disabled'::text,
    config.foundation_enabled,
    config.child_accounts_enabled,
    config.direct_ai_enabled
  from public.guardian_foundation_config as config
  where config.singleton_key = 'guardian_foundation'
$$;

create function public.request_guardian_account_foundation()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  foundation_is_enabled boolean;
  child_accounts_are_enabled boolean;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'Authentication required.';
  end if;

  select config.foundation_enabled, config.child_accounts_enabled
  into foundation_is_enabled, child_accounts_are_enabled
  from public.guardian_foundation_config as config
  where config.singleton_key = 'guardian_foundation';

  if not coalesce(foundation_is_enabled, false)
    or not coalesce(child_accounts_are_enabled, false) then
    raise exception using
      errcode = '42501',
      message = 'Guardian account requests are disabled.';
  end if;

  raise exception using
    errcode = '0A000',
    message = 'Guardian account provisioning is not implemented.';
end;
$$;

create function public.record_guardian_consent_v1(
  p_guardian_account_request_id uuid,
  p_provider_key text,
  p_notice_version text,
  p_consent_scopes text[],
  p_consent_scope_versions jsonb,
  p_evidence_digest text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  foundation_is_enabled boolean;
begin
  select config.foundation_enabled
  into foundation_is_enabled
  from public.guardian_foundation_config as config
  where config.singleton_key = 'guardian_foundation';

  if not coalesce(foundation_is_enabled, false) then
    raise exception using
      errcode = '42501',
      message = 'Guardian consent recording is disabled.';
  end if;

  raise exception using
    errcode = '0A000',
    message = 'Guardian consent recording is not implemented.';
end;
$$;

create function public.validate_child_data_registry_coverage()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  required_surfaces text[] := array[
    'account_request',
    'learning_records',
    'ai_assistance',
    'file_uploads',
    'voice_inputs',
    'saved_audio',
    'wellness',
    'school_integrations'
  ];
  required_scopes text[] := array[
    'account_request',
    'learning_records',
    'ai_assistance',
    'file_uploads',
    'voice_inputs',
    'saved_audio',
    'wellness',
    'school_integrations'
  ];
  covered_surfaces text[];
  covered_scopes text[];
  missing_surfaces text[];
  missing_scopes text[];
  invalid_entry_count bigint;
begin
  select coalesce(array_agg(registry.surface order by registry.surface), '{}'::text[])
  into covered_surfaces
  from public.child_data_registry_entries as registry;

  select coalesce(array_agg(scope_row.scope order by scope_row.scope), '{}'::text[])
  into covered_scopes
  from (
    select distinct unnest(registry.consent_scopes) as scope
    from public.child_data_registry_entries as registry
  ) as scope_row;

  select array(
    select required_surface
    from unnest(required_surfaces) as required_surface
    where not (required_surface = any(covered_surfaces))
  ) into missing_surfaces;

  select array(
    select required_scope
    from unnest(required_scopes) as required_scope
    where not (required_scope = any(covered_scopes))
  ) into missing_scopes;

  select count(*)
  into invalid_entry_count
  from public.child_data_registry_entries as registry
  where registry.contract_version <> 1
    or registry.collection_enabled
    or cardinality(registry.storage_targets) <> 0;

  return jsonb_build_object(
    'contractVersion', 1,
    'valid', cardinality(missing_surfaces) = 0
      and cardinality(missing_scopes) = 0
      and invalid_entry_count = 0,
    'missingSurfaces', to_jsonb(missing_surfaces),
    'missingConsentScopes', to_jsonb(missing_scopes),
    'invalidEntryCount', invalid_entry_count,
    'collectionEnabled', false
  );
end;
$$;

revoke all on function public.guardian_foundation_status() from public;
revoke all on function public.request_guardian_account_foundation() from public;
revoke all on function public.record_guardian_consent_v1(uuid, text, text, text[], jsonb, text)
  from public;
revoke all on function public.validate_child_data_registry_coverage() from public;

grant execute on function public.guardian_foundation_status() to authenticated, service_role;
grant execute on function public.request_guardian_account_foundation() to authenticated, service_role;
grant execute on function public.record_guardian_consent_v1(uuid, text, text, text[], jsonb, text)
  to service_role;
grant execute on function public.validate_child_data_registry_coverage() to service_role;
