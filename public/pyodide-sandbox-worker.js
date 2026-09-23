/* global importScripts, loadPyodide */
"use strict";

const PYODIDE_VERSION = "0.26.4";
const PYODIDE_BASE =
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const MAX_OUTPUT_LINES = 200;

let runtime = null;

function blockNetwork() {
  const blocked = () => {
    throw new Error("Network access is disabled in the code sandbox.");
  };
  self.fetch = blocked;
  self.WebSocket = blocked;
  self.EventSource = blocked;
  self.XMLHttpRequest = blocked;
  self.Worker = blocked;
  self.SharedWorker = blocked;
  self.WebTransport = blocked;
  self.importScripts = blocked;
}

function conciseError(error) {
  const lines = String(error instanceof Error ? error.message : error)
    .trim()
    .split("\n");
  return lines.slice(-3).join("\n");
}

async function initialize() {
  try {
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    runtime = await loadPyodide({ indexURL: PYODIDE_BASE });
    blockNetwork();
    self.postMessage({ type: "ready" });
  } catch {
    self.postMessage({ type: "init_error" });
  }
}

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run" || !runtime) return;
  const { runId, code } = event.data;
  const output = [];
  const capture = (line) => {
    if (output.length < MAX_OUTPUT_LINES) output.push(String(line));
  };
  runtime.setStdout({ batched: capture });
  runtime.setStderr({ batched: capture });

  const globals = runtime.globals.get("dict")();
  try {
    await runtime.runPythonAsync(String(code), { globals });
    if (output.length >= MAX_OUTPUT_LINES) output.push("Output capped.");
    self.postMessage({
      type: "result",
      runId,
      ok: true,
      output,
      error: null,
    });
  } catch (error) {
    self.postMessage({
      type: "result",
      runId,
      ok: false,
      output,
      error: conciseError(error),
    });
  } finally {
    globals.destroy();
  }
});

void initialize();
