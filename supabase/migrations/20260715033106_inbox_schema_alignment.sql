-- Align the legacy production inbox table with the canonical application schema.
-- Some early environments recorded migration 0009 while retaining the older
-- user_id/raw_content/ai_suggested_* column names.

begin;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'user_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'owner_id'
  ) then
    alter table public.inbox_items rename column user_id to owner_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'raw_content'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'raw'
  ) then
    alter table public.inbox_items rename column raw_content to raw;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'source'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'capture_mode'
  ) then
    alter table public.inbox_items rename column source to capture_mode;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'ai_suggested_class_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'suggested_class_id'
  ) then
    alter table public.inbox_items rename column ai_suggested_class_id to suggested_class_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'ai_suggested_type'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'suggested_kind'
  ) then
    alter table public.inbox_items rename column ai_suggested_type to suggested_kind;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'ai_suggested_due_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'suggested_due_at'
  ) then
    alter table public.inbox_items rename column ai_suggested_due_date to suggested_due_at;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'ai_confidence'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'suggestion_confidence'
  ) then
    alter table public.inbox_items rename column ai_confidence to suggestion_confidence;
  end if;
end
$$;

alter table public.inbox_items
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists raw text,
  add column if not exists capture_mode text,
  add column if not exists photo_storage_key text,
  add column if not exists status text,
  add column if not exists suggested_class_id uuid references public.classes(id) on delete set null,
  add column if not exists suggested_kind text,
  add column if not exists suggested_due_at timestamptz,
  add column if not exists suggestion_confidence numeric,
  add column if not exists assignment_id uuid references public.assignments(id) on delete set null,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.inbox_items
set
  raw = coalesce(raw, ''),
  capture_mode = case lower(coalesce(capture_mode, 'text'))
    when 'voice' then 'voice'
    when 'audio' then 'voice'
    when 'photo' then 'photo'
    when 'image' then 'photo'
    when 'camera' then 'photo'
    else 'text'
  end,
  status = coalesce(status, 'unclassified'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now());

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inbox_items' and column_name = 'classified_at'
  ) then
    update public.inbox_items
    set status = 'classified'
    where classified_at is not null and status = 'unclassified';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inbox_items'
      and column_name = 'suggested_due_at'
      and data_type = 'date'
  ) then
    alter table public.inbox_items
      alter column suggested_due_at type timestamptz
      using suggested_due_at::timestamp at time zone 'UTC';
  end if;
end
$$;

alter table public.inbox_items
  alter column owner_id set not null,
  alter column raw set not null,
  alter column capture_mode set not null,
  alter column capture_mode set default 'text',
  alter column status set not null,
  alter column status set default 'unclassified',
  alter column created_at set not null,
  alter column created_at set default now(),
  alter column updated_at set not null,
  alter column updated_at set default now();

alter table public.inbox_items
  drop constraint if exists inbox_items_capture_mode_check,
  drop constraint if exists inbox_items_status_check,
  drop constraint if exists inbox_items_suggestion_confidence_check;

alter table public.inbox_items
  add constraint inbox_items_capture_mode_check
    check (capture_mode in ('voice', 'photo', 'text')),
  add constraint inbox_items_status_check
    check (status in ('unclassified', 'classified', 'dismissed', 'converted')),
  add constraint inbox_items_suggestion_confidence_check
    check (suggestion_confidence between 0 and 1);

create index if not exists inbox_items_owner_created_idx
  on public.inbox_items (owner_id, created_at desc);

alter table public.inbox_items enable row level security;

drop policy if exists "users own inbox" on public.inbox_items;
drop policy if exists "inbox_items: owner full access" on public.inbox_items;

create policy "inbox_items: owner full access"
  on public.inbox_items
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

commit;
