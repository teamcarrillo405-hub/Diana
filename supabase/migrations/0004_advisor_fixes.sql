-- Address security advisors from get_advisors after initial schema.
-- 1) touch_updated_at had mutable search_path → pin it.
-- 2) handle_new_user is SECURITY DEFINER and shouldn't be callable from REST.

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
