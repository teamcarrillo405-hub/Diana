/* global self */
"use strict";

import { loadPyodide } from "/vendor/pyodide/pyodide.mjs";

const MAX_OUTPUT_LINES = 200;
const MAX_OUTPUT_BYTES = 64_000;
const MAX_OUTPUT_LINE_BYTES = 4_096;
const encoder = new TextEncoder();
const send = self.postMessage.bind(self);

function blocked() {
  throw new Error("Network and host access are disabled in the code sandbox.");
}

function lock(name, value = blocked) {
  try {
    Object.defineProperty(self, name, {
      configurable: false,
      enumerable: false,
      value,
      writable: false,
    });
  } catch {
    self[name] = value;
  }
}

function blockHostApis() {
  for (const name of [
    "fetch",
    "WebSocket",
    "EventSource",
    "XMLHttpRequest",
    "Worker",
    "SharedWorker",
    "WebTransport",
    "importScripts",
    "BroadcastChannel",
    "caches",
    "indexedDB",
    "postMessage",
    "close",
  ]) lock(name);
}

function conciseError(error) {
  const lines = String(error instanceof Error ? error.message : error)
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
    .trim()
    .split("\n");
  return lines.slice(-4).join("\n").slice(0, 4_096);
}

const PYTHON_POLICY = String.raw`
import os as _diana_os
import sys as _diana_sys

_DIANA_WRITE_FLAGS = (
    _diana_os.O_WRONLY
    | _diana_os.O_RDWR
    | _diana_os.O_APPEND
    | _diana_os.O_CREAT
    | _diana_os.O_TRUNC
)

def _diana_audit(event, args):
    if event == "open":
        mode = args[1] if len(args) > 1 else None
        flags = args[2] if len(args) > 2 else 0
        if (isinstance(mode, str) and any(flag in mode for flag in "wax+")) or (
            isinstance(flags, int) and flags & _DIANA_WRITE_FLAGS
        ):
            raise PermissionError("File writes are disabled in this browser sandbox.")
    if event in {"os.system", "os.exec", "subprocess.Popen", "socket.__new__"}:
        raise PermissionError("Process and socket access are disabled in this browser sandbox.")

_diana_sys.addaudithook(_diana_audit)
`;

let runtime = null;

async function initialize() {
  try {
    runtime = await loadPyodide({
      indexURL: new URL("/vendor/pyodide/", self.location.origin).href,
    });
    await runtime.runPythonAsync(PYTHON_POLICY);
    blockHostApis();
    send({ type: "ready" });
  } catch {
    send({ type: "init_error" });
  }
}

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "run" || !runtime) return;
  const { runId, code } = event.data;
  const output = [];
  let outputBytes = 0;
  let outputTruncated = false;
  const capture = (value) => {
    if (output.length >= MAX_OUTPUT_LINES || outputBytes >= MAX_OUTPUT_BYTES) {
      outputTruncated = true;
      return;
    }
    const raw = String(value).replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
    let line = raw;
    while (encoder.encode(line).byteLength > MAX_OUTPUT_LINE_BYTES) line = line.slice(0, -1);
    const remaining = MAX_OUTPUT_BYTES - outputBytes;
    while (encoder.encode(line).byteLength > remaining) line = line.slice(0, -1);
    output.push(line);
    outputBytes += encoder.encode(line).byteLength;
    if (line !== raw) outputTruncated = true;
  };
  runtime.setStdout({ batched: capture });
  runtime.setStderr({ batched: capture });

  const globals = runtime.globals.get("dict")();
  try {
    await runtime.runPythonAsync(String(code), { globals });
    if (outputTruncated) output.push("Output capped.");
    send({ type: "result", runId, ok: true, output, error: null, outputTruncated });
  } catch (error) {
    send({
      type: "result",
      runId,
      ok: false,
      output,
      error: conciseError(error),
      outputTruncated,
    });
  } finally {
    globals.destroy();
  }
});

void initialize();
