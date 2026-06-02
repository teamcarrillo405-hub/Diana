import { describe, expect, it } from "vitest";
import { parseIepText } from "./import";

describe("parseIepText", () => {
  it("extracts extended time and TTS accommodations", () => {
    const summary = parseIepText("Student receives time and a half, text-to-speech, and reduced distraction setting.");
    expect(summary.extraTimePct).toBe(50);
    expect(summary.accommodations).toEqual(expect.arrayContaining(["extended_time", "reader", "quiet_setting"]));
    expect(summary.ttsEnabled).toBe(true);
  });

  it("detects dyslexia-friendly reading preferences", () => {
    const summary = parseIepText("Reading disability. Use large print and increased spacing.");
    expect(summary.dyslexiaFont).toBe(true);
    expect(summary.fontSize).toBe("large");
    expect(summary.lineSpacing).toBe("loose");
  });
});
