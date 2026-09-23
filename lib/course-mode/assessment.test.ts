import { describe, expect, it } from "vitest";

import {
  assessmentPercent,
  qtiItemToStorage,
  scoreQtiResponse,
  validateQtiAssessmentItem,
  type QtiAssessmentItem,
} from "@/lib/course-mode/assessment";

const choice: QtiAssessmentItem = {
  identifier: "econ_1",
  title: "Demand shift",
  interactionType: "choice",
  prompt: "Which change shifts demand?",
  choices: [
    { identifier: "A", label: "Income changes" },
    { identifier: "B", label: "The product price changes" },
  ],
  correctResponse: ["A"],
  caseSensitive: false,
  numericTolerance: null,
  points: 2,
  objectiveIds: [],
};

describe("QTI-compatible assessment scoring", () => {
  it("scores approved objective interactions deterministically", () => {
    expect(validateQtiAssessmentItem(choice)).toEqual([]);
    expect(scoreQtiResponse(choice, "A")).toMatchObject({ score: 2, requiresTeacherScore: false });
    expect(scoreQtiResponse(choice, "B")).toMatchObject({ score: 0, requiresTeacherScore: false });
  });

  it("serializes only columns owned by assessment_items", () => {
    expect(qtiItemToStorage(choice)).toEqual({
      identifier: "econ_1",
      title: "Demand shift",
      interaction_type: "choice",
      prompt: "Which change shifts demand?",
      body: { choices: choice.choices },
      response_declaration: {
        correctResponse: ["A"],
        caseSensitive: false,
        numericTolerance: null,
      },
      points_possible: 2,
    });
  });

  it("uses explicit numeric tolerance", () => {
    const numeric: QtiAssessmentItem = {
      ...choice,
      identifier: "physics_1",
      interactionType: "numeric_entry",
      choices: [],
      correctResponse: ["9.81"],
      numericTolerance: 0.02,
      points: 4,
    };
    expect(scoreQtiResponse(numeric, 9.8).score).toBe(4);
    expect(scoreQtiResponse(numeric, 9.7).score).toBe(0);
  });

  it("requires teacher scoring for extended responses", () => {
    const extended: QtiAssessmentItem = {
      ...choice,
      identifier: "essay_1",
      interactionType: "extended_text",
      choices: [],
      correctResponse: [],
      points: 10,
    };
    expect(scoreQtiResponse(extended, "Student response")).toEqual({
      score: null,
      pointsPossible: 10,
      requiresTeacherScore: true,
      rationale: "Extended response requires rubric-based teacher scoring.",
    });
  });

  it("does not calculate a final percent while teacher scoring remains", () => {
    expect(assessmentPercent([
      { score: 2, pointsPossible: 2, requiresTeacherScore: false, rationale: "" },
      { score: null, pointsPossible: 8, requiresTeacherScore: true, rationale: "" },
    ])).toBeNull();
    expect(assessmentPercent([
      { score: 2, pointsPossible: 2, requiresTeacherScore: false, rationale: "" },
      { score: 6, pointsPossible: 8, requiresTeacherScore: false, rationale: "" },
    ])).toBe(80);
  });
});
