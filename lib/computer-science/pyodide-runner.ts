// Real Python in the browser via Pyodide (MIT-licensed CPython on wasm).
//
// Free-ecosystem adoption: the lite runner covers print/variables/loops, but
// real coursework needs functions, lists, dicts, imports. Pyodide loads from
// the jsDelivr CDN only when a student actually runs Python — nothing is
// bundled. On any load or runtime failure we fall back to the deterministic
// lite runner so the feature never breaks offline or on a blocked CDN.

import { runPythonLite, type CodeRunResult } from "./sandbox";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const RUN_TIMEOUT_MS = 8_000;
const MAX_OUTPUT_LINES = 200;

type PyodideLike = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (line: string) => void }) => void;
  setStderr: (options: { batched: (line: string) => void }) => void;
};

let pyodidePromise: Promise<PyodideLike> | null = null;

/** Whether the rich runtime can even be attempted in this environment. */
export function pyodideAvailable(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

async function loadPyodideOnce(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      await injectScript(`${PYODIDE_BASE}pyodide.js`);
      const loadPyodide = (window as unknown as {
        loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideLike>;
      }).loadPyodide;
      if (!loadPyodide) throw new Error("Pyodide loader missing after script load");
      return loadPyodide({ indexURL: PYODIDE_BASE });
    })().catch((err) => {
      pyodidePromise = null; // allow a retry on the next run
      throw err;
    });
  }
  return pyodidePromise;
}

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Run student Python with real CPython semantics; fall back to the lite
 * runner when wasm/CDN is unavailable. Output is line-capped and the run is
 * time-capped so a stray `while True:` cannot hang the helper.
 */
export async function runPython(code: string): Promise<CodeRunResult> {
  if (!pyodideAvailable()) return runPythonLite(code);

  try {
    const pyodide = await withTimeout(loadPyodideOnce(), RUN_TIMEOUT_MS);
    const output: string[] = [];
    const capture = (line: string) => {
      if (output.length < MAX_OUTPUT_LINES) output.push(line);
    };
    pyodide.setStdout({ batched: capture });
    pyodide.setStderr({ batched: capture });

    await withTimeout(pyodide.runPythonAsync(code), RUN_TIMEOUT_MS);
    if (output.length >= MAX_OUTPUT_LINES) output.push("… output capped.");
    return { ok: true, output, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "timeout") {
      return {
        ok: false,
        output: [],
        error: "That run took too long: check for a loop that never ends, then try again.",
      };
    }
    // CDN or wasm unavailable → quiet fallback to the lite runner.
    if (/could not load|loader missing|networkerror/i.test(message)) {
      return runPythonLite(code);
    }
    // Real Python error: show it — reading tracebacks is part of learning.
    return { ok: false, output: [], error: trimTraceback(message) };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

/** Last lines of a Python traceback — the part a student can act on. */
function trimTraceback(message: string): string {
  const lines = message.trim().split("\n");
  return lines.slice(-3).join("\n");
}
