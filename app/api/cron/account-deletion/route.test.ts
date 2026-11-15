import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CLAIM_TOKEN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mocks = vi.hoisted(() => {
  const storageBuckets = [
    "note-docs",
    "portfolio-evidence",
    "note-audio",
    "inbox-photos",
    "assignment-media",
    "assignment-submissions",
  ];
  return {
    storageBuckets,
    calls: [] as string[],
    loadError: null as unknown,
    claimPhase: "claimed",
    claimBuckets: [...storageBuckets] as string[],
    rpcResults: new Map<string, Array<{ data: unknown; error: unknown }>>(),
    purgeOwnerStorage: vi.fn(),
  };
});

const STORAGE_BUCKETS = mocks.storageBuckets;

function queryFor() {
  const builder: any = {
    select: () => builder,
    not: () => builder,
    in: () => builder,
    lte: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({
      data: mocks.loadError ? null : [{ id: REQUEST_ID }],
      error: mocks.loadError,
    })),
  };
  return builder;
}

function nextRpcResult(name: string) {
  const queued = mocks.rpcResults.get(name)?.shift();
  if (queued) return queued;
  if (name === "claim_account_deletion_request") {
    return {
      data: [{
        request_id: REQUEST_ID,
        owner_id: OWNER_ID,
        purge_phase: mocks.claimPhase,
        manifest_version: 1,
        storage_buckets: mocks.claimBuckets,
        storage_objects_deleted: 0,
        claim_token: CLAIM_TOKEN,
      }],
      error: null,
    };
  }
  return { data: true, error: null };
}

vi.mock("@/lib/security/account-deletion-storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/security/account-deletion-storage")>()),
  purgeOwnerStorage: mocks.purgeOwnerStorage,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    storage: { from: vi.fn() },
    from: () => queryFor(),
    rpc: vi.fn(async (name: string) => {
      mocks.calls.push(name);
      return nextRpcResult(name);
    }),
  }),
}));

vi.mock("@/lib/operations/cron-run", () => ({
  runObservedCronJob: ({ execute }: { execute: () => Promise<Response> }) => execute(),
}));

import { GET } from "./route";

function authorizedRequest() {
  return new Request("http://diana.test/api/cron/account-deletion", {
    headers: { authorization: "Bearer cron-secret" },
  });
}

function queueRpc(name: string, data: unknown, error: unknown = null) {
  const queue = mocks.rpcResults.get(name) ?? [];
  queue.push({ data, error });
  mocks.rpcResults.set(name, queue);
}

describe("account deletion cron", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T09:15:00.000Z"));
    mocks.calls.length = 0;
    mocks.loadError = null;
    mocks.claimPhase = "claimed";
    mocks.claimBuckets = [...STORAGE_BUCKETS];
    mocks.rpcResults.clear();
    mocks.purgeOwnerStorage.mockReset().mockResolvedValue({ ok: true, deleted: 3 });
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("runs claim, dry-run preflight, storage verification, and DB/auth purge in order", async () => {
    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      scanned: 1,
      storageVerified: 1,
      storageObjectsDeleted: 3,
      completed: 1,
      failed: 0,
      backlog: false,
    });
    expect(mocks.calls).toEqual([
      "claim_account_deletion_request",
      "preflight_account_deletion_request",
      "verify_account_deletion_storage",
      "purge_account_deletion_request",
    ]);
    expect(mocks.purgeOwnerStorage).toHaveBeenCalledOnce();
  });

  it("rejects invalid cron auth before loading, storage, or RPC work", async () => {
    const response = await GET(new Request("http://diana.test/api/cron/account-deletion"));

    expect(response.status).toBe(401);
    expect(mocks.calls).toEqual([]);
    expect(mocks.purgeOwnerStorage).not.toHaveBeenCalled();
  });

  it("fails closed when candidates cannot be loaded", async () => {
    mocks.loadError = { message: "database unavailable" };

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.calls).toEqual([]);
  });

  it("does not touch storage when claim or preflight fails", async () => {
    queueRpc("claim_account_deletion_request", null, { message: "claim unavailable" });
    let response = await GET(authorizedRequest());
    expect(response.status).toBe(503);
    expect(mocks.purgeOwnerStorage).not.toHaveBeenCalled();

    mocks.calls.length = 0;
    queueRpc("preflight_account_deletion_request", false);
    response = await GET(authorizedRequest());
    expect(response.status).toBe(503);
    expect(mocks.calls).toEqual([
      "claim_account_deletion_request",
      "preflight_account_deletion_request",
    ]);
    expect(mocks.purgeOwnerStorage).not.toHaveBeenCalled();
  });

  it("fails the frozen storage phase when the claimed manifest does not match", async () => {
    mocks.claimBuckets = ["note-docs"];

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.calls).toEqual([
      "claim_account_deletion_request",
      "fail_account_deletion_storage_phase",
    ]);
    expect(mocks.purgeOwnerStorage).not.toHaveBeenCalled();
  });

  it("records partial Storage API deletion and never advances to the DB phase", async () => {
    mocks.purgeOwnerStorage.mockResolvedValue({
      ok: false,
      deleted: 2,
      reason: "storage_unavailable",
    });

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.calls).toEqual([
      "claim_account_deletion_request",
      "preflight_account_deletion_request",
      "fail_account_deletion_storage_phase",
    ]);
    expect(await response.json()).toMatchObject({ storageObjectsDeleted: 2, completed: 0, failed: 1 });
  });

  it("does not purge DB/auth when zero-residue storage verification fails", async () => {
    queueRpc("verify_account_deletion_storage", false);

    const response = await GET(authorizedRequest());

    expect(response.status).toBe(503);
    expect(mocks.calls).not.toContain("purge_account_deletion_request");
  });

  it("retries only the DB/auth phase after durable storage success", async () => {
    queueRpc("purge_account_deletion_request", false);
    let response = await GET(authorizedRequest());
    expect(response.status).toBe(503);
    expect(mocks.purgeOwnerStorage).toHaveBeenCalledOnce();

    mocks.calls.length = 0;
    mocks.claimPhase = "db_purge_failed";
    response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(mocks.calls).toEqual([
      "claim_account_deletion_request",
      "purge_account_deletion_request",
    ]);
    expect(mocks.purgeOwnerStorage).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({ completed: 1, storageObjectsDeleted: 0 });
  });
});
