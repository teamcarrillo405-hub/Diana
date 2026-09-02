import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimSubmissionReceipt: vi.fn(),
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  loadAssignmentSubmissionBundle: vi.fn(),
  providerArtifactFailureResponse: vi.fn(),
  providerArtifactRiskResponse: vi.fn(),
  providerSubmissionReceiptStatus: vi.fn(),
  reconcileSubmissionReceipt: vi.fn(),
  revalidateSubmissionFileForForwarding: vi.fn(),
  submitCanvasFile: vi.fn(),
  updateSubmissionReceiptStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: vi.fn(),
}));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: vi.fn() }));
vi.mock("@/lib/lms/submission", () => ({
  claimSubmissionReceipt: mocks.claimSubmissionReceipt,
  inspectCanvasSubmission: mocks.inspectCanvasSubmission,
  inspectGoogleClassroomSubmission: vi.fn(),
  providerArtifactFailureResponse: mocks.providerArtifactFailureResponse,
  providerArtifactRiskResponse: mocks.providerArtifactRiskResponse,
  providerSubmissionReceiptStatus: mocks.providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt: mocks.reconcileSubmissionReceipt,
  submitCanvasFile: mocks.submitCanvasFile,
  submitGoogleClassroomFile: vi.fn(),
  updateSubmissionReceiptStatus: mocks.updateSubmissionReceiptStatus,
}));
vi.mock("@/lib/lms/submission-file-integrity", () => ({
  revalidateSubmissionFileForForwarding: mocks.revalidateSubmissionFileForForwarding,
}));
vi.mock("@/lib/student-state/server", () => ({ recordStudentStateSnapshot: vi.fn() }));
vi.mock("@/lib/assignment-submission-server", () => ({
  loadAssignmentSubmissionBundle: mocks.loadAssignmentSubmissionBundle,
}));
vi.mock("@/lib/assignment-submission-pdf", () => ({ renderAssignmentSubmissionPdf: vi.fn() }));

import { submitFileToConnectedProvider } from "./delivery-actions";
import { LmsReconnectRequiredError } from "@/lib/lms/errors";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const fileId = "33333333-3333-4333-8333-333333333333";
const payloadDigest = "a".repeat(64);

function query(value: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: value, error: null })),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  return builder;
}

function setupClient() {
  const from = vi.fn((table: string) => query({
    assignments: {
      id: assignmentId,
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "assignment-a",
      provider_assignment_id: null,
      external_source: "canvas",
    },
    assignment_submission_files: {
      id: fileId,
      storage_bucket: "assignment-submissions",
      storage_key: `${ownerId}/${assignmentId}/55555555-5555-4555-8555-555555555555/file.pdf`,
      storage_version: "55555555-5555-4555-8555-555555555555",
      filename: "finished.pdf",
      canonical_mime_type: "application/pdf",
      byte_size: 12,
      payload_digest: payloadDigest,
      sha256_digest: "b".repeat(64),
      integrity_status: "bound",
    },
    classes: { external_id: "course-a" },
    lms_connections: { id: "connection-a", provider: "canvas", config: {} },
  }[table]));
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: ownerId } } })) },
    from,
  });
  return { from };
}

