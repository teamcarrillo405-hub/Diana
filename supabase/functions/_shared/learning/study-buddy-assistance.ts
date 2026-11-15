/** Independently records direct Edge help; client-supplied receipt claims are never accepted. */
type AssistanceClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
const digest = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("");

export async function recordEdgeStudyBuddyAssistance(input: {
  enabled: boolean; client: AssistanceClient; ownerId: string; assignmentId: string | null;
  idempotencyKey?: string; mode: "guide" | "hint" | "quiz";
  system: string; user: string; routing: unknown;
}): Promise<void> {
  if (!input.enabled || !input.assignmentId) return;
  const key = input.idempotencyKey;
  const hex = key ? await digest(`study-buddy-edge-assistance-v1:${input.ownerId}:${key}`) : null;
  const requestId = hex
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${((parseInt(hex[16], 16) & 3) | 8).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`
    : crypto.randomUUID();
  const kind = input.mode === "hint" ? "hint" : "guide";
  const payloadSha256 = await digest(JSON.stringify({ protocol: "study-buddy-edge-input-v1", ownerId: input.ownerId,
    assignmentId: input.assignmentId, requestId, channel: "api", kind, mode: input.mode,
    system: input.system, user: input.user, routing: input.routing, maxTokens: 800, json: true }));
  const expected = { schemaVersion: "assignment-assistance-v1", scope: "assignment", requestId,
    ownerId: input.ownerId, assignmentId: input.assignmentId, selectedProblemId: null,
    payloadSha256, channel: "api", kind, independenceBlocked: true };
  try {
    const result = await input.client.rpc("learning_begin_assignment_assistance", {
      p_assignment: input.assignmentId, p_request: requestId, p_payload_sha256: payloadSha256,
      p_channel: "api", p_kind: kind, p_selected_problem: null,
    });
    const receipt = result.data as Record<string, unknown> | null;
    if (result.error || !receipt || typeof receipt !== "object" || Array.isArray(receipt)
      || Object.entries(expected).some(([key, value]) => receipt[key] !== value)
      || Object.keys(receipt).length !== Object.keys(expected).length + 1
      || typeof receipt.recordedAt !== "string" || !Number.isFinite(Date.parse(receipt.recordedAt))) {
      throw new Error("assistance_receipt_unavailable");
    }
  } catch { throw new Error("assistance_receipt_unavailable"); }
}
