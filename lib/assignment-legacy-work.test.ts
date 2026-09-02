import { describe, expect, it } from "vitest";

import { legacySavedWorkForUnifiedUnit } from "./assignment-legacy-work";

describe("legacy assignment work migration", () => {
  it("moves a structured writing draft into the first unified work unit", () => {
    const result = legacySavedWorkForUnifiedUnit("writing", {
      writingThesis: "A supported claim",
      draft: "The student draft",
    });

    expect(result.hasStudentWork).toBe(true);
    expect(result.studentWork.work).toContain("Thesis or main claim\nA supported claim");
    expect(result.studentWork.work).toContain("Your draft\nThe student draft");
  });

  it("preserves direct typed and handwritten work", () => {
    const result = legacySavedWorkForUnifiedUnit("math", {
      answer: "x = 5",
      workInk: "ink-v2-payload",
    });

    expect(result).toEqual({
      hasStudentWork: true,
      studentWork: {
        work: "x = 5",
        workInk: "ink-v2-payload",
        answer: "x = 5",
      },
    });
  });

  it("does not invent work for an empty legacy record", () => {
    expect(legacySavedWorkForUnifiedUnit("history", {})).toEqual({
      hasStudentWork: false,
      studentWork: {},
    });
  });
});
