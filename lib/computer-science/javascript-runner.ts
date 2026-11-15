import type { CodeRunResult } from "./sandbox";

export const JAVASCRIPT_RUN_TIMEOUT_MS = 8_000;
export const JAVASCRIPT_WORKER_START_TIMEOUT_MS = 5_000;
export const MAX_JAVASCRIPT_BYTES = 250_000;
export const MAX_JAVASCRIPT_OUTPUT_LINES = 200;

export type JavaScriptRunResult = CodeRunResult & {
  durationMs: number;
  outputTruncated: boolean;
  runtime: "javascript-worker" | "unavailable";
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
let javascriptRunQueue: Promise<unknown> = Promise.resolve();

export function javascriptRunnerAvailable(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

export function validateJavaScriptForRun(code: string): string | null {
  if (code.includes("\0")) {
    return "Remove the null character before running this code.";
  }
  if (new TextEncoder().encode(code).byteLength > MAX_JAVASCRIPT_BYTES) {
    return "Keep this run under 250 KB. Split a larger program into smaller files or tests.";
  }
  if (/\b(?:import|export)\b/u.test(code)) {
    return "Network and module imports are disabled in this code sandbox.";
  }
  return null;
}

export async function runJavaScript(code: string): Promise<JavaScriptRunResult> {
  const startedAt = now();
  const validationError = validateJavaScriptForRun(code);
  if (validationError) return unavailableResult(validationError, startedAt);
  if (!javascriptRunnerAvailable()) {
    return unavailableResult(
      "JavaScript runs are available in the browser workspace.",
      startedAt,
    );
  }

  const queuedRun = javascriptRunQueue.then(
    () => runJavaScriptInWorker(code),
    () => runJavaScriptInWorker(code),
  );
  javascriptRunQueue = queuedRun.catch(() => undefined);
  return queuedRun;
}

async function runJavaScriptInWorker(code: string): Promise<JavaScriptRunResult> {
  const startedAt = now();
  let worker: Worker;
  try {
    worker = await createJavaScriptWorker();
  } catch {
    return unavailableResult(
      "The JavaScript sandbox could not start. Try a new run.",
      startedAt,
    );
  }

  const runId = createRunId();
  return new Promise<JavaScriptRunResult>((resolve) => {
    let settled = false;
    const finish = (result: JavaScriptRunResult) => {
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
        output: event.data.output.slice(0, MAX_JAVASCRIPT_OUTPUT_LINES + 1),
        error: event.data.error,
        durationMs: elapsed(startedAt),
        outputTruncated: event.data.outputTruncated === true,
        runtime: "javascript-worker",
      });
    };
    const onError = () => {
      finish({
        ok: false,
        output: [],
        error: "The JavaScript sandbox stopped. Start a new run when you are ready.",
        durationMs: elapsed(startedAt),
        outputTruncated: false,
        runtime: "javascript-worker",
      });
    };
    const timeout = window.setTimeout(() => {
      finish({
        ok: false,
        output: [],
        error: "That run took too long. Check for a loop that never ends, then try again.",
        durationMs: elapsed(startedAt),
        outputTruncated: false,
        runtime: "javascript-worker",
      });
    }, JAVASCRIPT_RUN_TIMEOUT_MS);

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ type: "run", runId, code });
  });
}

function createJavaScriptWorker(): Promise<Worker> {
  return new Promise<Worker>((resolve, reject) => {
    const worker = new Worker("/javascript-sandbox-worker.js", {
      name: "diana-javascript-sandbox",
    });
    activeWorkers.add(worker);
    const timeout = window.setTimeout(() => {
      cleanup();
      activeWorkers.delete(worker);
      worker.terminate();
      reject(new Error("sandbox start timeout"));
    }, JAVASCRIPT_WORKER_START_TIMEOUT_MS);
    const cleanup = () => {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
    };
    const onMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "ready") return;
      cleanup();
      resolve(worker);
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

function unavailableResult(error: string, startedAt: number): JavaScriptRunResult {
  return {
    ok: false,
    output: [],
    error,
    durationMs: elapsed(startedAt),
    outputTruncated: false,
    runtime: "unavailable",
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

export function disposeJavaScriptSandbox() {
  for (const worker of activeWorkers) worker.terminate();
  activeWorkers.clear();
}
