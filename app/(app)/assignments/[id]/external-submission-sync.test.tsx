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
  prepareCanonicalFile: vi.fn(),
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
  prepareCanonicalAssignmentDeliveryFile: mocks.prepareCanonicalFile,
}));

import { ExternalSubmissionSync } from "./external-submission-sync";
import type { AssignmentSubmissionPreview } from "@/lib/assignment-workspace-contracts";
import {
  buildCanonicalRenderDocument,
  toCanonicalRenderBlock,
} from "@/lib/specialist-artifacts/render-blocks";
import {
  serializeCadArtifactContext,
  serializeGraphArtifactContext,
} from "@/lib/specialist-artifacts/serializers";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const payloadDigest = "a".repeat(64);
const googleCapabilities = {
  provider: "google_classroom" as const,
  capabilities: ["open_external", "upload_file"] as const,
  note: "Diana can attach a finished file, then turn in this Google Classroom assignment.",
  allowedExtensions: [],
  providerSubmissionId: "submission-1",
  providerState: "CREATED",
};
const preview = {
  assignmentId,
  assignmentTitle: "Rhetorical analysis",
  payloadDigest,
  destination: "Google Classroom",
  submissionType: "file" as const,
  fileName: "rhetorical-analysis.pdf",
  textPayload: "Rhetorical analysis\n\nYour draft\nStudent work",
  problems: [],
  incompleteProblemNumbers: [],
};

const specialistPreview = {
  ...preview,
  destination: "Canvas",
  submissionType: "file" as const,
  universalTextPayload: "",
  specialistRenderDocument: buildCanonicalRenderDocument({
    blocks: [toCanonicalRenderBlock(serializeGraphArtifactContext({
      expression: "x^2",
      points: [{ x: 1, y: 1 }],
    }), { id: "graph", label: "Graph" })],
  }),
} satisfies AssignmentSubmissionPreview;

const binarySpecialistPreview = {
  ...specialistPreview,
  specialistRenderDocument: buildCanonicalRenderDocument({
    blocks: [toCanonicalRenderBlock(serializeCadArtifactContext({
      units: "mm",
      dimensions: { width: 100, height: 60, depth: 20 },
      model: { fileName: "part.stl", format: "stl" },
      modelStats: { byteLength: 8000, triangleCount: 12, vertexCount: 8 },
    }), { id: "cad", label: "CAD package" })],
  }),
} satisfies AssignmentSubmissionPreview;

