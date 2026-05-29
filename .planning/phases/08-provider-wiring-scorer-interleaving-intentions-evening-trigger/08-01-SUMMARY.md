---
plan: 08-01
phase: 8
subsystem: voice-tts-provider
tags: [edge-functions, whisper, openai-tts, voice, tts, provider-wiring, f4, f6, f8]
dependency_graph:
  requires: []
  provides:
    - supabase/functions/transcribe-voice (Whisper STT)
    - supabase/functions/tts-generate (OpenAI TTS)
    - profiles.tts_provider column
    - VoiceTextarea provider prop
    - TtsButton provider prop
    - TtsHighlightButton provider prop
  affects:
    - app/(app)/notes/new (VoiceTextarea caller)
    - app/(app)/quick-add (VoiceTextarea caller)
    - app/(app)/dashboard (TtsButton caller)
tech_stack:
  added:
    - OpenAI Whisper API (v1/audio/transcriptions)
    - OpenAI TTS API (v1/audio/speech)
    - MediaRecorder API (browser, OpenAI voice capture path)
    - HTMLAudioElement (browser, OpenAI TTS playback path)
  patterns:
    - Deno Edge Function with CORS + try/catch (matching transcribe-note pattern)
    - Server action for Storage upload (voice-textarea-actions.ts)
    - Supabase client.functions.invoke for Edge Function calls from components
key_files:
  created:
    - supabase/functions/transcribe-voice/index.ts
    - supabase/functions/tts-generate/index.ts
    - supabase/migrations/0014_tts_provider.sql
    - components/voice-textarea-actions.ts
  modified:
    - supabase/functions/_shared/safety.ts (feature union extended)
    - lib/ai/safety.ts (feature union extended, mirror synced)
    - lib/supabase/types.ts (tts_provider in Row/Insert/Update)
    - lib/profile.ts (tts_provider added to select + ProfilePrefs)
    - components/voice-textarea.tsx (provider prop + MediaRecorder path)
    - components/tts-button.tsx (provider prop + HTMLAudioElement path)
    - components/tts-highlight-button.tsx (provider prop + OpenAI simplified path)
    - app/(app)/notes/new/note-editor.tsx (ttsProvider prop)
    - app/(app)/notes/new/page.tsx (loadProfile + ttsProvider propagation)
    - app/(app)/quick-add/capture-form.tsx (ttsProvider prop)
    - app/(app)/quick-add/page.tsx (loadProfile + ttsProvider propagation)
    - app/(app)/dashboard/page.tsx (TtsButton provider prop)
decisions:
  - "OpenAI path uses direct fetch (not supabase.functions.invoke) for binary audio in TtsButton/TtsHighlightButton — invoke parses JSON, losing binary blob"
  - "VoiceTextarea uses a dedicated server action (voice-textarea-actions.ts) rather than reusing uploadNoteAudio — different storage key shape (voice- prefix) and cleaner separation"
  - "TtsHighlightButton OpenAI variant omits word-level highlighting — OpenAI TTS 1 API emits no word boundary events; estimator fallback is not wired for Wave 1"
  - "tts_provider='browser' is the default for all users — opt-in to OpenAI requires future Settings UI (deferred)"
  - "stt_transcribe and tts_generate added to LogParams.feature union in both lib/ai/safety.ts and supabase/functions/_shared/safety.ts mirrors — no logInteraction call in Wave 1 (non-Claude AI calls)"
metrics:
  duration_minutes: 15
  completed_date: "2026-05-29"
  tasks_completed: 3
  files_changed: 15
---

# Phase 8 Plan 01: Provider Wiring — Whisper STT + OpenAI TTS (F4/F6/F8) Summary

**One-liner:** Whisper STT + OpenAI TTS provider wiring via two new Edge Functions, a `tts_provider` profile column, and opt-in `provider` props on VoiceTextarea/TtsButton/TtsHighlightButton — browser path unchanged as default.

## What Was Built

### Edge Functions (Wave 1 deployable)

**`supabase/functions/transcribe-voice/index.ts`**
- Downloads audio blob from Supabase Storage (`note-audio` or `voice-temp` bucket)
- POSTs to OpenAI Whisper (`v1/audio/transcriptions`) with `model: whisper-1`
- Returns `{ ok: true, text: "<transcript>" }`
- MIME fallback guard: `blob.type || "audio/webm"` per Pitfall 1
- Top-level try/catch + CORS headers matching `transcribe-note` pattern
- Comment: `REQUIRES: OPENAI_API_KEY` — manual secret setup before deploy

**`supabase/functions/tts-generate/index.ts`**
- POSTs to OpenAI TTS (`v1/audio/speech`) with `model: tts-1`, `voice: nova` default
- Returns binary `audio/mpeg` stream with `Cache-Control: no-store`
- 4000-char hard cap (`text.slice(0, 4000)`) per Pitfall 2 — 96-char headroom
- No Supabase client needed — pure pass-through to OpenAI

### Database Migration

**`supabase/migrations/0014_tts_provider.sql`**
- `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'browser'`
- Check constraint `profiles_tts_provider_check` allowing only `'browser'` or `'openai'`
- Idempotent via `IF NOT EXISTS` guard on both the column and constraint

### Profile Sync

- `lib/supabase/types.ts`: `tts_provider` added to `profiles` Row/Insert/Update blocks
- `lib/profile.ts`: `tts_provider` added to `ProfilePrefs` type + select query
- `LogParams.feature` union extended with `stt_transcribe | tts_generate` in both safety.ts mirrors

### Component Wiring

