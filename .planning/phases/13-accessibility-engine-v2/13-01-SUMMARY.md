---
phase: 13-accessibility-engine-v2
plan: "01"
completed: "2026-06-01"
requirements_completed: [F26, F27, F28, F29, F30, F31, F32]
---

# Phase 13 Plan 01 Summary

Phase 13 is implemented and applied to the linked Supabase project.

## What Changed

- Added migration `0021_accessibility_engine_v2.sql`:
  - `profiles.bionic_reading`
  - `profiles.visual_pacing`
  - `profiles.line_focus`
  - `profiles.reading_letter_spacing`
  - `profiles.reading_word_spacing`
  - `profiles.tts_speed`
  - `profiles.tts_pitch`
  - `profiles.tts_voice`
  - `profiles.tts_provider` constraint expanded to include `elevenlabs`
- Added pure reading helpers in `lib/accessibility/reading-tools.ts`.
- Added `AccessibleReadingText` for bionic text, word pacing, line pacing, and line focus.
- Expanded Settings accessibility controls with switch semantics and pressed-state segmented buttons.
- Applied reading modes to assignment descriptions, reading support panels, note bodies, and cleaned transcripts.
- Expanded TTS playback to use saved provider, voice, speed, and pitch preferences.
- Updated `tts-generate` to support OpenAI and ElevenLabs provider paths.
- Changed the `danger` design token from red to amber, including high-contrast dark/light variants.

## Acceptance Evidence

- Devon can enable bionic reading and line focus:
  - `app/(app)/settings/accessibility-prefs.tsx` exposes both as first-section switches.
  - Switch controls use `role="switch"` and `aria-checked`.
- TTS reads notes and assignment descriptions:
  - `app/(app)/assignments/[id]/page.tsx` passes saved TTS preferences to `TtsButton`.
  - `app/(app)/assignments/[id]/reading-panel.tsx` passes saved TTS preferences to `TtsHighlightButton`.
  - `app/(app)/notes/[id]/note-detail.tsx` adds TTS to note bodies and cleaned transcripts.
- Reading controls are keyboard reachable:
  - `components/accessible-reading-text.tsx` uses real buttons for next/previous pacing controls.
  - The reading region supports arrow-key movement when pacing controls are active.
  - Settings pills expose `aria-pressed`.
- ElevenLabs provider path:
  - `supabase/functions/tts-generate/index.ts` calls `https://api.elevenlabs.io/v1/text-to-speech/:voice_id` with `voice_settings.speed`.
  - Runtime requires `ELEVENLABS_API_KEY` as a Supabase Edge Function secret.

## Verification

- `npm run typecheck`: pass
- `npm run test:run`: pass, 32 files / 291 tests
- `npm run tone-audit`: pass, 0 blocking violations, 1 README warning
- `npm run build`: pass
- `npx supabase db push --linked --dry-run`: pass, only `0021_accessibility_engine_v2.sql` pending
- `npx supabase db push --linked --yes`: pass, migration `0021` applied
- `npx supabase migration list --linked`: pass, migration `0021` present on Local and Remote
- `npx supabase --experimental db query --linked`: pass, all 8 Phase 13 profile columns present
- `npx supabase functions deploy tts-generate`: pass
- `npx supabase functions list`: pass, `tts-generate` ACTIVE after deploy

## Notes

- Migration 0021 was applied to linked project `oitipayrriupcitgmzju`.
- `tts-generate` deployed 2026-06-01T17:09:58Z.
- Local `.env.local` has no `ELEVENLABS_*` key, and `supabase secrets list` is blocked here by a missing Supabase access token. ElevenLabs playback is code-complete but operationally requires `ELEVENLABS_API_KEY` in Supabase Edge Function secrets.
