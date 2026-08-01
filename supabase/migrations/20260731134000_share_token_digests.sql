-- Phase 1 of the share-token rollout. Keep the legacy token column until every
-- serverless instance reads digests; a later release can remove it.

alter table public.share_links
  add column if not exists token_digest text;

create or replace function public.sync_share_link_token_digest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.token_digest := encode(extensions.digest(new.token, 'sha256'), 'hex');
  return new;
end;
$$;

drop trigger if exists share_links_sync_token_digest on public.share_links;
create trigger share_links_sync_token_digest
before insert or update of token on public.share_links
for each row execute function public.sync_share_link_token_digest();

update public.share_links
set token_digest = encode(extensions.digest(token, 'sha256'), 'hex')
where token_digest is distinct from encode(extensions.digest(token, 'sha256'), 'hex');

alter table public.share_links
  alter column token_digest set not null;

create unique index if not exists share_links_token_digest_idx
  on public.share_links (token_digest);

-- Keep share_links_token_idx and share_links.token for rolling compatibility.
-- The cleanup migration must only run after old instances have drained.
