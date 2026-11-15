// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runBrowserRecognition } from "./browser-recognition";
import { browserRecognitionModels } from "./browser-recognition-models";

const workers: FakeWorker[] = [];
let throwOnPost = false;
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn(() => { if (throwOnPost) throw new Error("transfer_error"); });
  constructor() { workers.push(this); }
}
const prepare = (signal = new AbortController().signal) => runBrowserRecognition({ kind: "speech", operation: "prepare", signal });
beforeEach(() => {
  workers.length = 0;
  throwOnPost = false;
  vi.useFakeTimers();
  vi.stubGlobal("Worker", FakeWorker);
  vi.stubGlobal("isSecureContext", true);
  vi.stubGlobal("caches", {});
  vi.stubGlobal("crypto", { subtle: {} });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("browser recognition worker lifecycle", () => {
  it("allows one active worker and terminates it on successful preparation", async () => {
    const work = prepare();
    expect(workers).toHaveLength(1);
    await expect(prepare()).rejects.toThrow("Another local reading");
    workers[0].onmessage?.({ data: { type: "ready" } });
    await expect(work).resolves.toBeNull();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const next = prepare();
    workers[1].onmessage?.({ data: { type: "ready" } });
    await next;
  });

  it("aborts immediately, clears its deadline and ignores any late message", async () => {
    const controller = new AbortController();
    const work = prepare(controller.signal);
    const rejected = expect(work).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    await rejected;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    workers[0].onmessage?.({ data: { type: "ready" } });
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const next = prepare();
    workers[1].onerror?.();
    await expect(next).rejects.toThrow("could not start");
  });

  it("does not start a worker when already aborted or the file exceeds its bound", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(prepare(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    await expect(runBrowserRecognition({ kind: "speech", operation: "recognize", file: { size: 5_000_001 } as File, signal: new AbortController().signal })).rejects.toThrow("under 5 MB");
    expect(workers).toHaveLength(0);
  });

  it("requires the declared model and unconfirmed draft state before accepting output", async () => {
    const file = { size: 2, type: "audio/wav", arrayBuffer: async () => new ArrayBuffer(2) } as File;
    const controller = new AbortController();
    const work = runBrowserRecognition({ kind: "speech", operation: "recognize", file, signal: controller.signal });
    await Promise.resolve();
    const worker = workers[0];
    const model = browserRecognitionModels.speech;
    const message = { type: "result", text: "Draft only", kind: "speech", modelId: model.id, revision: model.revision, confirmed: false };
    for (const change of [{ revision: "unapproved-revision" }, { confirmed: true }, { kind: "handwriting_line" }, { text: "x".repeat(4001) }]) {
      worker.onmessage?.({ data: { ...message, ...change } });
      expect(worker.terminate).not.toHaveBeenCalled();
    }
    worker.onmessage?.({ data: message });
    await expect(work).resolves.toBe("Draft only");
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("terminates a stalled preparation at its deadline", async () => {
    const work = prepare();
    const rejected = expect(work).rejects.toThrow("time limit");
    await vi.advanceTimersByTimeAsync(600_000);
    await rejected;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("terminates and clears the deadline when sending a message throws", async () => {
    throwOnPost = true;
    await expect(prepare()).rejects.toThrow();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