describe("assignment delivery LMS hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({ preview: { payloadDigest } });
    mocks.providerSubmissionReceiptStatus.mockReturnValue("not_accepted");
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
  });

  afterEach(() => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
  });

  it("maps missing credentials before claiming a receipt or reading the delivery blob", async () => {
    setupClient();
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(new LmsReconnectRequiredError("canvas"));

    const result = await submitFileToConnectedProvider({
      assignmentId,
      fileId,
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toEqual({
      ok: false,
      code: "reconnect_required",
      error: "Reconnect Canvas to continue.",
    });
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("checks the Canvas submission flag before reading the prepared file", async () => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "false";
    const { from } = setupClient();

    const result = await submitFileToConnectedProvider({
      assignmentId,
      fileId,
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toMatchObject({ ok: false, code: "provider_feature_disabled" });
    expect(from.mock.calls.map(([table]) => table)).toEqual(["assignments"]);
    expect(mocks.loadAssignmentSubmissionBundle).not.toHaveBeenCalled();
  });

  it("does not upload to Canvas when the pre-write provider baseline cannot be saved", async () => {
    setupClient();
    const authoritativeClient = {
      storage: { from: vi.fn() },
      from: vi.fn(),
      rpc: vi.fn(),
    };
    mocks.createServiceClient.mockReturnValue(authoritativeClient);
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({
      id: "connection-a",
      provider: "canvas",
      config: {
        institution_id: "school",
        base_url: "https://canvas.example",
        token: "token",
      },
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({
      capabilities: ["open_external", "upload_file"],
      allowedExtensions: ["pdf"],
      note: "Ready",
      reconciliationObservation: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "unsubmitted",
        attempt: 0,
        submittedAt: null,
        attachmentIds: [],
      },
    });
    mocks.claimSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "prepared",
      claimed: true,
      detail: null,
    });
    mocks.reconcileSubmissionReceipt.mockRejectedValue(new Error("receipt unavailable"));

    const result = await submitFileToConnectedProvider({
      assignmentId,
      fileId,
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toMatchObject({ ok: false, receiptStatus: "confirmation_pending" });
    expect(mocks.createServiceClient).toHaveBeenCalledTimes(1);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      authoritativeClient,
      expect.objectContaining({ status: "confirmation_pending" }),
    );
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
  });

  it("keeps the receipt locked when Canvas creates a file before a later 4xx", async () => {
    setupClient();
    const authoritativeClient = {
      storage: {
        from: vi.fn(() => ({
          download: vi.fn(async () => ({ data: new Blob(["pdf"]), error: null })),
        })),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    };
    mocks.createServiceClient.mockReturnValue(authoritativeClient);
    mocks.hydrateLmsConnectionForRuntime.mockResolvedValue({
      id: "connection-a",
      provider: "canvas",
      config: {
        institution_id: "school",
        base_url: "https://canvas.example",
        token: "token",
      },
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({
      capabilities: ["open_external", "upload_file"],
      allowedExtensions: ["pdf"],
      note: "Ready",
      reconciliationObservation: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "unsubmitted",
        attempt: 0,
        submittedAt: null,
        attachmentIds: [],
      },
    });
    mocks.claimSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "prepared",
      claimed: true,
      detail: null,
    });
    mocks.reconcileSubmissionReceipt.mockImplementation(async (_client, input) => ({
      receiptId: input.receiptId,
      status: input.status,
      transitioned: true,
      detail: input.detail,
    }));
    mocks.revalidateSubmissionFileForForwarding.mockResolvedValue({
      name: "finished.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array([1, 2, 3]),
      byteSize: 3,
      sha256Digest: "b".repeat(64),
      storageVersion: "55555555-5555-4555-8555-555555555555",
    });
    mocks.submitCanvasFile.mockImplementation(async (input) => {
      expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledTimes(2);
      expect(mocks.reconcileSubmissionReceipt.mock.calls[1][1]).toMatchObject({
        status: "confirmation_pending",
        providerResponse: {
          diana_provider_artifact_risk: {
            provider: "canvas",
            operation_id: "receipt-1",
            state: "possible",
            provider_artifact_id: null,
          },
        },
      });
      await input.onArtifactPrepared({
        provider: "canvas",
        providerArtifactId: "canvas-file-1",
      });
      throw new Error("Canvas could not submit this file (422).");
    });

    const result = await submitFileToConnectedProvider({
      assignmentId,
      fileId,
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toMatchObject({ ok: false, receiptStatus: "confirmation_pending" });
    expect(mocks.providerSubmissionReceiptStatus).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        providerArtifactAttempted: true,
        providerArtifactId: "canvas-file-1",
      }),
    );
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenLastCalledWith(
      authoritativeClient,
      expect.objectContaining({
        status: "confirmation_pending",
        providerResponse: expect.objectContaining({
          diana_provider_artifact_risk: expect.objectContaining({
            provider_artifact_id: "canvas-file-1",
          }),
        }),
      }),
    );
    expect(mocks.updateSubmissionReceiptStatus).not.toHaveBeenCalled();
  });
});
