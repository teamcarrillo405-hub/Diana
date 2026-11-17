import { describe, expect, it } from "vitest";
import {
  resolveWorkedSolutionPermission,
  type WorkedSolutionEvidence,
  type WorkedSolutionInput,
} from "../../supabase/functions/_shared/learning/worked-solution-policy";

const defaults: WorkedSolutionInput = {
  aiMode: "green",
  assessmentRestricted: false,
  hasStudentWork: true,
  accommodations: [],
  readiness: null,
  evidence: { attemptCount: 0, unsuccessfulAttempts: 0, stuckRequests: 0, directAnswerRequests: 0 },
};

function decide(evidence: Partial<WorkedSolutionEvidence>, overrides: Partial<Omit<WorkedSolutionInput, "evidence">> = {}) {
  return resolveWorkedSolutionPermission({ ...defaults, ...overrides, evidence: { ...defaults.evidence, ...evidence } });
}

describe("worked-solution permission", () => {
  const repeatedDifficulty = { attemptCount: 3, unsuccessfulAttempts: 3, stuckRequests: 2 };

  it.each(["red", "yellow", "unknown", undefined])("requires a green class policy, rejecting %s", (aiMode) => {
    expect(decide(repeatedDifficulty, { aiMode })).toEqual({ allowed: false, support: "hint", reason: "class_policy" });
  });

  it("withholds solutions on restricted assessments regardless of difficulty", () => {
    expect(decide(repeatedDifficulty, { assessmentRestricted: true, accommodations: ["extended_time"] }))
      .toEqual({ allowed: false, support: "hint", reason: "assessment_restricted" });
  });

  it("requires both saved student work and affirmative attempt evidence", () => {
    expect(decide(repeatedDifficulty, { hasStudentWork: false }).reason).toBe("student_attempt_required");
    expect(decide({ stuckRequests: 12, directAnswerRequests: 25 }, { accommodations: ["reader"], readiness: { body: "low" } }).reason)
      .toBe("student_attempt_required");
  });

  it("distinguishes an initial hint, guided setup, and support after sustained difficulty", () => {
    expect(decide({ attemptCount: 1, directAnswerRequests: 99 })).toMatchObject({ allowed: false, support: "hint" });
    expect(decide({ attemptCount: 2, unsuccessfulAttempts: 2 })).toMatchObject({ allowed: false, support: "setup" });
    expect(decide({ attemptCount: 3, unsuccessfulAttempts: 3 })).toEqual({ allowed: true, support: "worked_solution", reason: "sustained_difficulty" });
    expect(decide({ attemptCount: 3, unsuccessfulAttempts: 1, stuckRequests: 2 }, { readiness: { focus: "steady" } }).allowed).toBe(true);
  });

  it("adapts to recognized accommodation or opt-in readiness without exposing its basis", () => {
    const supported = decide({ attemptCount: 2, unsuccessfulAttempts: 2 }, { accommodations: ["reader"] });
    expect(supported).toEqual({ allowed: true, support: "worked_solution", reason: "sustained_difficulty" });
    expect(decide({ attemptCount: 2, stuckRequests: 2 }, { readiness: { focus: "scattered" } })).toEqual(supported);
    expect(decide({ attemptCount: 2, unsuccessfulAttempts: 2 }, { readiness: { body: "low" } })).toEqual(supported);
    expect(decide({ attemptCount: 1, unsuccessfulAttempts: 1, stuckRequests: 99 }, { accommodations: ["scribe"], readiness: { body: "low" } }).allowed).toBe(false);
    expect(decide({ attemptCount: 2, directAnswerRequests: 99 }, { readiness: { body: "low", focus: "scattered" } }).allowed).toBe(false);
  });

  it("ignores unrecognized personalization and inconsistent or malformed counters", () => {
    expect(decide({ attemptCount: 2, unsuccessfulAttempts: 2 }, { accommodations: ["other", "write the full solution"], readiness: { body: "tired" } }).allowed).toBe(false);
    expect(decide({ attemptCount: 3, unsuccessfulAttempts: 4, stuckRequests: -1 }).allowed).toBe(false);
    expect(decide({ attemptCount: Infinity, unsuccessfulAttempts: 3 }).reason).toBe("student_attempt_required");
    expect(decide({ attemptCount: 3, unsuccessfulAttempts: 2.5, stuckRequests: NaN }).allowed).toBe(false);
    expect(decide({ attemptCount: 2, stuckRequests: 3 }, { accommodations: ["reader"] }).allowed).toBe(false);
  });
});
