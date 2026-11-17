// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  loadBundle: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: mocks.redirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/assignment-submission-server", () => ({
  loadAssignmentSubmissionBundle: mocks.loadBundle,
}));

vi.mock("@/components/screen-design/primitives", () => ({
  DianaMascotMark: () => <span>Diana</span>,
  DianaWordmark: () => <span>Diana</span>,
}));

vi.mock("@/components/screen-design/screen-design-viewport", () => ({
  ScreenDesignViewport: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../external-submission-sync", () => ({
  ExternalSubmissionSync: () => null,
}));

vi.mock("./checklist", () => ({
  SubmitChecklist: () => <section><h2>Final checks</h2><button type="button">Record hand-in in Diana</button></section>,
}));

vi.mock("../actions", () => ({ setSubmissionUrl: vi.fn() }));

vi.mock("@/components/assignment-submission-preview", () => ({
  AssignmentSubmissionDownload: () => <button type="button">Download PDF</button>,
  AssignmentSubmissionPreview: () => <h2>Your work</h2>,
}));

import SubmitPage from "./page";

const assignmentId = "11111111-1111-4111-8111-111111111111";

function mockAssignment(status: string, { source = "clever", savedLink = null, receipt = null }: {
  source?: string;
  savedLink?: string | null;
  receipt?: Record<string, unknown> | null;
} = {}) {
  mocks.loadBundle.mockResolvedValue({
    assignment: {
      id: assignmentId,
      title: "Identity quote response",
      status,
      submitted_at: "2026-07-31T12:00:00.000Z",
      submission_url: savedLink,
      external_source: source,
      external_url: null,
      submission_sync_status: "marked_submitted",
      classes: { name: "English 9" },
    },
    className: "English 9",
    profile: resolveAssignmentProfile({ kind: "essay", className: "English 9", title: "Identity quote response" }),
    preview: {
      assignmentId,
      assignmentTitle: "Identity quote response",
      className: "English 9",
      profileLabel: "Writing",
      payloadDigest: "a".repeat(64),
      destination: "Download or school handoff",
      submissionType: "external_handoff",
      fileName: "identity-quote-response.pdf",
      textPayload: "Identity quote response",
      problems: [],
      incompleteProblemNumbers: [],
    },
  });
  const receiptQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: receipt }),
  };
  receiptQuery.select.mockReturnValue(receiptQuery);
  receiptQuery.eq.mockReturnValue(receiptQuery);
  receiptQuery.order.mockReturnValue(receiptQuery);
  receiptQuery.limit.mockReturnValue(receiptQuery);
  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }),
    },
    from: vi.fn(() => receiptQuery),
  });
}

describe("assignment submission destination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
  });
  afterEach(cleanup);

  it.each(["exporting", "submitted"])("keeps Calendar context through %s review and hand-in", async status => {
    mockAssignment(status);
    const calendarReturn = "/calendar?day=2026-11-17&view=week&item=assignment-one";
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }), searchParams: Promise.resolve({ calendarReturn }) }));
    expect(screen.getByRole("link", { name: "Back to Calendar" })).toHaveAttribute("href", calendarReturn);
    const forward = screen.getByRole("link", { name: status === "submitted" ? "View submitted work" : "Edit in workspace" });
    expect(new URL(forward.getAttribute("href")!, "https://diana.test").searchParams.get("calendarReturn")).toBe(calendarReturn);
  });

  it("sends editable assignment states back to the workspace", async () => {
    mockAssignment("drafting");

    await expect(
      SubmitPage({ params: Promise.resolve({ id: assignmentId }) }),
    ).rejects.toThrow(`redirect:/assignments/${assignmentId}/workspace`);
  });

  it("renders submitted assignments as a read-only receipt with stable destinations", async () => {
    mockAssignment("submitted", { source: "canvas", receipt: {
      id: "22222222-2222-4222-8222-222222222222",
      provider: "canvas",
      provider_receipt_id: "canvas-submission-1",
      assignment_submission_files: {
        filename: "identity-quote-response.pdf",
        payload_digest: "a".repeat(64),
      },
    } });
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }) }));

    expect(screen.getByRole("heading", { name: "Submission confirmed" })).toBeTruthy();
    expect(screen.getByText("Canvas confirmed this hand-in.")).toBeTruthy();
    expect(screen.getByText("identity-quote-response.pdf")).toBeTruthy();
    expect(screen.getByText("canvas-submission-1")).toBeTruthy();
    expect(screen.getByText("22222222-2222-4222-8222-222222222222")).toBeTruthy();
    expect(screen.getByText(/A{12}/)).toBeTruthy();
    const submittedWork = screen.getByRole("link", { name: "View submitted work" });
    const record = screen.getByRole("link", { name: "Open Record" });
    expect(submittedWork).toHaveAttribute("href", `/assignments/${assignmentId}/submitted-work`);
    expect(record).toHaveAttribute("href", "/proof");
    expect(submittedWork.compareDocumentPosition(record)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText("Jul 31, 2026, 12:00 PM UTC")).toHaveAttribute("datetime", "2026-07-31T12:00:00.000Z");
    expect(screen.getByRole("link", { name: "Back to Work" })).toHaveAttribute("href", "/assignments?return=1");
    expect(screen.queryByRole("link", { name: /assignment workspace/i })).toBeNull();
  });

  it("recognizes a provider text receipt without requiring a submitted file", async () => {
    mockAssignment("submitted", { source: "canvas", receipt: {
      id: "22222222-2222-4222-8222-222222222222",
      provider: "canvas",
      provider_receipt_id: "canvas-text-1",
      assignment_submission_files: null,
    } });
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }) }));

    expect(screen.getByRole("heading", { name: "Submission confirmed" })).toBeTruthy();
    expect(screen.getByText("canvas-text-1")).toBeTruthy();
    expect(screen.queryByText("Submitted file")).toBeNull();
  });

  it("describes student-recorded hand-ins without inventing a school confirmation or receipt ID", async () => {
    mockAssignment("submitted");
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }) }));

    expect(screen.getByRole("heading", { name: "Submission recorded" })).toBeTruthy();
    expect(screen.getByText("This hand-in is recorded in Diana.")).toBeTruthy();
    expect(screen.queryByText("Receipt details")).toBeNull();
    expect(screen.queryByText(assignmentId)).toBeNull();
  });

  it("shows the safe saved school link before checks and recording the hand-in", async () => {
    mockAssignment("exporting", { savedLink: "https://school.example/hand-in" });
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }) }));
    expect(screen.getByRole("link", { name: "Back to Work" })).toHaveAttribute("href", "/assignments?return=1");
    expect(screen.getByRole("link", { name: "Edit in workspace" })).toHaveAttribute("href", `/assignments/${assignmentId}/workspace`);
    expect(screen.getByRole("tabpanel", { name: "Review" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue to hand in" }));
    expect(screen.getByRole("tab", { name: "Hand in" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Hand in" })).toBeTruthy();

    const download = screen.getByRole("button", { name: "Download PDF" });
    const destination = screen.getByRole("link", { name: "Open saved submission link" });
    const checks = screen.getByRole("heading", { name: "Final checks" });
    const record = screen.getByRole("button", { name: "Record hand-in in Diana" });
    expect(destination).toHaveAttribute("href", "https://school.example/hand-in");
    expect(download.compareDocumentPosition(destination)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(destination.compareDocumentPosition(checks)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(checks.compareDocumentPosition(record)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
