import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  canReleaseProviderArtifactLock: vi.fn(() => true),
  authoritativeClient: { from: vi.fn(), rpc: vi.fn() },
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidGoogleToken: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionForRuntime: vi.fn(),
  persistLmsTokenRefreshForRuntime: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  inspectGoogleClassroomSubmission: vi.fn(),
  submitCanvasText: vi.fn(),
  submitGoogleClassroomFile: vi.fn(),
  claimSubmissionReceipt: vi.fn(),
  reconcileSubmissionReceipt: vi.fn(),
  recordStudentStateSnapshot: vi.fn(),
  resolveProviderSubmissionStatus: vi.fn(),
  updateSubmissionReceiptStatus: vi.fn(),
  loadAssignmentHomeworkKernel: vi.fn(),
  loadAssignmentSubmissionBundle: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/lms/credential-policy", () => ({
  hydrateLmsConnectionForRuntime: mocks.hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime: mocks.persistLmsTokenRefreshForRuntime,
}));
vi.mock("@/lib/lms/submission", () => ({
  canReleaseCanvasTextReceiptAfterRejection: (
    baseline: { provider: string; submissionId: string | null; state: string | null; attempt?: number | null; submittedAt?: string | null; attachmentIds: string[] },
    current: { provider: string; submissionId: string | null; state: string | null; attempt?: number | null; submittedAt?: string | null; attachmentIds: string[] } | null,
  ) => Boolean(current
    && baseline.provider === current.provider
    && baseline.submissionId === current.submissionId
    && baseline.state === current.state
    && baseline.attempt === current.attempt
    && baseline.submittedAt === current.submittedAt
    && baseline.attachmentIds.length === current.attachmentIds.length
    && baseline.attachmentIds.every((id) => current.attachmentIds.includes(id))),
  canReleaseProviderArtifactLock: mocks.canReleaseProviderArtifactLock,
  claimSubmissionReceipt: mocks.claimSubmissionReceipt,
  inspectCanvasSubmission: mocks.inspectCanvasSubmission,
  inspectGoogleClassroomSubmission: mocks.inspectGoogleClassroomSubmission,
  providerSubmissionReceiptStatus: (error: unknown) => (
    (error as { outcome?: string } | null)?.outcome === "ambiguous"
      ? "confirmation_pending"
      : "not_accepted"
  ),
  submissionCapabilities: vi.fn(() => ({
    provider: "other",
    capabilities: ["open_external"],
    note: "Guided handoff",
    allowedExtensions: [],
    providerSubmissionId: null,
    providerState: null,
  })),
  reconcileSubmissionReceipt: mocks.reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus: mocks.resolveProviderSubmissionStatus,
  submitCanvasText: mocks.submitCanvasText,
  updateSubmissionReceiptStatus: mocks.updateSubmissionReceiptStatus,
}));
vi.mock("@/lib/student-state/server", () => ({ recordStudentStateSnapshot: mocks.recordStudentStateSnapshot }));
vi.mock("@/lib/assignment-help/server-understanding", () => ({
  loadAssignmentHomeworkKernel: mocks.loadAssignmentHomeworkKernel,
}));
vi.mock("@/lib/assignment-submission-server", () => ({
  loadAssignmentSubmissionBundle: mocks.loadAssignmentSubmissionBundle,
}));

import { checkConnectedProviderSubmissionStatus, submitToConnectedProvider } from "./actions";
import {
  buildCanonicalRenderDocument,
  toCanonicalRenderBlock,
} from "@/lib/specialist-artifacts/render-blocks";
import { serializeGraphArtifactContext } from "@/lib/specialist-artifacts/serializers";

function assignmentQuery(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}


function listQuery(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return query;
}

