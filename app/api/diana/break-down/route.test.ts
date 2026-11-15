import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  selectHomeworkModelTier,
  type HomeworkModelRouting,
} from "@/lib/ai/homework-model-tier";

const mocks = vi.hoisted(() => ({
  runOpenAIHomeworkJson: vi.fn(),
  createAiServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/openai-homework-adapter", () => ({
  runOpenAIHomeworkJson: mocks.runOpenAIHomeworkJson,
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeSupabase() }));
vi.mock("@/lib/supabase/ai-service", () => ({
  createAiServiceClient: mocks.createAiServiceClient,
}));

import { POST } from "./route";

function makeSupabase() {
  const authorship: any = {
    select: () => authorship,
    eq: () => authorship,
    gte: () => Promise.resolve({ count: 0, error: null }),
    insert: () => Promise.resolve({ error: null }),
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: "student-1" } } }) },
    from: () => authorship,
    rpc: vi.fn(),
  };
}

describe("break-down homework route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runOpenAIHomeworkJson.mockResolvedValue({
      ok: true,
      value: { steps: [{ step: 1, action: "Circle the deliverable.", minutes: 3, done: false }] },
      model: "gpt-homework-test",
      tokens: 31,
      rawContent: "{}",
    });
    mocks.createAiServiceClient.mockReturnValue(makeSupabase());
  });

  it("uses the shared OpenAI homework adapter and authorship receipt", async () => {
    const response = await POST(new Request("http://diana.test/api/diana/break-down", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "break-1" },
      body: JSON.stringify({ assignment: "Write a source-based paragraph." }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      steps: [{ step: 1, action: "Circle the deliverable.", minutes: 3, done: false }],
    });
    expect(mocks.runOpenAIHomeworkJson).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      accounting: mocks.createAiServiceClient.mock.results[0]?.value,
      task: "break_down",
      idempotencyKey: "break-1",
      validate: expect.any(Function),
    }));
    const args = mocks.runOpenAIHomeworkJson.mock.calls[0]?.[0];
    expect(args.messages[0].content).toContain("student-owned homework planning helper");
    expect(args.messages[1].content).toContain("Write a source-based paragraph.");
  });

  it.each([
    ["AP Calculus: use derivatives to analyze the function.", "mathematics", "high_advanced"],
    ["AP Chemistry: plan the stoichiometry calculation for this reaction.", "science", "high_advanced"],
    ["Complete a DBQ using evidence from the provided primary sources.", "social_studies", null],
    ["Plan a research paper that synthesizes five sources.", "interdisciplinary", null],
    ["Debug this Python recursion exercise and document the smallest test.", "computer_science", null],
    ["Interpret this unfamiliar engineering technical specification.", "engineering", null],
  ] as const)(
    "passes complex routing signals for %s",
    async (assignment, subjectDomain, academicBand) => {
      const response = await POST(new Request("http://diana.test/api/diana/break-down", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignment }),
      }));

      expect(response.status).toBe(200);
      const routing = mocks.runOpenAIHomeworkJson.mock.calls[0]?.[0]?.routing as HomeworkModelRouting;
      expect(routing).toEqual(expect.objectContaining({
        subjectDomain,
        academicBand,
        sourceChars: assignment.length,
        signals: assignment,
      }));
      expect(selectHomeworkModelTier({ task: "break_down", ...routing })).toBe("complex");
    },
  );
});
