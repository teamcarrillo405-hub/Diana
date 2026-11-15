import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
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
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeSupabase(),
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
    functions: { invoke: mocks.invoke },
    from: (table: string) => {
      if (table === "assignments") return chain({ data: mocks.assignment, error: null });
      if (table === "classes") return chain({ data: { ai_mode: mocks.classAiMode }, error: null });
      if (table === "assignment_sources") return chain({ data: mocks.sources, error: null });
      return chain({ data: null, error: null });
    },
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
    mocks.classAiMode = "green";
    mocks.invoke.mockResolvedValue({
      data: {
        ok: true,
        clientSecret: "ek_test_secret",
        expiresAt: 1770000000,
        sessionId: "sess_test",
        model: "gpt-realtime-mini",
        realtimeUrl: "https://api.openai.com/v1/realtime/calls",
      },
      error: null,
    });
  });

  it("uses the protected Supabase function when the local server has no OpenAI key", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(expect.objectContaining({
      ok: true,
      clientSecret: "ek_test_secret",
      sessionId: "sess_test",
    }));
    expect(mocks.invoke).toHaveBeenCalledWith("assignment-realtime", expect.objectContaining({
      body: expect.objectContaining({
        ownerId: "student-1",
        assignmentId: "11111111-1111-4111-8111-111111111111",
        idempotencyKey: "rt-1",
        fieldCount: 1,
        context: expect.stringContaining("Algebra practice"),
      }),
    }));
    expect(JSON.stringify(json)).not.toContain("Solve each equation");
  });

  it("keeps direct-to-student realtime voice available when the dormant class policy is yellow", async () => {
    mocks.classAiMode = "yellow";

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.invoke).toHaveBeenCalledOnce();
  });

  it("rejects invalid assignment ids before calling the edge function", async () => {
    const response = await POST(request({ assignmentId: "not-valid", fields: [] }));

    expect(response.status).toBe(400);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it("keeps a protected edge failure readable to the student", async () => {
    mocks.invoke.mockResolvedValue({
      data: { ok: false, code: "realtime_rate_limited", error: "Voice Diana is busy right now. Try again in a moment." },
      error: { context: new Response(JSON.stringify({ ok: false, code: "realtime_rate_limited", error: "Voice Diana is busy right now. Try again in a moment." }), { status: 503 }) },
    });

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(expect.objectContaining({
      ok: false,
      code: "realtime_rate_limited",
    }));
  });
});
