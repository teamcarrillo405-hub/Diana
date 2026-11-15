// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TimerState } from "@/lib/timer/timer";
import { getPreviewData } from "./preview-data";
import { TodaySessionPreview } from "./today-session-preview";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-14T12:00:00Z"));
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

type SessionProps = ComponentProps<typeof TodaySessionPreview>;

function setup(overrides: Partial<SessionProps> = {}) {
  const props = {
    task: getPreviewData("typical").plan[0], notes: "", ...overrides,
    onNotes: vi.fn<SessionProps["onNotes"]>(overrides.onNotes),
    onFinish: vi.fn<SessionProps["onFinish"]>(overrides.onFinish),
    onClose: vi.fn<SessionProps["onClose"]>(overrides.onClose),
  };
  return { ...render(<TodaySessionPreview {...props} />), props };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function savedTimer(overrides: Partial<TimerState> = {}): TimerState {
  return { status: "paused", phase: "work", workMin: 25, breakMin: 5, endsAt: null, remainingMs: 90_000, premackReward: null, ...overrides };
}

async function finishSession() {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Finish session" })); });
}

function expectNoSuccess() {
  expect(screen.queryByRole("heading", { name: "Time well spent." })).toBeNull();
  expect(screen.queryByText(/One sample session recorded/)).toBeNull();
  expect(screen.getByRole("dialog").getAttribute("data-session-result")).toBe("false");
}

function expectNoTimers() {
  // jsdom queues a zero-delay selectionchange event when the title receives focus.
  act(() => vi.advanceTimersByTime(0));
  expect(vi.getTimerCount()).toBe(0);
}

describe("Today sample session", () => {
  it("opens a modal and focuses the assignment title", () => {
    const { props } = setup();
    expect(screen.getByRole("dialog").hasAttribute("open")).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: props.task.title }));
    expect(screen.getByLabelText("Time remaining").textContent).toBe("25:00");
    expect(screen.getByRole("timer").getAttribute("aria-live")).toBe("off");
    expect(screen.getByRole("dialog").getAttribute("aria-labelledby")).toBe("session-preview-title");
  });

  it("excludes paused time and records measured time once", async () => {
    const clearInterval = vi.spyOn(globalThis, "clearInterval");
    const { props } = setup();
    act(() => vi.advanceTimersByTime(65000));
    fireEvent.click(screen.getByRole("button", { name: "Pause session" }));
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByLabelText("Time remaining").textContent).toBe("23:55");
    fireEvent.click(screen.getByRole("button", { name: "Resume session" }));
    act(() => vi.advanceTimersByTime(5000));
    const finish = screen.getByRole("button", { name: "Finish session" });
    await act(async () => {
      fireEvent.click(finish);
      fireEvent.click(finish);
    });
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(70, expect.any(AbortSignal), expect.any(Number));
    expect(screen.getByText("01:10")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Time well spent." }));
    expect(clearInterval).toHaveBeenCalledTimes(2);
    expectNoTimers();
  });

  it("stops at the work interval without starting a break or counting extra time", async () => {
    const { props } = setup();
    act(() => vi.advanceTimersByTime(26 * 60000));
    expect(screen.getByLabelText("Time remaining").textContent).toBe("00:00");
    await finishSession();
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(1500, expect.any(AbortSignal), expect.any(Number));
  });

  it("does not count an unfinished session when returning or pressing Escape", () => {
    const { props } = setup();
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onFinish).not.toHaveBeenCalled();
  });

  it("keeps notes controlled by the surrounding preview", () => {
    const { props, rerender } = setup();
    fireEvent.change(screen.getByRole("textbox", { name: "Session notes" }), { target: { value: "Source one" } });
    expect(props.onNotes).toHaveBeenCalledWith("Source one");
    rerender(<TodaySessionPreview {...props} notes="Source one" />);
    expect((screen.getByRole("textbox", { name: "Session notes" }) as HTMLTextAreaElement).value).toBe("Source one");
  });

  it("returns focus to Start and cancels the clock when dismissed", () => {
    const clearInterval = vi.spyOn(globalThis, "clearInterval");
    const parent = render(<button>Start</button>);
    const start = screen.getByRole("button", { name: "Start" });
    start.focus();
    const focus = vi.spyOn(start, "focus");
    const { unmount } = setup();
    unmount();
    expect(document.activeElement).toBe(start);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(clearInterval).toHaveBeenCalledOnce();
    parent.unmount();
  });

  it("restores the explicit return focus without scrolling", () => {
    const parent = render(<><button>Start</button><button>Other</button></>);
    const start = screen.getByRole("button", { name: "Start" });
    screen.getByRole("button", { name: "Other" }).focus();
    const focus = vi.spyOn(start, "focus");
    const { unmount } = setup({ returnFocus: start });
    unmount();
    expect(document.activeElement).toBe(start);
    expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    parent.unmount();
  });

  it.each(["disconnected", "disabled", "hidden", "inert", "aria-disabled"])("does not restore an invalid %s focus target", reason => {
    const target = document.createElement("button");
    document.body.append(target);
    const focus = vi.spyOn(target, "focus");
    const { unmount } = setup({ returnFocus: target });
    if (reason === "disconnected") target.remove();
    else target.setAttribute(reason, reason === "aria-disabled" ? "true" : "");
    unmount();
    expect(focus).not.toHaveBeenCalled();
    target.remove();
  });

  it.each(["disconnected", "hidden", "inert", "disabled", "hidden ancestor", "inert ancestor", "display none", "visibility hidden"])("falls back to a visible selected tab when the invoking control is %s", reason => {
    const parent = render(<>
      <div data-origin-container><button>Invoking Start</button></div>
      <div hidden><button role="tab" aria-selected="true">Hidden tab</button></div>
      <button role="tab" aria-selected="true">This Week</button>
      <button data-now-start>Primary Start</button>
    </>);
    const origin = screen.getByRole("button", { name: "Invoking Start" });
    const tab = screen.getByRole("tab", { name: "This Week" });
    const originFocus = vi.spyOn(origin, "focus");
    const tabFocus = vi.spyOn(tab, "focus");
    const startFocus = vi.spyOn(screen.getByRole("button", { name: "Primary Start" }), "focus");
    const { unmount } = setup({ returnFocus: origin });
    if (reason === "disconnected") origin.remove();
    else if (reason === "hidden ancestor") origin.parentElement!.hidden = true;
    else if (reason === "inert ancestor") origin.parentElement!.setAttribute("inert", "");
    else if (reason === "display none") origin.style.display = "none";
    else if (reason === "visibility hidden") origin.style.visibility = "hidden";
    else origin.setAttribute(reason, "");
    unmount();
    expect(originFocus).not.toHaveBeenCalled();
    expect(startFocus).not.toHaveBeenCalled();
    expect(tabFocus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(document.activeElement).toBe(tab);
    parent.unmount();
  });

  it.each(["hidden", "inert", "display none", "visibility hidden", "aria-hidden"])("falls back to the visible primary Start when the selected tab's rail is %s", reason => {
    const parent = render(<>
      <button>Invoking Start</button>
      <nav data-today-stage-rail><button role="tab" aria-selected="true">Now</button></nav>
      <button role="tab" aria-selected="false">This Week</button>
      <button data-now-start hidden>Hidden Start</button>
      <button data-now-start disabled>Disabled Start</button>
      <button data-now-start>Primary Start</button>
    </>);
    const origin = screen.getByRole("button", { name: "Invoking Start" });
    const tab = screen.getByRole("tab", { name: "Now" });
    const start = screen.getByRole("button", { name: "Primary Start" });
    const tabFocus = vi.spyOn(tab, "focus");
    const startFocus = vi.spyOn(start, "focus");
    const { unmount } = setup({ returnFocus: origin });
    origin.hidden = true;
    const rail = tab.parentElement!;
    if (reason === "display none") rail.style.display = "none";
    else if (reason === "visibility hidden") rail.style.visibility = "hidden";
    else rail.setAttribute(reason, reason === "aria-hidden" ? "true" : "");
    unmount();
    expect(tabFocus).not.toHaveBeenCalled();
    expect(startFocus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
    expect(document.activeElement).toBe(start);
    parent.unmount();
  });
});

