import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(repoRoot, "dist", "worker", "run-diana-worker.cjs");
const keep = process.argv.includes("--keep");

if (!existsSync(source)) {
  console.error(JSON.stringify({
    ok: false,
    error: "Compiled worker bundle is missing. Run npm run worker:build first.",
  }));
  process.exit(1);
}

const tempRoot = mkdtempSync(join(tmpdir(), "diana-worker-runtime-"));
const target = join(tempRoot, "dist", "worker", "run-diana-worker.cjs");
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);

const env = {
  ...process.env,
  WORKER_API_TOKEN: process.env.WORKER_API_TOKEN ?? "runtime-smoke-token",
  DIANA_WORKER_BASE_URL: process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000",
  OPENJARVIS_BASE_URL: process.env.OPENJARVIS_BASE_URL ?? "http://openjarvis:8000",
  OPENJARVIS_MODEL: process.env.OPENJARVIS_MODEL ?? "llama3.2:3b",
};

const result = spawnSync(process.execPath, [target, "--check-config"], {
  cwd: tempRoot,
  env,
  encoding: "utf8",
});

try {
  if (result.status !== 0) {
    console.error(JSON.stringify({
      ok: false,
      tempRoot,
      status: result.status,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    }));
    process.exit(result.status ?? 1);
  }

  const stdout = result.stdout.trim();
  const json = JSON.parse(stdout.split(/\r?\n/).at(-1) ?? "{}");
  const ok = json.status === "configured" &&
    json.sidecarProvider === "openjarvis" &&
    json.sidecarBaseUrl === env.OPENJARVIS_BASE_URL &&
    json.sidecarModel === env.OPENJARVIS_MODEL &&
    !existsSync(join(tempRoot, "node_modules"));

  console.log(JSON.stringify({
    ok,
    tempRoot: keep ? tempRoot : "removed",
    command: "node dist/worker/run-diana-worker.cjs --check-config",
    workerStatus: json.status,
    sidecarProvider: json.sidecarProvider,
    sidecarBaseUrl: json.sidecarBaseUrl,
    sidecarModel: json.sidecarModel,
    nodeModulesPresent: existsSync(join(tempRoot, "node_modules")),
  }));

  if (!ok) process.exit(1);
} finally {
  if (!keep) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
