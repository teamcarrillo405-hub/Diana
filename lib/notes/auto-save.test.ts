/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSaveNote, type SaveResult } from "./auto-save";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutoSaveNote", () => {
  it("starts idle", () => {
    const saver = vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
    const { result } = renderHook(() => useAutoSaveNote(saver));
    expect(result.current.status).toBe("idle");
    expect(saver).not.toHaveBeenCalled();
  });

  it("debounces saves to 30s by default", async () => {
    const saver = vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
    const { result } = renderHook(() => useAutoSaveNote(saver));

    act(() => { result.current.save(); });
    expect(result.current.status).toBe("pending");

    // Advance just under 30s — nothing should fire yet.
    await act(async () => { await vi.advanceTimersByTimeAsync(29999); });
    expect(saver).not.toHaveBeenCalled();

    // Advance to 30s — saver fires.
    await act(async () => { await vi.advanceTimersByTimeAsync(2); });
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid save() calls into one server call", async () => {
    const saver = vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
    const { result } = renderHook(() => useAutoSaveNote(saver));

    act(() => { result.current.save(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    act(() => { result.current.save(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    act(() => { result.current.save(); });

    // Total real time elapsed: 10s, but each save() resets the 30s timer.
    // Advance to last-save + 30s.
    await act(async () => { await vi.advanceTimersByTimeAsync(30001); });
    expect(saver).toHaveBeenCalledTimes(1);
  });

  it("transitions idle → pending → saving → saved", async () => {
    let resolveSaver: (v: SaveResult) => void = () => {};
    const saver = vi.fn(
      () => new Promise<SaveResult>((res) => { resolveSaver = res; }),
    );
    const { result } = renderHook(() => useAutoSaveNote(saver));

    expect(result.current.status).toBe("idle");
    act(() => { result.current.save(); });
    expect(result.current.status).toBe("pending");

    await act(async () => { await vi.advanceTimersByTimeAsync(30001); });
    expect(result.current.status).toBe("saving");

    await act(async () => { resolveSaver({ ok: true }); });
    expect(result.current.status).toBe("saved");
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it("flushNow bypasses the debounce", async () => {
    const saver = vi.fn(async (): Promise<SaveResult> => ({ ok: true }));
    const { result } = renderHook(() => useAutoSaveNote(saver));

    act(() => { result.current.save(); });
    expect(saver).not.toHaveBeenCalled();

    await act(async () => { await result.current.flushNow(); });
    expect(saver).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saved");
  });

  it("ok:false from saver transitions status to 'error'", async () => {
    const saver = vi.fn(
      async (): Promise<SaveResult> => ({ ok: false, error: "Storage offline" }),
    );
    const { result } = renderHook(() => useAutoSaveNote(saver));

    act(() => { result.current.save(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30001); });
    // Allow microtask after the saver resolves.
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe("error");
  });
});
