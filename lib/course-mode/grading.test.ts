import { describe, expect, it } from "vitest";

import {
  calculateWeightedCourseGrade,
  requiresGradeOverrideReason,
} from "./grading";

describe("deterministic course grading", () => {
  it("normalizes approved weights and calculates a reproducible percent", () => {
    expect(calculateWeightedCourseGrade([
      { ruleId: "a", assessmentId: "quiz", weight: 20, percent: 80 },
      { ruleId: "b", assessmentId: "project", weight: 30, percent: 90 },
      { ruleId: "c", assessmentId: "exam", weight: 50, percent: 70 },
    ])).toEqual({
      ready: true,
      calculatedPercent: 78,
      ruleCount: 3,
      scoredCount: 3,
      totalWeight: 100,
    });
  });

  it("does not calculate until every approved rule has a confirmed score", () => {
    expect(calculateWeightedCourseGrade([
      { ruleId: "a", assessmentId: "quiz", weight: 1, percent: 92 },
      { ruleId: "b", assessmentId: "project", weight: 2, percent: null },
    ])).toMatchObject({
      ready: false,
      calculatedPercent: null,
      ruleCount: 2,
      scoredCount: 1,
    });
  });

  it("requires an audit reason when the teacher changes the calculated result", () => {
    expect(requiresGradeOverrideReason(88.5, 88.5)).toBe(false);
    expect(requiresGradeOverrideReason(88.5, 90)).toBe(true);
  });

  it("rejects invalid rule weights and percentages", () => {
    expect(() => calculateWeightedCourseGrade([
      { ruleId: "a", assessmentId: "quiz", weight: 0, percent: 80 },
    ])).toThrow("positive weight");
    expect(() => calculateWeightedCourseGrade([
      { ruleId: "a", assessmentId: "quiz", weight: 1, percent: 101 },
    ])).toThrow("between 0 and 100");
  });
});
