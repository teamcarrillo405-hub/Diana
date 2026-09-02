import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSafe: vi.fn(),
  estimateTokenReservation: vi.fn(),
  logInteraction: vi.fn(),
  createAiServiceClient: vi.fn(),
  classAiMode: "green",
  assignment: {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Algebra practice",
    description: "Solve each equation and show the inverse operation.",
    rubric_text: "Show work and check the answer.",
    kind: "math",
    class_id: "class-1",
    work_profile: "math",
    assignment_profile: { legacyMode: "math", subjectDomain: "mathematics" },
  },
  sources: [{
    source_type: "attachment",
    title: "Worksheet page 1",
    extracted_text: "1. x + 4 = 9",
    source_location: "page 1",
  }],
  count: 0,
}));

vi.mock("@/lib/ai/safety", () => ({
  estimateTokenReservation: mocks.estimateTokenReservation,
  logInteraction: mocks.logInteraction,
  runSafeBudgetedAiCall: mocks.runSafe,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeSupabase(),
}));

vi.mock("@/lib/supabase/ai-service", () => ({
  createAiServiceClient: mocks.createAiServiceClient,
}));

import { POST } from "./route";

function chain(value: unknown) {
  const api: any = {
    select: () => api,
    eq: () => api,
    gte: () => api,
    order: () => api,
    limit: () => api,
    insert: vi.fn(async () => ({ error: null })),
    maybeSingle: () => Promise.resolve(value),
    then: (resolve: (result: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(value).then(resolve, reject),
  };
  return api;
}

function makeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "student-1" } } }) },
    from: (table: string) => {
      if (table === "assignments") return chain({ data: mocks.assignment, error: null });
      if (table === "classes") return chain({ data: { ai_mode: mocks.classAiMode }, error: null });
      if (table === "assignment_sources") return chain({ data: mocks.sources, error: null });
      return chain({ data: null, error: null });
    },
  };
}

function makeAccounting() {
  const authorship: any = {
    select: () => authorship,
    eq: () => authorship,
    gte: () => Promise.resolve({ count: mocks.count, error: null }),
    insert: vi.fn(async () => ({ error: null })),
  };
  return {
    from: (table: string) => table === "authorship_log" ? authorship : chain({ data: null, error: null }),
    rpc: vi.fn(),
  };
}

function request(body: unknown = { assignmentId: "11111111-1111-4111-8111-111111111111", fields: [{ label: "Student work", value: "I subtracted 4." }] }) {
  return new Request("http://diana.test/api/diana/assignment-realtime", {
    method: "POST",
    headers: { "content-type": "application/json", "x-idempotency-key": "rt-1" },
    body: JSON.stringify(body),
  });
}

describe("assignment realtime route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mocks.classAiMode = "green";
    mocks.count = 0;
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubEnv("OPENAI_REALTIME_MODEL", "gpt-realtime-mini");
    mocks.estimateTokenReservation.mockReturnValue(1234);
    mocks.logInteraction.mockResolvedValue(undefined);
    mocks.createAiServiceClient.mockReturnValue(makeAccounting());
    mocks.runSafe.mockImplementation(async (options: { invoke: () => Promise<unknown> }) => ({
      ok: true,
      value: await options.invoke(),
      reservationId: "reservation-1",
    }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      value: "ek_test_secret",
      expires_at: 1770000000,
      session: { id: "sess_test", model: "gpt-realtime-mini" },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
  });

  it("returns a short-lived realtime client secret without returning assignment context", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(expect.objectContaining({
      ok: true,
      clientSecret: "ek_test_secret",
      expiresAt: 1770000000,
      sessionId: "sess_test",
      model: "gpt-realtime-mini",
      realtimeUrl: "https://api.openai.com/v1/realtime/calls",
    }));
    expect(JSON.stringify(json)).not.toContain("Solve each equation");
    expect(fetch).toHaveBeenCalledWith("https://api.openai.com/v1/realtime/client_secrets", expect.objectContaining({ method: "POST" }));
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.expires_after.seconds).toBe(600);
    expect(body.session.instructions).toContain("Algebra practice");
    expect(body.session.instructions).toContain("Worksheet page 1");
    expect(body.session.instructions).toContain("Diana universal homework method");
    expect(body.session.instructions).toContain("Help level: 30%");
    expect(body.session.instructions).toContain("vertical equation steps");
    expect(body.session.tool_choice).toBe("auto");
    expect(body.session.tools).toEqual([
      expect.objectContaining({ type: "function", name: "answer_complex_homework" }),
    ]);
  });

  it("uses the guarded budget wrapper and logs only metadata", async () => {
    await POST(request());

    expect(mocks.runSafe).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      idempotencyKey: "rt-1",
      maxOutputTokens: 450,
      getOutput: expect.any(Function),
      getTokens: expect.any(Function),
    }));
    expect(mocks.logInteraction).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: "student-1",
      assignmentId: "11111111-1111-4111-8111-111111111111",
      feature: "assignment_realtime",
      model: "gpt-realtime-mini",
      correlationId: "rt-1",
    }), expect.any(Object));
  });

  it("uses the current Realtime mini model when no model override is configured", async () => {
    vi.stubEnv("OPENAI_REALTIME_MODEL", "");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { session: { model: string } };
      return new Response(JSON.stringify({
        value: "ek_test_secret",
        expires_at: 1770000000,
        session: { id: "sess_test", model: body.session.model },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));

    const response = await POST(request());

    expect(response.status).toBe(200);
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(body.session.model).toBe("gpt-realtime-2.1-mini");
  });

  it("keeps direct-to-student realtime voice available when the dormant class policy is yellow", async () => {
    mocks.classAiMode = "yellow";

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.objectContaining({ ok: true, clientSecret: "ek_test_secret" }));
    expect(fetch).toHaveBeenCalledWith("https://api.openai.com/v1/realtime/client_secrets", expect.objectContaining({ method: "POST" }));
  });

  it("rejects invalid assignment ids before opening realtime", async () => {
    const response = await POST(request({ assignmentId: "not-valid", fields: [] }));

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
