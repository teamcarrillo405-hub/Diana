// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPreviewData } from "./preview-data";
import { usePreviewLaunch } from "./use-preview-launch";

const task = getPreviewData("typical").plan[0];
beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("authored launch readiness", () => {
  it("runs readiness in parallel with the lead-in and commits once", async () => {
    const ready = vi.fn();
    const open = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePreviewLaunch(ready, open, { minimumMs: 180, waitingMs: 500 }));
    await act(async () => result.current.begin(task, null));
    expect(open).toHaveBeenCalledOnce();
    expect(ready).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(180));
    expect(ready).toHaveBeenCalledOnce();
    expect(result.current.state).toBeNull();
    act(() => vi.advanceTimersByTime(10000));
    expect(ready).toHaveBeenCalledOnce();
  });

  it("releases a ready handoff when reduced motion is enabled mid-flight", () => {
    const ready = vi.fn();
    const { result, rerender } = renderHook(({ minimumMs }) => usePreviewLaunch(ready, undefined, { minimumMs, waitingMs: 500 }), { initialProps: { minimumMs: 180 } });
    act(() => result.current.begin(task, null));
    expect(ready).not.toHaveBeenCalled();
    rerender({ minimumMs: 0 });
    expect(ready).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(1000));
    expect(ready).toHaveBeenCalledOnce();
  });

  it("cancel and unmount remove the reveal callback", () => {
    const ready = vi.fn();
    const { result, unmount } = renderHook(() => usePreviewLaunch(ready, undefined, { minimumMs: 180 }));
    act(() => result.current.begin(task, null));
    act(() => result.current.cancel());
    act(() => vi.advanceTimersByTime(1000));
    expect(ready).not.toHaveBeenCalled();
    act(() => result.current.begin(task, null));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(ready).not.toHaveBeenCalled();
  });

  it("reports a readiness error immediately instead of playing a successful arrival", () => {
    const ready = vi.fn();
    const { result } = renderHook(() => usePreviewLaunch(ready, () => { throw new Error("Unavailable"); }, { minimumMs: 180, waitingMs: 500 }));
    act(() => result.current.begin(task, null));
    expect(result.current.state?.status).toBe("error");
    act(() => vi.advanceTimersByTime(10000));
    expect(ready).not.toHaveBeenCalled();
  });
});
