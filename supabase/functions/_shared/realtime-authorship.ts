/** Metadata-only audit record. Never persist caller-supplied context or objects. */
export function realtimeAuthorshipPayload(input: {
  model: string;
  sessionId: string | null;
  expiresAt: number | null;
  contextChars: number;
  fieldCount: number;
  ttlSeconds: number;
  outputTokenLimit: number;
}): Record<string, unknown> {
  return {
    model: input.model,
    sessionId: input.sessionId,
    expiresAt: input.expiresAt,
    contextChars: input.contextChars,
    fieldCount: input.fieldCount,
    ttlSeconds: input.ttlSeconds,
    outputTokenLimit: input.outputTokenLimit,
    route: "assignment-realtime",
  };
}