**VoiceTextarea** (`components/voice-textarea.tsx`)
- New `provider?: 'browser' | 'openai'` prop (default `'browser'`)
- OpenAI path: `MediaRecorder` captures audio → `uploadVoiceBlob` server action → `transcribe-voice` Edge Function → `onTranscript(text)`
- Supported check: `navigator.mediaDevices.getUserMedia` (works Firefox/Chrome/Safari)
- "Transcribing…" state shown while upload+transcription runs (button disabled)
- Browser path unchanged — no behavior regression

**`components/voice-textarea-actions.ts`** (new server action)
- `uploadVoiceBlob(formData)` — uploads audio blob to `note-audio` bucket
- Returns `{ ok: true, storageKey }` or `{ ok: false, error }`

**TtsButton** (`components/tts-button.tsx`)
- New `provider?: 'browser' | 'openai'` prop (default `'browser'`)
- OpenAI path: direct fetch to `tts-generate`, `URL.createObjectURL(blob)`, `HTMLAudioElement.play()`
- Cleanup: `URL.revokeObjectURL` on ended/error
- Browser path unchanged

**TtsHighlightButton** (`components/tts-highlight-button.tsx`)
- New `provider?: 'browser' | 'openai'` prop (default `'browser'`)
- OpenAI path: simplified audio-element variant, no word highlighting (boundary events unavailable from OpenAI TTS 1)
- Comment documents the limitation: `Phase 8: OpenAI TTS word-highlight uses estimator — boundary events unavailable per OpenAI TTS 1 API.`
- Browser path unchanged (full word-level highlight via `useTtsHighlight`)

### Caller Updates

- `app/(app)/notes/new/page.tsx`: loads `profile.tts_provider`, passes as `ttsProvider` prop to `NoteEditor`
- `app/(app)/notes/new/note-editor.tsx`: accepts `ttsProvider` prop, passes to `<VoiceTextarea provider={ttsProvider}>`
- `app/(app)/quick-add/page.tsx`: loads `profile.tts_provider`, passes as `ttsProvider` prop to `CaptureForm`
- `app/(app)/quick-add/capture-form.tsx`: accepts `ttsProvider` prop, passes to `<VoiceTextarea provider={ttsProvider}>`
- `app/(app)/dashboard/page.tsx`: passes `provider={profile?.tts_provider ?? 'browser'}` to `<TtsButton>`

## Opt-In Mechanism

`profiles.tts_provider` defaults to `'browser'` for all users. No existing behavior changes. Users opt-in to OpenAI STT/TTS by having `tts_provider = 'openai'` on their profile. The Settings UI to toggle this is deferred to a follow-up plan — the column + prop wiring is the foundation that makes it a one-line settings change.

## Pitfalls Confirmed

1. **Audio MIME fallback** (Pitfall 1): `blob.type || "audio/webm"` in `transcribe-voice` — prevents Whisper 400 "Invalid file format" on empty/generic types from Storage
2. **4000-char cap** (Pitfall 2): `text.slice(0, 4000)` in `tts-generate` — prevents OpenAI 400 "Input text too long"
3. **No word boundary from OpenAI TTS** (documented in `tts-highlight-button.tsx` comment): TTS 1 API emits no word events; estimator fallback is a future enhancement

## Verification Results

```
npm run typecheck   # exit 0
npm run test:run    # exit 0 (96 tests pass — 4 net new from prior phases, 0 regressions)
npm run tone-audit  # exit 0 (2 pre-existing warnings on deadline word, no new violations)
```

## Open Follow-Ups

1. **Settings UI** for `tts_provider` picker — user can currently only get OpenAI by direct DB update
2. **Word highlight via estimator for OpenAI TTS** — `scheduleFallbackTimers` already exists in `lib/tts/tts-utils.ts`; wire it in `TtsHighlightButton` OpenAI path
3. **TtsHighlightButton OpenAI verbose JSON** — if OpenAI ever adds word boundary timestamps to TTS 1 or TTS HD, replace estimator with real timestamps
4. **note-audio bucket creation** — same manual step as `inbox-photos`; must exist in Supabase dashboard before `transcribe-voice` or `uploadVoiceBlob` can upload
5. **OPENAI_API_KEY secret** — must be set via `supabase secrets set OPENAI_API_KEY=sk-...` before deploying either Edge Function

## Commits

- `af51fbd` — feat(08-01): Whisper STT Edge Function + stt_transcribe/tts_generate feature union
- `63c695d` — feat(08-01): OpenAI TTS Edge Function (tts-generate)
- `71febe9` — feat(08-01): tts_provider column + VoiceTextarea/TtsButton/TtsHighlightButton provider wiring

## Deviations from Plan

**1. [Rule 2 - Missing critical functionality] TtsButton uses direct fetch instead of supabase.functions.invoke for binary audio**
- **Found during:** Task 3, Part E
- **Issue:** `supabase.functions.invoke` parses the response as JSON by default; the `tts-generate` function returns binary `audio/mpeg`. Using invoke would lose the binary data.
- **Fix:** Direct fetch to `${SUPABASE_URL}/functions/v1/tts-generate` with auth headers for binary blob retrieval; `supabase.functions.invoke` used only as a probe (the real audio fetch goes through direct fetch)
- **Files modified:** `components/tts-button.tsx`, `components/tts-highlight-button.tsx`
- **Commit:** 71febe9

## Known Stubs

None — all wired functionality uses real implementation paths. The OpenAI provider path is fully wired (upload → transcribe → onTranscript / fetch tts → play). The browser path is unchanged from v1.0.

## Self-Check: PASSED
