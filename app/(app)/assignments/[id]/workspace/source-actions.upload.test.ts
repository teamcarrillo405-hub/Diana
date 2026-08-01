import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: vi.fn() }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: vi.fn() }));
vi.mock("@/lib/lms/materials", () => ({ materializeAssignmentMaterial: vi.fn() }));

import {
  cancelAssignmentMediaUpload,
  deleteAssignmentMediaFile,
  finalizeAssignmentMediaUpload,
  initiateAssignmentMediaUpload,
} from "./source-actions";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_ID = "22222222-2222-4222-8222-222222222222";
const MEDIA_ID = "33333333-3333-4333-8333-333333333333";
const DELETION_JOB_ID = "77777777-7777-4777-8777-777777777777";
const STORAGE_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/${UPLOAD_ID}.mp4`;
const DURABLE_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-e1-44444444-4444-4444-8444-444444444444.mp4`;
const TAKEOVER_DURABLE_KEY = `${OWNER_ID}/${ASSIGNMENT_ID}/durable-e2-55555555-5555-4555-8555-555555555555.mp4`;

const input = {
  assignmentId: ASSIGNMENT_ID,
  mediaKind: "video" as const,
  consentConfirmed: true as const,
  fileName: "presentation.mp4",
  mimeType: "video/mp4",
  fileSize: 1024,
  headerBytes: Array.from(Buffer.from("0000ftypisom", "ascii")),
};

const media = {
  id: MEDIA_ID,
  media_kind: "video",
  storage_key: DURABLE_KEY,
  file_name: input.fileName,
  mime_type: input.mimeType,
  file_size_bytes: input.fileSize,
};

const intent = {
  id: UPLOAD_ID,
  assignment_id: ASSIGNMENT_ID,
  owner_id: OWNER_ID,
  media_kind: "video",
  storage_key: STORAGE_KEY,
  file_name: input.fileName,
  declared_mime_type: input.mimeType,
  declared_size_bytes: input.fileSize,
  consent_confirmed_at: new Date().toISOString(),
  claimed_at: null,
  claim_token: null,
  claim_expires_at: null,
  claim_epoch: 0,
  durable_storage_key: null,
  finalized_at: null,
  discarded_at: null,
  signed_upload_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  token_issuance_failed_at: null,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
};

