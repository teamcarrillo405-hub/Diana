import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSafe: vi.fn(),
  log: vi.fn(),
  provider: vi.fn(),
  createAiServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/safety", () => ({
  runSafeBudgetedAiCall: mocks.runSafe,
  logInteraction: mocks.log,
}));

vi.mock("@/lib/integrations/diana-study-helper-sidecar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/integrations/diana-study-helper-sidecar")>();
  return { ...actual, createDianaBreakDownProviderResult: mocks.provider };
});

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

describe("break-down AI guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DIANA_OPENJARVIS_SIDECAR_ENABLED", "true");
    mocks.provider.mockResolvedValue({
      value: [{ step: 1, action: "Circle the deliverable.", minutes: 3, done: false }],
      moderationContent: "provider raw output",
      tokens: 31,
      malformed: false,
    });
    mocks.runSafe.mockImplementation(async (options: { invoke: () => Promise<unknown> }) => ({
      ok: true,
      value: await options.invoke(),
      reservationId: "reservation-1",
    }));
    mocks.log.mockResolvedValue(undefined);
    mocks.createAiServiceClient.mockReturnValue(makeSupabase());
  });

  it("uses the atomic guard and moderates the raw provider body", async () => {
    const response = await POST(new Request("http://diana.test/api/diana/break-down", {
      method: "POST",
      headers: { "content-type": "application/json", "x-idempotency-key": "break-1" },
      body: JSON.stringify({ assignment: "Write a source-based paragraph." }),
    }));

    expect(response.status).toBe(200);
    expect(mocks.runSafe).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      supabase: mocks.createAiServiceClient.mock.results[0]?.value,
      idempotencyKey: "break-1",
      getOutput: expect.any(Function),
      getTokens: expect.any(Function),
    }));
    expect(mocks.provider).toHaveBeenCalledOnce();
    expect(mocks.log).toHaveBeenCalledWith(
      expect.any(Object),
      mocks.createAiServiceClient.mock.results[0]?.value,
    );
  });
});
