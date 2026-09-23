// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  checkStatus: vi.fn(),
  getState: vi.fn(),
  markExternal: vi.fn(),
  submitText: vi.fn(),
  submitFile: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("./actions", () => ({
  checkConnectedProviderSubmissionStatus: mocks.checkStatus,
  getConnectedProviderSubmissionState: mocks.getState,
  markExternalSubmission: mocks.markExternal,
  submitToConnectedProvider: mocks.submitText,
}));
vi.mock("./delivery-actions", () => ({
  submitFileToConnectedProvider: mocks.submitFile,
  uploadAssignmentDeliveryFile: mocks.uploadFile,
}));

import { ExternalSubmissionSync } from "./external-submission-sync";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const googleCapabilities = {
  provider: "google_classroom" as const,
  capabilities: ["open_external", "upload_file"] as const,
  note: "Diana can attach a finished file, then turn in this Google Classroom assignment.",
  allowedExtensions: [],
  providerSubmissionId: "submission-1",
  providerState: "CREATED",
};

describe("ExternalSubmissionSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.markExternal.mockResolvedValue({ ok: true, message: "Saved" });
    mocks.submitFile.mockResolvedValue({ ok: true, receiptStatus: "submitted", message: "Submitted" });
    mocks.submitText.mockResolvedValue({ ok: true, receiptStatus: "submitted", message: "Submitted" });
    mocks.checkStatus.mockResolvedValue({
      ok: true,
      receiptStatus: "submitted",
      message: "Submission receipt confirmed.",
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("never presents Google turn-in-only as Submit from Diana", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: googleCapabilities,
      receiptStatus: null,
      receiptDetail: null,
      connectionReady: true,
    });

    render(<ExternalSubmissionSync
      assignmentId={assignmentId}
      assignmentTitle="Rhetorical analysis"
      provider="google_classroom"
      externalUrl="https://classroom.google.com/a"
      initialStatus="not_started"
      deliveryFile={null}
    />);

    await waitFor(() => expect(screen.getByText(/Diana can attach a finished file/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Submit from Diana" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit attached file" })).toBeNull();
    expect(screen.getByLabelText("Finished file")).toBeTruthy();
  });

  it("submits Google only with the stored Diana file and an idempotency key", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: googleCapabilities,
      receiptStatus: null,
      receiptDetail: null,
      connectionReady: true,
    });

    render(<ExternalSubmissionSync
      assignmentId={assignmentId}
      assignmentTitle="Rhetorical analysis"
      provider="google_classroom"
      externalUrl="https://classroom.google.com/a"
      initialStatus="not_started"
      deliveryFile={{ id: "22222222-2222-4222-8222-222222222222", filename: "answer.pdf" }}
    />);

    const submit = await screen.findByRole("button", { name: "Submit attached file" });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mocks.submitFile).toHaveBeenCalledWith({
        assignmentId,
        fileId: "22222222-2222-4222-8222-222222222222",
        confirmed: true,
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      });
    });
    expect(mocks.submitText).not.toHaveBeenCalled();
  });

  it("shows Canvas text submission only after assignment capability verification", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: {
        provider: "canvas",
        capabilities: ["open_external", "submit_text"],
        note: "Canvas accepts a written response.",
        allowedExtensions: [],
        providerSubmissionId: null,
        providerState: "unsubmitted",
      },
      receiptStatus: null,
      receiptDetail: null,
      connectionReady: true,
    });

    render(<ExternalSubmissionSync
      assignmentId={assignmentId}
      assignmentTitle="Rhetorical analysis"
      provider="canvas"
      externalUrl="https://canvas.example/a"
      initialStatus="not_started"
      deliveryFile={null}
    />);

    expect(screen.queryByRole("button", { name: "Submit from Diana" })).toBeNull();
    expect(await screen.findByRole("button", { name: "Submit from Diana" })).toBeTruthy();
  });

  it("checks an ambiguous receipt without calling either submission action", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: {
        provider: "canvas",
        capabilities: ["open_external", "submit_text"],
        note: "Canvas accepts a written response.",
        allowedExtensions: [],
        providerSubmissionId: null,
        providerState: "unsubmitted",
      },
      receiptStatus: "confirmation_pending",
      receiptDetail: "Canvas is still confirming the receipt.",
      connectionReady: true,
    });

    render(<ExternalSubmissionSync
      assignmentId={assignmentId}
      assignmentTitle="Rhetorical analysis"
      provider="canvas"
      externalUrl="https://canvas.example/a"
      initialStatus="not_started"
      deliveryFile={null}
    />);

    const check = await screen.findByRole("button", { name: "Check submission status" });
    expect(screen.queryByRole("button", { name: "Submit from Diana" })).toBeNull();
    fireEvent.click(check);

    await waitFor(() => expect(mocks.checkStatus).toHaveBeenCalledWith({ assignmentId }));
    expect(mocks.submitText).not.toHaveBeenCalled();
    expect(mocks.submitFile).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Submission receipt confirmed.");
  });
});
