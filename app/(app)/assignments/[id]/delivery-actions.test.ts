import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimSubmissionReceipt: vi.fn(),
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  inspectGoogleClassroomSubmission: vi.fn(),
  assignmentSubmissionCanonicalPayloadBytes: vi.fn((preview: unknown) => (
    new TextEncoder().encode(JSON.stringify(preview))
  )),
  loadAssignmentSubmissionBundle: vi.fn(),
  providerArtifactFailureResponse: vi.fn(),
  providerArtifactRiskResponse: vi.fn(),
  reconcileSubmissionReceipt: vi.fn(),
  providerSubmissionReceiptStatus: vi.fn((error: unknown) => (
    (error as { outcome?: string } | null)?.outcome === "ambiguous"
      ? "confirmation_pending"
      : "not_accepted"
  )),
  submitCanvasFile: vi.fn(),
  submitGoogleClassroomFile: vi.fn(),
  updateSubmissionReceiptStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/lms/submission", () => ({
  claimSubmissionReceipt: mocks.claimSubmissionReceipt,
  inspectCanvasSubmission: mocks.inspectCanvasSubmission,
  inspectGoogleClassroomSubmission: mocks.inspectGoogleClassroomSubmission,
  providerArtifactFailureResponse: mocks.providerArtifactFailureResponse,
  providerArtifactRiskResponse: mocks.providerArtifactRiskResponse,
  providerSubmissionReceiptStatus: mocks.providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt: mocks.reconcileSubmissionReceipt,
  submitCanvasFile: mocks.submitCanvasFile,
  submitGoogleClassroomFile: mocks.submitGoogleClassroomFile,
  updateSubmissionReceiptStatus: mocks.updateSubmissionReceiptStatus,
}));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));
vi.mock("@/lib/student-state/server", () => ({
  recordStudentStateSnapshot: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/assignment-submission-server", () => ({
  assignmentSubmissionCanonicalPayloadBytes: mocks.assignmentSubmissionCanonicalPayloadBytes,
  loadAssignmentSubmissionBundle: mocks.loadAssignmentSubmissionBundle,
}));

import {
  prepareCanonicalAssignmentDeliveryFile,
  submitFileToConnectedProvider,
  uploadAssignmentDeliveryFile,
} from "./delivery-actions";
import {
  buildCanonicalRenderDocument,
  toCanonicalRenderBlock,
} from "@/lib/specialist-artifacts/render-blocks";
import { serializeCadArtifactContext } from "@/lib/specialist-artifacts/serializers";

const payloadDigest = "b".repeat(64);

function canvasCapabilities(observation = {
  provider: "canvas" as const,
  submissionId: "canvas-submission-1",
  state: "unsubmitted",
  attempt: 0,
  submittedAt: null as string | null,
  attachmentIds: [] as string[],
}) {
  return {
    capabilities: ["open_external", "upload_file"],
    allowedExtensions: ["pdf"],
    note: "Ready",
    reconciliationObservation: observation,
  };
}

function googleCapabilities(observation = {
  provider: "google_classroom" as const,
  submissionId: "submission-1",
  state: "CREATED",
  attachmentIds: [] as string[],
}) {
  return {
    capabilities: ["open_external", "upload_file"],
    allowedExtensions: [],
    note: "Ready",
    reconciliationObservation: observation,
  };
}

