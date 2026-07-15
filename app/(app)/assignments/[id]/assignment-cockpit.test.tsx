// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  transitionAssignment: vi.fn(),
  toggleChecklistItem: vi.fn(),
  toggleStepDone: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/assignments/11111111-1111-4111-8111-111111111111",
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("./actions", () => ({
  transitionAssignment: mocks.transitionAssignment,
  toggleChecklistItem: mocks.toggleChecklistItem,
}));

vi.mock("./ai-tools-actions", () => ({
  toggleStepDone: mocks.toggleStepDone,
}));

import { AssignmentCockpit } from "./assignment-cockpit";

const assignmentId = "11111111-1111-4111-8111-111111111111";

describe("AssignmentCockpit", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transitionAssignment.mockResolvedValue({ ok: true });
    mocks.toggleChecklistItem.mockResolvedValue({ ok: true });
    mocks.toggleStepDone.mockResolvedValue({ ok: true });
  });

  it("starts the real assignment lifecycle from the source timer control", async () => {
    render(
      <AssignmentCockpit
        assignmentId={assignmentId}
        title="Identity quote response"
        courseLabel="English 9"
        dueLine="Due tomorrow"
        estimate="35 min"
        briefText="Attach one quote and explain its meaning."
        status="todo"
        classAiMode="green"
        drills={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            kind: "checklist",
            label: "Quote and page number are attached",
            detail: null,
            checked: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("COCKPIT: ENGLISH 9")).toBeTruthy();
    expect(screen.getByText("25:00")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start assignment" }));

    await waitFor(() => {
      expect(mocks.transitionAssignment).toHaveBeenCalledWith({
        id: assignmentId,
        from: "todo",
        to: "drafting",
      });
      expect(mocks.push).toHaveBeenCalledWith(
        `/assignments/${assignmentId}?workspace=1&start=1`,
      );
    });
  });

  it("rolls a drill checkbox back when persistence is unavailable", async () => {
    mocks.toggleChecklistItem.mockResolvedValue({ error: "Please try again." });
    render(
      <AssignmentCockpit
        assignmentId={assignmentId}
        title="Identity quote response"
        courseLabel="English 9"
        dueLine="Due tomorrow"
        estimate={null}
        briefText="Attach one quote."
        status="drafting"
        classAiMode="red"
        drills={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            kind: "checklist",
            label: "Quote and page number are attached",
            detail: null,
            checked: false,
          },
        ]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Quote and page number are attached",
    });
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");

    await waitFor(() => {
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      expect(screen.getByRole("status").textContent).toContain("Please try again.");
    });
    expect(screen.queryByRole("link", { name: "Break this assignment down" })).toBeNull();
  });
});
