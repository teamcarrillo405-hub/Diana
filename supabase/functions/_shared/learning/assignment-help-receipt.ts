import { requireStudentContext } from "../student-auth.ts";

export type AssignmentHelpContext = {
  request: Request;
  body: Record<string, unknown>;
  feature: string;
  /** Trusted IDs of notes actually selected by the server, never request claims. */
  sourceNoteIds?: string[];
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUIRED_ASSIGNMENT = new Set(["assignment-review", "assignment-realtime", "assignment-realtime-reason"]);
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");
function unavailable(code = "assistance_receipt_unavailable", status = 503): Response {
  return new Response(JSON.stringify({ error: "Help is temporarily unavailable while its learning record is checked.", code }),
    { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function optionalUuid(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !UUID.test(value)) throw unavailable("invalid_assistance_scope", 400);
  return value;
}
export function assignmentHelpRequestKey(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim() || value.length > 128) throw unavailable("invalid_request_key", 400);
  return value;
}
async function requestUuid(namespace: string): Promise<string> {
  const hex = await digest(namespace);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Records the exact provider recipe before invocation, fallback or credential
 * release. General/course-only help is explicitly unscoped; it cannot claim a
 * protected assignment receipt. Server-selected note assignments are resolved
 * again through the authenticated client's ownership boundary.
 */
export async function recordEdgeAssignmentHelp(context: AssignmentHelpContext, input: {
  ownerId: string; recipe: unknown; kind: "hint" | "example" | "check" | "guide"; idempotencyKey?: string;
}): Promise<{ scope: "disabled" | "unscoped" | "assignment"; assignmentIds: string[] }> {
  if (Deno.env.get("DIANA_DURABLE_TASK_ASSISTANCE_ENABLED") !== "true") return { scope: "disabled", assignmentIds: [] };
  const assignment = optionalUuid(context.body.assignmentId);
  const artifact = context.feature === "study-artifacts";
  if ((REQUIRED_ASSIGNMENT.has(context.feature) || (artifact && context.body.sourceType === "assignment")) && !assignment) throw unavailable("assignment_required", 400);
  const noteId = optionalUuid(context.body.noteId ?? (artifact && context.body.sourceType === "note" ? context.body.sourceId : undefined));
  if (artifact && context.body.sourceType === "note" && !noteId) throw unavailable("note_required", 400);
  const noteIds = [...new Set([...(context.sourceNoteIds ?? []), ...(noteId ? [noteId] : [])])];
  if (noteIds.length > 32 || noteIds.some(id => !UUID.test(id))) throw unavailable("invalid_assistance_scope", 400);
  const key = assignmentHelpRequestKey(input.idempotencyKey ?? context.body.idempotencyKey);
  const auth = await requireStudentContext(context.request, { suppliedOwnerId: input.ownerId,
    assignmentId: assignment, classId: context.body.classId, noteId, requireAiGreen: Boolean(assignment) });
  if (auth instanceof Response) throw auth;
  if (auth.ownerId !== input.ownerId) throw unavailable("owner_mismatch", 403);
  const assignments = new Set<string>(assignment ? [assignment] : []);
  if (noteIds.length) {
    const result = await auth.userClient.from("notes").select("id,assignment_id").eq("owner_id", auth.ownerId).in("id", noteIds);
    const rows = result.data as { id: string; assignment_id: unknown }[] | null;
    if (result.error || !Array.isArray(rows) || rows.length !== noteIds.length
      || rows.some(row => !row || typeof row.id !== "string" || !noteIds.includes(row.id))
      || new Set(rows.map(row => row.id)).size !== noteIds.length) throw unavailable();
    for (const row of rows) {
      const noteAssignment = optionalUuid(row.assignment_id);
      if (noteAssignment) assignments.add(noteAssignment);
    }
  }
  const assignmentIds = [...assignments].sort();
  if (!assignmentIds.length) return { scope: "unscoped", assignmentIds };
  const operationKey = key ?? crypto.randomUUID();
  for (let index = 0; index < assignmentIds.length; index++) {
    const assignmentId = assignmentIds[index];
    const requestId = await requestUuid(`edge-assignment-help-v1:${context.feature}:${auth.ownerId}:${operationKey}:${index}`);
    const payloadSha256 = await digest(JSON.stringify({ protocol: "edge-assignment-help-v1", feature: context.feature,
      ownerId: auth.ownerId, assignmentIds, sourceNoteIds: [...noteIds].sort(), assignmentId, requestId,
      channel: "api", kind: input.kind, recipe: input.recipe }));
    const expected = { schemaVersion: "assignment-assistance-v1", scope: "assignment", requestId,
      ownerId: auth.ownerId, assignmentId, selectedProblemId: null, payloadSha256,
      channel: "api", kind: input.kind, independenceBlocked: true };
    try {
      const result = await auth.userClient.rpc("learning_begin_assignment_assistance", { p_assignment: assignmentId,
        p_request: requestId, p_payload_sha256: payloadSha256, p_channel: "api", p_kind: input.kind, p_selected_problem: null });
      const receipt = result.data as Record<string, unknown> | null;
      if (result.error || !receipt || typeof receipt !== "object" || Array.isArray(receipt)
        || Object.entries(expected).some(([name, value]) => receipt[name] !== value)
        || Object.keys(receipt).length !== Object.keys(expected).length + 1
        || typeof receipt.recordedAt !== "string" || !Number.isFinite(Date.parse(receipt.recordedAt))) throw unavailable();
    } catch { throw unavailable(); }
  }
  return { scope: "assignment", assignmentIds };
}
