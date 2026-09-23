import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  materializeAssignmentMaterial: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionCredentials: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: vi.fn() }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/lms/materials", () => ({ materializeAssignmentMaterial: mocks.materializeAssignmentMaterial }));
vi.mock("@/lib/integrations/credential-vault", () => ({
  hydrateLmsConnectionCredentials: mocks.hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh: vi.fn(),
}));

import { materializeConnectedAssignmentSources } from "./source-actions";

const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSIGNMENT_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";

type SourceState = {
  id: string;
  assignment_id: string;
  owner_id: string;
  source_type: "attachment";
  title: string;
  provider: "google_classroom";
  external_id: string;
  url: string | null;
  storage_key: string | null;
  mime_type: string | null;
  extracted_text: string | null;
  source_location: string | null;
  import_status: "ready" | "extracting" | "imported" | "partial" | "failed";
  error_message: string | null;
  materialization_claim_token: string | null;
  materialization_claim_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const downloaded = {
  status: "downloaded" as const,
  provider: "google_classroom" as const,
  fileId: "drive-file-12345",
  filename: "worksheet.pdf",
  mimeType: "application/pdf",
  bytes: new Uint8Array([37, 80, 68, 70]),
};

describe("connected assignment source materialization retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getValidGoogleToken.mockResolvedValue({ token: "google-token", refreshed: null });
    mocks.hydrateLmsConnectionCredentials.mockImplementation(async (_ownerId, connection) => connection);
  });

  it("moves ready to partial and imports it on the next retry", async () => {
    const harness = createHarness();
    mocks.materializeAssignmentMaterial
      .mockResolvedValueOnce({ status: "partial", code: "download_failed", message: "Google Drive is not ready." })
      .mockResolvedValueOnce(downloaded);
    harness.invoke.mockResolvedValue({ data: { ok: true, status: "imported" }, error: null });

    const first = await materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });
    expect(first).toEqual({ ok: true, imported: 0, partial: 1 });
    expect(harness.source.import_status).toBe("partial");
    expect(harness.source.materialization_claim_token).toBeNull();

    const retry = await materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });
    expect(retry).toEqual({ ok: true, imported: 1, partial: 0 });
    expect(harness.source.import_status).toBe("imported");
    expect(harness.assignment.source_import_status).toBe("imported");
    expect(harness.upload).toHaveBeenCalledTimes(1);
  });

  it("lets only one concurrent invocation materialize a source", async () => {
    const harness = createHarness();
    const materialization = deferred<typeof downloaded>();
    mocks.materializeAssignmentMaterial.mockReturnValueOnce(materialization.promise);
    harness.invoke.mockResolvedValue({ data: { ok: true, status: "imported" }, error: null });

    const firstPromise = materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });
    await vi.waitFor(() => expect(mocks.materializeAssignmentMaterial).toHaveBeenCalledTimes(1));
    const duplicate = await materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });
    expect(duplicate).toEqual({ ok: true, imported: 0, partial: 0 });

    materialization.resolve(downloaded);
    await expect(firstPromise).resolves.toEqual({ ok: true, imported: 1, partial: 0 });
    expect(harness.upload).toHaveBeenCalledTimes(1);
    expect(harness.invoke).toHaveBeenCalledTimes(1);
    expect(harness.rpc.mock.calls.filter(([name]) => name === "claim_assignment_source_materializations"))
      .toHaveLength(2);
  });

  it("retries extraction directly when the source already has storage", async () => {
    const storageKey = `${OWNER_ID}/assignments/${ASSIGNMENT_ID}/source-${SOURCE_ID}.pdf`;
    const harness = createHarness({ import_status: "partial", storage_key: storageKey, mime_type: "application/pdf" });
    harness.invoke.mockResolvedValue({ data: { ok: true, status: "imported" }, error: null });

    const result = await materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });

    expect(result).toEqual({ ok: true, imported: 1, partial: 0 });
    expect(harness.invoke).toHaveBeenCalledWith("extract-assignment-source", { body: { sourceId: SOURCE_ID } });
    expect(mocks.materializeAssignmentMaterial).not.toHaveBeenCalled();
    expect(mocks.hydrateLmsConnectionCredentials).not.toHaveBeenCalled();
    expect(harness.upload).not.toHaveBeenCalled();
  });

  it("does not upload another object when extraction is retried", async () => {
    const harness = createHarness();
    mocks.materializeAssignmentMaterial.mockResolvedValue(downloaded);
    harness.invoke
      .mockResolvedValueOnce({ data: { error: "reader unavailable" }, error: null })
      .mockResolvedValueOnce({ data: { ok: true, status: "imported" }, error: null });

    await expect(materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID }))
      .resolves.toEqual({ ok: true, imported: 0, partial: 1 });
    const storedKey = harness.source.storage_key;
    await expect(materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID }))
      .resolves.toEqual({ ok: true, imported: 1, partial: 0 });

    expect(storedKey).toBe(`${OWNER_ID}/assignments/${ASSIGNMENT_ID}/source-${SOURCE_ID}.pdf`);
    expect(harness.source.storage_key).toBe(storedKey);
    expect(harness.upload).toHaveBeenCalledTimes(1);
    expect(mocks.materializeAssignmentMaterial).toHaveBeenCalledTimes(1);
    expect(harness.invoke).toHaveBeenCalledTimes(2);
  });

  it("adopts the deterministic object after storage succeeded before database persistence", async () => {
    const harness = createHarness({}, { objectStored: true });
    mocks.materializeAssignmentMaterial.mockResolvedValue(downloaded);
    harness.invoke.mockResolvedValue({ data: { ok: true, status: "imported" }, error: null });

    const result = await materializeConnectedAssignmentSources({ assignmentId: ASSIGNMENT_ID });

    expect(result).toEqual({ ok: true, imported: 1, partial: 0 });
    expect(harness.source.storage_key)
      .toBe(`${OWNER_ID}/assignments/${ASSIGNMENT_ID}/source-${SOURCE_ID}.pdf`);
    expect(harness.upload).not.toHaveBeenCalled();
    expect(harness.invoke).toHaveBeenCalledTimes(1);
  });
});

