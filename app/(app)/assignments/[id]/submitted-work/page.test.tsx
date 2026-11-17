// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SubmittedWork } from "@/lib/assignment-submitted-work";

const mocks = vi.hoisted(() => ({ loadWork: vi.fn(), auth: vi.fn() }));

vi.mock("@/lib/assignment-submitted-work", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/assignment-submitted-work")>();
  return { ...actual, loadSubmittedWork: mocks.loadWork };
});
vi.mock("@/lib/profile", () => ({
  loadProfile: async () => ({ timezone: "America/Los_Angeles" }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.auth } }),
}));
vi.mock("@/components/student-shell/student-shell", () => ({
  StudentShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/submitted-pdf-preview", () => ({
  SubmittedPdfPreview: () => <div aria-label="Saved PDF" />,
}));

import SubmittedWorkPage from "./page";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const fileId = "22222222-2222-4222-8222-222222222222";
const work: SubmittedWork = {
  assignment: {
    id: assignmentId,
    title: "Identity quote response",
    className: "English 9",
    status: "submitted",
    submittedAt: "2026-07-31T12:00:00.000Z",
    externalUrl: "https://class.example/assignment",
    submissionUrl: null,
  },
  provider: null,
  copy: null,
};

async function renderWork(fields: Partial<SubmittedWork>) {
  mocks.auth.mockResolvedValue({ data: { user: { id: "student" } } });
  mocks.loadWork.mockResolvedValue({ ...work, ...fields });
  return render(await SubmittedWorkPage({ params: Promise.resolve({ id: assignmentId }) }));
}

afterEach(cleanup);

describe("submitted work viewer", () => {
  it("shows a pre-hand-in Diana copy with a read-only download", async () => {
    await renderWork({
      copy: { kind: "file", id: fileId, filename: "identity-quote-response.pdf", mimeType: "application/pdf", source: "diana" },
    });
    expect(screen.getByRole("heading", { name: "Diana’s saved copy" })).toBeTruthy();
    expect(screen.getByText("Diana saved this copy before you recorded the hand-in.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Download PDF" })).toHaveAttribute("href", `/api/assignments/${assignmentId}/submitted-file/${fileId}`);
    expect(screen.getByLabelText("Saved PDF")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to submission" })).toHaveAttribute("href", `/assignments/${assignmentId}/submit`);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("offers the school destination when older work has no verified copy", async () => {
    await renderWork({ provider: "Canvas" });
    expect(screen.getByText("Diana has no saved copy for this hand-in.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open school assignment" })).toHaveAttribute("href", "https://class.example/assignment");
    expect(screen.queryByRole("link", { name: "Download PDF" })).toBeNull();
  });

  it("keeps confirmed school text read-only and separate from draft work", async () => {
    await renderWork({ provider: "Canvas", copy: { kind: "text", text: "A selected quote and my reasoning.", source: "school" } });
    expect(screen.getByRole("heading", { name: "Copy sent to school" })).toBeTruthy();
    expect(screen.getByText("A selected quote and my reasoning.").tagName).toBe("PRE");
    expect(screen.queryByRole("link", { name: "Download PDF" })).toBeNull();
  });
});
