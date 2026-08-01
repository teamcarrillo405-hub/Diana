-- Keep browser-authenticated clients from redirecting server-held Canvas credentials.
-- A connection must be deleted and re-created to change institutions, which also
-- removes its service-role credential through the existing cascading foreign key.

create or replace function public.protect_lms_connection_destination()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if new.owner_id is distinct from old.owner_id
      or new.provider is distinct from old.provider then
      raise exception 'LMS connection ownership and provider cannot be changed'
        using errcode = '42501';
    end if;

    if old.provider = 'canvas' then
      if new.config ->> 'base_url' is distinct from old.config ->> 'base_url' then
        raise exception 'Canvas connection destination cannot be changed'
          using errcode = '42501';
      end if;

      -- Legacy rows may add their server-issued institution ID without changing
      -- the saved origin. Once present, the institution ID is immutable.
      if nullif(old.config ->> 'institution_id', '') is not null
        and new.config ->> 'institution_id' is distinct from old.config ->> 'institution_id' then
        raise exception 'Canvas connection institution cannot be changed'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_lms_connection_destination() from public;
revoke all on function public.protect_lms_connection_destination() from anon;
revoke all on function public.protect_lms_connection_destination() from authenticated;

drop trigger if exists protect_lms_connection_destination on public.lms_connections;
create trigger protect_lms_connection_destination
before update on public.lms_connections
for each row execute function public.protect_lms_connection_destination();
