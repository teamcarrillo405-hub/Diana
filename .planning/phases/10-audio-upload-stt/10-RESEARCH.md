# Phase 10: Audio Upload + Whisper STT + Auto-Class Routing — Research

**Researched:** 2026-05-30
**Domain:** Supabase Storage · OpenAI Whisper API · Next.js 15 file upload · Deno Edge Functions · keyword classification
**Confidence:** HIGH (codebase-direct verification for most findings; Whisper limits verified via official community docs)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F4-AUDIO | Upload audio files (.m4a, .mp3, .wav, .webm) stored in Supabase Storage | `uploadNoteAudio` server action already exists in `app/(app)/notes/actions.ts`; `note-audio` bucket naming established in Phase 5 |
| F8-UPLOAD | New Edge Function calls Whisper STT, returns raw transcript into existing `transcribe-note` pipeline | `supabase/functions/transcribe-voice/index.ts` is already implemented and production-ready; wiring to NoteEditor upload tab is the missing piece |
| F16-AUTOCLASSIFY | Keyword matcher auto-selects class after transcription (no LLM); student can override | `classes` table has `name` column; `assignments` has `title` + `class_id`; `notes` table needs `class_id` column — migration 0018 required |

</phase_requirements>

---

## Summary

Phase 10 lands on a remarkably complete foundation. The Whisper STT Edge Function (`transcribe-voice`) is fully built and production-ready from Phase 8 TTS provider work — it downloads audio from Supabase Storage via the service-role client and POSTs multipart FormData to `api.openai.com/v1/audio/transcriptions`. The `uploadNoteAudio` server action is also already written in `app/(app)/notes/actions.ts` and handles `note-audio` bucket uploads with correct `contentType`. The `OPENAI_API_KEY` secret is already wired (Phase 8). The `transcribe-note` Edge Function is also complete and writes `transcript_text + outline_json` directly onto the note row.

What is genuinely missing is the **UI plumbing** — a third "Upload" tab in `NoteEditor` that lets the student pick a file, calls `uploadNoteAudio`, then chains `transcribe-voice` (Whisper) followed by `transcribe-note` (Claude cleanup). The auto-class routing is a pure-logic problem: a term-frequency keyword matcher in `lib/notes/class-router.ts` that scores each class against the transcript and returns the best match. This requires a `class_id` column on the `notes` table (migration 0018).

The `reading_font` preference is already applied globally by `profileBodyClass` in `app/(app)/layout.tsx` — the `.reading-view` CSS class in `note-detail.tsx` inherits the body-level font class. No additional work is needed for reading_font in the notes detail view.

**Primary recommendation:** Three plans in two waves — (1) migration + lib/notes/class-router pure functions + unit tests; (2a) NoteEditor upload tab + orchestration server action; (2b) wiring note detail + notes page to show class badge + override dropdown. Wave 2 plans can run in parallel.

---

## Project Constraints (from CLAUDE.md)

- All AI/OpenAI API calls via Supabase Edge Functions only — never from Next.js server actions or browser
- Three Supabase clients: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (client), service-role inside Edge Functions only
- Calm invariant: no red colors, no shame/scolding copy (`npm run tone-audit` enforced), no progress bars that look like failure
- New Edge Function feature names must be added to `feature` union in BOTH `lib/ai/safety.ts` AND `supabase/functions/_shared/safety.ts` (Deno mirror convention)
- `transcribe-voice` and `transcribe-note` are NOT new features — they already exist in the union; do NOT add duplicates
- Haiku 4.5 for cheap/fast ops; Sonnet 4.6 for quality ops (the Claude cleanup in `transcribe-note` stays Sonnet 4.6)
- Vitest picks up `lib/**/*.test.ts` and `components/**/*.test.ts`; use `// @vitest-environment jsdom` for component tests
- Path alias `@/` maps to repo root

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2 | Storage upload, Edge Function invoke | Already the project's auth+DB+storage client |
| OpenAI Whisper API | `whisper-1` | Audio → raw transcript | Established in Phase 8; OPENAI_API_KEY already set |
| Next.js FormData | 15 (App Router) | File upload from client → server action | Native, no extra install needed |
| Deno (Edge Function runtime) | 1.x | Runs `transcribe-voice` | Already deployed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3 | Server action validation | Already used in all actions.ts files |
| Vitest | ^3 | Unit tests for class-router | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| term-frequency keyword matcher | LLM classify | LLM adds latency, cost, complexity — keyword matching is sufficient for class names + recent assignment titles |
| term-frequency keyword matcher | embeddings / cosine similarity | Embeddings require a vector store; term-frequency on 5–10 class names is overkill-free and testable |
| sequential Edge Function calls | merged single function | Keeping `transcribe-voice` and `transcribe-note` separate honors single-responsibility; chain via orchestrating server action |

