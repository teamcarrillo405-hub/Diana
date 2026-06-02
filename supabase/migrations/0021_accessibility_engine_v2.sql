-- Phase 13: Accessibility Engine v2.
-- Adds persistent reading-mode preferences and expands TTS controls.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bionic_reading boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visual_pacing text NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS line_focus boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reading_letter_spacing text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS reading_word_spacing text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS tts_speed numeric(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS tts_pitch numeric(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS tts_voice text NOT NULL DEFAULT 'nova';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_visual_pacing_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_visual_pacing_check
      CHECK (visual_pacing IN ('off', 'word', 'line'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_reading_letter_spacing_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_reading_letter_spacing_check
      CHECK (reading_letter_spacing IN ('normal', 'wide', 'wider'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_reading_word_spacing_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_reading_word_spacing_check
      CHECK (reading_word_spacing IN ('normal', 'wide', 'wider'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tts_speed_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tts_speed_check
      CHECK (tts_speed >= 0.70 AND tts_speed <= 1.50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_tts_pitch_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_tts_pitch_check
      CHECK (tts_pitch >= 0.50 AND tts_pitch <= 1.50);
  END IF;
END $$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tts_provider_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tts_provider_check
  CHECK (tts_provider IN ('browser', 'openai', 'elevenlabs'));

COMMENT ON COLUMN public.profiles.bionic_reading IS
  'When true, long-form reading blocks bold the start of each word.';
COMMENT ON COLUMN public.profiles.visual_pacing IS
  'Reading pacing mode: off, word, or line.';
COMMENT ON COLUMN public.profiles.line_focus IS
  'When true, long-form reading blocks dim non-current logical lines.';
COMMENT ON COLUMN public.profiles.reading_letter_spacing IS
  'Reading-view letter spacing preference: normal, wide, or wider.';
COMMENT ON COLUMN public.profiles.reading_word_spacing IS
  'Reading-view word spacing preference: normal, wide, or wider.';
COMMENT ON COLUMN public.profiles.tts_speed IS
  'Preferred text-to-speech speed multiplier.';
COMMENT ON COLUMN public.profiles.tts_pitch IS
  'Preferred browser text-to-speech pitch multiplier.';
COMMENT ON COLUMN public.profiles.tts_voice IS
  'Preferred text-to-speech voice key or provider voice id.';

COMMIT;
