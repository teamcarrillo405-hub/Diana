// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  transitionAssignment: vi.fn(),
  toggleChecklistItem: vi.fn(),
  addChecklistItem: vi.fn(),
  deleteChecklistItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("../actions", () => ({
  transitionAssignment: mocks.transitionAssignment,
  toggleChecklistItem: mocks.toggleChecklistItem,
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
      />,
    );

    expect(screen.getByRole("button", { name: "Record hand-in in Diana" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Record hand-in in Diana" }));
    expect(mocks.transitionAssignment).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I handed this in/ }));
    fireEvent.click(screen.getByRole("button", { name: "Record hand-in in Diana" }));
    await waitFor(() => {
      expect(mocks.transitionAssignment).toHaveBeenCalledWith({
        id: assignmentId,
        from: "exporting",
        to: "submitted",
      });
      expect(screen.getByText("Hand-in recorded")).toBeTruthy();
    });
  });

  it("keeps a saved check when a refresh supplies older checklist values during and after the save", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    const item = {
      id: "22222222-2222-4222-8222-222222222222",
      label: "Check citations",
      detail: null,
      required: true,
      checked: false,
      position: 0,
    };
    let finishCheck!: (result: { ok: true }) => void;
    const save = new Promise<{ ok: true }>((resolve) => { finishCheck = resolve; });
    mocks.toggleChecklistItem.mockReturnValue(save);
    const { rerender } = render(<SubmitChecklist assignmentId={assignmentId} items={[item]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /I handed this in/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Check citations/ }));
    rerender(<SubmitChecklist assignmentId={assignmentId} items={[{ ...item }]} />);
    await act(async () => { finishCheck({ ok: true }); });
    rerender(<SubmitChecklist assignmentId={assignmentId} items={[{ ...item }]} />);

    expect(screen.getByRole("checkbox", { name: /Check citations/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Record hand-in in Diana" })).toBeEnabled();
  });
});