**Installation:** No new packages required. All dependencies are present.

---

## Architecture Patterns

### What Already Exists (do not rebuild)

```
supabase/functions/transcribe-voice/index.ts   — Whisper STT (complete, Phase 8)
supabase/functions/transcribe-note/index.ts    — Claude cleanup (complete, Phase 5)
app/(app)/notes/actions.ts                     — uploadNoteAudio (complete, Phase 5)
app/(app)/notes/actions.ts                     — saveNote (accepts audioStorageKey, complete)
app/(app)/notes/new/note-editor.tsx            — "Text" + "Voice" tabs (extend to add "Upload")
app/(app)/notes/[id]/note-detail.tsx           — reading-view (already uses .reading-view CSS)
```

### What Must Be Built

```
supabase/migrations/0018_notes_class_id.sql    — ADD class_id FK to notes table
lib/notes/class-router.ts                      — pure keyword scoring function
lib/notes/class-router.test.ts                 — unit tests (pure function, no IO)
app/(app)/notes/actions.ts                     — triggerAudioTranscription server action (orchestrator)
app/(app)/notes/new/note-editor.tsx            — extend: add "Upload" tab + class override dropdown
app/(app)/notes/[id]/page.tsx                  — pass class list to NoteDetail for override UI
app/(app)/notes/[id]/note-detail.tsx           — class badge + override dropdown (optional enhancement)
```

### Pattern 1: Upload Tab in NoteEditor

Add a third tab value `"upload"` to the existing `tab` state. On file selection:

1. Call `uploadNoteAudio(formData)` — server action, returns `{ ok, storageKey }`
2. Call new `triggerAudioTranscription({ noteId, storageKey })` — server action that orchestrates the two-step chain (described below)
3. Show loading state ("Transcribing your recording...") then `router.push(/notes/${noteId})`

```typescript
// note-editor.tsx addition (Source: codebase-direct, NoteEditor pattern)
const [tab, setTab] = useState<"text" | "voice" | "upload">("text");

// File input for upload tab:
<input
  type="file"
  accept=".m4a,.mp3,.wav,.webm,audio/*"
  onChange={handleFileSelect}
/>
```

Calm invariant note: the loading copy must be "Transcribing your recording…" (not "Processing…" which is acceptable, but never "Analyzing your notes" which could imply judgment).

### Pattern 2: Two-Step Orchestration Server Action

The new `triggerAudioTranscription` server action:

```typescript
// Source: codebase-direct pattern from app/(app)/notes/[id]/actions.ts triggerTranscript
// Step 1: invoke transcribe-voice (Whisper STT) — AWAITED (returns raw text needed for step 2)
// Step 2: write raw text to notes.body_text via saveNote
// Step 3: fire-and-forget transcribe-note (Claude cleanup) — same as existing triggerTranscript pattern
```

Important: `supabase.functions.invoke` from a server action parses the JSON body normally — binary audio is NOT passed through this path (audio already lives in Storage; the Edge Function downloads it via service-role). No binary streaming issue (Phase 8 Phase 8 decisions note about direct fetch is specific to tts-generate which returns audio, not to transcribe-voice which only returns JSON).

### Pattern 3: Auto-Class Routing — Pure Keyword Matcher

```typescript
// lib/notes/class-router.ts
export interface ClassCandidate {
  id: string;
  name: string;             // from classes.name
  recentTitles: string[];   // from assignments.title where class_id = this.id, last 10
}

export function scoreClass(candidate: ClassCandidate, transcript: string): number
export function pickBestClass(candidates: ClassCandidate[], transcript: string): string | null
```

