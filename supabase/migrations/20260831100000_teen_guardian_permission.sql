-- Parent or guardian permission attestation for the age 13-17 AI beta.
-- This is separate from the disabled under-13 COPPA/VPC foundation. It records
-- an attestation only, does not verify identity, and cannot enable under-13
-- accounts.

alter table public.profiles
  add column teen_guardian_permission_attested_at timestamptz,
  add column teen_guardian_permission_policy_version text,
  add column teen_guardian_permission_source text,
  add column teen_guardian_permission_withdrawn_at timestamptz;

alter table public.profiles
  add constraint profiles_teen_guardian_permission_record_guard
  check (
    (
      teen_guardian_permission_attested_at is null
      and teen_guardian_permission_policy_version is null
      and teen_guardian_permission_source is null
      and teen_guardian_permission_withdrawn_at is null
    )
    or
    (
      teen_guardian_permission_attested_at is not null
      and teen_guardian_permission_policy_version is not null
      and teen_guardian_permission_source in (
        'signup_attestation',
        'profile_center_attestation',
        'synthetic_qa_fixture'
      )
      and (
        teen_guardian_permission_withdrawn_at is null
        or teen_guardian_permission_withdrawn_at >= teen_guardian_permission_attested_at
      )
    )
  );

-- Existing teen profiles have no attestation record. Disable AI until the
-- student records the current permission through an explicit product surface.
update public.profiles
set age_bracket = 'adult',
    updated_at = now()
where age_bracket = '13_to_17'
  and date_of_birth <= current_date - interval '18 years';

update public.profiles
set consent_ai = false,
    consent_ai_at = null,
    updated_at = now()
where age_bracket = '13_to_17'
  and consent_ai = true;

alter table public.profiles
  add constraint profiles_teen_ai_permission_guard
  check (
    age_bracket <> '13_to_17'
    or consent_ai = false
    or (
      teen_guardian_permission_attested_at is not null
      and teen_guardian_permission_policy_version = 'teen_openai_beta_v1'
      and teen_guardian_permission_source in (
        'signup_attestation',
        'profile_center_attestation',
        'synthetic_qa_fixture'
      )
      and teen_guardian_permission_withdrawn_at is null
    )
  );

comment on column public.profiles.teen_guardian_permission_attested_at is
  'Server-recorded time when an age 13-17 user attested that parent or guardian permission exists.';
comment on column public.profiles.teen_guardian_permission_policy_version is
  'Version of the teen AI beta permission statement shown for the attestation.';
comment on column public.profiles.teen_guardian_permission_source is
  'Product or explicit synthetic fixture surface that recorded the attestation.';
comment on column public.profiles.teen_guardian_permission_withdrawn_at is
  'Server-recorded withdrawal time. A non-null value makes teen permission inactive.';

create or replace function public.enforce_profile_age_and_ai_consent()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  calculated_bracket text;
  permission_claims_current boolean;
  permission_was_current boolean := false;
begin
  if new.date_of_birth is null then
    raise exception 'date_of_birth required';
  end if;

  if new.date_of_birth > current_date then
    raise exception 'date_of_birth is invalid';
  end if;

  calculated_bracket := case
    when new.date_of_birth > current_date - interval '13 years' then 'under_13'
    when new.date_of_birth > current_date - interval '18 years' then '13_to_17'
    else 'adult'
  end;

  if calculated_bracket = 'under_13' then
    raise exception 'Diana accounts require an age of at least 13';
  end if;

  if new.age_bracket <> calculated_bracket then
    raise exception 'age_bracket does not match date_of_birth';
  end if;

  permission_claims_current := coalesce(
    new.teen_guardian_permission_attested_at is not null
    and new.teen_guardian_permission_policy_version = 'teen_openai_beta_v1'
    and new.teen_guardian_permission_source in (
      'signup_attestation',
      'profile_center_attestation',
      'synthetic_qa_fixture'
    )
    and new.teen_guardian_permission_withdrawn_at is null,
    false
  );

  if tg_op = 'UPDATE' then
    permission_was_current := coalesce(
      old.teen_guardian_permission_attested_at is not null
      and old.teen_guardian_permission_policy_version = 'teen_openai_beta_v1'
      and old.teen_guardian_permission_source in (
        'signup_attestation',
        'profile_center_attestation',
        'synthetic_qa_fixture'
      )
      and old.teen_guardian_permission_withdrawn_at is null,
      false
    );

    if new.teen_guardian_permission_withdrawn_at is not null
      and new.teen_guardian_permission_withdrawn_at
        is distinct from old.teen_guardian_permission_withdrawn_at then
      new.teen_guardian_permission_withdrawn_at := now();
    end if;
  end if;

  if calculated_bracket = '13_to_17'
    and permission_claims_current
    and not permission_was_current then
    new.teen_guardian_permission_attested_at := now();
  elsif calculated_bracket = '13_to_17'
    and permission_claims_current
    and permission_was_current then
    new.teen_guardian_permission_attested_at := old.teen_guardian_permission_attested_at;
    new.teen_guardian_permission_policy_version := old.teen_guardian_permission_policy_version;
    new.teen_guardian_permission_source := old.teen_guardian_permission_source;
  end if;

  permission_claims_current := coalesce(
    new.teen_guardian_permission_attested_at is not null
    and new.teen_guardian_permission_policy_version = 'teen_openai_beta_v1'
    and new.teen_guardian_permission_source in (
      'signup_attestation',
      'profile_center_attestation',
      'synthetic_qa_fixture'
    )
    and new.teen_guardian_permission_withdrawn_at is null,
    false
  );

  if calculated_bracket = '13_to_17' and not permission_claims_current then
    new.consent_ai := false;
    new.consent_ai_at := null;
  elsif tg_op = 'UPDATE' and new.consent_ai is distinct from old.consent_ai then
    new.consent_ai_at := case when new.consent_ai then now() else null end;
  elsif tg_op = 'INSERT' and new.consent_ai then
    new.consent_ai_at := coalesce(new.consent_ai_at, now());
  elsif not new.consent_ai then
    new.consent_ai_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_age_and_ai_consent on public.profiles;
