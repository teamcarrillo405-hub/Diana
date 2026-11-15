import { describe, expect, it } from "vitest";
import { realtimeAuthorshipPayload } from "../../supabase/functions/_shared/realtime-authorship";

describe("realtime authorship metadata", () => {
  it("records bounded operational fields without persisting caller-supplied context", () => {
    const input = {
      model: "test-model", sessionId: "session-test", expiresAt: 123,
      contextChars: 42, fieldCount: 2, ttlSeconds: 600, outputTokenLimit: 450,
      homework: { privateNote: "PRIVATE_STUDENT_DETAIL" },
    };
    const payload = realtimeAuthorshipPayload(input);
    expect(payload).toEqual({
      model: "test-model", sessionId: "session-test", expiresAt: 123,
      contextChars: 42, fieldCount: 2, ttlSeconds: 600, outputTokenLimit: 450,
      route: "assignment-realtime",
    });
    expect(JSON.stringify(payload)).not.toContain("PRIVATE_STUDENT_DETAIL");
  });
});
