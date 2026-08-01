import type { CodeRunResult } from "./sandbox";

export const JAVASCRIPT_RUN_TIMEOUT_MS = 8_000;
export const MAX_JAVASCRIPT_BYTES = 250_000;
export const MAX_JAVASCRIPT_OUTPUT_LINES = 200;

type WorkerResultMessage = {
  type: "result";
  runId: string;
  ok: boolean;
  output: string[];
  error: string | null;
};

let javascriptWorkerPromise: Promise<Worker> | null = null;
let javascriptRunQueue: Promise<unknown> = Promise.resolve();

export function javascriptRunnerAvailable(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

export function validateJavaScriptForRun(code: string): string | null {
  if (new TextEncoder().encode(code).byteLength > MAX_JAVASCRIPT_BYTES) {
    return "Keep this run under 250 KB. Split a larger program into smaller files or tests.";
  }
  if (/\bimport\s*(?:\(|[\w*{])/u.test(code)) {
    return "Network and module imports are disabled in this code sandbox.";
  }
  return null;
}

export async function runJavaScript(code: string): Promise<CodeRunResult> {
  const validationError = validateJavaScriptForRun(code);
  if (validationError) {
    return { ok: false, output: [], error: validationError };
  }
  if (!javascriptRunnerAvailable()) {
    return {
      ok: false,
      output: [],
      error: "JavaScript runs are available in the browser workspace.",
    };
  }

  const queuedRun = javascriptRunQueue.then(
    () => runJavaScriptInWorker(code),
    () => runJavaScriptInWorker(code),
  );
  javascriptRunQueue = queuedRun.catch(() => undefined);
  return queuedRun;
}

async function runJavaScriptInWorker(code: string): Promise<CodeRunResult> {
  let worker: Worker;
  try {
    worker = await getJavaScriptWorker();
  } catch {
    resetJavaScriptWorker();
    return {
      ok: false,
      output: [],
      error: "The JavaScript sandbox could not start. Try a new run.",
    };
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
      if (reset) resetJavaScriptWorker();
      resolve(result);
    };
    const onMessage = (event: MessageEvent<WorkerResultMessage>) => {
      if (event.data?.type !== "result" || event.data.runId !== runId) return;
      finish({
        ok: event.data.ok,
        output: event.data.output.slice(0, MAX_JAVASCRIPT_OUTPUT_LINES + 1),
        error: event.data.error,
      });
    };
    const onError = () => {
      finish({
        ok: false,
        output: [],
        error: "The JavaScript sandbox stopped. Start a new run when you are ready.",
      }, true);
    };
    const timeout = window.setTimeout(() => {
      finish({
        ok: false,
        output: [],
        error: "That run took too long. Check for a loop that never ends, then try again.",
      }, true);
    }, JAVASCRIPT_RUN_TIMEOUT_MS);

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.postMessage({ type: "run", runId, code });
  });
}

function getJavaScriptWorker(): Promise<Worker> {
  if (javascriptWorkerPromise) return javascriptWorkerPromise;
  javascriptWorkerPromise = new Promise<Worker>((resolve, reject) => {
    const worker = new Worker("/javascript-sandbox-worker.js", {
      name: "diana-javascript-sandbox",
    });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error("sandbox start timeout"));
    }, 5_000);
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
      worker.terminate();
      reject(new Error("sandbox could not start"));
    };
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
  }).catch((error) => {
    javascriptWorkerPromise = null;
    throw error;
  });
  return javascriptWorkerPromise;
}

function resetJavaScriptWorker() {
  if (javascriptWorkerPromise) {
    void javascriptWorkerPromise.then(
      (worker) => worker.terminate(),
      () => undefined,
    );
  }
  javascriptWorkerPromise = null;
}

export function disposeJavaScriptSandbox() {
  resetJavaScriptWorker();
}