describe("signed assignment media upload authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects a spoofed recording before loading the signed-in user", async () => {
    const result = await initiateAssignmentMediaUpload({
      ...input,
      headerBytes: Array.from(Buffer.from("MZ-not-an-mp4", "ascii")),
    });

    expect(result).toMatchObject({ ok: false });
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("does not create an intent or signed upload when the assignment is not owned", async () => {
    const signedUpload = vi.fn();
    const rpc = vi.fn();
    const cleanupQuery = queryFor([]);
    const assignmentQuery = queryFor(null);
    mocks.createClient.mockResolvedValue(userClient({ assignmentQuery, intentQuery: cleanupQuery, signedUpload }));
    mocks.createServiceClient.mockReturnValue(serviceClient({ rpc }));

    const result = await initiateAssignmentMediaUpload(input);

    expect(result).toEqual({ ok: false, error: "Assignment not found." });
    expect(rpc).not.toHaveBeenCalledWith("create_assignment_media_upload_intent", expect.anything());
    expect(signedUpload).not.toHaveBeenCalled();
  });

  it("records the signed token lifetime from delayed issuance before returning the bearer token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T10:00:00.000Z"));
    const tokenIssuedAt = new Date("2026-07-31T10:30:00.000Z");
    const expectedExpiry = "2026-07-31T12:40:00.000Z";
    const signedUpload = vi.fn(async () => {
      vi.setSystemTime(tokenIssuedAt);
      return { data: { token: "signed-upload-token" }, error: null };
    });
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "create_assignment_media_upload_intent") {
        return { data: { id: args.p_upload_id, storage_key: args.p_storage_key }, error: null };
      }
      if (name === "record_assignment_media_upload_token_expiry") {
        return {
          data: { state: "recorded", signed_upload_expires_at: args.p_signed_upload_expires_at },
          error: null,
        };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    mocks.createClient.mockResolvedValue(userClient({
      assignmentQuery: queryFor({ id: ASSIGNMENT_ID }),
      intentQuery: queryFor([]),
      signedUpload,
    }));
    mocks.createServiceClient.mockReturnValue(serviceClient({ rpc }));

    const result = await initiateAssignmentMediaUpload(input);

    expect(result).toMatchObject({ ok: true, token: "signed-upload-token" });
    expect(rpc).toHaveBeenCalledWith("record_assignment_media_upload_token_expiry", {
      p_upload_id: result.ok ? result.uploadId : expect.any(String),
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_storage_key: result.ok ? result.storageKey : expect.any(String),
      p_signed_upload_expires_at: expectedExpiry,
    });
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(signedUpload.mock.invocationCallOrder[0]);
    expect(signedUpload.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[1]);
  });

  it("invalidates and retains the intent when expiry persistence fails after token issuance", async () => {
    const signedUpload = vi.fn().mockResolvedValue({
      data: { token: "signed-upload-token" },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "create_assignment_media_upload_intent") {
        return { data: { id: args.p_upload_id, storage_key: args.p_storage_key }, error: null };
      }
      if (name === "record_assignment_media_upload_token_expiry") {
        return { data: null, error: { message: "database unavailable" } };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: { state: "cleanup", temporary_storage_key: args.p_upload_id
            ? `${OWNER_ID}/${ASSIGNMENT_ID}/${String(args.p_upload_id)}.mp4`
            : STORAGE_KEY },
          error: null,
        };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "retained" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    mocks.createClient.mockResolvedValue(userClient({
      assignmentQuery: queryFor({ id: ASSIGNMENT_ID }),
      intentQuery: queryFor([]),
      signedUpload,
    }));
    mocks.createServiceClient.mockReturnValue(serviceClient({ rpc, remove }));

    const result = await initiateAssignmentMediaUpload(input);

    expect(result).toEqual({ ok: false, error: "Diana could not prepare this private upload. Try again." });
    expect(result).not.toHaveProperty("token");
    expect(rpc).toHaveBeenCalledWith("discard_assignment_media_upload", expect.objectContaining({
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_claim_token: null,
    }));
    expect(rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_temporary_absence_confirmed: true,
      p_failure_code: null,
    }));
  });

  it("claims a rejected metadata mismatch before removing the object", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const serviceFrom = serviceFromWithMedia(null);
    const client = finalizeClients({
      object: { size: input.fileSize + 1, contentType: input.mimeType },
      rpc,
      remove,
      serviceFrom,
    });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toMatchObject({ ok: false });
    expect(client.wrappedRpc).toHaveBeenCalledWith("discard_assignment_media_upload", {
      p_upload_id: UPLOAD_ID,
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_claim_token: expect.any(String),
    });
    expect(remove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(remove).toHaveBeenCalledWith([DURABLE_KEY]);
    expect(client.wrappedRpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: true,
      p_temporary_absence_confirmed: true,
      p_durable_absence_confirmed: true,
      p_failure_code: null,
      p_claim_token: expect.any(String),
    }));
    expect(client.wrappedRpc).not.toHaveBeenCalledWith("finalize_assignment_media_upload", expect.anything());
    expect(client.userStorage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("checks the uploaded magic bytes before promotion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("MZ-not-video", {
      status: 206,
      headers: { "content-type": input.mimeType },
    })));
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const clients = finalizeClients({ rpc, remove, serviceFrom: serviceFromWithMedia(null) });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toMatchObject({ ok: false });
    expect(remove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(remove).toHaveBeenCalledWith([DURABLE_KEY]);
    expect(clients.wrappedRpc).not.toHaveBeenCalledWith("finalize_assignment_media_upload", expect.anything());
  });

  it("returns an already-finalized media row and only cleans its temporary object", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    const clients = finalizeClients({
      rpc,
      remove,
      serviceFrom: serviceFromWithMedia(media),
      claimResult: { state: "finalized", media },
    });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toEqual({ ok: true, media });
    expect(clients.serviceStorage.info).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(remove).not.toHaveBeenCalledWith([DURABLE_KEY]);
    expect(clients.wrappedRpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: false,
      p_temporary_absence_confirmed: true,
      p_claim_token: null,
    }));
  });

  it("never removes an object when discard loses the race to durable promotion", async () => {
    const remove = vi.fn();
    const rpc = vi.fn();
    const clients = finalizeClients({
      object: { size: input.fileSize + 1, contentType: input.mimeType },
      rpc,
      remove,
      serviceFrom: serviceFromWithMedia(null),
      cleanupPlan: { state: "finalized", temporary_storage_key: STORAGE_KEY, media },
    });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toEqual({ ok: true, media });
    expect(remove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(remove).not.toHaveBeenCalledWith([DURABLE_KEY]);
    expect(clients.wrappedRpc).toHaveBeenCalledWith("discard_assignment_media_upload", expect.objectContaining({
      p_claim_token: expect.any(String),
    }));
  });

  it("allows only one concurrent verifier to copy and promote the staged object", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("0000ftypisom", {
      status: 206,
      headers: { "content-type": input.mimeType },
    })));
    const rpc = vi.fn(async (name: string) => name === "finalize_assignment_media_upload"
      ? { data: media, error: null }
      : Promise.reject(new Error(`Unexpected RPC: ${name}`)));
    const remove = vi.fn().mockResolvedValue({ error: null });
    const claim = vi.fn()
      .mockResolvedValueOnce({ state: "claimed", storage_key: STORAGE_KEY, durable_storage_key: DURABLE_KEY, claim_epoch: 1 })
      .mockResolvedValueOnce({ state: "busy" });
    const clients = finalizeClients({ rpc, remove, serviceFrom: serviceFromWithMedia(null), claimResult: claim });

    const results = await Promise.all([
      finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID }),
      finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID }),
    ]);

    expect(results).toContainEqual({ ok: true, media });
    expect(results).toContainEqual(expect.objectContaining({ ok: false }));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(clients.serviceStorage.copy).toHaveBeenCalledTimes(1);
    expect(clients.serviceStorage.copy).toHaveBeenCalledWith(STORAGE_KEY, DURABLE_KEY);
    const revalidationOrder = clients.wrappedRpc.mock.invocationCallOrder[
      clients.wrappedRpc.mock.calls.findIndex(([name]) => name === "revalidate_assignment_media_upload_claim")
    ];
    expect(revalidationOrder).toBeLessThan(clients.serviceStorage.copy.mock.invocationCallOrder[0]);
    expect(remove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(remove).not.toHaveBeenCalledWith([DURABLE_KEY]);
  });

  it("keeps durable bytes and key unchanged when the client signed token is replayed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("0000ftypisom", {
      status: 206,
      headers: { "content-type": input.mimeType },
    })));
    const objects = new Map<string, string>([[STORAGE_KEY, "verified-video-bytes"]]);
    const remove = vi.fn(async ([key]: string[]) => {
      objects.delete(key);
      return { error: null };
    });
    const copy = vi.fn(async (source: string, destination: string) => {
      const bytes = objects.get(source);
      if (!bytes) return { error: { message: "missing source" } };
      objects.set(destination, bytes);
      return { error: null };
    });
    const rpc = vi.fn(async (name: string) => name === "finalize_assignment_media_upload"
      ? { data: media, error: null }
      : Promise.reject(new Error(`Unexpected RPC: ${name}`)));
    const clients = finalizeClients({
      rpc,
      remove,
      copy,
      serviceFrom: serviceFromWithMedia(null),
    });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });
    const durableBeforeReplay = objects.get(DURABLE_KEY);

    // The bearer token is path-bound to STORAGE_KEY. A replay can only recreate
    // staging bytes after service cleanup; it can never address DURABLE_KEY.
    objects.set(STORAGE_KEY, "replayed-unverified-bytes");

    expect(result).toEqual({ ok: true, media });
    expect(copy).toHaveBeenCalledWith(STORAGE_KEY, DURABLE_KEY);
    expect(media.storage_key).toBe(DURABLE_KEY);
    expect(media.storage_key).not.toBe(STORAGE_KEY);
    expect(objects.get(STORAGE_KEY)).toBe("replayed-unverified-bytes");
    expect(objects.get(DURABLE_KEY)).toBe(durableBeforeReplay);
    expect(objects.get(DURABLE_KEY)).toBe("verified-video-bytes");
    expect(clients.userStorage.info).not.toHaveBeenCalled();
  });

  it("retains cleanup state when promotion crashes after copy and durable deletion fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("0000ftypisom", {
      status: 206,
      headers: { "content-type": input.mimeType },
    })));
    const remove = vi.fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "durable delete unavailable" } });
    const rpc = vi.fn(async (name: string) => {
      if (name === "finalize_assignment_media_upload") throw new Error("connection dropped after copy");
      throw new Error(`Unexpected RPC: ${name}`);
    });
    const clients = finalizeClients({ rpc, remove, serviceFrom: serviceFromWithMedia(null) });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toMatchObject({ ok: false });
    expect(clients.serviceStorage.copy).toHaveBeenCalledWith(STORAGE_KEY, DURABLE_KEY);
    expect(remove).toHaveBeenNthCalledWith(1, [STORAGE_KEY]);
    expect(remove).toHaveBeenNthCalledWith(2, [DURABLE_KEY]);
    expect(clients.wrappedRpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_temporary_removed: true,
      p_durable_removed: false,
      p_temporary_absence_confirmed: true,
      p_failure_code: "durable_absence_unconfirmed",
      p_claim_token: expect.any(String),
    }));
  });

  it("keeps B's promoted object and row intact when expired verifier A resumes after takeover", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("0000ftypisom", {
      status: 206,
      headers: { "content-type": input.mimeType },
    })));
    const objects = new Map<string, string>([[STORAGE_KEY, "verified-video-bytes"]]);
    const removedKeys: string[] = [];
    const aPaused = deferred<void>();
    const resumeA = deferred<void>();
    const candidates = new Map<string, { epoch: number; key: string; promoted: boolean }>();
    let claimCount = 0;
    let currentClaimToken = "";
    let dbMedia: typeof media | null = null;

    const copy = vi.fn(async (source: string, destination: string) => {
      const bytes = objects.get(source);
      if (!bytes) return { error: { message: "missing source" } };
      if (destination === DURABLE_KEY) {
        aPaused.resolve();
        await resumeA.promise;
      }
      objects.set(destination, bytes);
      return { error: null };
    });
    const remove = vi.fn(async ([key]: string[]) => {
      removedKeys.push(key);
      objects.delete(key);
      return { error: null };
    });
    const storage = {
      info: vi.fn(async (key: string) => objects.has(key)
        ? { data: { size: input.fileSize, contentType: input.mimeType }, error: null }
        : { data: null, error: { message: "missing object" } }),
      createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/object" }, error: null }),
      copy,
      remove,
    };
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "claim_assignment_media_upload") {
        claimCount += 1;
        const token = String(args.p_claim_token);
        const candidate = claimCount === 1
          ? { epoch: 1, key: DURABLE_KEY, promoted: false }
          : { epoch: 2, key: TAKEOVER_DURABLE_KEY, promoted: false };
        candidates.set(token, candidate);
        currentClaimToken = token;
        return {
          data: {
            state: "claimed",
            storage_key: STORAGE_KEY,
            durable_storage_key: candidate.key,
            claim_epoch: candidate.epoch,
          },
          error: null,
        };
      }
      if (name === "finalize_assignment_media_upload") {
        const token = String(args.p_claim_token);
        const candidate = candidates.get(token);
        if (
          token !== currentClaimToken
          || !candidate
          || args.p_claim_epoch !== candidate.epoch
          || args.p_candidate_storage_key !== candidate.key
        ) {
          return { data: null, error: { message: "upload claim is stale" } };
        }
        candidate.promoted = true;
        dbMedia = { ...media, storage_key: candidate.key };
        return { data: dbMedia, error: null };
      }
      if (name === "revalidate_assignment_media_upload_claim") {
        const token = String(args.p_claim_token);
        const candidate = candidates.get(token);
        const active = token === currentClaimToken
          && candidate
          && args.p_claim_epoch === candidate.epoch
          && args.p_candidate_storage_key === candidate.key
          && !candidate.promoted;
        return { data: { state: active ? "active" : "stale" }, error: null };
      }
      if (name === "discard_assignment_media_upload") {
        if (dbMedia) {
          return {
            data: { state: "finalized", temporary_storage_key: STORAGE_KEY, media: dbMedia },
            error: null,
          };
        }
        return { data: { state: "stale" }, error: null };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "retained" }, error: null };
      }
      if (name === "cleanup_assignment_media_copy") {
        const candidate = candidates.get(String(args.p_claim_token));
        const exactCandidate = candidate
          && args.p_claim_epoch === candidate.epoch
          && args.p_candidate_storage_key === candidate.key;
        return {
          data: exactCandidate && !candidate.promoted
            ? { can_delete_object: true, storage_key: candidate.key }
            : { can_delete_object: false },
          error: null,
        };
      }
      if (name === "complete_assignment_media_candidate_cleanup") {
        return { data: { state: "quiescing" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    const mediaQuery = queryFor(null);
    mediaQuery.maybeSingle = vi.fn(async () => ({ data: dbMedia, error: null }));
    const serviceFrom = vi.fn((table: string) => table === "media_assets" ? mediaQuery : queryFor(null));
    mocks.createClient.mockResolvedValue(userClient({
      assignmentQuery: queryFor({ id: ASSIGNMENT_ID }),
      intentQuery: queryFor(intent),
    }));
    mocks.createServiceClient.mockReturnValue(serviceClient({ rpc, storage, from: serviceFrom }));

    const verifierA = finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });
    await aPaused.promise;
    const verifierB = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });
    resumeA.resolve();
    const resumedA = await verifierA;

    expect(verifierB).toEqual({ ok: true, media: { ...media, storage_key: TAKEOVER_DURABLE_KEY } });
    expect(resumedA).toMatchObject({ ok: false });
    expect(dbMedia).toEqual({ ...media, storage_key: TAKEOVER_DURABLE_KEY });
    expect(objects.get(TAKEOVER_DURABLE_KEY)).toBe("verified-video-bytes");
    expect(objects.has(DURABLE_KEY)).toBe(false);
    expect(removedKeys).not.toContain(TAKEOVER_DURABLE_KEY);
    expect(copy).toHaveBeenCalledWith(STORAGE_KEY, DURABLE_KEY);
    expect(copy).toHaveBeenCalledWith(STORAGE_KEY, TAKEOVER_DURABLE_KEY);
  });

  it("does not let a stale verifier token discard objects after claim takeover", async () => {
    const remove = vi.fn();
    const clients = finalizeClients({
      object: { size: input.fileSize + 1, contentType: input.mimeType },
      rpc: vi.fn(),
      remove,
      serviceFrom: serviceFromWithMedia(null),
      cleanupPlan: { state: "stale" },
    });

    const result = await finalizeAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toMatchObject({ ok: false });
    expect(remove).not.toHaveBeenCalled();
    expect(clients.wrappedRpc).not.toHaveBeenCalledWith(
      "complete_assignment_media_upload_cleanup",
      expect.anything(),
    );
  });

  it("returns busy and leaves objects untouched when cancellation races active verification", async () => {
    const remove = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: { state: "busy" }, error: null });
    mocks.createClient.mockResolvedValue(userClient({
      assignmentQuery: queryFor({ id: ASSIGNMENT_ID }),
      intentQuery: queryFor(intent),
    }));
    mocks.createServiceClient.mockReturnValue(serviceClient({ rpc, storage: { remove } }));

    const result = await cancelAssignmentMediaUpload({ assignmentId: ASSIGNMENT_ID, uploadId: UPLOAD_ID });

    expect(result).toEqual({ ok: false, error: "This recording is being verified. Try again in a moment." });
    expect(rpc).toHaveBeenCalledWith("discard_assignment_media_upload", {
      p_upload_id: UPLOAD_ID,
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_claim_token: null,
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("recovers a finalized upload cleanup failure before deleting its exact promoted media", async () => {
    const authenticatedRemove = vi.fn();
    const serviceRemove = vi.fn().mockResolvedValue({ error: null });
    const serviceExists = vi.fn().mockResolvedValue({
      data: false,
      error: { status: 404, statusCode: "not_found" },
    });
    const mediaQuery = queryFor({ id: MEDIA_ID, storage_key: DURABLE_KEY });
    const authenticatedFrom = vi.fn(() => mediaQuery);
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "request_assignment_media_deletion") {
        return { data: deletionJob("requested"), error: null };
      }
      if (name === "claim_assignment_media_deletion") {
        return { data: deletionClaim(String(args.p_claim_token)), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: { state: "finalized", temporary_storage_key: STORAGE_KEY, media },
          error: null,
        };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "completed" }, error: null };
      }
      if (name === "complete_assignment_media_deletion") {
        return { data: { state: "completed" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
      from: authenticatedFrom,
      storage: { from: vi.fn(() => ({ remove: authenticatedRemove })) },
    });
    mocks.createServiceClient.mockReturnValue(serviceClient({
      rpc,
      storage: { remove: serviceRemove, exists: serviceExists },
    }));

    const result = await deleteAssignmentMediaFile({ assignmentId: ASSIGNMENT_ID, mediaId: MEDIA_ID });

    expect(result).toEqual({ ok: true });
    expect(serviceRemove).toHaveBeenCalledWith([STORAGE_KEY]);
    expect(serviceRemove).toHaveBeenCalledWith([DURABLE_KEY]);
    expect(serviceExists).toHaveBeenCalledWith(STORAGE_KEY);
    expect(serviceExists).toHaveBeenCalledWith(DURABLE_KEY);
    expect(authenticatedRemove).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("request_assignment_media_deletion", {
      p_media_asset_id: MEDIA_ID,
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_reason: "user",
    });
    expect(rpc).toHaveBeenCalledWith("complete_assignment_media_deletion", expect.objectContaining({
      p_job_id: DELETION_JOB_ID,
      p_media_asset_id: MEDIA_ID,
      p_assignment_id: ASSIGNMENT_ID,
      p_owner_id: OWNER_ID,
      p_storage_key: DURABLE_KEY,
      p_storage_removed: true,
      p_storage_absence_confirmed: true,
      p_failure_code: null,
    }));
    expect(rpc).toHaveBeenCalledWith("complete_assignment_media_upload_cleanup", expect.objectContaining({
      p_upload_id: UPLOAD_ID,
      p_temporary_removed: true,
      p_temporary_absence_confirmed: true,
      p_failure_code: null,
    }));
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(serviceRemove.mock.invocationCallOrder[0]);
    expect(rpc.mock.invocationCallOrder[1]).toBeLessThan(serviceRemove.mock.invocationCallOrder[0]);
    expect(serviceExists.mock.invocationCallOrder[1]).toBeLessThan(rpc.mock.invocationCallOrder[4]);
  });

  it("retries from the durable job after storage succeeds and database completion fails", async () => {
    const serviceRemove = vi.fn().mockResolvedValue({ error: null });
    const serviceExists = vi.fn().mockResolvedValue({
      data: false,
      error: { name: "StorageApiError", status: 404, statusCode: "object_not_found" },
    });
    const mediaQuery = queryFor({ id: MEDIA_ID, storage_key: DURABLE_KEY });
    let completionCalls = 0;
    const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (name === "request_assignment_media_deletion") {
        return { data: deletionJob(completionCalls === 0 ? "requested" : "retry"), error: null };
      }
      if (name === "claim_assignment_media_deletion") {
        return { data: deletionClaim(String(args.p_claim_token)), error: null };
      }
      if (name === "discard_assignment_media_upload") {
        return {
          data: { state: "finalized", temporary_storage_key: STORAGE_KEY, media },
          error: null,
        };
      }
      if (name === "complete_assignment_media_upload_cleanup") {
        return { data: { state: "completed" }, error: null };
      }
      if (name === "complete_assignment_media_deletion") {
        completionCalls += 1;
        return completionCalls === 1
          ? { data: null, error: { message: "database unavailable" } }
          : { data: { state: "completed" }, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
      from: vi.fn(() => mediaQuery),
      storage: { from: vi.fn() },
    });
    mocks.createServiceClient.mockReturnValue(serviceClient({
      rpc,
      storage: { remove: serviceRemove, exists: serviceExists },
    }));

    const first = await deleteAssignmentMediaFile({ assignmentId: ASSIGNMENT_ID, mediaId: MEDIA_ID });
    const retry = await deleteAssignmentMediaFile({ assignmentId: ASSIGNMENT_ID, mediaId: MEDIA_ID });

    expect(first).toEqual({
      ok: false,
      error: "The recording removal is queued and will retry automatically.",
    });
    expect(retry).toEqual({ ok: true });
    expect(serviceRemove).toHaveBeenCalledTimes(4);
    expect(serviceExists).toHaveBeenCalledTimes(4);
    expect(rpc).toHaveBeenCalledWith("request_assignment_media_deletion", expect.objectContaining({
      p_media_asset_id: MEDIA_ID,
    }));
    expect(completionCalls).toBe(2);
  });

  it("does not request or execute deletion for media outside the signed-in owner boundary", async () => {
    const rpc = vi.fn();
    const serviceRemove = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
      from: vi.fn(() => queryFor(null)),
      storage: { from: vi.fn() },
    });
    mocks.createServiceClient.mockReturnValue(serviceClient({
      rpc,
      storage: { remove: serviceRemove, exists: vi.fn() },
    }));

    const result = await deleteAssignmentMediaFile({ assignmentId: ASSIGNMENT_ID, mediaId: MEDIA_ID });

    expect(result).toEqual({ ok: false, error: "That recording is no longer available." });
    expect(rpc).not.toHaveBeenCalled();
    expect(serviceRemove).not.toHaveBeenCalled();
  });
});

