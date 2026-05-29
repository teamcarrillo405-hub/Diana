---
phase: 08-provider-wiring-scorer-interleaving-intentions-evening-trigger
verified: 2026-05-29T21:05:58Z
status: passed
score: 16/16 must-haves verified
re_verification: false
---

# Phase 8: Provider Wiring / Scorer Interleaving / Evening Planning Verification Report

**Phase Goal:** Wire STT (Whisper via OpenAI API) and TTS (OpenAI TTS) providers for F4/F6/F8; add last_shown_at interleaving de-promotion to rankAssignments scorer; wire 6 PM evening planning surface for event-based implementation intentions (F14).
**Verified:** 2026-05-29T21:05:58Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | STT Edge Function calls OpenAI Whisper at `v1/audio/transcriptions` | VERIFIED | `supabase/functions/transcribe-voice/index.ts` line 56 — hard-coded URL `https://api.openai.com/v1/audio/transcriptions` |
| 2 | TTS Edge Function calls OpenAI TTS at `v1/audio/speech` | VERIFIED | `supabase/functions/tts-generate/index.ts` line 33 — hard-coded URL `https://api.openai.com/v1/audio/speech` |
| 3 | Migration adds `tts_provider` column to profiles with constraint | VERIFIED | `supabase/migrations/0014_tts_provider.sql` — `ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'browser'` with `CHECK (tts_provider IN ('browser', 'openai'))` |
| 4 | VoiceTextarea accepts `provider` prop and routes to `transcribe-voice` Edge Function for `openai` | VERIFIED | `components/voice-textarea.tsx` lines 28–34 accept `provider?: "browser" \| "openai"`, lines 115–118 invoke `transcribe-voice` via `supabase.functions.invoke` |
| 5 | TtsButton accepts `provider` prop and calls `tts-generate` for `openai` | VERIFIED | `components/tts-button.tsx` lines 21–26 accept `provider?: "browser" \| "openai"`, lines 52–108 implement OpenAI path calling `tts-generate` |
| 6 | TtsHighlightButton accepts `provider` prop and calls `tts-generate` for `openai` | VERIFIED | `components/tts-highlight-button.tsx` lines 16–20 accept `provider?: "browser" \| "openai"`, lines 30–156 implement OpenAI TTS path |
| 7 | `lib/ai/safety.ts` `LogParams.feature` union includes `stt_transcribe` and `tts_generate` | VERIFIED | Lines 15–19: union contains `"stt_transcribe"` and `"tts_generate"` |
| 8 | `rankAssignments` accepts `lastShownClassId` parameter | VERIFIED | `lib/scoring/next-five-minutes.ts` line 65: `lastShownClassId: string \| null = null` as 6th parameter |
| 9 | `INTERLEAVE_PENALTY = 15` constant exists in scorer | VERIFIED | Line 46: `const INTERLEAVE_PENALTY = 15` |
| 10 | Dashboard `actions.ts` exports `setLastShownClass` | VERIFIED | `app/(app)/dashboard/actions.ts` lines 21–31: `export async function setLastShownClass(classId: string)` with UUID validation and 12-hour cookie |
| 11 | Interleaving test cases cover INTERLEAVE-01 through INTERLEAVE-04 | VERIFIED | `lib/scoring/next-five-minutes.test.ts` lines 116–164: four named tests (INTERLEAVE-01 thru INTERLEAVE-04) |
| 12 | Scorer tests pass (10 tests) | VERIFIED | `npx vitest run lib/scoring/next-five-minutes.test.ts` — 10 passed |
| 13 | `evening-planning.tsx` exists with hours 17–20 time gate | VERIFIED | `app/(app)/dashboard/evening-planning.tsx` line 24: `setShow(h >= 17 && h < 20)` |
| 14 | `actions.ts` exports `getEventIntentions` and `markIntentionFired` | VERIFIED | Lines 49–75 (`getEventIntentions`) and 83–103 (`markIntentionFired`), both query `assignment_intentions` table |
| 15 | Dashboard page imports and renders `EveningPlanning` | VERIFIED | `app/(app)/dashboard/page.tsx` line 18 imports `EveningPlanning`, line 75 calls `getEventIntentions()`, line 119 renders `<EveningPlanning intentions={eveningIntentions} />` |
| 16 | Evening planning tests pass (3 tests: EVENING-01 thru EVENING-03) | VERIFIED | `npx vitest run --reporter=verbose` — all 3 EVENING tests passed |