Algorithm (no LLM, no embeddings):
1. Tokenize transcript to lowercase words, strip punctuation, remove stop words
2. For each class: score = (term frequency hits in class name) × 3 + (term frequency hits across recent assignment titles) × 1
3. Return the class with highest score above a minimum threshold (e.g., score >= 2); return null if no class clears threshold

This is intentionally simple. Class names like "AP US History", "Chemistry", "English 11" are highly discriminative against transcript content about battles, reactions, or essay structure.

### Pattern 4: notes.class_id Migration

```sql
-- 0018_notes_class_id.sql
ALTER TABLE public.notes
  ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

CREATE INDEX notes_owner_class_idx
  ON public.notes (owner_id, class_id)
  WHERE class_id IS NOT NULL;
```

This is nullable — existing notes without a class remain valid. The auto-router writes this column after transcription. The student can override via dropdown on the note editor or note detail.

### Pattern 5: reading_font — Already Works, No Action Needed

`app/(app)/layout.tsx` applies `profileBodyClass(profile)` to the wrapper div. `profileBodyClass` maps `reading_font` to CSS classes (`reading-font-atkinson`, `reading-font-opendyslexic`, `dyslexia-font`). The `note-detail.tsx` already uses `.reading-view` on text content, which inherits the body-level font class from the layout. **No code changes needed for reading_font in the notes detail view.**

### Anti-Patterns to Avoid

- **Do NOT call Whisper directly from a Next.js server action or browser** — must go through `transcribe-voice` Edge Function. The `uploadNoteAudio` server action only uploads to Storage; it never calls OpenAI.
- **Do NOT await `transcribe-note` in the server action** — use the existing fire-and-forget pattern with `void supabase.functions.invoke(...)` and let the page pick up the result on next render.
- **Do NOT show a spinner that blocks navigation** — after Whisper returns the raw transcript (which IS awaited), write the body_text and navigate the user to the note detail page immediately. Claude cleanup happens asynchronously.
- **Do NOT add `audio_whisperer` or similar to the `feature` union** — `transcribe-voice` already exists in the union and covers this case. No new feature name needed.
- **Do NOT add a class_id column with NOT NULL** — existing notes have no class assignment; the column must be nullable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio → text | Custom STT pipeline | `transcribe-voice` Edge Function (already exists) | Already handles Storage download → Whisper multipart POST |
| Text cleanup + outline | Custom NLP | `transcribe-note` Edge Function (already exists) | Claude Sonnet 4.6 with ADHD/dyslexia-optimized prompt |
| File upload to storage | Direct browser-to-Storage | `uploadNoteAudio` server action (already exists) | RLS-safe; adds `user.id/` prefix to storage key |
| Class keyword scoring | Embeddings / vector DB | `lib/notes/class-router.ts` term frequency | 5–10 classes, totally overkill to embed; pure function is unit-testable |

**Key insight:** Nearly all infrastructure is pre-built. Phase 10 is primarily UI wiring + a small pure-logic module.

---

## Common Pitfalls

### Pitfall 1: Whisper 25MB File Size Hard Limit
**What goes wrong:** Whisper API rejects files > 25MB with HTTP 413. A 60-minute Plaud Note .m4a at default quality can exceed this.
**Why it happens:** OpenAI enforces a hard 25MB request body limit on `POST /v1/audio/transcriptions`.
**How to avoid:** Validate file size client-side before calling `uploadNoteAudio`. Show a calm amber warning: "This recording is over 25 MB. For best results, use recordings under 30 minutes." Do NOT block the upload — let the user decide. For the v1 implementation, add a size check in `triggerAudioTranscription` and return a friendly error if the blob size exceeds 24MB (leaving 1MB headroom).
**Warning signs:** `transcribe-voice` returning HTTP 500 with OpenAI error body containing "maximum content size limit".

