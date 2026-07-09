-- Player photo: crop offset for the drag-to-reposition control (Settings > profile).
-- Percentages (0-100) applied as CSS object-position so the reposition choice
-- syncs cross-device like photo_url itself.
begin;

alter table public.profiles
  add column if not exists photo_offset_x smallint not null default 50,
  add column if not exists photo_offset_y smallint not null default 50;

alter table public.profiles
  add constraint profiles_photo_offset_x_range check (photo_offset_x between 0 and 100),
  add constraint profiles_photo_offset_y_range check (photo_offset_y between 0 and 100);

commit;
