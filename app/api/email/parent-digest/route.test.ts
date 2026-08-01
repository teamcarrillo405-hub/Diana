import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryCalls: [] as Array<{ table: string; method: string; args: unknown[] }>,
  sendEmail: vi.fn(),
}));

const profiles = [
  {
    user_id: "student-a",
    display_name: "Alex",
    notification_preferences: { parentDigest: { enabled: true, email: "parent-a@example.com" } },
  },
  {
    user_id: "student-b",
    display_name: "Blair",
    notification_preferences: { parentDigest: { enabled: true, email: "parent-b@example.com" } },
  },
];

function queryFor(table: string) {
  let ownerId: string | null = null;
  let head = false;
  const builder: any = {
    select: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "select", args });
      head = Boolean((args[1] as { head?: boolean } | undefined)?.head);
      return builder;
    },
    contains: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "contains", args });
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
    gte: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "gte", args });
      return builder;
    },
    lte: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "lte", args });
      return builder;
    },
    not: (...args: unknown[]) => {
      mocks.queryCalls.push({ table, method: "not", args });
      return builder;
    },
    then: (resolve: (value: unknown) => unknown) => {
      if (table === "profiles") return Promise.resolve(resolve({ data: profiles, error: null }));
      if (head) return Promise.resolve(resolve({ data: null, count: ownerId === "student-a" ? 2 : 1, error: null }));
      if (table === "task_signals") {
        return Promise.resolve(resolve({
          data: [{ occurred_at: ownerId === "student-a" ? "2026-07-30T10:00:00Z" : "2026-07-29T10:00:00Z" }],
          error: null,
        }));
      }
      if (table === "assignment_time_log") {
        return Promise.resolve(resolve({
          data: [{ started_at: "2026-07-30T10:00:00Z", ended_at: "2026-07-30T10:30:00Z", elapsed_minutes: 30 }],
          error: null,
        }));
      }
      return Promise.resolve(resolve({ data: [], error: null }));
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

vi.mock("@/lib/email/resend", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email/resend")>()),
  emailConfigured: () => true,
  sendEmail: mocks.sendEmail,
}));

import { GET } from "./route";

describe("parent digest cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T18:00:00.000Z"));
    mocks.queryCalls.length = 0;
    mocks.sendEmail.mockReset().mockResolvedValue({ ok: true, status: 200, attempts: 1 });
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("scopes every digest data query to its profile owner and keeps recipients separate", async () => {
    const response = await GET(new Request("http://diana.test/api/email/parent-digest", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, sent: 2, failed: 0 });
    const ownerFilters = mocks.queryCalls
      .filter((call) => ["task_signals", "assignment_time_log", "assignments"].includes(call.table))
      .filter((call) => call.method === "eq" && call.args[0] === "owner_id")
      .map((call) => call.args[1]);
    expect(ownerFilters).toEqual([
      "student-a", "student-a", "student-a", "student-a",
      "student-b", "student-b", "student-b", "student-b",
    ]);
    expect(mocks.sendEmail.mock.calls.map(([message]) => message.to)).toEqual([
      "parent-a@example.com",
      "parent-b@example.com",
    ]);
    expect(mocks.sendEmail.mock.calls[0][0].subject).toContain("Alex");
    expect(mocks.sendEmail.mock.calls[1][0].subject).toContain("Blair");
  });

  it("does not query student data or send email without valid cron auth", async () => {
    const response = await GET(new Request("http://diana.test/api/email/parent-digest"));

    expect(response.status).toBe(401);
    expect(mocks.queryCalls).toEqual([]);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
