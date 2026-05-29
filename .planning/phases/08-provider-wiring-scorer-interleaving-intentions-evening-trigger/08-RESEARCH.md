# Phase 8: Provider Wiring + Scorer Interleaving + Intentions Evening Trigger — Research

**Researched:** 2026-05-29
**Domain:** External provider integration (OpenAI Whisper/TTS), pure-function scorer extension, UI surface trigger
**Confidence:** HIGH (all three areas grounded in current codebase + existing architecture patterns)

---

## Summary

Phase 8 has three independent sub-problems. They share zero code dependencies and can be planned and executed in parallel.

**Gap 1 — Provider wiring (F4/F6/F8):** The existing UI and architecture are largely complete. `VoiceTextarea` uses the browser Web Speech API (no server). `TtsButton` / `TtsHighlightButton` use browser `speechSynthesis`. `transcribe-note` calls Claude for note outline — it does not transcribe audio. The "provider wiring" task is to add server-side Whisper STT (for higher-quality dictation in F4 voice capture and F8 audio notes), OpenAI TTS (for higher-quality voice in F6), and Claude vision OCR (already partially wired in `classify-inbox` for photo captures). All three live in new or updated Supabase Edge Functions. The existing browser-based fallbacks continue to work for users who don't trigger the server path.

**Gap 2 — Scorer interleaving:** `rankAssignments` in `lib/scoring/next-five-minutes.ts` already picks `class_id` from each assignment but never uses it. The `last_shown_at` de-promotion factor does not exist anywhere — no DB column, no scorer logic, no dashboard tracking. The research finding (g=0.42 interleaving effect) calls for a penalty function that discounts assignments from the same `class_id` if one from that class was already the top result recently. The cleanest implementation is a pure in-memory approach: after sorting, scan the top N, apply a de-promotion penalty to the second assignment if it shares a `class_id` with the top. No DB column needed for the basic version; an optional `scorer_state` localStorage value or a new `scorer_shown_at` field in `task_signals` could track across sessions.

**Gap 3 — Evening planning surface (F14):** The `assignment_intentions` table exists and is populated via `IntentionPrompt`. The spec (features.md §F14) explicitly says: "For event-based cues (after dinner), Diana surfaces it during a daily ~6 PM evening planning home-screen prompt." This is a purely client-side UI addition to the dashboard page: detect local time 17:00–20:00, query `assignment_intentions` where `cue_type = 'event'` and `fired_at IS NULL`, and render a dismissible evening section. Setting `fired_at` marks it as shown. No push notification, no cron — just time-gated client-side UI.

**Primary recommendation:** Implement all three gaps as three separate plans (08-01 provider wiring, 08-02 scorer interleaving, 08-03 evening intentions surface). They have no shared state and can ship in any order.

---

<user_constraints>
## User Constraints

### Locked Decisions (from STATE.md open decisions, now resolved by phase scope)
- **STT provider:** Whisper (via OpenAI API) — confirmed in phase description
- **TTS provider:** OpenAI TTS — confirmed in phase description
- **OCR provider:** Claude vision — confirmed in phase description (already partially wired in classify-inbox)
- **All Claude API calls via Supabase Edge Functions only** — never browser-direct, never Next.js server actions calling Anthropic
- **Model selection:** Haiku 4.5 for cheap/fast ops; Sonnet 4.6 for quality ops
- **Calm invariant:** No red, no shame/scolding words, no streak language. tone-audit enforced.

### Claude's Discretion
- Whether to expose a Whisper fallback when the browser Web Speech API is available (either Whisper-always or Whisper-only-when-tts_enabled or Whisper-as-upgrade)
- Whether `last_shown_at` de-promotion is tracked in localStorage (ephemeral per session) or via a `task_signals` row (durable across sessions)
- Exact UI treatment for the evening planning section (card style, dismiss behavior)
- Whether to write a dedicated `stt-transcribe` Edge Function or extend `classify-inbox` to accept pre-uploaded audio

### Deferred Ideas (OUT OF SCOPE)
- Push notifications for time-based intentions (browser Notification API / service worker scheduling)
- Haiku-based intent parsing of "after dinner" into a time window
- Full-length audio recording in notes (F8 extended scope) — audio upload already wired, just no Whisper path
- ElevenLabs / Azure / Polly as TTS providers
- Deepgram / AssemblyAI as STT providers
- Math expression parser
- Rich text editor
- Email service for parent verification
</user_constraints>

---

## Current State: Codebase Audit

### Gap 1 — Provider State

