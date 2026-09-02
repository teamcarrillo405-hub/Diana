import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createAiServiceClient: vi.fn(),
  loadKernel: vi.fn(),
  formatKernel: vi.fn(),
  modelRouting: vi.fn(),
  authorshipMetadata: vi.fn(),
  assertAllowed: vi.fn(),
  runText: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/ai-service", () => ({ createAiServiceClient: mocks.createAiServiceClient }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({
  loadAssignmentHomeworkKernel: mocks.loadKernel,
  formatHomeworkKernelForTutor: mocks.formatKernel,
  homeworkModelRouting: mocks.modelRouting,
  homeworkAuthorshipMetadata: mocks.authorshipMetadata,
}));
vi.mock("@/lib/ai/diana-trust-rules", () => ({ assertDianaHomeworkAllowed: mocks.assertAllowed }));
vi.mock("@/lib/ai/openai-homework-adapter", () => ({ runOpenAIHomeworkText: mocks.runText }));
vi.mock("@/lib/ai/system-prompts", () => ({ composeSystemPrompt: (value: string) => value }));

import { POST } from "./route";

const assignmentId = "11111111-1111-4111-8111-111111111111";

function request(body: unknown = {
  assignmentId,
  question: "Why does subtracting five preserve equality?",
  reason: "The student needs a conceptual explanation.",
  fields: [{ label: "Student work", value: "3x + 5 = 20" }],
}) {
  return new Request("http://diana.test/api/diana/assignment-realtime/reason", {
    method: "POST",
    headers: { "content-type": "application/json", "x-idempotency-key": "call-1" },
    body: JSON.stringify(body),
  });
}

describe("assignment realtime reasoning route", () => {
  const insert = vi.fn(async () => ({ error: null }));

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "student-1" } } })) },
    });
    mocks.createAiServiceClient.mockReturnValue({ from: vi.fn(() => ({ insert })) });
    mocks.loadKernel.mockResolvedValue({
      assignment: { id: assignmentId },
      trustDecision: { allowed: true },
    });
    mocks.assertAllowed.mockReturnValue({ ok: true });
    mocks.formatKernel.mockReturnValue("Grounded assignment context");
    mocks.modelRouting.mockReturnValue({ subjectDomain: "mathematics", sourceChars: 40 });
    mocks.authorshipMetadata.mockReturnValue({ subjectDomain: "mathematics" });
    mocks.runText.mockResolvedValue({
      ok: true,
      value: "Subtracting the same amount from both sides keeps the scale balanced.",
      model: "gpt-5.6-sol",
      tokens: 80,
      rawContent: "Subtracting the same amount from both sides keeps the scale balanced.",
    });
  });

  it("uses the strongest homework reasoning path with grounded assignment context", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: true,
      model: "gpt-5.6-sol",
    }));
    expect(mocks.loadKernel).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      assignmentId,
    }));
    expect(mocks.runText).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      assignmentId,
      task: "realtime",
      quality: "complex",
      idempotencyKey: "call-1",
      messages: expect.arrayContaining([
        expect.objectContaining({ role: "user", content: expect.stringContaining("Grounded assignment context") }),
      ]),
    }));
  });

  it("rejects an invalid assignment or empty question before model use", async () => {
    const response = await POST(request({ assignmentId: "not-valid", question: "", fields: [] }));

    expect(response.status).toBe(400);
    expect(mocks.loadKernel).not.toHaveBeenCalled();
    expect(mocks.runText).not.toHaveBeenCalled();
  });

  it("does not run reasoning when Diana trust rules deny the request", async () => {
    mocks.assertAllowed.mockReturnValue({ ok: false, error: "Diana cannot help with that request." });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.runText).not.toHaveBeenCalled();
  });
});
