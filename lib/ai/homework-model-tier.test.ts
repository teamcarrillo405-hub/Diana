import { describe, expect, it } from "vitest";

import {
  normalizeHomeworkAcademicBand,
  resolveHomeworkAcademicBand,
  selectHomeworkModelTier,
} from "./homework-model-tier";

describe("homework model-tier policy", () => {
  it("keeps ordinary middle-school science on the fast tutoring tier", () => {
    expect(selectHomeworkModelTier({
      task: "study_buddy",
      subjectDomain: "science",
      academicBand: "middle_foundation",
      signals: "Explain how photosynthesis moves energy through a plant.",
    })).toBe("fast");
  });

  it("routes advanced mathematics to the strongest reasoning tier", () => {
    expect(selectHomeworkModelTier({
      task: "study_buddy",
      subjectDomain: "mathematics",
      academicBand: "high_advanced",
      signals: "Review the next problem without giving the final answer.",
    })).toBe("complex");
  });

  it("preserves strongest reasoning for DBQ, research, coding, and technical work", () => {
    for (const signals of [
      "Plan a DBQ response from the source packet.",
      "Synthesize this research project into a supported outline.",
      "Debug this Python recursion exercise.",
      "Interpret this unfamiliar technical specification.",
    ]) {
      expect(selectHomeworkModelTier({
        task: "study_buddy",
        subjectDomain: "general",
        academicBand: "middle_foundation",
        signals,
      }), signals).toBe("complex");
    }
  });

  it("uses the same size and rubric thresholds for every caller", () => {
    expect(selectHomeworkModelTier({
      task: "study_buddy",
      sourceChars: 10_000,
    })).toBe("complex");
    expect(selectHomeworkModelTier({
      task: "assignment_review",
      sourceChars: 3_000,
      hasRubric: true,
    })).toBe("complex");
    expect(selectHomeworkModelTier({
      task: "assignment_review",
      sourceChars: 2_999,
      hasRubric: true,
    })).toBe("quality");
  });

  it("derives assignment bands from target rigor before learner grade", () => {
    expect(resolveHomeworkAcademicBand({ schoolYear: 7, targetAcademicLevel: "grade_level" }))
      .toBe("middle_foundation");
    expect(resolveHomeworkAcademicBand({ schoolYear: 7, targetAcademicLevel: "advanced_high_school" }))
      .toBe("high_advanced");
    expect(resolveHomeworkAcademicBand({ targetAcademicLevel: "college_advanced" }))
      .toBe("postsecondary_advanced");
    expect(resolveHomeworkAcademicBand({ targetAcademicLevel: "unknown" })).toBeNull();
  });

  it("normalizes academic-band values at untrusted runtime boundaries", () => {
    expect(normalizeHomeworkAcademicBand(" High-Advanced ")).toBe("high_advanced");
    expect(normalizeHomeworkAcademicBand("postsecondary intro")).toBe("postsecondary_intro");
    expect(normalizeHomeworkAcademicBand("advanced")).toBeNull();
    expect(normalizeHomeworkAcademicBand(null)).toBeNull();
  });
});