**STT (F4 voice capture, F8 audio notes):**
- `components/voice-textarea.tsx` — uses `window.SpeechRecognition` / `window.webkitSpeechRecognition` (browser Web Speech API). Chromium + Safari only; silently hides mic on Firefox. No server call. No API key.
- `app/(app)/notes/new/note-editor.tsx` — uses `VoiceTextarea` for the "Voice" tab. Text is appended in real time.
- `app/(app)/notes/actions.ts` → `uploadNoteAudio` — uploads audio file to `note-audio` Supabase Storage bucket. Key is stored as `notes.audio_storage_key`. But there is NO Edge Function that fetches this audio key and calls Whisper. The transcript path goes directly into `body_text` via `VoiceTextarea` (browser STT).
- `app/(app)/quick-add/capture-form.tsx` — voice tab uses `VoiceTextarea`. Saved as `capture_mode='voice'` with the browser-STT transcript as `raw`.

**TTS (F6):**
- `components/tts-button.tsx` — `window.speechSynthesis`, browser-only, no server.
- `components/tts-highlight-button.tsx` — `useTtsHighlight` hook, `window.speechSynthesis`, browser-only.
- `lib/tts/tts-utils.ts` — pure functions for word-splitting, fallback timers, safe cancel. No external calls.
- No OpenAI TTS Edge Function exists. Features.md §F6 says "TTS uses a high-quality voice (OpenAI/ElevenLabs/Polly — provider choice deferred to architecture doc)".

**OCR (F4 photo capture, F8 photo notes):**
- `supabase/functions/classify-inbox/index.ts` — already passes `image` content block to Claude Haiku 4.5 via base64 when `photo_storage_key` is set. This IS the OCR path. It downloads from `inbox-photos` bucket and encodes.
- The `raw` field of a photo-mode `inbox_item` is set to the file name (line 72 of capture-form.tsx: `setRaw(file.name)`). The AI classify call provides the actual text extraction.
- **Conclusion: OCR is already wired.** The classify-inbox function reads the photo and extracts structured fields. No additional OCR Edge Function is needed for F4.

**What is missing:**
1. A `stt-transcribe` Edge Function (or extension of an existing one) that accepts an audio file URL from Storage, calls OpenAI Whisper `/v1/audio/transcriptions`, and returns the transcript text.
2. An `openai-tts` Edge Function that accepts text and returns audio (MP3/AAC stream) — or a client-callable action that proxies to OpenAI TTS, so audio can be played with synced highlighting.
3. Wiring from `NoteEditor` to trigger Whisper transcription of recorded audio (post-upload) rather than relying solely on browser STT.
4. Wiring from `CaptureForm` voice tab to optionally use Whisper for higher accuracy.
5. TTS for F6 reading panel — current `TtsHighlightButton` uses browser synthesis. An OpenAI TTS upgrade would deliver higher voice quality. The sync highlighting would still use word-boundary events from the audio element's `timeupdate`, not `SpeechSynthesisEvent.boundary` (different integration model).

### Gap 2 — Scorer Interleaving State

**What exists:**
- `rankAssignments` in `lib/scoring/next-five-minutes.ts` — sorts by score. `class_id` is in the `Assignment` type already. No de-promotion logic.
- No `last_shown_at` DB column anywhere (confirmed: searched all migrations 0001–0013).
- No `scorer_state` in localStorage (confirmed: no references in codebase).
- Dashboard `page.tsx` calls `rankAssignments`, picks `top = ranked[0]` and `rest = ranked.slice(1, 4)`. No interleaving.

**What is needed:**
- A `lastShownClassId` tracking mechanism so the scorer knows which class was last at position 0.
- A de-promotion penalty applied when an assignment's `class_id` matches the recently-promoted one.
- The g=0.42 interleaving effect (from cognitive science research on spaced interleaving) justifies this: showing the same subject consecutively reduces consolidation relative to varied subjects.

**Implementation options:**
1. **In-memory per render (pure function, no persistence):** Pass a `lastShownClassId: string | null` parameter to `rankAssignments`. After sorting, if `ranked[0].class_id === lastShownClassId`, demote it by subtracting a configurable penalty (e.g., -20) and re-sort. Pro: zero DB/localStorage changes. Con: resets on every page load — no cross-session memory.
2. **localStorage persistence:** Dashboard client component reads/writes `diana_last_shown_class_id` in localStorage. Passes it to the server via a search param or cookie. Server uses it in rankAssignments. Pro: persists across page loads within same browser. Con: requires a client component wrapper around the dashboard or a cookie-based approach.
3. **task_signals row:** Insert a `kind='shown'` signal when the top assignment is displayed. Dashboard query fetches the most recent `shown` signal to get `assignment_id`, then derives `class_id`. Pro: durable, cross-device. Con: inserts on every dashboard render — noisy.

