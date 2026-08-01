-- Student-controlled assignment recordings expire after a bounded retention
-- window. A protected daily job removes the private storage object first and
-- then deletes this row and its timestamped annotations.

alter table public.media_assets
  add column if not exists retention_expires_at timestamptz;

update public.media_assets
set retention_expires_at = created_at + interval '180 days'
where retention_expires_at is null;

alter table public.media_assets
  alter column retention_expires_at set default (now() + interval '180 days'),
  alter column retention_expires_at set not null;

create index if not exists media_assets_retention_idx
  on public.media_assets (retention_expires_at, id);
