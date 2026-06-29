create table public.canva_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.canva_connections enable row level security;

create policy "canva_connections_owner_all"
  on public.canva_connections
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);;
