import { describe, expect, it, vi } from "vitest";

import {
  createDianaBreakDownProviderResult,
  createDianaStudyHelperProviderResult,
  createDianaStudyHelperResponse,
} from "./diana-study-helper-sidecar";

describe("Diana study helper preferences", () => {
  it("sends the saved tutor presentation, style, and complexity to the server-side helper", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              title: "Guided step",
              main: "Name the evidence you want to explain.",
              reason: "That keeps the reasoning in your words.",
              steps: ["Point to the quote.", "Explain one phrase.", "Connect it to the claim."],
              anchor: "This help is anchored to: Use one quote.",
            }),
          },
        }],
      }),
    });

    await createDianaStudyHelperResponse({
      input: {
        source: "Use one quote.",
        question: "How do I begin?",
        mode: "guide",
        tutorPersona: "xavier",
        tutorStyle: "supportive",
        complexity: "advanced",
      },
      config: {
        provider: "openjarvis",
        baseUrl: "http://127.0.0.1:8000",
        model: "local-default",
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const request = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body)) as { messages: Array<{ role: string; content: string }> };
    const userMessage = payload.messages.find((message) => message.role === "user")?.content ?? "";

    expect(userMessage).toContain("Tutor Xavier");
    expect(userMessage).toContain("Supportive");
    expect(userMessage).toContain("Advanced complexity");
  });
});

describe("Diana study helper provider accounting metadata", () => {
  it("preserves malformed HTTP 200 output for moderation and accounting", async () => {
    const result = await createDianaStudyHelperProviderResult({
      input: { source: "Class source", question: "How do I begin?", mode: "guide" },
      config: { provider: "openjarvis", baseUrl: "http://127.0.0.1:8000", model: "local" },
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "not valid structured JSON" } }],
          usage: { prompt_tokens: 8, completion_tokens: 3 },
        }),
      }) as unknown as typeof fetch,
    });

    expect(result.malformed).toBe(true);
    expect(result.moderationContent).toBe("not valid structured JSON");
    expect(result.tokens).toBe(11);
    expect(result.value.title).toBe("Guided step");
  });

  it("preserves malformed break-down output instead of hiding provider consumption", async () => {
    const result = await createDianaBreakDownProviderResult({
      input: { assignment: "Write a paragraph." },
      config: { provider: "openjarvis", baseUrl: "http://127.0.0.1:8000", model: "local" },
      fetchImpl: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "malformed steps" } }] }),
      }) as unknown as typeof fetch,
    });

    expect(result.malformed).toBe(true);
    expect(result.moderationContent).toBe("malformed steps");
    expect(result.value).toHaveLength(1);
  });
});
