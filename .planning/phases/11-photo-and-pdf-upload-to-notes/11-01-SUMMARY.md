---
plan: 11-01
phase: 11
subsystem: notes/upload
tags: [photo-upload, pdf-upload, edge-function, validation, heic, migration]
dependency_graph:
  requires: [phase-10-complete, supabase-migrations-0018]
  provides: [migration-0019, validateDocFile, convertHeicToJpeg, extract-note-doc-edge-fn]
  affects: [notes-table, lib-notes, ai-safety-log, edge-functions]
tech_stack:
  added: [heic2any@0.0.4]
  patterns: [chunked-base64-8192, extension-routing, fire-and-forget-transcribe-note, deno-mirror-sync]
key_files:
  created:
    - supabase/migrations/0019_note_docs_bucket.sql
    - lib/notes/upload-validation-doc.ts
    - lib/notes/upload-validation-doc.test.ts
    - lib/notes/heic-convert.ts
    - supabase/functions/extract-note-doc/index.ts
  modified:
    - lib/ai/safety.ts
    - supabase/functions/_shared/safety.ts
    - package.json
    - package-lock.json
decisions:
  - heic2any dynamic import lazy-loads 200KB gzip bundle only when HEIC file selected
  - Extension routing in Edge Function (never blob.type) guards Pitfall 4
  - 8192-byte chunk size in uint8ArrayToBase64 guards btoa stack overflow (Pitfall 2)
  - doc_extract added to both safety.ts mirrors per Deno-mirror convention (Phase 9 decision)
  - MIN_EXTRACT_CHARS=20 mirrors Phase 10 Pitfall 7 guard for silence hallucination prevention
metrics:
  duration_seconds: 482
  completed_date: "2026-05-31"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 4
  tests_added: 23
  tests_total_suite: 281
---

# Phase 11 Plan 01: Migration 0019 + validateDocFile + heic-convert + extract-note-doc Edge Function Summary

**One-liner:** Schema column + pure-logic validation (23 tests) + HEIC wrapper + unified Claude Vision/PDF Edge Function with chunked base64 and fire-and-forget transcribe-note cleanup.

---

## Migration 0019 Status

**File:** `supabase/migrations/0019_note_docs_bucket.sql`

Created locally. Contains:
```sql
ALTER TABLE public.notes ADD COLUMN doc_storage_key text;
COMMENT ON COLUMN public.notes.doc_storage_key IS '...';
```

- Column is nullable — audio-only and text-only notes are unaffected
- No index — doc_storage_key is per-row metadata, not a query filter
- Bucket creation (`note-docs`) is deferred to Wave 3 (11-03) via Supabase MCP

---

## Module Surface (11-02 import reference)

```typescript
// lib/notes/upload-validation-doc.ts
import {
  validateDocFile,
  isImageExt,
  isPdfExt,
  DOC_MAX_FILE_BYTES,    // 20 * 1024 * 1024 (20 MB hard block)
  DOC_WARN_FILE_BYTES,   // 10 * 1024 * 1024 (10 MB amber warning)
  ALLOWED_DOC_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_PDF_EXTENSIONS,
  type DocValidationResult,
  type AllowedDocExtension,
  type AllowedImageExtension,
  type AllowedPdfExtension,
} from "@/lib/notes/upload-validation-doc";

// lib/notes/heic-convert.ts
import { convertHeicToJpeg } from "@/lib/notes/heic-convert";
// Returns File with .jpg extension and type "image/jpeg"
// Throws if heic2any dynamic import fails — caller wraps in try/catch + calm error
```

---

## Test Count

`lib/notes/upload-validation-doc.test.ts`: **23 assertions** across 5 describe blocks:
- Extension whitelist (10 tests: all 8 valid exts + case-insensitive + rejections)
- Size thresholds (5 tests: clean, warn-boundary, warn-between, hard-block-exact, hard-block-above)
- Calm copy invariant (3 tests: rejection, size-block, warning copies)
- isImageExt / isPdfExt helpers (3 tests)
- ALLOWED_DOC_EXTENSIONS constants (2 tests)

Full test suite: 281 tests across 30 files — no regressions.

---

## heic2any Install

