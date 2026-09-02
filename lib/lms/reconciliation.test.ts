import { describe, expect, it } from "vitest";
import {
  bindSubmissionProviderArtifact,
  createSubmissionReconciliationRecord,
  createSubmissionTextReconciliationRecord,
  planRemovedAssignmentReconciliation,
  providerSubmissionObservationResponse,
  readProviderSubmissionObservation,
  readSubmissionReconciliationRecord,
  reconcileBoundProviderSubmission,
  submissionReconciliationProviderResponse,
  type CanvasSubmissionObservation,
  type GoogleSubmissionObservation,
} from "./reconciliation";

const localFileId = "33333333-3333-4333-8333-333333333333";

function canvasRecord() {
  const baseline: CanvasSubmissionObservation = {
    provider: "canvas",
    submissionId: "canvas-submission-1",
    state: "submitted",
    attempt: 4,
    submittedAt: "2026-09-01T18:00:00Z",
    attachmentIds: ["canvas-file-old"],
  };
  return bindSubmissionProviderArtifact(createSubmissionReconciliationRecord({
    baseline,
    localFileId,
    payloadDigest: "a".repeat(64),
    sha256Digest: "b".repeat(64),
  }), "canvas-file-new");
}

function googleRecord(state = "CREATED") {
  const baseline: GoogleSubmissionObservation = {
    provider: "google_classroom",
    submissionId: "google-submission-1",
    state,
    attachmentIds: ["drive-file-old"],
  };
  return bindSubmissionProviderArtifact(createSubmissionReconciliationRecord({
    baseline,
    localFileId,
    payloadDigest: "a".repeat(64),
    sha256Digest: "b".repeat(64),
  }), "drive-file-new");
}

describe("provider submission reconciliation", () => {
  it("does not accept the Canvas submission that already existed at the attempt baseline", () => {
    const result = reconcileBoundProviderSubmission({
      record: canvasRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "submitted",
        attempt: 4,
        submittedAt: "2026-09-01T18:00:00Z",
        attachmentIds: ["canvas-file-old"],
      },
    });

    expect(result).toMatchObject({ status: "confirmation_pending", verified: false });
  });

  it("requires the exact next Canvas attempt and exact uploaded artifact", () => {
    const wrongArtifact = reconcileBoundProviderSubmission({
      record: canvasRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "submitted",
        attempt: 5,
        submittedAt: "2026-09-01T18:05:00Z",
        attachmentIds: ["different-file"],
      },
    });
    const skippedAttempt = reconcileBoundProviderSubmission({
      record: canvasRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "submitted",
        attempt: 6,
        submittedAt: "2026-09-01T18:10:00Z",
        attachmentIds: ["canvas-file-new"],
      },
    });
    const exact = reconcileBoundProviderSubmission({
      record: canvasRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "submitted",
        attempt: 5,
        submittedAt: "2026-09-01T18:05:00Z",
        attachmentIds: ["canvas-file-new"],
      },
    });

    expect(wrongArtifact.status).toBe("confirmation_pending");
    expect(skippedAttempt.status).toBe("confirmation_pending");
    expect(exact).toMatchObject({ status: "submitted", verified: true });
  });

  it("keeps Google RETURNED pending and requires the exact file in TURNED_IN", () => {
    const returned = reconcileBoundProviderSubmission({
      record: googleRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "google_classroom",
        submissionId: "google-submission-1",
        state: "RETURNED",
        attachmentIds: ["drive-file-new"],
      },
    });
    const wrongArtifact = reconcileBoundProviderSubmission({
      record: googleRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "google_classroom",
        submissionId: "google-submission-1",
        state: "TURNED_IN",
        attachmentIds: ["drive-file-old"],
      },
    });
    const exact = reconcileBoundProviderSubmission({
      record: googleRecord(),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "google_classroom",
        submissionId: "google-submission-1",
        state: "TURNED_IN",
        attachmentIds: ["drive-file-new"],
      },
    });

    expect(returned).toMatchObject({ status: "confirmation_pending", verified: false });
    expect(wrongArtifact.status).toBe("confirmation_pending");
    expect(exact).toMatchObject({ status: "submitted", verified: true });
  });

  it("does not treat an already turned-in Google baseline as this attempt", () => {
    const result = reconcileBoundProviderSubmission({
      record: googleRecord("TURNED_IN"),
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "google_classroom",
        submissionId: "google-submission-1",
        state: "TURNED_IN",
        attachmentIds: ["drive-file-new"],
      },
    });

    expect(result.status).toBe("confirmation_pending");
  });

  it("round-trips only structured receipt evidence and provider observations", () => {
    const record = canvasRecord();
    const observation = record.baseline;

    expect(readSubmissionReconciliationRecord(
      submissionReconciliationProviderResponse(record),
    )).toEqual(record);
    expect(readProviderSubmissionObservation(
      providerSubmissionObservationResponse(observation),
    )).toEqual(observation);
    expect(readSubmissionReconciliationRecord({
      diana_submission_reconciliation: { ...record, version: 2 },
    })).toBeNull();
  });

  it("requires the exact next Canvas attempt for a text submission", () => {
    const baseline: CanvasSubmissionObservation = {
      provider: "canvas",
      submissionId: "canvas-submission-1",
      state: "unsubmitted",
      attempt: 2,
      submittedAt: null,
      attachmentIds: [],
    };
    const record = createSubmissionTextReconciliationRecord({
      baseline,
      payloadDigest: "c".repeat(64),
    });

    const sameAttempt = reconcileBoundProviderSubmission({
      record,
      receiptSubmissionFileId: null,
      current: { ...baseline, state: "submitted" },
    });
    const exact = reconcileBoundProviderSubmission({
      record,
      receiptSubmissionFileId: null,
      current: {
        ...baseline,
        state: "submitted",
        attempt: 3,
        submittedAt: "2026-09-01T18:05:00Z",
      },
    });

    expect(sameAttempt).toMatchObject({ status: "confirmation_pending", verified: false });
    expect(exact).toMatchObject({ status: "submitted", verified: true });
    expect(readSubmissionReconciliationRecord(
      submissionReconciliationProviderResponse(record),
    )).toEqual(record);
  });

  it("does not accept text reconciliation for a file-backed receipt", () => {
    const record = createSubmissionTextReconciliationRecord({
      baseline: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "unsubmitted",
        attempt: 1,
        submittedAt: null,
        attachmentIds: [],
      },
      payloadDigest: "d".repeat(64),
    });

    const result = reconcileBoundProviderSubmission({
      record,
      receiptSubmissionFileId: localFileId,
      current: {
        provider: "canvas",
        submissionId: "canvas-submission-1",
        state: "submitted",
        attempt: 2,
        submittedAt: "2026-09-01T18:05:00Z",
        attachmentIds: [],
      },
    });

    expect(result).toMatchObject({ status: "confirmation_pending", verified: false });
  });
});