describe("delivery actions validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: { payloadDigest },
    });
    mocks.providerArtifactRiskResponse.mockImplementation((input) => ({
      diana_provider_artifact_risk: {
        provider: input.provider,
        operation_id: input.operationId,
        state: input.providerArtifactId ? "created" : "possible",
        provider_artifact_id: input.providerArtifactId ?? null,
      },
    }));
    mocks.providerArtifactFailureResponse.mockImplementation((_error, input) => (
      mocks.providerArtifactRiskResponse(input)
    ));
    mocks.reconcileSubmissionReceipt.mockImplementation(async (_client, input) => ({
      receiptId: input.receiptId,
      status: input.status,
      transitioned: true,
      detail: input.detail,
    }));
  });

  function singleQuery(data: unknown) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    return query;
  }

  it("requires an idempotency key before loading provider credentials", async () => {
    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "22222222-2222-4222-8222-222222222222",
      confirmed: true,
      idempotencyKey: "not-a-uuid",
      payloadDigest,
    });

    expect(result).toEqual({ ok: false, error: "Confirm before sending a file to the school system." });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects an empty delivery file before writing storage", async () => {
    const formData = new FormData();
    formData.set("assignmentId", "11111111-1111-4111-8111-111111111111");
    formData.set("file", new Blob([]), "empty.pdf");

    const result = await uploadAssignmentDeliveryFile(formData);

    expect(result).toEqual({ ok: false, error: "Choose a file between 1 byte and 20 MB." });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("persists the full-byte digest with canonical MIME, size, and storage key", async () => {
    const bytes = Buffer.from("%PDF-1.7 finished", "utf8");
    const assignment = singleQuery({ id: "11111111-1111-4111-8111-111111111111" });
    const saved = singleQuery({
      id: "file-1",
      filename: "finished.pdf",
      storage_bucket: "assignment-submissions",
      storage_key: "stored/finished.pdf",
      payload_digest: null,
    });
    const insert = vi.fn().mockReturnValue(saved);
    const upload = vi.fn().mockResolvedValue({ error: null });
    mocks.createServiceClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => table === "assignments" ? assignment : { insert }),
      storage: { from: vi.fn(() => ({ upload, remove: vi.fn() })) },
    });
    const formData = new FormData();
    formData.set("assignmentId", "11111111-1111-4111-8111-111111111111");
    formData.set("file", new Blob([bytes], { type: "application/pdf" }), "finished.pdf");

    const result = await uploadAssignmentDeliveryFile(formData);

    expect(result).toMatchObject({ ok: true });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_id: "11111111-1111-4111-8111-111111111111",
      owner_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      storage_bucket: "assignment-submissions",
      storage_key: expect.stringMatching(/^aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa\/11111111-1111-4111-8111-111111111111\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/u),
      storage_version: expect.stringMatching(/^[0-9a-f-]{36}$/u),
      mime_type: "application/pdf",
      canonical_mime_type: "application/pdf",
      byte_size: bytes.byteLength,
      sha256_digest: createHash("sha256").update(bytes).digest("hex"),
      integrity_status: "bound",
      integrity_bound_at: expect.any(String),
    }));
    expect(upload).toHaveBeenCalledWith(expect.any(String), expect.any(Blob), {
      contentType: "application/pdf",
      upsert: false,
    });
  });

  it("stores the canonical payload digest on a prepared PDF", async () => {
    const saved = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      filename: "algebra-review.pdf",
      storage_bucket: "assignment-submissions",
      storage_key: "owner/assignment/version/algebra-review.pdf",
      payload_digest: payloadDigest,
    });
    const lookup = singleQuery(null);
    const insert = vi.fn().mockReturnValue(saved);
    const filesTable = { ...lookup, insert };
    const upload = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn(() => filesTable),
      storage: { from: vi.fn(() => ({ upload })) },
    });
    mocks.createServiceClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove: vi.fn() })) },
    });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: {
        assignmentId: "11111111-1111-4111-8111-111111111111",
        assignmentTitle: "Algebra review",
        payloadDigest,
        destination: "Google Classroom",
        submissionType: "file",
        fileName: "algebra-review.pdf",
        textPayload: "x² + √y ≤ 10",
        problems: [],
        incompleteProblemNumbers: [],
      },
    });

    const result = await prepareCanonicalAssignmentDeliveryFile({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      payloadDigest,
    });

    expect(result).toEqual({
      ok: true,
      file: {
        id: "33333333-3333-4333-8333-333333333333",
        filename: "algebra-review.pdf",
        payloadDigest,
      },
    });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_id: "11111111-1111-4111-8111-111111111111",
      payload_digest: payloadDigest,
    }));
  });

  it("rejects a prepared file whose payload digest is stale before provider access", async () => {
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: 24,
      payload_digest: "a".repeat(64),
      sha256_digest: "c".repeat(64),
      integrity_status: "bound",
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => {
        if (table === "assignments") return assignment;
        if (table === "assignment_submission_files") return delivery;
        throw new Error(`Provider data should not be read for ${table}`);
      }),
    });

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toEqual({
      ok: false,
      code: "stale_artifact",
      error: "Your work changed after this PDF was prepared. Refresh the review, then prepare and confirm the current file.",
    });
    expect(mocks.hydrateLmsConnectionForRuntime).not.toHaveBeenCalled();
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
  });

  it("blocks direct PDF submission when the original CAD binary needs external handoff", async () => {
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: 24,
      payload_digest: payloadDigest,
      sha256_digest: "c".repeat(64),
      integrity_status: "bound",
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => {
        if (table === "assignments") return assignment;
        if (table === "assignment_submission_files") return delivery;
        throw new Error(`Provider data should not be read for ${table}`);
      }),
    });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: {
        payloadDigest,
        specialistRenderDocument: buildCanonicalRenderDocument({
          blocks: [toCanonicalRenderBlock(serializeCadArtifactContext({
            units: "mm",
            dimensions: { width: 100, height: 60, depth: 20 },
            model: { fileName: "part.stl", format: "stl" },
            modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 8 },
          }), { id: "cad", label: "CAD package" })],
        }),
      },
    });

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toEqual({
      ok: false,
      error: "The Diana PDF contains a canonical summary and attached machine-readable artifact, but not the original CAD or media source file. Open Canvas and attach the source file there.",
    });
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
  });

  it("fails closed after download when integrity revalidation rejects the object", async () => {
    const original = Buffer.from("%PDF-1.7 original", "utf8");
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: original.byteLength,
      payload_digest: payloadDigest,
      sha256_digest: createHash("sha256").update(original).digest("hex"),
      integrity_status: "bound",
    });
    const classLink = singleQuery({ external_id: "canvas-course-1" });
    const connection = singleQuery({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => ({
        assignments: assignment,
        assignment_submission_files: delivery,
        classes: classLink,
        lms_connections: connection,
      })[table]),
      storage: { from: vi.fn(() => { throw new Error("authenticated download must not be used"); }) },
    });
    const serviceDownload = vi.fn().mockResolvedValue({
      data: new Blob(["%PDF-1.7 replacement"], { type: "application/pdf" }),
      error: null,
    });
    mocks.createServiceClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ download: serviceDownload })) },
    });
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue(canvasCapabilities());
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
    mocks.updateSubmissionReceiptStatus.mockResolvedValue(undefined);

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toEqual({
      ok: false,
      receiptStatus: "not_accepted",
      error: "The delivery file changed after it was attached. Upload it again before submitting.",
    });
    expect(mocks.updateSubmissionReceiptStatus).toHaveBeenCalledWith(expect.anything(), {
      receiptId: "receipt-1",
      status: "not_accepted",
      detail: "The delivery file changed after it was attached. Upload it again before submitting.",
    });
    expect(serviceDownload).toHaveBeenCalledWith(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
    );
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
  });

  it.each(["canvas", "google_classroom"] as const)(
    "forwards exact verified bytes through the valid %s path",
    async (provider) => {
      const bytes = Buffer.from("%PDF-1.7 finished answer", "utf8");
      const assignment = singleQuery({
        id: "11111111-1111-4111-8111-111111111111",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "provider-assignment-1",
        external_source: provider,
      });
      const delivery = singleQuery({
        id: "33333333-3333-4333-8333-333333333333",
        storage_bucket: "assignment-submissions",
        storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
        storage_version: "55555555-5555-4555-8555-555555555555",
        filename: "finished.pdf",
        canonical_mime_type: "application/pdf",
        byte_size: bytes.byteLength,
        payload_digest: payloadDigest,
        sha256_digest: createHash("sha256").update(bytes).digest("hex"),
        integrity_status: "bound",
      });
      const classLink = singleQuery({ external_id: "provider-course-1" });
      const config = provider === "canvas"
        ? { institution_id: "school", base_url: "https://canvas.example", token: "token" }
        : { access_token: "token" };
      const connection = singleQuery({ id: "connection-1", provider, config });
      mocks.createClient.mockResolvedValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
        from: vi.fn((table: string) => ({
          assignments: assignment,
          assignment_submission_files: delivery,
          classes: classLink,
          lms_connections: connection,
        })[table]),
        storage: { from: vi.fn(() => { throw new Error("authenticated download must not be used"); }) },
      });
      const serviceDownload = vi.fn().mockResolvedValue({ data: new Blob([bytes]), error: null });
      const authoritativeClient = {
        storage: { from: vi.fn(() => ({ download: serviceDownload })) },
      };
      mocks.createServiceClient.mockReturnValue(authoritativeClient);
      mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({ id: "connection-1", provider, config });
      mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
      const baselineObservation = provider === "canvas"
        ? {
            provider: "canvas" as const,
            submissionId: "canvas-submission-1",
            state: "unsubmitted",
            attempt: 0,
            submittedAt: null,
            attachmentIds: [],
          }
        : {
            provider: "google_classroom" as const,
            submissionId: "submission-1",
            state: "CREATED",
            attachmentIds: [],
          };
      const finalObservation = provider === "canvas"
        ? {
            ...baselineObservation,
            provider: "canvas" as const,
            state: "submitted",
            attempt: 1,
            submittedAt: "2026-09-01T19:00:00.000Z",
            attachmentIds: ["canvas-file-91"],
          }
        : {
            ...baselineObservation,
            provider: "google_classroom" as const,
            state: "TURNED_IN",
            attachmentIds: ["drive-file-1"],
          };
      if (provider === "canvas") {
        mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
        mocks.inspectCanvasSubmission
          .mockResolvedValueOnce(canvasCapabilities(baselineObservation as Extract<typeof baselineObservation, { provider: "canvas" }>))
          .mockResolvedValueOnce(canvasCapabilities(finalObservation as Extract<typeof finalObservation, { provider: "canvas" }>));
        mocks.submitCanvasFile.mockImplementation(async (input) => {
          await input.onArtifactPrepared({ provider: "canvas", providerArtifactId: "canvas-file-91" });
          return { id: 42, workflow_state: "submitted" };
        });
      } else {
        mocks.getValidGoogleToken.mockResolvedValue({ token: "token" });
        mocks.inspectGoogleClassroomSubmission
          .mockResolvedValueOnce(googleCapabilities(baselineObservation as Extract<typeof baselineObservation, { provider: "google_classroom" }>))
          .mockResolvedValueOnce(googleCapabilities(finalObservation as Extract<typeof finalObservation, { provider: "google_classroom" }>));
        mocks.submitGoogleClassroomFile.mockImplementation(async (input) => {
          await input.onArtifactPrepared({ provider: "google_classroom", providerArtifactId: "drive-file-1" });
          return { id: "submission-1", driveFileId: "drive-file-1" };
        });
      }

      const result = await submitFileToConnectedProvider({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        fileId: "33333333-3333-4333-8333-333333333333",
        confirmed: true,
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
        payloadDigest,
      });

      expect(result).toMatchObject({ ok: true, receiptStatus: "submitted" });
      const forward = provider === "canvas" ? mocks.submitCanvasFile : mocks.submitGoogleClassroomFile;
      expect(forward).toHaveBeenCalledWith(expect.objectContaining({
        file: expect.objectContaining({
          name: "finished.pdf",
          mimeType: "application/pdf",
          byteSize: bytes.byteLength,
          sha256Digest: createHash("sha256").update(bytes).digest("hex"),
          storageVersion: "55555555-5555-4555-8555-555555555555",
        }),
        onArtifactPrepared: expect.any(Function),
      }));
      expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
        1,
        authoritativeClient,
        expect.objectContaining({
          status: "confirmation_pending",
          providerResponse: expect.objectContaining({
            diana_submission_reconciliation: expect.objectContaining({
              baseline: baselineObservation,
              artifact: expect.objectContaining({
                localFileId: "33333333-3333-4333-8333-333333333333",
                providerArtifactId: null,
              }),
            }),
          }),
        }),
      );
      expect(mocks.reconcileSubmissionReceipt.mock.invocationCallOrder[0])
        .toBeLessThan(forward.mock.invocationCallOrder[0]);
      expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
        2,
        authoritativeClient,
        expect.objectContaining({
          status: "confirmation_pending",
          providerResponse: expect.objectContaining({
            diana_provider_artifact_risk: expect.objectContaining({
              state: "possible",
              provider_artifact_id: null,
            }),
          }),
        }),
      );
      expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
        3,
        authoritativeClient,
        expect.objectContaining({
          status: "confirmation_pending",
          providerResponse: expect.objectContaining({
            diana_submission_reconciliation: expect.objectContaining({
              artifact: expect.objectContaining({
                providerArtifactId: provider === "canvas" ? "canvas-file-91" : "drive-file-1",
              }),
            }),
          }),
        }),
      );
      expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
        4,
        authoritativeClient,
        expect.objectContaining({
          status: "submitted",
          providerResponse: expect.objectContaining({
            diana_submission_reconciliation: expect.objectContaining({
              artifact: expect.objectContaining({
                providerArtifactId: provider === "canvas" ? "canvas-file-91" : "drive-file-1",
              }),
            }),
            diana_provider_observation: finalObservation,
          }),
        }),
      );
      expect(serviceDownload).toHaveBeenCalledTimes(1);
    },
  );

  it("does not download or forward a replayed submitted receipt", async () => {
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: 12,
      payload_digest: payloadDigest,
      sha256_digest: "a".repeat(64),
      integrity_status: "bound",
    });
    const classLink = singleQuery({ external_id: "canvas-course-1" });
    const connection = singleQuery({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => ({ assignments: assignment, assignment_submission_files: delivery, classes: classLink, lms_connections: connection })[table]),
    });
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue(canvasCapabilities());
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "submitted", claimed: false, detail: null });

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toMatchObject({ ok: true, duplicate: true, receiptStatus: "submitted" });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
  });

  it.each([
    ["Canvas", "canvas", "canvas-file-91"],
    ["Google Classroom", "google_classroom", "drive-file-1"],
  ] as const)("keeps a %s binding failure pending and does not create another provider file on retry", async (
    _label,
    provider,
    providerArtifactId,
  ) => {
    const bytes = Buffer.from("%PDF-1.7 finished answer", "utf8");
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: `${provider}-assignment-1`,
      external_source: provider,
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: bytes.byteLength,
      payload_digest: payloadDigest,
      sha256_digest: createHash("sha256").update(bytes).digest("hex"),
      integrity_status: "bound",
    });
    const classLink = singleQuery({ external_id: `${provider}-course-1` });
    const config = provider === "canvas"
      ? { institution_id: "school", base_url: "https://canvas.example", token: "token" }
      : { access_token: "token" };
    const connection = singleQuery({ id: "connection-1", provider, config });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => ({
        assignments: assignment,
        assignment_submission_files: delivery,
        classes: classLink,
        lms_connections: connection,
      })[table]),
    });
    const serviceDownload = vi.fn().mockResolvedValue({ data: new Blob([bytes]), error: null });
    const authoritativeClient = {
      storage: { from: vi.fn(() => ({ download: serviceDownload })) },
    };
    mocks.createServiceClient.mockReturnValue(authoritativeClient);
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({ id: "connection-1", provider, config });
    if (provider === "canvas") {
      mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
      mocks.inspectCanvasSubmission.mockResolvedValue(canvasCapabilities());
    } else {
      mocks.getValidGoogleToken.mockResolvedValue({ token: "token" });
      mocks.inspectGoogleClassroomSubmission.mockResolvedValue(googleCapabilities());
    }
    mocks.claimSubmissionReceipt
      .mockResolvedValueOnce({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null })
      .mockResolvedValueOnce({ receiptId: "receipt-1", status: "confirmation_pending", claimed: false, detail: "Binding confirmation is pending." });
    let reconciliationCall = 0;
    mocks.reconcileSubmissionReceipt.mockImplementation(async (_client, input) => {
      reconciliationCall += 1;
      if (reconciliationCall === 3) throw new Error("receipt unavailable");
      return {
        receiptId: input.receiptId,
        status: input.status,
        transitioned: true,
        detail: input.detail,
      };
    });
    const bindingMessage = "The provider file was created, but Diana could not bind it to this receipt.";
    const forward = provider === "canvas" ? mocks.submitCanvasFile : mocks.submitGoogleClassroomFile;
    forward.mockImplementation(async (input) => {
      try {
        await input.onArtifactPrepared({ provider, providerArtifactId });
      } catch (cause) {
        throw Object.assign(new Error(bindingMessage), { outcome: "ambiguous", cause });
      }
    });

    const first = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });
    const replay = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      payloadDigest,
    });

    expect(first).toEqual({
      ok: false,
      receiptStatus: "confirmation_pending",
      error: bindingMessage,
    });
    expect(replay).toMatchObject({ ok: false, receiptStatus: "confirmation_pending" });
    expect(forward).toHaveBeenCalledTimes(1);
    expect(serviceDownload).toHaveBeenCalledTimes(1);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledTimes(4);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
      4,
      authoritativeClient,
      expect.objectContaining({
        status: "confirmation_pending",
        providerResponse: expect.objectContaining({
          diana_submission_reconciliation: expect.objectContaining({
            artifact: expect.objectContaining({ providerArtifactId }),
          }),
        }),
      }),
    );
    expect(mocks.updateSubmissionReceiptStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["lost provider response", "Canvas could not confirm whether the provider received it."],
    ["provider 5xx", "Canvas could not submit this file (503)."],
  ])("keeps %s pending and prevents a duplicate with a fresh key", async (_label, message) => {
    const bytes = Buffer.from("%PDF-1.7 finished answer", "utf8");
    const assignment = singleQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    const delivery = singleQuery({
      id: "33333333-3333-4333-8333-333333333333",
      storage_bucket: "assignment-submissions",
      storage_key: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/11111111-1111-4111-8111-111111111111/55555555-5555-4555-8555-555555555555/file.pdf",
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: bytes.byteLength,
      payload_digest: payloadDigest,
      sha256_digest: createHash("sha256").update(bytes).digest("hex"),
      integrity_status: "bound",
    });
    const classLink = singleQuery({ external_id: "canvas-course-1" });
    const config = {
      institution_id: "school",
      base_url: "https://canvas.example",
      token: "token",
    };
    const connection = singleQuery({ id: "connection-1", provider: "canvas", config });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => ({
        assignments: assignment,
        assignment_submission_files: delivery,
        classes: classLink,
        lms_connections: connection,
      })[table]),
    });
    const serviceDownload = vi.fn().mockResolvedValue({ data: new Blob([bytes]), error: null });
    const authoritativeClient = {
      storage: { from: vi.fn(() => ({ download: serviceDownload })) },
    };
    mocks.createServiceClient.mockReturnValue(authoritativeClient);
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({ id: "connection-1", provider: "canvas", config });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue(canvasCapabilities());
    mocks.claimSubmissionReceipt
      .mockResolvedValueOnce({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null })
      .mockResolvedValueOnce({ receiptId: "receipt-1", status: "confirmation_pending", claimed: false, detail: message });
    mocks.submitCanvasFile.mockRejectedValue(Object.assign(new Error(message), { outcome: "ambiguous" }));
    mocks.updateSubmissionReceiptStatus.mockResolvedValue(undefined);

    const first = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });
    const replay = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      payloadDigest,
    });

    expect(first).toEqual({
      ok: false,
      receiptStatus: "confirmation_pending",
      error: message,
    });
    expect(replay).toMatchObject({ ok: false, receiptStatus: "confirmation_pending" });
    expect(mocks.updateSubmissionReceiptStatus).not.toHaveBeenCalled();
    expect(mocks.claimSubmissionReceipt).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
    }));
    expect(mocks.submitCanvasFile).toHaveBeenCalledTimes(1);
    expect(serviceDownload).toHaveBeenCalledTimes(1);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledTimes(3);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
      3,
      authoritativeClient,
      expect.objectContaining({
        status: "confirmation_pending",
        detail: message,
        providerResponse: expect.objectContaining({
          diana_submission_reconciliation: expect.objectContaining({
            artifact: expect.objectContaining({ providerArtifactId: null }),
          }),
        }),
      }),
    );
  });

});