function receiptQuery(data: unknown) {
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

function reconciliationClient(input: {
  assignment: unknown;
  receipt: unknown;
  provider?: "canvas" | "google_classroom";
}) {
  const assignment = assignmentQuery(input.assignment);
  const receipt = receiptQuery(input.receipt);
  const classLink = assignmentQuery({ external_id: "provider-course-1" });
  const provider = input.provider ?? "canvas";
  const connection = assignmentQuery({
    id: "connection-1",
    provider,
    config: provider === "canvas"
      ? { institution_id: "school", base_url: "https://school.instructure.com", token: "token" }
      : { access_token: "token" },
  });
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn((table: string) => ({
      assignments: assignment,
      assignment_submission_receipts: receipt,
      classes: classLink,
      lms_connections: connection,
    })[table]),
  };
  mocks.createClient.mockResolvedValue(supabase);
  return { assignment, receipt, supabase };
}
describe("assignment provider submission actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createServiceClient.mockReturnValue(mocks.authoritativeClient);
    mocks.hydrateLmsConnectionForRuntime.mockImplementation(async (_ownerId, connection) => connection);
    mocks.recordStudentStateSnapshot.mockResolvedValue(undefined);
    mocks.loadAssignmentHomeworkKernel.mockResolvedValue({ profile: { key: "writing" } });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue(null);
    mocks.reconcileSubmissionReceipt.mockImplementation(async (_client, input) => ({
      receiptId: input.receiptId,
      status: input.status,
      transitioned: true,
      detail: input.detail,
    }));
  });

  it("hard-stops Google turn-in when no Diana file is supplied", async () => {
    const query = assignmentQuery({
      id: "11111111-1111-4111-8111-111111111111",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "course-work-1",
      external_source: "google_classroom",
      saved_work: { answer: "Done" },
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => query),
    });

    const result = await submitToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      confirmed: true,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      payloadDigest: "a".repeat(64),
    });

    expect(result).toEqual({
      ok: false,
      error: "Attach a finished Diana file before submitting to Google Classroom.",
    });
    expect(mocks.getValidGoogleToken).not.toHaveBeenCalled();
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
  });

  it("reconciles an accepted Google submission after the turn-in response was lost", async () => {
    reconciliationClient({
      provider: "google_classroom",
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Rhetorical analysis",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "provider-course-1:provider-work-raw",
        provider_assignment_id: "provider-work-raw",
        external_source: "google_classroom",
      },
      receipt: {
        id: "receipt-1",
        provider: "google_classroom",
        status: "confirmation_pending",
        detail: "Still confirming.",
      },
    });
    mocks.getValidGoogleToken.mockResolvedValue({ token: "valid-token" });
    const inspection = {
      provider: "google_classroom",
      capabilities: ["open_external"],
      note: "Already turned in.",
      allowedExtensions: [],
      providerSubmissionId: "student-submission-1",
      providerState: "TURNED_IN",
      reconciliationObservation: {
        provider: "google_classroom",
        submissionId: "student-submission-1",
        state: "TURNED_IN",
        attachmentIds: ["drive-file-1"],
      },
    };
    mocks.inspectGoogleClassroomSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "submitted",
      detail: "Google Classroom shows this assignment as submitted.",
      providerReceiptId: "student-submission-1",
      providerResponse: {
        provider_state: "TURNED_IN",
        diana_provider_observation: inspection.reconciliationObservation,
      },
    });
    mocks.reconcileSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "submitted",
      transitioned: true,
      detail: "Google Classroom shows this assignment as submitted.",
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "submitted", duplicate: false });
    expect(mocks.inspectGoogleClassroomSubmission).toHaveBeenCalledWith(expect.objectContaining({
      courseWorkId: "provider-work-raw",
    }));
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      mocks.authoritativeClient,
      expect.objectContaining({
        status: "submitted",
        providerResponse: expect.objectContaining({
          diana_provider_observation: inspection.reconciliationObservation,
        }),
      }),
    );
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
    expect(mocks.submitGoogleClassroomFile).not.toHaveBeenCalled();
  });

  it("keeps a provider-pending receipt recoverable without resending", async () => {
    reconciliationClient({
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Lab report",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "canvas-assignment-1",
        provider_assignment_id: null,
        external_source: "canvas",
      },
      receipt: { id: "receipt-1", provider: "canvas", status: "confirmation_pending", detail: null },
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token" });
    const inspection = {
      provider: "canvas",
      capabilities: ["open_external", "submit_text"],
      note: "Text is supported.",
      allowedExtensions: [],
      providerSubmissionId: "submission-1",
      providerState: "unsubmitted",
      reconciliationObservation: {
        provider: "canvas",
        submissionId: "submission-1",
        state: "unsubmitted",
        attempt: 0,
        submittedAt: null,
        attachmentIds: [],
      },
    };
    mocks.inspectCanvasSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "confirmation_pending",
      detail: "Canvas does not show a completed submission yet. You can check again.",
      providerReceiptId: "submission-1",
      providerResponse: {
        provider_state: "unsubmitted",
        diana_provider_observation: inspection.reconciliationObservation,
      },
    });
    mocks.reconcileSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "confirmation_pending",
      transitioned: false,
      detail: "Canvas does not show a completed submission yet. You can check again.",
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "confirmation_pending" });
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      mocks.authoritativeClient,
      expect.objectContaining({ status: "confirmation_pending" }),
    );
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
  });

  it("keeps provider status errors recoverable and never resends", async () => {
    reconciliationClient({
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Lab report",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "canvas-assignment-1",
        provider_assignment_id: null,
        external_source: "canvas",
      },
      receipt: { id: "receipt-1", provider: "canvas", status: "confirmation_pending", detail: null },
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token" });
    mocks.inspectCanvasSubmission.mockRejectedValue(new Error("Canvas denied the status request."));
    mocks.reconcileSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "confirmation_pending",
      transitioned: false,
      detail: "The school system could not confirm the submission status yet.",
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "confirmation_pending" });
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(mocks.authoritativeClient, expect.objectContaining({
      status: "confirmation_pending",
    }));
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
  });

  it("releases the receipt for a new student-confirmed attempt when Google reports no submission", async () => {
    reconciliationClient({
      provider: "google_classroom",
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Rhetorical analysis",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "provider-course-1:provider-work-raw",
        provider_assignment_id: "provider-work-raw",
        external_source: "google_classroom",
      },
      receipt: { id: "receipt-1", provider: "google_classroom", status: "confirmation_pending", detail: null },
    });
    mocks.getValidGoogleToken.mockResolvedValue({ token: "valid-token" });
    const inspection = {
      provider: "google_classroom",
      capabilities: ["open_external"],
      note: "Submit in Google Classroom.",
      allowedExtensions: [],
      providerSubmissionId: null,
      providerState: null,
      reconciliationObservation: {
        provider: "google_classroom",
        submissionId: null,
        state: null,
        attachmentIds: [],
      },
    };
    mocks.inspectGoogleClassroomSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "not_accepted",
      detail: "Google Classroom does not show a submission Diana can confirm.",
      providerReceiptId: null,
      providerResponse: {
        provider_state: null,
        diana_provider_observation: inspection.reconciliationObservation,
      },
    });
    mocks.reconcileSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "not_accepted",
      transitioned: true,
      detail: "Google Classroom does not show a submission Diana can confirm.",
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "not_accepted" });
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      mocks.authoritativeClient,
      expect.objectContaining({ status: "not_accepted" }),
    );
    expect(mocks.submitGoogleClassroomFile).not.toHaveBeenCalled();
  });

  it("treats a concurrent reconciliation winner as a duplicate without repeating completion effects", async () => {
    reconciliationClient({
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Lab report",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "canvas-assignment-1",
        provider_assignment_id: null,
        external_source: "canvas",
      },
      receipt: { id: "receipt-1", provider: "canvas", status: "confirmation_pending", detail: null },
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token" });
    const inspection = {
      provider: "canvas",
      capabilities: ["open_external"],
      note: "Already submitted.",
      allowedExtensions: [],
      providerSubmissionId: "submission-1",
      providerState: "submitted",
      reconciliationObservation: {
        provider: "canvas",
        submissionId: "submission-1",
        state: "submitted",
        attempt: 1,
        submittedAt: "2026-09-01T19:00:00.000Z",
        attachmentIds: [],
      },
    };
    mocks.inspectCanvasSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "submitted",
      detail: "Canvas shows this assignment as submitted.",
      providerReceiptId: "submission-1",
      providerResponse: {
        provider_state: "submitted",
        diana_provider_observation: inspection.reconciliationObservation,
      },
    });
    mocks.reconcileSubmissionReceipt.mockResolvedValue({
      receiptId: "receipt-1",
      status: "submitted",
      transitioned: false,
      detail: "Canvas shows this assignment as submitted.",
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, duplicate: true, receiptStatus: "submitted" });
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(
      mocks.authoritativeClient,
      expect.objectContaining({ status: "submitted" }),
    );
    expect(mocks.recordStudentStateSnapshot).not.toHaveBeenCalled();
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
  });

  it("returns an already reconciled receipt without another provider request", async () => {
    reconciliationClient({
      assignment: {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Lab report",
        class_id: "22222222-2222-4222-8222-222222222222",
        external_id: "canvas-assignment-1",
        provider_assignment_id: null,
        external_source: "canvas",
      },
      receipt: { id: "receipt-1", provider: "canvas", status: "submitted", detail: "Canvas confirmed it." },
    });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toMatchObject({ ok: true, duplicate: true, receiptStatus: "submitted" });
    expect(mocks.inspectCanvasSubmission).not.toHaveBeenCalled();
    expect(mocks.reconcileSubmissionReceipt).not.toHaveBeenCalled();
  });

  it("does not reveal or reconcile an assignment owned by another student", async () => {
    const { assignment } = reconciliationClient({ assignment: null, receipt: null });

    const result = await checkConnectedProviderSubmissionStatus({
      assignmentId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result).toEqual({ ok: false, error: "This assignment is not connected to a school system." });
    expect(assignment.eq).toHaveBeenCalledWith("owner_id", "user-1");
    expect(mocks.inspectCanvasSubmission).not.toHaveBeenCalled();
    expect(mocks.reconcileSubmissionReceipt).not.toHaveBeenCalled();
  });
  it("submits only the canonical subject artifact to Canvas", async () => {
    const assignment = assignmentQuery({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Rhetorical analysis",
      description: "Draft a response with a claim and evidence.",
      rubric_text: "Use source evidence and student-owned wording.",
      kind: "essay",
      source_import_status: "metadata_only",
      classes: { name: "English 11" },
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
      saved_work: {
        workspaceMode: "writing",
        writingThesis: "The author builds trust through evidence.",
        draft: "This is the student's draft.",
        delivery: "canvas_text",
        scaffold: "Internal coaching should stay private.",
        staleInternalField: "Do not submit this.",
      },
      work_profile: "writing",
      assignment_profile: null,
    });
    const problems = listQuery([]);
    const artifactBlocks = listQuery([]);
    const classLink = assignmentQuery({ external_id: "canvas-course-1" });
    const connection = assignmentQuery({ config: { institution_id: "school", base_url: "https://school.instructure.com", token: "token" } });
    const sources = listQuery([]);
    const snapshot = receiptQuery(null);
    const signals: Record<string, ReturnType<typeof vi.fn>> = {};
    signals.select = vi.fn(() => signals);
    signals.eq = vi.fn(() => signals);
    signals.gte = vi.fn(() => signals);
    signals.order = vi.fn(() => signals);
    signals.limit = vi.fn().mockResolvedValue({ data: [], error: null });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => ({
        assignments: assignment,
        assignment_problems: problems,
        artifact_blocks: artifactBlocks,
        assignment_sources: sources,
        student_state_snapshots: snapshot,
        task_signals: signals,
        classes: classLink,
        lms_connections: connection,
      })[table]),
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token" });
    const baselineObservation = {
      provider: "canvas" as const,
      submissionId: "canvas-submission-1",
      state: "unsubmitted",
      attempt: 0,
      submittedAt: null,
      attachmentIds: [],
    };
    const finalObservation = {
      ...baselineObservation,
      state: "submitted",
      attempt: 1,
      submittedAt: "2026-09-01T19:00:00.000Z",
    };
    mocks.inspectCanvasSubmission.mockResolvedValueOnce({
      provider: "canvas",
      capabilities: ["open_external", "submit_text"],
      note: "Text is supported.",
      allowedExtensions: [],
      providerSubmissionId: null,
      providerState: null,
      reconciliationObservation: baselineObservation,
    }).mockResolvedValueOnce({
      provider: "canvas",
      capabilities: ["open_external", "submit_text"],
      note: "Submitted.",
      allowedExtensions: [],
      providerSubmissionId: "canvas-submission-1",
      providerState: "submitted",
      reconciliationObservation: finalObservation,
    });
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
    mocks.submitCanvasText.mockResolvedValue({ id: 42, workflow_state: "submitted" });
    const canonicalText = [
      "Rhetorical analysis",
      "",
      "Thesis or main claim",
      "The author builds trust through evidence.",
      "",
      "Your draft",
      "This is the student's draft.",
    ].join("\n");
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: {
        payloadDigest: "a".repeat(64),
        textPayload: "Legacy text should not be sent.",
        universalTextPayload: canonicalText,
        specialistRenderDocument: buildCanonicalRenderDocument({
          blocks: [],
        }),
      },
    });

    const result = await submitToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      confirmed: true,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      payloadDigest: "a".repeat(64),
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "submitted" });
    expect(mocks.claimSubmissionReceipt.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.createServiceClient.mock.invocationCallOrder[0]);
    const payload = mocks.submitCanvasText.mock.calls[0][0];
    expect(payload.text).toContain("Rhetorical analysis");
    expect(payload.text).toContain("Thesis or main claim\nThe author builds trust through evidence.");
    expect(payload.text).toContain("Your draft\nThis is the student's draft.");
    expect(payload.text).not.toContain("Legacy text should not be sent.");
    expect(payload.text).not.toMatch(/scaffold|internal coaching|staleinternalfield|do not submit|canvas_text/iu);
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
      1,
      mocks.authoritativeClient,
      expect.objectContaining({
        status: "confirmation_pending",
        providerResponse: {
          diana_submission_reconciliation: {
            version: 2,
            baseline: baselineObservation,
            text: { payloadDigest: "a".repeat(64) },
          },
        },
      }),
    );
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenNthCalledWith(
      2,
      mocks.authoritativeClient,
      expect.objectContaining({
        status: "submitted",
        providerResponse: expect.objectContaining({
          workflow_state: "submitted",
          payload_digest: "a".repeat(64),
          diana_provider_observation: finalObservation,
        }),
      }),
    );
  });

  it("rejects Canvas text submission for a canonical specialist artifact before claiming a receipt", async () => {
    const assignment = assignmentQuery({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Graph analysis",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => assignment),
    });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: {
        payloadDigest: "a".repeat(64),
        textPayload: "y = x^2",
        specialistRenderDocument: buildCanonicalRenderDocument({
          blocks: [toCanonicalRenderBlock(serializeGraphArtifactContext({
            expression: "x^2",
            points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          }))],
        }),
      },
    });

    const result = await submitToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      confirmed: true,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      payloadDigest: "a".repeat(64),
    });

    expect(result).toEqual({
      ok: false,
      error: "This work includes a specialist artifact. Submit the canonical PDF so Canvas receives its visible summary and attached machine-readable artifact.",
    });
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("stops submission when the reviewed work changed", async () => {
    const assignment = assignmentQuery({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Rhetorical analysis",
      class_id: "22222222-2222-4222-8222-222222222222",
      external_id: "canvas-assignment-1",
      external_source: "canvas",
    });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn(() => assignment),
    });
    mocks.loadAssignmentSubmissionBundle.mockResolvedValue({
      preview: { payloadDigest: "b".repeat(64), textPayload: "Newer work" },
    });

    await expect(submitToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      confirmed: true,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      payloadDigest: "a".repeat(64),
    })).resolves.toEqual({
      ok: false,
      error: "Your work changed after this review opened. Refresh the review before sending.",
    });
    expect(mocks.claimSubmissionReceipt).not.toHaveBeenCalled();
    expect(mocks.submitCanvasText).not.toHaveBeenCalled();
  });
});
