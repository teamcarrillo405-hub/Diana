import { describe, expect, it } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { practiceCourseForClass, practiceLevelForClass, practiceSubjectForClass } from "./course-domains";
import { startCourseSession, runCourseSession } from "./course-session";

describe("Algebra class practice context", () => {
  it("starts from the named high-school course without treating context as mastery", () => {
    expect(practiceSubjectForClass(null, "Algebra")).toBe("math");
    expect(practiceLevelForClass(null, "Algebra")).toBe("high_school");
    expect(practiceCourseForClass(null, "Algebra")).toBe("math-linear-equations-high-school");
    expect(practiceLevelForClass(null, "College algebra")).toBe("college_intro");
    expect(practiceCourseForClass(null, "College algebra")).toBeUndefined();
  });

  it("checks an authored linear equation with the bounded exact-result method", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const activity = activities.find(item => item.courseId === "math-linear-equations-high-school");
    expect(framework.competencies.find(item => item.id === "math.linear_equations")?.objective).toContain("one-variable linear equation");
    expect(activity?.method).toMatchObject({ kind: "math_exact", specification: { kind: "equation_value", equation: "3x+5=20" } });
    const state = await startCourseSession("00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", activity!.id);
    const result = await runCourseSession(state, { expectedRevision: 1, mode: "check", response: "5", confirmed: true, modality: "typed" });
    expect(result.feedback.outcome).toBe("matches");
    expect(result.feedback.eligibleForKnowledge).toBe(false);
  });
});
