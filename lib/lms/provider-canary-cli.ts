import type { ProviderCanaryMode } from "./provider-canary";

type Env = Record<string, string | undefined>;

export function resolveProviderCanaryMode(
  argv: readonly string[],
  env: Env,
): ProviderCanaryMode {
  const argument = argv.find((value) => value.startsWith("--mode="))?.slice("--mode=".length);
  const value = argument ?? env.DIANA_PROVIDER_CANARY_MODE ?? "mock";
  if (value !== "mock" && value !== "staging") {
    throw new Error("Provider canary mode must be mock or staging.");
  }
  return value;
}

export async function initializeProviderCanaryRuntime(input: {
  argv: readonly string[];
  env: Env;
  loadEnvironment: () => void | Promise<void>;
}): Promise<ProviderCanaryMode> {
  const mode = resolveProviderCanaryMode(input.argv, input.env);
  if (mode === "staging") await input.loadEnvironment();
  return mode;
}
