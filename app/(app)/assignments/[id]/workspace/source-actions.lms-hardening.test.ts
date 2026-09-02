import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  materializeAssignmentMaterial: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: vi.fn() }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: vi.fn() }));
vi.mock("@/lib/lms/materials", () => ({
  materializeAssignmentMaterial: mocks.materializeAssignmentMaterial,
}));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: vi.fn(),
}));

import { materializeConnectedAssignmentSources } from "./source-actions";
import { LmsReconnectRequiredError } from "@/lib/lms/errors";

const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const assignmentId = "11111111-1111-4111-8111-111111111111";
const sourceId = "22222222-2222-4222-8222-222222222222";

function setupHarness() {
  const assignment = {
    id: assignmentId,
    owner_id: ownerId,
    external_source: "google_classroom",
    source_import_status: "not_started",
  };
  const source: Record<string, unknown> = {
    id: sourceId,
    assignment_id: assignmentId,
    owner_id: ownerId,
    source_type: "attachment",
    title: "Worksheet",
    provider: "google_classroom",
    external_id: "course-work:material:drive-file-a",
    url: null,
    storage_key: null,
    mime_type: null,
    extracted_text: null,
    source_location: null,
    import_status: "ready",
    error_message: null,
  };
  const connection = {
    id: "33333333-3333-4333-8333-333333333333",
    provider: "google_classroom",
    config: {},
  };
  const deleteRow = vi.fn();
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_assignment_source_materializations") {
      return { data: [{ ...source }], error: null };
    }
    if (name === "renew_assignment_source_materialization_claim") {
      return { data: true, error: null };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });

  const from = vi.fn((table: string) => {
    let patch: Record<string, unknown> | null = null;
    const builder: Record<string, any> = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.delete = deleteRow;
    builder.update = vi.fn((value: Record<string, unknown>) => {
      patch = value;
      return builder;
    });
    builder.maybeSingle = vi.fn(async () => {
      if (patch && table === "assignment_sources") {
        Object.assign(source, patch);
        return { data: { id: sourceId }, error: null };
      }
      if (table === "assignments") return { data: { ...assignment }, error: null };
      if (table === "lms_connections") return { data: { ...connection }, error: null };
      return { data: null, error: null };
    });
    builder.then = (
      resolve: (value: { data: unknown; error: null }) => unknown,
      reject: (reason: unknown) => unknown,
    ) => {
      if (patch && table === "assignments") Object.assign(assignment, patch);
      const value = table === "assignment_sources"
        ? { data: [{ import_status: source.import_status }], error: null }
        : { data: null, error: null };
      return Promise.resolve(value).then(resolve, reject);
    };
    return builder;
  });

  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: ownerId } } })) },
    from,
    rpc,
    storage: { from: vi.fn() },
    functions: { invoke: vi.fn() },
  });
  return { assignment, deleteRow, rpc, source };
}

describe("connected assignment source LMS hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED = "true";
  });

  afterEach(() => {
    process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED = "true";
  });

  it("returns reconnect_required and preserves the claimed source row", async () => {
    const harness = setupHarness();
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(
      new LmsReconnectRequiredError("google_classroom"),
    );

    const result = await materializeConnectedAssignmentSources({ assignmentId });

    expect(result).toEqual({
      ok: false,
      code: "reconnect_required",
      error: "Reconnect Google Classroom to continue.",
      imported: 0,
      partial: 1,
    });
    expect(harness.source.id).toBe(sourceId);
    expect(harness.source.import_status).toBe("partial");
    expect(harness.deleteRow).not.toHaveBeenCalled();
    expect(mocks.materializeAssignmentMaterial).not.toHaveBeenCalled();
  });

  it("checks the Google import flag before claiming or changing source state", async () => {
    process.env.DIANA_LMS_GOOGLE_IMPORT_ENABLED = "false";
    const harness = setupHarness();

    const result = await materializeConnectedAssignmentSources({ assignmentId });

    expect(result).toMatchObject({ ok: false, code: "provider_feature_disabled" });
    expect(harness.rpc).not.toHaveBeenCalled();
    expect(harness.source.import_status).toBe("ready");
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
  });
});
