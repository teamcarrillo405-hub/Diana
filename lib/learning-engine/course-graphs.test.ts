import { describe, expect, it, vi } from "vitest";
import { courseDataGraphSchema, graphActivities, graphAnswerExpression } from "./course-graphs";
import { loadCourseCatalog } from "./course-catalog";
import { presentCourseActivity, validateCourseActivities } from "./course-activities";
import { runCourseTutor } from "./course-tutor";
import baseline from "./course-graphs-baseline.json";

const method = graphActivities[0].method;
if (method.kind !== "science_graph") throw new Error("graph_fixture_expected");
const graph = method.graph;
const attempt = (response: string) => ({ mode: "check", response, confirmed: true, priorSupport: 0 });
describe("bounded authored graph observations", () => {
  it("rejects unknown charts, duplicate/unsorted coordinates, nonfinite values and extra claims", () => {
    for (const invalid of [
      { ...graph, kind: "line" }, { ...graph, points: [{ x: 0, y: 1 }] },
      { ...graph, points: [{ x: 0, y: 1 }, { x: 0, y: 2 }] },
      { ...graph, points: [{ x: 2, y: 1 }, { x: 1, y: 2 }] },
      ...[NaN, Infinity, -Infinity, 1000001, 0.5].map(y => ({ ...graph, points: [{ x: 0, y }, { x: 2, y: 4 }] })),
      { ...graph, causalEffect: "proven" },
    ]) expect(courseDataGraphSchema.safeParse(invalid).success).toBe(false);
  });
  it("requires exact recorded endpoints and ordered intervals rather than interpolating", () => {
    expect(graphAnswerExpression(graph, { kind: "point_value", x: 4 })).toBe("8");
    expect(() => graphAnswerExpression(graph, { kind: "point_value", x: 3 })).toThrow("graph_task_observation_missing");
    for (const task of [{ kind: "change", fromX: 4, toX: 2 }, { kind: "average_rate", fromX: 2, toX: 2 }])
      expect(() => graphAnswerExpression(graph, task)).toThrow("graph_task_interval_invalid");
    expect(() => graphAnswerExpression(graph, { kind: "instantaneous_rate", x: 4 })).toThrow();
  });
  it("binds graph data and task to the version while preserving all 36 existing hashes", async () => {
    const { framework, activities } = await loadCourseCatalog();
    for (const [id, versionId] of Object.entries(baseline)) expect(activities.find(item => item.id === id)?.versionId).toBe(versionId);
    expect(Object.keys(baseline)).toHaveLength(36);
    const original = activities.find(item => item.id === graphActivities[0].id)!;
    const modified = structuredClone(graphActivities[0]);
    if (modified.method.kind !== "science_graph") throw new Error("graph_fixture_expected");
    modified.method.graph.points[2].y = 10;
    expect((await validateCourseActivities(framework, [modified]))[0].versionId).not.toBe(original.versionId);
    modified.method.task = { kind: "point_value", x: 3 };
    await expect(validateCourseActivities(framework, [modified])).rejects.toThrow("graph_task_observation_missing");
    expect(presentCourseActivity(original)).toMatchObject({ graph, method: "science_graph" });
    expect(presentCourseActivity(original)).not.toHaveProperty("task");
  });
  it("checks point, signed change and exact rate locally without implying scientific understanding", async () => {
    const network = vi.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("network_forbidden"); });
    try {
      const { activities } = await loadCourseCatalog();
      const graphs = graphActivities.map(activity => activities.find(item => item.id === activity.id)!);
      const answers = ["8", "-12", "5/3"];
      for (const [index, activity] of graphs.entries()) {
        expect(await runCourseTutor(activity, attempt(answers[index]))).toMatchObject({ status: "checked", outcome: "matches", providerCalled: false, eligibleForKnowledge: false });
        expect((await runCourseTutor(activity, attempt("999"))).outcome).toBe("revise");
        expect((await runCourseTutor(activity, { ...attempt(answers[index]), confirmed: false })).status).toBe("needs_confirmation");
        const feedback = await runCourseTutor(activity, attempt(answers[index]));
        expect(feedback.limitations.join(" ")).toContain("Causation");
        expect(feedback.guidance).toBe("Your number matches the requested result from the plotted observations.");
        expect(feedback.steps.join(" ")).toContain("causal explanation needs separate evidence");
        expect([feedback.guidance, ...feedback.steps].join(" ")).not.toMatch(/polynomial|equivalence/i);
      }
      expect((await runCourseTutor(graphs[2], attempt("1.67"))).outcome).toBe("revise");
      for (const response of ["NaN", "Infinity", "8 because water causes growth", "8 cm"]) {
        expect((await runCourseTutor(graphs[0], attempt(response))).outcome).not.toBe("matches");
      }
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
});
