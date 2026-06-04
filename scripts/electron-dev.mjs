import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const port = process.env.PORT || "3000";
const appUrl = process.env.DIANA_ELECTRON_URL || `http://localhost:${port}`;
const electronMain = join(root, "electron", "main.cjs");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

let nextProcess = null;
let electronProcess = null;

async function main() {
  assertDesktopFiles();

  const alreadyRunning = await isReachable(appUrl);
  if (!alreadyRunning) {
    nextProcess = spawn(npmCommand, ["run", "dev", "--", "--port", port], {
      cwd: root,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: "inherit",
      shell: false,
    });

    nextProcess.on("exit", (code) => {
      if (!electronProcess || electronProcess.exitCode === null) {
        console.error(`Next dev server exited with code ${code ?? "unknown"}.`);
      }
    });
  }

  await waitForApp(appUrl, 45_000);

  const electronPath = require("electron");
  electronProcess = spawn(electronPath, [electronMain], {
    cwd: root,
    env: {
      ...process.env,
      DIANA_ELECTRON_URL: appUrl,
    },
    stdio: "inherit",
    shell: false,
  });

  electronProcess.on("exit", (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

function assertDesktopFiles() {
  for (const path of [electronMain, join(root, "electron", "preload.cjs")]) {
    if (!existsSync(path)) {
      throw new Error(`Missing desktop app file: ${path}`);
    }
  }
}

async function waitForApp(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return;
    await delay(500);
  }
  throw new Error(`Timed out waiting for Diana at ${url}`);
}

async function isReachable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

function cleanup() {
  if (nextProcess && nextProcess.exitCode === null) {
    nextProcess.kill("SIGTERM");
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

main().catch((error) => {
  cleanup();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
