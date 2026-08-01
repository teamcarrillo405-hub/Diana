import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimSubmissionReceipt: vi.fn(),
  completeSubmissionReceipt: vi.fn(),
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  getValidCanvasToken: vi.fn(),
  getValidGoogleToken: vi.fn(),
  hydrateLmsConnectionCredentials: vi.fn(),
  inspectCanvasSubmission: vi.fn(),
  inspectGoogleClassroomSubmission: vi.fn(),
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
  completeSubmissionReceipt: mocks.completeSubmissionReceipt,
  inspectCanvasSubmission: mocks.inspectCanvasSubmission,
  inspectGoogleClassroomSubmission: mocks.inspectGoogleClassroomSubmission,
  providerSubmissionReceiptStatus: mocks.providerSubmissionReceiptStatus,
  submitCanvasFile: mocks.submitCanvasFile,
  submitGoogleClassroomFile: mocks.submitGoogleClassroomFile,
  updateSubmissionReceiptStatus: mocks.updateSubmissionReceiptStatus,
}));
vi.mock("@/lib/integrations/credential-vault", () => ({
  hydrateLmsConnectionCredentials: mocks.hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh: vi.fn(),
}));
vi.mock("@/lib/student-state/server", () => ({
  recordStudentStateSnapshot: vi.fn().mockResolvedValue(null),
}));

import { submitFileToConnectedProvider, uploadAssignmentDeliveryFile } from "./delivery-actions";

describe("delivery actions validation", () => {
  beforeEach(() => vi.clearAllMocks());

  function singleQuery(data: unknown) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    return query;
  }

  it("requires an idempotency key before loading provider credentials", async () => {
    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "22222222-2222-4222-8222-222222222222",
      confirmed: true,
      idempotencyKey: "not-a-uuid",
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
    const saved = singleQuery({ id: "file-1", filename: "finished.pdf" });
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
    mocks.hydrateLmsConnectionCredentials.mockResolvedValue({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({ capabilities: ["open_external", "upload_file"], allowedExtensions: ["pdf"], note: "Ready" });
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
    mocks.updateSubmissionReceiptStatus.mockResolvedValue(undefined);

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
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
      mocks.createServiceClient.mockReturnValue({
        storage: { from: vi.fn(() => ({ download: serviceDownload })) },
      });
      mocks.hydrateLmsConnectionCredentials.mockResolvedValue({ id: "connection-1", provider, config });
      mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "prepared", claimed: true, detail: null });
      mocks.completeSubmissionReceipt.mockResolvedValue(undefined);
      if (provider === "canvas") {
        mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
        mocks.inspectCanvasSubmission.mockResolvedValue({ capabilities: ["open_external", "upload_file"], allowedExtensions: ["pdf"], note: "Ready" });
        mocks.submitCanvasFile.mockResolvedValue({ id: 42, workflow_state: "submitted" });
      } else {
        mocks.getValidGoogleToken.mockResolvedValue({ token: "token" });
        mocks.inspectGoogleClassroomSubmission.mockResolvedValue({ capabilities: ["open_external", "upload_file"], allowedExtensions: [], note: "Ready" });
        mocks.submitGoogleClassroomFile.mockResolvedValue({ id: "submission-1", driveFileId: "drive-file-1" });
      }

      const result = await submitFileToConnectedProvider({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        fileId: "33333333-3333-4333-8333-333333333333",
        confirmed: true,
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
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
      }));
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
      sha256_digest: "a".repeat(64),
      integrity_status: "bound",
    });
    const classLink = singleQuery({ external_id: "canvas-course-1" });
    const connection = singleQuery({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } } }) },
      from: vi.fn((table: string) => ({ assignments: assignment, assignment_submission_files: delivery, classes: classLink, lms_connections: connection })[table]),
    });
    mocks.hydrateLmsConnectionCredentials.mockResolvedValue({ id: "connection-1", provider: "canvas", config: { institution_id: "school", base_url: "https://canvas.example", token: "token" } });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({ capabilities: ["open_external", "upload_file"], allowedExtensions: ["pdf"], note: "Ready" });
    mocks.claimSubmissionReceipt.mockResolvedValue({ receiptId: "receipt-1", status: "submitted", claimed: false, detail: null });

    const result = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
    });

    expect(result).toMatchObject({ ok: true, duplicate: true, receiptStatus: "submitted" });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.submitCanvasFile).not.toHaveBeenCalled();
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
    mocks.createServiceClient.mockReturnValue({
      storage: { from: vi.fn(() => ({ download: serviceDownload })) },
    });
    mocks.hydrateLmsConnectionCredentials.mockResolvedValue({ id: "connection-1", provider: "canvas", config });
    mocks.getValidCanvasToken.mockResolvedValue({ token: "token" });
    mocks.inspectCanvasSubmission.mockResolvedValue({ capabilities: ["open_external", "upload_file"], allowedExtensions: ["pdf"], note: "Ready" });
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
    });
    const replay = await submitFileToConnectedProvider({
      assignmentId: "11111111-1111-4111-8111-111111111111",
      fileId: "33333333-3333-4333-8333-333333333333",
      confirmed: true,
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
    });

    expect(first).toEqual({
      ok: false,
      receiptStatus: "confirmation_pending",
      error: message,
    });
    expect(replay).toMatchObject({ ok: false, receiptStatus: "confirmation_pending" });
    expect(mocks.updateSubmissionReceiptStatus).toHaveBeenCalledWith(expect.anything(), {
      receiptId: "receipt-1",
      status: "confirmation_pending",
      detail: message,
    });
    expect(mocks.claimSubmissionReceipt).toHaveBeenNthCalledWith(2, expect.anything(), expect.objectContaining({
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
    }));
    expect(mocks.submitCanvasFile).toHaveBeenCalledTimes(1);
    expect(serviceDownload).toHaveBeenCalledTimes(1);
    expect(mocks.completeSubmissionReceipt).not.toHaveBeenCalled();
  });

});
