import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const JOB_IDS = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
];

const mocks = vi.hoisted(() => ({
  loadError: null as unknown,
  rows: [] as Array<{ id: string; attempts: number }>,
  rpcResults: [] as Array<{ data: unknown; error: unknown }>,
  fallbackResults: [] as Array<{ data: unknown; error: unknown }>,
  updates: [] as Array<Record<string, unknown>>,
  rpc: vi.fn(),
  from: vi.fn(),
}));

function queryFor() {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
      data: mocks.loadError ? null : mocks.rows,
      error: mocks.loadError,
    })),
  };
  return builder;
}

function updateQueryFor(payload: Record<string, unknown>) {
  mocks.updates.push(payload);
  const builder: any = {
    eq: () => builder,
    select: () => builder,
    maybeSingle: () => Promise.resolve(
      mocks.fallbackResults.shift() ?? { data: null, error: null },
    ),
  };
  return builder;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

vi.mock("@/lib/operations/cron-run", () => ({
  runObservedCronJob: ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

import { GET } from "./route";

function authorizedRequest() {
  return new Request("http://diana.test/api/cron/ai-budget-reconciliation", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

describe("AI budget reconciliation cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T18:00:00.000Z"));
    process.env.CRON_SECRET = "cron-secret";
    mocks.loadError = null;
    mocks.rows = [];
    mocks.rpcResults = [];
    mocks.fallbackResults = [];
    mocks.updates = [];
    mocks.from.mockReset().mockImplementation(() => ({
      ...queryFor(),
      update: (payload: Record<string, unknown>) => updateQueryFor(payload),
    }));
    mocks.rpc.mockReset().mockImplementation(async (name: string) => {
      if (name === "reconcile_stale_started_ai_budget_reservations") {
        return {
          data: [{ token_reservations: 0, media_reservations: 0 }],
          error: null,
        };
      }
      return mocks.rpcResults.shift() ?? { data: null, error: { code: "missing_result" } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("rejects invalid cron authorization before doing work", async () => {
    const response = await GET(new Request("http://diana.test/api/cron/ai-budget-reconciliation"));

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("settles each due job through the service-role processor", async () => {
    mocks.rows = JOB_IDS.slice(0, 2).map((id) => ({ id, attempts: 0 }));
    mocks.rpcResults = JOB_IDS.slice(0, 2).map((id) => ({
      data: [{ reconciliation_id: id, reconciliation_status: "resolved" }],
      error: null,
    }));

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      scanned: 2,
      resolved: 2,
      pending: 0,
      deadLetter: 0,
      failed: 0,
      backlog: false,
      staleTokenSettled: 0,
      staleMediaSettled: 0,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "reconcile_stale_started_ai_budget_reservations", {
      p_now: "2026-07-31T18:00:00.000Z",
      p_limit: 25,
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "process_ai_budget_reconciliation", {
      p_job_id: JOB_IDS[0],
      p_now: "2026-07-31T18:00:00.000Z",
      p_max_attempts: 5,
    });
  });

  it("reports bounded retries and dead letters without releasing usage", async () => {
    mocks.rows = JOB_IDS.map((id) => ({ id, attempts: 0 }));
    mocks.fallbackResults = [{
      data: { id: JOB_IDS[2], status: "pending" },
      error: null,
    }];
    mocks.rpcResults = [
      { data: [{ reconciliation_id: JOB_IDS[0], reconciliation_status: "pending" }], error: null },
      { data: [{ reconciliation_id: JOB_IDS[1], reconciliation_status: "dead_letter" }], error: null },
      { data: null, error: { code: "rpc_unavailable" } },
    ];

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      deadLetter: 1,
      pending: 2,
      failed: 0,
    });
  });

  it("bounds RPC transport failures with compare-and-set backoff", async () => {
    mocks.rows = [{ id: JOB_IDS[0], attempts: 2 }];
    mocks.rpcResults = [{ data: null, error: { code: "transport_lost" } }];
    mocks.fallbackResults = [{ data: { id: JOB_IDS[0], status: "pending" }, error: null }];

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ pending: 1, failed: 0 });
    expect(mocks.updates[0]).toMatchObject({
      status: "pending",
      attempts: 3,
      last_error: "reconciliation_rpc_transport_error",
      next_attempt_at: "2026-07-31T18:02:00.000Z",
    });
  });

  it("does not double count when the processor committed but its response was lost", async () => {
    mocks.rows = [{ id: JOB_IDS[0], attempts: 1 }];
    mocks.rpcResults = [{ data: null, error: { code: "response_lost" } }];
    mocks.fallbackResults = [{ data: null, error: null }];

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ failed: 1, pending: 0 });
    expect(mocks.updates).toHaveLength(1);
  });

  it("fails closed when due jobs cannot be loaded", async () => {
    mocks.loadError = { code: "database_unavailable" };

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
