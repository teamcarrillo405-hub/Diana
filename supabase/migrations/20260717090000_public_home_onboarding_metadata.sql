-- Project validated public onboarding choices from auth signup metadata into the
-- owner profile. Direct signup still leaves both preferences and onboarded_at null.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dob date;
  age_years int;
  bracket text;
  learning_hurdle_value text;
  study_schedule_preference_value text;
begin
  dob := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
  if dob is null then
    raise exception 'date_of_birth required in signup metadata';
  end if;

  age_years := extract(year from age(dob));
  bracket := case
    when age_years < 13 then 'under_13'
    when age_years < 18 then '13_to_17'
    else 'adult'
  end;

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
    onboarded_at
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
    end
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
