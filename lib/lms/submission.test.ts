import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canReleaseCanvasTextReceiptAfterRejection,
  canReleaseProviderArtifactLock,
  claimSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  ProviderSubmissionError,
  providerArtifactFailureResponse,
  providerArtifactRiskResponse,
  providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus,
  submissionCapabilities,
  submitCanvasFile,
  submitCanvasText,
  submitGoogleClassroomFile,
} from "./submission";
import {
  bindSubmissionProviderArtifact,
  createSubmissionReconciliationRecord,
  providerSubmissionObservationResponse,
  submissionReconciliationProviderResponse,
} from "./reconciliation";
import { sha256Hex } from "@/lib/security/submission-file-integrity";

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response;
}

function submissionFile(name = "answer.pdf") {
  const bytes = new Uint8Array(Buffer.from("%PDF-1.7\nanswer\n%%EOF", "utf8"));
  return {
    name,
    mimeType: "application/pdf",
    bytes,
    byteSize: bytes.byteLength,
    sha256Digest: sha256Hex(bytes),
    storageVersion: "11111111-1111-4111-8111-111111111111",
  };
}

const canvasDestination = {
  institutionId: "school",
  baseUrl: "https://93.184.216.34",
};

const originalCanvasInstitutions = process.env.CANVAS_INSTITUTIONS_JSON;

afterAll(() => {
  if (originalCanvasInstitutions === undefined) delete process.env.CANVAS_INSTITUTIONS_JSON;
  else process.env.CANVAS_INSTITUTIONS_JSON = originalCanvasInstitutions;
});

describe("submissionCapabilities", () => {
  it("uses Canvas assignment submission types instead of provider-wide assumptions", () => {
    const capabilities = submissionCapabilities("canvas", {
      provider: "canvas",
      data: {
        submissionTypes: ["online_upload"],
        canSubmit: true,
        lockedForUser: false,
        allowedExtensions: ["pdf", "docx"],
      },
    });

    expect(capabilities.capabilities).toEqual(["open_external", "upload_file"]);
    expect(capabilities.allowedExtensions).toEqual(["pdf", "docx"]);
  });

  it("resolves accepted, pending, and absent provider states deterministically", () => {
    expect(resolveProviderSubmissionStatus({
      provider: "canvas",
      capabilities: ["open_external"],
      note: "",
      allowedExtensions: [],
      providerSubmissionId: "canvas-submission-1",
      providerState: "submitted",
    })).toMatchObject({ status: "submitted", providerReceiptId: "canvas-submission-1" });

    expect(resolveProviderSubmissionStatus({
      provider: "google_classroom",
      capabilities: ["open_external"],
      note: "",
      allowedExtensions: [],
      providerSubmissionId: "google-submission-1",
      providerState: "CREATED",
    })).toMatchObject({ status: "confirmation_pending" });

    expect(resolveProviderSubmissionStatus({
      provider: "google_classroom",
      capabilities: ["open_external", "upload_file"],
      note: "",
      allowedExtensions: [],
      providerSubmissionId: "google-submission-returned",
      providerState: "RETURNED",
      providerCanSubmit: true,
    })).toMatchObject({
      status: "confirmation_pending",
      providerReceiptId: "google-submission-returned",
    });

    expect(resolveProviderSubmissionStatus({
      provider: "google_classroom",
      capabilities: ["open_external"],
      note: "",
      allowedExtensions: [],
      providerSubmissionId: null,
      providerState: null,
    })).toMatchObject({ status: "not_accepted" });

    expect(resolveProviderSubmissionStatus({
      provider: "canvas",
      capabilities: ["open_external"],
      note: "Canvas is not accepting a new submission.",
      allowedExtensions: [],
      providerSubmissionId: null,
      providerState: "unsubmitted",
      providerCanSubmit: false,
      providerLocked: true,
    })).toMatchObject({ status: "not_accepted" });
  });

  it("does not allow Google direct submission when the assignment is not associated with Diana", () => {
    const capabilities = submissionCapabilities("google_classroom", {
      provider: "google_classroom",
      data: {
        courseWorkType: "ASSIGNMENT",
        associatedWithDeveloper: false,
        submissionId: "submission-1",
        submissionState: "CREATED",
      },
    });

    expect(capabilities.capabilities).toEqual(["open_external"]);
    expect(capabilities.note).toContain("submitted in Google Classroom");
  });
});

