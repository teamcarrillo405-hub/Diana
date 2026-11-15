import { describe, expect, it } from "vitest";
import { orderedPracticeBlocks, prepareSourceExercises, MAX_PREPARED_EXERCISES, MAX_PRACTICE_SOURCE_BLOCKS, MAX_PRACTICE_SOURCE_CHARACTERS } from "@/supabase/functions/_shared/learning/practice-source";

function block(id: string, page: number, startOffset: number, text = "1. 2x+3=11", kind = "problem") {
  return { id, text, kind, needsConfirmation: false,
    location: { page, pageLabel: "Page " + page, startOffset, endOffset: startOffset + text.length } };
}

describe("practice source selection", () => {
  it("uses numeric source positions rather than hashes and rejects unconfirmed or unlocated blocks", () => {
    const input = [block("aaa", 10, 0), block("zzz", 2, 80), block("yyy", 2, 4),
      { ...block("unconfirmed", 1, 0), needsConfirmation: true }, { ...block("unlocated", 1, 0), location: null }];
    const selected = orderedPracticeBlocks(input);
    expect(selected.blocks.map(item => item.id)).toEqual(["yyy", "zzz", "aaa"]);
    expect(selected.discardedCount).toBe(2);
    expect(input[0].id).toBe("aaa");
  });

  it("shows the exact chosen excerpt and confines all reading questions to it", () => {
    const text = "Students planted a garden and measured rainfall. The principal asked for a maintenance plan. ".repeat(14);
    const result = prepareSourceExercises("reading", [block("later", 10, 0, "A later passage. ".repeat(10), "paragraph"), block("earlier", 2, 0, text, "paragraph")]);
    expect(result.exercises).toHaveLength(6);
    for (const exercise of result.exercises) {
      const excerpt = exercise.prompt.split("\n")[1];
      expect(exercise.id.startsWith("earlier:")).toBe(true);
      expect(exercise.prompt).toContain("Source excerpt (Page 2):");
      expect(exercise.prompt).toContain("About this excerpt:");
      expect(exercise.prompt).toContain("The source continues after this excerpt.");
      expect(text.startsWith(excerpt)).toBe(true);
      expect(excerpt.length).toBeLessThanOrEqual(700);
      expect(exercise.prompt.length).toBeLessThanOrEqual(1000);
      expect(exercise.reviewed).toBe(false);
    }
    expect(result.coverage.scope).toBe("one_reading_excerpt");
    expect(result.coverage.readingExcerptTruncated).toBe(true);
    expect(result.exercises.find(item => item.skill_id === "reading.comparison")?.prompt).toContain("two details or ideas in this excerpt");
  });

  it("refuses an oversized source instead of silently selecting a partial block window", () => {
    expect(() => prepareSourceExercises("math", Array(MAX_PRACTICE_SOURCE_BLOCKS + 1).fill(null))).toThrow("no partial source was selected");
    expect(() => prepareSourceExercises("reading", [{ text: "a".repeat(MAX_PRACTICE_SOURCE_CHARACTERS + 1) }])).toThrow("no partial source was selected");
    expect(prepareSourceExercises("math", Array(MAX_PRACTICE_SOURCE_BLOCKS).fill(null)).coverage.sourceTruncated).toBe(false);
  });

  it("keeps immutable math IDs and refuses ambiguous equations and unsupported notation", () => {
    const result = prepareSourceExercises("math", [block("ambiguous", 1, 0, "1. 2x=4; 3x=6"),
      block("domain", 1, 30, "2. 1/x=2"), block("supported", 2, 0)]);
    expect(result.exercises).toHaveLength(1);
    expect(result.exercises[0]).toMatchObject({ id: "supported:value", skill_id: "math.linear_equations",
      specification: { kind: "equation_value", equation: "2x+3=11", solutionSetComplete: false }, reviewed: false });
  });

  it("reports the exercise cap after selecting the earliest supported source questions", () => {
    const payloads = Array.from({ length: MAX_PREPARED_EXERCISES + 1 }, (_, index) => block(String(100 - index), index + 1, 0));
    const result = prepareSourceExercises("math", payloads.reverse());
    expect(result.exercises).toHaveLength(MAX_PREPARED_EXERCISES);
    expect(result.exercises[0].id).toBe("100:value");
    expect(result.exercises.at(-1)?.id).toBe("71:value");
    expect(result.coverage).toMatchObject({ sourceBlocks: 31, sourceTruncated: false, exerciseLimitReached: true });
    expect(prepareSourceExercises("math", payloads.slice(1)).coverage.exerciseLimitReached).toBe(false);
  });
});
