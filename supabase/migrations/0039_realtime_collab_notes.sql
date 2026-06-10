-- 0039: publish collaborative_notes to Realtime so group note edits arrive
-- as change events instead of a 500ms router-refresh polling loop.

alter publication supabase_realtime add table public.collaborative_notes;
