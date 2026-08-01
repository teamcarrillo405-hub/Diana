import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryCalls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}));

const subscriptions = [
  { id: "sub-a", owner_id: "student-a", endpoint: "https://push.example.test/a", p256dh: "key-a", auth: "auth-a" },
  { id: "sub-b", owner_id: "student-b", endpoint: "https://push.example.test/b", p256dh: "key-b", auth: "auth-b" },
];

function queryFor(table: string) {
  let ownerId: string | null = null;
  let deleting = false;
  const builder: any = {
    select: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "select", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "order", args });
      return builder;
    },
    limit: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "limit", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "eq", args });
      if (args[0] === "owner_id") ownerId = String(args[1]);
      return builder;
    },
    not: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "not", args });
      return builder;
    },
    gte: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "gte", args });
      return builder;
    },
    lte: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "lte", args });
      return builder;
    },
    delete: () => {
      deleting = true;
      mocks.queryCalls.push({ table, method: "delete", args: [] });
      return builder;
    },
    then: (resolve: (value: unknown) => unknown) => {
      if (deleting) return Promise.resolve(resolve({ data: null, error: null }));
      if (table === "push_subscriptions") {
        return Promise.resolve(resolve({ data: subscriptions, error: null }));
      }
      const data = ownerId === "student-a"
        ? [{ title: "Lab report", kind: "lab", due_at: "2026-07-31T18:00:00.000Z" }]
        : [];
      return Promise.resolve(resolve({ data, error: null }));
    },
  };
  return builder;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: (table: string) => queryFor(table) }),
}));

vi.mock("@/lib/operations/cron-run", () => ({
  runObservedCronJob: ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mocks.setVapidDetails,
    sendNotification: mocks.sendNotification,
  },
}));

vi.mock("@/lib/push/subscription", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/push/subscription")>()),
  validatePushEndpoint: vi.fn().mockResolvedValue(true),
}));

import { GET } from "./route";

describe("assignment due push cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T13:00:00.000Z"));
    mocks.queryCalls.length = 0;
    mocks.sendNotification.mockReset().mockResolvedValue({ statusCode: 201 });
    mocks.setVapidDetails.mockReset();
    process.env.CRON_SECRET = "cron-secret";
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public-key";
    process.env.VAPID_PRIVATE_KEY = "private-key";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it("queries assignments per owner and sends only to that owner's subscriptions", async () => {
    const response = await GET(new Request("http://diana.test/api/push/send-due", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, sent: 1, owners: 2, failed: 0 });
    const ownerFilters = mocks.queryCalls
      .filter((call) => call.table === "assignments" && call.method === "eq" && call.args[0] === "owner_id")
      .map((call) => call.args[1]);
    expect(ownerFilters).toEqual(["student-a", "student-b"]);
    expect(mocks.sendNotification).toHaveBeenCalledOnce();
    expect(mocks.sendNotification.mock.calls[0][0]).toMatchObject({ endpoint: "https://push.example.test/a" });
    expect(String(mocks.sendNotification.mock.calls[0][1])).toContain("Lab report");
    expect(String(mocks.sendNotification.mock.calls[0][1])).not.toContain("student-b");
  });

  it("rejects the request before loading recipients when cron auth is invalid", async () => {
    const response = await GET(new Request("http://diana.test/api/push/send-due", {
      headers: { authorization: "Bearer another-secret" },
    }));

    expect(response.status).toBe(401);
    expect(mocks.queryCalls).toEqual([]);
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });
});
