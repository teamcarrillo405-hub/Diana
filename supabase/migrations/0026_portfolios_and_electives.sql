-- Phase 25: arts and electives portfolio mode.
-- Reuses the existing private note-docs storage bucket for uploaded images/docs.

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  title text not null,
  reflection_text text,
  storage_bucket text not null default 'note-docs',
  storage_key text,
  mime_type text,
  metadata jsonb not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portfolios_owner_idx
  on public.portfolios (owner_id, created_at desc);

create index if not exists portfolio_items_portfolio_idx
  on public.portfolio_items (portfolio_id, position, created_at desc);

alter table public.portfolios enable row level security;
alter table public.portfolio_items enable row level security;

create policy "portfolios owner read"
  on public.portfolios for select
  using (owner_id = auth.uid());

create policy "portfolios owner insert"
  on public.portfolios for insert
  with check (owner_id = auth.uid());

create policy "portfolios owner update"
  on public.portfolios for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "portfolios owner delete"
  on public.portfolios for delete
  using (owner_id = auth.uid());

create policy "portfolio_items owner read"
  on public.portfolio_items for select
  using (owner_id = auth.uid());

create policy "portfolio_items owner insert"
  on public.portfolio_items for insert
  with check (owner_id = auth.uid());

create policy "portfolio_items owner update"
  on public.portfolio_items for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "portfolio_items owner delete"
  on public.portfolio_items for delete
  using (owner_id = auth.uid());