describe("Canvas submission", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.CANVAS_INSTITUTIONS_JSON = JSON.stringify({
      school: canvasDestination.baseUrl,
    });
    delete process.env.CANVAS_ALLOWED_ORIGINS;
  });

  it("reads can_submit and submission_types for the specific assignment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      submission_types: ["online_text_entry"],
      can_submit: true,
      locked_for_user: false,
      submission: {
        id: 17,
        workflow_state: "submitted",
        attempt: 2,
        submitted_at: "2026-09-01T18:00:00Z",
        attachments: [{ id: 91 }],
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectCanvasSubmission({
      ...canvasDestination,
      token: "token",
      courseId: "course 1",
      assignmentId: "assignment 1",
    });

    expect(result.capabilities).toEqual(["open_external", "submit_text"]);
    expect(result.reconciliationObservation).toEqual({
      provider: "canvas",
      submissionId: "17",
      state: "submitted",
      attempt: 2,
      submittedAt: "2026-09-01T18:00:00Z",
      attachmentIds: ["91"],
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("include[]=can_submit");
  });

  it("uses Canvas's online_text_entry submission type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 42, workflow_state: "submitted" }));
    vi.stubGlobal("fetch", fetchMock);

    await submitCanvasText({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      text: "Finished response",
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain("submission%5Bsubmission_type%5D=online_text_entry");
  });

  it("uploads and submits an integrity-bound file through Canvas", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockResolvedValueOnce(response({ id: 91 }))
      .mockResolvedValueOnce(response({ id: 42, workflow_state: "submitted" }));
    vi.stubGlobal("fetch", fetchMock);
    const onArtifactPrepared = vi.fn(async () => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const result = await submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
      onArtifactPrepared,
    });

    expect(result).toEqual({ id: 42, workflow_state: "submitted" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer token",
    });
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
    expect(String(fetchMock.mock.calls[2][1]?.body)).toContain("online_upload");
    expect(onArtifactPrepared).toHaveBeenCalledWith({
      provider: "canvas",
      providerArtifactId: "91",
    });
  });

  it("recovers a lost Canvas upload response from exact provider inventory", async () => {
    const providerFilename = "diana-receipt-canvas.pdf";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockRejectedValueOnce(new TypeError("socket closed after upload"))
      .mockResolvedValueOnce(response([{ id: 91, filename: providerFilename }]))
      .mockResolvedValueOnce(response({ id: 42, workflow_state: "submitted" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
      artifactOperationId: "receipt-canvas",
    })).resolves.toEqual({ id: 42, workflow_state: "submitted" });
    expect(String(fetchMock.mock.calls[2][0])).toContain("/api/v1/users/self/files?");
    expect(String(fetchMock.mock.calls[3][1]?.body)).toContain("91");
  });

  it("returns scrubbed Canvas inventory when a lost upload cannot be reconciled", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockRejectedValueOnce(new TypeError("socket closed after upload"))
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitCanvasFile({
      ...canvasDestination,
      token: "secret-token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
      artifactOperationId: "receipt-canvas",
    }).catch((caught) => caught);
    expect(error).toMatchObject({
      outcome: "ambiguous",
      providerArtifactInventory: {
        operationId: "receipt-canvas",
        lookup: "canvas_user_files_exact_name",
      },
    });
    const failure = providerArtifactFailureResponse(error, {
      provider: "canvas",
      operationId: "receipt-canvas",
    });
    expect(failure).toMatchObject({
      diana_provider_artifact_inventory: {
        provider: "canvas",
        operation_id: "receipt-canvas",
        provider_filename: "diana-receipt-canvas.pdf",
      },
    });
    expect(JSON.stringify(failure)).not.toContain("secret-token");
  });

  it("keeps Canvas confirmation pending and does not submit when provider artifact binding cannot be saved", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockResolvedValueOnce(response({ id: 91 }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
      onArtifactPrepared: async () => {
        throw new Error("receipt unavailable");
      },
    }).catch((caught) => caught);

    expect(error).toMatchObject({ outcome: "ambiguous" });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the duplicate lock after Canvas creates a file and rejects the later submission call", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockResolvedValueOnce(response({ id: 91 }))
      .mockResolvedValueOnce(response({}, false, 422));
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
      onArtifactPrepared: vi.fn(async () => undefined),
    }).catch((caught) => caught);

    expect(error).toMatchObject({
      outcome: "ambiguous",
      providerArtifactRisk: {
        provider: "canvas",
        state: "created",
        providerArtifactId: "91",
      },
    });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    "https://127.0.0.1/upload",
    "https://10.20.30.40/upload",
    "https://192.168.1.10/upload",
  ])("rejects a non-public provider upload target before forwarding bytes: %s", async (uploadUrl) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({
      upload_url: uploadUrl,
      upload_params: { token: "upload-token" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitCanvasFile({
      ...canvasDestination,
      token: "canvas-bearer",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
    })).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks a provider upload redirect without following it or leaking the Canvas bearer", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        upload_url: "https://93.184.216.35/file",
        upload_params: { token: "upload-token" },
      }))
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://93.184.216.36/collect" },
      }))
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitCanvasFile({
      ...canvasDestination,
      token: "canvas-bearer",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
    })).rejects.toMatchObject({
      outcome: "ambiguous",
      providerArtifactInventory: { lookup: "canvas_user_files_exact_name" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[1][1] as RequestInit).redirect).toBe("manual");
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
  });

  it.each([
    ["lost response", new TypeError("socket closed")],
    ["timeout", new DOMException("timed out", "AbortError")],
    ["provider 5xx", response({}, false, 503)],
  ])("classifies a Canvas side-effect %s as confirmation pending", async (_label, failure) => {
    const fetchMock = vi.fn();
    if (typeof failure === "object" && failure !== null && "status" in failure) {
      fetchMock.mockResolvedValue(failure);
    } else {
      fetchMock.mockRejectedValue(failure);
    }
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitCanvasText({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      text: "Finished response",
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ProviderSubmissionError);
    expect(error).toMatchObject({ outcome: "ambiguous" });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
  });

  it("reserves not accepted for a definitive provider 4xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false, 422)));

    const error = await submitCanvasText({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      text: "Finished response",
    }).catch((caught) => caught);

    expect(error).toMatchObject({ outcome: "definite_rejection" });
    expect(providerSubmissionReceiptStatus(error)).toBe("not_accepted");
  });

  it.each([408, 409, 429])("keeps Canvas text HTTP %s confirmation pending", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false, status)));

    const error = await submitCanvasText({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      text: "Finished response",
    }).catch((caught) => caught);

    expect(error).toMatchObject({ outcome: "ambiguous" });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
  });

  it("releases a definitive Canvas text rejection only after an unchanged provider readback", () => {
    const baseline = {
      provider: "canvas" as const,
      submissionId: "submission-1",
      state: "unsubmitted",
      attempt: 0,
      submittedAt: null,
      attachmentIds: [],
    };

    expect(canReleaseCanvasTextReceiptAfterRejection(baseline, baseline)).toBe(true);
    expect(canReleaseCanvasTextReceiptAfterRejection(baseline, null)).toBe(false);
    expect(canReleaseCanvasTextReceiptAfterRejection(baseline, {
      ...baseline,
      state: "submitted",
      attempt: 1,
    })).toBe(false);
  });

  it("keeps a potentially post-commit Canvas 4xx locked when readback changed or is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false, 422)));
    const baseline = {
      provider: "canvas" as const,
      submissionId: "submission-1",
      state: "unsubmitted",
      attempt: 0,
      submittedAt: null,
      attachmentIds: [],
    };

    const error = await submitCanvasText({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      text: "Finished response",
    }).catch((caught) => caught);

    expect(providerSubmissionReceiptStatus(error)).toBe("not_accepted");
    expect(canReleaseCanvasTextReceiptAfterRejection(baseline, null)).toBe(false);
    expect(canReleaseCanvasTextReceiptAfterRejection(baseline, {
      ...baseline,
      state: "submitted",
      attempt: 1,
    })).toBe(false);
  });

  it("does not contact Canvas when the in-memory bytes do not match the bound digest", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = submissionFile();
    file.bytes = new Uint8Array(Buffer.from("%PDF-1.7\ntampered\n%%EOF", "utf8"));

    await expect(submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file,
    })).rejects.toThrow("changed after it was attached");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Google Classroom file submission", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("reads the exact Classroom state and attached Drive file identifiers", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({
      studentSubmissions: [{
        id: "submission-1",
        state: "RETURNED",
        courseWorkType: "ASSIGNMENT",
        associatedWithDeveloper: true,
        assignmentSubmission: {
          attachments: [{ driveFile: { id: "drive-file-old" } }],
        },
      }],
    })));

    const result = await inspectGoogleClassroomSubmission({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
    });

    expect(result.reconciliationObservation).toEqual({
      provider: "google_classroom",
      submissionId: "submission-1",
      state: "RETURNED",
      attachmentIds: ["drive-file-old"],
    });
    expect(resolveProviderSubmissionStatus(result).status).toBe("confirmation_pending");
  });

  it("stops before uploading or turning in when Diana cannot modify the assignment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      studentSubmissions: [{
        id: "submission-1",
        state: "CREATED",
        courseWorkType: "ASSIGNMENT",
        associatedWithDeveloper: false,
      }],
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
    })).rejects.toThrow("submitted in Google Classroom");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("studentSubmissions");
  });

  it("attaches the uploaded Diana file before calling turnIn", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        studentSubmissions: [{
          id: "submission-1",
          state: "CREATED",
          courseWorkType: "ASSIGNMENT",
          associatedWithDeveloper: true,
        }],
      }))
      .mockResolvedValueOnce(response({ id: "drive-file-1" }))
      .mockResolvedValueOnce(response({ id: "submission-1" }))
      .mockResolvedValueOnce(response({}));
    vi.stubGlobal("fetch", fetchMock);
    const onArtifactPrepared = vi.fn(async () => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const result = await submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
      onArtifactPrepared,
    });

    expect(result).toEqual({ id: "submission-1", driveFileId: "drive-file-1" });
    expect(String(fetchMock.mock.calls[2][0])).toContain(":modifyAttachments");
    expect(String(fetchMock.mock.calls[3][0])).toContain(":turnIn");
    expect(onArtifactPrepared).toHaveBeenCalledWith({
      provider: "google_classroom",
      providerArtifactId: "drive-file-1",
    });
  });

  it("recovers a lost Drive upload response through its operation app property", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        studentSubmissions: [{
          id: "submission-1",
          state: "CREATED",
          courseWorkType: "ASSIGNMENT",
          associatedWithDeveloper: true,
        }],
      }))
      .mockRejectedValueOnce(new TypeError("socket closed after upload"))
      .mockResolvedValueOnce(response({
        files: [{
          id: "drive-file-1",
          name: "diana-receipt-google.pdf",
          appProperties: { dianaOperationId: "receipt-google" },
        }],
      }))
      .mockResolvedValueOnce(response({ id: "submission-1" }))
      .mockResolvedValueOnce(response({}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
      artifactOperationId: "receipt-google",
    })).resolves.toEqual({ id: "submission-1", driveFileId: "drive-file-1" });
    expect(String(fetchMock.mock.calls[2][0])).toContain("drive/v3/files?");
    expect(String(fetchMock.mock.calls[3][0])).toContain(":modifyAttachments");
  });

  it("keeps Drive confirmation pending and does not attach or turn in when provider artifact binding cannot be saved", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        studentSubmissions: [{
          id: "submission-1",
          state: "CREATED",
          courseWorkType: "ASSIGNMENT",
          associatedWithDeveloper: true,
        }],
      }))
      .mockResolvedValueOnce(response({ id: "drive-file-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
      onArtifactPrepared: async () => {
        throw new Error("receipt unavailable");
      },
    }).catch((caught) => caught);

    expect(error).toMatchObject({ outcome: "ambiguous" });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["lost turn-in response", new TypeError("connection reset")],
    ["turn-in 5xx", response({}, false, 502)],
  ])("classifies %s as an ambiguous provider outcome", async (_label, failure) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        studentSubmissions: [{
          id: "submission-1",
          state: "CREATED",
          courseWorkType: "ASSIGNMENT",
          associatedWithDeveloper: true,
        }],
      }))
      .mockResolvedValueOnce(response({ id: "drive-file-1" }))
      .mockResolvedValueOnce(response({ id: "submission-1" }));
    if (typeof failure === "object" && failure !== null && "status" in failure) {
      fetchMock.mockResolvedValueOnce(failure);
    } else {
      fetchMock.mockRejectedValueOnce(failure);
    }
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
    }).catch((caught) => caught);

    expect(error).toMatchObject({ outcome: "ambiguous" });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
  });

  it.each([
    ["attachment", response({}, false, 409), null],
    ["turn-in", response({ id: "submission-1" }), response({}, false, 403)],
  ])("keeps the duplicate lock after Drive creation and a later %s 4xx", async (
    _stage,
    attachmentResponse,
    turnInResponse,
  ) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        studentSubmissions: [{
          id: "submission-1",
          state: "CREATED",
          courseWorkType: "ASSIGNMENT",
          associatedWithDeveloper: true,
        }],
      }))
      .mockResolvedValueOnce(response({ id: "drive-file-1" }))
      .mockResolvedValueOnce(attachmentResponse);
    if (turnInResponse) fetchMock.mockResolvedValueOnce(turnInResponse);
    vi.stubGlobal("fetch", fetchMock);

    const error = await submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
      onArtifactPrepared: vi.fn(async () => undefined),
    }).catch((caught) => caught);

    expect(error).toMatchObject({
      outcome: "ambiguous",
      providerArtifactRisk: {
        provider: "google_classroom",
        state: "created",
        providerArtifactId: "drive-file-1",
      },
    });
    expect(providerSubmissionReceiptStatus(error)).toBe("confirmation_pending");
  });

});

