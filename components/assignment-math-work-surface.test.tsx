// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  savePreference: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/app/(app)/assignments/[id]/workspace-state-actions", () => ({
  saveAssignmentWorkspacePreference: mocks.savePreference,
}));

import { MathWorkSurface } from "@/components/assignment-math-work-surface";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const problemId = "22222222-2222-4222-8222-222222222222";

function renderSurface(overrides: Partial<React.ComponentProps<typeof MathWorkSurface>> = {}) {
  const props: React.ComponentProps<typeof MathWorkSurface> = {
    assignmentId,
    problemId,
    work: "3x = 15",
    workInk: "",
    onWorkChange: vi.fn(),
    onInkChange: vi.fn(),
    onClear: vi.fn(),
    onUndoClear: vi.fn(),
    onReview: vi.fn(),
    reviewed: false,
    done: false,
    clearUndoAvailable: false,
    saveState: "synced",
    saveError: "",
    onRetrySave: vi.fn(),
    initialPreference: { problemId, paperStyle: "lined", workHeight: 240 },
    ...overrides,
  };
  render(<MathWorkSurface {...props} />);
  return props;
}

describe("MathWorkSurface", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it("explains automatic typing and handwriting and exposes the active typing state", () => {
    renderSurface();

    const editor = screen.getByRole("textbox", { name: "Show your work" });
    expect(editor.getAttribute("placeholder")).toContain("Tap to type or drag to write");
    fireEvent.focus(editor);
    expect(editor.closest(".sd-assignment-work-box")?.getAttribute("data-typing")).toBe("true");
    fireEvent.blur(editor);
    expect(editor.closest(".sd-assignment-work-box")?.hasAttribute("data-typing")).toBe(false);
  });

  it("resizes with the keyboard and saves the new height on this device", () => {
    renderSurface();
    const resize = screen.getByRole("slider", { name: "Make the work area larger" });

    fireEvent.keyDown(resize, { key: "ArrowDown" });

    expect(resize).toHaveAttribute("aria-valuenow", "280");
    expect(JSON.parse(window.localStorage.getItem(`diana:assignment:${assignmentId}:problem:${problemId}:workspace-preference`) ?? "{}")).toMatchObject({
      paperStyle: "lined",
      workHeight: 280,
    });
  });

  it("shows the save cause and lets the student retry without changing their work", () => {
    const onRetrySave = vi.fn();
    renderSurface({
      saveState: "retryable_error",
      saveError: "The save paused. Your work is still on this device.",
      onRetrySave,
    });

    expect(screen.getByRole("alert")).toHaveTextContent("The save paused. Your work is still on this device.");
    fireEvent.click(screen.getByRole("button", { name: "Retry save" }));
    expect(onRetrySave).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Show your work")).toHaveValue("3x = 15");
  });

  it("uses a touch drag for ink but leaves touch gestures for typing once the editor is focused", () => {
    const onInkChange = vi.fn();
    renderSurface({ work: "", onInkChange });
    const pad = screen.getByLabelText("Handwriting work pad");

    fireEvent.pointerDown(pad, { pointerId: 7, pointerType: "touch", clientX: 12, clientY: 14 });
    fireEvent.pointerMove(pad, { pointerId: 7, pointerType: "touch", clientX: 60, clientY: 58 });
    fireEvent.pointerUp(pad, { pointerId: 7, pointerType: "touch", clientX: 60, clientY: 58 });
    expect(onInkChange).toHaveBeenCalledWith(expect.stringContaining('"version":3'));

    onInkChange.mockClear();
    const textarea = screen.getByLabelText("Show your work");
    textarea.focus();
    fireEvent.pointerDown(textarea, { pointerId: 8, pointerType: "touch", clientX: 20, clientY: 20 });
    fireEvent.pointerMove(textarea, { pointerId: 8, pointerType: "touch", clientX: 70, clientY: 70 });
    fireEvent.pointerUp(textarea, { pointerId: 8, pointerType: "touch", clientX: 70, clientY: 70 });
    expect(onInkChange).not.toHaveBeenCalled();
    expect(textarea).toHaveFocus();
  });
});
