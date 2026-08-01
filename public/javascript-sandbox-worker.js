"use strict";

const MAX_OUTPUT_LINES = 200;
const NativeFunction = Function;
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
]) {
  lock(name);
}

for (const constructor of [
  Function,
  Object.getPrototypeOf(async function () {}).constructor,
  Object.getPrototypeOf(function* () {}).constructor,
]) {
  try {
    Object.defineProperty(constructor.prototype, "constructor", {
      configurable: false,
      value: blocked,
      writable: false,
    });
  } catch {
    // The direct import check and blocked host APIs still apply.
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

let currentCapture = () => {};
lock("console", Object.freeze({
  log: (...values) => currentCapture(...values),
  info: (...values) => currentCapture(...values),
  warn: (...values) => currentCapture(...values),
  error: (...values) => currentCapture(...values),
}));

self.addEventListener("message", (event) => {
  if (event.data?.type !== "run") return;
  const { runId, code } = event.data;
  const output = [];
  const capture = (...values) => {
    if (output.length < MAX_OUTPUT_LINES) {
      output.push(values.map(format).join(" "));
    }
  };
  currentCapture = capture;

  try {
    if (/\bimport\s*(?:\(|[\w*{])/u.test(String(code))) {
      throw new Error("Network and module imports are disabled in this code sandbox.");
    }
    NativeFunction(`"use strict";\n${String(code)}`)();
    if (output.length >= MAX_OUTPUT_LINES) output.push("Output capped.");
    send({ type: "result", runId, ok: true, output, error: null });
  } catch (error) {
    send({
      type: "result",
      runId,
      ok: false,
      output,
      error: String(error instanceof Error ? error.message : error),
    });
  } finally {
    currentCapture = () => {};
  }
});

send({ type: "ready" });
