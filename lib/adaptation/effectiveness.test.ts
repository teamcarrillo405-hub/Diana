import { describe, it, expect } from "vitest";
import {
  adaptationPromptLine,
  adaptationSummary,
  computeEffectiveness,
  preferredStudyMode,
  type FeedbackEvent,
} from "./effectiveness";

let tick = 0;
function event(feature: string, helpful: boolean): FeedbackEvent {
  tick += 1;
  return { feature, helpful, createdAt: `2026-06-0${(tick % 9) + 1}T0${tick % 10}:00:00Z` };
}

function repeat(feature: string, helpful: boolean, n: number): FeedbackEvent[] {
  return Array.from({ length: n }, () => event(feature, helpful));
}

describe("computeEffectiveness", () => {
  it("stays neutral below the sample minimum, regardless of direction", () => {
    const out = computeEffectiveness(repeat("subject:math", true, 2));
    expect(out[0].stance).toBe("neutral");
    expect(out[0].samples).toBe(2);
  });

  it("leans in after enough helpful taps", () => {
    const out = computeEffectiveness(repeat("study_mode:retrieval_quiz", true, 4));
    expect(out[0].stance).toBe("lean_in");
    expect(out[0].score).toBeGreaterThan(0.8);
  });

  it("eases off after consistent not-helpful taps", () => {
    const out = computeEffectiveness(repeat("subject:writing", false, 4));
    expect(out[0].stance).toBe("ease_off");
  });

  it("smoothing keeps small samples humble", () => {
    // 3/3 helpful → (3+1)/(3+2) = 0.8, not 1.0
    const out = computeEffectiveness(repeat("subject:math", true, 3));
    expect(out[0].score).toBeCloseTo(0.8);
  });

  it("ranks features by score for downstream picks", () => {
    const out = computeEffectiveness([
      ...repeat("study_mode:guided_steps", true, 3),
      ...repeat("study_mode:visual_breakdown", false, 3),
    ]);
    expect(out[0].feature).toBe("study_mode:guided_steps");
    expect(out[1].feature).toBe("study_mode:visual_breakdown");
  });
});

describe("preferredStudyMode", () => {
  it("returns the lean-in study mode", () => {
    const eff = computeEffectiveness(repeat("study_mode:visual_breakdown", true, 4));
    expect(preferredStudyMode(eff)).toBe("visual_breakdown");
  });

  it("ignores lean-in features that are not study modes", () => {
    const eff = computeEffectiveness(repeat("subject:math", true, 5));
    expect(preferredStudyMode(eff)).toBeNull();
  });

  it("returns null with no confident opinion", () => {
    const eff = computeEffectiveness(repeat("study_mode:retrieval_quiz", true, 2));
    expect(preferredStudyMode(eff)).toBeNull();
  });
});

describe("adaptationPromptLine", () => {
  it("returns null with no confident data", () => {
    expect(adaptationPromptLine(computeEffectiveness([]))).toBeNull();
    expect(adaptationPromptLine(computeEffectiveness(repeat("subject:math", true, 1)))).toBeNull();
  });

  it("names what landed and what to try differently, calmly", () => {
    const eff = computeEffectiveness([
      ...repeat("study_mode:retrieval_quiz", true, 4),
      ...repeat("subject:writing", false, 4),
    ]);
    const line = adaptationPromptLine(eff)!;
    expect(line).toContain("Quiz-style recall");
    expect(line).toContain("landed well");
    expect(line).toContain("writing studio");
    expect(line.toLowerCase()).not.toContain("failed");
    expect(line).not.toMatch(/\d/); // no scores or counts leak into prompts
  });
});

describe("adaptationSummary", () => {
  it("produces student-facing lines only for confident stances", () => {
    const eff = computeEffectiveness([
      ...repeat("study_mode:guided_steps", true, 4),
      ...repeat("subject:math", true, 1),
    ]);
    const lines = adaptationSummary(eff);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Step-by-step guidance");
    expect(lines[0]).toContain("working for you");
  });
});