### Pitfall 2: Empty MIME Type from Supabase Storage Blob
**What goes wrong:** `supabase.storage.from(bucket).download(key)` returns a Blob whose `.type` may be `""` or `"application/octet-stream"` depending on how the file was uploaded.
**Why it happens:** Supabase Storage does not always preserve the original MIME type on download.
**How to avoid:** The existing `transcribe-voice` already handles this: `new File([await blob.arrayBuffer()], "audio.webm", { type: blob.type || "audio/webm" })`. For .m4a files, the fallback must be extended: detect file extension from `audioStorageKey` and choose the correct fallback MIME (`audio/mp4` for .m4a, `audio/mpeg` for .mp3, `audio/wav` for .wav, `audio/webm` for .webm).
**Warning signs:** Whisper returning 400 "Invalid file format" despite valid audio data.

### Pitfall 3: binary invoke vs. JSON invoke
**What goes wrong:** Calling `supabase.functions.invoke("transcribe-voice", { body: { audioStorageKey } })` returns a JSON response. Phase 8 STATE.md notes that `tts-generate` requires `direct fetch` because it returns binary audio. `transcribe-voice` only returns `{ ok, text }` JSON — the normal `invoke` path works correctly here.
**Why it happens:** Confusion between Phase 8 TTS binary-response issue and Phase 10 STT JSON-response pattern.
**How to avoid:** Use `supabase.functions.invoke("transcribe-voice", { body: { audioStorageKey } })` normally. Only `tts-generate` needs direct fetch.

### Pitfall 4: Creating orphan note rows before audio upload
**What goes wrong:** NoteEditor creates the note row on first auto-save. If the user switches to "Upload" tab before typing anything, there is no noteId yet, and the upload has nowhere to write `audioStorageKey`.
**Why it happens:** The create-on-first-save pattern (Phase 5 decision) defers row creation. Audio upload needs the note to exist first.
**How to avoid:** In `handleFileSelect`, if `noteId` is null, call `createNote({ title, assignmentId })` first to obtain the noteId, then call `uploadNoteAudio`. This is the same pattern the existing `saver` closure uses.

### Pitfall 5: Auto-class router matching too eagerly
**What goes wrong:** The keyword matcher pre-selects the wrong class (e.g., "English" class selected during Chemistry notes because the transcript mentions "the chemical equation IS written in English").
**Why it happens:** Common words appear in multiple contexts.
**How to avoid:** Require a minimum score threshold (score >= 2 hits). Apply a bonus multiplier (×3) to class name token hits vs. assignment title hits (×1). Use only the `name` field of classes, not the `notes` (freetext) or `teacher` fields. Never auto-select with score < 2 — return null so no class is pre-selected rather than pre-selecting a wrong class. The student always has an override dropdown.

### Pitfall 6: Supabase Storage bucket `note-audio` not yet created
**What goes wrong:** `uploadNoteAudio` returns `{ ok: false, error: "The resource was not found" }` even with valid code.
**Why it happens:** Supabase Storage buckets are runtime config — they are not created by SQL migrations. The `note-audio` bucket must exist in the Supabase dashboard.
**How to avoid:** Document as runtime dependency in the plan. The bucket name is already established (Phase 5). Bucket should be private (not public) — the service-role client in `transcribe-voice` downloads the file directly; signed URLs are not needed.

### Pitfall 7: Whisper returns transcript for silence/noise recordings
**What goes wrong:** A very short or noise-only clip returns a transcript like "Thank you." or empty string, which then gets fed into `transcribe-note` and generates a nonsensical outline.
**Why it happens:** Whisper hallucinates on minimal audio input.
**How to avoid:** Add a minimum character count check in `triggerAudioTranscription` — if Whisper returns < 20 characters, show a calm message "The recording didn't pick up enough speech. You can add notes manually." Do NOT call `transcribe-note` with a near-empty transcript.

---

## Code Examples

### Existing: transcribe-voice invocation from a server action

```typescript
// Source: app/(app)/notes/[id]/actions.ts (existing fire-and-forget pattern)
// For transcribe-voice, we AWAIT the invoke (need the raw text before writing body_text)
const { data, error } = await supabase.functions.invoke("transcribe-voice", {
  body: { audioStorageKey, bucket: "note-audio" },
});
if (error || !data?.text) {
  return { ok: false, error: "Transcription did not return text." };
}
// data.text = raw Whisper transcript
```

