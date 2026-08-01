import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getValidGoogleToken: vi.fn(),
  getValidCanvasToken: vi.fn(),
  hydrateLmsConnectionCredentials: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  inspectGoogleClassroomSubmission: vi.fn(),
  submitCanvasText: vi.fn(),
  completeSubmissionReceipt: vi.fn(),
  submitGoogleClassroomFile: vi.fn(),
  claimSubmissionReceipt: vi.fn(),
  reconcileSubmissionReceipt: vi.fn(),
  recordStudentStateSnapshot: vi.fn(),
  resolveProviderSubmissionStatus: vi.fn(),
  updateSubmissionReceiptStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/lms/canvas", () => ({ getValidCanvasToken: mocks.getValidCanvasToken }));
vi.mock("@/lib/lms/google", () => ({ getValidGoogleToken: mocks.getValidGoogleToken }));
vi.mock("@/lib/integrations/credential-vault", () => ({
  hydrateLmsConnectionCredentials: mocks.hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh: vi.fn(),
}));
vi.mock("@/lib/lms/submission", () => ({
  claimSubmissionReceipt: mocks.claimSubmissionReceipt,
  completeSubmissionReceipt: mocks.completeSubmissionReceipt,
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

import { checkConnectedProviderSubmissionStatus, submitToConnectedProvider } from "./actions";

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
    mocks.hydrateLmsConnectionCredentials.mockImplementation(async (_ownerId, connection) => connection);
    mocks.recordStudentStateSnapshot.mockResolvedValue(undefined);
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
    };
    mocks.inspectGoogleClassroomSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "submitted",
      detail: "Google Classroom shows this assignment as submitted.",
      providerReceiptId: "student-submission-1",
      providerResponse: { provider_state: "TURNED_IN" },
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
    };
    mocks.inspectCanvasSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "confirmation_pending",
      detail: "Canvas does not show a completed submission yet. You can check again.",
      providerReceiptId: "submission-1",
      providerResponse: { provider_state: "unsubmitted" },
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
    expect(mocks.reconcileSubmissionReceipt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
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
    };
    mocks.inspectGoogleClassroomSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "not_accepted",
      detail: "Google Classroom does not show a submission Diana can confirm.",
      providerReceiptId: null,
      providerResponse: { provider_state: null },
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
    };
    mocks.inspectCanvasSubmission.mockResolvedValue(inspection);
    mocks.resolveProviderSubmissionStatus.mockReturnValue({
      status: "submitted",
      detail: "Canvas shows this assignment as submitted.",
      providerReceiptId: "submission-1",
      providerResponse: { provider_state: "submitted" },
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
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from: vi.fn((table: string) => ({
        assignments: assignment,
        assignment_problems: problems,
        artifact_blocks: artifactBlocks,
        classes: classLink,
        lms_connections: connection,
      })[table]),
    });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "valid-token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({
      provider: "canvas",
      capabilities: ["open_external", "submit_text"],
      note: "Text is supported.",
      allowedExtensions: [],
      providerSubmissionId: null,
      providerState: null,
    });
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
    mocks.submitCanvasText.mockResolvedValue({ id: 42, workflow_state: "submitted" });
    mocks.completeSubmissionReceipt.mockResolvedValue(undefined);

    const result = await submitToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      confirmed: true,
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
    });

    expect(result).toMatchObject({ ok: true, receiptStatus: "submitted" });
    const payload = mocks.submitCanvasText.mock.calls[0][0];
    expect(payload.text).toContain("Rhetorical analysis");
    expect(payload.text).toContain("Thesis or main claim\nThe author builds trust through evidence.");
    expect(payload.text).toContain("Your draft\nThis is the student's draft.");
    expect(payload.text).not.toMatch(/scaffold|internal coaching|staleinternalfield|do not submit|canvas_text/iu);
  });
});
