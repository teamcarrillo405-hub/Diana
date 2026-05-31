-- 0019_note_docs_bucket.sql
-- Phase 11: F04-PHOTO / F08-NOTE — photo and PDF upload support.
--
-- This migration ONLY adds the doc_storage_key column on notes.
--
-- The "note-docs" Storage bucket is created out-of-band (Supabase dashboard
-- or Supabase MCP) because Postgres migrations cannot directly manage
-- storage.buckets rows safely. Bucket settings:
--   name: note-docs
--   public: false
--   fileSizeLimit: 20971520 (20 MB)
--   allowedMimeTypes:
--     image/jpeg, image/png, image/webp, image/gif,
--     image/heic, image/heif, application/pdf
--   RLS: owner-only (mirrors note-audio policies)
--
-- Wave 3 (11-03) handles the bucket creation via Supabase MCP.

ALTER TABLE public.notes
  ADD COLUMN doc_storage_key text;

COMMENT ON COLUMN public.notes.doc_storage_key IS
  'Storage key in note-docs bucket for photo/PDF uploads (Phase 11 / F04-PHOTO + F08-NOTE).';
