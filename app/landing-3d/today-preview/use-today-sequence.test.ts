// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TODAY_TIMING, useTodaySequence } from "./use-today-sequence";

let reduced: boolean;
let listeners: Set<() => void>;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  listeners = new Set();
  vi.stubGlobal("matchMedia", () => ({ get matches() { return reduced; }, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function tick(ms: number) { act(() => vi.advanceTimersByTime(ms)); }

describe("authored Today sequence", () => {
  it("orders immediate feedback, content, then character without delayed audio", () => {
    const play = vi.fn();
    const { result } = renderHook(() => useTodaySequence(true, play));
    expect(play).not.toHaveBeenCalled();
    act(() => result.current.select());
    expect(play.mock.calls).toEqual([["select"]]);
    expect(result.current.phase).toBe("selection");
    expect(result.current.holdCharacter).toBe(true);
    tick(TODAY_TIMING.selection);
    expect(result.current.phase).toBe("content");
    expect(result.current.holdCharacter).toBe(true);
    tick(TODAY_TIMING.character - TODAY_TIMING.selection);
    expect(result.current.phase).toBe("character");
    expect(result.current.holdCharacter).toBe(false);
    tick(TODAY_TIMING.settle - TODAY_TIMING.character);
    expect(result.current.phase).toBe("idle");
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("replaces pending selection beats on rapid input", () => {
    const { result } = renderHook(() => useTodaySequence(true, vi.fn()));
    act(() => result.current.select());
    tick(70);
    act(() => result.current.select());
    tick(10);
    expect(result.current.phase).toBe("selection");
    tick(70);
    expect(result.current.phase).toBe("content");
    tick(220);
    expect(result.current.phase).toBe("character");
  });

  it("launch supersedes selection and keeps Diana quiet through the session", () => {
    const play = vi.fn();
    const { result } = renderHook(() => useTodaySequence(true, play));
    act(() => result.current.select());
    tick(30);
    act(() => result.current.launch());
    tick(800);
    expect(result.current.phase).toBe("launch");
    act(() => result.current.sessionOpened());
    expect(result.current.phase).toBe("session");
    expect(result.current.holdCharacter).toBe(true);
    expect(play.mock.calls).toEqual([["select"], ["launch"]]);
    act(() => result.current.returned());
    expect(result.current.phase).toBe("return");
    tick(TODAY_TIMING.return);
    expect(result.current.holdCharacter).toBe(false);
    tick(TODAY_TIMING.character - TODAY_TIMING.return);
    expect(result.current.phase).toBe("idle");
  });

  it("a detail action interrupts selection, without a later character restart", () => {
    const { result } = renderHook(() => useTodaySequence(true, vi.fn()));
    act(() => result.current.select());
    act(() => result.current.detail());
    tick(1000);
    expect(result.current.phase).toBe("detail");
    expect(result.current.holdCharacter).toBe(true);
  });

  it("reduced motion removes all timeline delays without changing optional sound", () => {
    reduced = true;
    const play = vi.fn();
    const { result } = renderHook(() => useTodaySequence(true, play));
    act(() => result.current.select());
    expect(result.current.phase).toBe("idle");
    expect(result.current.holdCharacter).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(play).toHaveBeenCalledWith("select");
  });

  it("preference changes and page hiding cancel pending beats", () => {
    const { result } = renderHook(() => useTodaySequence(true, vi.fn()));
    act(() => result.current.select());
    act(() => { reduced = true; listeners.forEach(listener => listener()); });
    expect(result.current.phase).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
    act(() => { reduced = false; listeners.forEach(listener => listener()); });
    act(() => result.current.select());
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current.phase).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
    Reflect.deleteProperty(document, "visibilityState");
  });

  it("cleans up timers on unmount and leaves non-review timelines disabled", () => {
    const { result, unmount } = renderHook(() => useTodaySequence(true, vi.fn()));
    act(() => result.current.select());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(listeners.size).toBe(0);
    const other = renderHook(() => useTodaySequence(false, vi.fn()));
    act(() => other.result.current.select());
    expect(other.result.current.phase).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });
});
