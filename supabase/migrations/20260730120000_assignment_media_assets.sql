-- Private student-controlled audio and video evidence.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_kind text not null check (media_kind in ('audio', 'video')),
  storage_key text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 262144000),
  duration_seconds numeric,
  student_selected_for_submission boolean not null default false,
  consent_confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_annotations (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  author_role text not null check (author_role in ('student', 'teacher')),
  time_seconds numeric not null check (time_seconds >= 0),
  note text not null check (length(trim(note)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists media_assets_assignment_idx
  on public.media_assets (assignment_id, created_at desc);
create index if not exists media_annotations_asset_time_idx
  on public.media_annotations (media_asset_id, time_seconds);

alter table public.media_assets enable row level security;
alter table public.media_annotations enable row level security;

create policy media_assets_owner_all on public.media_assets for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy media_annotations_owner_all on public.media_annotations for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assignment-media',
  'assignment-media',
  false,
  262144000,
  array[
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy assignment_media_owner_select on storage.objects
for select to authenticated
using (bucket_id = 'assignment-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy assignment_media_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'assignment-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy assignment_media_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'assignment-media' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'assignment-media' and (storage.foldername(name))[1] = auth.uid()::text);

create policy assignment_media_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'assignment-media' and (storage.foldername(name))[1] = auth.uid()::text);
