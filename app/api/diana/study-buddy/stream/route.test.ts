import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runBuffered: vi.fn() }));

vi.mock("../route", () => ({ POST: mocks.runBuffered }));

import { POST } from "./route";

const evidence = {
  verificationLevel: "ai_guidance",
  confidence: 0.6,
  validatedAnchors: [],
  verifierResult: null,
  limitations: ["The response was not tool checked."],
  escalationReason: null,
};

const availableProviderState = {
  availability: "available",
  visible: false,
  title: null,
  message: null,
  reasonCode: null,
  retryable: false,
  retryAfterSeconds: null,
  verificationLevelCap: "tool_checked",
  confidenceCap: 1,
  escalationReason: null,
};

function request() {
  return new Request("http://localhost/api/diana/study-buddy/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentId: "11111111-1111-4111-8111-111111111111", question: "Help" }),
  });
}

function events(value: string) {
  return value.trim().split("\n\n").map((block) => JSON.parse(block.replace(/^data:\s*/u, "")) as { type: string; [key: string]: unknown });
}

describe("study buddy stream route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits thinking, deltas, and one complete event", async () => {
    mocks.runBuffered.mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      response: { title: "Guided step", main: "Subtract five from both sides.", reason: "", steps: ["Write the new equation."], anchor: "Student work", visualAid: { kind: "none", title: "", description: "", steps: [] } },
      evidence,
      providerState: availableProviderState,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const response = await POST(request());
    const result = events(await response.text());

    expect(result[0]).toEqual({ type: "thinking" });
    expect(result.some((event) => event.type === "streaming")).toBe(true);
    expect(result.at(-1)).toMatchObject({
      type: "complete",
      evidence: { verificationLevel: "ai_guidance" },
      providerState: { availability: "available", visible: false },
    });
  });

  it("does not emit a normal completion when the reliability envelope is missing", async () => {
    mocks.runBuffered.mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      response: { title: "Guided step", main: "Try the next line.", reason: "", steps: [], anchor: "Student work", visualAid: { kind: "none", title: "", description: "", steps: [] } },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = events(await (await POST(request())).text());

    expect(result.some((event) => event.type === "complete")).toBe(false);
    expect(result.at(-1)).toEqual({
      type: "retryable_error",
      error: "Diana could not verify the tutor response envelope. Please try again.",
    });
  });

  it("marks budget and service errors as retryable", async () => {
    mocks.runBuffered.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "Daily help limit reached." }), { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "30" } }));

    const result = events(await (await POST(request())).text());

    expect(result.at(-1)).toEqual({ type: "retryable_error", error: "Daily help limit reached.", retryAfterMs: 30_000 });
  });

  it("preserves a retryable event when the buffered route is interrupted", async () => {
    mocks.runBuffered.mockRejectedValue(new Error("connection reset"));

    const result = events(await (await POST(request())).text());

    expect(result.at(-1)).toMatchObject({ type: "retryable_error", error: expect.stringContaining("Your message is still here") });
  });

  it("propagates a visible degraded provider state instead of a normal completion", async () => {
    mocks.runBuffered.mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: "Provider fallback is not a verified response.",
      evidence: {
        ...evidence,
        verificationLevel: "needs_more_information",
        confidence: 0.3,
        escalationReason: "The verification provider is unavailable.",
      },
      providerState: {
        ...availableProviderState,
        availability: "unavailable",
        visible: true,
        title: "Verification needs another try",
        message: "Diana needs the source or a working verification service before checking this response. Your work is still here.",
        reasonCode: "network",
        retryable: true,
        verificationLevelCap: "needs_more_information",
        confidenceCap: 0.3,
        escalationReason: "The verification provider is unavailable, so more information or a later retry is required.",
      },
    }), { status: 503, headers: { "Content-Type": "application/json" } }));

    const result = events(await (await POST(request())).text());

    expect(result.some((event) => event.type === "complete")).toBe(false);
    expect(result.at(-1)).toMatchObject({
      type: "retryable_error",
      error: expect.stringContaining("working verification service"),
      evidence: { verificationLevel: "needs_more_information" },
      providerState: {
        availability: "unavailable",
        visible: true,
        title: "Verification needs another try",
      },
    });
  });

  it("does not stream a successful local result before its degraded label", async () => {
    mocks.runBuffered.mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      response: { title: "Locally checked step", main: "Divide both sides by three.", reason: "", steps: ["Write the division."], anchor: "Student work", visualAid: { kind: "none", title: "", description: "", steps: [] } },
      evidence: {
        ...evidence,
        verificationLevel: "tool_checked",
        confidence: 0.98,
        verifierResult: {
          verifier: "linear_equation_step",
          status: "passed",
          summary: "The local algebra step was checked.",
          observations: [],
          limitations: [],
        },
      },
      providerState: {
        ...availableProviderState,
        availability: "degraded",
        visible: true,
        title: "Verification is limited right now",
        message: "Diana can still use exact source passages or offer clearly labeled guidance, but tool checking is temporarily unavailable.",
        reasonCode: "network",
        retryable: true,
        verificationLevelCap: "source_checked",
        confidenceCap: 0.7,
        escalationReason: "The verification provider is degraded, so this response cannot rely on a new tool-checked result.",
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const result = events(await (await POST(request())).text());

    expect(result.map((event) => event.type)).toEqual(["thinking", "complete"]);
    expect(result.at(-1)).toMatchObject({
      evidence: { verificationLevel: "tool_checked" },
      providerState: { availability: "degraded", visible: true },
    });
  });
});