describe("ExternalSubmissionSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markExternal.mockResolvedValue({ ok: true, message: "Saved" });
    mocks.submitFile.mockResolvedValue({ ok: true, receiptStatus: "submitted", message: "Submitted" });
    mocks.submitText.mockResolvedValue({ ok: true, receiptStatus: "submitted", message: "Submitted" });
    mocks.checkStatus.mockResolvedValue({
      ok: true,
      receiptStatus: "submitted",
      message: "Submission receipt confirmed.",
    });
    mocks.prepareCanonicalFile.mockResolvedValue({
      ok: true,
      file: {
        id: "22222222-2222-4222-8222-222222222222",
        filename: "rhetorical-analysis.pdf",
        payloadDigest,
      },
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
      preview={preview}
    />);

    await waitFor(() => expect(screen.getByText(/Diana can attach a finished file/)).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Submit from Diana" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit attached file" })).toBeNull();
    expect(screen.queryByRole("button", { name: "I submitted it in Google Classroom" })).toBeNull();
    expect(screen.getByRole("button", { name: "Review PDF submission" })).toBeTruthy();
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
      deliveryFile={{ id: "22222222-2222-4222-8222-222222222222", filename: "rhetorical-analysis.pdf", payloadDigest }}
      preview={preview}
    />);

    fireEvent.click(await screen.findByRole("button", { name: "Review PDF submission" }));
    expect(screen.getByText("Confirm what Diana will send")).toBeTruthy();
    expect(screen.getByText("Google Classroom", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("PDF file", { selector: "dd" })).toBeTruthy();
    expect(screen.getByText("rhetorical-analysis.pdf", { selector: "dd" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to Google Classroom" }));

    await waitFor(() => {
      expect(mocks.submitFile).toHaveBeenCalledWith({
        assignmentId,
        fileId: "22222222-2222-4222-8222-222222222222",
        confirmed: true,
        idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
        payloadDigest,
      });
    });
    expect(mocks.submitText).not.toHaveBeenCalled();
  });

  it("regenerates instead of confirming a file from an older payload digest", async () => {
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
      deliveryFile={{
        id: "33333333-3333-4333-8333-333333333333",
        filename: "rhetorical-analysis.pdf",
        payloadDigest: "b".repeat(64),
      }}
      preview={preview}
    />);

    fireEvent.click(await screen.findByRole("button", { name: "Review PDF submission" }));

    await waitFor(() => expect(mocks.prepareCanonicalFile).toHaveBeenCalledWith({
      assignmentId,
      payloadDigest,
    }));
    expect(await screen.findByText("Confirm what Diana will send")).toBeTruthy();
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
      preview={{ ...preview, destination: "Canvas", submissionType: "text" }}
    />);

    expect(screen.queryByRole("button", { name: "Submit from Diana" })).toBeNull();
    const review = await screen.findByRole("button", { name: "Review Canvas submission" });
    fireEvent.click(review);
    expect(screen.getByLabelText("Text Diana will submit").textContent).toBe(preview.textPayload);
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to Canvas" }));
    await waitFor(() => expect(mocks.submitText).toHaveBeenCalledWith({
      assignmentId,
      confirmed: true,
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      payloadDigest,
    }));
  });

  it("prefers a canonical PDF when Canvas accepts both text and files for specialist work", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: {
        provider: "canvas",
        capabilities: ["open_external", "submit_text", "upload_file"],
        note: "Canvas accepts text or a file.",
        allowedExtensions: ["pdf"],
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
      preview={specialistPreview}
    />);

    fireEvent.click(await screen.findByRole("button", { name: "Review PDF submission" }));
    await waitFor(() => expect(mocks.prepareCanonicalFile).toHaveBeenCalledWith({
      assignmentId,
      payloadDigest,
    }));
    expect(await screen.findByText("PDF file", { selector: "dd" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirm and send to Canvas" }));

    await waitFor(() => expect(mocks.submitFile).toHaveBeenCalledWith({
      assignmentId,
      fileId: "22222222-2222-4222-8222-222222222222",
      confirmed: true,
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      payloadDigest,
    }));
    expect(mocks.submitText).not.toHaveBeenCalled();
  });

  it("does not offer lossy Canvas text submission when specialist work cannot be uploaded", async () => {
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
      preview={specialistPreview}
    />);

    expect(await screen.findByText(/cannot receive Diana's specialist PDF directly/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Canvas submission" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review PDF submission" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open in Canvas" })).toBeTruthy();
  });

  it("requires external handoff when a CAD source binary is not embedded", async () => {
    mocks.getState.mockResolvedValue({
      ok: true,
      capabilities: {
        provider: "canvas",
        capabilities: ["open_external", "submit_text", "upload_file"],
        note: "Canvas accepts text or a file.",
        allowedExtensions: ["pdf"],
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
      preview={binarySpecialistPreview}
    />);

    expect(await screen.findByText(/not the original CAD or media source file/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Review Canvas submission" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review PDF submission" })).toBeNull();
    expect(screen.getByRole("link", { name: "Open in Canvas" })).toBeTruthy();
    expect(mocks.prepareCanonicalFile).not.toHaveBeenCalled();
    expect(mocks.submitFile).not.toHaveBeenCalled();
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
      preview={{ ...preview, destination: "Canvas", submissionType: "text" }}
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
