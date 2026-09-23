import { describe, expect, it } from "vitest";

import {
  evaluatePracticalActivity,
  mayGenerateProcedure,
  validatePeHealthPrompt,
} from "./safety";

const protocol = {
  id: "protocol-1",
  version: 1,
  approved: true,
  sourceUri: "https://manufacturer.example/manual",
  teacherId: "teacher-1",
  requiredPpe: ["Safety glasses"],
  supervisionRequired: true,
  emergencySteps: ["Use the classroom emergency stop."],
  disposalSteps: [],
  minimumAge: 14,
};

describe("safety-bound practical activity gate", () => {
  it("keeps theory available while blocking an unsafe practical activity", () => {
    const result = evaluatePracticalActivity({
      subjectDomain: "trade_cte",
      safetyClass: "workshop_hazard",
      protocol: null,
      studentAcknowledgedProtocol: false,
      teacherUnlocked: false,
      supervisedSessionActive: false,
      studentAge: 16,
    });
    expect(result.theoryAvailable).toBe(true);
    expect(result.practicalAvailable).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      "An approved teacher or manufacturer protocol is required.",
      "A teacher must unlock the practical activity.",
    ]));
  });

  it("opens practical work only when every approved control is present", () => {
    expect(evaluatePracticalActivity({
      subjectDomain: "engineering",
      safetyClass: "workshop_hazard",
      protocol,
      studentAcknowledgedProtocol: true,
      teacherUnlocked: true,
      supervisedSessionActive: true,
      studentAge: 16,
    })).toEqual({ theoryAvailable: true, practicalAvailable: true, reasons: [] });
  });

  it("blocks under-age or unsupervised work and never generates hazardous procedures", () => {
    expect(evaluatePracticalActivity({
      subjectDomain: "science",
      safetyClass: "lab_hazard",
      protocol,
      studentAcknowledgedProtocol: true,
      teacherUnlocked: true,
      supervisedSessionActive: false,
      studentAge: 13,
    }).reasons).toEqual(expect.arrayContaining([
      "The practical activity requires active in-person supervision.",
      "The approved protocol has an age requirement.",
    ]));
    expect(mayGenerateProcedure("lab_hazard")).toBe(false);
    expect(mayGenerateProcedure("workshop_hazard")).toBe(false);
  });
});

describe("PE and health dignity rules", () => {
  it("allows skill and recovery goals while rejecting body ranking", () => {
    expect(validatePeHealthPrompt("Reflect on recovery and passing technique.").allowed).toBe(true);
    expect(validatePeHealthPrompt("Rank students by BMI and body fat.")).toEqual({
      allowed: false,
      reason: "Use skill, recovery, knowledge, and student-owned wellbeing goals instead of body or calorie ranking.",
    });
  });
});
