import { homeworkQualityForTask, runOpenAIHomeworkAdapter } from "../homework-adapter.ts";
import { assignmentHelpRequestKey, recordEdgeAssignmentHelp, type AssignmentHelpContext } from "./assignment-help-receipt.ts";
export { recordEdgeAssignmentHelp, type AssignmentHelpContext } from "./assignment-help-receipt.ts";
type AdapterInput = Parameters<typeof runOpenAIHomeworkAdapter>[0];

export async function runAssignmentScopedHomeworkAdapter(context: AssignmentHelpContext, input: AdapterInput) {
  if (Deno.env.get("DIANA_DURABLE_TASK_ASSISTANCE_ENABLED") !== "true") return runOpenAIHomeworkAdapter(input);
  const idempotencyKey = assignmentHelpRequestKey(input.idempotencyKey ?? context.body.idempotencyKey);
  const { supabase: _client, ...recipe } = input;
  const normalized = { ...recipe, json: input.json ?? false, quality: input.quality ?? homeworkQualityForTask(input.task, input.routing),
    ...(idempotencyKey ? { idempotencyKey } : {}) };
  await recordEdgeAssignmentHelp(context, { ownerId: input.ownerId, recipe: normalized, idempotencyKey,
    kind: input.task === "math_example" ? "example" : input.task === "assignment_review" ? "check" : input.task === "math_step" ? "hint" : "guide" });
  return runOpenAIHomeworkAdapter({ ...input, ...(idempotencyKey ? { idempotencyKey } : {}) });
}