**Score:** 16/16 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/functions/transcribe-voice/index.ts` | Whisper STT Edge Function | VERIFIED | 88 lines, real FormData + Supabase Storage download + OpenAI call, returns `{ ok, text }` |
| `supabase/functions/tts-generate/index.ts` | OpenAI TTS Edge Function | VERIFIED | 71 lines, 4000-char cap, streams `audio/mpeg` binary response directly |
| `supabase/migrations/0014_tts_provider.sql` | tts_provider column migration | VERIFIED | Adds column with `DEFAULT 'browser'` and `CHECK` constraint, idempotent `IF NOT EXISTS` guards |
| `components/voice-textarea.tsx` | VoiceTextarea with dual provider | VERIFIED | 182 lines, browser (Web Speech API) and openai (MediaRecorder + storage upload + transcribe-voice invoke) paths both implemented |
| `components/tts-button.tsx` | TtsButton with dual provider | VERIFIED | 157 lines, both browser (`speechSynthesis`) and openai (fetch + Audio element) paths fully wired |
| `components/tts-highlight-button.tsx` | TTS with word-highlight + openai fallback | VERIFIED | 260 lines, openai path confirmed at lines 30–156, browser path with `useTtsHighlight` at lines 158–259 |
| `lib/ai/safety.ts` | Feature union additions | VERIFIED | Feature union at lines 12–22 includes `stt_transcribe` and `tts_generate` |
| `lib/scoring/next-five-minutes.ts` | Interleaving de-promotion | VERIFIED | `INTERLEAVE_PENALTY = 15` (line 46), `lastShownClassId` param (line 65), penalty block (lines 76–88) with urgency guard |
| `app/(app)/dashboard/actions.ts` | setLastShownClass + getEventIntentions + markIntentionFired | VERIFIED | All three Server Actions present; cookie-based interleave, DB-backed intentions |
| `lib/scoring/next-five-minutes.test.ts` | Interleaving test cases | VERIFIED | INTERLEAVE-01 thru INTERLEAVE-04 added at lines 116–164 alongside existing GAP-08 tests (10 total) |
| `app/(app)/dashboard/evening-planning.tsx` | EveningPlanning component with time gate | VERIFIED | 75 lines, useEffect time gate (17–20), optimistic dismiss, calm copy ("Your evening plan", "Mark done") |
| `app/(app)/dashboard/evening-planning.test.tsx` | Evening planning tests | VERIFIED | 3 tests (EVENING-01 thru EVENING-03) using fake timers to test time-gate behavior |
| `app/(app)/dashboard/page.tsx` | Dashboard wired to all new features | VERIFIED | Imports `setLastShownClass`, `getEventIntentions`, `EveningPlanning`; passes `lastShownClassId` to scorer; renders `EveningPlanning` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `voice-textarea.tsx` | `transcribe-voice` Edge Function | `supabase.functions.invoke("transcribe-voice", …)` | WIRED | Line 116; response `data.text` used in `onTranscript` callback (line 122) |
| `tts-button.tsx` | `tts-generate` Edge Function | `fetch(${supabaseUrl}/functions/v1/tts-generate, …)` | WIRED | Lines 72–80; blob response played via `Audio` element (lines 91–103) |
| `tts-highlight-button.tsx` | `tts-generate` Edge Function | `fetch(${supabaseUrl}/functions/v1/tts-generate, …)` | WIRED | Lines 39–46; blob response played via `Audio` element (lines 55–69) |
| `dashboard/page.tsx` | `rankAssignments` | `lastShownClassId` cookie → scorer param | WIRED | Lines 32–33 read cookie, line 74 passes to `rankAssignments` |
| `dashboard/page.tsx` | `setLastShownClass` | fire-and-forget after top assignment identified | WIRED | Lines 78–81: `void setLastShownClass(top.class_id)` |
| `dashboard/page.tsx` | `getEventIntentions` | awaited server action, result passed as prop | WIRED | Line 75 fetches, line 119 renders `<EveningPlanning intentions={eveningIntentions} />` |
| `evening-planning.tsx` | `markIntentionFired` | optimistic dismiss + background server call | WIRED | Lines 41–43: `await markIntentionFired({ intentionId: id })` inside `handleDismiss` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `evening-planning.tsx` | `intentions` prop | `getEventIntentions()` in `page.tsx` | Yes — queries `assignment_intentions` with `.eq("cue_type","event").is("fired_at",null)` | FLOWING |
| `dashboard/page.tsx` (ranked list) | `ranked` | `rankAssignments(assignments, recentSignals, …, lastShownClassId)` | Yes — `assignments` from Supabase `.from("assignments").select(…)`, `recentSignals` from `task_signals` | FLOWING |
| `dashboard/page.tsx` (TtsButton) | `provider` prop | `profile.tts_provider` from `loadProfile()` | Yes — profile row read from DB via `loadProfile()` | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Scorer interleaving tests (10 tests) | `npx vitest run lib/scoring/next-five-minutes.test.ts` | 10 passed, 0 failed | PASS |
| Evening planning tests (3 tests) | Full suite with `--reporter=verbose`, grep EVENING | EVENING-01, EVENING-02, EVENING-03 all passed | PASS |
| TypeScript: no type errors | `npm run typecheck` | Exit 0, no errors | PASS |
| Tone audit: no blocking violations | `npm run tone-audit` | Exit 0, 2 non-blocking warnings in `lib/features.ts` and `README.md` (pre-existing) | PASS |

---

### Requirements Coverage

No requirement IDs were declared in phase 8 plan frontmatter (TBD in roadmap, per task brief). Feature coverage mapped to plan goals:

| Feature | Delivered By | Status |
|---------|-------------|--------|
| F4/F6/F8 — STT Whisper provider wiring | `transcribe-voice` Edge Function + `VoiceTextarea` openai path | SATISFIED |
| F4/F6/F8 — TTS OpenAI provider wiring | `tts-generate` Edge Function + `TtsButton` / `TtsHighlightButton` openai paths | SATISFIED |
| F8 — `tts_provider` column on profiles | `0014_tts_provider.sql` migration | SATISFIED |
| Scorer interleaving de-promotion | `INTERLEAVE_PENALTY` in `rankAssignments` + `setLastShownClass` cookie mechanism | SATISFIED |
| F14 — Evening planning surface (6 PM) | `EveningPlanning` component + `getEventIntentions` / `markIntentionFired` actions | SATISFIED |

---

### Anti-Patterns Found

None blocking. Tone audit flagged 2 non-blocking warnings in `lib/features.ts` and `README.md` (word "deadline" — pre-existing, not introduced in phase 8). No TODOs, placeholders, or empty implementations found in any phase 8 files.

---

### Human Verification Required

#### 1. OpenAI TTS Binary Streaming

**Test:** In the app with `tts_provider = 'openai'` set on the profile, open the dashboard and click "Read aloud" on the top assignment.
**Expected:** Audio plays without errors; playback stops cleanly via Stop button.
**Why human:** `tts-generate` returns a raw binary stream; automated tests can't exercise the audio pipeline without a running Supabase stack and OpenAI API key.

#### 2. Whisper Transcription End-to-End

**Test:** In a Chromium browser with `tts_provider = 'openai'`, open any assignment and use the mic button in a VoiceTextarea. Record a sentence and stop.
**Expected:** Transcript appears in the textarea after a brief "Transcribing..." state.
**Why human:** Requires a live MediaRecorder, Supabase Storage bucket `note-audio`, and valid `OPENAI_API_KEY` secret — not testable without a live deployment.

#### 3. Evening Planning Time Gate (Live Browser)

**Test:** Set system clock to 18:00, sign in to the app with unfired event-based intentions, navigate to the dashboard.
**Expected:** "Your evening plan" section appears listing intention cues. Clicking "Mark done" dismisses the item immediately (optimistic) and it does not reappear on next page load.
**Why human:** The component uses `new Date().getHours()` which can't be faked in a real browser without dev tools; Supabase DB write for `fired_at` requires live credentials.

---

### Gaps Summary

No gaps. All 16 must-haves verified across the three sub-phases (08-01 provider wiring, 08-02 scorer interleaving, 08-03 evening planning). All tests pass (13 total: 10 scorer + 3 evening planning). TypeScript and tone-audit both exit 0.

---

_Verified: 2026-05-29T21:05:58Z_
_Verifier: Claude (gsd-verifier)_
