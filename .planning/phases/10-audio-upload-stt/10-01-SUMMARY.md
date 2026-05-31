---
phase: 10-audio-upload-stt
plan: "01"
subsystem: notes/audio-foundation
tags: [migration, pure-logic, tdd, mime, validation, class-router, whisper]
dependency_graph:
  requires: []
  provides:
    - supabase/migrations/0018_notes_class_id.sql
    - lib/notes/mime.ts (getMimeType, getExtension)
    - lib/notes/upload-validation.ts (validateAudioFile, MAX_FILE_BYTES, WARN_FILE_BYTES, ALLOWED_EXTENSIONS)
    - lib/notes/class-router.ts (tokenize, scoreClass, scoreClassMatch, MIN_SCORE, ClassCandidate)
    - supabase/functions/transcribe-voice/index.ts (mimeByExt extension fallback)
  affects:
    - 10-02 (UI wires against upload-validation + class-router contracts)
    - 10-03 (wires transcribe-voice; migration must be applied before supabase gen types)
tech_stack:
  added: []
  patterns:
    - TDD red-green for upload-validation + class-router
    - Set intersection scoring (not bag-of-words)
    - Deno mirror pattern — mimeByExt duplicated inline in Edge Function
    - Partial index pattern (WHERE class_id IS NOT NULL)
key_files:
  created:
    - supabase/migrations/0018_notes_class_id.sql
    - lib/notes/mime.ts
    - lib/notes/mime.test.ts
    - lib/notes/upload-validation.ts
    - lib/notes/upload-validation.test.ts
    - lib/notes/class-router.ts
    - lib/notes/class-router.test.ts
  modified:
    - supabase/functions/transcribe-voice/index.ts
decisions:
  - getExtension uses lastIndexOf('.') on the basename — handles storage keys like 'user-id/file.m4a' and returns '' for no-extension files (split+pop returns the whole string when no dot exists)
  - MIN_SCORE=2 — single keyword match is too low-signal; two hits required before auto-routing
  - 20MB soft warn, 25MB hard block (at-or-above 25MB blocked) — Whisper hard cap; "at exactly 25MB" is blocked not warned
  - mimeByExt duplicated inline in transcribe-voice (Deno cannot import lib/notes/mime.ts) — mirrors safety.ts Deno mirror pattern established in Phase 6
metrics:
  duration: "~15 minutes"
  completed: "2026-05-31T02:46:00Z"
  tasks_completed: 3
  files_created: 7
  files_modified: 1
  tests_added: 36
  total_tests: 258
---

# Phase 10 Plan 01: Audio Upload Foundation Summary

Schema + pure-logic foundation for Phase 10 audio upload — migration 0018, three pure-logic modules (mime, upload-validation, class-router), and extension-aware MIME fallback in transcribe-voice Edge Function.

## Migration 0018 Status

**Created:** `supabase/migrations/0018_notes_class_id.sql`

**Applied locally:** `supabase db push` was NOT run in this environment (Supabase CLI not available). The runtime owner must apply this migration before 10-03 runs `supabase gen types typescript`. The migration file is syntactically valid SQL.

SQL adds:
- `ALTER TABLE public.notes ADD COLUMN class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL`
- `CREATE INDEX notes_owner_class_idx ON public.notes (owner_id, class_id) WHERE class_id IS NOT NULL`

## Module Public Surface (copy-paste imports for 10-02)

```typescript
// lib/notes/mime.ts
import { getMimeType, getExtension } from "@/lib/notes/mime";
// getMimeType("note.m4a")  → "audio/mp4"
// getMimeType("clip.mp3")  → "audio/mpeg"
// getMimeType("class.wav") → "audio/wav"
// getMimeType("clip.webm") → "audio/webm"
// getMimeType("file.ogg")  → "audio/webm"  (fallback)
// getExtension("CLIP.M4A") → "m4a"
// getExtension("noext")    → ""

// lib/notes/upload-validation.ts
import {
  validateAudioFile,
  MAX_FILE_BYTES,      // 26214400  (25 MB)
  WARN_FILE_BYTES,     // 20971520  (20 MB)
  ALLOWED_EXTENSIONS,  // ["m4a", "mp3", "wav", "webm"] as const
  type ValidationResult,
} from "@/lib/notes/upload-validation";
// validateAudioFile(file) → { ok: true }
//                         | { ok: true, warning: string }   // amber, 20–25 MB
//                         | { ok: false, error: string }    // blocked

// lib/notes/class-router.ts
import {
  tokenize,
  scoreClass,
  scoreClassMatch,
  MIN_SCORE,            // 2
  type ClassCandidate,
} from "@/lib/notes/class-router";
// ClassCandidate: { id: string; name: string; recentTitles: string[] }
// scoreClassMatch(transcript, candidates) → string | null  (class id or null)
```

## MIME Mapping Table (for 10-03 reference)

| Extension | MIME type    | Whisper support |
|-----------|-------------|-----------------|
| .m4a      | audio/mp4   | Yes             |
| .mp3      | audio/mpeg  | Yes             |
| .wav      | audio/wav   | Yes             |
| .webm     | audio/webm  | Yes             |
| (other)   | audio/webm  | Fallback        |

## Test Counts

| File                              | Tests |
|-----------------------------------|-------|
| lib/notes/mime.test.ts            | 9     |
| lib/notes/upload-validation.test.ts | 11  |
| lib/notes/class-router.test.ts    | 16   |
| **New total**                     | **36** |
| Full suite (npm run test:run)     | 258   |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getExtension returning full string when no dot present**
- **Found during:** Task 1 (RED phase revealed String.prototype.split(".").pop() returns the full string when there is no "." character)
- **Issue:** `getExtension("noext")` returned `"noext"` instead of `""`
- **Fix:** Replaced `split(".").pop()` with `lastIndexOf(".")` check on the basename; returns `""` when `dotIdx === -1`
- **Files modified:** `lib/notes/mime.ts`
- **Commit:** ab12cdc (included in Task 1 commit after fix)

## Threshold Verification

No deviations from planned thresholds:
- `MIN_SCORE = 2` — as planned
- `WARN_FILE_BYTES = 20 * 1024 * 1024` — as planned
- `MAX_FILE_BYTES = 25 * 1024 * 1024` — as planned (at-or-above blocks)

## Runtime Dependencies (confirm before 10-02 starts)

1. **Migration 0018 applied** — `supabase db push` (or `supabase migration up`) before `supabase gen types`
2. **Storage bucket `note-audio` exists** — created in Supabase dashboard (established in Phase 5; confirm still present)
3. **`OPENAI_API_KEY` set** — `supabase secrets set OPENAI_API_KEY=sk-...` (Phase 8 baseline; confirm still set)

## Known Stubs

None — this plan is pure logic/schema with no UI and no data-source wiring. All exports are fully functional pure functions.

## Self-Check: PASSED
