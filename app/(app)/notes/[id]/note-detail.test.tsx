// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  saveNote: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/notes/note-1",
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("../actions", () => ({ saveNote: mocks.saveNote }));
vi.mock("@/components/accessible-reading-text", () => ({
  AccessibleReadingText: ({ text }: { text: string }) => <span>{text}</span>,
}));
vi.mock("@/components/tts-highlight-button", () => ({
  TtsHighlightButton: () => <button type="button">Read note aloud</button>,
}));
vi.mock("@/components/vocab-hover-provider", () => ({
  VocabHoverProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/reading-annotation-control", () => ({ ReadingAnnotationControl: () => null }));
vi.mock("@/components/reading-level-adapter", () => ({ ReadingLevelAdapter: () => null }));
vi.mock("@/components/study-artifact-panel", () => ({
  StudyArtifactPanel: () => <div>Study tools connected</div>,
}));
vi.mock("./visual-learning-panel", () => ({ VisualLearningPanel: () => null }));
vi.mock("./actions", () => ({
  createFlashcardFromSelection: vi.fn(),
  deleteNote: vi.fn(),
  suggestNoteTags: vi.fn(),
  triggerTranscript: vi.fn(),
  updateNoteClass: vi.fn(),
  updateNoteTags: vi.fn(),
}));

import { NoteDetail } from "./note-detail";

describe("NoteDetail ScreenDesign surface", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saveNote.mockResolvedValue({ ok: true });
  });

  it("edits and saves the owner-scoped note through the existing server action", async () => {
    render(
      <NoteDetail
        id="11111111-1111-4111-8111-111111111111"
        title="Macroeconomics"
        bodyText="Fiscal policy uses government spending."
        transcriptText={null}
        outline={null}
        actionItems={[]}
        source="manual"
        tags={[]}
        aiSuggestedTags={[]}
        relatedNotes={[]}
        readingPrefs={{ bionic_reading: false, visual_pacing: "off", line_focus: false }}
        ttsOn
        ttsProvider="browser"
        ttsSpeed={1}
        ttsPitch={1}
        ttsVoice="nova"
        classId={null}
        ownerId="22222222-2222-4222-8222-222222222222"
        classAiMode="green"
        classes={[]}
      />,
    );

    const editor = screen.getByRole("textbox", { name: "Note body" });
    fireEvent.change(editor, {
      target: { value: "Fiscal policy uses spending and tax policy." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => {
      expect(mocks.saveNote).toHaveBeenCalledWith({
        id: "11111111-1111-4111-8111-111111111111",
        title: "Macroeconomics",
        bodyText: "Fiscal policy uses spending and tax policy.",
        classId: null,
        source: "manual",
      });
      expect(screen.getByRole("status")).toHaveTextContent("Saved");
    });
    expect(screen.getByRole("button", { name: "Read note aloud" })).toBeVisible();
    expect(screen.getByText("Study tools connected")).toBeVisible();
  });
});
