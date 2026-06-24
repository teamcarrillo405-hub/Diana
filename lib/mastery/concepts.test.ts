import { describe, expect, it } from "vitest";
import {
  deriveConceptSeeds,
  fallbackConceptsForClass,
  gapBridgeSuggestion,
  isWeakConceptName,
  masteryLevelFromAiQuizResult,
  masteryLevelFromCorrectReviews,
  normalizeConceptNames,
} from "./concepts";

describe("deriveConceptSeeds", () => {
  it("returns at least five stable concepts", () => {
    const concepts = deriveConceptSeeds([
      "mitochondria, cell membrane, ATP",
      "ATP powers cells. Mitochondria make ATP.",
    ], 5, { className: "Biology", teacherName: "Dr. Patel" });
    expect(concepts.length).toBeGreaterThanOrEqual(5);
    expect(concepts).toContain("cell organelles");
  });

  it("filters teacher names and class-management boilerplate", () => {
    const concepts = deriveConceptSeeds([
      "Teacher gather: Dr. Patel wants current unit, office hours, and preferred submission format.",
      "Student gather: cell organelles, visual evidence, and lab reasoning.",
    ], 5, { className: "Biology", teacherName: "Dr. Patel" });

    expect(concepts).toContain("visual evidence");
    expect(concepts).not.toContain("dr patel");
    expect(concepts).not.toContain("teacher gather");
    expect(concepts).not.toContain("submission format");
  });
});

describe("normalizeConceptNames", () => {
  it("dedupes and cleans names", () => {
    expect(normalizeConceptNames(["Cell Membrane!", "cell membrane", "ATP"])).toEqual([
      "cell membrane",
      "atp",
    ]);
  });
});

describe("fallbackConceptsForClass", () => {
  it("uses subject-specific fallbacks for freshman classes", () => {
    expect(fallbackConceptsForClass("Algebra I")).toContain("slope intercept form");
    expect(fallbackConceptsForClass("English 9")).toContain("claim evidence reasoning");
  });
});

describe("isWeakConceptName", () => {
  it("flags teacher names and generic fallback concepts", () => {
    expect(isWeakConceptName("Dr Patel Biology", { className: "Biology", teacherName: "Dr. Patel" })).toBe(true);
    expect(isWeakConceptName("key vocabulary", { className: "Biology" })).toBe(true);
    expect(isWeakConceptName("cell organelles", { className: "Biology", teacherName: "Dr. Patel" })).toBe(false);
  });
});

describe("masteryLevelFromCorrectReviews", () => {
  it("increases after three correct reviews", () => {
    expect(masteryLevelFromCorrectReviews(2)).toBe(0);
    expect(masteryLevelFromCorrectReviews(3)).toBe(1);
    expect(masteryLevelFromCorrectReviews(12)).toBe(4);
  });
});

describe("masteryLevelFromAiQuizResult", () => {
  it("moves mastery toward an AI quiz rating conservatively", () => {
    expect(masteryLevelFromAiQuizResult(1, 4)).toBe(2);
    expect(masteryLevelFromAiQuizResult(3, 1)).toBe(2.5);
    expect(masteryLevelFromAiQuizResult(4, 4)).toBe(4);
  });
});

describe("gapBridgeSuggestion", () => {
  it("bridges from a stronger concept when available", () => {
    expect(gapBridgeSuggestion("linear equations", "systems")).toContain("linear equations");
  });
});
