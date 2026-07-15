import { describe, it, expect } from "vitest";
import {
  validateAudioFile,
  MAX_FILE_BYTES,
  WARN_FILE_BYTES,
  ALLOWED_EXTENSIONS,
} from "./upload-validation";

function makeFile(name: string, sizeBytes: number, mime = "audio/mp4"): File {
  // Backing the File with a fixed-length Uint8Array is the cheapest way
  // to create a File with a predictable .size in Node.
  const buf = new Uint8Array(sizeBytes);
  return new File([buf], name, { type: mime });
}

describe("validateAudioFile", () => {
  it("accepts a tiny .m4a as-is", () => {
    const r = validateAudioFile(makeFile("clip.m4a", 1024));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeUndefined();
    expect(r.error).toBeUndefined();
  });

  it("warns at WARN_FILE_BYTES (20 MB)", () => {
    const r = validateAudioFile(makeFile("clip.m4a", WARN_FILE_BYTES));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeDefined();
  });

  it("warns at 24 MB (between WARN and MAX)", () => {
    const r = validateAudioFile(makeFile("clip.m4a", 24 * 1024 * 1024));
    expect(r.ok).toBe(true);
    expect(r.warning).toBeDefined();
  });

  it("blocks at exactly MAX_FILE_BYTES (25 MB Whisper limit)", () => {
    const r = validateAudioFile(makeFile("clip.m4a", MAX_FILE_BYTES));
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("blocks at 30 MB", () => {
    const r = validateAudioFile(makeFile("clip.m4a", 30 * 1024 * 1024));
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("rejects .txt files (wrong type)", () => {
    const r = validateAudioFile(makeFile("notes.txt", 1024));
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("rejects files with no extension", () => {
    const r = validateAudioFile(makeFile("clip", 1024));
    expect(r.ok).toBe(false);
    expect(r.error).toBeDefined();
  });

  it("is case-insensitive on extension", () => {
    const r = validateAudioFile(makeFile("CLIP.M4A", 1024));
    expect(r.ok).toBe(true);
  });

  it("warning copy is calm: no banned words", () => {
    const r = validateAudioFile(makeFile("clip.m4a", WARN_FILE_BYTES));
    expect(r.warning).toBeDefined();
    const w = (r.warning ?? "").toLowerCase();
    expect(w).not.toMatch(/failed|wrong|incorrect|too large|bad|behind/);
    // Affirmative framing
    expect(w).toMatch(/best|recommend|under|works best/);
  });

  it("error copy is calm: no banned words", () => {
    const r = validateAudioFile(makeFile("clip.m4a", MAX_FILE_BYTES));
    expect(r.error).toBeDefined();
    const e = (r.error ?? "").toLowerCase();
    expect(e).not.toMatch(/failed|wrong|incorrect|bad|behind/);
  });
});

describe("ALLOWED_EXTENSIONS", () => {
  it("contains exactly m4a, mp3, wav, webm", () => {
    expect([...ALLOWED_EXTENSIONS].sort()).toEqual(["m4a", "mp3", "wav", "webm"]);
  });
});
