/* global self */
"use strict";

const MAX_OUTPUT_LINES = 200;
const MAX_OUTPUT_BYTES = 64_000;
const MAX_OUTPUT_LINE_BYTES = 4_096;
const NativeFunction = Function;
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
  "eval",
  "Function",
  "WebAssembly",
  "SharedArrayBuffer",
  "Atomics",
  "setTimeout",
  "setInterval",
]) lock(name);

for (const constructor of [
  NativeFunction,
  Object.getPrototypeOf(async function () {}).constructor,
  Object.getPrototypeOf(function* () {}).constructor,
  Object.getPrototypeOf(async function* () {}).constructor,
]) {
  try {
    Object.defineProperty(constructor.prototype, "constructor", {
      configurable: false,
      value: blocked,
      writable: false,
    });
  } catch {
    // Host APIs and source validation remain locked if a prototype is immutable.
  }
}

function format(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "run") return;
  const { runId, code } = event.data;
  const output = [];
  let outputBytes = 0;
  let outputTruncated = false;
  const capture = (...values) => {
    if (output.length >= MAX_OUTPUT_LINES || outputBytes >= MAX_OUTPUT_BYTES) {
      outputTruncated = true;
      return;
    }
    const raw = values.map(format).join(" ").replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "");
    let line = raw;
    while (encoder.encode(line).byteLength > MAX_OUTPUT_LINE_BYTES) line = line.slice(0, -1);
    const remaining = MAX_OUTPUT_BYTES - outputBytes;
    while (encoder.encode(line).byteLength > remaining) line = line.slice(0, -1);
    output.push(line);
    outputBytes += encoder.encode(line).byteLength;
    if (line !== raw) outputTruncated = true;
  };
  const safeConsole = Object.freeze({
    log: (...values) => capture(...values),
    info: (...values) => capture(...values),
    warn: (...values) => capture(...values),
    error: (...values) => capture(...values),
  });

  try {
    if (/\b(?:import|export)\b/u.test(String(code))) {
      throw new Error("Network and module imports are disabled in this code sandbox.");
    }
    const execute = NativeFunction(
      "console",
      "self",
      "globalThis",
      "postMessage",
      "fetch",
      "Worker",
      "WebAssembly",
      `"use strict";\n${String(code)}`,
    );
    execute(safeConsole, undefined, undefined, blocked, blocked, blocked, blocked);
    if (outputTruncated) output.push("Output capped.");
    send({ type: "result", runId, ok: true, output, error: null, outputTruncated });
  } catch (error) {
    send({
      type: "result",
      runId,
      ok: false,
      output,
      error: String(error instanceof Error ? error.message : error).slice(0, 4_096),
      outputTruncated,
    });
  }
});

send({ type: "ready" });
