// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  disposePythonSandbox,
  RUN_TIMEOUT_MS,
  runPython,
} from "./pyodide-runner";

type Listener = (event: MessageEvent) => void;

class FakeWorker {
  static instances: FakeWorker[] = [];
  static holdNewRuns = false;
  readonly listeners = new Map<string, Set<Listener>>();
  readonly terminate = vi.fn();
  holdRuns = FakeWorker.holdNewRuns;

  constructor() {
    FakeWorker.instances.push(this);
    queueMicrotask(() => this.emit("message", { type: "ready" }));
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    const callback = listener as Listener;
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.get(type)?.delete(listener as Listener);
  }

  postMessage(message: { type: string; runId?: string }) {
    if (message.type !== "run" || this.holdRuns) return;
    queueMicrotask(() => this.emit("message", {
      type: "result",
      runId: message.runId,
      ok: true,
      output: ["5"],
      error: null,
    }));
  }

  emit(type: string, data: unknown) {
    const event = { data } as MessageEvent;
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

beforeEach(() => {
  FakeWorker.instances = [];
  FakeWorker.holdNewRuns = false;
  Object.defineProperty(globalThis, "Worker", {
    configurable: true,
    value: FakeWorker,
    writable: true,
  });
});

afterEach(() => {
  disposePythonSandbox();
  vi.useRealTimers();
});

describe("browser Python sandbox", () => {
  it("returns worker output", async () => {
    await expect(runPython("print(2 + 3)")).resolves.toEqual({
      ok: true,
      output: ["5"],
      error: null,
    });
  });

  it("terminates the worker when student code exceeds the hard timeout", async () => {
    vi.useFakeTimers();
    FakeWorker.holdNewRuns = true;
    const result = runPython("while True:\n  pass");
    await vi.advanceTimersByTimeAsync(0);
    const worker = FakeWorker.instances[0];
    expect(worker).toBeDefined();
    await vi.advanceTimersByTimeAsync(RUN_TIMEOUT_MS);

    await expect(result).resolves.toMatchObject({
      ok: false,
      output: [],
    });
    expect(worker!.terminate).toHaveBeenCalledTimes(1);
  });
});
