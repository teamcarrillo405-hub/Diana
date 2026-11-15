// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  SubmitChecklist: () => null,
}));

import SubmitPage from "./page";

const assignmentId = "11111111-1111-4111-8111-111111111111";

function mockAssignment(status: string) {
  mocks.loadBundle.mockResolvedValue({
    assignment: {
      id: assignmentId,
      title: "Identity quote response",
      status,
      submitted_at: "2026-07-31T12:00:00.000Z",
      submission_url: null,
      external_source: "clever",
      external_url: null,
      submission_sync_status: "marked_submitted",
      classes: { name: "English 9" },
    },
    className: "English 9",
    profile: { label: "Writing" },
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
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: "22222222-2222-4222-8222-222222222222",
        submission_file_id: "33333333-3333-4333-8333-333333333333",
        assignment_submission_files: {
          filename: "identity-quote-response.pdf",
          payload_digest: "a".repeat(64),
        },
      },
    }),
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

  it("sends editable assignment states back to the workspace", async () => {
    mockAssignment("drafting");

    await expect(
      SubmitPage({ params: Promise.resolve({ id: assignmentId }) }),
    ).rejects.toThrow(`redirect:/assignments/${assignmentId}/workspace`);
  });

  it("renders submitted assignments as a read-only receipt with stable destinations", async () => {
    mockAssignment("submitted");
    render(await SubmitPage({ params: Promise.resolve({ id: assignmentId }) }));

    expect(screen.getByRole("heading", { name: "Submission recorded" })).toBeTruthy();
    expect(screen.getByText("Receipt saved")).toBeTruthy();
    expect(screen.getByText("identity-quote-response.pdf")).toBeTruthy();
    expect(screen.getByText(/Payload A{12}/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open Record/ })).toHaveAttribute("href", "/proof");
    expect(screen.getByRole("link", { name: "Back to Work" })).toHaveAttribute("href", "/assignments");
    expect(screen.queryByRole("link", { name: /assignment workspace/i })).toBeNull();
  });
});
