// Python runs in a dedicated browser worker. The worker has no DOM access,
// blocks network primitives before student code executes, and is terminated
// when a run exceeds its time limit.

import { runPythonLite, type CodeRunResult } from "./sandbox";

export const RUN_TIMEOUT_MS = 8_000;
export const WORKER_START_TIMEOUT_MS = 30_000;
export const MAX_CODE_BYTES = 250_000;
export const MAX_OUTPUT_LINES = 200;

type WorkerResultMessage = {
  type: "result";
  runId: string;
  ok: boolean;
  output: string[];
  error: string | null;
};

let sandboxWorkerPromise: Promise<Worker> | null = null;
let runQueue: Promise<unknown> = Promise.resolve();

export function pyodideAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

export function validateCodeForRun(code: string): string | null {
  const bytes = new TextEncoder().encode(code).byteLength;
  if (bytes > MAX_CODE_BYTES) {
    return "Keep this run under 250 KB. Split a larger program into smaller files or tests.";
  }
  return null;
}

export async function runPython(code: string): Promise<CodeRunResult> {
  const validationError = validateCodeForRun(code);
  if (validationError) {
    return { ok: false, output: [], error: validationError };
  }
  if (!pyodideAvailable()) return runPythonLite(code);

  const queuedRun = runQueue.then(
    () => runPythonInWorker(code),
    () => runPythonInWorker(code),
  );
  runQueue = queuedRun.catch(() => undefined);
  return queuedRun;
}

async function runPythonInWorker(code: string): Promise<CodeRunResult> {
  let worker: Worker;
  try {
    worker = await getSandboxWorker();
  } catch {
    resetSandboxWorker();
    return runPythonLite(code);
  }

  const runId = crypto.randomUUID();
  return new Promise<CodeRunResult>((resolve) => {
    let settled = false;
    const finish = (result: CodeRunResult, reset = false) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      if (reset) resetSandboxWorker();
      resolve(result);
    };
    const onMessage = (event: MessageEvent<WorkerResultMessage>) => {
      if (event.data?.type !== "result" || event.data.runId !== runId) return;
      finish({
        ok: event.data.ok,
        output: event.data.output.slice(0, MAX_OUTPUT_LINES + 1),
        error: event.data.error,
      });
    };
    const onError = () => {
      finish({
        ok: false,
        output: [],
        error: "The code sandbox stopped. Start a new run when you are ready.",
      }, true);
    };
    const timeout = window.setTimeout(() => {
      finish({
        ok: false,
        output: [],
        error: "That run took too long. Check for a loop that never ends, then try again.",
      }, true);
    }, RUN_TIMEOUT_MS);

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ type: "run", runId, code });
  });
}

function getSandboxWorker(): Promise<Worker> {
  if (sandboxWorkerPromise) return sandboxWorkerPromise;
  sandboxWorkerPromise = new Promise<Worker>((resolve, reject) => {
    const worker = new Worker("/pyodide-sandbox-worker.js", {
      name: "diana-python-sandbox",
    });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("sandbox start timeout"));
    }, WORKER_START_TIMEOUT_MS);
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "ready") {
        cleanup();
        resolve(worker);
      } else if (event.data?.type === "init_error") {
        cleanup();
        worker.terminate();
        reject(new Error("sandbox could not start"));
      }
    };
    const onError = () => {
      cleanup();
      worker.terminate();
      reject(new Error("sandbox could not start"));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  }).catch((error) => {
    sandboxWorkerPromise = null;
    throw error;
  });
  return sandboxWorkerPromise;
}

function resetSandboxWorker() {
  if (sandboxWorkerPromise) {
    void sandboxWorkerPromise.then(
      (worker) => worker.terminate(),
      () => undefined,
    );
  }
  sandboxWorkerPromise = null;
}

export function disposePythonSandbox() {
  resetSandboxWorker();
}
