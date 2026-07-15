import { describe, expect, it, vi } from "vitest";

import { createDianaStudyHelperResponse } from "./diana-study-helper-sidecar";

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
