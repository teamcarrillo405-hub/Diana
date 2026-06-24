import { describe, expect, it } from "vitest";
import { deriveFuturePath } from "./derive";

describe("deriveFuturePath", () => {
  it("creates junior-specific milestones and essay action", () => {
    const model = deriveFuturePath({
      schoolYear: 11,
      interests: ["music", "biology"],
      accommodations: ["extended_time"],
      proofCount: 3,
      openAssignmentCount: 4,
      portfolioItemCount: 2,
    });

    expect(model.stageTitle).toBe("Junior map");
    expect(model.weeklyAction).toContain("essay idea");
    expect(model.milestones.map((m) => m.title)).toContain("College list");
    expect(model.strengths.join(" ")).toContain("time is planned early");
  });

  it("starts with proof when the student has no saved evidence yet", () => {
    const model = deriveFuturePath({
      schoolYear: 9,
      interests: [],
      accommodations: [],
      proofCount: 0,
      openAssignmentCount: 1,
      portfolioItemCount: 0,
    });

    expect(model.weeklyAction).toContain("Save one");
    expect(model.strengths.length).toBeGreaterThan(0);
  });
});
