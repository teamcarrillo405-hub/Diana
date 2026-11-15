import { z } from "zod";
import type { CourseActivity, VersionedActivity } from "./course-activities";
import { courseContentHash } from "./course-framework";
import { domainSchema } from "./course-domains";
import { STOCHASTIC_REVIEW_CRITERIA } from './stochastic-matrix';

const text = z.string().min(1).max(1000);
export const responseRubricSchema = z.object({
  version: z.literal("response-rubric-v1"), subject: domainSchema,
  criteria: z.array(z.object({
    id: z.string().regex(/^[a-z_]+$/), title: text,
    descriptors: z.tuple([text, text, text, text]),
  }).strict()).min(2).max(6),
  taskCriteria: z.array(text).min(2).max(6),
  interpretation: z.literal("multiple_supported_responses"),
  review: z.literal("pending"), automaticScoring: z.literal(false),
}).strict();
export type ResponseRubric = z.infer<typeof responseRubricSchema>;
type Criterion = ResponseRubric["criteria"][number];

const evidence: Criterion = {
  id: "evidence", title: "Evidence in context",
  descriptors: ["No relevant support is identifiable in this response.", "A source detail is identified; its relevance to the claim is not yet explained.", "Relevant details support the claim, with some context or attribution needing clarification.", "Relevant details are accurately attributed, considered in context and connected to the claim."],
};
const reasoning: Criterion = {
  id: "reasoning", title: "Reasoning",
  descriptors: ["The response does not yet show a claim or explanation to review.", "A claim is stated; the connection between evidence and claim needs explanation.", "A coherent connection is explained, with a material gap or assumption still needing attention.", "The explanation makes the evidence-to-claim connection clear and addresses relevant limitations or alternatives."],
};
const expression: Criterion = {
  id: "expression", title: "Communicating the idea",
  descriptors: ["There is not enough expressed meaning to assess organization.", "Some meaning is clear; organization or ambiguous wording obscures an important connection.", "The central meaning and organization are clear with limited ambiguity.", "The response communicates its reasoning coherently in a form appropriate to the task and audience."],
};
const scientificReasoning: Criterion = {
  id: "scientific_reasoning", title: "Scientific explanation",
  descriptors: ["No scientific explanation is identifiable yet.", "An explanation is proposed without a supported mechanism or comparison.", "A relevant mechanism or comparison is explained, with an unresolved assumption or limit.", "The explanation connects observations to a plausible mechanism, separates observation from inference and addresses a relevant alternative or limit."],
};
const sourceContext: Criterion = {
  id: "source_context", title: "Source perspective and corroboration",
  descriptors: ["The sources' perspectives or context are not considered yet.", "An author, date or purpose is noted without explaining why it matters.", "Context or perspective is connected to a source claim, with corroboration needing development.", "Relevant author, purpose and time are considered; sources are compared without treating agreement alone as proof."],
};

/** These are review guides, never inferred quality grades. Course publication reviews them too. */
export function responseRubric(activity: Pick<CourseActivity, "subject" | "method">): ResponseRubric | null {
  if (activity.method.kind === 'math_row_stochastic') return responseRubricSchema.parse({
    version: 'response-rubric-v1', subject: activity.subject, criteria: [reasoning, expression],
    taskCriteria: STOCHASTIC_REVIEW_CRITERIA, interpretation: 'multiple_supported_responses', review: 'pending', automaticScoring: false,
  });
  if (!("criteria" in activity.method)) return null;
  const criteria = activity.method.kind === "science_explanation"
    ? [evidence, scientificReasoning, expression]
    : activity.method.kind === "history_sources" ? [evidence, sourceContext, reasoning]
    : [evidence, reasoning, expression];
  return responseRubricSchema.parse({ version: "response-rubric-v1", subject: activity.subject, criteria,
    taskCriteria: activity.method.criteria, interpretation: "multiple_supported_responses", review: "pending", automaticScoring: false });
}

export async function versionResponseRubric(activity: VersionedActivity) {
  const rubric = responseRubric(activity);
  if (!rubric) throw new Error("response_rubric_unavailable");
  return { rubric, hash: await courseContentHash({ activityVersionId: activity.versionId, rubric }) };
}
