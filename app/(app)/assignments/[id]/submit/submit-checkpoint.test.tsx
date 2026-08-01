// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  transitionAssignment: vi.fn(),
  toggleChecklistItem: vi.fn(),
  setSubmissionUrl: vi.fn(),
  addChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("../actions", () => ({
  transitionAssignment: mocks.transitionAssignment,
  toggleChecklistItem: mocks.toggleChecklistItem,
  setSubmissionUrl: mocks.setSubmissionUrl,
  addChecklistItem: mocks.addChecklistItem,
  deleteChecklistItem: mocks.deleteChecklistItem,
}));

import { SubmitChecklist } from "./checklist";

describe("SubmitChecklist checkpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transitionAssignment.mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it("requires the explicit exporting to submitted confirmation", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    render(
      <SubmitChecklist
        assignmentId={assignmentId}
        items={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            label: "Quote and page number are attached",
            detail: null,
            required: true,
            checked: true,
            position: 0,
          },
        ]}
        currentUrl={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm submission" }));
    await waitFor(() => {
      expect(mocks.transitionAssignment).toHaveBeenCalledWith({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });
      expect(screen.getByText("SUBMISSION CONFIRMED")).toBeTruthy();
    });
  });
});
