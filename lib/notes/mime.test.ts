import { describe, it, expect } from "vitest";
import { getMimeType, getExtension } from "./mime";

describe("getMimeType", () => {
  it("returns audio/mp4 for .m4a", () => {
    expect(getMimeType("note.m4a")).toBe("audio/mp4");
  });
  it("returns audio/mpeg for .mp3", () => {
    expect(getMimeType("recording.mp3")).toBe("audio/mpeg");
  });
  it("returns audio/wav for .wav", () => {
    expect(getMimeType("class.wav")).toBe("audio/wav");
  });
  it("returns audio/webm for .webm", () => {
    expect(getMimeType("clip.webm")).toBe("audio/webm");
  });
  it("is case-insensitive on extension", () => {
    expect(getMimeType("RECORDING.M4A")).toBe("audio/mp4");
  });
  it("handles paths and storage keys with slashes", () => {
    expect(getMimeType("user-id/1234567890.mp3")).toBe("audio/mpeg");
  });
  it("falls back to audio/webm for unknown extensions", () => {
    expect(getMimeType("file.ogg")).toBe("audio/webm");
    expect(getMimeType("noext")).toBe("audio/webm");
  });
});

describe("getExtension", () => {
  it("returns lowercased extension", () => {
    expect(getExtension("X.MP3")).toBe("mp3");
  });
  it("returns empty string when no extension", () => {
    expect(getExtension("noext")).toBe("");
  });
});
