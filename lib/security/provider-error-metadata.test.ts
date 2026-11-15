import { afterEach, describe, expect, it, vi } from "vitest";
import { callStudentTextModel, providerErrorMetadata } from "../../supabase/functions/_shared/student-model";

// This edge module only reads Deno.env; the test supplies that runtime below.
declare global {
  const Deno: { env: { get(name: string): string | undefined } };
}

afterEach(() => vi.unstubAllGlobals());

describe("provider error diagnostics", () => {
  it("keeps only bounded request field and error code identifiers", () => {
    expect(providerErrorMetadata(JSON.stringify({ error: {
      code: "unsupported_value", param: "text.format.type", message: "Private student content", secret: "not for logs",
    } }))).toEqual({ code: "unsupported_value", param: "text.format.type" });
  });
  it("omits arbitrary prose and oversized values", () => {
    expect(providerErrorMetadata(JSON.stringify({ error: { code: "private text", param: "a".repeat(81) } })))
      .toEqual({ code: null, param: null });
  });
  it("handles malformed responses without logging the body", () => {
    expect(providerErrorMetadata("private response body")).toEqual({ code: null, param: null });
  });
  it("includes the JSON instruction in the actual provider input for quiz generation", async () => {
    vi.stubGlobal("Deno", { env: { get: (name: string) => name === "OPENAI_API_KEY" ? "test-key" : undefined } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ output_text: '{"quiz":[]}' })));
    vi.stubGlobal("fetch", fetchMock);
    await callStudentTextModel({ system: "Return JSON.", user: "Make three questions.", maxTokens: 2400, json: true });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.input[0].content).toEqual([
      { type: "input_text", text: "Make three questions." },
      { type: "input_text", text: "Return a valid JSON object matching the requested structure." },
    ]);
    expect(request.text.format.type).toBe("json_object");
  });
  it.each([400, 503])("distinguishes definite validation rejection from uncertain HTTP %s failures", async (status) => {
    vi.stubGlobal("Deno", { env: { get: (name: string) => name === "OPENAI_API_KEY" ? "test-key" : undefined } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":{"param":"input"}}', { status })));
    const result = await callStudentTextModel({ system: "Help.", user: "Make a quiz.", maxTokens: 100 });
    expect(result.requestRejected).toBe(status === 400);
  });
});
