import { spawnSync } from "node:child_process";
import {
  CRITICAL_PATH_TESTS,
  launchReadinessPasses,
  type LaunchGateResult,
} from "../lib/launch/readiness";

const npmCli = process.env.npm_execpath;

type Gate = {
  id: string;
  label: string;
  args: readonly string[];
};

const gates = [
  {
    id: "dependency-audit",
    label: "Production dependency audit",
    args: ["audit", "--audit-level=high"],
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

const remoteGates = process.env.DIANA_VERIFY_EDGE_FUNCTION_PARITY === "true"
  ? [
      {
        id: "edge-function-parity",
        label: "Edge Function parity",
        args: ["run", "edge-functions:parity"],
      },
    ] as const
  : [];

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

function main() {
  console.log("launch-audit: running deterministic repository gates (no production secrets required)");
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

main();
