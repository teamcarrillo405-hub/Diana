-- Visual editor storage for the public Diana landing page.
-- Drafts are service-role only. Published configuration is intentionally public.

create table if not exists public.landing_page_drafts (
  slug text primary key,
  config jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landing_page_publications (
  slug text primary key,
  config jsonb not null,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

alter table public.landing_page_drafts enable row level security;
alter table public.landing_page_publications enable row level security;

revoke all on table public.landing_page_drafts from anon, authenticated;
revoke insert, update, delete on table public.landing_page_publications
  from anon, authenticated;
grant select on table public.landing_page_publications to anon, authenticated;

drop policy if exists landing_page_publications_read on public.landing_page_publications;
create policy landing_page_publications_read
  on public.landing_page_publications
  for select
  to anon, authenticated
  using (slug = 'public-home');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-page-assets',
  'landing-page-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
