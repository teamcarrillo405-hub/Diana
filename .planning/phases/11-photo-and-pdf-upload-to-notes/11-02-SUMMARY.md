---
plan: 11-02
phase: 11
subsystem: notes/upload
tags: [photo-upload, pdf-upload, heic-conversion, doc-upload-tab, server-actions, note-editor]
dependency_graph:
  requires: [11-01-complete, phase-10-complete]
  provides: [uploadNoteDoc, triggerDocExtraction, DocUploadTab, note-editor-4-tabs]
  affects: [notes-new-page, notes-actions, lib-notes-upload]
tech_stack:
  added: []
  patterns: [server-action-mirror, heic-pitfall-guard, fire-and-forget-edge-fn, calm-amber-only-errors]
key_files:
  created:
    - app/(app)/notes/new/doc-upload-tab.tsx
  modified:
    - app/(app)/notes/actions.ts
    - app/(app)/notes/new/note-editor.tsx
decisions:
  - triggerDocExtraction awaits extract-note-doc (Edge Function handles body_text write + transcribe-note fire-and-forget internally — action just relays status)
  - HEIC conversion happens client-side before upload in DocUploadTab (Pitfall 1 guard matches 11-01 spec)
  - Tab key "upload" renamed to "audio" — string identity change, no behavior change for AudioUploadTab
  - DocUploadTab props shape is byte-identical to AudioUploadTabProps — NoteEditor wires both identically
metrics:
  duration_seconds: 314
  completed_date: "2026-05-31"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 2
  tests_added: 0
  tests_total_suite: 281
---

# Phase 11 Plan 02: DocUploadTab + Server Actions + NoteEditor 4th Tab Summary

**One-liner:** uploadNoteDoc + triggerDocExtraction server actions (mirrors Phase 10 audio shape) + DocUploadTab with HEIC conversion path + NoteEditor 4-tab strip (Text/Voice/Audio/Photo-PDF).

---

## New Action Surface

```typescript
// app/(app)/notes/actions.ts (appended — existing actions untouched)

export async function uploadNoteDoc(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }>;

export async function triggerDocExtraction(
  input: { noteId: string; storageKey: string },
): Promise<
  | { ok: true; text: string; bodyTooShort?: false }
  | { ok: true; text: ""; bodyTooShort: true }
  | { ok: false; error: string }
>;
```

**triggerDocExtraction design note:** Unlike triggerAudioTranscription (which writes body_text itself after Whisper), triggerDocExtraction simply awaits `extract-note-doc` and relays the result. The Edge Function internally writes `body_text` + `doc_storage_key` and fires-and-forgets `transcribe-note`. No DB writes in the server action — simpler than the audio counterpart.

---

## DocUploadTab Props Shape

```typescript
export interface DocUploadTabProps {
  ensureNoteId: () => Promise<string | null>;
  onTranscriptReady: (text: string) => void;
  onClassSuggested: (classId: string | null) => void;
  classCandidates: ClassCandidate[];
}
```

Identical to `AudioUploadTabProps` — NoteEditor wires both tabs with the same prop expression.

### Status State Machine

| State | Description |
|-------|-------------|
| `idle` | Initial state |
| `validating` | validateDocFile running |
| `heicConverting` | convertHeicToJpeg running (Pitfall 1 path) |
| `uploading` | uploadNoteDoc server action in flight |
| `processing` | triggerDocExtraction / Claude Vision awaited |
| `structuring` | Extraction done; transcribe-note is fire-and-forget on Edge Function |
| `done` | All complete (after 1.5s from structuring) |
| `tooShort` | text.length < 20 (Pitfall 5) |
| `error` | Any failure — amber only, calm copy |

---

## NoteEditor Tab Union Before/After

| Version | Tab Union | Tab Labels |
|---------|-----------|------------|
| Phase 10 | `"text" \| "voice" \| "upload"` | Text / Voice / Upload |
| Phase 11 (this plan) | `"text" \| "voice" \| "audio" \| "photo-pdf"` | Text / Voice / Audio / Photo/PDF |

No orphan `"upload"` string references remain in `note-editor.tsx`.

---

## Manual Smoke-Test Status

**Runnable without Wave 3 infra (typecheck + tab render + .txt rejection):**
- `npm run typecheck` — PASS (exit 0)
- `npm run test:run` — PASS (281/281)
- `npm run tone-audit` — PASS (exit 0, 2 pre-existing warnings in lib/features.ts + README.md)
- Tab renders: NoteEditor now shows 4 tabs — confirmed via source inspection; Audio tab unchanged
- `.txt` file rejection: validateDocFile returns `{ ok: false, error: "Pick a photo..." }` — amber error shown, no upload

**Deferred to 11-03 (requires Wave 3 infra):**
- Live photo upload + extraction (needs `note-docs` bucket + migration 0019 applied + `extract-note-doc` deployed)
- HEIC conversion live path (needs HEIC source file + bucket)
- transcribe-note cleanup outline (already works for audio; same flow for docs)

---

## Runtime Dependencies for 11-03

| Dependency | Status | Action in 11-03 |
|------------|--------|-----------------|
| `note-docs` Storage bucket | Not created | Create via Supabase MCP |
| Migration 0019 (`doc_storage_key` column) | File exists, not applied | `supabase migrate up` or MCP apply |
| `extract-note-doc` Edge Function | File exists, not deployed | `supabase functions deploy extract-note-doc` |
| `ANTHROPIC_API_KEY` secret | Exists from Phase 5/6 | Confirm via Supabase MCP before deploy |

---

## Deviations from Plan

None — plan executed exactly as written. The `triggerDocExtraction` simplification (no DB write in server action) matches the plan's task summary note: "extract-note-doc does its own write to body_text internally."

## Known Stubs

None. All UI state wired to real server actions + Edge Function pipeline. No hardcoded values flow to rendered output.

## Self-Check: PASSED
