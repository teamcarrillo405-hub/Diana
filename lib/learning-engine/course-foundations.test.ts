import { describe, it, expect, vi } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { foundationActivities } from "./course-foundations";
import { runCourseTutor } from "./course-tutor";
import { buildCoursePaths } from "./course-sequence";
import { presentCourseActivity } from "./course-activities";
import baseline from "./course-foundations-baseline.json";

const attempt = (response: string) => ({ response, mode: "check" as const, confirmed: true, priorSupport: 0 });
const stochasticAdditionIds = [
  "course-practice-v2:math-row-stochastic-college-advanced:orientation",
  "course-practice-v2:math-row-stochastic-college-advanced:mixture",
  "course-practice-v2:math-row-stochastic-college-advanced:three-state-transfer",
];
describe("prerequisite practice", () => {
  it("preserves all preceding 107 activity versions and fills the five identified exact-skill gaps", async () => {
    const { framework, activities } = await loadCourseCatalog();
    expect(Object.keys(baseline)).toHaveLength(107);
    for (const [id, version] of Object.entries(baseline)) expect(activities.find(item => item.id === id)?.versionId, id).toBe(version);
    expect(foundationActivities.map(item => item.skillId).sort()).toEqual([
      "math.polynomials", "reading.argument", "reading.central_idea", "reading.comparison", "reading.evidence",
    ]);
    const paths = buildCoursePaths(framework, activities);
    const precedingPaths = paths.filter(item => !stochasticAdditionIds.includes(item.activityId));
    expect(precedingPaths).toHaveLength(152);
    expect(precedingPaths.flatMap(item => item.foundations).filter(item => item.activityId === null)).toEqual([]);
    const stochasticPaths = paths.filter(item => stochasticAdditionIds.includes(item.activityId));
    expect(stochasticPaths.map(item => item.activityId).sort()).toEqual([...stochasticAdditionIds].sort());
    // Reference-only vector prerequisites have no authored practice yet. Keep each exact gap visible.
    for (const path of stochasticPaths) {
      expect(path.foundations.filter(item => item.activityId === null).map(item => item.skillId)).toEqual([
        "math.geometry_measurement", "math.geometry_reasoning", "math.angle_measure",
        "math.unit_circle", "math.trig_ratios", "math.vectors",
      ]);
    }
    for (const foundation of paths.flatMap(item => item.foundations)) {
      if (foundation.activityId !== null) expect(activities.find(item => item.id === foundation.activityId)?.skillId).toBe(foundation.skillId);
    }
  });
  it("retains gap disclosure when an available foundation is withdrawn", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const paths = buildCoursePaths(framework, activities.filter(item => item.courseId !== "reading-evidence-foundations" && item.skillId !== "reading.evidence"));
    expect(paths.flatMap(item => item.foundations).some(item => item.skillId === "reading.evidence" && item.activityId === null)).toBe(true);
    expect(paths.flatMap(item => item.foundations).filter(item => item.activityId !== null).every(item => item.activityId!.includes("reading-evidence-foundations") === false)).toBe(true);
  });
  it("checks the requested linear coefficient without accepting the entire factored or expanded expression", async () => {
    const { activities } = await loadCourseCatalog();
    const task = activities.find(item => item.id === "course-practice-v2:math-polynomial-foundations:distribute")!;
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
    try {
      expect(await runCourseTutor(task, attempt("-5"))).toMatchObject({ outcome: "matches", providerCalled: false, eligibleForKnowledge: false });
      for (const response of ["5", "-8", "3", "(2*x+3)*(x-4)", "2*x^2-5*x-12"])
        expect((await runCourseTutor(task, attempt(response))).outcome, response).toBe("revise");
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });
  it("keeps quotation correspondence separate from interpreting evidence, summary, argument and comparison", async () => {
    const { activities } = await loadCourseCatalog();
    for (const raw of foundationActivities.filter(item => item.subject === "reading")) {
      const task = activities.find(item => item.id === raw.id)!;
      const response = task.sources.map(source => `"${source.text.slice(-100)}"`).join(" ");
      const result = await runCourseTutor(task, attempt(response));
      expect(result).toMatchObject({ outcome: "unverified", providerCalled: false, eligibleForKnowledge: false });
      expect(result.quotes.filter(item => item.status === "exact")).toHaveLength(task.sources.length);
      const view = presentCourseActivity(task);
      expect(view.rubric).toMatchObject({ automaticScoring: false, review: "pending" });
      expect(view).not.toHaveProperty("example");
      expect(view).not.toHaveProperty("expected");
      expect(task.sources.every(source => source.authorship === "diana_authored" && source.trainingPermission === "excluded")).toBe(true);
    }
  });
});
