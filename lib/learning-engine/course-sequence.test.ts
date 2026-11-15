import { describe, it, expect, vi } from "vitest";
import { loadCourseCatalog } from "./course-catalog";
import { buildCoursePaths } from "./course-sequence";
import { transferActivities, transferCourses, transferOrigins, transferOriginActivityIds } from "./course-transfer";
import { TRANSFER_GATE_ANSWERS } from "./course-transfer-fixtures";
import { runCourseTutor } from "./course-tutor";
import { presentCourseActivity } from "./course-activities";
import baseline from "./course-sequence-baseline.json";
import routingBaseline from "./course-path-routing-baseline.json";

const attempt = (response: string) => ({ response, mode: "check" as const, confirmed: true, priorSupport: 0 });
describe("optional curriculum paths and new-context practice", () => {
  it("retains all 87 prior versions and adds a fresh context in all 20 subject/level cells", async () => {
    const { activities } = await loadCourseCatalog();
    expect(Object.keys(baseline)).toHaveLength(87);
    for (const [id, hash] of Object.entries(baseline)) expect(activities.find(item => item.id === id)?.versionId, id).toBe(hash);
    expect(transferCourses).toHaveLength(20);
    expect(transferActivities).toHaveLength(20);
    expect(new Set(transferActivities.map(item => `${item.subject}:${item.level}`)).size).toBe(20);
    for (const transfer of transferActivities) {
      expect(transfer.review).toBe("pending");
      const original = activities.filter(item => item.courseId === transferOrigins[transfer.id]);
      expect(original.length).toBeGreaterThan(1);
      expect(original.every(item => item.prompt !== transfer.prompt)).toBe(true);
      for (const source of transfer.sources) {
        expect(source.trainingPermission).toBe("excluded");
        expect(original.flatMap(item => item.sources).every(item => item.text !== source.text)).toBe(true);
        if (transfer.subject === "history") expect(source.text).toContain("simulation, not");
      }
    }
  });

  it("routes in module order with explicit return and no mastery or completion inference", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const paths = buildCoursePaths(framework, activities);
    expect(paths).toHaveLength(activities.length);
    for (const activity of activities) {
      const path = paths.find(item => item.activityId === activity.id)!;
      if (path.nextId) expect(activities.find(item => item.id === path.nextId)?.courseId).toBe(activity.courseId);
      if (path.transferId) {
        expect(transferOrigins[path.transferId]).toBe(activity.courseId);
        expect(transferOriginActivityIds[path.transferId]).toBe(activity.id);
        expect(paths.find(item => item.activityId === path.transferId)?.returnId).toBe(activity.id);
      }
      expect(path).not.toHaveProperty("mastery");
      expect(path).not.toHaveProperty("completed");
    }
  });

  it("preserves all 112 hashes while linking a new context only to its matching task", async () => {
    const { framework, activities } = await loadCourseCatalog();
    expect(Object.keys(routingBaseline)).toHaveLength(112);
    for (const [id, hash] of Object.entries(routingBaseline)) expect(activities.find(item => item.id === id)?.versionId, id).toBe(hash);
    const paths = buildCoursePaths(framework, activities);
    expect(paths.filter(item => item.transferId)).toHaveLength(32);
    expect(Object.keys(transferOriginActivityIds)).toHaveLength(32);
    expect(new Set(Object.values(transferOriginActivityIds)).size).toBe(32);
    const taskId = (course: string, suffix: string) => `course-practice-v2:${course}:${suffix}`;
    for (const [course, origin] of [["math-rational-models", "percent"], ["math-algebra-probability", "conditional"],
      ["math-polynomial-calculus", "integral"], ["math-linear-multivariable-models", "expectation"],
      ["reading-narrative-inference", "infer"], ["reading-rhetorical-reading", "rhetoric"],
      ["reading-academic-synthesis", "operational"], ["reading-epistemic-reading", "warrant"],
      ["english-paragraph-revision", "revision-2"], ["english-argument-counterclaim", "revision-1"],
      ["english-academic-argument", "revision-2"], ["english-scholarly-revision", "revision-1"],
      ["science-energy-ecosystems", "energy"], ["science-mechanics-cell-evidence", "kinetic"],
      ["science-physical-models", "concentration"], ["science-transport-research", "diffusive-flux"],
      ["history-chronology-perspective", "analysis-1"], ["history-institutional-change", "analysis-1"],
      ["history-historical-arguments", "analysis-2"], ["history-historiography-methods", "analysis-2"]]) {
      const transferId = taskId(`${course}-transfer`, "apply");
      expect(paths.find(item => item.activityId === taskId(course, origin))?.transferId).toBe(transferId);
      expect(paths.find(item => item.activityId === transferId)?.returnId).toBe(taskId(course, origin));
      for (const sibling of activities.filter(item => item.courseId === course && item.id !== taskId(course, origin)))
        expect(paths.find(item => item.activityId === sibling.id)?.transferId, sibling.id).toBeNull();
    }
  });

  it("does not substitute a sibling when either end of an exact transfer link is unavailable", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const target = "course-practice-v2:math-algebra-probability-transfer:apply";
    const origin = "course-practice-v2:math-algebra-probability:conditional";
    const withoutOrigin = buildCoursePaths(framework, activities.filter(item => item.id !== origin));
    expect(withoutOrigin.find(item => item.activityId === target)?.returnId).toBeNull();
    expect(withoutOrigin.filter(item => item.transferId === target)).toEqual([]);
    const withoutTarget = buildCoursePaths(framework, activities.filter(item => item.id !== target));
    expect(withoutTarget.find(item => item.activityId === origin)?.transferId).toBeNull();
  });

  it("uses only available exact-skill prerequisite activities and leaves gaps explicit", async () => {
    const { framework, activities } = await loadCourseCatalog();
    const selected = activities.filter(item => item.courseId === "math-rational-models" || item.skillId === "math.ratio_foundations");
    const paths = buildCoursePaths(framework, selected);
    const path = paths.find(item => item.activityId.endsWith(":percent"))!;
    expect(path.transferId).toBeNull();
    expect(path.foundations.find(item => item.skillId === "math.ratio_foundations")?.activityId).toBe("course-practice-v2:math-middle-school:ratio");
    for (const item of paths.flatMap(path => path.foundations)) {
      if (item.activityId) expect(selected.find(activity => activity.id === item.activityId)?.skillId).toBe(item.skillId);
    }
    const one = selected.filter(item => item.id.endsWith(":percent"));
    const isolated = buildCoursePaths(framework, one)[0];
    expect(isolated.nextId).toBeNull();
    expect(isolated.foundations.every(item => item.activityId === null)).toBe(true);
    expect(buildCoursePaths(framework, [])).toEqual([]);
    expect(() => buildCoursePaths(framework, [one[0], one[0]])).toThrow("duplicate_path_activity");
  });

  it.each(Object.entries(TRANSFER_GATE_ANSWERS))("checks the changed problem %s without provider or mastery claims", async (id, response) => {
    const { activities } = await loadCourseCatalog();
    const activity = activities.find(item => item.id === id)!;
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
    try {
      expect(await runCourseTutor(activity, attempt(response))).toMatchObject({ outcome: "matches", providerCalled: false, eligibleForKnowledge: false });
      expect((await runCourseTutor(activity, attempt("999"))).outcome).not.toBe("matches");
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); }
  });

  it("retains human interpretation boundaries and does not leak answers in the student catalog", async () => {
    const { activities } = await loadCourseCatalog();
    for (const activity of activities.filter(item => transferOrigins[item.id])) {
      const view = presentCourseActivity(activity);
      expect(view).not.toHaveProperty("expected");
      expect(view).not.toHaveProperty("specification");
      expect(view).not.toHaveProperty("hints");
      if ("criteria" in activity.method) {
        const response = activity.sources.map(source => `"${source.text.slice(-100)}"`).join(" ");
        const result = await runCourseTutor(activity, attempt(response));
        expect(result).toMatchObject({ outcome: "unverified", providerCalled: false, eligibleForKnowledge: false });
        expect(view.rubric?.automaticScoring).toBe(false);
      }
    }
  });
});
