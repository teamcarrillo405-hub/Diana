---
phase: 10-audio-upload-stt
plan: "02"
subsystem: notes
tags: [audio, upload, whisper, stt, class-routing, ui]
dependency_graph:
  requires: ["10-01"]
  provides: ["10-03"]
  affects: ["app/(app)/notes/new", "app/(app)/notes/actions"]
tech_stack:
  added: []
  patterns:
    - "Whisper STT await + fire-and-forget Claude cleanup (orchestrator chain)"
    - "ensureNoteId callback — create-on-demand before upload to prevent orphan rows"
    - "Pure keyword class routing (scoreClassMatch) with client-visible override dropdown"
    - "useTransition for long-running async in client component"
key_files:
  created:
    - app/(app)/notes/new/audio-upload-tab.tsx
  modified:
    - app/(app)/notes/actions.ts
    - app/(app)/notes/new/note-editor.tsx
    - app/(app)/notes/new/page.tsx
decisions:
  - "Await Whisper (transcribe-voice), fire-and-forget Claude cleanup (transcribe-note) — body_text needed synchronously for class routing; outline is best-effort"
  - "Pitfall 7 guard: text < 20 chars returns bodyTooShort:true without chaining Claude — prevents hallucination artifact in outline"
  - "classId state in NoteEditor but not yet persisted — 10-03 wires classId into saveNote + createNote payloads"
  - "ensureNoteId extracted as useCallback in NoteEditor — shared between saver and AudioUploadTab, creates row only once"
  - "Class dropdown visible on all tabs above title — student can pre-select class before typing or picking audio"
metrics:
  duration_seconds: 304
  completed_date: "2026-05-30"
  tasks_completed: 3
  files_changed: 4
---

# Phase 10 Plan 02: Audio Upload UX Summary

Audio upload UX is wired end-to-end: a third "Upload" tab appears in NoteEditor, `AudioUploadTab` handles the full upload flow with calm feedback states, and `triggerAudioTranscription` chains Whisper STT → body_text write → fire-and-forget Claude cleanup in a single server action.

## New Action Surface

```typescript
// app/(app)/notes/actions.ts
export async function triggerAudioTranscription(input: {
  noteId: string;   // UUID
  storageKey: string;
}): Promise<
  | { ok: true; text: string; bodyTooShort?: false }
  | { ok: true; text: ""; bodyTooShort: true }     // Whisper returned < 20 chars
  | { ok: false; error: string }
>
```

Await path: Whisper STT → write body_text + audio_storage_key → return text.
Fire-and-forget path: `void supabase.functions.invoke("transcribe-note", ...)` — outline lands asynchronously.
Pitfall 7 guard: `< 20 chars` → save storage key, return `bodyTooShort: true`, skip Claude cleanup.

## AudioUploadTab Props Shape (for 10-03 consumption check)

```typescript
export interface AudioUploadTabProps {
  ensureNoteId: () => Promise<string | null>;
  onTranscriptReady: (text: string) => void;
  onClassSuggested: (classId: string | null) => void;
  classCandidates: ClassCandidate[];
}
```

## NoteEditor State Additions

```typescript
// New state in NoteEditor (app/(app)/notes/new/note-editor.tsx)
const [tab, setTab] = useState<"text" | "voice" | "upload">("text");
const [classId, setClassId] = useState<string | null>(null);

// New prop
classCandidates?: ClassCandidate[]  // default []
```

`classId` is set by the class dropdown (manual) or `onClassSuggested` (from `scoreClassMatch`). It is NOT yet persisted — 10-03 wires it into `saveNote` / `createNote` payloads.

## Manual Smoke Test

Deferred to 10-03. Runtime dependencies required before smoke test is meaningful:
- **`OPENAI_API_KEY`** secret must be set in Supabase Edge Function environment (for Whisper transcription)
- **`note-audio`** Storage bucket must exist in the Supabase project (for audio file upload)

Both must be confirmed before running the /notes/new → Upload tab → .m4a → "Processing your recording…" flow.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- app/(app)/notes/new/audio-upload-tab.tsx — FOUND
- app/(app)/notes/actions.ts (triggerAudioTranscription) — FOUND
- app/(app)/notes/new/note-editor.tsx (3 tabs) — FOUND
- app/(app)/notes/new/page.tsx (classCandidates) — FOUND

Commits:
- 2540d5f — feat(10-02): triggerAudioTranscription server action
- 557d3f9 — feat(10-02): AudioUploadTab client component
- 9034139 — feat(10-02): NoteEditor 3-tab switcher + class dropdown + page.tsx
