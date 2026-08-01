// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorPreferences } from "./tutor-preferences";
import { saveTutorPreferences } from "./actions";

vi.mock("./actions", () => ({
  saveTutorPreferences: vi.fn(async () => ({ ok: true as const })),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TutorPreferences", () => {
  it("keeps the selected tutor while moving through personalization and back", async () => {
    render(
      <TutorPreferences
        initial={{ persona: "diana", style: "socratic", complexity: "balanced" }}
        initialView="gallery"
      />,
    );

    expect(screen.getByRole("heading", { name: "Select tutor" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Select Tutor Xavier" }));
    expect(screen.getByRole("button", { name: "Select Tutor Xavier" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose tutor" }));
    await waitFor(() => {
      expect(saveTutorPreferences).toHaveBeenCalledWith({
        persona: "xavier",
        style: "socratic",
        complexity: "balanced",
      });
    });
    expect(screen.getByRole("heading", { name: "Coach settings" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Supportive Coach" }));
    fireEvent.change(screen.getByRole("slider", { name: "Preferred complexity" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Back to tutor gallery" }));

    expect(screen.getByRole("button", { name: "Select Tutor Xavier" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose tutor" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save tutor style" })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Save tutor style" }));

    await waitFor(() => {
      expect(saveTutorPreferences).toHaveBeenLastCalledWith({
        persona: "xavier",
        style: "supportive",
        complexity: "advanced",
      });
      expect(screen.getByText("Tutor preferences saved.")).toBeTruthy();
    });
  });

  it("can open directly in the personalization state without changing safety policy", () => {
    render(
      <TutorPreferences
        initial={{ persona: "maya", style: "direct", complexity: "simple" }}
        initialView="personalization"
      />,
    );

    expect(screen.getByRole("heading", { name: "Coach settings" })).toBeTruthy();
    expect(screen.getByText("Class AI rules and authorship controls stay the same.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Direct" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
