import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authoritativeClient: { from: vi.fn(), rpc: vi.fn() },
  canReleaseProviderArtifactLock: vi.fn(),
  claimSubmissionReceipt: vi.fn(),
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  loadAssignmentHomeworkKernel: vi.fn(),
  loadAssignmentSubmissionBundle: vi.fn(),
  reconcileSubmissionReceipt: vi.fn(),
  resolveProviderSubmissionStatus: vi.fn(),
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
  canReleaseCanvasTextReceiptAfterRejection: vi.fn(() => false),
  canReleaseProviderArtifactLock: mocks.canReleaseProviderArtifactLock,
  claimSubmissionReceipt: mocks.claimSubmissionReceipt,
  inspectCanvasSubmission: mocks.inspectCanvasSubmission,
  inspectGoogleClassroomSubmission: vi.fn(),
  providerSubmissionReceiptStatus: vi.fn(() => "not_accepted"),
  reconcileSubmissionReceipt: mocks.reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus: mocks.resolveProviderSubmissionStatus,
  submissionCapabilities: vi.fn(() => ({
    provider: "canvas",
    capabilities: ["open_external"],
    note: "Open Canvas",
    allowedExtensions: [],
    providerSubmissionId: null,
    providerState: null,
  })),
  submitCanvasText: vi.fn(),
  updateSubmissionReceiptStatus: vi.fn(),
}));
vi.mock("@/lib/student-state/server", () => ({ recordStudentStateSnapshot: vi.fn() }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({
  loadAssignmentHomeworkKernel: mocks.loadAssignmentHomeworkKernel,
}));
vi.mock("@/lib/assignment-submission-server", () => ({
  loadAssignmentSubmissionBundle: mocks.loadAssignmentSubmissionBundle,
}));
vi.mock("@/lib/assignment-submission", () => ({
  canonicalSubmissionPayloadForTarget: vi.fn(() => ({ textPayload: "finished work" })),
}));

import {
  checkConnectedProviderSubmissionStatus,
  submitToConnectedProvider,
} from "./actions";
import { LmsReconnectRequiredError } from "@/lib/lms/errors";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const payloadDigest = "a".repeat(64);

function query(value: unknown) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: value, error: null })),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
}

function setupClient(options: { receipt?: Record<string, unknown> | null } = {}) {
  const assignment = {
    id: assignmentId,
    title: "Essay",
    class_id: "22222222-2222-4222-8222-222222222222",
    external_id: "assignment-a",
    provider_assignment_id: null,
    external_source: "canvas",
    saved_work: { text: "finished work" },
    work_profile: null,
    assignment_profile: null,
  };
  const rows: Record<string, unknown> = {
    assignments: assignment,
    assignment_submission_receipts: options.receipt ?? null,
    classes: { external_id: "course-a" },
    lms_connections: { id: "connection-a", provider: "canvas", config: {} },
  };
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: ownerId } } })) },
    from: vi.fn((table: string) => query(rows[table])),
  });
  return assignment;
}

describe("assignment LMS caller hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
    mocks.createServiceClient.mockReturnValue(mocks.authoritativeClient);
    mocks.loadAssignmentHomeworkKernel.mockResolvedValue({ profile: {} });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: { payloadDigest, textPayload: "finished work" },
    });
    mocks.canReleaseProviderArtifactLock.mockReturnValue(true);
  });

  afterEach(() => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "true";
  });

  it("checks the provider flag before reading or claiming student work", async () => {
    process.env.DIANA_LMS_CANVAS_SUBMISSION_ENABLED = "false";
    setupClient();

    const result = await submitToConnectedProvider({
      assignmentId,
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      payloadDigest,
    });

    expect(result).toMatchObject({ ok: false, code: "provider_feature_disabled" });
    expect(mocks.loadAssignmentHomeworkKernel).not.toHaveBeenCalled();
    expect(mocks.loadAssignmentSubmissionBundle).not.toHaveBeenCalled();
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("preserves a pending receipt when credentials require reconnection", async () => {
    setupClient({
      receipt: {
        id: "receipt-a",
        status: "confirmation_pending",
        detail: "Check Canvas before retrying.",
        provider: "canvas",
      },
    });
    mocks.hydrateLmsConnectionForRuntime.mockRejectedValue(new LmsReconnectRequiredError("canvas"));

    const result = await checkConnectedProviderSubmissionStatus({ assignmentId });

    expect(result).toEqual({
      ok: false,
      code: "reconnect_required",
      receiptStatus: "confirmation_pending",
      error: "Reconnect Canvas to continue.",
    });
    expect(mocks.reconcileSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("keeps a pending artifact receipt locked when a broad provider check says not accepted", async () => {
    const storedProviderResponse = {
      diana_provider_artifact_risk: {
        provider: "canvas",
        operation_id: "receipt-a",
        state: "created",
        provider_artifact_id: "canvas-file-1",
      },
    };
    setupClient({
      receipt: {
        id: "receipt-a",
        status: "confirmation_pending",
        detail: "Check Canvas before retrying.",
        provider: "canvas",
        provider_response: storedProviderResponse,
      },
    });
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
      provider: "canvas",
      capabilities: ["open_external"],
      note: "Canvas is not accepting this attempt.",
      allowedExtensions: [],
      providerSubmissionId: "canvas-submission-1",
      providerState: "unsubmitted",
      providerCanSubmit: false,
      providerLocked: true,
    });
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "not_accepted",
      detail: "Canvas does not show a completed submission.",
      providerReceiptId: "canvas-submission-1",
      providerResponse: { provider: "canvas", provider_state: "unsubmitted" },
    });
    mocks.canReleaseProviderArtifactLock.mockReturnValue(false);
    mocks.reconcileSubmissionReceipt.mockImplementation(async (_client, input) => ({
      receiptId: input.receiptId,
      status: input.status,
      transitioned: true,
      detail: input.detail,
    }));

    const result = await checkConnectedProviderSubmissionStatus({ assignmentId });

    expect(result).toMatchObject({
      ok: true,
      receiptStatus: "confirmation_pending",
    });
    expect(mocks.canReleaseProviderArtifactLock).toHaveBeenCalledWith(
      storedProviderResponse,
      expect.objectContaining({ provider: "canvas" }),
    );
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      mocks.authoritativeClient,
      expect.objectContaining({
        status: "confirmation_pending",
        providerReceiptId: null,
      }),
    );
  });
});
