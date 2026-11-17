import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  CRITICAL_PATH_TESTS,
  launchReadinessPasses,
  type LaunchGateResult,
} from "../lib/launch/readiness";

const npmCli = process.env.npm_execpath;

export type Gate = {
  id: string;
  label: string;
  args: readonly string[];
};

type Environment = Record<string, string | undefined>;

const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/u;

const gates = [
  {
    id: "dependency-audit",
    label: "Production dependency audit",
    args: ["run", "security:audit"],
  },
  {
    id: "typecheck",
    label: "TypeScript",
    args: ["run", "typecheck"],
  },
  {
    id: "critical-tests",
    label: "Critical-path tests",
    args: [
      "exec",
      "--",
      "vitest",
      "run",
      ...CRITICAL_PATH_TESTS,
      "lib/launch/readiness.test.ts",
      "app/api/health/route.test.ts",
      "app/api/readiness/route.test.ts",
    ],
  },
  {
    id: "tone-audit",
    label: "Calm-copy audit",
    args: ["run", "tone-audit"],
  },
] as const;

export function buildRemoteGates(environment: Environment): readonly Gate[] {
  if (environment.DIANA_VERIFY_EDGE_FUNCTION_PARITY !== "true") return [];

  const receiptPath = environment.STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH?.trim() ?? "";
  const releaseSha = environment.DIANA_BETA_RELEASE_SHA?.trim()
    || environment.GITHUB_SHA?.trim()
    || "";
  if (!receiptPath) {
    throw new Error(
      "Edge Function parity requires STAGING_EDGE_DEPLOYMENT_RECEIPT_PATH.",
    );
  }
  if (!RELEASE_SHA_PATTERN.test(releaseSha)) {
    throw new Error(
      "Edge Function parity requires a full release SHA in DIANA_BETA_RELEASE_SHA or GITHUB_SHA.",
    );
  }

  return [
    {
      id: "edge-function-parity",
      label: "Edge Function parity",
      args: [
        "run",
        "edge-functions:parity",
        "--",
        `--receipt=${receiptPath}`,
        `--release-sha=${releaseSha}`,
      ],
    },
  ];
}

function runGate(gate: Gate): LaunchGateResult {
  console.log(`\n[launch-audit] ${gate.label}`);
  const command = npmCli ? process.execPath : "npm";
  const args = npmCli ? [npmCli, ...gate.args] : [...gate.args];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`[launch-audit] ${gate.label}: could not start (${result.error.message})`);
  }

  const passed = result.status === 0;
  console.log(`[launch-audit] ${gate.label}: ${passed ? "pass" : "error"}`);
  return { id: gate.id, passed };
}

export function main(environment: Environment = process.env): void {
  console.log("launch-audit: running deterministic repository gates (no production secrets required)");
  let remoteGates: readonly Gate[];
  try {
    remoteGates = buildRemoteGates(environment);
  } catch (error) {
    console.error(
      `launch-audit: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
    return;
  }
  if (remoteGates.length === 0) {
    console.log("launch-audit: remote Edge Function parity skipped; set DIANA_VERIFY_EDGE_FUNCTION_PARITY=true for a staging release gate");
  }
  const results = [...gates, ...remoteGates].map(runGate);

  if (!launchReadinessPasses(results)) {
    console.error("\nlaunch-audit: not ready");
    process.exitCode = 1;
    return;
  }

  console.log("\nlaunch-audit: ready");
}

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectRun) main();
