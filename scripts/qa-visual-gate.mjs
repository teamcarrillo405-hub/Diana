import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : "npm";

const steps = [
  ["qa:auth-preflight", ["run", "qa:auth-preflight"]],
  ["qa:responsive", ["run", "qa:responsive"]],
  ["teen-ux-score", ["run", "teen-ux-score"]],
];

for (const [label, args] of steps) {
  console.log(`qa-visual-gate: running ${label}`);
  const result = spawnSync(command, npmCli ? [npmCli, ...args] : args, {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  if (result.error) {
    console.error(`qa-visual-gate: ${label} could not start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`qa-visual-gate: stopped at ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("qa-visual-gate: authenticated visual QA gate passed");
