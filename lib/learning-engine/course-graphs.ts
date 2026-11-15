import { z } from "zod";
import type { CourseActivity } from "./course-activities";
import type { Competency, CourseMap } from "./course-framework";

const coordinate = z.number().finite().int().min(-1000000).max(1000000);
const label = z.string().trim().min(1).max(80);
/** Authored observations only: no interpolation, fitted trend or inferred uncertainty. */
export const courseDataGraphSchema = z.object({
  version: z.literal("course-data-graph-v1"), kind: z.literal("scatter"), title: label,
  authorship: z.literal("diana_authored"), instructionRights: z.literal("original_practice"), trainingPermission: z.literal("excluded"),
  xLabel: label, xUnit: label, yLabel: label, yUnit: label,
  points: z.array(z.object({ x: coordinate, y: coordinate }).strict()).min(2).max(24),
  context: z.string().trim().min(1).max(1000),
}).strict().superRefine((graph, ctx) => {
  if (graph.points.some((point, index) => index > 0 && point.x <= graph.points[index - 1].x))
    ctx.addIssue({ code: "custom", message: "Graph observations need distinct increasing x coordinates." });
});
export type CourseDataGraph = z.infer<typeof courseDataGraphSchema>;
export const graphTaskSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("point_value"), x: coordinate }).strict(),
  z.object({ kind: z.literal("change"), fromX: coordinate, toX: coordinate }).strict(),
  z.object({ kind: z.literal("average_rate"), fromX: coordinate, toX: coordinate }).strict(),
]);
export type GraphTask = z.infer<typeof graphTaskSchema>;

/** Keep numerator and denominator intact for the existing exact-expression verifier. */
export function graphAnswerExpression(rawGraph: unknown, rawTask: unknown): string {
  const graph = courseDataGraphSchema.parse(rawGraph), task = graphTaskSchema.parse(rawTask);
  const at = (x: number) => {
    const point = graph.points.find(item => item.x === x);
    if (!point) throw new Error("graph_task_observation_missing");
    return point;
  };
  if (task.kind === "point_value") return String(at(task.x).y);
  if (task.fromX >= task.toX) throw new Error("graph_task_interval_invalid");
  const first = at(task.fromX), last = at(task.toX), change = last.y - first.y;
  return task.kind === "change" ? String(change) : `(${change})/(${last.x - first.x})`;
}

export const graphCompetencies: Competency[] = [{
  id: "science.graph_observations", subject: "science", title: "Read plotted observations",
  objective: "Read a measured point, signed change or average rate from explicitly plotted observations while separating a numeric result from a causal explanation.",
  prerequisites: ["science.measurement"], levels: ["middle_school", "high_school", "college_intro"], revision: 1,
}];
const examples = [
  {
    level: "middle_school" as const, title: "Read a water-level graph", courseTitle: "Read measured points",
    graph: { title: "Water in a classroom cylinder", xLabel: "Elapsed time", xUnit: "min", yLabel: "Water height", yUnit: "cm", points: [{ x: 0, y: 2 }, { x: 2, y: 5 }, { x: 4, y: 8 }, { x: 6, y: 9 }], context: "Fictional authored observations. Water was added between readings, but the amount and timing were not recorded." },
    task: { kind: "point_value" as const, x: 4 }, prompt: "At 4 minutes, what water height was recorded? Enter the number in centimeters.",
    hints: ["Find 4 on the horizontal time axis.", "Follow that time to its plotted point, then read the vertical height axis."],
    example: { prompt: "Different example: a point at time 3 min has height 7 cm.", steps: ["The horizontal coordinate identifies the time.", "The recorded height at that time is 7 cm."] },
  },
  {
    level: "high_school" as const, title: "Find a temperature change", courseTitle: "Compare plotted measurements",
    graph: { title: "Temperature of an uncovered cup", xLabel: "Elapsed time", xUnit: "min", yLabel: "Temperature", yUnit: "degrees C", points: [{ x: 0, y: 72 }, { x: 2, y: 64 }, { x: 4, y: 57 }, { x: 6, y: 52 }], context: "Fictional authored observations from one cup. Room temperature and measurement uncertainty were not recorded; no comparison cup was measured." },
    task: { kind: "change" as const, fromX: 2, toX: 6 }, prompt: "Find the signed temperature change from 2 to 6 minutes: final temperature minus initial temperature. Enter the number in degrees Celsius.",
    hints: ["Read the temperatures at both stated times.", "Subtract the temperature at 2 minutes from the temperature at 6 minutes. Keep the sign."],
    example: { prompt: "Different example: a sample changes from 30 to 24 degrees Celsius.", steps: ["The signed change is final minus initial: 24 - 30.", "The change is -6 degrees Celsius; the negative sign describes a decrease."] },
  },
  {
    level: "college_intro" as const, title: "Calculate an average rate", courseTitle: "Rates from observed data",
    graph: { title: "Observed gas collection", xLabel: "Elapsed time", xUnit: "s", yLabel: "Collected volume", yUnit: "mL", points: [{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 9 }, { x: 9, y: 14 }], context: "Fictional authored observations from one collection run. Apparatus leakage and temperature were not measured. These points do not establish an instantaneous rate or a reaction mechanism." },
    task: { kind: "average_rate" as const, fromX: 3, toX: 9 }, prompt: "Find the average collection rate from 3 to 9 seconds: change in volume divided by elapsed time. Enter an exact number or fraction in milliliters per second; do not round.",
    hints: ["Read the two volumes and subtract the earlier volume from the later volume.", "Divide that volume change by the difference between the two stated times. Keep the result exact."],
    example: { prompt: "Different example: volume increases from 2 to 10 mL between 1 and 5 seconds.", steps: ["The volume change is 10 - 2 = 8 mL; the time interval is 5 - 1 = 4 s.", "The average rate is 8/4 = 2 mL/s. It does not specify the rate at each instant."] },
  },
];
export const graphCourses: CourseMap[] = examples.map(item => {
  const id = `science-graphs-${item.level.replaceAll("_", "-")}`;
  return { id, title: item.courseTitle, subject: "science", level: item.level, revision: 1,
    units: [{ id: `${id}-unit`, title: "Plotted observations", skillIds: ["science.graph_observations"] }], sources: [], alignments: [] };
});
export const graphActivities: CourseActivity[] = examples.map((item, index) => ({
  id: `course-practice-v2:${graphCourses[index].id}:observe`, courseId: graphCourses[index].id,
  skillId: "science.graph_observations", subject: "science", level: item.level, title: item.title, prompt: item.prompt,
  method: { kind: "science_graph", graph: { version: "course-data-graph-v1", kind: "scatter", authorship: "diana_authored", instructionRights: "original_practice", trainingPermission: "excluded", ...item.graph }, task: item.task },
  sources: [], hints: item.hints, example: item.example, review: "pending", revision: 1,
}));
