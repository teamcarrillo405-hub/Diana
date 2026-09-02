import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSafe: vi.fn(),
  logInteraction: vi.fn(),
}));

vi.mock("@/lib/ai/safety", () => ({
  runSafeBudgetedAiCall: mocks.runSafe,
  logInteraction: mocks.logInteraction,
}));

import {
  openAIHomeworkModel,
  parseOpenAIJsonObject,
  runOpenAIHomeworkJson,
  runOpenAIHomeworkText,
  selectOpenAIHomeworkQuality,
} from "./openai-homework-adapter";

describe("OpenAI homework adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes complex homework review to the complex tier", () => {
    expect(selectOpenAIHomeworkQuality({
      task: "assignment_review",
      subjectDomain: "engineering",
      sourceChars: 1200,
      studentWorkChars: 500,
    })).toBe("complex");
    expect(selectOpenAIHomeworkQuality({ task: "study_buddy" })).toBe("fast");
    expect(selectOpenAIHomeworkQuality({
      task: "study_buddy",
      subjectDomain: "science",
      signals: "A college biometrics problem using logistic regression.",
    })).toBe("complex");
    expect(selectOpenAIHomeworkQuality({
      task: "study_artifact",
      subjectDomain: "mathematics",
      signals: "Create a practice quiz for statistical inference.",
    })).toBe("complex");
  });

  it("uses academic bands for middle-school science and advanced mathematics", () => {
    expect(selectOpenAIHomeworkQuality({
      task: "study_buddy",
      subjectDomain: "science",
      academicBand: "middle_foundation",
      signals: "Explain how a plant uses sunlight.",
    })).toBe("fast");
    expect(selectOpenAIHomeworkQuality({
      task: "study_buddy",
      subjectDomain: "mathematics",
      academicBand: "high_advanced",
      signals: "Help me choose the next step.",
    })).toBe("complex");
  });

  it("uses environment model overrides", () => {
    vi.stubEnv("OPENAI_HOMEWORK_COMPLEX_MODEL", "gpt-custom-complex");
    expect(openAIHomeworkModel("complex")).toBe("gpt-custom-complex");
    vi.unstubAllEnvs();
  });

  it("falls back when structured JSON is malformed", () => {
    const fallback = { answer: "fallback" };
    const parsed = parseOpenAIJsonObject("not json", fallback, (value): value is typeof fallback => (
      Boolean(value) && typeof value === "object" && (value as Record<string, unknown>).answer === "ok"
    ));
    expect(parsed).toBe(fallback);
  });

  it("returns guard failures before parsing provider output", async () => {
    mocks.runSafe.mockResolvedValueOnce({
      ok: false,
      kind: "budget",
      status: 429,
      code: "daily_token_budget_reached",
      message: "Diana homework is paused for today.",
    });

    const result = await runOpenAIHomeworkJson({
      ownerId: "student-1",
      accounting: {} as never,
      task: "study_buddy",
      messages: [{ role: "system", content: "Tutor" }, { role: "user", content: "Help" }],
      maxOutputTokens: 100,
      fallback: { main: "fallback" },
      validate: (value): value is { main: string } => Boolean(value),
      fetcher: vi.fn(),
      idempotencyKey: "key-1",
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, error: "Diana homework is paused for today." }));
    expect(mocks.logInteraction).not.toHaveBeenCalled();
  });

  it("fails closed when structured provider output is malformed", async () => {
    mocks.runSafe.mockResolvedValueOnce({
      ok: true,
      value: { content: "not json", model: "gpt-test", tokens: 4 },
      reservationId: "reservation-invalid-json",
    });

    const result = await runOpenAIHomeworkJson({
      ownerId: "student-1",
      accounting: {} as never,
      task: "study_buddy",
      messages: [{ role: "system", content: "Tutor" }, { role: "user", content: "Help" }],
      maxOutputTokens: 100,
      fallback: { main: "fallback" },
      validate: (value): value is { main: string } => (
        Boolean(value) && typeof value === "object" && typeof (value as { main?: unknown }).main === "string"
      ),
    });

    expect(result).toEqual({
      ok: false,
      error: "Diana could not verify the AI response. Try again.",
    });
    expect(mocks.logInteraction).toHaveBeenCalledTimes(1);
  });

  it("fails closed when text provider output is empty", async () => {
    mocks.runSafe.mockResolvedValueOnce({
      ok: true,
      value: { content: "   ", model: "gpt-test", tokens: 2 },
      reservationId: "reservation-empty-text",
    });

    const result = await runOpenAIHomeworkText({
      ownerId: "student-1",
      accounting: {} as never,
      task: "study_buddy",
      messages: [{ role: "system", content: "Tutor" }, { role: "user", content: "Help" }],
      maxOutputTokens: 100,
    });

    expect(result).toEqual({
      ok: false,
      error: "Diana could not verify the AI response. Try again.",
    });
    expect(mocks.logInteraction).toHaveBeenCalledTimes(1);
  });

  it("parses structured output and logs the normalized homework feature", async () => {
    mocks.runSafe.mockResolvedValueOnce({
      ok: true,
      value: { content: '{"main":"Try the next operation."}', model: "gpt-test", tokens: 12 },
      reservationId: "reservation-1",
    });

    const result = await runOpenAIHomeworkJson({
      ownerId: "student-1",
      assignmentId: "assignment-1",
      accounting: {} as never,
      task: "source_extraction",
      messages: [{ role: "system", content: "Extract" }, { role: "user", content: "Worksheet" }],
      maxOutputTokens: 100,
      fallback: { main: "fallback" },
      validate: (value): value is { main: string } => (
        Boolean(value) && typeof value === "object" && typeof (value as { main?: unknown }).main === "string"
      ),
      fetcher: vi.fn(),
      idempotencyKey: "key-2",
    });

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      value: { main: "Try the next operation." },
      model: "gpt-test",
      tokens: 12,
    }));
    expect(mocks.logInteraction).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      assignmentId: "assignment-1",
      feature: "doc_extract",
      model: "gpt-test",
      correlationId: "key-2",
      tokensUsed: 12,
    }), expect.any(Object));
  });

  it("uses GPT homework tiers and retries transient provider failures", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
    mocks.runSafe.mockImplementationOnce(async (options: { invoke: () => Promise<{ content: string; model: string; tokens: number }> }) => ({
      ok: true,
      value: await options.invoke(),
      reservationId: "reservation-2",
    }));
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        model: "gpt-5.6-luna",
        output: [{ content: [{ type: "output_text", text: '{"main":"Try one line."}' }] }],
        usage: { input_tokens: 5, output_tokens: 4 },
      }), { status: 200 }));

    const result = await runOpenAIHomeworkJson({
      ownerId: "student-1",
      accounting: {} as never,
      task: "study_buddy",
      messages: [{ role: "system", content: "Tutor" }, { role: "user", content: "Help" }],
      maxOutputTokens: 123,
      fallback: { main: "fallback" },
      validate: (value): value is { main: string } => (
        Boolean(value) && typeof value === "object" && typeof (value as { main?: unknown }).main === "string"
      ),
      fetcher,
      idempotencyKey: "key-3",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const requestBody = JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body ?? "{}")) as Record<string, unknown>;
    expect(fetcher.mock.calls[1]?.[0]).toBe("https://api.openai.com/v1/responses");
    expect(requestBody.model).toBe("gpt-5.6-luna");
    expect(requestBody.max_output_tokens).toBe(123);
    expect(requestBody.reasoning).toEqual({ effort: "low" });
    expect(requestBody).not.toHaveProperty("max_completion_tokens");
    expect(requestBody).not.toHaveProperty("max_tokens");
    expect(requestBody.text).toEqual({ format: { type: "json_object" } });
    expect(requestBody.store).toBe(false);
    expect(result).toEqual(expect.objectContaining({
      ok: true,
      value: { main: "Try one line." },
      tokens: 9,
    }));
    vi.unstubAllEnvs();
  });});
