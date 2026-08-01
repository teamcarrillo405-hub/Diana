import { describe, expect, it } from "vitest";

import { parseAssignmentPracticalGate } from "@/lib/course-mode/practical-gate";

describe("assignment practical gate parser", () => {
  it("uses a locked empty state for malformed data", () => {
    expect(parseAssignmentPracticalGate(null)).toEqual({
      connected: false,
      acknowledged: false,
      teacherUnlocked: false,
      supervisionActive: false,
      ageEligible: false,
      protocol: null,
    });
  });

  it("preserves only approved display fields", () => {
    expect(parseAssignmentPracticalGate({
      connected: true,
      acknowledged: true,
      teacherUnlocked: true,
      supervisionActive: true,
      ageEligible: true,
      protocol: {
        id: "p1",
        version: 2,
        title: "Bench tool safety",
        safetyClass: "workshop_hazard",
        sourceUri: "https://manufacturer.example/manual",
        procedureSteps: ["Inspect the approved setup."],
        requiredPpe: ["Safety glasses"],
        emergencySteps: ["Use the classroom stop control."],
        disposalSteps: [],
        supervisionRequired: true,
        minimumAge: 14,
      },
    })).toMatchObject({
      connected: true,
      acknowledged: true,
      protocol: {
        id: "p1",
        version: 2,
        requiredPpe: ["Safety glasses"],
      },
    });
  });
});
