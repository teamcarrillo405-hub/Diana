import { loadEnvConfig } from "@next/env";

import {
  runProviderCanary,
  type ProviderCanaryMode,
} from "../lib/lms/provider-canary";

loadEnvConfig(process.cwd());

function argument(name: string): string | null {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function mode(): ProviderCanaryMode {
  const value = argument("mode") ?? process.env.DIANA_PROVIDER_CANARY_MODE ?? "mock";
  if (value !== "mock" && value !== "staging") {
    throw new Error("Provider canary mode must be mock or staging.");
  }
  return value;
}

async function main() {
  const report = await runProviderCanary({ mode: mode() });
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
