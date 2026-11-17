// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { AssignmentArtifactSavesContext, createAssignmentArtifactSaves } from "@/components/assignment-artifact-saves";
import { HomeworkStemChecks } from "@/components/homework-stem-checks";

const { save } = vi.hoisted(() => ({ save: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/app/(app)/assignments/[id]/hm-actions", () => ({ saveAssignmentArtifactBlock: save }));

afterEach(() => {
  cleanup();
  save.mockClear();
});

it("saves copied givens without counting them as an answer for hand-in", async () => {
  const registry = createAssignmentArtifactSaves();
  render(
    <AssignmentArtifactSavesContext.Provider value={registry}>
      <HomeworkStemChecks assignmentId="calculus-homework" artifactType="problem_set" course="AP Calculus" title="Tangent slope and area" />
    </AssignmentArtifactSavesContext.Provider>,
  );

  const slope = within(screen.getByRole("form", { name: "Tangent slope" }));
  fireEvent.change(screen.getByLabelText("Function"), { target: { value: "x^2" } });
  fireEvent.change(slope.getByLabelText("Point for tangent"), { target: { value: "2" } });
  fireEvent.click(slope.getByRole("button", { name: "Check answer" }));
  expect(slope.getByText("Enter the given information and your answer to check it.")).toBeInTheDocument();

  await act(async () => { await registry.flush(); });
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({
    block: expect.objectContaining({
      plainText: "",
      content: expect.objectContaining({ studentAuthoredText: "", stemChecked: [], stemValues: expect.objectContaining({ function: "x^2", point: "2" }) }),
    }),
  }));

  fireEvent.change(slope.getByLabelText("Your slope"), { target: { value: "4" } });
  fireEvent.click(slope.getByRole("button", { name: "Check answer" }));
  expect(slope.getByText("The exact calculation matches your result.")).toBeInTheDocument();

  await act(async () => { await registry.flush(); });
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({
    block: expect.objectContaining({
      plainText: "Function: x^2\nPoint for tangent: 2\nYour slope: 4",
      content: expect.objectContaining({ stemChecked: [0] }),
    }),
  }));
});
