import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectionError: null as { message: string } | null,
  connectionErrorAtCall: null as number | null,
  connectionRows: [] as Array<Record<string, unknown>>,
  connectionQuery: vi.fn(),
  connectionOrder: vi.fn(),
  connectionGt: vi.fn(),
  connectionUpdate: vi.fn(),
  connectionUpdateEq: vi.fn(),
  fetchCanvasAssignments: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
  syncLmsAssignments: vi.fn(),
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

function connectionTable() {
  let after: string | null = null;
  const query: any = {
    select: vi.fn(() => query),
    in: vi.fn(() => query),
    gt: vi.fn((column: string, value: string) => {
      mocks.connectionGt(column, value);
      after = value;
      return query;
    }),
    order: vi.fn((column: string, options: Record<string, unknown>) => {
      mocks.connectionOrder(column, options);
      return query;
    }),
    limit: vi.fn(async (limit: number) => {
      const callNumber = mocks.connectionQuery.mock.calls.length + 1;
      mocks.connectionQuery({ after, limit });
      const returnsError = mocks.connectionError !== null && (
        mocks.connectionErrorAtCall === null || mocks.connectionErrorAtCall === callNumber
      );
      const rows = [...mocks.connectionRows]
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))
        .filter((row) => after === null || String(row.id) > after)
        .slice(0, limit);
      return {
        data: returnsError ? null : rows,
        error: returnsError ? mocks.connectionError : null,
      };
    }),
    update: mocks.connectionUpdate,
  };
  return query;
}

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => table === "cron_job_runs" ? ledgerQuery() : connectionTable(),
  }),
}));
vi.mock("@/lib/lms/canvas", () => ({
  fetchCanvasAssignments: mocks.fetchCanvasAssignments,
  getValidCanvasToken: mocks.getValidCanvasToken,
}));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));
vi.mock("@/lib/lms/sync", () => ({ syncLmsAssignments: mocks.syncLmsAssignments }));

import { GET } from "./route";
import { LmsReconnectRequiredError } from "@/lib/lms/errors";

