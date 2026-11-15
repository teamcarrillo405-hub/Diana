import { describe, expect, it } from "vitest";

import { selectHomeworkModelTier } from "@/lib/ai/homework-model-tier";

import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";

describe("production routing conformance to the independent benchmark", () => {
  it("matches every frozen core case without using production code to create expectations", () => {
    const mismatches = EDUCATIONAL_EVALUATION_CORPUS
      .filter((evaluationCase) => evaluationCase.family === "core")
      .map((evaluationCase) => {
        const observed = selectHomeworkModelTier({
          task: evaluationCase.expected.routing.route,
          subjectDomain: evaluationCase.subject,
          academicBand: evaluationCase.academicBand,
          sourceChars: evaluationCase.sources
            .filter((source) => source.kind !== "student_work")
            .reduce((total, source) => total + source.excerpt.length, 0),
          studentWorkChars: evaluationCase.sources
            .filter((source) => source.kind === "student_work")
            .reduce((total, source) => total + source.excerpt.length, 0),
          hasRubric: evaluationCase.sources.some((source) => source.kind === "rubric"),
        });
        return observed === evaluationCase.expected.routing.tier
          ? null
          : `${evaluationCase.id}: expected ${evaluationCase.expected.routing.tier}, observed ${observed}`;
      })
      .filter((value): value is string => value !== null);

    expect(mismatches).toEqual([]);
  });
});

