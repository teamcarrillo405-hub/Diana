// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { createRef, useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";

import { parseAssignmentInkDocument, serializeAssignmentInk } from "@/lib/assignment-ink";
import { PreviewWorkPad, type PreviewWorkPadProps } from "./preview-work-pad";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const sampleInk = serializeAssignmentInk([{ id: "existing", points: [{ x: 20, y: 30 }, { x: 120, y: 30 }] }]);
const editor = () => screen.getByRole("textbox", { name: "Show your work" });
const inkLayer = () => screen.getByRole("img", { name: "Handwriting work pad" });
const paper = () => editor().parentElement!;
const button = (name: string) => screen.getByRole("button", { name });
const openTools = () => fireEvent.click(button("Work tools"));

function renderPad(overrides: Partial<PreviewWorkPadProps> = {}) {
  const props: PreviewWorkPadProps = {
    work: "", ink: "", onWorkChange: vi.fn(), onInkChange: vi.fn(),
    onReview: vi.fn(), onUndoText: vi.fn(), canUndoText: false, ...overrides,
  };
  const submit = vi.fn();
  function Harness() {
    const [work, setWork] = useState(props.work);
    const [ink, setInk] = useState(props.ink);
    return <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <PreviewWorkPad {...props} work={work} ink={ink}
        onWorkChange={(value) => { setWork(value); props.onWorkChange(value); }}
        onInkChange={(value) => { setInk(value); props.onInkChange(value); }} />
    </form>;
  }
  return { ...render(<Harness />), props, submit };
}

function pointer(pointerType: "pen" | "mouse" | "touch", x: number, y: number, pointerId = 1) {
  return { pointerType, pointerId, isPrimary: true, button: 0, buttons: 1, clientX: x, clientY: y };
}

function draw(pointerType: "pen" | "mouse" | "touch" = "mouse") {
  fireEvent.pointerDown(editor(), pointer(pointerType, 20, 30));
  fireEvent.pointerMove(editor(), pointer(pointerType, 120, 30));
  fireEvent.pointerUp(editor(), { ...pointer(pointerType, 120, 30), buttons: 0 });
}

