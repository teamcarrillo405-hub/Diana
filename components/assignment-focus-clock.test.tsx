// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  startFocusSession: vi.fn(),
  finishFocusSession: vi.fn(),
  reconcileFocusSession: vi.fn(),
}));

vi.mock("@/app/(app)/timer/actions", () => ({
  startFocusSession: mocks.startFocusSession,
  finishFocusSession: mocks.finishFocusSession,
  reconcileFocusSession: mocks.reconcileFocusSession,
}));

import { AssignmentFocusClock } from "./assignment-focus-clock";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const key = `diana:assignment-focus-clock:${assignmentId}`;
const startedAt = "2030-01-01T08:00:00.000Z";
const targetAt = "2030-01-01T08:30:00.000Z";
const shortTargetAt = "2030-01-01T08:15:00.000Z";

function openSession(sessionId: number) {
  return {
    ok: true as const,
    session: {
      sessionId,
      clientSessionId: null,
      startedAt,
      targetAt,
    },
    endedSession: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

function renderClock(estimatedMinutes: number | null = 45) {
  return render(
    <AssignmentFocusClock
      assignmentId={assignmentId}
      title="Biology review"
      estimatedMinutes={estimatedMinutes}
    />,
  );
}

describe("AssignmentFocusClock", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.reconcileFocusSession.mockResolvedValue({
      ok: true,
      session: null,
      endedSession: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("uses a 15 minute focus block for a short assignment", async () => {
    mocks.startFocusSession.mockResolvedValue({
      ok: true,
      sessionId: 15,
      clientSessionId: null,
      startedAt,
      targetAt: shortTargetAt,
    });

    renderClock(12);

    const play = await screen.findByRole("button", { name: "Start a 15 minute focus session" });
    expect(screen.getByRole("timer")).toHaveTextContent("15:00");
    fireEvent.click(play);

    await waitFor(() => {
      expect(mocks.startFocusSession).toHaveBeenCalledWith(expect.objectContaining({
        assignmentId,
        durationMinutes: 15,
      }));
    });
    expect(await screen.findByRole("button", { name: "Stop focus session" })).toBeEnabled();
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      sessionId: 15,
      targetAt: shortTargetAt,
      state: "running",
    });
  });

  it("keeps assignments without an estimate at 30 minutes", async () => {
    mocks.startFocusSession.mockResolvedValue({
      ok: true,
      sessionId: 30,
      clientSessionId: null,
      startedAt,
      targetAt,
    });
    renderClock(null);

    const play = await screen.findByRole("button", { name: "Start a 30 minute focus session" });
    expect(screen.getByRole("timer")).toHaveTextContent("30:00");
    fireEvent.click(play);

    await waitFor(() => {
      expect(mocks.startFocusSession).toHaveBeenCalledWith(expect.objectContaining({
        assignmentId,
        durationMinutes: 30,
      }));
    });
  });

  it("persists the server session and prevents duplicate start and stop requests", async () => {
    const start = deferred<{
      ok: true;
      sessionId: number;
      startedAt: string;
      targetAt: string;
    }>();
    const finish = deferred<{
      ok: true;
      sessionId: number;
      endedAt: string;
    }>();
    mocks.startFocusSession.mockReturnValue(start.promise);
    mocks.finishFocusSession.mockReturnValue(finish.promise);

    renderClock();
    const play = await screen.findByRole("button", { name: "Start a 30 minute focus session" });
    expect(screen.getByRole("timer")).toHaveTextContent("30:00");
    expect(screen.getByRole("timer")).toHaveAttribute("aria-live", "off");

    fireEvent.click(play);
    fireEvent.click(play);
    expect(mocks.startFocusSession).toHaveBeenCalledTimes(1);
    expect(mocks.startFocusSession).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId,
      durationMinutes: 30,
    }));
    expect(screen.getByLabelText("Focus clock for Biology review")).toHaveAttribute("data-state", "starting");

    await act(async () => {
      start.resolve({ ok: true, sessionId: 42, startedAt, targetAt });
      await start.promise;
    });

    const stop = await screen.findByRole("button", { name: "Stop focus session" });
    expect(screen.getByRole("status")).toHaveTextContent("Focus block started.");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      assignmentId,
      sessionId: 42,
      startedAt,
      targetAt,
      state: "running",
    });

    fireEvent.click(stop);
    fireEvent.click(stop);
    expect(mocks.finishFocusSession).toHaveBeenCalledTimes(1);
    expect(mocks.finishFocusSession).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId,
      sessionId: 42,
      completion: "manual",
      clientSessionId: expect.any(String),
    }));
    expect(screen.getByLabelText("Focus clock for Biology review")).toHaveAttribute("data-state", "stopping");

    await act(async () => {
      finish.resolve({ ok: true, sessionId: 42, endedAt: "2030-01-01T08:05:00.000Z" });
      await finish.promise;
    });

    expect(await screen.findByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Focus block stopped and saved.");
    expect(screen.queryByText("Focus block saved.")).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      assignmentId,
      sessionId: 42,
      state: "completed",
      completion: "manual",
    });

    const firstClientSessionId = mocks.startFocusSession.mock.calls[0]?.[0].clientSessionId;
    mocks.startFocusSession.mockResolvedValueOnce({
      ok: true,
      sessionId: 43,
      clientSessionId: "44444444-4444-4444-8444-444444444444",
      startedAt,
      targetAt,
    });
    fireEvent.click(screen.getByRole("button", { name: "Start another 30 minute focus session" }));

    expect(await screen.findByRole("button", { name: "Stop focus session" })).toBeEnabled();
    expect(mocks.startFocusSession).toHaveBeenCalledTimes(2);
    expect(mocks.startFocusSession.mock.calls[1]?.[0].clientSessionId).not.toBe(firstClientSessionId);
  });

  it("restores the current server session in a fresh browser without starting another one", async () => {
    mocks.reconcileFocusSession.mockResolvedValue(openSession(61));

    renderClock();

    expect(await screen.findByRole("button", { name: "Stop focus session" })).toBeEnabled();
    expect(mocks.reconcileFocusSession).toHaveBeenCalledWith({
      assignmentId,
      sessionId: undefined,
    });
    expect(mocks.startFocusSession).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      assignmentId,
      sessionId: 61,
      state: "running",
    });
  });

  it("reflects a session completed by another tab without sending another finish", async () => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      assignmentId,
      clientSessionId: null,
      sessionId: 62,
      startedAt,
      targetAt,
      state: "running",
      retryAction: null,
      completion: null,
      error: null,
      updatedAt: Date.now(),
    }));
    mocks.reconcileFocusSession.mockResolvedValue({
      ok: true,
      session: null,
      endedSession: {
        sessionId: 62,
        endedAt: "2030-01-01T08:05:00.000Z",
      },
    });

    renderClock();

    expect(await screen.findByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    expect(mocks.finishFocusSession).not.toHaveBeenCalled();
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      sessionId: 62,
      state: "completed",
      completion: "manual",
    });
  });

  it("keeps controls available when the server refresh needs another try", async () => {
    mocks.reconcileFocusSession.mockResolvedValue({
      ok: false,
      error: "The focus timer could not refresh yet.",
    });

    renderClock();

    expect(await screen.findByRole("button", { name: "Start a 30 minute focus session" })).toBeEnabled();
    expect(screen.getByLabelText("Focus clock for Biology review")).toHaveAttribute("data-state", "idle");
  });

  it("reconciles on visible focus at a throttled rate", async () => {
    let currentTime = new Date("2030-01-01T08:10:00.000Z").getTime();
    const dateNow = vi.spyOn(Date, "now").mockImplementation(() => currentTime);
    mocks.reconcileFocusSession
      .mockResolvedValueOnce(openSession(63))
      .mockResolvedValueOnce({
        ok: true,
        session: null,
        endedSession: { sessionId: 63, endedAt: targetAt },
      });

    renderClock();
    expect(await screen.findByRole("button", { name: "Stop focus session" })).toBeEnabled();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });
    expect(mocks.reconcileFocusSession).toHaveBeenCalledTimes(1);

    currentTime += 15_000;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mocks.reconcileFocusSession).toHaveBeenCalledTimes(2);
      expect(screen.getByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    });
    expect(mocks.finishFocusSession).not.toHaveBeenCalled();
    dateNow.mockRestore();
  });

  it("reconciles a running snapshot after reload and completes it once at the target", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T08:29:55.000Z"));
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      assignmentId,
      sessionId: 7,
      startedAt,
      targetAt,
      state: "running",
      retryAction: null,
      completion: null,
      error: null,
      updatedAt: Date.now(),
    }));
    mocks.finishFocusSession.mockResolvedValue({
      ok: true,
      sessionId: 7,
      endedAt: targetAt,
    });
    mocks.reconcileFocusSession.mockResolvedValue(openSession(7));

    renderClock();
    expect(screen.getByRole("timer")).toHaveTextContent("00:05");
    expect(mocks.startFocusSession).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(mocks.finishFocusSession).toHaveBeenCalledTimes(1);
    expect(mocks.finishFocusSession).toHaveBeenCalledWith({
      assignmentId,
      sessionId: 7,
      completion: "elapsed",
    });
    expect(screen.getByRole("timer")).toHaveTextContent("00:00");
    expect(screen.getByRole("status")).toHaveTextContent("Focus block complete.");
    expect(JSON.parse(window.localStorage.getItem(key) ?? "null")).toMatchObject({
      sessionId: 7,
      state: "completed",
      completion: "elapsed",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(mocks.finishFocusSession).toHaveBeenCalledTimes(1);
  });

  it("recovers interrupted starting and stopping requests after reload", async () => {
    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      assignmentId,
      sessionId: null,
      startedAt: null,
      targetAt: null,
      state: "starting",
      retryAction: null,
      completion: null,
      error: null,
      updatedAt: Date.now(),
    }));
    mocks.startFocusSession.mockResolvedValue({
      ok: true,
      sessionId: 11,
      startedAt,
      targetAt,
    });

    const firstRender = renderClock();
    expect(await screen.findByRole("button", { name: "Stop focus session" })).toBeEnabled();
    expect(mocks.startFocusSession).toHaveBeenCalledTimes(1);
    firstRender.unmount();

    window.localStorage.setItem(key, JSON.stringify({
      version: 1,
      assignmentId,
      sessionId: 11,
      startedAt,
      targetAt,
      state: "stopping",
      retryAction: null,
      completion: "manual",
      error: null,
      updatedAt: Date.now() + 1,
    }));
    mocks.finishFocusSession.mockResolvedValue({
      ok: true,
      sessionId: 11,
      endedAt: "2030-01-01T08:10:00.000Z",
    });
    mocks.reconcileFocusSession.mockResolvedValue(openSession(11));

    renderClock();
    expect(await screen.findByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    expect(mocks.finishFocusSession).toHaveBeenCalledTimes(1);
  });

  it("reconciles newer cross-tab storage states without starting another server session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T08:10:00.000Z"));
    renderClock();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Start a 30 minute focus session" })).toBeEnabled();

    const running = {
      version: 1,
      assignmentId,
      sessionId: 17,
      startedAt,
      targetAt,
      state: "running",
      retryAction: null,
      completion: null,
      error: null,
      updatedAt: Date.now() + 1,
    };
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key,
        newValue: JSON.stringify(running),
      }));
    });

    expect(screen.getByRole("button", { name: "Stop focus session" })).toBeEnabled();
    expect(screen.getByRole("timer")).toHaveTextContent("20:00");
    expect(screen.getByRole("status")).toHaveTextContent("Focus block started.");
    expect(mocks.startFocusSession).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", {
        key,
        newValue: JSON.stringify({
          ...running,
          state: "completed",
          completion: "manual",
          updatedAt: running.updatedAt + 1,
        }),
      }));
    });

    expect(screen.getByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent("Focus block stopped and saved.");
  });

  it("keeps homework available and exposes a clear Retry action after an error", async () => {
    mocks.startFocusSession
      .mockResolvedValueOnce({ ok: false, error: "The session could not start yet." })
      .mockResolvedValueOnce({ ok: true, sessionId: 9, startedAt, targetAt });

    renderClock();
    const start = await screen.findByRole("button", { name: "Start a 30 minute focus session" });
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(screen.getByText(/Homework stays available\./, {
      selector: ".sd-assignment-focus-clock-message > span",
    })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Homework stays available.");
    expect(screen.getByLabelText("Focus clock for Biology review")).toHaveAttribute("data-state", "retryable_error");

    fireEvent.click(retry);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Stop focus session" })).toBeEnabled();
    });
    expect(mocks.startFocusSession).toHaveBeenCalledTimes(2);
  });

  it("retries a stop request and returns to a saved focus block", async () => {
    mocks.reconcileFocusSession.mockResolvedValue(openSession(71));
    mocks.finishFocusSession
      .mockResolvedValueOnce({ ok: false, error: "The focus session could not be ended yet." })
      .mockResolvedValueOnce({ ok: true, sessionId: 71, endedAt: "2030-01-01T08:10:00.000Z" });

    renderClock();

    fireEvent.click(await screen.findByRole("button", { name: "Stop focus session" }));

    const retry = await screen.findByRole("button", { name: "Retry" });
    expect(retry).toHaveClass("sd-assignment-focus-clock-retry");
    expect(screen.getByLabelText("Focus clock for Biology review")).toHaveAttribute("data-state", "retryable_error");

    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start another 30 minute focus session" })).toBeEnabled();
    });
    expect(mocks.finishFocusSession).toHaveBeenCalledTimes(2);
  });
});
