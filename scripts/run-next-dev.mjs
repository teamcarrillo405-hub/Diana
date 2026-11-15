import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { dirname } from "node:path"

const require = createRequire(import.meta.url)
const nextBin = require.resolve("next/dist/bin/next")
const wasmDirectory = dirname(require.resolve("@next/swc-wasm-nodejs/wasm.js"))

const child = spawn(
  process.execPath,
  [nextBin, "dev", ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      NEXT_TEST_WASM_DIR: wasmDirectory,
    },
    stdio: "inherit",
  },
)

const stopChild = (signal) => {
  if (!child.killed) child.kill(signal)
}

process.once("SIGINT", () => stopChild("SIGINT"))
process.once("SIGTERM", () => stopChild("SIGTERM"))

child.on("exit", (code) => {
  process.exit(code ?? 1)
})