describe("assignment source materialization claim migration", () => {
  const migration = readFileSync(resolve(
    process.cwd(),
    "supabase/migrations/20260731203000_assignment_source_materialization_claims.sql",
  ), "utf8");

  it("keeps claims owner scoped, exclusive, and recoverable after expiry", () => {
    expect(migration).toContain("source.owner_id = (select auth.uid())");
    expect(migration).toContain("source.assignment_id = p_assignment_id");
    expect(migration).toContain("for update of source skip locked");
    expect(migration).toContain("source.materialization_claim_expires_at <= clock_timestamp()");
    expect(migration).toContain("interval '10 minutes'");
    expect(migration).toContain("renew_assignment_source_materialization_claim");
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated");
  });
});

function createHarness(
  sourcePatch: Partial<SourceState> = {},
  options: { objectStored?: boolean } = {},
) {
  const source: SourceState = {
    id: SOURCE_ID,
    assignment_id: ASSIGNMENT_ID,
    owner_id: OWNER_ID,
    source_type: "attachment",
    title: "Worksheet",
    provider: "google_classroom",
    external_id: "course-work:material:drive-file-12345",
    url: null,
    storage_key: null,
    mime_type: null,
    extracted_text: null,
    source_location: null,
    import_status: "ready",
    error_message: null,
    materialization_claim_token: null,
    materialization_claim_expires_at: null,
    created_at: "2026-07-31T12:00:00.000Z",
    updated_at: "2026-07-31T12:00:00.000Z",
    ...sourcePatch,
  };
  const assignment = {
    id: ASSIGNMENT_ID,
    owner_id: OWNER_ID,
    external_source: "google_classroom",
    source_import_status: "not_started",
  };
  const connection = {
    id: "33333333-3333-4333-8333-333333333333",
    owner_id: OWNER_ID,
    provider: "google_classroom",
    config: { token: "encrypted-token" },
  };
  const upload = vi.fn().mockResolvedValue({ error: null });
  let objectStored = options.objectStored ?? Boolean(source.storage_key);
  upload.mockImplementation(async () => {
    objectStored = true;
    return { error: null };
  });
  const info = vi.fn(async () => objectStored
    ? { data: { size: downloaded.bytes.length, contentType: downloaded.mimeType }, error: null }
    : { data: null, error: { status: 404, message: "not found" } });
  const invoke = vi.fn();

  const rpc = vi.fn(async (name: string, args: Record<string, unknown>) => {
    if (name === "renew_assignment_source_materialization_claim") {
      const active = args.p_assignment_id === ASSIGNMENT_ID
        && args.p_source_id === SOURCE_ID
        && args.p_claim_token === source.materialization_claim_token
        && Boolean(source.materialization_claim_expires_at);
      if (active) source.materialization_claim_expires_at = "2999-01-01T00:00:00.000Z";
      return { data: active, error: null };
    }
    if (name !== "claim_assignment_source_materializations") {
      throw new Error(`Unexpected RPC: ${name}`);
    }
    const claimToken = String(args.p_claim_token);
    const claimActive = source.materialization_claim_token
      && source.materialization_claim_expires_at
      && new Date(source.materialization_claim_expires_at).getTime() > Date.now();
    const retryable = source.storage_key
      ? ["ready", "partial", "extracting", "failed"].includes(source.import_status)
      : ["ready", "partial"].includes(source.import_status);
    if (args.p_assignment_id !== ASSIGNMENT_ID || claimActive || !retryable) {
      return { data: [], error: null };
    }
    source.materialization_claim_token = claimToken;
    source.materialization_claim_expires_at = "2999-01-01T00:00:00.000Z";
    return { data: [{ ...source }], error: null };
  });

  const from = vi.fn((table: string) => queryFor(table, source, assignment, connection));
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: OWNER_ID } } }) },
    from,
    rpc,
    storage: { from: vi.fn(() => ({ upload, info })) },
    functions: { invoke },
  });

  return { assignment, source, upload, invoke, rpc };
}

