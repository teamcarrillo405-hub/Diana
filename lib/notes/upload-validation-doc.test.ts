import { describe, it, expect } from "vitest";
import {
  validateDocFile,
  isImageExt,
  isPdfExt,
  DOC_MAX_FILE_BYTES,
  DOC_WARN_FILE_BYTES,
  ALLOWED_DOC_EXTENSIONS,
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_PDF_EXTENSIONS,
} from "./upload-validation-doc";

function makeFile(name: string, sizeBytes: number, mime = "image/jpeg"): File {
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], name, { type: mime });
}

describe("validateDocFile — extension whitelist", () => {
  it("accepts .jpg", () => {
    expect(validateDocFile(makeFile("photo.jpg", 1024)).ok).toBe(true);
  });
  it("accepts .jpeg", () => {
    expect(validateDocFile(makeFile("photo.jpeg", 1024)).ok).toBe(true);
  });
  it("accepts .png", () => {
    expect(validateDocFile(makeFile("photo.png", 1024)).ok).toBe(true);
  });
  it("accepts .webp", () => {
    expect(validateDocFile(makeFile("photo.webp", 1024)).ok).toBe(true);
  });
  it("accepts .gif", () => {
    expect(validateDocFile(makeFile("animated.gif", 1024)).ok).toBe(true);
  });
  it("accepts .heic with needsHeicConvert=true", () => {
    const r = validateDocFile(makeFile("iphone.heic", 1024));
    expect(r.ok).toBe(true);
    expect(r.needsHeicConvert).toBe(true);
  });
  it("accepts .heif with needsHeicConvert=true", () => {
    const r = validateDocFile(makeFile("iphone.heif", 1024));
    expect(r.ok).toBe(true);
    expect(r.needsHeicConvert).toBe(true);
  });
  it("accepts .pdf with needsHeicConvert undefined or false", () => {
    const r = validateDocFile(makeFile("syllabus.pdf", 1024));
    expect(r.ok).toBe(true);
    expect(r.needsHeicConvert).toBeFalsy();
  });
  it("accepts case-insensitive extensions (.JPG, .PDF)", () => {
    expect(validateDocFile(makeFile("PHOTO.JPG", 1024)).ok).toBe(true);
    expect(validateDocFile(makeFile("SYLLABUS.PDF", 1024)).ok).toBe(true);
  });
  it("rejects .mp3 / .docx / no-extension", () => {
    expect(validateDocFile(makeFile("song.mp3", 1024)).ok).toBe(false);
    expect(validateDocFile(makeFile("notes.docx", 1024)).ok).toBe(false);
    expect(validateDocFile(makeFile("noext", 1024)).ok).toBe(false);
  });
});

describe("validateDocFile — size thresholds", () => {
  it("returns no warning under 10 MB", () => {
    const r = validateDocFile(makeFile("photo.jpg", 1024 * 1024));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeUndefined();
  });
  it("warns at WARN threshold (10 MB)", () => {
    const r = validateDocFile(makeFile("photo.jpg", DOC_WARN_FILE_BYTES));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeDefined();
  });
  it("warns at 15 MB (between WARN and MAX)", () => {
    const r = validateDocFile(makeFile("syllabus.pdf", 15 * 1024 * 1024));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeDefined();
  });
  it("hard-blocks at exactly MAX (20 MB)", () => {
    const r = validateDocFile(makeFile("huge.pdf", DOC_MAX_FILE_BYTES));
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });
  it("hard-blocks above MAX (30 MB)", () => {
    const r = validateDocFile(makeFile("huge.pdf", 30 * 1024 * 1024));
    expect(r.ok).toBe(false);
  });
});

describe("validateDocFile — calm copy invariant", () => {
  it("extension-rejection copy is calm", () => {
    const r = validateDocFile(makeFile("song.mp3", 1024));
    expect(r.error).toBeDefined();
    const e = (r.error ?? "").toLowerCase();
    expect(e).not.toMatch(/failed|wrong|incorrect|behind|bad/);
  });
  it("size-block copy is calm", () => {
    const r = validateDocFile(makeFile("huge.pdf", DOC_MAX_FILE_BYTES));
    const e = (r.error ?? "").toLowerCase();
    expect(e).not.toMatch(/failed|wrong|incorrect|behind/);
  });
  it("warning copy is calm", () => {
    const r = validateDocFile(makeFile("big.pdf", DOC_WARN_FILE_BYTES));
    const w = (r.warning ?? "").toLowerCase();
    expect(w).not.toMatch(/failed|wrong|incorrect|behind|bad/);
  });
});

describe("isImageExt / isPdfExt helpers", () => {
  it("isImageExt accepts all image extensions", () => {
    for (const e of ALLOWED_IMAGE_EXTENSIONS) {
      expect(isImageExt(e)).toBe(true);
    }
  });
  it("isImageExt rejects pdf and unrelated extensions", () => {
    expect(isImageExt("pdf")).toBe(false);
    expect(isImageExt("mp3")).toBe(false);
    expect(isImageExt("")).toBe(false);
  });
  it("isPdfExt accepts pdf only", () => {
    expect(isPdfExt("pdf")).toBe(true);
    expect(isPdfExt("jpg")).toBe(false);
  });
});

describe("ALLOWED_DOC_EXTENSIONS", () => {
  it("is union of image + pdf extensions", () => {
    expect(ALLOWED_DOC_EXTENSIONS).toContain("jpg");
    expect(ALLOWED_DOC_EXTENSIONS).toContain("heic");
    expect(ALLOWED_DOC_EXTENSIONS).toContain("pdf");
  });
  it("ALLOWED_PDF_EXTENSIONS is exactly pdf", () => {
    expect([...ALLOWED_PDF_EXTENSIONS]).toEqual(["pdf"]);
  });
});
