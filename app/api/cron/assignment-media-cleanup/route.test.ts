import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_ID = "22222222-2222-4222-8222-222222222222";
const TEMPORARY_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/${UPLOAD_ID}.mp4`;
const DURABLE_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-44444444-4444-4444-8444-444444444444.mp4`;
const CLAIM_A = "33333333-3333-4333-8333-333333333333";
const CANDIDATE_A_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-e1-55555555-5555-4555-8555-555555555555.mp4`;
const CANDIDATE_B_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-e2-66666666-6666-4666-8666-666666666666.mp4`;

const mocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  loadError: null as unknown,
  rpc: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
  queryCalls: [] as Array<[string, unknown]>,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => queryForRows(),
    rpc: mocks.rpc,
    storage: { from: () => ({ remove: mocks.remove, exists: mocks.exists }) },
  }),
}));

vi.mock("@/lib/operations/cron-run", () => ({
  runObservedCronJob: ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

import { GET } from "./route";

function authorizedRequest() {
  return new Request("http://diana.test/api/cron/assignment-media-cleanup", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

describe("assignment media cleanup cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00.000Z"));
    process.env.CRON_SECRET = "cron-secret";
    mocks.rows = [{
      id: UPLOAD_ID,
      owner_id: OWNER_ID,
      assignment_id: ASSIGNMENT_ID,
      storage_key: TEMPORARY_KEY,
    }];
    mocks.loadError = null;
    mocks.queryCalls.length = 0;
    mocks.remove.mockReset().mockResolvedValue({ error: null });
    mocks.exists.mockReset().mockResolvedValue({
      data: false,
      error: { name: "StorageApiError", status: 404, statusCode: "object_not_found" },
    });
    mocks.rpc.mockReset().mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: {
            state: "cleanup",
            temporary_storage_key: TEMPORARY_KEY,
            durable_storage_key: DURABLE_KEY,
          },
          error: null,
        };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "deleted" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("rejects invalid cron auth before loading or deleting objects", async () => {
    const response = await GET(new Request("http://diana.test/api/cron/assignment-media-cleanup"));

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("sweeps an abandoned temporary object and its unpromoted durable copy", async () => {
    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenNthCalledWith(1, [TEMPORARY_KEY]);
    expect(mocks.remove).toHaveBeenNthCalledWith(2, [DURABLE_KEY]);
    expect(mocks.rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: true,
      p_temporary_absence_confirmed: true,
      p_durable_absence_confirmed: true,
      p_failure_code: null,
    }));
    expect(await response.json()).toMatchObject({ deleted: 1, failed: 0, objectsRemoved: 2 });
    expect(mocks.queryCalls).toContainEqual(["lt:cleanup_attempts", 12]);
    expect(mocks.queryCalls).toContainEqual(["in:cleanup_state", ["pending", "retry"]]);
  });

  it("retains the tombstone and records bounded retry state when durable deletion fails", async () => {
    mocks.remove
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "storage unavailable" } });
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: {
            state: "cleanup",
            temporary_storage_key: TEMPORARY_KEY,
            durable_storage_key: DURABLE_KEY,
          },
          error: null,
        };
      }
      return { data: { state: "retained" }, error: null };
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: false,
      p_failure_code: "durable_absence_unconfirmed",
    }));
    expect(await response.json()).toMatchObject({ deleted: 0, failed: 1 });
  });

  it("cleans a replayed temporary key after finalization without touching durable media", async () => {
    mocks.exists.mockResolvedValue({
      data: false,
      error: { status: 404, statusCode: "not_found" },
    });
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: { state: "finalized", temporary_storage_key: TEMPORARY_KEY },
          error: null,
        };
      }
      return { data: { state: "deleted" }, error: null };
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.remove).toHaveBeenCalledWith([TEMPORARY_KEY]);
    expect(mocks.remove).not.toHaveBeenCalledWith([DURABLE_KEY]);
    expect(mocks.rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: false,
      p_temporary_absence_confirmed: true,
      p_durable_absence_confirmed: false,
    }));
  });

  it("does not remove any object when ordinary cleanup meets an active verification claim", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return { data: { state: "busy" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.anything());
    expect(await response.json()).toMatchObject({ busy: 1, failed: 0 });
  });

  it("re-cleans paused candidate A through quiescence and never touches promoted B", async () => {
    const verifierMaxExecutionMs = 15 * 60 * 1000;
    const quiescenceSafetyMarginMs = 10 * 60 * 1000;
    const signedTokenFence = new Date("2026-07-31T12:10:00.000Z");
    const quiescenceNotBefore = new Date(
      signedTokenFence.getTime() + verifierMaxExecutionMs + quiescenceSafetyMarginMs,
    );
    const objects = new Set([TEMPORARY_KEY, CANDIDATE_A_KEY, CANDIDATE_B_KEY]);
    let candidateAClosed = false;
    let candidateNextAttemptAt = new Date("2026-07-31T12:00:00.000Z");
    let candidateAbsenceConfirmations = 0;
    let tombstonePresent = true;

    expect(quiescenceNotBefore.toISOString()).toBe("2026-07-31T12:35:00.000Z");

    mocks.remove.mockImplementation(async ([key]: string[]) => {
      objects.delete(key);
      return { error: null };
    });
    mocks.exists.mockImplementation(async (key: string) => objects.has(key)
      ? { data: true, error: null }
      : {
          data: false,
          error: { name: "StorageApiError", status: 404, statusCode: "object_not_found" },
        });
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        const now = new Date(String(args.p_now));
        if (candidateAClosed || now < candidateNextAttemptAt) return { data: [], error: null };
        return {
          data: [{
            upload_id: UPLOAD_ID,
            assignment_id: ASSIGNMENT_ID,
            owner_id: OWNER_ID,
            claim_token: CLAIM_A,
            claim_epoch: 1,
            storage_key: CANDIDATE_A_KEY,
            cleanup_token: args.p_cleanup_token,
            cleanup_expires_at: "2026-07-31T12:05:00.000Z",
          }],
          error: null,
        };
      }
      if (name === "complete_claimed_assignment_media_candidate_cleanup") {
        const exactCandidate = args.p_upload_id === UPLOAD_ID
          && args.p_claim_token === CLAIM_A
          && args.p_claim_epoch === 1
          && args.p_candidate_storage_key === CANDIDATE_A_KEY
          && args.p_removed === true
          && args.p_absence_confirmed === true;
        if (!exactCandidate) return { data: { state: "stale" }, error: null };
        const now = new Date(String(args.p_now));
        candidateAbsenceConfirmations += 1;
        candidateAClosed = now >= quiescenceNotBefore;
        candidateNextAttemptAt = candidateAClosed
          ? now
          : new Date(Math.min(quiescenceNotBefore.getTime(), now.getTime() + 10 * 60 * 1000));
        return { data: { state: candidateAClosed ? "closed" : "quiescing" }, error: null };
      }
      if (name === "discard_assignment_media_upload") {
        expect(objects.has(CANDIDATE_B_KEY)).toBe(true);
        return {
          data: { state: "finalized", temporary_storage_key: TEMPORARY_KEY },
          error: null,
        };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        const now = new Date(String(args.p_now));
        if (
          candidateAClosed
          && now >= quiescenceNotBefore
          && args.p_temporary_absence_confirmed === true
          && !objects.has(TEMPORARY_KEY)
          && objects.has(CANDIDATE_B_KEY)
        ) {
          tombstonePresent = false;
          return { data: { state: "deleted" }, error: null };
        }
        return { data: { state: "retained" }, error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    // A paused after its final claim revalidation and before copy. B took over,
    // finalized CANDIDATE_B_KEY, and the first cron removed A's empty key.
    const firstSweep = await GET(authorizedRequest());
    expect(firstSweep.status).toBe(200);
    expect(mocks.remove).toHaveBeenNthCalledWith(1, [CANDIDATE_A_KEY]);
    expect(mocks.remove).toHaveBeenNthCalledWith(2, [TEMPORARY_KEY]);
    expect(mocks.remove).not.toHaveBeenCalledWith([CANDIDATE_B_KEY]);
    expect(objects.has(CANDIDATE_A_KEY)).toBe(false);
    expect(objects.has(CANDIDATE_B_KEY)).toBe(true);
    expect(candidateAClosed).toBe(false);
    expect(tombstonePresent).toBe(true);
    expect(await firstSweep.json()).toMatchObject({
      candidateScanned: 1,
      candidateQuiescing: 1,
      candidateDeleted: 0,
      deleted: 0,
      failed: 0,
      objectsRemoved: 2,
    });

    // A resumes its already-authorized copy, recreates only A's candidate key,
    // then crashes. The retained identity makes the recreation discoverable.
    objects.add(CANDIDATE_A_KEY);
    vi.setSystemTime(new Date("2026-07-31T12:10:00.000Z"));
    const recreatedSweep = await GET(authorizedRequest());
    expect(recreatedSweep.status).toBe(200);
    expect(objects.has(CANDIDATE_A_KEY)).toBe(false);
    expect(objects.has(CANDIDATE_B_KEY)).toBe(true);
    expect(candidateAClosed).toBe(false);
    expect(tombstonePresent).toBe(true);

    // The post-horizon sweep performs one final idempotent absence check before
    // candidate closure and upload-tombstone deletion are allowed.
    vi.setSystemTime(quiescenceNotBefore);
    candidateNextAttemptAt = quiescenceNotBefore;
    const finalSweep = await GET(authorizedRequest());
    expect(finalSweep.status).toBe(200);
    expect(candidateAbsenceConfirmations).toBe(3);
    expect(candidateAClosed).toBe(true);
    expect(tombstonePresent).toBe(false);
    expect(objects.has(CANDIDATE_B_KEY)).toBe(true);
    expect(mocks.remove).not.toHaveBeenCalledWith([CANDIDATE_B_KEY]);
    expect(await finalSweep.json()).toMatchObject({
      candidateScanned: 1,
      candidateDeleted: 1,
      deleted: 1,
      failed: 0,
    });
  });

  it("retains the tombstone through delayed issuance, replay, and the token skew margin", async () => {
    const intentCreatedAt = new Date("2026-07-31T10:00:00.000Z");
    const databaseExpiresAt = new Date("2026-07-31T12:00:00.000Z");
    const tokenIssuedAt = new Date("2026-07-31T10:30:00.000Z");
    const tokenExpiresAt = new Date("2026-07-31T12:30:00.000Z");
    const signedTokenFence = new Date("2026-07-31T12:40:00.000Z");
    const cleanupBoundary = new Date("2026-07-31T13:05:00.000Z");
    const candidate = mocks.rows[0];
    const objects = new Set<string>([TEMPORARY_KEY]);
    let tombstonePresent = true;
    let cleanupNextAttemptAt = databaseExpiresAt;

    expect(databaseExpiresAt.getTime() - intentCreatedAt.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(tokenExpiresAt.getTime() - tokenIssuedAt.getTime()).toBe(2 * 60 * 60 * 1000);
    expect(signedTokenFence.getTime() - tokenExpiresAt.getTime()).toBe(10 * 60 * 1000);
    expect(cleanupBoundary.getTime() - signedTokenFence.getTime()).toBe(
      (15 + 10) * 60 * 1000,
    );

    mocks.remove.mockImplementation(async ([key]: string[]) => {
      objects.delete(key);
      return { error: null };
    });
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return tombstonePresent
          ? { data: { state: "cleanup", temporary_storage_key: TEMPORARY_KEY }, error: null }
          : { data: { state: "absent" }, error: null };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        const cleanupAt = new Date(String(args.p_now));
        if (
          cleanupAt >= cleanupBoundary
          && args.p_temporary_removed === true
          && args.p_temporary_absence_confirmed === true
        ) {
          tombstonePresent = false;
          return { data: { state: "deleted" }, error: null };
        }
        cleanupNextAttemptAt = cleanupBoundary;
        return {
          data: { state: "retained", cleanup_next_attempt_at: cleanupNextAttemptAt.toISOString() },
          error: null,
        };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    vi.setSystemTime(databaseExpiresAt);
    mocks.rows = [candidate];
    const atDatabaseExpiry = await GET(authorizedRequest());

    expect(atDatabaseExpiry.status).toBe(200);
    expect(await atDatabaseExpiry.json()).toMatchObject({ retained: 1, deleted: 0, objectsRemoved: 1 });
    expect(objects.has(TEMPORARY_KEY)).toBe(false);
    expect(tombstonePresent).toBe(true);
    expect(cleanupNextAttemptAt).toEqual(cleanupBoundary);

    // The still-valid bearer token can recreate only the temporary key. The
    // retained database row keeps that replay discoverable by cleanup.
    objects.add(TEMPORARY_KEY);
    vi.setSystemTime(new Date(cleanupBoundary.getTime() - 1));
    mocks.rows = cleanupNextAttemptAt <= new Date() ? [candidate] : [];
    const beforeSkewMargin = await GET(authorizedRequest());

    expect(await beforeSkewMargin.json()).toMatchObject({ scanned: 0, deleted: 0, objectsRemoved: 0 });
    expect(objects.has(TEMPORARY_KEY)).toBe(true);
    expect(tombstonePresent).toBe(true);

    vi.setSystemTime(cleanupBoundary);
    mocks.rows = [candidate];
    const afterTokenAndMargin = await GET(authorizedRequest());

    expect(afterTokenAndMargin.status).toBe(200);
    expect(await afterTokenAndMargin.json()).toMatchObject({ retained: 0, deleted: 1, objectsRemoved: 1 });
    expect(objects.has(TEMPORARY_KEY)).toBe(false);
    expect(tombstonePresent).toBe(false);
  });

  it("enforces one 50-row budget across candidate and tombstone queues", async () => {
    mocks.rows = [
      { id: UPLOAD_ID, owner_id: OWNER_ID, assignment_id: ASSIGNMENT_ID, storage_key: TEMPORARY_KEY },
      { id: "overflow", owner_id: OWNER_ID, assignment_id: ASSIGNMENT_ID, storage_key: TEMPORARY_KEY },
    ];
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return {
          data: Array.from({ length: 49 }, (_, index) => ({
            upload_id: `candidate-${index}`,
            assignment_id: ASSIGNMENT_ID,
            owner_id: OWNER_ID,
            claim_token: CLAIM_A,
            claim_epoch: 1,
            storage_key: CANDIDATE_A_KEY,
            cleanup_token: args.p_cleanup_token,
            cleanup_expires_at: "2026-07-31T12:05:00.000Z",
          })),
          error: null,
        };
      }
      if (name === "complete_claimed_assignment_media_candidate_cleanup") {
        return { data: { state: "closed" }, error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return { data: { state: "cleanup", temporary_storage_key: TEMPORARY_KEY }, error: null };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "deleted" }, error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return { data: cleanupMonitoring(), error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(mocks.queryCalls).toContainEqual(["limit", 1]);
    expect(await response.json()).toMatchObject({
      processedRows: 50,
      candidateScanned: 49,
      scanned: 1,
      backlog: true,
    });
  });

  it("reports retained tombstone dead letters and marks cleanup unhealthy", async () => {
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return { data: { state: "cleanup", temporary_storage_key: TEMPORARY_KEY }, error: null };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "dead_lettered" }, error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return {
          data: cleanupMonitoring({ dead_letter_count: 3 }),
          error: null,
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      deadLettered: 1,
      deadLetterCount: 3,
      failed: 1,
      monitoring: { deadLetterCount: 3 },
    });
  });

  it("reports candidate dead letters and their oldest age as unhealthy cron state", async () => {
    mocks.rows = [];
    mocks.rpc.mockImplementation(async (name: string) => {
      if (name === "claim_due_assignment_media_candidate_cleanups") {
        return { data: [], error: null };
      }
      if (name === "get_assignment_media_upload_cleanup_monitoring") {
        return {
          data: cleanupMonitoring({
            candidate_dead_letter_count: 2,
            candidate_oldest_dead_letter_age_seconds: 7200,
          }),
          error: null,
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      ok: false,
      candidateDeadLetterCount: 2,
      candidateOldestDeadLetterAgeSeconds: 7200,
      monitoring: {
        candidateDeadLetterCount: 2,
        candidateOldestDeadLetterAgeSeconds: 7200,
      },
    });
  });
});

function cleanupMonitoring(overrides: Partial<Record<string, number | null>> = {}) {
  return {
    dead_letter_count: 0,
    oldest_dead_letter_age_seconds: null,
    retry_count: 0,
    due_count: 0,
    candidate_dead_letter_count: 0,
    candidate_oldest_dead_letter_age_seconds: null,
    ...overrides,
  };
}

function queryForRows() {
  const query: any = {};
  for (const method of ["select", "in", "lt", "lte", "or", "order"]) {
    query[method] = vi.fn((...args: unknown[]) => {
      mocks.queryCalls.push([`${method}:${String(args[0])}`, args[1]]);
      return query;
    });
  }
  query.limit = vi.fn(async (value: number) => {
    mocks.queryCalls.push(["limit", value]);
    return { data: mocks.loadError ? null : mocks.rows.slice(0, value), error: mocks.loadError };
  });
  return query;
}
