// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useReducer } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPreviewState, previewReducer, workKey, workSnapshot } from "./fixtures";
import { PreviewConversation } from "./preview-conversation";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Example() {
  const [state, dispatch] = useReducer(previewReducer, undefined, () => createPreviewState());
  const work = state.work[workKey(state.fixture, state.scenario)];
  const draft = work.units[work.selected];
  return <PreviewConversation draft={draft} cue="Which operation would you try?" rubric={["Show your reasoning."]} reviewed={draft.reviewedText === workSnapshot(draft)} reviewOpen={false} onCloseReview={() => {}} onKeepWorking={() => {}} dispatch={dispatch} />;
}
const composer = () => screen.getByRole("textbox", { name: "Message Diana" });
describe("center conversation preview", () => {
  it("shows the original composer controls without hiding them in a tab", () => {
    render(<Example />);
    for (const name of ["Live voice", "Voice to text", "Send message", "Add image or PDF"]) expect(screen.getByRole("button", { name })).toBeVisible();
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
  });
  it("sends only a local message with Enter and preserves Shift+Enter and IME", () => {
    render(<Example />);
    fireEvent.change(composer(), { target: { value: "Can you explain this?" } });
    expect(fireEvent.keyDown(composer(), { key: "Enter", shiftKey: true })).toBe(true);
    expect(fireEvent.keyDown(composer(), { key: "Enter", isComposing: true })).toBe(true);
    expect(composer()).toHaveValue("Can you explain this?");
    expect(fireEvent.keyDown(composer(), { key: "Enter" })).toBe(false);
    expect(composer()).toHaveValue("");
    expect(screen.getByText("Can you explain this?")).toBeVisible();
    expect(screen.getByText("You / preview only, not sent")).toBeVisible();
  });
  it("keeps dictation separate from live voice and never requests a microphone", () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    const network = vi.fn(); vi.stubGlobal("fetch", network);
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    expect(screen.getByText("No live connection or microphone is active in this design preview.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Voice to text" }));
    expect(screen.queryByRole("region", { name: "Live voice preview" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Use sample transcript" }));
    expect(composer()).toHaveValue("Can you help me with the first step?");
    expect(composer()).toHaveFocus();
    expect(getUserMedia).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
  });
  it("shows a local attachment preview with explicit removal and send", () => {
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "Add image or PDF" }));
    fireEvent.click(screen.getByRole("button", { name: "Use sample image" }));
    expect(screen.getByText("Sample image / no file uploaded")).toBeVisible();
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Remove sample attachment" }));
    expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
