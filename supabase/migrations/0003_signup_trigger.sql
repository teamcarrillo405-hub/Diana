-- On auth.users insert, create a profile row from sign-up metadata.
-- DOB is required at signup and stored in raw_user_meta_data by the client.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dob date;
  age_years int;
  bracket text;
begin
  dob := nullif(new.raw_user_meta_data->>'date_of_birth','')::date;
  if dob is null then
    raise exception 'date_of_birth required in signup metadata';
  end if;

  age_years := extract(year from age(dob));
  bracket := case
    when age_years < 13 then 'under_13'
    when age_years < 18 then '13_to_17'
    else 'adult'
  end;

  insert into public.profiles (user_id, display_name, date_of_birth, age_bracket, timezone)
  values (
    new.id,
    new.raw_user_meta_data->>'display_name',
    dob,
    bracket,
    coalesce(new.raw_user_meta_data->>'timezone','America/New_York')
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
