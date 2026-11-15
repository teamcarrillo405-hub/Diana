import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";
const MEDIA_ID = "33333333-3333-4333-8333-333333333333";
const UPLOAD_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "77777777-7777-4777-8777-777777777777";
const STORAGE_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-e1-44444444-4444-4444-8444-444444444444.mp4`;
const TEMPORARY_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/${UPLOAD_ID}.mp4`;

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
    storage: { from: () => ({ remove: mocks.remove, exists: mocks.exists }) },
  }),
}));

vi.mock("@/lib/operations/cron-run", () => ({
  runObservedCronJob: ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

import { GET } from "./route";

function authorizedRequest() {
  return new Request("http://diana.test/api/cron/media-retention", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

describe("media retention cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T13:30:00.000Z"));
    process.env.CRON_SECRET = "cron-secret";
    mocks.from.mockReset();
    mocks.remove.mockReset().mockResolvedValue({ error: null });
    mocks.exists.mockReset().mockResolvedValue({
      data: false,
      error: { name: "StorageApiError", status: 404, statusCode: "object_not_found" },
    });
    mocks.rpc.mockReset().mockImplementation(defaultRpc);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("rejects unauthorized retention deletion before requesting a job", async () => {
    const response = await GET(new Request("http://diana.test/api/cron/media-retention"));

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("requests and claims a durable job before removing expired storage", async () => {
    mocks.exists.mockResolvedValue({
      data: false,
      error: { status: 404, statusCode: "not_found" },
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      requested: 1,
      processed: 1,
      purged: 1,
      failed: 0,
      objectsRemoved: 2,
      monitoring: { deadLetterCount: 0, oldestDeadLetterAgeSeconds: null },
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(1, "request_due_assignment_media_retention_deletions", {
      p_limit: 50,
      p_now: "2026-07-31T13:30:00.000Z",
    });
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "claim_due_assignment_media_deletions", expect.objectContaining({
      p_limit: 50,
      p_now: "2026-07-31T13:30:00.000Z",
    }));
    expect(mocks.remove).toHaveBeenNthCalledWith(1, [TEMPORARY_KEY]);
    expect(mocks.remove).toHaveBeenNthCalledWith(2, [STORAGE_KEY]);
    expect(mocks.exists).toHaveBeenCalledWith(TEMPORARY_KEY);
    expect(mocks.exists).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mocks.rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_upload_id: UPLOAD_ID,
      p_temporary_absence_confirmed: true,
    }));
    expect(mocks.rpc).toHaveBeenCalledWith("complete_assignment_media_deletion", expect.objectContaining({
      p_job_id: JOB_ID,
      p_media_asset_id: MEDIA_ID,
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_storage_key: STORAGE_KEY,
      p_storage_removed: true,
      p_storage_absence_confirmed: true,
      p_failure_code: null,
    }));
    expect(mocks.rpc.mock.invocationCallOrder[1]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0]);
    expect(mocks.exists.mock.invocationCallOrder[1]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[4]);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("retries idempotently after storage success and a database completion failure", async () => {
    let completionCalls = 0;
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "request_due_assignment_media_retention_deletions") {
        return { data: { requested_count: completionCalls === 0 ? 1 : 0, backlog: false }, error: null };
      }
      if (name === "claim_due_assignment_media_deletions") {
        return { data: [lease(String(args.p_claim_token))], error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return { data: { state: "finalized", temporary_storage_key: TEMPORARY_KEY }, error: null };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "completed" }, error: null };
      }
      if (name === "complete_assignment_media_deletion") {
        completionCalls += 1;
        return completionCalls === 1
          ? { data: null, error: { message: "database completion unavailable" } }
          : { data: { state: "completed" }, error: null };
      }
      if (name === "get_assignment_media_deletion_monitoring") {
        return { data: monitoring(), error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const first = await GET(authorizedRequest());
    vi.setSystemTime(new Date("2026-07-31T13:40:00.000Z"));
    const retry = await GET(authorizedRequest());

    expect(first.status).toBe(503);
    expect(await first.json()).toMatchObject({ purged: 0, failed: 1, objectsRemoved: 2 });
    expect(retry.status).toBe(200);
    expect(await retry.json()).toMatchObject({ purged: 1, failed: 0, objectsRemoved: 2 });
    expect(mocks.remove).toHaveBeenCalledTimes(4);
    expect(mocks.exists).toHaveBeenCalledTimes(4);
    expect(completionCalls).toBe(2);
  });

  it("surfaces explicit deletion dead letters and oldest age as unhealthy", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "request_due_assignment_media_retention_deletions") {
        return { data: { requested_count: 0, backlog: false }, error: null };
      }
      if (name === "claim_due_assignment_media_deletions") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_deletion_monitoring") {
        return {
          data: monitoring({ dead_letter_count: 2, oldest_dead_letter_age_seconds: 3600 }),
          error: null,
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      monitoring: { deadLetterCount: 2, oldestDeadLetterAgeSeconds: 3600 },
    });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("rejects an over-budget lease response before any object removal", async () => {
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "request_due_assignment_media_retention_deletions") {
        return { data: { requested_count: 50, backlog: true }, error: null };
      }
      if (name === "claim_due_assignment_media_deletions") {
        return { data: Array.from({ length: 51 }, () => lease(String(args.p_claim_token))), error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});

async function defaultRpc(name: string, args: Record<string, unknown>) {
  if (name === "request_due_assignment_media_retention_deletions") {
    return { data: { requested_count: 1, backlog: false }, error: null };
  }
  if (name === "claim_due_assignment_media_deletions") {
    return { data: [lease(String(args.p_claim_token))], error: null };
  }
  if (name === "discard_assignment_media_upload") {
    return { data: { state: "finalized", temporary_storage_key: TEMPORARY_KEY }, error: null };
  }
  if (name === "complete_assignment_media_upload_cleanup") {
    return { data: { state: "completed" }, error: null };
  }
  if (name === "complete_assignment_media_deletion") {
    return { data: { state: "completed" }, error: null };
  }
  if (name === "get_assignment_media_deletion_monitoring") {
    return { data: monitoring(), error: null };
  }
  throw new Error(`Unexpected RPC: ${name}`);
}

function lease(claimToken: string) {
  return {
    job_id: JOB_ID,
    media_asset_id: MEDIA_ID,
    assignment_id: ASSIGNMENT_ID,
    owner_id: OWNER_ID,
    storage_key: STORAGE_KEY,
    upload_id: UPLOAD_ID,
    temporary_storage_key: TEMPORARY_KEY,
    claim_token: claimToken,
    claim_expires_at: "2026-07-31T13:35:00.000Z",
  };
}

function monitoring(overrides: Partial<Record<string, number | null>> = {}) {
  return {
    dead_letter_count: 0,
    oldest_dead_letter_age_seconds: null,
    retry_count: 0,
    due_count: 0,
    processing_count: 0,
    ...overrides,
  };
}
