import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSafe: vi.fn(),
  guard: vi.fn(),
  log: vi.fn(),
  provider: vi.fn(),
  createAiServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/safety", () => ({
  runSafeBudgetedAiCall: mocks.runSafe,
  guardStudentContent: mocks.guard,
  logInteraction: mocks.log,
}));

vi.mock("@/lib/integrations/diana-study-helper-sidecar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/diana-study-helper-sidecar")>();
  return { ...actual, createDianaStudyHelperProviderResult: mocks.provider };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeSupabase(),
}));

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
  const profiles: any = {
    select: () => profiles,
    eq: () => profiles,
    maybeSingle: () => Promise.resolve({
      data: { tutor_persona: "diana", tutor_style: "socratic", tutor_complexity: "balanced" },
      error: null,
    }),
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => table === "profiles" ? profiles : authorship,
    rpc: vi.fn(),
  };
}

function request() {
  return new Request("http://diana.test/api/diana/study-buddy", {
    method: "POST",
    headers: { "content-type": "application/json", "x-idempotency-key": "study-1" },
    body: JSON.stringify({ source: "A class source", question: "How do I start?", mode: "guide" }),
  });
}

describe("study buddy AI guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DIANA_OPENJARVIS_SIDECAR_ENABLED", "true");
    const providerResult = {
      value: {
        title: "Guided step",
        main: "Name one source detail.",
        reason: "That keeps the work yours.",
        steps: ["Point to it.", "Explain it.", "Connect it."],
        anchor: "This help is anchored to: A class source",
      },
      moderationContent: "provider raw output",
      tokens: 42,
      malformed: false,
    };
    mocks.provider.mockResolvedValue(providerResult);
    mocks.runSafe.mockImplementation(async (options: { invoke: () => Promise<unknown> }) => ({
      ok: true,
      value: await options.invoke(),
      reservationId: "reservation-1",
    }));
    mocks.guard.mockResolvedValue(null);
    mocks.log.mockResolvedValue(undefined);
    mocks.createAiServiceClient.mockReturnValue(makeSupabase());
  });

  it("routes provider input and raw output through atomic moderation accounting", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.runSafe).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      supabase: mocks.createAiServiceClient.mock.results[0]?.value,
      idempotencyKey: "study-1",
      getOutput: expect.any(Function),
      getTokens: expect.any(Function),
    }));
    expect(mocks.provider).toHaveBeenCalledOnce();
  });

  it("never uses the cookie client for privileged accounting", async () => {
    const service = makeSupabase();
    mocks.createAiServiceClient.mockReturnValue(service);

    await POST(request());

    expect(mocks.runSafe).toHaveBeenCalledWith(expect.objectContaining({ supabase: service }));
    expect(mocks.log).toHaveBeenCalledWith(expect.any(Object), service);
  });

  it("preserves a calm safety redirect", async () => {
    mocks.runSafe.mockResolvedValueOnce({
      ok: false,
      kind: "safety",
      status: 422,
      code: "safety_redirect",
      message: "I cannot help plan harm. I can help with a safe class analysis.",
    });

    const response = await POST(request());

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      error: "I cannot help plan harm. I can help with a safe class analysis.",
    });
  });
});
