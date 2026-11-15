// @vitest-environment jsdom
import { StrictMode, createElement, type PropsWithChildren } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderMenuCue, useMenuAudio, type MenuAudioCue } from "./use-menu-audio";

function parameter() {
  return {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

class MockBufferSource {
  buffer: { duration: number; getChannelData: (channel: number) => Float32Array } | null = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGain {
  gain = parameter();
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  sampleRate = 48000;
  destination = {};
  sources: MockBufferSource[] = [];
  gains: MockGain[] = [];
  listeners = new Set<() => void>();
  addEventListener = vi.fn((_event: string, listener: () => void) => this.listeners.add(listener));
  removeEventListener = vi.fn((_event: string, listener: () => void) => this.listeners.delete(listener));
  resume = vi.fn(async () => { this.state = "running"; });
  close = vi.fn(async () => { this.state = "closed"; });
  createBufferSource = vi.fn(() => {
    const source = new MockBufferSource();
    this.sources.push(source);
    return source;
  });
  createBuffer = vi.fn((_channels: number, length: number, sampleRate: number) => {
    const samples = new Float32Array(length);
    return { duration: length / sampleRate, getChannelData: (_channel: number) => samples };
  });
  createGain = vi.fn(() => {
    const gain = new MockGain();
    this.gains.push(gain);
    return gain;
  });
  changeState(state: AudioContextState) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

let contexts: MockAudioContext[];
let configure: (context: MockAudioContext) => void;
let constructor: ReturnType<typeof vi.fn>;
const allCues: MenuAudioCue[] = ["select", "confirm", "launch", "return", "complete"];

beforeEach(() => {
  vi.useFakeTimers();
  contexts = [];
  configure = () => {};
  constructor = vi.fn(function () {
    const context = new MockAudioContext();
    configure(context);
    contexts.push(context);
    return context;
  });
  vi.stubGlobal("AudioContext", constructor);
  vi.stubGlobal("webkitAudioContext", undefined);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useMenuAudio", () => {
  it("defaults to silence without constructing audio, including Strict Mode", () => {
    const wrapper = ({ children }: PropsWithChildren) => createElement(StrictMode, null, children);
    const { result } = renderHook(useMenuAudio, { wrapper });
    expect(result.current.enabled).toBe(false);
    expect(result.current.available).toBe(true);
    act(() => {
      for (const cue of allCues) result.current.play(cue);
    });
    expect(constructor).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("creates and resumes only on opt-in, without an automatic cue", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    expect(result.current.enabled).toBe(true);
    expect(contexts).toHaveLength(1);
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(contexts[0].sources).toHaveLength(0);
    act(() => { result.current.play("confirm"); });
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(contexts[0].sources).toHaveLength(1);
  });

  it("does not resume an already running context", () => {
    configure = context => { context.state = "running"; };
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); });
    expect(contexts[0].resume).not.toHaveBeenCalled();
    expect(result.current.enabled).toBe(true);
  });

  it.each(allCues)("keeps %s quiet and shorter than 250ms", async cue => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    contexts[0].currentTime = 10;
    act(() => { result.current.play(cue); });
    const source = contexts[0].sources[0];
    const gain = contexts[0].gains[0];
    expect(source.start).toHaveBeenCalledWith(10);
    expect(source.buffer!.duration).toBeGreaterThan(0);
    expect(source.buffer!.duration).toBeLessThan(0.25);
    const samples = source.buffer!.getChannelData(0);
    expect(samples).toEqual(renderMenuCue(cue, contexts[0].sampleRate));
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.03);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(1, 10);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(contexts[0].destination);
  });

  it.each(allCues)("suppresses rapid repeated %s cues without delayed playback", async cue => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => {
      result.current.play(cue);
      contexts[0].currentTime = 0.05;
      result.current.play(cue);
    });
    expect(contexts[0].sources).toHaveLength(1);
    act(() => {
      contexts[0].currentTime = 0.13;
      result.current.play(cue);
    });
    expect(contexts[0].sources).toHaveLength(2);
    act(() => { vi.runAllTimers(); });
    expect(contexts[0].sources).toHaveLength(2);
  });

  it("allows a distinct return or completion cue while suppressing duplicate launches", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => {
      result.current.play("launch");
      contexts[0].currentTime = 0.02;
      result.current.play("return");
      contexts[0].currentTime = 0.04;
      result.current.play("launch");
      contexts[0].currentTime = 0.05;
      result.current.play("complete");
    });
    expect(contexts[0].sources).toHaveLength(3);
    expect(contexts[0].gains.slice(0, 2).every(gain => gain.disconnect.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    act(() => { vi.runAllTimers(); });
    expect(contexts[0].sources).toHaveLength(3);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets cue suppression after a fresh opt-in", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("launch"); result.current.toggle(); });
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("launch"); });
    expect(contexts).toHaveLength(2);
    expect(contexts[1].sources).toHaveLength(1);
  });

  it("replaces active cues instead of stacking their volume", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("confirm"); result.current.play("complete"); });
    expect(contexts[0].sources[0].stop).toHaveBeenLastCalledWith();
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
  });

  it("releases ended nodes and cancels their cleanup timer", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("confirm"); });
    act(() => { contexts[0].sources[0].onended?.(); });
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases nodes even if ended is never delivered", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("complete"); vi.advanceTimersByTime(240); });
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(allCues)("mutes %s immediately, stops all nodes, and ignores further play calls", async cue => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => {
      result.current.play(cue);
      result.current.toggle();
      for (const mutedCue of allCues) result.current.play(mutedCue);
    });
    expect(result.current.enabled).toBe(false);
    expect(contexts[0].sources).toHaveLength(1);
    expect(contexts[0].sources[0].stop).toHaveBeenLastCalledWith();
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("requires a fresh opt-in after unmount and does not persist enabled state", async () => {
    const first = renderHook(useMenuAudio);
    await act(async () => { first.result.current.toggle(); });
    act(() => { first.result.current.play("select"); });
    const stalePlay = first.result.current.play;
    first.unmount();
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const second = renderHook(useMenuAudio);
    act(() => { stalePlay("complete"); });
    expect(second.result.current.enabled).toBe(false);
    expect(contexts).toHaveLength(1);
  });

  it("never queues cues while resume is pending or after it settles", async () => {
    const pending = deferred();
    configure = context => { context.resume.mockImplementation(() => pending.promise); };
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); result.current.play("confirm"); });
    expect(contexts[0].sources).toHaveLength(0);
    await act(async () => { contexts[0].state = "running"; pending.resolve(); });
    expect(contexts[0].sources).toHaveLength(0);
    act(() => { result.current.play("confirm"); });
    expect(contexts[0].sources).toHaveLength(1);
  });

  it("stays muted when a pending resume resolves after switching off", async () => {
    const pending = deferred();
    configure = context => { context.resume.mockImplementation(() => pending.promise); };
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); result.current.play("complete"); result.current.toggle(); });
    await act(async () => { pending.resolve(); });
    act(() => { result.current.play("confirm"); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.available).toBe(true);
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].sources).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["resolve", "reject"] as const)("ignores stale resume %s after mute and re-enable", async outcome => {
    const pending = deferred();
    configure = context => { if (!contexts.length) context.resume.mockImplementation(() => pending.promise); };
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); result.current.toggle(); });
    await act(async () => { result.current.toggle(); });
    await act(async () => {
      if (outcome === "resolve") pending.resolve();
      else pending.reject(new Error("Late resume rejection"));
    });
    expect(result.current.enabled).toBe(true);
    expect(result.current.available).toBe(true);
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].sources).toHaveLength(0);
    act(() => { result.current.play("select"); });
    expect(contexts[1].sources).toHaveLength(1);
  });

  it("closes a pending context on unmount without late playback", async () => {
    const pending = deferred();
    configure = context => { context.resume.mockImplementation(() => pending.promise); };
    const { result, unmount } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); });
    unmount();
    await act(async () => { pending.reject(new Error("Context removed")); });
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].sources).toHaveLength(0);
  });

  it("does not resume from play and cancels interrupted cues", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => {
      result.current.play("complete");
      contexts[0].changeState("suspended");
      result.current.play("confirm");
      contexts[0].changeState("running");
    });
    expect(contexts[0].resume).toHaveBeenCalledTimes(1);
    expect(contexts[0].sources).toHaveLength(1);
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disables audio when the context closes unexpectedly", async () => {
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("select"); contexts[0].changeState("closed"); });
    expect(result.current.available).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
  });

  it("gracefully reports unsupported audio without constructing anything", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); result.current.play("complete"); });
    expect(result.current.available).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(constructor).not.toHaveBeenCalled();
  });

  it("supports the prefixed constructor when the standard one is absent", async () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", constructor);
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    expect(result.current.enabled).toBe(true);
    expect(contexts).toHaveLength(1);
  });

  it("handles constructor failure", () => {
    constructor.mockImplementation(() => { throw new Error("Audio blocked"); });
    const { result } = renderHook(useMenuAudio);
    act(() => { result.current.toggle(); });
    expect(result.current.available).toBe(false);
    expect(result.current.enabled).toBe(false);
  });

  it.each(["throw", "reject", "suspended"] as const)("handles a resume that will %s", async outcome => {
    configure = context => {
      context.resume.mockImplementation(() => {
        if (outcome === "throw") throw new Error("Resume blocked");
        return outcome === "reject" ? Promise.reject(new Error("Resume blocked")) : Promise.resolve();
      });
    };
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    expect(result.current.available).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(contexts[0].sources).toHaveLength(0);
  });

  it("cleans up a partially constructed cue after a node error", async () => {
    configure = context => { context.createGain.mockImplementation(() => { throw new Error("Node unavailable"); }); };
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("confirm"); });
    expect(result.current.available).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases both nodes when sample-buffer allocation is unavailable", async () => {
    configure = context => { context.createBuffer.mockImplementation(() => { throw new Error("Buffer unavailable"); }); };
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    act(() => { result.current.play("launch"); });
    expect(result.current.available).toBe(false);
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].close).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["throw", "reject"] as const)("handles close %s without an unhandled failure", async outcome => {
    configure = context => {
      context.close.mockImplementation(() => {
        if (outcome === "throw") throw new Error("Close unavailable");
        return Promise.reject(new Error("Close unavailable"));
      });
    };
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    await act(async () => { result.current.play("select"); result.current.toggle(); });
    expect(result.current.enabled).toBe(false);
    expect(result.current.available).toBe(false);
    expect(contexts[0].gains[0].disconnect).toHaveBeenCalledOnce();
  });

  it("handles close rejection during unmount", async () => {
    configure = context => { context.close.mockRejectedValue(new Error("Close unavailable")); };
    const { result, unmount } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    await act(async () => { unmount(); });
    expect(contexts[0].close).toHaveBeenCalledOnce();
  });

  it("does not let a stale close rejection disable a new opt-in", async () => {
    const pending = deferred();
    configure = context => { if (!contexts.length) context.close.mockImplementation(() => pending.promise); };
    const { result } = renderHook(useMenuAudio);
    await act(async () => { result.current.toggle(); });
    await act(async () => { result.current.toggle(); result.current.toggle(); });
    await act(async () => { pending.reject(new Error("Old close rejected")); });
    expect(result.current.available).toBe(true);
    expect(result.current.enabled).toBe(true);
    act(() => { result.current.play("confirm"); });
    expect(contexts[1].sources).toHaveLength(1);
    expect(contexts[1].close).not.toHaveBeenCalled();
  });
});