function deletionJob(state: "requested" | "retry" | "dead_lettered" | "completed") {
  return {
    state,
    job_id: DELETION_JOB_ID,
    media_asset_id: MEDIA_ID,
    assignment_id: ASSIGNMENT_ID,
    owner_id: OWNER_ID,
    storage_key: DURABLE_KEY,
    upload_id: UPLOAD_ID,
    temporary_storage_key: STORAGE_KEY,
  };
}

function deletionClaim(claimToken: string) {
  return {
    ...deletionJob("requested"),
    state: "claimed",
    claim_token: claimToken,
    claim_expires_at: "2026-07-31T12:05:00.000Z",
  };
}

function finalizeClients({
  object = { size: input.fileSize, contentType: input.mimeType },
  rpc,
  remove,
  serviceFrom,
  claimResult = { state: "claimed", storage_key: STORAGE_KEY, durable_storage_key: DURABLE_KEY, claim_epoch: 1 },
  cleanupPlan,
  copy = vi.fn().mockResolvedValue({ error: null }),
}: {
  object?: { size: number; contentType: string };
  rpc: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  serviceFrom: ReturnType<typeof vi.fn>;
  claimResult?: unknown;
  cleanupPlan?: unknown;
  copy?: ReturnType<typeof vi.fn>;
}) {
  const userStorage = {
    info: vi.fn().mockResolvedValue({ data: object, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/object" }, error: null }),
  };
  const serviceStorage = {
    info: vi.fn().mockResolvedValue({ data: object, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://storage.test/object" }, error: null }),
    copy,
    remove,
    exists: vi.fn().mockResolvedValue({
      data: false,
      error: { status: 404, statusCode: "not_found" },
    }),
  };
  const wrappedRpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "claim_assignment_media_upload") {
      const resolvedClaim = typeof claimResult === "function"
        ? await (claimResult as (args: Record<string, unknown>) => unknown)(args)
        : claimResult;
      return { data: resolvedClaim, error: null };
    }
    if (name === "revalidate_assignment_media_upload_claim") {
      return { data: { state: "active" }, error: null };
    }
    if (name === "discard_assignment_media_upload") {
      return {
        data: cleanupPlan ?? (args.p_claim_token
          ? {
              state: "cleanup",
              temporary_storage_key: STORAGE_KEY,
              durable_storage_key: DURABLE_KEY,
            }
          : { state: "finalized", temporary_storage_key: STORAGE_KEY, media }),
        error: null,
      };
    }
    if (name === "complete_assignment_media_upload_cleanup") {
      return { data: { state: "retained" }, error: null };
    }
    if (name === "cleanup_assignment_media_copy") {
      return { data: { can_delete_object: false }, error: null };
    }
    if (name === "complete_assignment_media_candidate_cleanup") {
      return { data: { state: "protected" }, error: null };
    }
    return rpc(name, args);
  });
  mocks.createClient.mockResolvedValue(userClient({
    assignmentQuery: queryFor({ id: ASSIGNMENT_ID }),
    intentQuery: queryFor(intent),
    storage: userStorage,
  }));
  mocks.createServiceClient.mockReturnValue(serviceClient({ rpc: wrappedRpc, storage: serviceStorage, from: serviceFrom }));
  return { userStorage, serviceStorage, wrappedRpc };
}

function userClient({
  assignmentQuery,
  intentQuery,
  signedUpload = vi.fn(),
  storage,
}: {
  assignmentQuery: ReturnType<typeof queryFor>;
  intentQuery: ReturnType<typeof queryFor>;
  signedUpload?: ReturnType<typeof vi.fn>;
  storage?: Record<string, ReturnType<typeof vi.fn>>;
}) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
    from: vi.fn((table: string) => table === "assignments" ? assignmentQuery : intentQuery),
    storage: { from: vi.fn(() => storage ?? { createSignedUploadUrl: signedUpload }) },
  };
}

