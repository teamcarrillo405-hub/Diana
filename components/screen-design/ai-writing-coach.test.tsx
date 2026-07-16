// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acceptWritingSuggestion: vi.fn(),
  requestWritingCoauthor: vi.fn(),
  saveHandInField: vi.fn(),
}));

vi.mock("next/navigation", () => ({ usePathname: () => "/assignments/assignment-1" }));
vi.mock("@/app/(app)/assignments/[id]/ai-tools-actions", () => ({
  acceptWritingSuggestion: mocks.acceptWritingSuggestion,
  requestWritingCoauthor: mocks.requestWritingCoauthor,
}));
vi.mock("@/app/(app)/assignments/[id]/hm-actions", () => ({
  saveHandInField: mocks.saveHandInField,
}));

import { AiWritingCoach } from "./ai-writing-coach";

describe("AiWritingCoach", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveHandInField.mockResolvedValue({ ok: true });
    mocks.acceptWritingSuggestion.mockResolvedValue({ ok: true });
    mocks.requestWritingCoauthor.mockResolvedValue({
      ok: true,
      result: {
        mode: "transition",
        title: "Transition check",
        authorshipNote: "Student wording stays primary.",
        suggestions: [{
          label: "Bridge move",
          text: "Connect the sacrifice to the change in leadership.",
          rationale: "This names the relationship between the ideas.",
          action: "Use this only if it matches your meaning.",
        }],
      },
    });
  });

  it("keeps a generated suggestion outside the draft until the student accepts it", async () => {
    render(
      <AiWritingCoach
        assignmentId="11111111-1111-4111-8111-111111111111"
        assignmentTitle="The Hero's Journey"
        courseLabel="English Lit"
        initialDraft="Odysseus learns that endurance matters."
        classAiMode="green"
      />,
    );

    const draft = screen.getByRole("textbox", { name: "Student draft" });
    fireEvent.click(screen.getByRole("button", { name: "Request writing guidance" }));

    await screen.findByText("Connect the sacrifice to the change in leadership.");
    expect(draft).toHaveValue("Odysseus learns that endurance matters.");
    expect(mocks.acceptWritingSuggestion).not.toHaveBeenCalled();

    const acceptButton = screen.getByRole("button", { name: "Accept suggestion" });
    await waitFor(() => expect(acceptButton).toBeEnabled());
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mocks.acceptWritingSuggestion).toHaveBeenCalledWith({
        assignmentId: "11111111-1111-4111-8111-111111111111",
        currentDraft: "Odysseus learns that endurance matters.",
        suggestionText: "Connect the sacrifice to the change in leadership.",
      });
      expect(draft).toHaveValue(
        "Odysseus learns that endurance matters.\n\nConnect the sacrifice to the change in leadership.",
      );
    });
  });

  it("blocks generation in the client presentation without weakening the server policy", () => {
    render(
      <AiWritingCoach
        assignmentId="11111111-1111-4111-8111-111111111111"
        assignmentTitle="The Hero's Journey"
        courseLabel="English Lit"
        initialDraft="Student-owned draft."
        classAiMode="red"
      />,
    );

    expect(screen.getByRole("button", { name: "Request writing guidance" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Writing Coach unavailable for this class");
  });
});