create trigger profiles_enforce_age_and_ai_consent
before insert or update of
  date_of_birth,
  age_bracket,
  consent_ai,
  teen_guardian_permission_attested_at,
  teen_guardian_permission_policy_version,
  teen_guardian_permission_source,
  teen_guardian_permission_withdrawn_at
on public.profiles
for each row execute function public.enforce_profile_age_and_ai_consent();

revoke all on function public.enforce_profile_age_and_ai_consent() from public;
grant execute on function public.enforce_profile_age_and_ai_consent() to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dob date;
  age_years int;
  bracket text;
  learning_hurdle_value text;
  study_schedule_preference_value text;
  teen_permission_attested boolean;
begin
  dob := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
  if dob is null then
    raise exception 'date_of_birth required in signup metadata';
  end if;
  if dob > current_date then
    raise exception 'date_of_birth is invalid';
  end if;

  age_years := extract(year from age(dob));
  bracket := case
    when age_years < 13 then 'under_13'
    when age_years < 18 then '13_to_17'
    else 'adult'
  end;

  if bracket = 'under_13' then
    raise exception 'Diana accounts require an age of at least 13';
  end if;

  teen_permission_attested :=
    lower(coalesce(new.raw_user_meta_data->>'teen_guardian_permission_attested', 'false')) = 'true';

  if bracket = '13_to_17' and (
    not teen_permission_attested
    or new.raw_user_meta_data->>'teen_guardian_permission_policy_version'
      is distinct from 'teen_openai_beta_v1'
    or new.raw_user_meta_data->>'teen_guardian_permission_source'
      is distinct from 'signup_attestation'
  ) then
    raise exception 'Parent or guardian permission attestation required for teen signup';
  end if;

  learning_hurdle_value := case
    when new.raw_user_meta_data->>'learning_hurdle' in (
      'time_management',
      'exam_stress',
      'complex_concepts',
      'staying_consistent'
    )
      then new.raw_user_meta_data->>'learning_hurdle'
    else null
  end;

  study_schedule_preference_value := case
    when new.raw_user_meta_data->>'study_schedule_preference' in (
      'morning',
      'after_practice',
      'late_night'
    )
      then new.raw_user_meta_data->>'study_schedule_preference'
    else null
  end;

  insert into public.profiles (
    user_id,
    display_name,
    date_of_birth,
    age_bracket,
    timezone,
    learning_hurdle,
    study_schedule_preference,
    onboarded_at,
    teen_guardian_permission_attested_at,
    teen_guardian_permission_policy_version,
    teen_guardian_permission_source,
    teen_guardian_permission_withdrawn_at
  )
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    dob,
    bracket,
    coalesce(new.raw_user_meta_data->>'timezone', 'America/New_York'),
    learning_hurdle_value,
    study_schedule_preference_value,
    case
      when learning_hurdle_value is not null
        and study_schedule_preference_value is not null
        then now()
      else null
    end,
    case when bracket = '13_to_17' then now() else null end,
    case when bracket = '13_to_17' then 'teen_openai_beta_v1' else null end,
    case when bracket = '13_to_17' then 'signup_attestation' else null end,
    null
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