describe("submission receipts", () => {
  it("passes the idempotency key to the atomic receipt claim", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { receipt_id: "receipt-1", status: "prepared", claimed: true, detail: null },
      error: null,
    });

    const claim = await claimSubmissionReceipt({ rpc }, {
      assignmentId: "11111111-1111-4111-8111-111111111111",
      provider: "canvas",
      capability: "upload_file",
      idempotencyKey: "22222222-2222-4222-8222-222222222222",
      submissionFileId: "33333333-3333-4333-8333-333333333333",
    });

    expect(claim).toMatchObject({ receiptId: "receipt-1", status: "prepared", claimed: true });
    expect(rpc).toHaveBeenCalledWith("claim_assignment_submission", expect.objectContaining({
      p_idempotency_key: "22222222-2222-4222-8222-222222222222",
      p_submission_file_id: "33333333-3333-4333-8333-333333333333",
    }));
  });

  it("settles a receipt through the atomic reconciliation RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        receipt_id: "receipt-1",
        status: "submitted",
        transitioned: true,
        detail: "Canvas shows this assignment as submitted.",
      },
      error: null,
    });

    const result = await reconcileSubmissionReceipt({ rpc }, {
      receiptId: "receipt-1",
      status: "submitted",
      providerReceiptId: "provider-receipt-1",
      detail: "Canvas shows this assignment as submitted.",
      providerResponse: { provider_state: "submitted" },
    });

    expect(result).toMatchObject({ status: "submitted", transitioned: true });
    expect(rpc).toHaveBeenCalledWith("reconcile_assignment_submission_receipt", {
      p_receipt_id: "receipt-1",
      p_status: "submitted",
      p_provider_receipt_id: "provider-receipt-1",
      p_detail: "Canvas shows this assignment as submitted.",
      p_provider_response: { provider_state: "submitted" },
    });
  });

  it("does not accept a provider observation when the uncertain receipt has no baseline", async () => {
    const rpc = vi.fn(async (_functionName: string, args: Record<string, unknown>) => ({
      data: {
        receipt_id: "receipt-1",
        status: args.p_status,
        transitioned: false,
        detail: args.p_detail,
      },
      error: null,
    }));
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: { provider_response: {}, submission_file_id: null },
        error: null,
      })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    const result = await reconcileSubmissionReceipt({ rpc, from: vi.fn(() => query) }, {
      receiptId: "receipt-1",
      status: "submitted",
      providerReceiptId: "canvas-submission-1",
      detail: "Canvas shows a submitted state.",
      providerResponse: {
        provider_state: "submitted",
        ...providerSubmissionObservationResponse({
          provider: "canvas",
          submissionId: "canvas-submission-1",
          state: "submitted",
          attempt: 1,
          submittedAt: "2026-09-01T18:05:00Z",
          attachmentIds: ["canvas-file-new"],
        }),
      },
    });

    expect(result.status).toBe("confirmation_pending");
    expect(rpc).toHaveBeenCalledWith("reconcile_assignment_submission_receipt", expect.objectContaining({
      p_status: "confirmation_pending",
      p_provider_receipt_id: null,
    }));
  });

  it("keeps an older Canvas submission pending instead of accepting it for an ambiguous receipt", async () => {
    const baseline = {
      provider: "canvas" as const,
      submissionId: "canvas-submission-1",
      state: "submitted",
      attempt: 4,
      submittedAt: "2026-09-01T18:00:00Z",
      attachmentIds: ["canvas-file-old"],
    };
    const record = bindSubmissionProviderArtifact(createSubmissionReconciliationRecord({
      baseline,
      localFileId: "file-1",
      payloadDigest: "a".repeat(64),
      sha256Digest: "b".repeat(64),
    }), "canvas-file-new");
    const rpc = vi.fn(async (_functionName: string, args: Record<string, unknown>) => ({
      data: {
        receipt_id: "receipt-1",
        status: args.p_status,
        transitioned: false,
        detail: args.p_detail,
      },
      error: null,
    }));
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: {
          provider_response: submissionReconciliationProviderResponse(record),
          submission_file_id: "file-1",
        },
        error: null,
      })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    const result = await reconcileSubmissionReceipt({ rpc, from: vi.fn(() => query) }, {
      receiptId: "receipt-1",
      status: "submitted",
      providerReceiptId: "canvas-submission-1",
      detail: "Canvas shows a submitted state.",
      providerResponse: {
        provider_state: "submitted",
        ...providerSubmissionObservationResponse(baseline),
      },
    });

    expect(result.status).toBe("confirmation_pending");
    expect(rpc).toHaveBeenCalledWith("reconcile_assignment_submission_receipt", expect.objectContaining({
      p_status: "confirmation_pending",
      p_provider_receipt_id: null,
    }));
  });

  it("does not release a pending receipt when the exact provider artifact lacks cleanup evidence", async () => {
    const baseline = {
      provider: "canvas" as const,
      submissionId: "canvas-submission-1",
      state: "unsubmitted",
      attempt: 0,
      submittedAt: null,
      attachmentIds: [],
    };
    const record = bindSubmissionProviderArtifact(createSubmissionReconciliationRecord({
      baseline,
      localFileId: "file-1",
      payloadDigest: "a".repeat(64),
      sha256Digest: "b".repeat(64),
    }), "canvas-file-1");
    const storedProviderResponse = {
      ...submissionReconciliationProviderResponse(record),
      ...providerArtifactRiskResponse({
        provider: "canvas",
        operationId: "receipt-1",
        providerArtifactId: "canvas-file-1",
      }),
    };
    const providerResponse = providerSubmissionObservationResponse({
      ...baseline,
      state: "unsubmitted",
      attachmentIds: [],
    });
    expect(canReleaseProviderArtifactLock(storedProviderResponse, providerResponse)).toBe(false);
    expect(canReleaseProviderArtifactLock(storedProviderResponse, {
      diana_provider_artifact_resolution: {
        provider: "canvas",
        operation_id: "receipt-1",
        provider_artifact_id: "canvas-file-1",
        disposition: "deleted",
        verification: "provider_delete",
      },
    })).toBe(true);

    const rpc = vi.fn(async (_functionName: string, args: Record<string, unknown>) => ({
      data: {
        receipt_id: "receipt-1",
        status: args.p_status,
        transitioned: false,
        detail: args.p_detail,
      },
      error: null,
    }));
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: {
          provider_response: storedProviderResponse,
          submission_file_id: "file-1",
        },
        error: null,
      })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    const result = await reconcileSubmissionReceipt({ rpc, from: vi.fn(() => query) }, {
      receiptId: "receipt-1",
      status: "not_accepted",
      providerReceiptId: null,
      detail: "Canvas does not show a completed submission.",
      providerResponse,
    });

    expect(result.status).toBe("confirmation_pending");
    expect(rpc).toHaveBeenCalledWith(
      "reconcile_assignment_submission_receipt",
      expect.objectContaining({
        p_status: "confirmation_pending",
        p_provider_receipt_id: null,
      }),
    );
  });

  it("settles Canvas only when the receipt proves the exact next attempt and uploaded file", async () => {
    const baseline = {
      provider: "canvas" as const,
      submissionId: "canvas-submission-1",
      state: "submitted",
      attempt: 4,
      submittedAt: "2026-09-01T18:00:00Z",
      attachmentIds: ["canvas-file-old"],
    };
    const record = bindSubmissionProviderArtifact(createSubmissionReconciliationRecord({
      baseline,
      localFileId: "file-1",
      payloadDigest: "a".repeat(64),
      sha256Digest: "b".repeat(64),
    }), "canvas-file-new");
    const rpc = vi.fn(async (_functionName: string, args: Record<string, unknown>) => ({
      data: {
        receipt_id: "receipt-1",
        status: args.p_status,
        transitioned: true,
        detail: args.p_detail,
      },
      error: null,
    }));
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: {
          provider_response: submissionReconciliationProviderResponse(record),
          submission_file_id: "file-1",
        },
        error: null,
      })),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    const result = await reconcileSubmissionReceipt({ rpc, from: vi.fn(() => query) }, {
      receiptId: "receipt-1",
      status: "submitted",
      providerReceiptId: "canvas-submission-1",
      detail: "Canvas shows a submitted state.",
      providerResponse: {
        provider_state: "submitted",
        ...providerSubmissionObservationResponse({
          ...baseline,
          attempt: 5,
          submittedAt: "2026-09-01T18:05:00Z",
          attachmentIds: ["canvas-file-new"],
        }),
      },
    });

    expect(result).toMatchObject({ status: "submitted", transitioned: true });
    expect(rpc).toHaveBeenCalledWith("reconcile_assignment_submission_receipt", expect.objectContaining({
      p_status: "submitted",
      p_provider_receipt_id: "canvas-submission-1",
    }));
  });
});