describe("bounded session recording", () => {
  it.each(["rejection", "timeout"])("focuses Retry after %s disables Finish, including a repeated retry", async outcome => {
    const first = deferred();
    const second = deferred();
    const { props } = setup();
    props.onFinish.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
    act(() => vi.advanceTimersByTime(1000));
    screen.getByRole("button", { name: "Finish session" }).focus();
    await finishSession();
    if (outcome === "rejection") await act(async () => first.reject());
    else act(() => vi.advanceTimersByTime(10000));
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(document.activeElement).toBe(retry);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    fireEvent.click(retry);
    await act(async () => second.reject());
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("does not steal notes focus when an in-flight recording becomes retryable", async () => {
    const recording = deferred();
    setup({ notes: "Keep editing", onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    screen.getByRole("button", { name: "Finish session" }).focus();
    await finishSession();
    const notes = screen.getByRole("textbox", { name: "Session notes" });
    notes.focus();
    await act(async () => recording.reject());
    expect(document.activeElement).toBe(notes);
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("disables Finish immediately, delays the pending label 150ms, and awaits confirmation", async () => {
    const recording = deferred();
    const { props } = setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(2250));
    const finish = screen.getByRole("button", { name: "Finish session" }) as HTMLButtonElement;
    fireEvent.click(finish);
    expect(finish.disabled).toBe(true);
    expect(finish.textContent).toBe("Finish session");
    expectNoSuccess();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: props.task.title }));
    expect((screen.getByRole("button", { name: "Resume session" }) as HTMLButtonElement).disabled).toBe(true);
    const remaining = screen.getByRole("timer").textContent;
    act(() => vi.advanceTimersByTime(149));
    expect(finish.textContent).toBe("Finish session");
    expect(screen.queryByText("Recording session.")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(finish.textContent).toBe("Recording...");
    expect(screen.getByText("Recording session.").getAttribute("role")).toBe("status");
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole("timer").textContent).toBe(remaining);
    expectNoSuccess();
    await act(async () => recording.resolve());
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(2, expect.any(AbortSignal), expect.any(Number));
    expect(screen.getByText("00:02")).toBeTruthy();
    expect(screen.getByText(/One sample session recorded/)).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Time well spent." }));
    expectNoTimers();
  });

  it("does not flash a pending label for a fast confirmed recording", async () => {
    const recording = deferred();
    setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    await finishSession();
    act(() => vi.advanceTimersByTime(50));
    await act(async () => recording.resolve());
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText("Recording...")).toBeNull();
    expect(screen.queryByText("Recording session.")).toBeNull();
    expect(screen.getByRole("heading", { name: "Time well spent." })).toBeTruthy();
    expectNoTimers();
  });

  it("suppresses repeated Finish activation even before a render and throughout recording", async () => {
    const recording = deferred();
    const { props } = setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(4000));
    const finish = screen.getByRole("button", { name: "Finish session" });
    act(() => {
      fireEvent.click(finish);
      fireEvent.click(finish);
      fireEvent.click(finish);
    });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(finish);
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(4, expect.any(AbortSignal), expect.any(Number));
    await act(async () => recording.resolve());
    fireEvent.click(finish);
    expect(props.onFinish).toHaveBeenCalledOnce();
  });

  it("keeps notes and frozen time on rejection and retries the exact elapsed seconds once", async () => {
    const first = deferred();
    const retry = deferred();
    const { props, rerender } = setup({ notes: "Source one", onFinish: () => first.promise });
    props.onFinish.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    act(() => vi.advanceTimersByTime(12_345));
    await finishSession();
    const remaining = screen.getByRole("timer").textContent;
    act(() => vi.advanceTimersByTime(300));
    await act(async () => first.reject(new Error("Private recording details")));
    expect(screen.getByRole("alert").textContent).toBe("We couldn't record this session. Your notes and time are kept here.");
    expect(screen.queryByText("Private recording details")).toBeNull();
    expectNoSuccess();
    expect((screen.getByRole("button", { name: "Finish session" }) as HTMLButtonElement).disabled).toBe(true);
    const resume = screen.getByRole("button", { name: "Resume session" }) as HTMLButtonElement;
    expect(resume.disabled).toBe(true);
    fireEvent.click(resume);
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole("timer").textContent).toBe(remaining);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Source one");
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Source one and two" } });
    expect(props.onNotes).toHaveBeenCalledWith("Source one and two");
    rerender(<TodaySessionPreview {...props} notes="Source one and two" />);
    const retryButton = screen.getByRole("button", { name: "Retry" });
    act(() => { fireEvent.click(retryButton); fireEvent.click(retryButton); });
    expect(props.onFinish.mock.calls.map(([seconds]) => seconds)).toEqual([12, 12]);
    expect(props.onFinish.mock.calls[1][1]).not.toBe(props.onFinish.mock.calls[0][1]);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Recording...")).toBeNull();
    expect((screen.getByRole("button", { name: "Resume session" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Source one and two");
    await act(async () => retry.resolve());
    expect(screen.getByText("00:12")).toBeTruthy();
    expectNoTimers();
  });

  it("handles a synchronous recording exception as a retryable error", async () => {
    const { props } = setup({ onFinish: () => { throw new Error("Unavailable"); } });
    act(() => vi.advanceTimersByTime(3000));
    await finishSession();
    expectNoSuccess();
    expect(screen.getByRole("alert")).toBeTruthy();
    expectNoTimers();
    props.onFinish.mockImplementation(() => {});
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
    expect(props.onFinish.mock.calls.map(([seconds]) => seconds)).toEqual([3, 3]);
    expect(screen.getByRole("heading", { name: "Time well spent." })).toBeTruthy();
  });

  it.each(["Back", "Escape"])("aborts on %s during recording and ignores stale success", async exit => {
    const recording = deferred();
    const { props } = setup({ notes: "Keep this note", onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(12_345));
    await finishSession();
    const signal = props.onFinish.mock.calls[0][1];
    expect(signal.aborted).toBe(false);
    props.onClose.mockImplementation(() => { expect(signal.aborted).toBe(true); });
    act(() => vi.advanceTimersByTime(5000));
    if (exit === "Back") fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    else fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(signal.aborted).toBe(true);
    expect(props.onClose).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status: "paused", phase: "work", remainingMs: 1_487_655, endsAt: null }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Keep this note");
    expectNoTimers();
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    expect(props.onClose).toHaveBeenCalledOnce();
    await act(async () => recording.resolve());
    expectNoSuccess();
  });

  it("allows immediate Back before the pending label and handles a late rejection", async () => {
    const recording = deferred();
    const { props } = setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    fireEvent.click(screen.getByRole("button", { name: "Finish session" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    expect(props.onFinish.mock.calls[0][1].aborted).toBe(true);
    await act(async () => recording.reject(new Error("Aborted recording")));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("Recording session.")).toBeNull();
    expectNoSuccess();
    expectNoTimers();
  });

  it("Back from the retry error preserves the frozen snapshot", async () => {
    const recording = deferred();
    const { props } = setup({ notes: "Keep me", onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    await finishSession();
    await act(async () => recording.reject());
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(props.onClose).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ status: "paused", remainingMs: 1_499_000 }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Keep me");
    expectNoSuccess();
  });

  it.each(["resolve", "reject"] as const)("aborts and clears timers on unmount, ignoring a late %s", async outcome => {
    const recording = deferred();
    const { props, unmount } = setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    await finishSession();
    const signal = props.onFinish.mock.calls[0][1];
    unmount();
    expect(signal.aborted).toBe(true);
    expectNoTimers();
    await act(async () => recording[outcome]());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it.each(["resolve", "reject"] as const)("times out at exactly 10s and ignores stale %s while retrying", async outcome => {
    const first = deferred();
    const retry = deferred();
    const { props } = setup();
    props.onFinish.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    act(() => vi.advanceTimersByTime(7000));
    await finishSession();
    const signal = props.onFinish.mock.calls[0][1];
    act(() => vi.advanceTimersByTime(9999));
    expect(signal.aborted).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole("alert")).toBeTruthy();
    expectNoSuccess();
    expectNoTimers();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(props.onFinish.mock.calls.map(([seconds]) => seconds)).toEqual([7, 7]);
    expect(props.onFinish.mock.calls[1][1].aborted).toBe(false);
    act(() => vi.advanceTimersByTime(150));
    await act(async () => first[outcome]());
    expectNoSuccess();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Recording..." })).toBeTruthy();
    await act(async () => retry.resolve());
    expect(screen.getByText("00:07")).toBeTruthy();
    expectNoTimers();
  });

  it("does not accept completion after the deadline when timeout delivery is delayed", async () => {
    const recording = deferred();
    const { props } = setup({ onFinish: () => recording.promise });
    act(() => vi.advanceTimersByTime(1000));
    await finishSession();
    vi.setSystemTime(Date.now() + 10_001);
    await act(async () => recording.resolve());
    expect(props.onFinish.mock.calls[0][1].aborted).toBe(true);
    expect(screen.getByRole("alert")).toBeTruthy();
    expectNoSuccess();
    expectNoTimers();
  });

  it("accepts an authoritative commit receipt even if acknowledgement handling crosses the deadline", async () => {
    const { props } = setup({ onFinish: (_seconds, _signal, expiresAt) => {
      vi.setSystemTime(expiresAt + 1);
      return { recorded: true };
    } });
    act(() => vi.advanceTimersByTime(1000));
    const started = Date.now();
    await finishSession();
    expect(props.onFinish.mock.calls[0][2]).toBe(started + 10000);
    expect(screen.getByText("00:01")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expectNoTimers();
  });

  it("bounds a retry independently and aborts it on Back", async () => {
    const first = deferred();
    const retry = deferred();
    const { props } = setup();
    props.onFinish.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => retry.promise);
    act(() => vi.advanceTimersByTime(1000));
    await finishSession();
    act(() => vi.advanceTimersByTime(10_000));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    const retrySignal = props.onFinish.mock.calls[1][1];
    act(() => vi.advanceTimersByTime(9999));
    expect(retrySignal.aborted).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    expect(retrySignal.aborted).toBe(true);
    await act(async () => retry.resolve());
    expectNoSuccess();
    expectNoTimers();
  });

  it.each([0, 999])("shows a truthful zero-time result after %sms without recording", async elapsed => {
    const { props } = setup();
    act(() => vi.advanceTimersByTime(elapsed));
    await finishSession();
    expect(props.onFinish).not.toHaveBeenCalled();
    expect(screen.getByText("00:00")).toBeTruthy();
    expect(screen.getByText(/No session was recorded/)).toBeTruthy();
    expect(screen.queryByText(/One sample session recorded/)).toBeNull();
    expect(screen.queryByText("Session complete")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Time well spent." })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "No focus time recorded." }));
    expectNoTimers();
    fireEvent.click(screen.getAllByRole("button", { name: "Back to Today" })[0]);
    expect(props.onClose).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});

describe("session resume snapshots", () => {
  it("resumes saved time after returning without counting time spent away", () => {
    const first = setup({ notes: "Source one" });
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole("button", { name: "Back to Today" }));
    const snapshot = first.props.onClose.mock.calls[0][0];
    first.unmount();
    act(() => vi.advanceTimersByTime(120_000));
    setup({ snapshot, notes: "Source one" });
    expect(screen.getByRole("timer").textContent).toBe("24:55");
    expect((screen.getByRole("button", { name: "Pause session" }) as HTMLButtonElement).disabled).toBe(false);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer").textContent).toBe("24:54");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Source one");
  });

  it.each(["paused", "running"] as const)("resumes a valid %s snapshot from remaining time, ignoring its old deadline", async status => {
    const snapshot = Object.freeze(savedTimer({ status, endsAt: Date.now() - 99_000 }));
    const { props } = setup({ snapshot });
    expect(screen.getByRole("timer").textContent).toBe("01:30");
    expect(screen.getByRole("button", { name: "Pause session" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    await finishSession();
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(1412, expect.any(AbortSignal), expect.any(Number));
    expect(snapshot.remainingMs).toBe(90_000);
  });

  it.each(["paused", "running"] as const)("keeps a zero-remaining %s snapshot paused without a timer interval", async status => {
    const { props } = setup({ snapshot: savedTimer({ status, remainingMs: 0 }) });
    expect(screen.getByRole("timer").textContent).toBe("00:00");
    expect((screen.getByRole("button", { name: "Resume session" }) as HTMLButtonElement).disabled).toBe(true);
    expectNoTimers();
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.click(screen.getByRole("button", { name: "Resume session" }));
    expect(screen.getByRole("timer").textContent).toBe("00:00");
    await finishSession();
    expect(props.onFinish).toHaveBeenCalledExactlyOnceWith(1500, expect.any(AbortSignal), expect.any(Number));
  });

  it.each([5, 60])("accepts a full bounded %s-minute snapshot without inventing elapsed time", async workMin => {
    const { props } = setup({ snapshot: savedTimer({ workMin, remainingMs: workMin * 60_000 }) });
    expect(screen.getByRole("timer").textContent).toBe(`${String(workMin).padStart(2, "0")}:00`);
    await finishSession();
    expect(props.onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "No focus time recorded." })).toBeTruthy();
  });

  it("resumes a positive sub-second remainder and pauses at zero", () => {
    setup({ snapshot: savedTimer({ remainingMs: 1 }) });
    expect(screen.getByRole("timer").textContent).toBe("00:01");
    expect(screen.getByRole("button", { name: "Pause session" })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("timer").textContent).toBe("00:00");
    expect((screen.getByRole("button", { name: "Resume session" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it.each<[string, Partial<TimerState>]>([
    ["break phase", { phase: "break" }],
    ["missing phase", { phase: null }],
    ["idle status", { status: "idle" }],
    ["done status", { status: "done" }],
    ["break status", { status: "break" }],
    ["NaN work minutes", { workMin: NaN }],
    ["infinite work minutes", { workMin: Infinity }],
    ["negative infinite work minutes", { workMin: -Infinity }],
    ["zero work minutes", { workMin: 0 }],
    ["short work interval", { workMin: 4 }],
    ["long work interval", { workMin: 61 }],
    ["NaN remaining", { remainingMs: NaN }],
    ["infinite remaining", { remainingMs: Infinity }],
    ["negative infinite remaining", { remainingMs: -Infinity }],
    ["negative remaining", { remainingMs: -1 }],
    ["remaining above duration", { remainingMs: 1_500_001 }],
    ["remaining above snapshot duration", { workMin: 5, remainingMs: 300_001 }],
  ])("discards %s and starts a fresh bounded work timer", async (_name, invalid) => {
    const { props } = setup({ snapshot: savedTimer(invalid) });
    expect(screen.getByRole("timer").textContent).toBe("25:00");
    expect(screen.getByRole("button", { name: "Pause session" })).toBeTruthy();
    await finishSession();
    expect(props.onFinish).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "No focus time recorded." })).toBeTruthy();
  });
});