function queryFor(
  table: string,
  source: SourceState,
  assignment: Record<string, unknown>,
  connection: Record<string, unknown>,
) {
  let updatePatch: Record<string, unknown> | null = null;
  const filters: Array<[string, unknown]> = [];
  const query: Record<string, any> = {};
  query.select = vi.fn(() => query);
  query.update = vi.fn((patch: Record<string, unknown>) => {
    updatePatch = patch;
    return query;
  });
  query.eq = vi.fn((column: string, value: unknown) => {
    filters.push([column, value]);
    return query;
  });
  query.maybeSingle = vi.fn(async () => {
    if (updatePatch) {
      const value = table === "assignments" ? assignment : source;
      if (!matches(value, filters)) return { data: null, error: null };
      Object.assign(value, updatePatch);
      return { data: { id: value.id }, error: null };
    }
    const value = table === "assignments" ? assignment : table === "lms_connections" ? connection : source;
    return { data: matches(value, filters) ? { ...value } : null, error: null };
  });
  query.then = vi.fn((resolveResult: (value: unknown) => unknown) => {
    if (updatePatch) {
      const value = table === "assignments" ? assignment : source;
      if (matches(value, filters)) Object.assign(value, updatePatch);
      return resolveResult({ data: null, error: null });
    }
    if (table === "assignment_sources" && matches(source, filters)) {
      return resolveResult({ data: [{ import_status: source.import_status }], error: null });
    }
    return resolveResult({ data: [], error: null });
  });
  return query;
}

function matches(value: Record<string, unknown>, filters: Array<[string, unknown]>) {
  return filters.every(([column, expected]) => value[column] === expected);
}

function deferred<T>() {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}
