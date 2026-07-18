// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  requestTaskBreakdown: vi.fn(),
  acceptTaskBreakdown: vi.fn(),
  toggleStepDone: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("../assignments/[id]/ai-tools-actions", () => ({
  requestTaskBreakdown: mocks.requestTaskBreakdown,
  acceptTaskBreakdown: mocks.acceptTaskBreakdown,
  toggleStepDone: mocks.toggleStepDone,
}));

import { BreakDownClient } from "./break-down-client";

describe("BreakDownClient source flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.acceptTaskBreakdown.mockResolvedValue({ ok: true });
  });
  afterEach(cleanup);

  it("persists generated steps only after the student accepts them", async () => {
    const assignmentId = "11111111-1111-4111-8111-111111111111";
    const steps = [
      { step: 1, action: "Pick the quote and page number.", minutes: 5, done: false },
    ];
    render(
      <BreakDownClient
        assignmentId={assignmentId}
        title="Identity quote response"
        description="Attach one quote and explain its meaning."
        kind="essay"
        estimatedMinutes={35}
        aiMode="green"
        initialSteps={steps}
        returnTo={`/assignments/${assignmentId}`}
      />,
    );

    expect(screen.getByText("TASK BREAKDOWN")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept task breakdown" }));
    await waitFor(() => {
      expect(mocks.acceptTaskBreakdown).toHaveBeenCalledWith({ assignmentId, steps });
      expect(mocks.push).toHaveBeenCalledWith(`/assignments/${assignmentId}`);
    });
  });
});
