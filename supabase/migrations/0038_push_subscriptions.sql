-- 0038: push_subscriptions — Web Push (VAPID) endpoints per student device.
-- Vendor-free push: standard Web Push to the browser's own push service.
-- Student-owned rows; unsubscribing or a 410 from the push service deletes.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_owner_idx on public.push_subscriptions(owner_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_owner_all"
  on public.push_subscriptions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
