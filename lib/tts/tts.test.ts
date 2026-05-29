// lib/tts/tts.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  splitWordsWithOffsets,
  estimateMsPerWord,
  scheduleFallbackTimers,
  safeCancel,
} from "./tts-utils";

describe("splitWordsWithOffsets", () => {
  it("returns correct start and length for two words", () => {
    const result = splitWordsWithOffsets("Hello world");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ word: "Hello", start: 0, length: 5 });
    expect(result[1]).toEqual({ word: "world", start: 6, length: 5 });
  });

  it("skips leading and trailing whitespace", () => {
    const result = splitWordsWithOffsets("  spaced  ");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ word: "spaced", start: 2, length: 6 });
  });

  it("returns empty array for empty string", () => {
    expect(splitWordsWithOffsets("")).toHaveLength(0);
  });

  it("handles punctuation attached to words", () => {
    const result = splitWordsWithOffsets("Hello, world!");
    expect(result[0].word).toBe("Hello,");
    expect(result[1].word).toBe("world!");
  });
});

describe("estimateMsPerWord", () => {
  it("returns 400ms at rate 1.0", () => {
    expect(estimateMsPerWord(1.0)).toBe(400);
  });

  it("returns 200ms at rate 2.0 (double speed = half time)", () => {
    expect(estimateMsPerWord(2.0)).toBe(200);
  });

  it("returns 800ms at rate 0.5 (half speed = double time)", () => {
    expect(estimateMsPerWord(0.5)).toBe(800);
  });
});

describe("scheduleFallbackTimers", () => {
  it("schedules one timer per word", () => {
    vi.useFakeTimers();
    const words = splitWordsWithOffsets("one two three");
    const timersRef: { current: ReturnType<typeof setTimeout>[] } = { current: [] };
    const onWord = vi.fn();
    scheduleFallbackTimers(words, 1.0, onWord, timersRef);
    expect(timersRef.current).toHaveLength(3);
    vi.useRealTimers();
  });
});

describe("safeCancel", () => {
  it("calls resume() then cancel() when paused", () => {
    const synth = { paused: true, resume: vi.fn(), cancel: vi.fn() };
    safeCancel(synth);
    expect(synth.resume).toHaveBeenCalledOnce();
    expect(synth.cancel).toHaveBeenCalledOnce();
    // resume must be called before cancel
    expect(synth.resume.mock.invocationCallOrder[0]).toBeLessThan(
      synth.cancel.mock.invocationCallOrder[0]
    );
  });

  it("does not call resume() when not paused", () => {
    const synth = { paused: false, resume: vi.fn(), cancel: vi.fn() };
    safeCancel(synth);
    expect(synth.resume).not.toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalledOnce();
  });
});
