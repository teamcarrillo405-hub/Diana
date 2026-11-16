-- Optional student-selected school colors and logo remain on the owner-scoped profile.
begin;

alter table public.profiles
  add column if not exists school_primary_color text,
  add column if not exists school_secondary_color text,
  add column if not exists school_logo_url text;

alter table public.profiles
  add constraint profiles_school_primary_color_format
    check (school_primary_color is null or school_primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint profiles_school_secondary_color_format
    check (school_secondary_color is null or school_secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint profiles_school_logo_data_format
    check (school_logo_url is null or
      (school_logo_url ~ '^data:image/webp;base64,[A-Za-z0-9+/=]+$'
       and length(school_logo_url) <= 266691));

commit;