- Version: `^0.0.4` added to `package.json` dependencies
- No `@types/heic2any` exists (2026-05); type shape declared inline in `heic-convert.ts`
- Turbopack incompatibility guard: dynamic import (`await import("heic2any")`) defers bundle load to runtime; if WASM fails, caller catches and shows calm fallback message
- Install succeeded with no blocking errors (2 pre-existing moderate severity advisories unrelated to heic2any)

---

## Pitfall Coverage Table

| Pitfall | Description | Guard Location |
|---------|-------------|----------------|
| 1 (HEIC at Claude) | Claude Vision rejects HEIC/HEIF | `upload-validation-doc.ts:needsHeicConvert` flag + `heic-convert.ts` client-side conversion + `extract-note-doc/index.ts:ext===heic` 400 return |
| 2 (btoa stack overflow) | `btoa(String.fromCharCode(...bigArray))` crashes | `extract-note-doc/index.ts:uint8ArrayToBase64` — 8192-byte chunks |
| 3 (32 MB API limit) | base64 of 20 MB = 26.6 MB, under 32 MB limit | `DOC_MAX_FILE_BYTES = 20 * 1024 * 1024` in `upload-validation-doc.ts` |
| 4 (blob.type empty) | Supabase Storage returns empty/octet-stream type | `MIME_BY_EXT` lookup by extension in `extract-note-doc/index.ts` — never uses `blob.type` |
| 5 (< 20 chars) | Short OCR/extract should not trigger transcribe-note | `extract-note-doc/index.ts:MIN_EXTRACT_CHARS=20` — returns `{ok:true,text:'',tooShort:true}` |
| 6 (Turbopack/WASM) | heic2any WASM may not load in Next.js dev | Dynamic import defers load; caller should catch + show calm JPEG fallback message |

---

## safety.ts Mirror Sync

Both files updated with `"doc_extract"` in `LogParams.feature` union:

- `lib/ai/safety.ts` — Next.js side: `| "doc_extract"` appended after `"vocab_hover"` (multi-line format)
- `supabase/functions/_shared/safety.ts` — Deno mirror: `| "doc_extract"` appended to single-line union

Confirmed: `grep -c "doc_extract" lib/ai/safety.ts` → 1, same for Deno mirror.

---

## Edge Function Details

**File:** `supabase/functions/extract-note-doc/index.ts` (275 lines)

**Request body:** `{ storageKey: string; noteId: string; bucket?: string }` (default bucket: `"note-docs"`)

**Response:**
- `{ ok: true, text: string }` — extraction success
- `{ ok: true, text: "", tooShort: true }` — extracted < 20 chars
- `{ ok: false, error: string }` — validation or API error

**Flow:**
1. Parse + validate request (storageKey, noteId required)
2. Extension routing → reject HEIC/unknown, set isImage/isPdf
3. Confirm note ownership via service-role select
4. Token budget gate (resetBudgetIfNewDay + checkTokenBudget)
5. Download from note-docs bucket
6. Chunked base64 encode (8192-byte chunks)
7. Claude Sonnet 4.6 — image block (jpg/png/webp/gif) or document block (pdf)
8. Write body_text + doc_storage_key to notes
9. Fire-and-forget: transcribe-note (cleanup) + incrementTokens + logInteraction

**Deferred Wave 3 runtime dependencies:**
- `ANTHROPIC_API_KEY` secret — already exists from Phase 5/6 (confirm via Supabase MCP)
- `note-docs` Storage bucket creation (11-03 task)
- `supabase migrate up` (migration 0019 apply in 11-03)
- `supabase functions deploy extract-note-doc` (11-03 task)

---

## Deviations from Plan

None — plan executed exactly as written. All thresholds match spec:
- `DOC_MAX_FILE_BYTES = 20 * 1024 * 1024` (20 MB) — matches plan
- `DOC_WARN_FILE_BYTES = 10 * 1024 * 1024` (10 MB) — matches plan
- `MIN_EXTRACT_CHARS = 20` — matches plan

## Known Stubs

None. This plan creates pure-logic modules and an Edge Function with no UI rendering. No stub values flow to any UI component.

## Self-Check: PASSED
