// Python runs in a fresh browser worker for each run. Pyodide and the Python
// standard library are served from Diana's own static assets.

import { runPythonLite, type CodeRunResult } from "./sandbox";

export const RUN_TIMEOUT_MS = 8_000;
export const WORKER_START_TIMEOUT_MS = 30_000;
export const MAX_CODE_BYTES = 250_000;
export const MAX_OUTPUT_LINES = 200;

export type PythonRunResult = CodeRunResult & {
  durationMs: number;
  outputTruncated: boolean;
  runtime: "pyodide" | "python-lite" | "unavailable";
};

type WorkerResultMessage = {
  type: "result";
  runId: string;
  ok: boolean;
  output: string[];
  error: string | null;
  outputTruncated?: boolean;
};

const activeWorkers = new Set<Worker>();
let runQueue: Promise<unknown> = Promise.resolve();

export function pyodideAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined"
  );
}

export function validateCodeForRun(code: string): string | null {
  if (code.includes("\0")) {
    return "Remove the null character before running this code.";
  }
  if (new TextEncoder().encode(code).byteLength > MAX_CODE_BYTES) {
    return "Keep this run under 250 KB. Split a larger program into smaller files or tests.";
  }
  return null;
}

export async function runPython(code: string): Promise<PythonRunResult> {
  const startedAt = now();
  const validationError = validateCodeForRun(code);
  if (validationError) {
    return {
      ok: false,
      output: [],
      error: validationError,
      durationMs: elapsed(startedAt),
      outputTruncated: false,
      runtime: "unavailable",
    };
  }
  if (!pyodideAvailable()) return runWithLiteFallback(code, startedAt);

  const queuedRun = runQueue.then(
    () => runPythonInWorker(code),
    () => runPythonInWorker(code),
  );
  runQueue = queuedRun.catch(() => undefined);
  return queuedRun;
}

async function runPythonInWorker(code: string): Promise<PythonRunResult> {
  const startedAt = now();
  let worker: Worker;
  try {
    worker = await createSandboxWorker();
  } catch {
    return runWithLiteFallback(code, startedAt);
  }

  const runId = createRunId();
  return new Promise<PythonRunResult>((resolve) => {
    let settled = false;
    const finish = (result: PythonRunResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      activeWorkers.delete(worker);
      worker.terminate();
      resolve(result);
    };
    const onMessage = (event: MessageEvent<WorkerResultMessage>) => {
      if (event.data?.type !== "result" || event.data.runId !== runId) return;
      finish({
        ok: event.data.ok,
        output: event.data.output.slice(0, MAX_OUTPUT_LINES + 1),
        error: event.data.error,
        durationMs: elapsed(startedAt),
        outputTruncated: event.data.outputTruncated === true,
        runtime: "pyodide",
      });
    };
    const onError = () => {
      finish({
        ok: false,
        output: [],
        error: "The Python sandbox stopped. Start a new run when you are ready.",
        durationMs: elapsed(startedAt),
        outputTruncated: false,
        runtime: "pyodide",
      });
    };
    const timeout = window.setTimeout(() => {
      finish({
        ok: false,
        output: [],
        error: "That run took too long. Check for a loop that never ends, then try again.",
        durationMs: elapsed(startedAt),
        outputTruncated: false,
        runtime: "pyodide",
      });
    }, RUN_TIMEOUT_MS);

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ type: "run", runId, code });
  });
}

function createSandboxWorker(): Promise<Worker> {
  return new Promise<Worker>((resolve, reject) => {
    const worker = new Worker("/pyodide-sandbox-worker.js", {
      name: "diana-python-sandbox",
      type: "module",
    });
    activeWorkers.add(worker);
    const timeout = window.setTimeout(() => {
      cleanup();
      activeWorkers.delete(worker);
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
        activeWorkers.delete(worker);
        worker.terminate();
        reject(new Error("sandbox could not start"));
      }
    };
    const onError = () => {
      cleanup();
      activeWorkers.delete(worker);
      worker.terminate();
      reject(new Error("sandbox could not start"));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  });
}

function runWithLiteFallback(code: string, startedAt = now()): PythonRunResult {
  const result = runPythonLite(code);
  return {
    ...result,
    durationMs: elapsed(startedAt),
    outputTruncated: false,
    runtime: "python-lite",
  };
}

function createRunId(): string {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `run-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function elapsed(startedAt: number): number {
  return Math.max(0, Math.round(now() - startedAt));
}

export function disposePythonSandbox() {
  for (const worker of activeWorkers) worker.terminate();
  activeWorkers.clear();
}
