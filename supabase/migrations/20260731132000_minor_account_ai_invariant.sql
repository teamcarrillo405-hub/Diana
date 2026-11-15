-- Diana is not available to students under 13 until a verified parental
-- consent workflow exists. Enforce that policy below the browser layer.

update public.profiles
set consent_ai = false,
    consent_ai_at = null,
    updated_at = now()
where age_bracket = 'under_13'
  and consent_ai = true;

alter table public.profiles
  drop constraint if exists profiles_minor_ai_consent_guard;

alter table public.profiles
  add constraint profiles_minor_ai_consent_guard
  check (age_bracket <> 'under_13' or consent_ai = false);

create or replace function public.enforce_profile_age_and_ai_consent()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  calculated_bracket text;
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

  if tg_op = 'UPDATE' and new.consent_ai is distinct from old.consent_ai then
    new.consent_ai_at := case when new.consent_ai then now() else null end;
  elsif tg_op = 'INSERT' and new.consent_ai then
    new.consent_ai_at := coalesce(new.consent_ai_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_age_and_ai_consent on public.profiles;
create trigger profiles_enforce_age_and_ai_consent
before insert or update of date_of_birth, age_bracket, consent_ai
on public.profiles
for each row execute function public.enforce_profile_age_and_ai_consent();

revoke all on function public.enforce_profile_age_and_ai_consent() from public;
grant execute on function public.enforce_profile_age_and_ai_consent() to authenticated, service_role;
