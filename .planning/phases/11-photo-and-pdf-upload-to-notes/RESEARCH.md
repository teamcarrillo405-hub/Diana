# Phase 11: Photo and PDF Upload to Notes — Research

**Researched:** 2026-05-31
**Domain:** Claude Vision API, PDF-as-document API, Supabase Storage, Deno Edge Functions, HEIC browser conversion
**Confidence:** HIGH

---

## Summary

Phase 11 extends the note-taking upload flow (built in Phase 10 for audio) to cover two new file types: photos of handwritten notes and PDFs (syllabi, handouts). Both flow through the existing `transcribe-note` Claude cleanup pipeline unchanged because that pipeline already consumes plain raw text as `body_text`.

The core architectural decision is straightforward: use **Claude Vision (base64 inline)** for image OCR and **Claude PDF document blocks (base64 inline)** for PDF text extraction. Both happen inside a single new Edge Function (`extract-note-doc`). No separate OCR service, no Deno PDF parsing library, and no Files API (beta overhead not warranted for a single-use flow). The extracted raw text is written to `notes.body_text`, then `transcribe-note` fires-and-forgets exactly as it does for audio.

The only non-trivial wrinkle is **HEIC**: iPhone photos are HEIC by default, and Claude Vision does not support HEIC. This must be resolved client-side before upload using the `heic2any` browser library. Supabase Storage accepts any MIME type when `allowedMimeTypes` uses a wildcard, so the new `note-docs` bucket should list explicit types including `image/heic`/`image/heif` as pass-through (the converted JPEG is what actually reaches Claude).

**Primary recommendation:** One Edge Function (`extract-note-doc`) handles both images and PDFs via Claude Sonnet 4.6. Images go as base64 `image` blocks; PDFs go as base64 `document` blocks. HEIC conversion happens in the browser before upload. The audio bucket pattern from Phase 10 is replicated with a new `note-docs` bucket.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| F04-PHOTO | Photo capture / OCR — student uploads a photo of handwritten notes; text is extracted and flows into the note | Claude Vision base64 approach handles handwriting reliably; Sonnet 4.6 is the correct model per CLAUDE.md model-selection rule |
| F08-NOTE | Note-taking upload extension — photo/PDF uploads extend the existing Upload tab on the note editor | AudioUploadTab pattern from Phase 10 is directly reusable as a parallel `DocUploadTab`; same 4-step flow |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- **No red color for errors** — use amber for all error states in the new upload tab
- **No shame/scolding words** — `npm run tone-audit` must pass; copy like "we couldn't read that image" is fine, "you uploaded the wrong type" is not
- **All Claude API calls in Edge Functions only** — `extract-note-doc` Edge Function is mandatory; never call Anthropic from a Next.js Server Action
- **Model selection rule**: Sonnet 4.6 for quality ops including `transcribe_note`; the new extraction step also warrants Sonnet 4.6 (handwriting OCR is quality-sensitive)
- **Calm invariant**: `validateDocFile` must produce the same calm copy style as `validateAudioFile`
- **Token budget + log pattern**: Every Claude call in the Edge Function must call `resetBudgetIfNewDay` + `checkTokenBudget` before the Claude call and fire-and-forget `logInteraction` + `incrementTokens` after
- **Feature enum**: Add `"doc_extract"` (or similar) to the `feature` union in both `lib/ai/safety.ts` and `supabase/functions/_shared/safety.ts`

---

## Standard Stack

### Core (all verified against current official docs)

