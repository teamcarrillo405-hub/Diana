// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TodayDesignPreview } from "./today-design-preview";
import type { PreviewSessionServices } from "./use-preview-launch";
import { DianaIdleCharacter } from "./diana-idle-character";
import { createAchievementLedger } from "@/lib/dashboard/achievements";
import { PREVIEW_ACHIEVEMENTS_KEY, seedPreviewAchievements } from "./use-preview-achievements";

vi.mock("./diana-idle-character", () => ({ DianaIdleCharacter: vi.fn(({ paused }: { paused: boolean }) => <div data-character-paused={paused} />) }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 0));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

function setup(sessionServices?: PreviewSessionServices) {
  return render(<TodayDesignPreview motionReview compositionReview assetsReview sessionServices={sessionServices} />);
}
function click(name: string | RegExp) {
  const button = screen.getByRole("button", { name });
  button.focus();
  fireEvent.click(button);
  return button;
}
async function flush() { await act(async () => { await Promise.resolve(); }); }
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function tab(name: string) { fireEvent.click(screen.getByRole("tab", { name })); }

describe("authored asset-review handoff", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: !query.includes("prefers-reduced-motion"), addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });

  it("keeps character asset identity stable across timeline and playback-status updates", () => {
    render(<TodayDesignPreview motionReview compositionReview assetsReview characterAssets={{ poster: "/poster.webp", motion: "/motion.webm", posterPose: "relit", motionPose: "relit" }} />);
    const initial = vi.mocked(DianaIdleCharacter).mock.calls[0][0].assets;
    tab("This Week");
    act(() => vi.advanceTimersByTime(80));
    const latest = vi.mocked(DianaIdleCharacter).mock.calls.at(-1)![0];
    act(() => latest.onStatusChange?.("playing"));
    for (const [props] of vi.mocked(DianaIdleCharacter).mock.calls) expect(props.assets).toBe(initial);
  });

  it("acknowledges Start immediately, opens once after 180ms, and never flashes waiting copy", () => {
    const { container } = setup();
    const start = click("Start");
    expect(start.getAttribute("aria-busy")).toBe("true");
    expect(container.querySelector('[data-menu-sequence="launch"]')).toBeTruthy();
    fireEvent.click(start);
    act(() => vi.advanceTimersByTime(179));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: "Session notes" })).toBeTruthy();
    expect(screen.queryByText("Opening session...")).toBeNull();
    expect(container.querySelector('[data-menu-sequence="session"]')).toBeTruthy();
    click("Back to Today");
    expect(document.activeElement).toBe(start);
    expect(container.querySelector('[data-menu-sequence="return"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-character-paused="true"]')).toHaveLength(2);
    act(() => vi.advanceTimersByTime(180));
    expect(container.querySelectorAll('[data-character-paused="false"]')).toHaveLength(2);
  });

  it("starts actual readiness immediately and shows waiting only for genuinely slow work", async () => {
    const pending = deferred();
    const open = vi.fn(() => pending.promise);
    setup({ open });
    click("Start");
    expect(open).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(499));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("Opening session...")).toBeTruthy();
    await act(async () => pending.resolve());
    expect(screen.getByRole("textbox", { name: "Session notes" })).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("new navigation cancels a pending session handoff and stale effects", async () => {
    const pending = deferred();
    const open = vi.fn((_task, _signal) => pending.promise);
    const { container } = setup({ open });
    click("Start");
    tab("Check-In");
    expect(open.mock.calls[0][1].aborted).toBe(true);
    await act(async () => pending.resolve());
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("tab", { name: "Check-In" }).getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector('[data-menu-sequence="idle"]')).toBeTruthy();
  });

  it("same-tab selection is silent and does not restart the timeline", () => {
    const { container } = setup();
    tab("Now");
    expect(container.querySelector('[data-menu-sequence="idle"]')).toBeTruthy();
    tab("Study Mix");
    act(() => vi.advanceTimersByTime(80));
    expect(container.querySelector('[data-menu-sequence="content"]')).toBeTruthy();
    tab("Study Mix");
    expect(container.querySelector('[data-menu-sequence="content"]')).toBeTruthy();
  });
});

