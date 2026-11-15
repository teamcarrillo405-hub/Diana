import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runSafe: vi.fn(),
  authorize: vi.fn(),
  record: vi.fn(),
  estimate: vi.fn(),
  log: vi.fn(),
  service: vi.fn(),
  signedIn: true,
}));

vi.mock('server-only', () => ({}));
vi.mock("@/lib/learning-engine/today-assistance", async (original) => ({
  ...await original<typeof import("@/lib/learning-engine/today-assistance")>(),
  authorizeTodayAcademicScope: mocks.authorize, recordTodayAcademicAssistance: mocks.record,
}));
vi.mock("@/lib/ai/safety", () => ({
  estimateTokenReservation: mocks.estimate,
  logInteraction: mocks.log,
  runSafeBudgetedAiCall: mocks.runSafe,
}));
vi.mock("@/lib/supabase/ai-service", () => ({ createAiServiceClient: mocks.service }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeSupabase() }));

import { POST } from "./route";
import { TodayAssistanceError } from "@/lib/learning-engine/today-assistance";

function chain(result: unknown) {
  const api: any = {
    select: () => api,
    eq: () => api,
    not: () => api,
    gte: () => api,
    order: () => api,
    limit: () => api,
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  return api;
}

function makeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: mocks.signedIn ? { id: "student-1" } : null } }) },
    from: (table: string) => {
      if (table === "assignments") return chain({ data: [{ id: "a-1", title: "Nixon report", due_at: "2026-08-15T20:00:00Z", status: "captured", estimated_minutes: 60, classes: { name: "History" } }] });
      if (table === "profiles") return chain({ data: { display_name: "Grayson", diagnoses: ["ADHD"], accommodations: [], reduced_motion: false, dyslexia_font: false, high_contrast: false, timezone: "America/Los_Angeles" } });
      if (table === "task_signals") return chain({ data: { value: { energy: "good", sleep: "seven_to_nine", meals: "meal" } } });
      return chain({ data: null });
    },
  };
}

function accounting() {
  return { from: () => ({ insert: vi.fn(async () => ({ error: null })) }), rpc: vi.fn() };
}

describe("Today realtime route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.signedIn = true;
    mocks.authorize.mockImplementation(async (_client, _owner, args) => args.assignmentId ?? null);
    mocks.record.mockResolvedValue('realtime-bound-key');
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    mocks.estimate.mockReturnValue(640);
    mocks.service.mockReturnValue(accounting());
    mocks.runSafe.mockImplementation(async (options: { invoke: () => Promise<unknown> }) => ({ ok: true, value: await options.invoke(), reservationId: "r-1" }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      value: "ek_today_secret",
      expires_at: 1770000000,
      session: { id: "sess-today", model: "gpt-realtime-mini" },
    }), { status: 200, headers: { "content-type": "application/json" } })));
  });

  it("returns only the ephemeral secret while keeping Today context server-side", async () => {
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST", headers: { "x-idempotency-key": "today-1" } }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual(expect.objectContaining({ ok: true, clientSecret: "ek_today_secret", sessionId: "sess-today" }));
    expect(JSON.stringify(json)).not.toContain("Nixon report");
    const body = JSON.parse(String((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.body));
    expect(body.session.tool_choice).toBe("auto");
    expect(body.session.tools.map((item: { name: string }) => item.name)).toEqual(expect.arrayContaining([
      "get_today_summary",
      "get_weather",
      "search_current_information",
      "answer_complex_question",
      "confirm_action",
    ]));
    expect(body.session.instructions).toContain("Nixon report");
    expect(body.session.instructions).toContain("ADHD");
  });

  it("requires authentication before creating a provider session", async () => {
    mocks.signedIn = false;
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST" }));
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("exposes optional academic scope and leaves a general session unscoped", async () => {
    await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST" }));
    expect(mocks.authorize.mock.calls[0][2]).toEqual({});
    expect(mocks.record.mock.calls[0][1].assignmentId).toBeNull();
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body.session.instructions).toContain('"academicAssignmentId":null');
    expect(body.session.instructions).toContain('Never infer scope from Next Move');
    for (const name of ['answer_complex_question', 'search_current_information']) {
      const tool = body.session.tools.find((item: { name: string }) => item.name === name);
      expect(tool.parameters.properties.assignmentId).toMatchObject({ type: 'string', format: 'uuid' });
      expect(tool.parameters.required).not.toContain('assignmentId');
    }
  });

  it("receipts an explicit assignment and exact session recipe before minting a secret", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    mocks.record.mockImplementationOnce(async () => { expect(fetch).not.toHaveBeenCalled(); return 'scoped-live-key'; });
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST", body: JSON.stringify({ assignmentId }) }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(mocks.record.mock.calls[0][1]).toMatchObject({ assignmentId, surface: 'today-realtime', recipe: body });
    expect(mocks.runSafe.mock.calls[0][0].idempotencyKey).toBe('scoped-live-key');
    expect(mocks.log.mock.calls[0][0].assignmentId).toBe(assignmentId);
    expect(body.session.instructions).toContain(assignmentId);
  });

  it("blocks session minting when its receipt fails", async () => {
    mocks.record.mockRejectedValueOnce(new Error('receipt unavailable'));
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST", body: JSON.stringify({ assignmentId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(503);
    expect(mocks.runSafe).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed session JSON before private context or provider dispatch", async () => {
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
    expect(mocks.authorize).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([400, 403, 404])("blocks live session dispatch on scope denial %s", async status => {
    mocks.authorize.mockRejectedValueOnce(new TodayAssistanceError(status, "Scope unavailable."));
    const response = await POST(new Request("http://diana.test/api/diana/today-realtime", { method: "POST", body: JSON.stringify({ assignmentId: "11111111-1111-4111-8111-111111111111" }) }));
    expect(response.status).toBe(status);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.runSafe).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

});
