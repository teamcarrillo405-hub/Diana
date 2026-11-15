import { describe, expect, it, vi } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { expansionActivities, expansionCompetencies, expansionCourses } from "./course-expansion";
import { EXPANSION_GATE_ANSWERS } from "./course-expansion-fixtures";
import { courseCoverageReport } from "./course-coverage";
import { presentCourseActivity, validateCourseActivities } from "./course-activities";
import { runCourseTutor } from "./course-tutor";
import baseline from "./course-expansion-baseline.json";

const attempt = (response: string) => ({ mode: "check" as const, response, confirmed: true, priorSupport: 0 });
const stochasticAdditionIds = [
  "course-practice-v2:math-row-stochastic-college-advanced:orientation",
  "course-practice-v2:math-row-stochastic-college-advanced:mixture",
  "course-practice-v2:math-row-stochastic-college-advanced:three-state-transfer",
];
describe("authored curriculum v3", () => {
  it("preserves every earlier activity hash while covering explicit cells without claiming full courses", async () => {
    const { framework, activities } = await loadCourseCatalog();
    expect(Object.keys(baseline)).toHaveLength(39);
    for (const [id, versionId] of Object.entries(baseline)) expect(activities.find(activity => activity.id === id)?.versionId, id).toBe(versionId);
    expect(expansionCourses).toHaveLength(20);
    expect(expansionActivities).toHaveLength(48);
    expect(expansionCompetencies).toHaveLength(20);
    const report = courseCoverageReport(framework, activities);
    expect(report).toMatchObject({ completeCurriculum: false, educatorApproved: false, standardsAligned: false });
    expect(report.matrix).toHaveLength(24);
    for (const cell of report.matrix) {
      expect(cell.status).toBe("partial_authored");
      expect(cell.activities).toBeGreaterThanOrEqual(2);
      expect(cell.pendingEducatorReview).toBe(cell.activities);
      expect(cell.limitations.length).toBeGreaterThanOrEqual(3);
      expect(cell.courses.length).toBeGreaterThan(0);
    }
    const preceding = activities.filter(activity => !stochasticAdditionIds.includes(activity.id));
    expect(preceding).toHaveLength(152);
    expect(new Set(preceding.map(activity => activity.courseId)).size).toBe(71);
    const additions = activities.filter(activity => stochasticAdditionIds.includes(activity.id));
    expect(additions.map(activity => activity.id).sort()).toEqual([...stochasticAdditionIds].sort());
    expect([...new Set(additions.map(activity => activity.courseId))]).toEqual(["math-row-stochastic-college-advanced"]);
    expect(new Set(activities.map(activity => activity.courseId)).size).toBe(72);
    expect(activities).toHaveLength(155);
    expect(framework.competencies.filter(skill => skill.id !== "math.row_stochastic_step")).toHaveLength(79);
    expect(framework.competencies.filter(skill => skill.id === "math.row_stochastic_step")).toHaveLength(1);
    expect(framework.competencies).toHaveLength(80);
  });

  it("does not turn an empty or filtered inventory into supported curriculum", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const empty = courseCoverageReport(framework, []);
    expect(empty.matrix.every(cell => cell.status === "unavailable" && cell.activities === 0 && !cell.courses.length)).toBe(true);
    const partial = courseCoverageReport(framework, activities.filter(activity => activity.subject === "reading"));
    expect(partial.matrix.filter(cell => cell.status === "partial_authored")).toHaveLength(4);
    expect(partial.completeCurriculum).toBe(false);
  });

  it("uses original training-excluded passages, proposed review state and explicit simulated history", () => {
    for (const activity of expansionActivities) {
      expect(activity.review).toBe("pending");
      expect(activity.hints).toHaveLength(2);
      for (const source of activity.sources) expect(source).toMatchObject({ authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded" });
      if (activity.subject === "history") {
        expect(activity.sources).toHaveLength(2);
        for (const source of activity.sources) expect(source.text).toMatch(/simulation, not a[n ]/u);
      }
    }
    expect(expansionCourses.every(course => course.alignments.length === 0)).toBe(true);
  });

  it.each(Object.entries(EXPANSION_GATE_ANSWERS))("checks %s with no provider and rejects a different result", async (id, answer) => {
    const { activities } = await loadCourseCatalog();
    const activity = activities.find(item => item.id === id)!;
    expect(activity).toBeDefined();
    const network = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
    try {
      const result = await runCourseTutor(activity, attempt(answer));
      expect(result).toMatchObject({ status: "checked", outcome: "matches", providerCalled: false, eligibleForKnowledge: false });
      const other = activity.method.kind === "science_dimensions" ? answer.replace(/^[-+\d.e]+/u, "99.9") : "999";
      expect((await runCourseTutor(activity, attempt(other))).outcome).not.toBe("matches");
      expect((await runCourseTutor(activity, { ...attempt(answer), confirmed: false })).status).toBe("needs_confirmation");
      expect((await runCourseTutor(activity, { ...attempt(answer), mode: "hint" })).assistance).toBe("hinted");
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });

  it("requires exact polynomial differentiation, a signed flux and requested scientific precision", async () => {
    const { activities } = await loadCourseCatalog();
    const resolve = (suffix: string) => activities.find(activity => activity.id.endsWith(suffix))!;
    const derivative = resolve("math-polynomial-calculus:derivative");
    for (const response of ["12*x^3-4*x", "12*x^3+4*x+5", "3*x^4-2*x^2+5*x-7"])
      expect((await runCourseTutor(derivative, attempt(response))).outcome).toBe("revise");
    const flux = resolve("science-transport-research:diffusive-flux");
    for (const response of ["-6.00e-6 mol*m^-2*s^-1", "6.0e-6 mol*m^-2*s^-1", "6.00e-6 mol*m^-3*s^-1", "6.00e-6"])
      expect((await runCourseTutor(flux, attempt(response))).outcome).not.toBe("matches");
  });

  it("checks a product's constant term without claiming to verify an expanded expression form", async () => {
    const { activities } = await loadCourseCatalog();
    const activity = activities.find(item => item.id === "course-practice-v2:math-algebra-probability:expand")!;
    expect((await runCourseTutor(activity, attempt("-6"))).outcome).toBe("matches");
    for (const response of ["(x+3)*(x-2)", "x^2+x-6", "6"])
      expect((await runCourseTutor(activity, attempt(response))).outcome).toBe("revise");
  });

  it("explains a numeric result in task language while retaining polynomial feedback for a derivative", async () => {
    const { activities } = await loadCourseCatalog();
    const numeric = activities.find(item => item.id.endsWith("math-linear-multivariable-models:determinant"))!;
    const correct = await runCourseTutor(numeric, attempt("25"));
    expect(correct.guidance).toBe("Your exact value matches the requested result.");
    expect([correct.guidance, ...correct.steps, correct.nextQuestion].join(" ")).not.toMatch(/polynomial|equivalent|coefficients/u);
    expect(correct.steps.join(" ")).toContain("setup and reasoning");
    expect((await runCourseTutor(numeric, attempt("24"))).guidance).toContain("Recheck the quantities");
    const expression = activities.find(item => item.id.endsWith("math-polynomial-calculus:derivative"))!;
    expect((await runCourseTutor(expression, attempt("12*x^3-4*x+5"))).guidance).toContain("polynomial expressions are equivalent");
  });

  it("checks exact quotations without treating matching evidence as a quality or mastery grade", async () => {
    const { activities } = await loadCourseCatalog();
    const ids = new Set(expansionActivities.map(activity => activity.id));
    const rubricTasks = activities.filter(activity => ids.has(activity.id) && "criteria" in activity.method);
    expect(rubricTasks).toHaveLength(28);
    for (const activity of rubricTasks) {
      // Final sentences are distinctive within and across the authored passage pairs.
      const response = activity.sources.map(source => `"${source.text.slice(source.text.lastIndexOf(". ") + 2)}"`).join(" ");
      const result = await runCourseTutor(activity, attempt(response));
      expect(result.outcome, activity.id).toBe("unverified");
      expect(result.eligibleForKnowledge).toBe(false);
      expect(result.providerCalled).toBe(false);
      expect(result.quotes.length).toBe(activity.sources.length);
      expect(result.quotes.every(quote => quote.status === "exact"), activity.id).toBe(true);
      const view = presentCourseActivity(activity);
      expect(view.rubric).toMatchObject({ review: "pending", automaticScoring: false, interpretation: "multiple_supported_responses" });
      expect(view).not.toHaveProperty("specification");
      expect(view).not.toHaveProperty("expected");
    }
  });

  it("binds changed instructions and source evidence to a new activity version", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const original = expansionActivities.find(activity => activity.subject === "reading")!;
    const current = activities.find(activity => activity.id === original.id)!;
    const changed = structuredClone(original);
    changed.sources[0].text += " A later observation was not recorded.";
    expect((await validateCourseActivities(framework, [changed]))[0].versionId).not.toBe(current.versionId);
    const relabeled = structuredClone(original);
    relabeled.level = "college_advanced";
    await expect(validateCourseActivities(framework, [relabeled])).rejects.toThrow("activity_course_mismatch");
  });
});
