-- Player photo: cross-device lobby photo.
-- Stored as a downscaled data URL on the student's own (RLS-protected) profile
-- row rather than a public Storage bucket. Privacy-first for a minors' product
-- (see FERPA note in the design README): there is no guessable public URL, and
-- existing profiles RLS already restricts read/update to the owner.
begin;

alter table public.profiles
  add column if not exists photo_url text;

commit;
