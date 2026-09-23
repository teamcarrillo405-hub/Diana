// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { saveArtifactFlashcards } = vi.hoisted(() => ({
  saveArtifactFlashcards: vi.fn(),
}));

vi.mock("@/app/(app)/study-artifacts/actions", () => ({
  saveArtifactFlashcards,
}));

import { ArtifactFlashcards } from "./artifact-flashcards";

describe("ArtifactFlashcards", () => {
  beforeEach(() => {
    saveArtifactFlashcards.mockReset();
  });

  it("lets the student edit and save an assignment-sourced card set", async () => {
    saveArtifactFlashcards.mockResolvedValue({ ok: true, count: 1 });
    render(
      <ArtifactFlashcards
        artifactId="artifact-1"
        cards={[
          {
            front: "Original question",
            back: "Original answer",
            sourceAnchor: "Page 2",
            studentRequiredAction: "Review",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Card 1 front"), {
      target: { value: "Edited question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save to Flashcards" }));

    await waitFor(() =>
      expect(saveArtifactFlashcards).toHaveBeenCalledWith({
        artifactId: "artifact-1",
        cards: [expect.objectContaining({ front: "Edited question" })],
      }),
    );
    expect(await screen.findByRole("link", { name: /Review cards/u })).toHaveAttribute(
      "href",
      "/flashcards",
    );
  });
});
