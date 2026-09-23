import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  claimSubmissionReceipt,
  inspectCanvasSubmission,
  ProviderSubmissionError,
  providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus,
  submissionCapabilities,
  submitCanvasFile,
  submitCanvasText,
  submitGoogleClassroomFile,
} from "./submission";
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
      submission: { workflow_state: "unsubmitted" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectCanvasSubmission({
      ...canvasDestination,
      token: "token",
      courseId: "course 1",
      assignmentId: "assignment 1",
    });

    expect(result.capabilities).toEqual(["open_external", "submit_text"]);
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

    const result = await submitCanvasFile({
      ...canvasDestination,
      token: "token",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
    });

    expect(result).toEqual({ id: 42, workflow_state: "submitted" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer token",
    });
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toBeUndefined();
    expect(String(fetchMock.mock.calls[2][1]?.body)).toContain("online_upload");
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
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitCanvasFile({
      ...canvasDestination,
      token: "canvas-bearer",
      courseId: "course",
      assignmentId: "assignment",
      file: submissionFile(),
    })).rejects.toThrow("Redirects are not allowed");

    expect(fetchMock).toHaveBeenCalledTimes(2);
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

    const result = await submitGoogleClassroomFile({
      token: "token",
      courseId: "course",
      courseWorkId: "work",
      file: submissionFile(),
    });

    expect(result).toEqual({ id: "submission-1", driveFileId: "drive-file-1" });
    expect(String(fetchMock.mock.calls[2][0])).toContain(":modifyAttachments");
    expect(String(fetchMock.mock.calls[3][0])).toContain(":turnIn");
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
});
