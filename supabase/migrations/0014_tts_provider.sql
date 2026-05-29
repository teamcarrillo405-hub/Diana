-- 0014_tts_provider.sql
-- Phase 8 — F4/F6/F8 provider wiring.
-- Adds profiles.tts_provider so users can opt into OpenAI Whisper STT + OpenAI TTS
-- as an upgrade over the browser Web Speech API / speechSynthesis defaults.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'browser';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tts_provider_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tts_provider_check
      CHECK (tts_provider IN ('browser', 'openai'));
  END IF;
END $$;

COMMIT;
