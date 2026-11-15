// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDesignPreview } from "./today-design-preview";

vi.mock("./diana-idle-character", () => ({ DianaIdleCharacter: ({ paused }: { paused: boolean }) => <span data-character data-paused={paused} /> }));

let reduced = false;
let desktop = true;
const resizeListeners = new Set<() => void>();
const preview = () => <TodayDesignPreview motionReview compositionReview assetsReview lobbyReview />;

beforeEach(() => {
  reduced = false;
  desktop = true;
  resizeListeners.clear();
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-16T12:00:00Z"));
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
    get matches() { return query.includes("prefers-reduced-motion") ? reduced : query.includes("min-width") ? desktop : !desktop; },
    addEventListener: (_type: string, listener: () => void) => resizeListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => resizeListeners.delete(listener),
  })));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(0), 16));
  vi.stubGlobal("cancelAnimationFrame", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; this.querySelector<HTMLElement>("button")?.focus(); } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event("close")); } },
  });
});
afterEach(() => {
  cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
  Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
});

describe("Consolidated Lobby preview", () => {
  it("offers only Now, Progress, and Achievements and keeps the old preview opt-in boundary", () => {
    const { container, unmount } = render(preview());
    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Now", "Progress", "Achievements"]);
    expect(screen.getByRole("navigation", { name: "Primary" }).textContent).toContain("Lobby");
    expect(container.querySelectorAll("[data-today-stage-deck] > section")).toHaveLength(3);
    expect(container.querySelectorAll("section[inert]")).toHaveLength(2);
    expect(container.querySelector("[data-now-queue]")).toBeNull();
    expect(screen.queryByText(/next step/i)).toBeNull();
    expect(container.querySelector("[data-review-upcoming]")).toBeNull();
    unmount();
    render(<TodayDesignPreview motionReview compositionReview assetsReview />);
    expect(screen.getAllByRole("tab")).toHaveLength(6);
    expect(screen.getByRole("navigation", { name: "Primary" }).textContent).toContain("Lobby");
  });

  it("maps compact rail selection, keyboard focus, and panels consistently", () => {
    const { container } = render(preview());
    for (const [from, key, to] of [["Now", "ArrowDown", "Progress"], ["Progress", "End", "Achievements"], ["Achievements", "ArrowRight", "Now"], ["Now", "ArrowUp", "Achievements"], ["Achievements", "Home", "Now"]]) {
      fireEvent.keyDown(screen.getByRole("tab", { name: from }), { key });
      const selected = screen.getByRole("tab", { name: to });
      expect(document.activeElement).toBe(selected);
      expect(selected).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel", { name: to }).id).toBe(selected.getAttribute("aria-controls"));
      expect(container.querySelectorAll("section[inert]")).toHaveLength(2);
    }
  });

  it("unifies weekly results, interactive study activity, and class workload without duplicate charts", () => {
    const { container } = render(preview());
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    const panel = screen.getByRole("tabpanel", { name: "Progress" });
    expect(within(panel).getByRole("region", { name: "Weekly study activity" })).toBeTruthy();
    expect(within(panel).getByRole("region", { name: "By Class" })).toBeTruthy();
    expect(within(panel).getByRole("progressbar", { name: "Weekly assignments complete" })).toHaveAttribute("value", "5");
    expect(within(panel).queryByRole("heading", { name: "Study Mix" })).toBeNull();
    expect(panel.querySelectorAll("circle")).toHaveLength(0);
    fireEvent.click(within(panel).getByRole("button", { name: /Mon: 45 minutes/ }));
    expect(within(panel).getByRole("list", { name: "Class workload shares" }).textContent).toContain("History");
    expect(within(panel).getByRole("region", { name: "By Class" }).querySelectorAll("button")).toHaveLength(0);
    expect(within(panel).getByRole("button", { name: /Mon: 45 minutes/ })).toHaveAttribute("aria-pressed", "true");
    expect(container.querySelector("[data-today-stage-image] [data-character]")).toHaveAttribute("data-paused", "true");
  });

  it("preserves unfinished check-in values across closing, section switches, and reopening", () => {
    render(preview());
    const trigger = screen.getByRole("button", { name: "Check in" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Check-In" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Good" }));
    fireEvent.change(within(dialog).getByRole("slider", { name: "Sleep" }), { target: { value: "8.5" } });
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Movement type" }), { target: { value: "Dance" } });
    fireEvent.change(within(dialog).getByRole("slider", { name: "Movement minutes" }), { target: { value: "45" } });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Check-In" })).toBe(dialog);
    expect(within(dialog).getByRole("slider", { name: "Sleep" })).toHaveValue("8.5");
    expect(within(dialog).getByRole("slider", { name: "Movement minutes" })).toHaveValue("45");
    expect(within(dialog).getByRole("combobox", { name: "Movement type" })).toHaveValue("Dance");
    expect(within(dialog).getByRole("button", { name: "Good" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save check-in" }));
    expect(within(dialog).getByRole("button", { name: "Saved for today" })).toBeTruthy();
  });

  it("contains check-in keyboard focus and restores the trigger after closing", () => {
    render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Check in" }));
    const dialog = screen.getByRole("dialog", { name: "Check-In" });
    const close = within(dialog).getByRole("button", { name: "Close check-in" });
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Save check-in" }));
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.click(close);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Check in" }));
  });

  it("opens the full History workspace and preserves writing and Diana messages on resume", async () => {
    render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByRole("heading", { level: 1, name: "President Nixon: Three-Page Report" })).toHaveFocus();
    expect(screen.getByRole("region", { name: "Ask Diana" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Live voice" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add image or PDF" })).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Session notes" })).toBeNull();
    expect(screen.queryByRole("dialog", { name: "Check-In" })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Show your work" }), { target: { value: "Primary source" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Message Diana" }), { target: { value: "Can we plan my introduction?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    fireEvent.click(screen.getByRole("tab", { name: /Introduction/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Show your work" }), { target: { value: "My opening paragraph." } });
    fireEvent.click(screen.getByRole("button", { name: "Back to Lobby" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByRole("textbox", { name: "Show your work" })).toHaveValue("My opening paragraph.");
    fireEvent.click(screen.getByRole("tab", { name: /Plan/ }));
    expect(screen.getByRole("textbox", { name: "Show your work" })).toHaveValue("Primary source");
    expect(screen.getByRole("region", { name: "Diana conversation" })).toHaveTextContent("Can we plan my introduction?");
    fireEvent.click(within(screen.getByRole("navigation", { name: "Primary" })).getByRole("link", { name: "Lobby" }));
    expect(screen.getByRole("button", { name: "Resume" })).toBeVisible();
  });

  it("cancels a pending session launch when check-in opens", async () => {
    render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    fireEvent.click(screen.getByRole("button", { name: "Check in" }));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Check-In" })).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
  });

  it("preserves optional focus time on return without completing the report", async () => {
    render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("00:00");
    fireEvent.click(screen.getByRole("button", { name: "Start focus timer" }));
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Back to Lobby" }));
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    const panel = screen.getByRole("tabpanel", { name: "Progress" });
    expect(within(panel).getByText("2h 16m")).toBeTruthy();
    expect(within(panel).getByRole("progressbar", { name: "Weekly assignments complete" })).toHaveAttribute("value", "5");
    expect(within(panel).getByRole("list", { name: "Class workload shares" })).toHaveTextContent("History1h 30m30%");
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("tab", { name: "Now" }));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByLabelText("Focus elapsed time")).toHaveTextContent("01:00");
    expect(screen.getByRole("button", { name: "Start focus timer" })).toBeVisible();
  });

  it("keeps three readable phone sections and rescues focus at the desktop breakpoint", () => {
    const { container } = render(preview());
    const progress = screen.getByRole("tab", { name: "Progress" });
    fireEvent.click(progress); progress.focus();
    act(() => { desktop = false; resizeListeners.forEach(listener => listener()); });
    const panels = Array.from(container.querySelectorAll("[data-today-stage-deck] > section"));
    expect(panels.map(panel => panel.getAttribute("aria-label"))).toEqual(["Today's Plan", "Study Progress", "Achievements"]);
    expect(container.querySelectorAll("section[inert]")).toHaveLength(0);
    expect(document.activeElement).toBe(panels[1]);
    screen.getByRole("button", { name: "Check in" }).focus();
    act(() => { desktop = true; resizeListeners.forEach(listener => listener()); });
    expect(document.activeElement).toBe(progress);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("does not delay the session opening for reduced-motion users", async () => {
    reduced = true;
    render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("textbox", { name: "Message Diana" })).toBeVisible();
  });

  it("keeps an open phone check-in outside inactive desktop panels", () => {
    render(preview());
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    act(() => { desktop = false; resizeListeners.forEach(listener => listener()); });
    fireEvent.click(screen.getByRole("button", { name: "Check in" }));
    const close = screen.getByRole("button", { name: "Close check-in" });
    close.focus();
    act(() => { desktop = true; resizeListeners.forEach(listener => listener()); });
    expect(screen.getByRole("dialog", { name: "Check-In" }).closest("[inert], [aria-hidden='true']")).toBeNull();
    expect(document.activeElement).toBe(close);
    fireEvent.click(close);
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Progress" }));
  });

  it.each(["new", "complete", "unavailable", "busy"])("preserves meaningful %s states without inventing work", scenario => {
    const { container } = render(preview());
    fireEvent.click(screen.getByRole("button", { name: "Review controls" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Preview scenario" }), { target: { value: scenario } });
    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Check in" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Progress" }));
    const panel = screen.getByRole("tabpanel", { name: "Progress" });
    expect(panel.querySelector("[data-class-workload]")).toBeTruthy();
    expect(container.textContent).not.toContain("NaN");
    if (scenario === "unavailable") expect(within(panel).getByText("Study history temporarily unavailable.")).toBeTruthy();
    if (scenario === "new") expect(within(panel).getByText("No assignments planned this week.")).toBeTruthy();
  });
});