| Library / API | Version / Endpoint | Purpose | Why Standard |
|---|---|---|---|
| Claude Vision (base64 inline) | `claude-sonnet-4-6` via `https://api.anthropic.com/v1/messages` | Image OCR — extract handwritten text from photo | Anthropic native; no separate OCR service needed; superior to Tesseract on cursive/mixed handwriting |
| Claude PDF document block (base64 inline) | `claude-sonnet-4-6` via same endpoint | PDF text extraction | Anthropic native; processes each page as image + text; no Deno PDF library needed |
| `heic2any` npm | `^0.0.4` (latest verified on npmjs as of 2026-05) | Client-side HEIC → JPEG conversion before upload | Only working browser-side HEIC decoder; uses libheif WASM |
| Supabase Storage | existing `@supabase/supabase-js@2` | Store image/PDF files pre-extraction | Same pattern as `note-audio` bucket |
| Supabase Edge Functions (Deno) | existing pattern | Host `extract-note-doc` | All AI calls must live here per CLAUDE.md |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `transcribe-note` Edge Function | existing (no changes) | Claude cleanup pipeline (raw text → outline) | Unchanged; receives raw OCR/extracted text as `body_text` |
| `class-router.ts` | existing (no changes) | Keyword-based auto-class routing | Unchanged; runs on extracted text same as audio transcript |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Claude Vision base64 | Tesseract.js / Google Vision API | More setup, separate API key/cost, Tesseract struggles with cursive handwriting; Claude Vision is already integrated |
| Claude PDF base64 | Deno `pdf-parse` / `pdfjs` port | No reliable Deno PDF library exists without Node.js compat shim; Claude processes pages as images which handles scanned PDFs too |
| `heic2any` | Server-side HEIC conversion in Edge Function | No reliable HEIC decoder exists in Deno; browser conversion is simpler and offloads compute |
| Claude Files API (beta) | base64 inline | Files API requires `anthropic-beta: files-api-2025-04-14` header and adds beta complexity; for single-use extraction inline base64 is simpler and avoids file lifecycle management |

**Installation (Next.js side only — no npm deps for Edge Functions):**
```bash
npm install heic2any
npm install --save-dev @types/heic2any  # types likely not available; use declare module
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
lib/notes/
├── mime.ts                    # EXISTING — audio MIME helpers (extend for doc types)
├── upload-validation.ts       # EXISTING — validateAudioFile (DO NOT MODIFY)
├── upload-validation-doc.ts   # NEW — validateDocFile (image + PDF)
├── class-router.ts            # EXISTING — unchanged
└── heic-convert.ts            # NEW — thin wrapper around heic2any for lazy-import

app/(app)/notes/new/
├── audio-upload-tab.tsx       # EXISTING — unchanged
├── doc-upload-tab.tsx         # NEW — mirrors AudioUploadTab for images + PDFs
└── note-editor.tsx            # EXISTING — add 4th tab "Photo/PDF"

supabase/functions/
├── extract-note-doc/
│   └── index.ts               # NEW — downloads file from note-docs, calls Claude Vision or PDF block
├── transcribe-note/
│   └── index.ts               # EXISTING — unchanged
└── transcribe-voice/
    └── index.ts               # EXISTING — unchanged

supabase/migrations/
└── 0019_note_docs_bucket.sql  # NEW — creates note-docs bucket + doc_storage_key column

app/(app)/notes/actions.ts     # EXISTING — add uploadNoteDoc + triggerDocExtraction server actions
lib/ai/safety.ts               # EXISTING — add "doc_extract" to feature union
supabase/functions/_shared/safety.ts  # EXISTING — mirror the feature union addition
```

### Pattern 1: Claude Vision for Image OCR

The Edge Function downloads the image blob from Supabase Storage, base64-encodes it, and sends it as an `image` content block to Claude Sonnet 4.6.