describe("PreviewWorkPad", () => {
  it("keeps multiline typing native, exposes the parent ref, and never submits on Enter", () => {
    const ref = createRef<HTMLTextAreaElement>();
    const { props, submit } = renderPad({ editorRef: ref });
    expect(ref.current).toBe(editor());
    expect(editor()).toHaveAttribute("id", "student-work");
    act(() => ref.current?.focus());
    expect(editor()).toHaveFocus();
    expect(fireEvent.keyDown(editor(), { key: "Enter", code: "Enter" })).toBe(true);
    fireEvent.change(editor(), { target: { value: "3x = 15\nx = 5" } });
    expect(editor()).toHaveValue("3x = 15\nx = 5");
    expect(props.onWorkChange).toHaveBeenLastCalledWith("3x = 15\nx = 5");
    expect(props.onReview).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(button("Review")).toBeEnabled();
    fireEvent.click(button("Review"));
    expect(props.onReview).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText("Preview only")).toBeInTheDocument();
  });

  it.each(["", " ", "bad ink", '{"version":3,"logicalWidth":640,"logicalHeight":300,"strokes":[]}'])("disables Review for empty work and unusable ink: %s", (ink) => {
    const { props } = renderPad({ work: " \n ", ink });
    expect(button("Review")).toBeDisabled();
    fireEvent.click(button("Review"));
    expect(props.onReview).not.toHaveBeenCalled();
  });

  it("enables Review for handwriting alone", () => {
    renderPad({ ink: sampleInk });
    expect(button("Review")).toBeEnabled();
    expect(inkLayer().querySelector("polyline")).toHaveAttribute("points", "20,30 120,30");
  });

  it.each(["mouse", "touch"] as const)("uses a %s tap for typing, not ink", (pointerType) => {
    const { props } = renderPad();
    fireEvent.pointerDown(editor(), pointer(pointerType, 20, 30));
    fireEvent.pointerMove(editor(), pointer(pointerType, 22, 31));
    fireEvent.pointerUp(editor(), { ...pointer(pointerType, 22, 31), buttons: 0 });
    expect(editor()).toHaveFocus();
    expect(props.onInkChange).not.toHaveBeenCalled();
    expect(inkLayer().children).toHaveLength(0);
  });

  it.each(["pen", "mouse", "touch"] as const)("draws with %s on the textarea, then supports ink undo and redo", (pointerType) => {
    const { props } = renderPad();
    openTools();
    expect(button("Undo handwriting")).toBeDisabled();
    expect(button("Redo handwriting")).toBeDisabled();
    draw(pointerType);
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    const lastInk = vi.mocked(props.onInkChange).mock.calls.at(-1)![0];
    expect(parseAssignmentInkDocument(lastInk)).toMatchObject({ version: 3, strokes: [{ points: [{ x: 20, y: 30 }, { x: 120, y: 30 }] }] });
    expect(button("Undo handwriting")).toBeEnabled();
    fireEvent.click(button("Undo handwriting"));
    expect(inkLayer().children).toHaveLength(0);
    expect(button("Review")).toBeDisabled();
    expect(button("Undo handwriting")).toBeDisabled();
    expect(button("Redo handwriting")).toBeEnabled();
    fireEvent.click(button("Redo handwriting"));
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    expect(props.onInkChange).toHaveBeenLastCalledWith(lastInk);
  });

  it("renders a pen dot and immediately enables undo", () => {
    renderPad();
    openTools();
    fireEvent.pointerDown(editor(), pointer("pen", 50, 50));
    fireEvent.pointerUp(editor(), { ...pointer("pen", 50, 50), buttons: 0 });
    expect(inkLayer().querySelector("circle")).toHaveAttribute("cx", "50");
    fireEvent.click(button("Undo handwriting"));
    expect(inkLayer().children).toHaveLength(0);
  });

  it("erases a swept stroke and undoes the entire eraser gesture without changing text", () => {
    const { props } = renderPad({ work: "Keep my reasoning", ink: sampleInk });
    openTools();
    fireEvent.click(button("Eraser"));
    expect(button("Eraser")).toHaveAttribute("aria-pressed", "true");
    fireEvent.pointerDown(editor(), pointer("mouse", 70, 5));
    fireEvent.pointerMove(editor(), pointer("mouse", 70, 70));
    fireEvent.pointerUp(editor(), { ...pointer("mouse", 70, 70), buttons: 0 });
    expect(inkLayer().children).toHaveLength(0);
    expect(props.onInkChange).toHaveBeenLastCalledWith("");
    expect(editor()).toHaveValue("Keep my reasoning");
    fireEvent.click(button("Undo handwriting"));
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    fireEvent.click(button("Redo handwriting"));
    expect(inkLayer().children).toHaveLength(0);
    expect(props.onWorkChange).not.toHaveBeenCalled();
  });

  it("ignores a no-op eraser gesture and abandons redo after a new stroke", () => {
    renderPad({ ink: sampleInk });
    openTools();
    fireEvent.click(button("Eraser"));
    fireEvent.pointerDown(editor(), pointer("mouse", 300, 200));
    fireEvent.pointerUp(editor(), { ...pointer("mouse", 300, 200), buttons: 0 });
    expect(button("Undo handwriting")).toBeDisabled();
    fireEvent.click(button("Pen"));
    draw();
    fireEvent.click(button("Undo handwriting"));
    expect(button("Redo handwriting")).toBeEnabled();
    draw("pen");
    expect(button("Redo handwriting")).toBeDisabled();
  });

  it("rejects secondary pointers and rolls back cancelled drawing or erasing", () => {
    const { props } = renderPad({ ink: sampleInk });
    openTools();
    fireEvent.pointerDown(editor(), { ...pointer("mouse", 20, 30), button: 2 });
    fireEvent.pointerMove(editor(), { ...pointer("mouse", 120, 30), buttons: 2 });
    fireEvent.pointerUp(editor(), { ...pointer("mouse", 120, 30), button: 2, buttons: 0 });
    expect(props.onInkChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(editor(), pointer("pen", 20, 60));
    fireEvent.pointerMove(editor(), pointer("pen", 120, 60, 2));
    fireEvent.pointerUp(editor(), pointer("pen", 120, 60, 2));
    expect(props.onInkChange).not.toHaveBeenCalled();
    fireEvent.pointerCancel(editor(), pointer("pen", 120, 60));
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    expect(inkLayer().querySelectorAll("circle")).toHaveLength(0);
    fireEvent.click(button("Eraser"));
    fireEvent.pointerDown(editor(), pointer("mouse", 30, 30));
    expect(inkLayer().children).toHaveLength(0);
    fireEvent.pointerCancel(editor(), pointer("mouse", 30, 30));
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    expect(props.onInkChange).not.toHaveBeenCalled();
    expect(button("Undo handwriting")).toBeDisabled();
  });

  it("keeps touch scrolling native while typing, with pen drawing still available", () => {
    const { props } = renderPad();
    act(() => editor().focus());
    expect(paper()).toHaveAttribute("data-typing", "true");
    draw("touch");
    expect(editor()).toHaveFocus();
    expect(props.onInkChange).not.toHaveBeenCalled();
    draw("pen");
    expect(props.onInkChange).toHaveBeenCalledOnce();
    expect(paper()).not.toHaveAttribute("data-typing");
  });

  it("discloses tools and changes paper without changing content", () => {
    const { props } = renderPad({ work: "Keep this", ink: sampleInk });
    expect(button("Work tools")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "Work paper" })).not.toBeInTheDocument();
    openTools();
    expect(button("Work tools")).toHaveAttribute("aria-expanded", "true");
    expect(button("Lined paper")).toHaveAttribute("aria-pressed", "true");
    for (const label of ["Blank", "Graph", "Lined"]) {
      fireEvent.click(button(`${label} paper`));
      expect(button(`${label} paper`)).toHaveAttribute("aria-pressed", "true");
      expect(paper()).toHaveAttribute("data-paper", label.toLowerCase());
    }
    expect(editor()).toHaveValue("Keep this");
    expect(props.onWorkChange).not.toHaveBeenCalled();
    expect(props.onInkChange).not.toHaveBeenCalled();
  });

  it("clears and recovers both text and handwriting, including focus", () => {
    const { props, submit } = renderPad({ work: "3x = 15\nx = 5", ink: sampleInk });
    openTools();
    fireEvent.click(button("Clear work"));
    expect(editor()).toHaveValue("");
    expect(inkLayer().children).toHaveLength(0);
    expect(button("Review")).toBeDisabled();
    expect(button("Clear work")).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Work cleared");
    fireEvent.click(button("Undo clear"));
    expect(editor()).toHaveValue("3x = 15\nx = 5");
    expect(editor()).toHaveFocus();
    expect(props.onInkChange).toHaveBeenLastCalledWith(sampleInk);
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Undo clear" })).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it("discards clear recovery when new work is entered", () => {
    renderPad({ work: "Old work", ink: sampleInk });
    openTools();
    fireEvent.click(button("Clear work"));
    fireEvent.change(editor(), { target: { value: "New work" } });
    expect(screen.queryByRole("button", { name: "Undo clear" })).not.toBeInTheDocument();
    fireEvent.click(button("Clear work"));
    draw("pen");
    expect(screen.queryByRole("button", { name: "Undo clear" })).not.toBeInTheDocument();
  });

  it("delegates text undo to the parent and restores textarea focus", () => {
    const { props } = renderPad({ work: "A step", canUndoText: true });
    openTools();
    fireEvent.click(button("Undo last edit"));
    expect(props.onUndoText).toHaveBeenCalledOnce();
    expect(props.onInkChange).not.toHaveBeenCalled();
    expect(editor()).toHaveFocus();
  });

  it("synchronizes externally selected drafts without leaking ink undo or clear recovery", () => {
    const props: PreviewWorkPadProps = {
      work: "Unit one", ink: sampleInk, onWorkChange: vi.fn(), onInkChange: vi.fn(),
      onReview: vi.fn(), onUndoText: vi.fn(), canUndoText: false,
    };
    const { rerender } = render(<PreviewWorkPad {...props} />);
    openTools();
    draw();
    expect(button("Undo handwriting")).toBeEnabled();
    rerender(<PreviewWorkPad {...props} work="Unit two" ink="" />);
    expect(editor()).toHaveValue("Unit two");
    expect(inkLayer().children).toHaveLength(0);
    expect(button("Undo handwriting")).toBeDisabled();
    expect(button("Redo handwriting")).toBeDisabled();
    expect(button("Undo last edit")).toBeDisabled();
    rerender(<PreviewWorkPad {...props} />);
    expect(inkLayer().querySelectorAll("polyline")).toHaveLength(1);
    fireEvent.click(button("Clear work"));
    rerender(<PreviewWorkPad {...props} work="Unit two" ink="" />);
    expect(screen.queryByRole("button", { name: "Undo clear" })).not.toBeInTheDocument();
  });

  it("resizes the entire writing surface by keyboard, click, or drag with bounded dimensions", () => {
    const { props } = renderPad();
    const handle = screen.getByRole("slider", { name: "Work area height" });
    expect(handle).toHaveAttribute("aria-valuenow", "300");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(paper()).toHaveStyle({ height: "340px" });
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(handle).toHaveAttribute("aria-valuenow", "250");
    fireEvent.keyDown(handle, { key: "End" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(handle).toHaveAttribute("aria-valuenow", "1200");
    fireEvent.keyDown(handle, { key: "Home" });
    fireEvent.click(handle);
    expect(handle).toHaveAttribute("aria-valuenow", "370");
    fireEvent.pointerDown(handle, pointer("mouse", 100, 370));
    fireEvent.pointerMove(handle, pointer("mouse", 100, 500));
    fireEvent.pointerUp(handle, { ...pointer("mouse", 100, 500), buttons: 0 });
    fireEvent.click(handle);
    expect(handle).toHaveAttribute("aria-valuenow", "500");
    expect(props.onInkChange).not.toHaveBeenCalled();
  });

  it("maps pointer coordinates to the existing ink document and extends paper without stretching strokes", () => {
    let observerCallback: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { observerCallback = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const { props, unmount } = renderPad({ ink: sampleInk });
    vi.spyOn(paper(), "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, width: 320, height: 300 } as DOMRect);
    act(() => observerCallback?.([{ contentRect: { width: 320, height: 300 } } as ResizeObserverEntry], {} as ResizeObserver));
    expect(inkLayer()).toHaveAttribute("viewBox", "0 0 640 600");
    expect(inkLayer().querySelector("polyline")).toHaveAttribute("points", "20,30 120,30");
    expect(props.onInkChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(editor(), pointer("pen", 30, 40));
    fireEvent.pointerMove(editor(), pointer("pen", 60, 50));
    fireEvent.pointerUp(editor(), { ...pointer("pen", 60, 50), buttons: 0 });
    const finalInk = vi.mocked(props.onInkChange).mock.calls.at(-1)![0];
    expect(parseAssignmentInkDocument(finalInk).strokes[1].points).toEqual([{ x: 40, y: 40 }, { x: 100, y: 60 }]);
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("keeps all interactions local without storage, network, or microphone access", () => {
    const fetch = vi.fn();
    const getUserMedia = vi.fn();
    vi.stubGlobal("fetch", fetch);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    const spies = ["getItem", "setItem", "removeItem", "clear"].map((method) => vi.spyOn(Storage.prototype, method as "getItem"));
    const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
    renderPad({ work: "Local" });
    openTools();
    fireEvent.click(button("Graph paper"));
    draw();
    fireEvent.click(button("Undo handwriting"));
    fireEvent.click(button("Redo handwriting"));
    fireEvent.click(button("Clear work"));
    fireEvent.click(button("Undo clear"));
    fireEvent.click(button("Review"));
    fireEvent.keyDown(screen.getByRole("slider"), { key: "ArrowDown" });
    for (const spy of [...spies, fetch, xhr, getUserMedia]) expect(spy).not.toHaveBeenCalled();
  });

  it("imports only React, Lucide, the pure ink helper, and route-local CSS", () => {
    const filename = path.resolve("app/landing-3d/workspace-concept-review/preview-work-pad.tsx");
    const source = readFileSync(filename, "utf8");
    const parsed = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = parsed.statements.filter(ts.isImportDeclaration).map((statement) => (statement.moduleSpecifier as ts.StringLiteral).text);
    expect(imports.sort()).toEqual(["react", "lucide-react", "@/lib/assignment-ink", "./preview-work-pad.module.css"].sort());
    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|getUserMedia|import\s*\(|require\s*\()/);
    const helper = readFileSync(path.resolve("lib/assignment-ink.ts"), "utf8");
    expect(ts.createSourceFile("assignment-ink.ts", helper, ts.ScriptTarget.Latest).statements.filter(ts.isImportDeclaration)).toHaveLength(0);
  });
});
