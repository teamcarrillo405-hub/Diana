import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  savedCapture: vi.fn(),
  startedFocus: vi.fn(),
  text: vi.fn(),
  authorize: vi.fn(),
  record: vi.fn(),
  runSafe: vi.fn(),
  log: vi.fn(),
  existingAction: null as null | { payload: unknown },
}));

vi.mock('server-only', () => ({}));
vi.mock("@/lib/learning-engine/today-assistance", async (original) => ({
  ...await original<typeof import("@/lib/learning-engine/today-assistance")>(),
  authorizeTodayAcademicScope: mocks.authorize, recordTodayAcademicAssistance: mocks.record,
}));
vi.mock("@/app/(app)/quick-add/actions", () => ({ saveInboxItem: mocks.savedCapture }));
vi.mock("@/app/(app)/timer/actions", () => ({ startFocusSession: mocks.startedFocus }));
vi.mock("@/lib/ai/openai-homework-adapter", () => ({
  runOpenAIHomeworkText: mocks.text,
  openAIHomeworkModel: () => "gpt-5-mini",
}));
vi.mock("@/lib/ai/safety", () => ({
  estimateTokenReservation: () => 300,
  logInteraction: mocks.log,
  runSafeBudgetedAiCall: mocks.runSafe,
}));
vi.mock("@/lib/supabase/ai-service", () => ({ createAiServiceClient: () => ({ from: () => ({ insert: vi.fn() }) }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeSupabase() }));

import { POST } from "./route";
import { TodayAssistanceError } from "@/lib/learning-engine/today-assistance";

function chain(result: unknown) {
  const api: any = {
    select: () => api,
    eq: () => api,
    not: () => api,
    order: () => api,
    limit: () => api,
    contains: () => api,
    insert: vi.fn(async () => ({ error: null })),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  return api;
}

function makeSupabase() {
  return {
    auth: { getUser: async () => ({ data: { user: mocks.signedIn ? { id: "student-1" } : null } }) },
    from: (table: string) => {
      if (table === "authorship_log") return chain({ data: mocks.existingAction });
      if (table === "assignments") return chain({ data: [{ id: "11111111-1111-4111-8111-111111111111", title: "Algebra", description: null, due_at: "2026-08-15T20:00:00Z", status: "captured", estimated_minutes: 30, classes: { name: "Math" } }] });
      return chain({ data: null });
    },
  };
}

function request(name: string, args: Record<string, unknown> = {}, callId = "call-1") {
  return new Request("http://diana.test/api/diana/today-tools", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callId, name, arguments: args }),
  });
}

