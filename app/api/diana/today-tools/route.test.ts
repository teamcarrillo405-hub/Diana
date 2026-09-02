import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signedIn: true,
  savedCapture: vi.fn(),
  startedFocus: vi.fn(),
  text: vi.fn(),
  existingAction: null as null | { payload: unknown },
}));

vi.mock("@/app/(app)/quick-add/actions", () => ({ saveInboxItem: mocks.savedCapture }));
vi.mock("@/app/(app)/timer/actions", () => ({ startFocusSession: mocks.startedFocus }));
vi.mock("@/lib/ai/openai-homework-adapter", () => ({
  runOpenAIHomeworkText: mocks.text,
  openAIHomeworkModel: () => "gpt-5-mini",
}));
vi.mock("@/lib/ai/safety", () => ({
  estimateTokenReservation: () => 300,
  logInteraction: vi.fn(),
  runSafeBudgetedAiCall: vi.fn(),
}));
vi.mock("@/lib/supabase/ai-service", () => ({ createAiServiceClient: () => ({ from: () => ({ insert: vi.fn() }) }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => makeSupabase() }));

import { POST } from "./route";

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
});