describe("removed LMS assignment reconciliation", () => {
  it("preserves every local assignment missing from a complete provider snapshot", () => {
    const plan = planRemovedAssignmentReconciliation({
      provider: "canvas",
      existing: [
        { id: "assignment-kept", external_id: "canvas-1" },
        { id: "assignment-missing", external_id: "canvas-2" },
      ],
      incomingExternalIds: ["canvas-1"],
      snapshot: "complete",
    });

    expect(plan.removed).toEqual([{
      assignmentId: "assignment-missing",
      externalId: "canvas-2",
      provider: "canvas",
      providerState: "not_in_snapshot",
      disposition: "preserve_local_assignment",
      preserveStudentWork: true,
      deleteAssignment: false,
    }]);
    expect(plan.summary).toEqual({ providerMissing: 1, preserved: 1, deleted: 0 });
  });

  it("does not infer removal from a partial snapshot", () => {
    const plan = planRemovedAssignmentReconciliation({
      provider: "google_classroom",
      existing: [{ id: "assignment-1", external_id: "course:work" }],
      incomingExternalIds: [],
      snapshot: "partial",
    });

    expect(plan.removed).toEqual([]);
    expect(plan.summary.deleted).toBe(0);
  });

  it("never emits a destructive reconciliation action", () => {
    const plan = planRemovedAssignmentReconciliation({
      provider: "canvas",
      existing: [
        { id: "assignment-1", external_id: "1" },
        { id: "assignment-2", external_id: "2" },
      ],
      incomingExternalIds: [],
      snapshot: "complete",
    });

    expect(plan.removed.every((item) => item.preserveStudentWork && !item.deleteAssignment)).toBe(true);
    expect(plan.summary).toMatchObject({ preserved: 2, deleted: 0 });
  });
});
