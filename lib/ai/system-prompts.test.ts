import { describe, expect, it } from "vitest";
import { buildPersonalizationPrompt, composeSystemPrompt } from "./system-prompts";

describe("buildPersonalizationPrompt", () => {
  it("uses up to five student interests as analogy context", () => {
    const prompt = buildPersonalizationPrompt({
      interests: ["gaming", "music", "sports", "coding", "space", "cooking"],
    });

    expect(prompt).toContain("gaming, music, sports, coding, space");
    expect(prompt).not.toContain("cooking");
    expect(prompt).toContain("Do not force an analogy");
  });

  it("adds rough-session guidance without interest context", () => {
    const prompt = buildPersonalizationPrompt({ interests: [], sessionMood: "rough" });

    expect(prompt).toContain("shorter steps");
  });

  it("injects personalization before invariant fragments", () => {
    const prompt = composeSystemPrompt("Feature prompt", {
      personalization: "Student personalization:\nThe student chose music.",
    });

    expect(prompt.indexOf("Student personalization")).toBeGreaterThan(prompt.indexOf("Feature prompt"));
    expect(prompt.indexOf("Student personalization")).toBeLessThan(prompt.indexOf("Tone: calm"));
  });

  it("injects source anchoring into every composed prompt", () => {
    const prompt = composeSystemPrompt("Feature prompt");

    expect(prompt).toContain("anchor help to that material");
    expect(prompt).toContain("Rubric line 1");
  });

  it("injects Diana's competitive learning loop into every composed prompt", () => {
    const prompt = composeSystemPrompt("Feature prompt");

    expect(prompt).toContain("ask one targeted question");
    expect(prompt).toContain("knowledge check or authorship receipt");
  });
});
