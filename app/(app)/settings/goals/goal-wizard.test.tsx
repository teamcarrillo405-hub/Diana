// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { saveWellnessGoal } from "../../wellness/actions";
import { GoalWizard } from "./goal-wizard";

vi.mock("../../wellness/actions", () => ({ saveWellnessGoal: vi.fn() }));

describe("GoalWizard", () => {
  beforeEach(() => vi.mocked(saveWellnessGoal).mockReset());
  afterEach(cleanup);

  it("shows saved confirmation only after the private write succeeds", async () => {
    vi.mocked(saveWellnessGoal).mockResolvedValue({ ok: true });
    render(<GoalWizard latestGoal={null} />);

    expect(screen.queryByText(/season plan saved/iu)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save study goal" }));

    await waitFor(() => expect(saveWellnessGoal).toHaveBeenCalledOnce());
    expect(await screen.findByText("saved")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Study goal saved");
  });

  it("keeps choices available after a calm write error", async () => {
    vi.mocked(saveWellnessGoal).mockResolvedValue({ ok: false, error: "The goal could not save yet." });
    render(<GoalWizard latestGoal={null} />);
    fireEvent.click(screen.getByRole("radio", { name: "A grade objective" }));
    fireEvent.click(screen.getByRole("button", { name: "Save study goal" }));

    expect(await screen.findByRole("status")).toHaveTextContent("could not save yet");
    expect(screen.getByRole("radio", { name: "A grade objective" })).toBeChecked();
  });
});