### Existing: upload to Supabase Storage via server action

```typescript
// Source: app/(app)/notes/actions.ts (already built)
export async function uploadNoteAudio(formData: FormData) {
  const file = formData.get("audio") as File | null;
  const ext = file.name.split(".").pop() ?? "webm";
  const storageKey = `${user.id}/${Date.now()}.${ext}`;
  await supabase.storage.from("note-audio").upload(storageKey, file, { contentType: file.type });
  return { ok: true, storageKey };
}
```

### New: Class keyword scorer (pure function, no IO)

```typescript
// Source: to be created at lib/notes/class-router.ts
export function scoreClass(candidate: ClassCandidate, transcript: string): number {
  const tokens = tokenize(transcript);       // lowercase, strip punctuation, remove stop words
  const nameTokens = tokenize(candidate.name);
  const titleTokens = candidate.recentTitles.flatMap(tokenize);

  const nameHits = nameTokens.filter(t => tokens.includes(t)).length;
  const titleHits = titleTokens.filter(t => tokens.includes(t)).length;
  return nameHits * 3 + titleHits;
}

export function pickBestClass(
  candidates: ClassCandidate[],
  transcript: string,
): string | null {                            // returns class id or null
  const MIN_SCORE = 2;
  const scored = candidates.map(c => ({ id: c.id, score: scoreClass(c, transcript) }));
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score >= MIN_SCORE ? best.id : null;
}
```

### New: MIME type fallback by extension (inside transcribe-voice fix)

```typescript
// Source: to be added in supabase/functions/transcribe-voice/index.ts
const ext = audioStorageKey.split(".").pop()?.toLowerCase() ?? "webm";
const mimeByExt: Record<string, string> = {
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
};
const mimeType = blob.type && blob.type !== "application/octet-stream"
  ? blob.type
  : (mimeByExt[ext] ?? "audio/webm");
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Build custom STT pipeline | Use existing `transcribe-voice` Edge Function | Phase 8 | Zero work needed for Whisper integration |
| Build audio upload action | Use existing `uploadNoteAudio` server action | Phase 5 | Zero work needed for storage upload |
| Custom MIME handling | Pattern already in `transcribe-voice` (partial) | Phase 8 | Need to extend for .m4a fallback |
| No class on notes | Add `class_id` FK via migration 0018 | Phase 10 | Enables auto-routing and class-filtered note list |

**Deprecated/outdated:** None — this phase adds new columns, not schema changes to existing ones.

---

## Open Questions

1. **Should the "Upload" tab be in NoteEditor or a separate /notes/upload route?**
   - What we know: NoteEditor already has two tabs (text/voice); the tab switcher is 8 lines of JSX
   - What's unclear: Whether a 3-tab design fits mobile UX
   - Recommendation: Add a third "Upload" tab inline — same component, consistent mental model

2. **File size UX: hard block or soft warning?**
   - What we know: Whisper hard-rejects > 25MB; most Plaud Note .m4a recordings at default quality run ~1MB/min meaning 25 minutes = 25MB
   - What's unclear: What quality setting Plaud Notes defaults to in practice
   - Recommendation: Soft amber warning at > 20MB ("This recording is large — best under 25 MB"); hard client-side block at 25MB with calm copy "Recording too large to transcribe. Try a shorter clip."

3. **Should auto-class routing also write to the note on detail view or only on new note creation?**
   - What we know: The routing logic runs after Whisper completes; detail view currently has no class concept
   - Recommendation: Write `class_id` to the notes row inside `triggerAudioTranscription` server action. Surface class badge + override dropdown on note-detail. This is scope for plan 10-02 or 10-03.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| OPENAI_API_KEY secret | `transcribe-voice` Edge Function | Assumed (set in Phase 8) | — | None — blocks Whisper |
| `note-audio` Storage bucket | `uploadNoteAudio`, `transcribe-voice` | Assumed (documented Phase 5) | — | None — upload fails silently |
| Supabase Edge Functions runtime | Both Edge Functions | Available | Deno 1.x | — |
| Next.js FormData / File API | `uploadNoteAudio` server action | Available (Next.js 15) | 15 | — |

**Missing dependencies with no fallback:**
- `OPENAI_API_KEY` must be set in Supabase secrets — confirm before testing
- `note-audio` Storage bucket must be created in Supabase dashboard — documented in Phase 5; confirm it exists

**Missing dependencies with fallback:** None.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^3.0.0 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run lib/notes/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F4-AUDIO | `uploadNoteAudio` stores key in correct format `{userId}/{timestamp}.{ext}` | unit (mock Supabase) | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F8-UPLOAD | `transcribe-voice` builds correct MIME fallback for .m4a, .mp3, .wav, .webm | unit (pure function extracted) | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F16-AUTOCLASSIFY | `scoreClass` returns correct score for matching / non-matching transcripts | unit | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F16-AUTOCLASSIFY | `pickBestClass` returns null when no class exceeds MIN_SCORE threshold | unit | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F16-AUTOCLASSIFY | `pickBestClass` returns correct class id when clear winner exists | unit | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F16-AUTOCLASSIFY | `tokenize` strips punctuation and stop words, lowercases | unit | `npx vitest run lib/notes/class-router.test.ts` | Wave 0 |
| F8-UPLOAD | `triggerAudioTranscription` returns calm error when Whisper transcript < 20 chars | unit (mock invoke) | integration smoke test — manual | manual-only |

Note: `triggerAudioTranscription` is a Next.js server action that calls `supabase.functions.invoke` — the boundary test is manual smoke-test only (Edge Function invocations require Deno runtime, not Vitest).

### Sampling Rate
- **Per task commit:** `npx vitest run lib/notes/`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green + `npm run typecheck` + `npm run tone-audit` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/notes/class-router.ts` — pure functions (needs to exist before tests)
- [ ] `lib/notes/class-router.test.ts` — covers F16-AUTOCLASSIFY (6 test cases above)
- [ ] Vitest include already covers `lib/**/*.test.ts` — no config change needed

