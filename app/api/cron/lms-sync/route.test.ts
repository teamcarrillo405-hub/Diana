import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectionError: null as { message: string } | null,
  connectionQuery: vi.fn(),
  ledgerInsert: vi.fn(),
  ledgerUpdate: vi.fn(),
  ledgerFirstEq: vi.fn(),
  ledgerSecondEq: vi.fn(),
  ledgerSelect: vi.fn(),
  ledgerMaybeSingle: vi.fn(),
}));

function ledgerQuery() {
  mocks.ledgerMaybeSingle.mockImplementation(async () => ({
    data: { run_id: mocks.ledgerInsert.mock.calls.at(-1)?.[0]?.run_id },
    error: null,
  }));
  mocks.ledgerSelect.mockImplementation(() => ({ maybeSingle: mocks.ledgerMaybeSingle }));
  mocks.ledgerSecondEq.mockImplementation(() => ({ select: mocks.ledgerSelect }));
  mocks.ledgerFirstEq.mockImplementation(() => ({ eq: mocks.ledgerSecondEq }));
  mocks.ledgerUpdate.mockImplementation(() => ({ eq: mocks.ledgerFirstEq }));
  mocks.ledgerInsert.mockImplementation(async () => ({ data: null, error: null }));
  return { insert: mocks.ledgerInsert, update: mocks.ledgerUpdate };
}

function connectionQuery() {
  const query: any = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    limit: vi.fn(async () => {
      mocks.connectionQuery();
      return {
        data: mocks.connectionError ? null : [],
        error: mocks.connectionError,
      };
    }),
  };
  return query;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => table === "cron_job_runs" ? ledgerQuery() : connectionQuery(),
  }),
}));

import { GET } from "./route";

function request(secret = "cron-secret") {
  return new Request("http://diana.test/api/cron/lms-sync", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("LMS sync cron observability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00.000Z"));
    process.env.CRON_SECRET = "cron-secret";
    mocks.connectionError = null;
    mocks.connectionQuery.mockReset();
    mocks.ledgerInsert.mockReset();
    mocks.ledgerUpdate.mockReset();
    mocks.ledgerFirstEq.mockReset();
    mocks.ledgerSecondEq.mockReset();
    mocks.ledgerSelect.mockReset();
    mocks.ledgerMaybeSingle.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("records an authorized successful run without changing its response", async () => {
    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      connections: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
    });
    expect(mocks.ledgerInsert).toHaveBeenCalledWith(expect.objectContaining({
      route_name: "/api/cron/lms-sync",
      job_name: "lms-sync",
      status: "running",
    }));
    expect(mocks.ledgerUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "succeeded",
      processed_count: 0,
      succeeded_count: 0,
      failed_count: 0,
    }));
  });

  it("records an authorized route failure with only bounded operational detail", async () => {
    mocks.connectionError = { message: "student@example.com private payload" };

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "student@example.com private payload" });
    const completion = mocks.ledgerUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(completion).toMatchObject({
      status: "failed",
      failed_count: 1,
      retry_signaled: true,
      error_code: "lms_sync_failed",
      error_summary: "LMS synchronization did not complete successfully.",
    });
    expect(JSON.stringify(completion)).not.toContain("student@example.com");
    expect(JSON.stringify(completion)).not.toContain("private payload");
  });

  it("does not create a run record for an authorization failure", async () => {
    const response = await GET(request("not-the-secret"));

    expect(response.status).toBe(401);
    expect(mocks.connectionQuery).not.toHaveBeenCalled();
    expect(mocks.ledgerInsert).not.toHaveBeenCalled();
    expect(mocks.ledgerUpdate).not.toHaveBeenCalled();
  });
});
