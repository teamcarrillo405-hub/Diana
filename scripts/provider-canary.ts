import { runProviderCanary } from "../lib/lms/provider-canary";
import { initializeProviderCanaryRuntime } from "../lib/lms/provider-canary-cli";

async function loadStagingEnvironment(): Promise<void> {
  const { loadEnvConfig } = await import("@next/env");
  loadEnvConfig(process.cwd());
}

async function main() {
  const mode = await initializeProviderCanaryRuntime({
    argv: process.argv.slice(2),
    env: process.env,
    loadEnvironment: loadStagingEnvironment,
  });
  const report = await runProviderCanary({ mode });
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }, null, 2));
  process.exitCode = 1;
});
