-- These are student-selected requests, not diagnoses or inferred health data.
-- Keep only one current row per owner; requests expire from use after 24 hours.
alter table public.profiles
  add column if not exists tutor_personalization_enabled boolean not null default false;

create table public.student_daily_support_needs (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  need text not null check (need in ('food', 'water', 'break')),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- Expiry is controlled by the database even when an authenticated client writes
-- directly. An expired row remains stored until cleared, replaced or deleted
-- with the account; consumers must filter expires_at before using it.
create function public.set_student_daily_support_expiry()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  new.expires_at := now() + interval '24 hours';
  return new;
end;
$$;
create trigger student_daily_support_expiry
  before insert or update on public.student_daily_support_needs
  for each row execute function public.set_student_daily_support_expiry();

alter table public.student_daily_support_needs enable row level security;
create policy student_daily_support_select on public.student_daily_support_needs
  for select to authenticated using (owner_id = (select auth.uid()));
create policy student_daily_support_insert on public.student_daily_support_needs
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy student_daily_support_update on public.student_daily_support_needs
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy student_daily_support_delete on public.student_daily_support_needs
  for delete to authenticated using (owner_id = (select auth.uid()));
revoke all on public.student_daily_support_needs from public, anon;
grant select, insert, update, delete on public.student_daily_support_needs to authenticated;
grant all on public.student_daily_support_needs to service_role;
