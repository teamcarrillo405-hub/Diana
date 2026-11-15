// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceConceptReview } from "./workspace-concept-review";
import { FIXTURES } from "./fixtures";

let mobile = false;
const mediaListeners = new Set<() => void>();
beforeEach(() => {
  mobile = false;
  mediaListeners.clear();
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ media: query, get matches() { return mobile; }, addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn), removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn) })));
  // jsdom lacks the native modal top layer; explicit Tab boundary handling is tested below.
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.setAttribute("open", ""); this.querySelector<HTMLElement>("button[autofocus], button")?.focus(); }) });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) { this.removeAttribute("open"); }) });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const editor = () => screen.getByRole("textbox", { name: "Show your work" });
const openReview = () => { if (!screen.queryByRole("region", { name: "Work review preview" })) fireEvent.click(screen.getByRole("button", { name: "Review" })); };
const review = () => { openReview(); return screen.getByRole("checkbox", { name: "I reviewed this draft against the prompt and rubric." }); };
const complete = () => { openReview(); return screen.getByRole("button", { name: "Mark complete locally" }); };

describe("active work local interactions", () => {
  it("mirrors the existing center order: problem, conversation, composer, then work pad", () => {
    render(<WorkspaceConceptReview />);
    const panel = screen.getByRole("tabpanel", { name: /Problem 01/ });
    const problem = within(panel).getByRole("heading", { name: "3x + 5 = 20" });
    const chat = within(panel).getByRole("region", { name: "Ask Diana" });
    const composer = within(panel).getByRole("textbox", { name: "Message Diana" });
    expect(problem.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(composer.compareDocumentPosition(editor()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const name of ["Live voice", "Voice to text", "Send message", "Review"]) expect(within(panel).getByRole("button", { name })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Diana" })).not.toBeInTheDocument();
  });
  it("preserves real textarea drafts across unit and assignment switches with independent undo", () => {
    render(<WorkspaceConceptReview />);
    fireEvent.change(editor(), { target: { value: "My first step" } });
    fireEvent.click(screen.getByRole("tab", { name: /Problem 02/ }));
    expect(editor()).toHaveValue("");
    fireEvent.change(editor(), { target: { value: "My second step" } });
    fireEvent.click(screen.getByRole("tab", { name: /Problem 01/ }));
    expect(editor()).toHaveValue("My first step");
    fireEvent.change(screen.getByLabelText("Preview fixture"), { target: { value: "english" } });
    fireEvent.change(editor(), { target: { value: "My evidence paragraph" } });
    fireEvent.change(screen.getByLabelText("Preview fixture"), { target: { value: "algebra" } });
    expect(editor()).toHaveValue("My first step");
    fireEvent.click(screen.getByRole("button", { name: "Work tools" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo last edit" }));
    expect(editor()).toHaveValue(FIXTURES.algebra.units[0].draft);
    expect(editor()).toHaveFocus();
    fireEvent.click(screen.getByRole("tab", { name: /Problem 02/ }));
    expect(editor()).toHaveValue("My second step");
    fireEvent.change(screen.getByLabelText("Preview fixture"), { target: { value: "english" } });
    expect(editor()).toHaveValue("My evidence paragraph");
  });

  it("keeps empty-state edits separate and resets work on a fresh mount", () => {
    const rendered = render(<WorkspaceConceptReview initialScenario="empty" />);
    expect(editor()).toHaveValue("");
    expect(screen.getByRole("button", { name: "Review" })).toBeDisabled();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: "My empty fixture work" } });
    fireEvent.change(screen.getByLabelText("Preview state"), { target: { value: "draft" } });
    expect(editor()).toHaveValue(FIXTURES.algebra.units[0].draft);
    fireEvent.change(screen.getByLabelText("Preview state"), { target: { value: "empty" } });
    expect(editor()).toHaveValue("My empty fixture work");
    rendered.unmount();
    render(<WorkspaceConceptReview initialScenario="empty" />);
    expect(editor()).toHaveValue("");
  });

  it("moves selection and actual focus with arrows, Home, and End", () => {
    render(<WorkspaceConceptReview />);
    const first = screen.getByRole("tab", { name: /Problem 01/ });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    const second = screen.getByRole("tab", { name: /Problem 02/ });
    expect(second).toHaveFocus();
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(second, { key: "End" });
    const third = screen.getByRole("tab", { name: /Problem 03/ });
    expect(third).toHaveFocus();
    expect(screen.getByRole("heading", { name: "5x - 7 = 3x + 9" })).toBeInTheDocument();
    fireEvent.keyDown(third, { key: "Home" });
    expect(first).toHaveFocus();
  });

  it("supports human review and completion with no connection, and reopens work on edit", () => {
    render(<WorkspaceConceptReview initialFixture="english" initialScenario="connection-unavailable" />);
    expect(screen.getByText(/Connection unavailable example/)).toBeInTheDocument();
    expect(complete()).toBeDisabled();
    fireEvent.click(review());
    expect(complete()).toBeEnabled();
    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    fireEvent.click(complete());
    expect(screen.getByText("Complete in this preview. Nothing has been submitted.")).toBeInTheDocument();
    fireEvent.change(editor(), { target: { value: "A revised paragraph" } });
    expect(review()).not.toBeChecked();
    expect(complete()).toBeDisabled();
    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^submit/i })).not.toBeInTheDocument();
  });

  it("starts, stops, and resumes the clock without changing unit review or completion", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
    const rendered = render(<WorkspaceConceptReview />);
    expect(vi.getTimerCount()).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Start focus timer" }));
    act(() => vi.advanceTimersByTime(65000));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("01:05");
    fireEvent.click(screen.getByRole("button", { name: "Stop focus timer" }));
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("01:05");
    expect(review()).not.toBeChecked();
    expect(complete()).toBeDisabled();
    fireEvent.click(review());
    fireEvent.click(complete());
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("01:05");
    fireEvent.click(screen.getByRole("tab", { name: /Problem 02/ }));
    fireEvent.click(screen.getByRole("button", { name: "Start focus timer" }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("01:07");
    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    rendered.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps source and rubric secondary while Diana remains in the center", () => {
    render(<WorkspaceConceptReview />);
    const sourceTab = screen.getByRole("tab", { name: "Source" });
    sourceTab.focus();
    fireEvent.keyDown(sourceTab, { key: "ArrowRight" });
    const rubricTab = screen.getByRole("tab", { name: "Rubric" });
    expect(rubricTab).toHaveFocus();
    expect(screen.getByText("Show the operation on both sides.")).toBeVisible();
    fireEvent.keyDown(rubricTab, { key: "Home" });
    expect(sourceTab).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "Message Diana" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Live voice" })).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: /Problem 02/ }));
    expect(screen.getByText(FIXTURES.algebra.units[1].cue)).toBeVisible();
  });

  it("can complete every unit locally without submitting or stopping a running timer", () => {
    vi.useFakeTimers();
    render(<WorkspaceConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Start focus timer" }));
    for (let index = 1; index <= 3; index++) {
      fireEvent.click(screen.getByRole("tab", { name: new RegExp(`Problem 0${index}`) }));
      fireEvent.change(editor(), { target: { value: `Student reasoning for unit ${index}` } });
      fireEvent.click(review());
      fireEvent.click(complete());
      expect(screen.getByRole("button", { name: "Stop focus timer" })).toBeEnabled();
    }
    expect(screen.getByText("3 of 3 complete locally")).toBeInTheDocument();
    expect(screen.getByText("Not submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^submit/i })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("00:03");
  });

  it("opens the mobile modal, closes with Escape/cancel/button, and restores focus", () => {
    mobile = true;
    render(<WorkspaceConceptReview />);
    const trigger = screen.getByRole("button", { name: "Open source and rubric" });
    trigger.focus();
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "Assignment inspector" });
    expect(sheet).toHaveAttribute("open");
    expect(within(sheet).getByRole("button", { name: "Close inspector" })).toHaveFocus();
    fireEvent.click(within(sheet).getByRole("tab", { name: "Rubric" }));
    expect(within(sheet).getByText("Show the operation on both sides.")).toBeVisible();
    fireEvent.keyDown(sheet, { key: "Escape" });
    expect(sheet).not.toHaveAttribute("open");
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent(sheet, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(trigger).toHaveFocus();
    expect(sheet).not.toHaveAttribute("open");
    fireEvent.click(trigger);
    fireEvent.click(within(sheet).getByRole("button", { name: "Close inspector" }));
    expect(trigger).toHaveFocus();
  });

  it.each(["Source", "Rubric"])("contains Tab and Shift+Tab in the active %s sheet panel", mode => {
    mobile = true;
    render(<WorkspaceConceptReview />);
    fireEvent.click(screen.getByRole("button", { name: "Open source and rubric" }));
    const sheet = screen.getByRole("dialog", { name: "Assignment inspector" });
    const close = within(sheet).getByRole("button", { name: "Close inspector" });
    const selectedTab = within(sheet).getByRole("tab", { name: mode });
    fireEvent.click(selectedTab);
    const panel = within(sheet).getByRole("tabpanel", { name: mode });
    const hiddenPanels = Array.from(sheet.querySelectorAll<HTMLElement>('[role="tabpanel"][hidden]'));
    expect(hiddenPanels).toHaveLength(1);
    for (const hidden of hiddenPanels) expect(hidden).toHaveAttribute("tabindex", "0");

    close.focus();
    expect(fireEvent.keyDown(close, { key: "Tab", shiftKey: true })).toBe(false);
    expect(panel).toHaveFocus();
    expect(fireEvent.keyDown(panel, { key: "Tab" })).toBe(false);
    expect(close).toHaveFocus();
    for (const hidden of hiddenPanels) expect(hidden).not.toHaveFocus();

    // Interior moves retain native browser ordering rather than overriding it.
    expect(fireEvent.keyDown(close, { key: "Tab" })).toBe(true);
    selectedTab.focus();
    expect(fireEvent.keyDown(selectedTab, { key: "Tab" })).toBe(true);
    expect(fireEvent.keyDown(selectedTab, { key: "Tab", shiftKey: true })).toBe(true);
  });

  it("closes the modal on desktop resize without losing the draft", () => {
    mobile = true;
    render(<WorkspaceConceptReview />);
    fireEvent.change(editor(), { target: { value: "Work before resize" } });
    fireEvent.click(screen.getByRole("button", { name: "Open source and rubric" }));
    act(() => { mobile = false; mediaListeners.forEach(listener => listener()); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(editor()).toHaveFocus();
    expect(editor()).toHaveValue("Work before resize");
    expect(screen.getByRole("complementary", { name: "Assignment inspector" })).toBeInTheDocument();
  });

  it("never uses storage, network, permissions, or history during local interactions", () => {
    const fetch = vi.fn(() => { throw new Error("Unexpected network call"); });
    vi.stubGlobal("fetch", fetch);
    const get = vi.spyOn(Storage.prototype, "getItem");
    const set = vi.spyOn(Storage.prototype, "setItem");
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");
    const request = vi.fn();
    vi.stubGlobal("Notification", { requestPermission: request });
    render(<WorkspaceConceptReview />);
    fireEvent.change(editor(), { target: { value: "Local work" } });
    fireEvent.click(review());
    fireEvent.click(complete());
    fireEvent.change(screen.getByLabelText("Preview fixture"), { target: { value: "english" } });
    fireEvent.change(screen.getByLabelText("Preview state"), { target: { value: "connection-unavailable" } });
    fireEvent.click(screen.getByRole("button", { name: "Live voice" }));
    for (const spy of [fetch, get, set, replace, push, request]) expect(spy).not.toHaveBeenCalled();
  });
});
