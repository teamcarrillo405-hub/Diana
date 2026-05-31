/**
 * Phase 11: F04-PHOTO / F08-NOTE — photo and PDF upload validator.
 *
 * Parallel to lib/notes/upload-validation.ts (audio).
 * - Audio module is unchanged (Phase 10).
 * - This module handles images (jpg/jpeg/png/webp/gif/heic/heif) and PDFs.
 *
 * Why a separate module: different size caps (20 MB vs 25 MB),
 * different MIME whitelist, and HEIC needs client-side conversion before
 * upload (see lib/notes/heic-convert.ts and Pitfall 1 in RESEARCH.md).
 *
 * Pitfall 3 guard: 20 MB hard cap keeps base64-encoded payloads safely
 * under the 32 MB Anthropic request limit (20 MB times 1.33 = 26.6 MB).
 */

import { getExtension } from "./mime";

/** Hard block above this size. 20 MB keeps base64 payload under Anthropic 32 MB request limit (Pitfall 3). */
export const DOC_MAX_FILE_BYTES = 20 * 1024 * 1024;

/** Soft amber-warning threshold. File still uploads; user is informed it may take longer. */
export const DOC_WARN_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif",
] as const;
export type AllowedImageExtension = typeof ALLOWED_IMAGE_EXTENSIONS[number];

export const ALLOWED_PDF_EXTENSIONS = ["pdf"] as const;
export type AllowedPdfExtension = typeof ALLOWED_PDF_EXTENSIONS[number];

export const ALLOWED_DOC_EXTENSIONS = [
  ...ALLOWED_IMAGE_EXTENSIONS,
  ...ALLOWED_PDF_EXTENSIONS,
] as const;
export type AllowedDocExtension = typeof ALLOWED_DOC_EXTENSIONS[number];

export interface DocValidationResult {
  ok: boolean;
  /** Calm amber notice — file proceeds but user is informed. */
  warning?: string;
  /** Hard block — file is rejected before upload. Calm copy only. */
  error?: string;
  /** True if the file is HEIC/HEIF and must be converted client-side before upload (Pitfall 1). */
  needsHeicConvert?: boolean;
}

export function isImageExt(ext: string): boolean {
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}

export function isPdfExt(ext: string): boolean {
  return ext === "pdf";
}

function isAllowedDoc(ext: string): ext is AllowedDocExtension {
  return (ALLOWED_DOC_EXTENSIONS as readonly string[]).includes(ext);
}

export function validateDocFile(file: File): DocValidationResult {
  const ext = getExtension(file.name);

  if (!isAllowedDoc(ext)) {
    return {
      ok: false,
      error: "Pick a photo (.jpg, .png, .heic, .webp) or a .pdf file.",
    };
  }

  if (file.size >= DOC_MAX_FILE_BYTES) {
    return {
      ok: false,
      error: "That file is at or above 20 MB. Photos work best under 10 MB and PDFs under 20 MB. Try a smaller version.",
    };
  }

  const needsHeicConvert = ext === "heic" || ext === "heif";

  if (file.size >= DOC_WARN_FILE_BYTES) {
    return {
      ok: true,
      warning: "This is a large file. It will still process, but may take a little longer.",
      needsHeicConvert,
    };
  }

  return { ok: true, needsHeicConvert };
}
