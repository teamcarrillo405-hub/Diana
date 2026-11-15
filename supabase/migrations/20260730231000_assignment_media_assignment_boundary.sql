-- Media ownership alone is insufficient: the referenced assignment must also
-- belong to the signed-in student. Enforce that boundary even when a client
-- bypasses the server action.

drop policy if exists media_assets_owner_all on public.media_assets;
create policy media_assets_owner_all
on public.media_assets
for all
using (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id = media_assets.assignment_id
      and assignment.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id = media_assets.assignment_id
      and assignment.owner_id = auth.uid()
  )
);

drop policy if exists media_annotations_owner_all on public.media_annotations;
create policy media_annotations_owner_all
on public.media_annotations
for all
using (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.media_assets media
    where media.id = media_annotations.media_asset_id
      and media.assignment_id = media_annotations.assignment_id
      and media.owner_id = auth.uid()
  )
)
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.media_assets media
    where media.id = media_annotations.media_asset_id
      and media.assignment_id = media_annotations.assignment_id
      and media.owner_id = auth.uid()
  )
);

drop policy if exists assignment_media_owner_select on storage.objects;
create policy assignment_media_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id::text = (storage.foldername(name))[2]
      and assignment.owner_id = auth.uid()
  )
);

drop policy if exists assignment_media_owner_insert on storage.objects;
create policy assignment_media_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id::text = (storage.foldername(name))[2]
      and assignment.owner_id = auth.uid()
  )
);

drop policy if exists assignment_media_owner_update on storage.objects;
create policy assignment_media_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id::text = (storage.foldername(name))[2]
      and assignment.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id::text = (storage.foldername(name))[2]
      and assignment.owner_id = auth.uid()
  )
);

drop policy if exists assignment_media_owner_delete on storage.objects;
create policy assignment_media_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'assignment-media'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1
    from public.assignments assignment
    where assignment.id::text = (storage.foldername(name))[2]
      and assignment.owner_id = auth.uid()
  )
);