function serviceClient({
  rpc = vi.fn(),
  remove = vi.fn().mockResolvedValue({ error: null }),
  storage,
  from = vi.fn(() => queryFor(null)),
}: {
  rpc?: ReturnType<typeof vi.fn>;
  remove?: ReturnType<typeof vi.fn>;
  storage?: Record<string, ReturnType<typeof vi.fn>>;
  from?: ReturnType<typeof vi.fn>;
}) {
  return {
    rpc,
    from,
    storage: {
      from: vi.fn(() => storage ?? {
        remove,
        exists: vi.fn().mockResolvedValue({
          data: false,
          error: { status: 404, statusCode: "not_found" },
        }),
      }),
    },
  };
}

function serviceFromWithMedia(existingMedia: typeof media | null) {
  const mediaQuery = queryFor(existingMedia);
  const discardedIntentQuery = queryFor(null);
  discardedIntentQuery.delete = vi.fn().mockReturnValue(discardedIntentQuery);
  discardedIntentQuery.not = vi.fn().mockResolvedValue({ error: null });
  return vi.fn((table: string) => table === "media_assets" ? mediaQuery : discardedIntentQuery);
}

function queryFor(data: unknown) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "is", "lt", "lte", "limit"]) {
    query[method] = vi.fn().mockReturnValue(query);
  }
  query.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
  query.then = vi.fn((resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data, error: null }));
  return query as Record<string, ReturnType<typeof vi.fn>> & {
    delete?: ReturnType<typeof vi.fn>;
    not?: ReturnType<typeof vi.fn>;
  };
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