function request(secret = "cron-secret", cursor?: string) {
  const url = new URL("http://diana.test/api/cron/lms-sync");
  if (cursor) url.searchParams.set("cursor", cursor);
  return new Request(url, {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function canvasConnections(count: number, start = 0) {
  return Array.from({ length: count }, (_, offset) => {
    const suffix = String(start + offset).padStart(5, "0");
    return {
      id: `connection-${suffix}`,
      owner_id: `owner-${suffix}`,
      provider: "canvas",
      config: { institution_id: "school-a", base_url: "https://canvas.example", token: "token" },
    };
  });
}

describe("LMS sync cron observability", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00.000Z"));
    process.env.CRON_SECRET = "cron-secret";
    mocks.connectionError = null;
    mocks.connectionErrorAtCall = null;
    mocks.connectionRows = [];
    mocks.connectionQuery.mockReset();
    mocks.connectionOrder.mockReset();
    mocks.connectionGt.mockReset();
    mocks.connectionUpdate.mockReset();
    mocks.connectionUpdateEq.mockReset();
    mocks.ledgerInsert.mockReset();
    mocks.ledgerUpdate.mockReset();
    mocks.ledgerFirstEq.mockReset();
    mocks.ledgerSecondEq.mockReset();
    mocks.ledgerSelect.mockReset();
    mocks.ledgerMaybeSingle.mockReset();
    mocks.fetchCanvasAssignments.mockReset();
    mocks.getValidCanvasToken.mockReset();
    mocks.hydrateLmsConnectionForRuntime.mockReset();
    mocks.persistLmsTokenRefreshForRuntime.mockReset();
    mocks.syncLmsAssignments.mockReset();
    mocks.connectionUpdate.mockImplementation(() => ({ eq: mocks.connectionUpdateEq }));
    mocks.connectionUpdateEq.mockResolvedValue({ data: null, error: null });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token", refreshed: null });
    mocks.fetchCanvasAssignments.mockResolvedValue({ items: [], skipped: 0 });
    mocks.syncLmsAssignments.mockResolvedValue({ imported: 0, skipped: 0 });
    mocks.hydrateLmsConnectionForRuntime.mockImplementation(async (_ownerId, connection) => connection);
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
      status: "complete",
      continuation_required: false,
      partial_reason: null,
      next_cursor: null,
      connections: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      reconnect_required: 0,
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
    expect(await response.json()).toEqual({
      ok: false,
      status: "partial",
      continuation_required: true,
      partial_reason: "query_error",
      next_cursor: null,
      connections: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      reconnect_required: 0,
      error: "student@example.com private payload",
    });
    const completion = mocks.ledgerUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(completion).toMatchObject({
      status: "failed",
      failed_count: 1,
      retry_signaled: true,
      error_code: "lms_sync_incomplete",
      error_summary: "LMS synchronization requires continuation from its reported cursor.",
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

  it("counts stale credentials as reconnect_required without syncing or changing student work", async () => {
    mocks.connectionRows = [{
      id: "connection-a",
      owner_id: "owner-a",
      provider: "canvas",
      config: { institution_id: "school-a", base_url: "https://canvas.example", token: "stale" },
    }];
    mocks.getValidCanvasToken.mockRejectedValue(new LmsReconnectRequiredError("canvas"));

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      status: "partial",
      continuation_required: false,
      partial_reason: "connection_failures",
      next_cursor: null,
      connections: 1,
      imported: 0,
      skipped: 0,
      failed: 1,
      reconnect_required: 1,
    });
    expect(mocks.syncLmsAssignments).not.toHaveBeenCalled();
    expect(mocks.fetchCanvasAssignments).not.toHaveBeenCalled();
    expect(mocks.persistLmsTokenRefreshForRuntime).not.toHaveBeenCalled();
  });

  it("processes more than 1000 connections across deterministic keyset pages", async () => {
    mocks.connectionRows = canvasConnections(1_205);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      status: "complete",
      continuation_required: false,
      partial_reason: null,
      next_cursor: null,
      connections: 1_205,
      failed: 0,
    });
    expect(mocks.connectionOrder).toHaveBeenCalledTimes(5);
    expect(mocks.connectionOrder).toHaveBeenCalledWith("id", { ascending: true });
    expect(mocks.connectionQuery.mock.calls.map(([page]) => page)).toEqual([
      { after: null, limit: 251 },
      { after: "connection-00249", limit: 251 },
      { after: "connection-00499", limit: 251 },
      { after: "connection-00749", limit: 251 },
      { after: "connection-00999", limit: 251 },
    ]);
    const processedOwners = mocks.syncLmsAssignments.mock.calls.map((call) => call[1]);
    expect(processedOwners).toHaveLength(1_205);
    expect(new Set(processedOwners)).toHaveLength(1_205);
  });

  it("continues past a failed connection on a later page", async () => {
    mocks.connectionRows = canvasConnections(1_002);
    mocks.syncLmsAssignments.mockImplementation(async (_client, ownerId: string) => {
      if (ownerId === "owner-00500") throw new Error("provider unavailable");
      return { imported: 1, skipped: 0 };
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      status: "partial",
      continuation_required: false,
      partial_reason: "connection_failures",
      next_cursor: null,
      connections: 1_002,
      imported: 1_001,
      failed: 1,
    });
    expect(mocks.syncLmsAssignments).toHaveBeenCalledTimes(1_002);
    expect(mocks.syncLmsAssignments.mock.calls.at(-1)?.[1]).toBe("owner-01001");
  });

  it("returns a cursor at the connection cap and resumes without duplicate processing", async () => {
    mocks.connectionRows = canvasConnections(5_001);

    const firstResponse = await GET(request());
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody).toMatchObject({
      ok: true,
      status: "partial",
      continuation_required: true,
      partial_reason: "connection_limit",
      next_cursor: "connection-04999",
      connections: 5_000,
      failed: 0,
    });
    expect(mocks.ledgerUpdate.mock.calls[0][0]).toMatchObject({
      status: "partial",
      processed_count: 5_001,
      succeeded_count: 5_000,
      failed_count: 1,
      retry_signaled: true,
      error_code: "lms_sync_incomplete",
    });

    const secondResponse = await GET(request("cron-secret", firstBody.next_cursor));

    expect(secondResponse.status).toBe(200);
    expect(await secondResponse.json()).toMatchObject({
      ok: true,
      status: "complete",
      continuation_required: false,
      partial_reason: null,
      next_cursor: null,
      connections: 1,
      failed: 0,
    });
    const processedOwners = mocks.syncLmsAssignments.mock.calls.map((call) => call[1]);
    expect(processedOwners).toHaveLength(5_001);
    expect(new Set(processedOwners)).toHaveLength(5_001);
    expect(mocks.connectionGt).toHaveBeenLastCalledWith("id", "connection-04999");
  }, 20_000);

  it("stops at the time budget and reports a resumable partial run", async () => {
    mocks.connectionRows = canvasConnections(3);
    mocks.syncLmsAssignments.mockImplementation(async () => {
      vi.advanceTimersByTime(270_000);
      return { imported: 0, skipped: 0 };
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      status: "partial",
      continuation_required: true,
      partial_reason: "time_budget",
      next_cursor: "connection-00000",
      connections: 1,
      failed: 0,
    });
    expect(mocks.syncLmsAssignments).toHaveBeenCalledTimes(1);
  });
});
