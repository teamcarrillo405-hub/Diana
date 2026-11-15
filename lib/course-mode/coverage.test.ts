import { describe, expect, it } from "vitest";

import { buildCourseCoverageReport, canPublishCoveredCourse } from "./coverage";

describe("course standards coverage", () => {
  it("reports standards, instruction, practice, and assessment independently", () => {
    const report = buildCourseCoverageReport([
      {
        objectiveId: "supply-shift",
        title: "Explain a supply curve shift",
        standardItemIds: ["CEE-4.2"],
        lessonStages: ["teaches", "practices"],
        assessmentItemCount: 1,
      },
      {
        objectiveId: "equilibrium",
        title: "Calculate equilibrium",
        standardItemIds: [],
        lessonStages: ["introduces"],
        assessmentItemCount: 0,
      },
    ]);

    expect(report).toMatchObject({
      objectiveCount: 2,
      alignedObjectiveCount: 1,
      taughtObjectiveCount: 2,
      practicedObjectiveCount: 1,
      assessedObjectiveCount: 1,
      fullyCoveredObjectiveCount: 1,
      coveragePercent: 50,
    });
    expect(report.objectives[1]?.gaps).toEqual(["standard", "practice", "assessment"]);
    expect(canPublishCoveredCourse(report)).toBe(false);
  });

  it("accepts an assessment-stage lesson as assessment evidence", () => {
    const report = buildCourseCoverageReport([{
      objectiveId: "map-scale",
      title: "Use map scale",
      standardItemIds: ["GFL-1"],
      lessonStages: ["introduces", "practices", "assesses"],
      assessmentItemCount: 0,
    }]);
    expect(report.coveragePercent).toBe(100);
    expect(canPublishCoveredCourse(report)).toBe(true);
  });

  it("rejects duplicate objective IDs", () => {
    expect(() => buildCourseCoverageReport([
      { objectiveId: "same", title: "One", standardItemIds: [], lessonStages: [], assessmentItemCount: 0 },
      { objectiveId: "same", title: "Two", standardItemIds: [], lessonStages: [], assessmentItemCount: 0 },
    ])).toThrow("unique IDs");
  });
});