**Recommendation (Claude's discretion):** Option 1 as the baseline (pure function parameter), with the dashboard passing a `lastShownClassId` from a cookie set by the EnergyPicker submission. This is the same pattern as `energy` (a search param / cookie). Alternatively, extend `RecentSignal` with an optional `class_id` field so the scorer can identify the most recently promoted class from existing signals.

**Scorer change is purely in `lib/scoring/next-five-minutes.ts`** — no DB migration required for the basic approach.

### Gap 3 — Evening Planning State

**What exists:**
- `assignment_intentions` table: `id, owner_id, assignment_id, cue_type (time|event|location|other), cue_text, scheduled_for, fired_at, created_at`
- `IntentionPrompt` component at `/assignments/[id]` — saves via `saveIntention` server action. Only for event type when created via `?intent=new`.
- `app/(app)/dashboard/page.tsx` — server component, no evening trigger. No query on `assignment_intentions`.
- No time-of-day detection on the dashboard.
- `fired_at` column exists in the table for tracking when a prompt was shown — never written.

**What is needed:**
- Dashboard page adds a query: `SELECT * FROM assignment_intentions WHERE owner_id = ? AND cue_type = 'event' AND fired_at IS NULL`.
- A new `EveningPlanningSection` client component that:
  - On mount, checks `new Date().getHours()` (local time via `Intl` or JS Date)
  - If between 17:00 and 20:00, renders the fetched unfired intentions
  - On dismiss per item, calls a `markIntentionFired(intentionId)` server action that sets `fired_at = now()`
  - On global dismiss, marks all shown intentions as fired
- The dashboard server component needs to pass intentions as a prop to this client component, or the client component fetches them itself on mount.

**Note on time-of-day detection:** The server component cannot know client local time. Two approaches:
1. Client component does the time check entirely in `useEffect` — render null until mounted, then check time and show/hide. This avoids server involvement for the time check.
2. Server renders the section always but passes intentions data; client hides it outside 17:00–20:00.

Approach 1 (client-only time gate) is simpler and avoids the server having to know the user's timezone (though `profiles.timezone` exists).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| OpenAI SDK (Deno/esm.sh) | via `https://esm.sh/openai@4` | Whisper + TTS API calls in Edge Functions | Official SDK, handles multipart form for Whisper |
| `@supabase/supabase-js` | ^2.106.2 (already installed) | Storage download in Edge Functions | Already used in all Edge Functions |
| Web Speech API (browser) | — | Fallback STT in VoiceTextarea | Already in place — no change |
| Web Speech Synthesis (browser) | — | Fallback TTS in TtsButton | Already in place — no change |

### Whisper API facts (OpenAI)
- Endpoint: `POST https://api.openai.com/v1/audio/transcriptions`
- Input: `multipart/form-data` with `file` (audio blob) + `model=whisper-1`
- Output: `{ text: string }` (or verbose JSON with segments/words)
- Audio formats: mp3, mp4, mpeg, mpga, m4a, wav, webm (browser MediaRecorder outputs webm by default)
- Max file size: 25 MB
- Cost: $0.006/minute (Whisper v2) — well within budget for student use
- Deno pattern: fetch the audio blob from Supabase Storage, create a `FormData`, set `file` field, POST to OpenAI

### OpenAI TTS API facts
- Endpoint: `POST https://api.openai.com/v1/audio/speech`
- Input: `{ model: "tts-1" | "tts-1-hd", input: string, voice: "alloy"|"echo"|"fable"|"onyx"|"nova"|"shimmer", response_format: "mp3"|"opus"|"aac"|"flac" }`
- Output: binary audio stream (not JSON)
- Max input: 4096 characters per request — need chunking for longer texts
- Cost: tts-1 = $0.015/1K chars; tts-1-hd = $0.030/1K chars
- Word-level timestamps: NOT available from OpenAI TTS 1/1-hd. Synced highlighting with OpenAI TTS requires either estimating word timing (same fallback timer approach already in `tts-utils.ts`) or switching to Word timestamps via `tts-1` with verbose mode — which doesn't exist. OpenAI TTS does not emit word boundary events like the browser Speech API.
- **Important implication:** Using OpenAI TTS for `TtsHighlightButton` means losing the `onboundary` event — the fallback timer approach in `scheduleFallbackTimers` already handles this case. No architecture change needed in `useTtsHighlight`; just swap the audio source.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `OPENAI_API_KEY` env var | — | Whisper + TTS auth in Edge Functions | Required in Supabase vault |
| Deno `FormData` + `fetch` | built-in | Whisper multipart upload | Deno native |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Whisper via OpenAI API | Deepgram / AssemblyAI | Whisper is simpler (single API key), lower cost, no streaming required for notes use case |
| OpenAI TTS | ElevenLabs | ElevenLabs has higher quality but more complex pricing; OpenAI TTS is already in vendor (same API key) |
| Claude vision for OCR | Google Cloud Vision | Claude vision is already wired in classify-inbox; no new vendor needed |
| In-memory interleaving | DB-backed `last_shown_at` | DB adds durability but is over-engineered for a scoring hint |

**Installation:** No new npm packages needed. Whisper and TTS are called from Deno Edge Functions using `fetch`. The `OPENAI_API_KEY` secret must be added to the Supabase project vault.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are:
```
supabase/functions/
├── stt-transcribe/         # NEW — Whisper Edge Function
│   └── index.ts
├── tts-speak/              # NEW — OpenAI TTS Edge Function (optional; see below)
│   └── index.ts
├── classify-inbox/         # EXISTING — OCR already wired, no changes needed
│   └── index.ts
lib/
└── scoring/
    └── next-five-minutes.ts  # MODIFY — add lastShownClassId parameter + penalty
app/(app)/dashboard/
├── page.tsx                  # MODIFY — pass intentions + lastShownClassId
├── evening-planning.tsx      # NEW — client component for F14 evening trigger
└── mark-intention-fired.ts   # NEW (or in existing actions) — server action
```

### Pattern 1: Whisper Edge Function

**What:** Accept a `noteId` or `inboxItemId`, download audio from Storage, POST to OpenAI Whisper, return transcript text.

**When to use:** When the user has uploaded audio (notes F8) or wants high-accuracy voice transcription.

**Example (Deno Edge Function structure):**
```typescript
// supabase/functions/stt-transcribe/index.ts
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  const { noteId, audioStorageKey } = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: blob, error } = await supabase.storage
    .from("note-audio")
    .download(audioStorageKey);
  if (error || !blob) return errorResponse("Audio not found");

  const formData = new FormData();
  formData.append("file", new File([await blob.arrayBuffer()], "audio.webm", { type: blob.type }));
  formData.append("model", "whisper-1");

  const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  const { text } = await openaiRes.json();

  // Write transcript back to notes row
  await supabase.from("notes").update({ body_text: text }).eq("id", noteId);

  return new Response(JSON.stringify({ ok: true, transcript: text }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Pattern 2: Scorer Interleaving (pure function extension)

**What:** After sorting, if `ranked[0]` shares `class_id` with the most recently promoted class, subtract a penalty from its score and re-sort. The `lastShownClassId` is passed from the caller.

**When to use:** Dashboard calls `rankAssignments` on every render. The `lastShownClassId` is read from a cookie or localStorage-derived search param set when the student last saw the top card.

**Example:**
```typescript
// Extension to rankAssignments signature
export function rankAssignments(
  assignments: Assignment[],
  signals: RecentSignal[] = [],
  now: Date = new Date(),
  energy: EnergyLevel = "medium",
  profile: ScorerProfile = { diagnoses: [], extra_time_pct: 0 },
  lastShownClassId: string | null = null,   // NEW
): ScoredAssignment[] {
  const scored = assignments
    .filter(notDone)
    .map((a) => score(a, signals, now, energy, profile));

  if (lastShownClassId) {
    for (const s of scored) {
      if (s.class_id === lastShownClassId) {
        s.score -= INTERLEAVE_PENALTY;   // e.g. -15 (tunable)
        s.reasons.push("varied subject");
      }
    }
  }

  return scored.sort((x, y) => y.score - x.score);
}
```

**Persistence approach:** Dashboard server component reads a `diana_last_class` cookie (set by a Server Action when the student clicks "Start"). The `EnergyPicker` or `StartSessionButton` can set this cookie. Alternatively: a `lastClassParam` search param updated on click.

### Pattern 3: Evening Planning Section

**What:** Client component mounted in dashboard. On mount, checks local time. If 17:00–20:00 and there are unfired event-type intentions, renders a "Your evening plan" card.

**When to use:** Daily 6 PM evening planning window per F14 spec.

**Example:**
```typescript
// app/(app)/dashboard/evening-planning.tsx
"use client";
import { useEffect, useState } from "react";
import { markIntentionFired } from "./actions";

type Intention = { id: string; cue_text: string; assignment_title: string; assignment_id: string };

export function EveningPlanning({ intentions }: { intentions: Intention[] }) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const h = new Date().getHours();
    setShow(h >= 17 && h < 20);
  }, []);

  if (!show || intentions.length === 0) return null;

  const visible = intentions.filter(i => !dismissed.has(i.id));
  if (visible.length === 0) return null;

  async function dismiss(id: string) {
    await markIntentionFired({ intentionId: id });
    setDismissed(prev => new Set(prev).add(id));
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Your evening plan</h2>
      <ul className="space-y-2">
        {visible.map(i => (
          <li key={i.id} className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{i.assignment_title}</p>
              <p className="text-xs text-muted mt-0.5">{i.cue_text}</p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(i.id)}
              className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-border/30"
            >
              Done
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### Anti-Patterns to Avoid

- **Calling OpenAI TTS from Next.js server actions** — CLAUDE.md mandates all AI calls in Edge Functions only.
- **Calling Whisper from the browser** — API key exposure. Must proxy through Edge Function.
- **Using `window.SpeechRecognition` as the "Whisper" implementation** — these are two different things. Browser Web Speech API is free + browser-only. Whisper is server-side with API cost. Both should coexist: browser API for real-time dictation UI feedback, Whisper for post-upload high-accuracy transcription.
- **Blocking the TTS response on log writes** — same fire-and-forget pattern as all other Edge Functions.
- **Removing the browser TTS fallback** — `TtsButton` and `TtsHighlightButton` must remain. OpenAI TTS is an upgrade path, not a replacement. Users with `tts_enabled = false` get browser TTS; `tts_enabled = true` users could get the OpenAI path.
- **Applying interleave penalty before signal bump** — the penalty should apply after all scoring, as a final post-processing step, so it can be a clean demote without corrupting signal-based momentum.
- **Rendering the evening section server-side with a hardcoded time** — server time (UTC) will not match client local time. Must use `useEffect` to check `new Date().getHours()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Whisper multipart upload | Custom FormData encoding | `new FormData()` + `File` in Deno | Deno's built-in FormData handles binary correctly |
| Audio chunking for TTS | Manual text splitting | Split at sentence boundaries (~3500 chars) | OpenAI TTS max is 4096 chars; sentence splitting prevents mid-word cuts |
| Word timing for OpenAI TTS highlighting | Building a WebVTT parser | Existing `scheduleFallbackTimers` from `lib/tts/tts-utils.ts` | Already battle-tested with the same estimator approach |
| Client timezone detection | Storing and querying UTC offsets | `new Date().getHours()` | JavaScript Date uses local system time automatically |

**Key insight:** For TTS highlighting with OpenAI audio, the existing `scheduleFallbackTimers` estimator (400ms/word at 1x) is already the correct approach. OpenAI TTS does not emit word boundary events, and the fallback timer technique was designed exactly for this scenario (Pitfall 1 in `use-tts-highlight.ts`).

---

## Schema Changes Needed

### Gap 1 (Provider Wiring)
- **No DB migration required.** `inbox_items.photo_storage_key`, `notes.audio_storage_key`, `notes.transcript_text`, `notes.body_text` already exist and are the correct fields.
- `OPENAI_API_KEY` must be added as a Supabase project secret (not a migration — manual step in Supabase dashboard > Edge Functions > Secrets).

### Gap 2 (Scorer Interleaving)
- **No DB migration required for the pure in-memory approach.**
- If cross-session persistence is chosen via `task_signals`, a new `kind='shown'` value would need to be added to the check constraint: `check (kind in ('energy','completed','dismissed','started','context_switch','shown'))` — this would require migration 0014.
- **Recommendation:** Use a cookie-based approach for `lastShownClassId` (no migration needed). A `diana_last_class` cookie set as a `HttpOnly: false, SameSite: Lax` cookie via a Server Action when the student clicks "Start" is sufficient.

### Gap 3 (Evening Planning)
- **No DB migration required.** `assignment_intentions.fired_at` already exists (migration 0009). The `markIntentionFired` server action just needs to `UPDATE assignment_intentions SET fired_at = now() WHERE id = ?`.
- The dashboard query needs to `JOIN assignments` to get `title` for display — this is a straightforward Supabase `.select()` with a foreign key expand.

---

## Files That Will Need Modification

### Gap 1 — Provider Wiring
| File | Change |
|------|--------|
| `supabase/functions/stt-transcribe/index.ts` | NEW — Whisper Edge Function |
| `supabase/functions/tts-speak/index.ts` | NEW — OpenAI TTS Edge Function (optional, see note) |
| `app/(app)/notes/new/note-editor.tsx` | Add audio recording UI + trigger `stt-transcribe` after upload |
| `app/(app)/quick-add/capture-form.tsx` | Optionally upgrade voice tab to use Whisper (post-record) |
| `supabase/functions/_shared/safety.ts` | Add `"stt_transcribe"` to `LogParams.feature` union |
| `lib/ai/safety.ts` | Same — keep mirrors in sync |

**Note on TTS Edge Function:** OpenAI TTS audio is binary (MP3). The Edge Function must return a `Response` with `Content-Type: audio/mpeg` and the binary body. The client component fetches this URL, creates an `Audio` element, and plays it — replacing the `speechSynthesis.speak(utter)` call. This is a larger refactor of `TtsHighlightButton` and `useTtsHighlight`. It may be scoped as an optional upgrade in 08-01 rather than a full replacement.

### Gap 2 — Scorer Interleaving
| File | Change |
|------|--------|
| `lib/scoring/next-five-minutes.ts` | Add `lastShownClassId` parameter + post-sort de-promotion |
| `lib/scoring/next-five-minutes.test.ts` | Add 2 tests: interleave penalty fires / doesn't fire |
| `app/(app)/dashboard/page.tsx` | Pass `lastShownClassId` from cookie to `rankAssignments` |
| `app/(app)/dashboard/start-session-button.tsx` | Set `diana_last_class` cookie on click (or use a new action) |

### Gap 3 — Evening Planning
| File | Change |
|------|--------|
| `app/(app)/dashboard/page.tsx` | Add `assignment_intentions` query, pass data to EveningPlanning |
| `app/(app)/dashboard/evening-planning.tsx` | NEW — client component |
| `app/(app)/dashboard/actions.ts` (new file) OR `app/(app)/assignments/[id]/actions.ts` | Add `markIntentionFired` server action |

---

## Common Pitfalls

### Pitfall 1: Whisper audio format mismatch
**What goes wrong:** Browser `MediaRecorder` defaults to `audio/webm;codecs=opus` on Chrome, `audio/mp4` on Safari. Whisper accepts both, but the `Content-Type` header in the FormData `File` must be correct.
**Why it happens:** `blob.type` from Supabase Storage may be empty or generic.
**How to avoid:** Always set `type: blob.type || "audio/webm"` when constructing the `File` for FormData. Add a fallback.
**Warning signs:** Whisper returns a 400 with "Invalid file format."

### Pitfall 2: OpenAI TTS 4096-char limit
**What goes wrong:** Reading panel texts can be thousands of words. A single TTS call over 4096 chars fails.
**Why it happens:** OpenAI hard limit on input length.
**How to avoid:** Split text at sentence boundaries before calling TTS. For the MVP, scope TTS to short texts only (assignment titles, description, 1–2 paragraphs). Full reading-panel TTS via OpenAI requires chunking + concatenation logic.
**Warning signs:** OpenAI returns 400 "Input text too long."

### Pitfall 3: OPENAI_API_KEY not in Supabase secrets
**What goes wrong:** Edge Function deploys but returns 401 from OpenAI.
**Why it happens:** The secret must be added manually in the Supabase dashboard (or via CLI `supabase secrets set`). It is NOT in `.env.local`.
**How to avoid:** Include a Wave 0 checklist item: "Add OPENAI_API_KEY to Supabase Edge Function secrets."
**Warning signs:** `openaiRes.status === 401` in Edge Function logs.

### Pitfall 4: Dashboard server component can't read client local time
**What goes wrong:** Evening section appears at the wrong time or always shows.
**Why it happens:** Next.js server components execute in UTC. `new Date().getHours()` in a server component returns UTC hour.
**How to avoid:** The `EveningPlanning` client component must gate on time in `useEffect` — never in the server component. Server component only fetches data; client component decides whether to render.
**Warning signs:** Evening section shows at 1 AM local time for a UTC+5 user.

### Pitfall 5: Intention query returns stale fired items
**What goes wrong:** Evening planning shows intentions already acted on.
**Why it happens:** `fired_at` is null until `markIntentionFired` is called. But if the server action fails silently, `fired_at` never updates.
**How to avoid:** Optimistic local dismiss (via `dismissed` Set in component state) + background server action. Even if the server call fails, the UI looks correct for the session. The item will re-appear next session.
**Warning signs:** Same intention shows every evening.

### Pitfall 6: Interleaving penalty too large breaks urgency sorting
**What goes wrong:** An assignment due in 2 hours loses top position because it's from the same class as the last session.
**Why it happens:** The de-promotion penalty is applied unconditionally.
**How to avoid:** Only apply the penalty when the score difference between top two candidates is small (< 20 points) OR cap the penalty to never drop a "due now/today" assignment below a "due in 3 days" one. Alternatively, skip the penalty if the top assignment has a `due now` reason.
**Warning signs:** User reports urgent assignments disappearing from top position.

### Pitfall 7: tone-audit will flag evening section copy
**What goes wrong:** New UI copy might accidentally use banned words.
**Why it happens:** `npm run tone-audit` exits 1 on any match.
**How to avoid:** Run `npm run tone-audit` after writing any new UI copy. The evening section copy should use neutral language: "Your evening plan" / "When you're ready" not "You need to start" / "You said you would."
**Warning signs:** CI fails on tone-audit step.

---

## Code Examples

### Whisper call in Deno Edge Function
```typescript
// Source: OpenAI API docs + existing classify-inbox pattern
const audioBlob = await supabaseStorageBlob; // from supabase.storage.from("note-audio").download()
const formData = new FormData();
formData.append(
  "file",
  new File([await audioBlob.arrayBuffer()], "audio.webm", {
    type: audioBlob.type || "audio/webm",
  }),
);
formData.append("model", "whisper-1");

const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
  method: "POST",
  headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  body: formData,
});
const { text } = await res.json() as { text: string };
```

### OpenAI TTS call in Deno Edge Function
```typescript
// Source: OpenAI API docs
const res = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "tts-1",
    input: text.slice(0, 4000),   // hard cap; caller should pre-chunk
    voice: "nova",                // softer, suitable for teen audience
    response_format: "mp3",
  }),
});