**Verified:** Official Anthropic vision docs (https://platform.claude.com/docs/en/docs/build-with-claude/vision)

```typescript
// Source: Anthropic vision docs — base64 inline image pattern adapted for Deno
const { data: blob, error } = await supabase.storage
  .from("note-docs")
  .download(storageKey);

const arrayBuf = await blob.arrayBuffer();
const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuf)));

const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: IMAGE_OCR_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",  // or image/png — resolved from storageKey ext
            data: base64Data,
          },
        },
        { type: "text", text: "Extract all handwritten text from this photo of class notes." },
      ],
    }],
  }),
});
```

**Token cost:** At Claude Sonnet 4.6 pricing ($3/M input tokens), a 1000×1000 px notebook photo costs ~$0.004. A downscaled 800×600 JPEG costs ~$0.002. These are acceptable for an ADHD student app.

### Pattern 2: Claude PDF Document Block

PDFs are sent as `document` content blocks with `media_type: "application/pdf"`.

**Verified:** Official Anthropic PDF support docs (https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support)

```typescript
// Source: Anthropic PDF support docs — base64 document block pattern adapted for Deno
const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64Data,
          },
        },
        { type: "text", text: "Extract all text content from this document. Output plain text only, preserving structure where possible." },
      ],
    }],
  }),
});
```

**Token cost:** PDF processing costs 1,500–3,000 tokens per page (text) + image tokens per page. A 5-page syllabus costs roughly 10,000–20,000 tokens = ~$0.03–$0.06. Acceptable.

### Pattern 3: DocUploadTab (mirrors AudioUploadTab)

```typescript
// app/(app)/notes/new/doc-upload-tab.tsx
// Same 4-step pattern: validate → ensure noteId → upload → trigger extraction → class route
// Status states mirror AudioUploadTab:
type UploadStatus =
  | { kind: "idle" }
  | { kind: "validating" }
  | { kind: "uploading" }
  | { kind: "processing" }      // Claude extraction running
  | { kind: "structuring" }     // transcribe-note fire-and-forget kicked off
  | { kind: "done" }
  | { kind: "tooShort" }        // extracted text < 20 chars
  | { kind: "heicConverting" }  // NEW: converting HEIC before upload
  | { kind: "error"; message: string };
```

### Pattern 4: HEIC Client-Side Conversion

HEIC detection runs in `validateDocFile` before the upload. If HEIC/HEIF is detected, the `DocUploadTab` shows a "Converting photo format..." status and calls `heic2any` before passing the converted JPEG blob to the upload action.

```typescript
// lib/notes/heic-convert.ts
// Lazy-import heic2any to avoid adding it to the initial bundle
export async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: "image/jpeg" });
}
```

### Pattern 5: Edge Function Routing by File Type

The single `extract-note-doc` Edge Function detects the file type from the storage key extension and routes to the appropriate Claude call:

```typescript
// supabase/functions/extract-note-doc/index.ts
const ext = storageKey.split(".").pop()?.toLowerCase() ?? "";
const isPdf = ext === "pdf";
const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
// HEIC should never reach here — client converts before upload
// If it does, return 400 calm error
```

### Anti-Patterns to Avoid

- **Calling `api.anthropic.com` from a Next.js Server Action** — violates CLAUDE.md. All Claude calls must be in Edge Functions.
- **Using the Claude Files API (beta)** — adds beta header complexity and lifecycle management for single-use extractions. Use inline base64 instead.
- **Deno PDF parsing library** — no reliable Deno-native PDF library exists. Use Claude's document block which handles both text PDFs and scanned PDFs (via vision).
- **Uploading HEIC to Claude directly** — Claude Vision only supports JPEG, PNG, GIF, WebP. HEIC will return an error. Convert before upload.
- **Storing the PDF/image bytes in `body_text`** — `body_text` stores the extracted text, not the binary. The storage key goes in `doc_storage_key` (new column).
- **Awaiting `transcribe-note`** — fire-and-forget exactly as Phase 10 does. Do not change this pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Handwriting OCR | Tesseract.js integration, custom WASM module | Claude Vision (Sonnet 4.6) base64 | Claude handles cursive, mixed scripts, poor lighting better than Tesseract; already integrated |
| PDF text extraction in Deno | Port of pdf-parse, custom PDF parser | Claude document block base64 | Claude processes scanned PDFs (image-based pages) that text-only parsers miss; zero new deps |
| HEIC decoding in Edge Function | Deno HEIC library, ImageMagick via shell | `heic2any` npm in browser, upload JPEG | No reliable Deno HEIC decoder; browser conversion is simpler |
| Multi-page PDF pagination | Chunk by page, multiple API calls | Single Claude document block call | Claude handles up to 600 pages (100 for 200k-context models) in one call; 10-page syllabus = trivial |
| File type sniffing | Magic bytes parser | Extension from filename + MIME validation in `validateDocFile` | Sufficient for student uploads; browser File API provides reliable MIME from OS |

**Key insight:** Claude's multimodal capabilities eliminate the need for any specialized OCR or PDF parsing library. The same model that formats notes also extracts text — one API key, one billing line, consistent quality.

---

## Common Pitfalls

### Pitfall 1: HEIC Upload Silently Fails at Claude API

**What goes wrong:** Student uploads iPhone photo; it's HEIC format. Upload to Supabase Storage succeeds. Edge Function downloads and sends to Claude as `image/heic`. Claude returns 400 `invalid_request_error` because HEIC is not a supported vision format (only JPEG, PNG, GIF, WebP are supported per official docs).

**Why it happens:** Claude Vision only accepts four formats. HEIC is Apple's default camera format on iPhones since iOS 11. High percentage of student uploads will be HEIC.

**How to avoid:** Detect HEIC/HEIF in `validateDocFile` (check `file.type === "image/heic"` or `file.type === "image/heif"` or extension `.heic`/`.heif`). If detected, set status to `{ kind: "heicConverting" }` and run `heic2any` before the upload step. Upload the converted JPEG instead.

**Warning signs:** Users report "photo upload doesn't work" on iPhones; edge function logs show 400 from Anthropic.

### Pitfall 2: base64 Encoding in Deno — `btoa` Chokes on Binary Data > 64KB

**What goes wrong:** `btoa(String.fromCharCode(...new Uint8Array(arrayBuf)))` uses spread operator. For large images (>1MB) this causes `Maximum call stack size exceeded` because `String.fromCharCode` with spread exhausts the stack for large arrays.

**Why it happens:** Spread of large typed arrays into function arguments exceeds V8/Deno's argument count limit.

**How to avoid:** Use chunked base64 encoding in the Edge Function:
```typescript
// Safe base64 for large Uint8Arrays in Deno
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
```

**Warning signs:** Edge Function crashes on images > ~500KB with stack overflow error.

### Pitfall 3: PDF Request Payload Exceeds 32MB API Limit

**What goes wrong:** Student uploads a large PDF (textbook chapter, 50 pages, 25MB). Edge Function downloads and base64-encodes it. Base64 adds ~33% overhead → 33MB. Anthropic API returns 413 because the standard endpoint has a 32MB request size limit.

**Why it happens:** Base64 encoding inflates size by 1.33×. A 24MB PDF becomes 32MB+ in the request body.

**How to avoid:** Hard-block uploads above 20MB in `validateDocFile` (which produces ~26.6MB base64 — safely under 32MB). Warn at 15MB. A 20MB cap is generous for syllabi and handouts (typical 1–10 page PDFs are under 5MB).

**Warning signs:** Anthropic API returns 413 from Edge Function; users report "PDF didn't work" on large files.

### Pitfall 4: Supabase Storage `download()` Returns Empty Blob Type

**What goes wrong:** `blob.type` comes back as `""` or `"application/octet-stream"` regardless of the original upload MIME type. This was documented in Phase 10 research for audio and applies equally to image/PDF.

**Why it happens:** Supabase Storage does not always preserve the original Content-Type header on download in all environments.

**How to avoid:** Same pattern as `transcribe-voice`: detect extension from `storageKey.split(".").pop()` and build a `mimeByExt` map for the Edge Function. Do not rely on `blob.type` for routing the Claude content block type.

**Warning signs:** Claude returns error about unrecognized image type; blob type is `""` in edge function logs.

### Pitfall 5: Extracted Text Too Short for `transcribe-note`

**What goes wrong:** Claude OCR returns a very short text (photo is blurry, PDF is blank cover page, etc.). Feeding this into `transcribe-note` wastes tokens and produces an unhelpful outline.

**Why it happens:** Same root cause as Pitfall 7 in Phase 10 research (Whisper hallucination on silence). OCR can also produce minimal output on bad images.

**How to avoid:** Same guard as `triggerAudioTranscription`: check `text.length < MIN_TRANSCRIPT_CHARS` (20). Write the short text to `body_text` but skip the `transcribe-note` fire-and-forget. Surface `{ kind: "tooShort" }` in the UI with a calm message.

**Warning signs:** Users see empty outlines after photo upload; short `body_text` values in database.

### Pitfall 6: `heic2any` Lazy Import Fails in Older Next.js Versions

**What goes wrong:** Dynamic `import("heic2any")` in a Client Component fails at build time or runtime in some Next.js 15 Turbopack configurations.

**Why it happens:** `heic2any` has WASM internals that may conflict with Next.js module bundling.

**How to avoid:** Test `heic2any` early in Wave 0. If Turbopack has issues, wrap the conversion in a `typeof window !== "undefined"` guard and use `next/dynamic` with `ssr: false` at the component level. Alternatively, fall back to an approach where HEIC uploads to Storage succeed but a message tells the user "For best results, share as JPEG from the iPhone Files app" — but first try heic2any as it works in most cases per npm download stats.

**Warning signs:** Build fails with WASM-related errors; `heic2any` undefined at runtime.

---

## Code Examples

### Unified Edge Function — file type routing

```typescript
// supabase/functions/extract-note-doc/index.ts
// Source: Pattern derived from transcribe-voice/index.ts (Phase 10) + Anthropic vision/pdf docs

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Note: checkTokenBudget, resetBudgetIfNewDay, logInteraction, incrementTokens
// must be imported from ../_shared/safety.ts and called per CLAUDE.md pattern

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Body type: { storageKey: string; noteId: string; bucket?: string }
// Returns: { ok: true; text: string } | { ok: false; error: string }
```

### validateDocFile — mirrors validateAudioFile

```typescript
// lib/notes/upload-validation-doc.ts
// Separate file — do NOT modify upload-validation.ts (audio file validator)

export const DOC_MAX_FILE_BYTES = 20 * 1024 * 1024;   // 20MB hard block
export const DOC_WARN_FILE_BYTES = 10 * 1024 * 1024;  // 10MB soft warning
export const DOC_MAX_PDF_BYTES = 20 * 1024 * 1024;    // same as max

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"] as const;
export const ALLOWED_PDF_EXTENSIONS = ["pdf"] as const;
export const ALLOWED_DOC_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_PDF_EXTENSIONS,
] as const;

export function isImageExt(ext: string): boolean {
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export function isPdfExt(ext: string): boolean {
  return ext === "pdf";
}

export function validateDocFile(file: File): ValidationResult & { needsHeicConvert?: boolean } {
  const ext = getExtension(file.name);
  if (!(ALLOWED_DOC_EXTENSIONS as readonly string[]).includes(ext)) {
    return {
      ok: false,
      error: "Pick a photo (.jpg, .png, .heic) or PDF file.",
    };
  }
  if (file.size >= DOC_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "That file is too large to process. Photos work best under 10 MB, and PDFs under 20 MB.",
    };
  }
  if (file.size >= DOC_WARN_FILE_BYTES) {
    return {
      ok: true,
      warning: "This is a large file. It will still process, but may take a little longer.",
    };
  }
  const needsHeicConvert = ext === "heic" || ext === "heif";
  return { ok: true, needsHeicConvert };
}
```

### Server action: uploadNoteDoc (mirrors uploadNoteAudio)

```typescript
// app/(app)/notes/actions.ts — add alongside existing uploadNoteAudio

export async function uploadNoteDoc(
  formData: FormData,
): Promise<{ ok: true; storageKey: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const file = formData.get("doc") as File | null;
  if (!file) return { ok: false, error: "No file provided." };

  const ext = file.name.split(".").pop() ?? "jpg";
  const storageKey = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("note-docs")
    .upload(storageKey, file, { contentType: file.type });

  if (error) return { ok: false, error: error.message };
  return { ok: true, storageKey };
}
```

### Migration: new storage column + bucket creation note

```sql
-- supabase/migrations/0019_note_docs_bucket.sql
-- Phase 11: F04-PHOTO / F08-NOTE — photo and PDF upload support
-- Note: Supabase Storage bucket "note-docs" must be created via dashboard or
-- management API before deploying this migration. Bucket settings:
--   name: note-docs
--   public: false
--   fileSizeLimit: 20971520 (20MB)
--   allowedMimeTypes: image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif, application/pdf
--
-- (Supabase SQL migrations cannot directly CREATE storage buckets —
--  use the dashboard Storage tab or supabase CLI: supabase storage buckets create)

ALTER TABLE public.notes
  ADD COLUMN doc_storage_key text;

COMMENT ON COLUMN public.notes.doc_storage_key IS
  'Storage key in note-docs bucket for photo/PDF uploads (Phase 11).';
```

---

## Reuse Checklist

| Asset | Reuse Verdict | Notes |
|-------|--------------|-------|
| `lib/notes/class-router.ts` | Direct reuse — no changes | Works on any text string; OCR output qualifies |
| `supabase/functions/transcribe-note/index.ts` | Direct reuse — no changes | Reads `notes.body_text`; extraction writes there |
| `app/(app)/notes/new/audio-upload-tab.tsx` | Pattern reuse only — create parallel `doc-upload-tab.tsx` | Copy structure; change MIME whitelist, add `heicConverting` state, remove Whisper-specific logic |
| `app/(app)/notes/actions.ts` | Extend — add `uploadNoteDoc` + `triggerDocExtraction` | Mirror `uploadNoteAudio` + `triggerAudioTranscription` |
| `lib/notes/upload-validation.ts` | No changes | Audio-only; create separate `upload-validation-doc.ts` |
| `lib/notes/mime.ts` | No changes | Audio-only MIME helpers; doc helpers go in new file |
| `app/(app)/notes/new/note-editor.tsx` | Extend — add 4th tab | Add `"doc"` tab alongside existing "text" / "voice" / "upload" |
| `supabase/functions/_shared/safety.ts` | Extend — add `"doc_extract"` to feature union | Keep in sync with `lib/ai/safety.ts` |
| `lib/ai/safety.ts` | Extend — add `"doc_extract"` to `LogParams.feature` | Required by CLAUDE.md "Adding a new AI feature" checklist |
| `app/(app)/notes/actions.ts` — `triggerAudioTranscription` pattern | Direct pattern reuse in `triggerDocExtraction` | Same await/fire-and-forget structure; same `MIN_TRANSCRIPT_CHARS` guard |

---

## Storage Bucket Design

**Decision: New `note-docs` bucket (do not add photos/PDFs to `note-audio`).**

Rationale:
- `note-audio` has a 26MB limit set for audio files and MIME types restricted to audio formats. Modifying it breaks the existing audio flow.
- Separation makes it obvious in the Supabase dashboard which bucket holds which content type.
- Storage policies can differ (audio vs. docs may have different retention needs).

**Bucket configuration:**
- Name: `note-docs`
- Public: `false` (same as `note-audio`)
- File size limit: `20MB` (20,971,520 bytes) — matches `DOC_MAX_FILE_BYTES`
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif, application/pdf`
- RLS: same owner-only policy pattern as `note-audio`

**Storage key pattern:** `{user.id}/{Date.now()}.{ext}` — mirrors audio bucket pattern.

---

## Edge Function Design: `extract-note-doc`

**Single unified function** — no split between `extract-note-image` and `extract-note-pdf`.

Rationale:
- Both image and PDF flows share: download from Storage → base64 encode → Claude call → write `body_text` → fire-and-forget `transcribe-note`.
- The only difference is the Claude content block type (`image` vs `document`). A single `isPdf` branch handles this.
- Fewer functions = less deployment overhead.

**Request body:**
```json
{ "storageKey": "user-uuid/1234567890.jpg", "noteId": "uuid", "bucket": "note-docs" }
```

**Internal flow:**
1. Validate `storageKey` + `noteId` present
2. Confirm note ownership via Supabase DB query (belt-and-suspenders, same as `transcribe-voice`)
3. Check token budget (`resetBudgetIfNewDay` + `checkTokenBudget`) — return 402-style error if budget exhausted
4. Download blob from `note-docs` bucket
5. Detect file type from `storageKey` extension → resolve `mimeType`
6. Chunked base64 encode (Pitfall 2 guard)
7. Build Claude request: `image` block for images, `document` block for PDFs
8. Await Claude response, extract text
9. Guard on `text.length < 20` (Pitfall 5 guard) → write short text + return `tooShort`
10. Write `body_text` + `doc_storage_key` + `updated_at` to notes row
11. Fire-and-forget `transcribe-note` (exact same invocation as Phase 10)
12. Fire-and-forget `logInteraction` + `incrementTokens`
13. Return `{ ok: true, text }`

**Model:** `claude-sonnet-4-6` — consistent with CLAUDE.md "quality ops" rule. Handwriting OCR is quality-sensitive.

**System prompt for images:**
```
You are extracting handwritten text from a student's class notes photo.
Extract ALL visible text. Preserve the student's original words exactly — do not correct spelling or grammar.
If text is unclear, write [unclear] as a placeholder.
Output the extracted text only, no preamble, no JSON wrapper.
```

**System prompt for PDFs:**
```
Extract all text content from this document.
Preserve headings, lists, and paragraph breaks as plain text.
Output the extracted text only, no preamble, no JSON wrapper.
```

*(Both prompts will be assembled via `composeSystemPrompt` with `CALM_TONE` etc. injected per CLAUDE.md pattern — but since these are extraction prompts, not student-facing responses, the calm tone system prompt won't cause issues.)*

**Note on `composeSystemPrompt`:** Check `supabase/functions/_shared/system-prompts.ts` — if `composeSystemPrompt` exists there, use it. If the extraction system prompt doesn't fit the standard pattern, it's acceptable to use a separate `EXTRACT_SYSTEM_PROMPT` constant as `transcribe-note` does (it also uses a standalone `SYSTEM_PROMPT` constant).

---

## Migration Requirements

| What | How | Migration File |
|------|-----|---------------|
| Add `doc_storage_key text` column to `notes` | `ALTER TABLE public.notes ADD COLUMN doc_storage_key text` | `0019_note_docs_bucket.sql` |
| Create `note-docs` Storage bucket | Supabase CLI or dashboard (cannot be done in SQL migration) | Document as comment in migration + Wave 0 task |
| Add `"doc_extract"` to `LogParams.feature` union | TypeScript edit in `lib/ai/safety.ts` + mirror in `_shared/safety.ts` | Code change, no migration |

No new DB tables needed — `notes.doc_storage_key` column is sufficient.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `heic2any` install | Available | checked via existing `package.json` | — |
| Anthropic API (`claude-sonnet-4-6`) | `extract-note-doc` Edge Function | Available | already used by `transcribe-note` | — |
| Supabase Storage | `note-docs` bucket | Available — existing project | — | — |
| `heic2any` npm package | HEIC client conversion | Not yet installed | 0.0.4 | Fallback: block HEIC uploads with calm message "Please share this photo as JPEG from your Files app" |

---

## Validation Architecture

nyquist_validation is enabled (config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | inferred from `vitest.config.ts` or `package.json` |
| Quick run command | `npx vitest run lib/notes/` |
| Full suite command | `npm run test:run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| F04-PHOTO | `validateDocFile` accepts jpg/png/webp/heic, rejects mp3/docx | unit | `npx vitest run lib/notes/upload-validation-doc.test.ts` | Wave 0 |
| F04-PHOTO | `validateDocFile` hard-blocks at 20MB, warns at 10MB | unit | `npx vitest run lib/notes/upload-validation-doc.test.ts` | Wave 0 |
| F04-PHOTO | `validateDocFile` sets `needsHeicConvert: true` for .heic/.heif | unit | `npx vitest run lib/notes/upload-validation-doc.test.ts` | Wave 0 |
| F04-PHOTO | `isImageExt` / `isPdfExt` helpers correct | unit | `npx vitest run lib/notes/upload-validation-doc.test.ts` | Wave 0 |
| F08-NOTE | `scoreClassMatch` works on OCR-extracted text (integration) | unit | `npx vitest run lib/notes/class-router.test.ts` | Exists (Phase 10) |
| F08-NOTE | `DocUploadTab` renders idle state, shows HEIC converting status | component | `npx vitest run components/doc-upload-tab.test.tsx` (if created) | Wave 0 |

Edge Function behavior (`extract-note-doc`) is manual-only — Deno Edge Functions cannot be unit-tested in the Vitest environment without a Deno runtime.

### Sampling Rate

- **Per task commit:** `npx vitest run lib/notes/`
- **Per wave merge:** `npm run test:run`
- **Phase gate:** Full suite green + `npm run tone-audit` passes before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/notes/upload-validation-doc.test.ts` — covers F04-PHOTO validation rules
- [ ] `lib/notes/upload-validation-doc.ts` — the module under test (created in Wave 1)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tesseract.js for browser OCR | Claude Vision API for server-side OCR | 2023–2024 (Claude 3 launch) | No WASM bundle in browser; better handwriting accuracy |
| pdf-parse npm for PDF text | Claude document block | 2024 (Claude PDF support GA) | Handles scanned PDFs; no Node.js dep needed in Deno |
| Files API for re-use | Inline base64 for single-use | — | Files API (beta as of 2025) has overhead; inline is simpler for per-upload use |

**Deprecated/outdated:**
- Tesseract.js for handwriting: still works for printed text but inferior to Claude for cursive/mixed. Not worth the WASM bundle weight.
- `pdf-parse` in Edge Functions: requires Node.js compatibility mode in Deno; not reliable.

---

## Open Questions

1. **`composeSystemPrompt` compatibility for extraction prompts**
   - What we know: `supabase/functions/_shared/system-prompts.ts` exists but was not read in this research pass.
   - What's unclear: Whether the shared system prompt builder's safety injections (`CALM_TONE`, etc.) conflict with a terse extraction-only prompt.
   - Recommendation: Read `system-prompts.ts` during Wave 0 planning. If `composeSystemPrompt` wraps the system prompt in student-facing language, use a standalone `EXTRACT_SYSTEM_PROMPT` constant (same pattern as `transcribe-note`).

2. **`heic2any` Turbopack compatibility**
   - What we know: `heic2any` uses WASM internally; Turbopack is Next.js 15's default bundler.
   - What's unclear: Whether Turbopack handles the WASM imports in `heic2any` correctly.
   - Recommendation: Install `heic2any` in Wave 0 and run a quick smoke test. If Turbopack rejects it, fallback strategy is to block HEIC with a calm instructional message rather than converting.

3. **Tab label in `NoteEditor`**
   - What we know: The existing `NoteEditor` has tabs: "Text", "Voice", "Upload" (audio). Adding a 4th tab "Photo/PDF" changes the tab row.
   - What's unclear: Whether the "Upload" tab gets renamed (e.g., "Audio" + "Photo/PDF") or a new tab is added alongside it.
   - Recommendation: Rename existing "Upload" tab to "Audio" and add "Photo/PDF" as a 4th tab. Keeps the audio upload exactly as-is and adds the new flow in a separate tab. The planner should confirm with the task description.

---

## Sources

### Primary (HIGH confidence)

- `https://platform.claude.com/docs/en/docs/build-with-claude/vision` — image formats (JPEG/PNG/GIF/WebP only; HEIC not supported), base64 inline pattern, token cost table for Sonnet 4.6, max dimensions 8000×8000px
- `https://platform.claude.com/docs/en/docs/build-with-claude/files` — Files API beta (`files-api-2025-04-14`), supported types (PDF as document block, images as image block), 500MB file limit (Files API); confirmed PDF/image are independent of Files API (inline base64 works without beta header)
- `https://platform.claude.com/docs/en/docs/build-with-claude/pdf-support` — PDF as `document` content block, base64 or URL source, 32MB request limit, 600 pages max, 1500-3000 tokens per page, all active models supported
- Phase 10 codebase files read directly: `lib/notes/mime.ts`, `lib/notes/upload-validation.ts`, `lib/notes/class-router.ts`, `supabase/functions/transcribe-voice/index.ts`, `supabase/functions/transcribe-note/index.ts`, `app/(app)/notes/new/audio-upload-tab.tsx`, `app/(app)/notes/actions.ts`, `app/(app)/notes/new/note-editor.tsx`, `supabase/migrations/0011_notes_and_flashcards.sql`, `supabase/migrations/0018_notes_class_id.sql`, `supabase/functions/_shared/safety.ts`, `lib/ai/safety.ts`

### Secondary (MEDIUM confidence)

- WebSearch: Claude Vision confirmed to support JPEG/PNG/GIF/WebP only; HEIC explicitly not listed (multiple sources consistent with official docs)
- WebSearch: `heic2any` npm — confirmed as the standard browser-side HEIC converter; widely used, uses libheif WASM

### Tertiary (LOW confidence)

- WebSearch: Supabase Storage `allowedMimeTypes` wildcard behavior — general pattern confirmed but HEIC-specific behavior not officially documented; treat `image/heic` as a valid allowable MIME for bucket config (Supabase accepts any string in the array)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Claude Vision and PDF blocks verified via official Anthropic docs; heic2any verified via npm
- Architecture: HIGH — Phase 10 pattern read directly from codebase; new function mirrors confirmed existing patterns exactly
- Pitfalls: HIGH for Pitfalls 1–5 (verified against docs and Phase 10 research); MEDIUM for Pitfall 6 (heic2any/Turbopack compatibility — not yet verified empirically)

**Research date:** 2026-05-31
**Valid until:** 2026-08-31 (Anthropic API stable; heic2any changes rarely)