describe("Today voice tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    mocks.signedIn = true;
    mocks.authorize.mockImplementation(async (_client, _owner, args) => args.assignmentId ?? null);
    mocks.record.mockResolvedValue('scoped-dispatch-key');
    mocks.text.mockResolvedValue({ ok: true, value: 'A short explanation.' });
    mocks.runSafe.mockImplementation(async (options) => ({ ok: true, value: await options.invoke() }));
    mocks.existingAction = null;
    vi.stubEnv("TODAY_ACTION_SECRET", "test-secret-with-enough-entropy");
    mocks.savedCapture.mockResolvedValue({ ok: true, id: "capture-1" });
    mocks.startedFocus.mockResolvedValue({ ok: true, sessionId: 2, startedAt: "now", targetAt: "later", clientSessionId: null });
  });

  it("prepares a signed confirmation before opening a destination", async () => {
    const response = await POST(request("open_destination", { destination: "work" }));
    const result = await response.json();
    expect(result.ok).toBe(true);
    expect(result.confirmation).toEqual(expect.objectContaining({ action: "open_destination", title: "Open this page?" }));

    const confirmed = await POST(request("confirm_action", { token: result.confirmation.token }, "call-2"));
    expect(await confirmed.json()).toEqual(expect.objectContaining({ ok: true, data: { href: "/assignments" } }));
    expect(mocks.savedCapture).not.toHaveBeenCalled();
    expect(mocks.startedFocus).not.toHaveBeenCalled();
  });

  it("does not request weather until the client supplies location or a city", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request("get_weather"));
    expect(await response.json()).toEqual(expect.objectContaining({ ok: false, needsLocation: true }));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rounds browser coordinates before calling Open-Meteo", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ current: { temperature_2m: 72, apparent_temperature: 71 }, daily: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request("get_weather", { latitude: 45.523064, longitude: -122.676483 }));
    expect((await response.json()).ok).toBe(true);
    const url = new URL(String(fetcher.mock.calls[0]?.[0]));
    expect(url.searchParams.get("latitude")).toBe("45.52");
    expect(url.searchParams.get("longitude")).toBe("-122.68");
  });

  it("rejects unauthenticated tool calls", async () => {
    mocks.signedIn = false;
    const response = await POST(request("list_assignments"));
    expect(response.status).toBe(401);
  });
  it("hands an explicit assignment and exact complex recipe through the awaited boundary", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    mocks.record.mockImplementationOnce(async () => {
      expect(mocks.text).not.toHaveBeenCalled();
      return "bound-complex-key";
    });
    const response = await POST(request("answer_complex_question", { question: "Explain slopes", assignmentId }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const options = mocks.text.mock.calls[0][0];
    expect(options).toMatchObject({ assignmentId, idempotencyKey: "bound-complex-key", quality: "complex", maxOutputTokens: 700 });
    expect(mocks.record.mock.calls[0][1]).toMatchObject({ assignmentId, surface: "today-complex", callId: "call-1", recipe: { messages: options.messages, maxOutputTokens: 700 } });
  });

  it("does not borrow Next Move scope for a general question", async () => {
    await POST(request("answer_complex_question", { question: "Explain slopes" }));
    expect(mocks.authorize.mock.calls[0][2]).toEqual({ question: "Explain slopes" });
    expect(mocks.text.mock.calls[0][0].assignmentId).toBeNull();
    expect(mocks.record.mock.calls[0][1].assignmentId).toBeNull();
  });

  it.each(["answer_complex_question", "search_current_information"])("blocks %s dispatch if the receipt is unavailable", async (name) => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
    mocks.record.mockRejectedValueOnce(new Error("receipt unavailable"));
    const response = await POST(request(name, { assignmentId: "11111111-1111-4111-8111-111111111111", question: "Explain slopes", query: "Current events" }));
    expect(response.status).toBe(503);
    expect(mocks.text).not.toHaveBeenCalled();
    expect(mocks.runSafe).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("records search scope before dispatch and retains it in the audit event", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    const fetcher = vi.fn(async (_url: unknown, _options?: RequestInit) => new Response(JSON.stringify({ output_text: "A current fact." })));
    vi.stubGlobal("fetch", fetcher);
    mocks.record.mockImplementationOnce(async () => { expect(fetcher).not.toHaveBeenCalled(); return "search-bound-key"; });
    await POST(request("search_current_information", { query: "Current climate findings", assignmentId }));
    expect(mocks.record.mock.calls[0][1]).toMatchObject({ assignmentId, surface: "today-search", recipe: { body: JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) } });
    expect(mocks.log.mock.calls[0][0]).toMatchObject({ assignmentId, correlationId: "search-bound-key" });
  });

  it.each([400, 403, 404])("blocks academic tools before provider dispatch on scope denial %s", async status => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn());
    for (const name of ["answer_complex_question", "search_current_information"]) {
      mocks.authorize.mockRejectedValueOnce(new TodayAssistanceError(status, "Scope unavailable."));
      const response = await POST(request(name, { assignmentId: "11111111-1111-4111-8111-111111111111", query: "Current events", question: "Explain slopes" }));
      expect(response.status).toBe(status);
    }
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.text).not.toHaveBeenCalled();
    expect(mocks.runSafe).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

});