// Return binary stream directly
return new Response(res.body, {
  headers: {
    "Content-Type": "audio/mpeg",
    "Access-Control-Allow-Origin": "*",
  },
});
```

### Scorer interleaving de-promotion
```typescript
// Addition to lib/scoring/next-five-minutes.ts
const INTERLEAVE_PENALTY = 15; // tunable; ~15 feels right given max score ~100

// After mapping + before final sort:
if (lastShownClassId) {
  for (const s of scored) {
    if (s.class_id === lastShownClassId) {
      // Don't demote if "due now" — urgency wins
      const hasDueNow = s.reasons.includes("due now");
      if (!hasDueNow) {
        s.score = Math.max(0, s.score - INTERLEAVE_PENALTY);
        // Do NOT add a "varied subject" reason — silent de-promotion
      }
    }
  }
}
```

### markIntentionFired server action
```typescript
// app/(app)/dashboard/actions.ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const Input = z.object({ intentionId: z.string().uuid() });

export async function markIntentionFired(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("assignment_intentions")
    .update({ fired_at: new Date().toISOString() })
    .eq("id", parsed.data.intentionId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { ok: true };
}
```

### Dashboard intentions query (addition to dashboard/page.tsx)
```typescript
// In dashboard server component
const { data: eveningIntentions } = await supabase
  .from("assignment_intentions")
  .select("id, cue_text, cue_type, assignment_id, assignments(title)")
  .eq("owner_id", profile?.user_id ?? "")
  .eq("cue_type", "event")
  .is("fired_at", null)
  .order("created_at", { ascending: true });
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/scoring/next-five-minutes.test.ts` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTERLEAVE-01 | Interleave penalty applied when lastShownClassId matches | unit | `npx vitest run lib/scoring/next-five-minutes.test.ts` | ✅ (extend existing) |
| INTERLEAVE-02 | Penalty NOT applied to "due now" assignment | unit | `npx vitest run lib/scoring/next-five-minutes.test.ts` | ✅ (extend existing) |
| INTERLEAVE-03 | Penalty NOT applied when lastShownClassId is null | unit | `npx vitest run lib/scoring/next-five-minutes.test.ts` | ✅ (extend existing) |
| STT-01 | stt-transcribe Edge Function returns transcript from audio | manual smoke | Manual: POST to deployed function with test audio | ❌ Wave 0 (Deno, no Vitest) |
| TTS-01 | tts-speak Edge Function returns audio/mpeg binary | manual smoke | Manual: curl deployed function | ❌ Wave 0 (Deno, no Vitest) |
| EVENING-01 | Evening section not shown outside 17:00–20:00 | unit (jsdom) | `npx vitest run app/(app)/dashboard/evening-planning.test.tsx` | ❌ Wave 0 |
| EVENING-02 | Evening section shows with unfired event intentions | unit (jsdom) | `npx vitest run app/(app)/dashboard/evening-planning.test.tsx` | ❌ Wave 0 |
| EVENING-03 | markIntentionFired sets fired_at (integration) | manual smoke | Manual: verify DB row via Supabase dashboard | ❌ manual-only |

**Note on Edge Function testing:** Deno Edge Functions cannot be unit-tested with Vitest (Node runtime). They are manual smoke-tested after deployment. This is consistent with all prior phases (classify-inbox, transcribe-note, etc. have no Vitest tests).

**Note on component testing:** The `EveningPlanning` component gates on `new Date().getHours()`. Vitest jsdom tests can mock `Date` using `vi.useFakeTimers()` to test both inside and outside the 17:00–20:00 window.

### Sampling Rate
- **Per task commit:** `npm run test:run` (92 tests pass baseline, add 3–5 new scorer tests)
- **Per wave merge:** `npm run test:run && npm run typecheck && npm run tone-audit`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `app/(app)/dashboard/evening-planning.test.tsx` — covers EVENING-01 and EVENING-02 (needs `@vitest-environment jsdom`, mock Date)
- [ ] `lib/scoring/next-five-minutes.test.ts` additions — covers INTERLEAVE-01/02/03 (extend existing describe block)
- [ ] Manual smoke test checklist for Edge Functions (stt-transcribe, optionally tts-speak)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OPENAI_API_KEY | Whisper + TTS Edge Functions | Must verify | — | None — must add to Supabase secrets |
| Supabase `note-audio` bucket | stt-transcribe | Must verify | — | Already created in Phase 5 per STATE.md |
| Supabase `inbox-photos` bucket | classify-inbox OCR | Must verify | — | Already created in Phase 3 per STATE.md |
| Node.js / npm | Tests, build | ✓ | inferred from existing tests | — |
| Supabase CLI | Migrations | Must verify | — | Manual SQL in Supabase dashboard |

**Missing dependencies with no fallback:**
- `OPENAI_API_KEY` in Supabase project secrets — must be added manually before deploying stt-transcribe or tts-speak. **Wave 0 prerequisite.**

**Missing dependencies with fallback:**
- Browser Web Speech API remains the fallback for all STT/TTS use cases if OpenAI API is unavailable or budget exhausted.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser Web Speech API (STT) | Add Whisper as server-side upgrade path | Phase 8 | Higher accuracy, language support, no browser compatibility issues |
| Browser speechSynthesis (TTS) | Add OpenAI TTS as server-side upgrade path | Phase 8 | Better voice quality; same word-timing fallback technique |
| No subject rotation in scorer | Interleaving de-promotion (g=0.42) | Phase 8 | Evidence-backed study effectiveness improvement |
| intentions captured but not triggered | Evening 6 PM surface completes F14 spec | Phase 8 | Completes the implementation-intention loop |

**Deprecated/outdated:**
- Nothing is removed. Browser APIs remain as fallbacks. The "open decisions" in STATE.md for STT/TTS providers are now resolved.

---

## Open Questions

1. **Should OpenAI TTS replace browser synthesis in `useTtsHighlight` or be a separate code path?**
   - What we know: browser synthesis is free, works offline, has native boundary events on Chromium. OpenAI TTS has better voice quality but costs money, requires a network round-trip, and doesn't have word boundary events.
   - What's unclear: whether the quality difference matters enough to pay per-character for a student who reads aloud frequently.
   - Recommendation: Make it opt-in via a profile setting (e.g., `tts_provider: 'browser' | 'openai'`) or gate it behind `tts_enabled = true`. Phase 8 can ship the Edge Function and a feature flag; full UI replacement is a follow-up.

2. **How should `lastShownClassId` be persisted across page loads?**
   - What we know: cookies are readable in server components; localStorage is client-only.
   - What's unclear: whether cookie-based approach adds complexity to the Next.js App Router server/client boundary.
   - Recommendation: Use a cookie (`diana_last_class`) set by a Server Action (no JS, works with App Router). `cookies().set()` in Next.js 15 can be called from Server Actions.

3. **Should the evening window be configurable (not hardcoded to 17:00–20:00)?**
   - What we know: the spec says "~6 PM" with no configurability requirement.
   - What's unclear: whether students in different timezones or with different schedules would want a different window.
   - Recommendation: Hardcode 17:00–20:00 for v1. The `profiles.timezone` column exists for future personalization.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `lib/scoring/next-five-minutes.ts` — confirmed `class_id` present, no interleaving
- Direct codebase read: `supabase/migrations/0009_inbox_and_time_layer.sql` — confirmed `assignment_intentions` schema with `fired_at`
- Direct codebase read: `supabase/functions/classify-inbox/index.ts` — confirmed Claude vision OCR already wired
- Direct codebase read: `components/voice-textarea.tsx`, `components/tts-button.tsx` — confirmed browser-only TTS/STT
- Direct codebase read: `app/(app)/notes/actions.ts` — confirmed `uploadNoteAudio` exists, no Whisper call
- Direct codebase read: `app/(app)/dashboard/page.tsx` — confirmed no evening intentions query
- Direct codebase read: `docs/spec/features.md §F14` — confirmed "6 PM evening planning home-screen prompt"
- OpenAI API docs (current): Whisper endpoint, TTS endpoint, formats, limits

### Secondary (MEDIUM confidence)
- `g=0.42` interleaving effect: from cognitive science research on interleaved practice (Rohrer & Taylor, 2007; Kornell & Bjork, 2008) — well-established finding, consistent across studies
- OpenAI TTS word-boundary limitation: confirmed by absence of any `word_timestamps` parameter in TTS API (as of 2025) and OpenAI docs stating word timing is not available for TTS 1/1-hd

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all library choices grounded in existing codebase patterns + official API docs
- Architecture: HIGH — extends established patterns from Phases 3/4/5/6
- Pitfalls: HIGH — several confirmed by direct code audit (timezone issue, 4096-char limit, OPENAI_API_KEY requirement)
- Interleaving penalty value (15): MEDIUM — tunable constant, research suggests meaningful penalty but exact value is heuristic

**Research date:** 2026-05-29
**Valid until:** 2026-06-29 (APIs stable; scorer logic timeless)

---

## RESEARCH COMPLETE
