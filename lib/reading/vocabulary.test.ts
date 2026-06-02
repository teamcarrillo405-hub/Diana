import { describe, expect, it } from "vitest";
import {
  adaptReadingLevelFallback,
  buildContextClue,
  parseVocabSupport,
  phonicsBreakdown,
  validVocabularyWord,
} from "./vocabulary";

describe("reading vocabulary helpers", () => {
  it("validates student-sized vocabulary words", () => {
    expect(validVocabularyWord("photosynthesis")).toBe(true);
    expect(validVocabularyWord("cell-division")).toBe(true);
    expect(validVocabularyWord("chapter4")).toBe(false);
  });

  it("builds a context clue from nearby sentence text", () => {
    const clue = buildContextClue("mitosis", "Cells use mitosis to divide. Then they grow.");
    expect(clue).toContain("Cells use mitosis");
  });

  it("creates a phonics breakdown with syllable chunks", () => {
    const result = phonicsBreakdown("photosynthesis");
    expect(result.syllables.length).toBeGreaterThan(1);
    expect(result.pronunciation).toContain("-");
  });

  it("parses model vocabulary support with fallback phonics", () => {
    const result = parseVocabSupport(
      { definition: "How plants make food.", contextClue: "Look near sunlight." },
      "photosynthesis",
      "The plant uses photosynthesis.",
    );
    expect(result.definition).toBe("How plants make food.");
    expect(result.phonics.syllables.length).toBeGreaterThan(1);
  });

  it("keeps deterministic reading-level fallback bounded", () => {
    const simple = adaptReadingLevelFallback("One. Two. Three. Four. Five. Six. Seven. Eight. Nine.", "simpler");
    expect(simple.split("\n")).toHaveLength(8);
    expect(adaptReadingLevelFallback("Main idea.", "more_detail")).toContain("Focus points");
  });
});