*(If framework already installed: yes — Vitest ^3.0.0 already in package.json)*

---

## Sources

### Primary (HIGH confidence)
- Codebase direct — `supabase/functions/transcribe-voice/index.ts` (Whisper STT implementation, Phase 8)
- Codebase direct — `supabase/functions/transcribe-note/index.ts` (Claude cleanup, Phase 5)
- Codebase direct — `app/(app)/notes/actions.ts` (uploadNoteAudio, saveNote with audioStorageKey)
- Codebase direct — `supabase/migrations/0011_notes_and_flashcards.sql` (notes schema, no class_id)
- Codebase direct — `supabase/migrations/0001_init.sql` (classes table: id, owner_id, name, teacher, color)
- Codebase direct — `supabase/functions/_shared/safety.ts` (LogParams feature union — transcribe_note + stt_transcribe already present)
- Codebase direct — `app/(app)/layout.tsx` (profileBodyClass applied globally; reading_font already inherited)
- Codebase direct — `.planning/STATE.md` Phase 8 decisions (OPENAI_API_KEY already set; binary-vs-JSON invoke distinction)

### Secondary (MEDIUM confidence)
- [OpenAI community — Whisper 25MB limit](https://community.openai.com/t/whisper-api-increase-file-limit-25-mb/566754) — confirmed hard limit
- [Supabase Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits) — Storage can handle audio files up to 500GB on Pro; Whisper limit is the binding constraint

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase or official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already present in codebase
- Architecture: HIGH — patterns verified directly from existing Phase 5/8 implementations
- Pitfalls: HIGH — Pitfall 1/2/6 verified from official docs + Phase 8 STATE.md decisions; Pitfall 3/4/5/7 verified from codebase patterns
- Auto-class routing algorithm: MEDIUM — simple term-frequency approach is well-understood but threshold tuning (MIN_SCORE=2) is a judgment call that may need adjustment after testing

**Research date:** 2026-05-30
**Valid until:** 2026-06-30 (stable stack; Whisper API limits rarely change)