describe("Now start, return, and resume", () => {
  it("awards First Check-In on save, not on editing, without advancing weekly work", () => {
    const ledger = createAchievementLedger(seedPreviewAchievements("typical").events.filter(event => event.kind !== "check-in"));
    localStorage.setItem(`${PREVIEW_ACHIEVEMENTS_KEY}.typical`, JSON.stringify(ledger));
    const { container } = setup();
    tab("Check-In");
    click("Good");
    tab("Achievements");
    expect(screen.getByRole("button", { name: /First Check-In\. 0 of 1/ }).getAttribute("data-earned")).toBe("false");
    tab("Check-In");
    click("Save check-in");
    tab("Achievements");
    expect(screen.getByRole("button", { name: /First Check-In\. Earned/ }).getAttribute("data-earned")).toBe("true");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 6 of 10/ })).toBeTruthy();
    const feature = screen.getByRole("region", { name: "This week's award" });
    expect(within(feature).getByRole("progressbar").getAttribute("value")).toBe("5");
    expect(container.querySelector('[data-weekly-award="earned"]')).toBeNull();
  });

  it("preserves notes and measured time, excludes time away, and restores Start as Resume", async () => {
    const { container } = setup();
    const start = click("Start");
    expect(container.querySelectorAll('[data-character-paused="true"]')).toHaveLength(2);
    fireEvent.change(screen.getByRole("textbox", { name: "Session notes" }), { target: { value: "Keep these sources" } });
    act(() => vi.advanceTimersByTime(65000));
    click("Back to Today");
    expect(screen.getByRole("button", { name: "Resume" })).toBe(start);
    expect(document.activeElement).toBe(start);
    act(() => vi.advanceTimersByTime(60000));
    click("Resume");
    expect((screen.getByRole("textbox", { name: "Session notes" }) as HTMLTextAreaElement).value).toBe("Keep these sources");
    expect(screen.getByLabelText("Time remaining").textContent).toBe("23:55");
    click("Finish session");
    await flush();
    expect(screen.getByText("01:05")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Back to Today" })[0]);
    expect(screen.getByRole("button", { name: "Start" })).toBe(start);
    expect(screen.queryByRole("progressbar", { name: "Assignments completed this week" })).toBeNull();
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 7 of 10 complete/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Five Submitted\. 3 of 5 complete/ })).toBeTruthy();
  });

  it("returns a queued session to its exact invoking row and keeps the primary task separate", () => {
    const { container } = setup();
    const row = click(/Algebra I.*Linear equations practice/);
    expect(document.activeElement).toBe(within(screen.getByRole("dialog")).getByRole("heading", { name: "Linear equations practice" }));
    expect(container.querySelectorAll('[data-character-paused="true"]')).toHaveLength(2);
    click("Start session");
    act(() => vi.advanceTimersByTime(12000));
    fireEvent.change(screen.getByRole("textbox", { name: "Session notes" }), { target: { value: "Math notes" } });
    click("Back to Today");
    expect(document.activeElement).toBe(row);
    expect(row.getAttribute("data-session-paused")).toBe("true");
    expect(row.textContent).toContain("Paused");
    expect(row.textContent).toContain("20 min left");
    expect(screen.getByRole("tab", { name: "Now" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
    click(/Algebra I.*Linear equations practice/);
    click("Resume session");
    expect(screen.getByLabelText("Time remaining").textContent).toBe("19:48");
    expect((screen.getByRole("textbox", { name: "Session notes" }) as HTMLTextAreaElement).value).toBe("Math notes");
  });

  it("restores task-detail focus and keeps Check-In input across categories", () => {
    const { container } = setup();
    const row = click(/Algebra I.*Linear equations practice/);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(row);
    expect(container.querySelectorAll('[data-character-paused="false"]')).toHaveLength(2);
    tab("Check-In");
    click("Good");
    fireEvent.change(screen.getByRole("slider", { name: "Sleep" }), { target: { value: "8.5" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Movement type" }), { target: { value: "Bike" } });
    fireEvent.change(screen.getByRole("slider", { name: "Movement minutes" }), { target: { value: "35" } });
    for (const category of ["Now", "This Week", "Upcoming", "Study Mix", "Achievements", "Check-In"]) tab(category);
    expect((screen.getByRole("combobox", { name: "Movement type" }) as HTMLSelectElement).value).toBe("Bike");
    expect((screen.getByRole("slider", { name: "Movement minutes" }) as HTMLInputElement).value).toBe("35");
    click("Save check-in");
    tab("Now");
    click("Start");
    click("Back to Today");
    tab("Check-In");
    expect(screen.getByRole("button", { name: "Good" }).getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("slider", { name: "Sleep" }) as HTMLInputElement).value).toBe("8.5");
    expect((screen.getByRole("combobox", { name: "Movement type" }) as HTMLSelectElement).value).toBe("Bike");
    expect((screen.getByRole("slider", { name: "Movement minutes" }) as HTMLInputElement).value).toBe("35");
    expect(screen.getByRole("button", { name: "Saved for today" })).toBeTruthy();
  });

  it("ignores duplicate Start, delays waiting copy, and ignores a canceled late launch", async () => {
    const pending = deferred();
    const open = vi.fn((_task, _signal) => pending.promise);
    setup({ open });
    const start = click("Start");
    expect(start.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(start);
    expect(open).toHaveBeenCalledOnce();
    expect(screen.queryByText("Opening session...")).toBeNull();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByText("Opening session...")).toBeTruthy();
    click("Back to Today");
    expect(open.mock.calls[0][1].aborted).toBe(true);
    await act(async () => pending.resolve());
    act(() => vi.advanceTimersByTime(20));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(start);
    expect(screen.getByRole("button", { name: "Start" }).getAttribute("aria-disabled")).toBeNull();
    expect(start.getAttribute("aria-busy")).toBeNull();
  });

  it("bounds an actual readiness wait and retries the captured task without stale opens", async () => {
    const first = deferred();
    const open = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);
    setup({ open });
    click(/Algebra I.*Linear equations practice/);
    click("Start session");
    act(() => vi.advanceTimersByTime(10000));
    expect(open.mock.calls[0][1].aborted).toBe(true);
    expect(screen.getByText("The session could not open. Your work is unchanged.")).toBeTruthy();
    click("Retry");
    await flush();
    expect(screen.getByRole("textbox", { name: "Session notes" })).toBeTruthy();
    expect(open.mock.calls.map(call => call[0].id)).toEqual(["math", "math"]);
    await act(async () => first.resolve());
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByLabelText("Time remaining").textContent).toBe("20:00");
  });

  it("does not claim a recording or play success until save succeeds, then counts once on retry", async () => {
    const record = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValue(undefined);
    setup({ record });
    click("Start");
    act(() => vi.advanceTimersByTime(10000));
    click("Finish session");
    await flush();
    expect(screen.queryByText("Time well spent.")).toBeNull();
    click(/Retry/);
    await flush();
    expect(record.mock.calls.map(call => call[1])).toEqual([10, 10]);
    expect(screen.getByText("00:10")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Back to Today" })[0]);
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 7 of 10 complete/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Five Finished\. Earned/ })).toBeTruthy();
  });

  it("aborts an unfinished recording when leaving and ignores its late result", async () => {
    const pending = deferred();
    const record = vi.fn((_task, _seconds, _signal) => pending.promise);
    setup({ record });
    click("Start");
    act(() => vi.advanceTimersByTime(10000));
    click("Finish session");
    click("Back to Today");
    expect(record.mock.calls[0][2].aborted).toBe(true);
    await act(async () => pending.resolve());
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 6 of 10 complete/ })).toBeTruthy();
    tab("Now");
    click("Resume");
    expect(screen.getByLabelText("Time remaining").textContent).toBe("24:50");
  });

  it("never submits work from the submission preview", () => {
    setup();
    tab("Upcoming");
    const row = click(/Paragraph evidence check/);
    click("Review submission");
    expect(screen.getByText(/Nothing has been submitted from this preview/)).toBeTruthy();
    click("Close details");
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(row);
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Five Submitted\. 3 of 5 complete/ })).toBeTruthy();
  });

  it("opens a fourth deadline from View all and returns its session to the list opener", () => {
    setup();
    click("Review controls");
    fireEvent.change(screen.getByRole("combobox", { name: "Preview scenario" }), { target: { value: "busy" } });
    click("Review controls");
    tab("Upcoming");
    const opener = click("View all upcoming work");
    expect(within(screen.getByRole("dialog", { name: "Upcoming work" })).getByRole("list").hasAttribute("data-deadline-dialog-list")).toBe(true);
    const fourth = within(screen.getByRole("dialog", { name: "Upcoming work" })).getByRole("button", { name: /Cell structure and functions/ });
    fourth.focus();
    fireEvent.click(fourth);
    expect(screen.getByRole("dialog", { name: "Cell structure and functions" })).toBeTruthy();
    click("Start session");
    expect(screen.getByRole("timer").textContent).toBe("30:00");
    click("Back to Today");
    expect(document.activeElement).toBe(opener);
    expect(screen.getByRole("tab", { name: "Upcoming" }).getAttribute("aria-selected")).toBe("true");
  });

  it("reviews ready work from View all without submitting and restores the list opener", () => {
    setup();
    tab("Upcoming");
    const opener = click("View all upcoming work");
    const ready = within(screen.getByRole("dialog", { name: "Upcoming work" })).getByRole("button", { name: /Paragraph evidence check/ });
    ready.focus();
    fireEvent.click(ready);
    click("Review submission");
    expect(screen.getByText(/Nothing has been submitted from this preview/)).toBeTruthy();
    click("Close details");
    act(() => vi.advanceTimersByTime(20));
    expect(document.activeElement).toBe(opener);
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Five Submitted\. 3 of 5 complete/ })).toBeTruthy();
  });

  it("does not open a late session when the event loop delays the timeout callback", async () => {
    const pending = deferred();
    const open = vi.fn(() => pending.promise);
    setup({ open });
    click("Start");
    vi.setSystemTime(Date.now() + 11000);
    await act(async () => pending.resolve());
    expect(screen.queryByRole("textbox", { name: "Session notes" })).toBeNull();
    expect(screen.getByText("The session could not open. Your work is unchanged.")).toBeTruthy();
  });

  it("does not count a late recording when the event loop delays its timeout callback", async () => {
    const pending = deferred();
    setup({ record: () => pending.promise });
    click("Start");
    act(() => vi.advanceTimersByTime(5000));
    click("Finish session");
    vi.setSystemTime(Date.now() + 11000);
    await act(async () => pending.resolve());
    expect(screen.queryByText("Time well spent.")).toBeNull();
    click("Back to Today");
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 6 of 10 complete/ })).toBeTruthy();
  });

  it("uses one recording deadline even when the parent callback starts later", async () => {
    const pending = deferred();
    setup({ record: () => { vi.setSystemTime(Date.now() + 1); return pending.promise; } });
    click("Start");
    act(() => vi.advanceTimersByTime(1000));
    const attemptStarted = Date.now();
    click("Finish session");
    vi.setSystemTime(attemptStarted + 10000);
    await act(async () => pending.resolve());
    expect(screen.getByRole("alert")).toBeTruthy();
    click("Back to Today");
    tab("Achievements");
    expect(screen.getByRole("button", { name: /Ten Sessions\. 6 of 10 complete/ })).toBeTruthy();
  });
});
