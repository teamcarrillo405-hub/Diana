import { describe, expect, it } from "vitest";
import {
  deriveConceptSeeds,
  gapBridgeSuggestion,
  masteryLevelFromAiQuizResult,
  masteryLevelFromCorrectReviews,
  normalizeConceptNames,
} from "./concepts";

describe("deriveConceptSeeds", () => {
  it("returns at least five stable concepts", () => {
    const concepts = deriveConceptSeeds([
      "mitochondria, cell membrane, ATP",
      "ATP powers cells. Mitochondria make ATP.",
    ]);
    expect(concepts.length).toBeGreaterThanOrEqual(5);
    expect(concepts).toContain("mitochondria");
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