describe("menu cue PCM", () => {
  it.each([44100, 48000, 96000])("produces quiet, deterministic click tails at %s Hz with silent endpoints", sampleRate => {
    for (const cue of allCues) {
      const samples = renderMenuCue(cue, sampleRate);
      expect(samples).toEqual(renderMenuCue(cue, sampleRate));
      expect(samples.length / sampleRate).toBeLessThan(0.15);
      expect(Math.abs(samples[0])).toBe(0);
      expect(Math.abs(samples.at(-1)!)).toBe(0);
      const peak = Math.max(...samples.map(Math.abs));
      expect(peak).toBeGreaterThan(0.002);
      expect(peak).toBeLessThan(0.03);
      const energy = (data: Float32Array) => data.reduce((sum, value) => sum + value * value, 0) / data.length;
      const first = energy(samples.slice(0, Math.floor(sampleRate * 0.012)));
      const tail = energy(samples.slice(-Math.floor(sampleRate * 0.012)));
      expect(tail).toBeLessThan(first * 0.02);
      expect(Math.abs(samples.reduce((sum, value) => sum + value, 0) / samples.length)).toBeLessThan(0.001);
    }
  });

  it("distinguishes cues by click body and decay instead of transposing the same beep", () => {
    const rendered = allCues.map(cue => renderMenuCue(cue, 48000));
    for (let index = 0; index < rendered.length; index += 1) {
      for (let other = index + 1; other < rendered.length; other += 1) {
        expect(rendered[index].slice(0, 480)).not.toEqual(rendered[other].slice(0, 480));
      }
    }
    expect(rendered[2].length).toBeGreaterThan(rendered[3].length);
  });

  it.each([NaN, Infinity, 0, -48000, 384000])("rejects unsupported sample rate %s before allocation", sampleRate => {
    expect(() => renderMenuCue("select", sampleRate)).toThrow(RangeError);
  });
});
