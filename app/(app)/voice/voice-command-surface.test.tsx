// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { VoiceCommandSurface } from "./voice-command-surface";

const mocks = vi.hoisted(() => ({
  saveInboxItem: vi.fn(),
}));

vi.mock("@/components/voice-textarea", () => ({
  VoiceTextarea: ({ value, onChange, placeholder }: {
    value: string;
    onChange: (event: { target: { value: string } }) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label="Voice note"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event)}
    />
  ),
}));

vi.mock("../quick-add/actions", () => ({ saveInboxItem: mocks.saveInboxItem }));

describe("VoiceCommandSurface", () => {
  afterEach(() => {
    cleanup();
    mocks.saveInboxItem.mockReset();
  });

  it("keeps save disabled until the note has words", () => {
    render(<VoiceCommandSurface classes={[]} />);

    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
  });

  it("saves a general note without assuming a subject", async () => {
    mocks.saveInboxItem.mockResolvedValue({ ok: true, id: "voice-note-1" });
    render(<VoiceCommandSurface classes={[{ id: "11111111-1111-4111-8111-111111111111", name: "Chemistry" }]} />);

    fireEvent.change(screen.getByLabelText("Voice note"), {
      target: { value: "Ask Mr. Chen about the chemistry lab diagram." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(mocks.saveInboxItem).toHaveBeenCalledWith({
        raw: "Ask Mr. Chen about the chemistry lab diagram.",
        captureMode: "voice",
      });
      expect(screen.getByText("Saved as a general note. Diana will suggest a class when the words make it clear.")).toBeInTheDocument();
    });
  });

  it("keeps the class chosen by the student", async () => {
    const chemistryId = "11111111-1111-4111-8111-111111111111";
    mocks.saveInboxItem.mockResolvedValue({ ok: true, id: "voice-note-2" });
    render(<VoiceCommandSurface classes={[{ id: chemistryId, name: "Chemistry" }]} />);

    fireEvent.change(screen.getByRole("combobox", { name: /class/i }), { target: { value: chemistryId } });
    fireEvent.change(screen.getByLabelText("Voice note"), {
      target: { value: "I need help understanding the lab setup." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(mocks.saveInboxItem).toHaveBeenCalledWith({
        raw: "I need help understanding the lab setup.",
        captureMode: "voice",
        classId: chemistryId,
      });
      expect(screen.getByText("Saved to Chemistry notes.")).toBeInTheDocument();
    });
  });

  it("lets the student clear a note before saving", () => {
    render(<VoiceCommandSurface classes={[]} />);

    fireEvent.change(screen.getByLabelText("Voice note"), {
      target: { value: "Remember to bring the rubric." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByLabelText("Voice note")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Save note" })).toBeDisabled();
  });
});
