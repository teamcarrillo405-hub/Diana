export const CRITICAL_PATH_TESTS = [
  "lib/scoring/next-five-minutes.test.ts",
  "lib/fsrs/fsrs.test.ts",
  "lib/timer/timer.test.ts",
  "lib/ai/safety.test.ts",
  "lib/privacy/export.test.ts",
  "lib/social/collaboration.test.ts",
  "lib/platform/analytics.test.ts",
  "lib/offline/store.test.ts",
  "lib/mastery/concepts.test.ts",
  "lib/lms/canvas.test.ts",
  "lib/student-state/model.test.ts",
  "lib/teen-testing/protocol.test.ts",
  "lib/competitive/capability-matrix.test.ts",
  "lib/study-helper/guided-learning.test.ts",
  "lib/study-helper/visual-breakdown.test.ts",
  "lib/benchmark/competitive.test.ts",
  "lib/security/account-deletion-purge.test.ts",
  "lib/security/ai-token-budget-migration.test.ts",
  "lib/security/assessment-release-policy.test.ts",
  "lib/security/canvas-institutions.test.ts",
  "lib/security/edge-auth-policy.test.ts",
  "lib/security/edge-function-tenant-isolation.test.ts",
  "lib/security/lms-pagination-security.test.ts",
  "lib/security/minor-policy.test.ts",
  "lib/security/outbound-url.test.ts",
  "lib/security/response-headers.test.ts",
  "lib/security/rls-initplan-performance.test.ts",
  "lib/security/security-definer-deny-by-default.test.ts",
  "lib/security/storage-buckets.test.ts",
  "lib/assignment-edge-security.test.ts",
  "lib/sharing/token.test.ts",
  "lib/tts/remote-client.test.ts",
] as const;

export const REQUIRED_RUNTIME_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type RuntimeEnvironment = Record<string, string | undefined>;
export type CheckStatus = "ok" | "error" | "skipped";

export type EnvironmentValidation = {
  valid: boolean;
  missing: string[];
  invalid: string[];
};

export type RuntimeReadinessReport = {
  status: "ready" | "not_ready";
  checks: {
    configuration: CheckStatus;
    auth: CheckStatus;
    database: CheckStatus;
    storage: CheckStatus;
  };
};

export type LaunchGateResult = {
  id: string;
  passed: boolean;
};

type ReadinessOptions = {
  env?: RuntimeEnvironment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  timeoutSignal?: (timeoutMs: number) => AbortSignal;
};

const PLACEHOLDER_PATTERN = /(?:change[-_ ]?me|example|placeholder|replace[-_ ]?me)/i;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function configuredValue(env: RuntimeEnvironment, name: string): string {
  return env[name]?.trim() ?? "";
}

function isValidOrigin(value: string, production: boolean): boolean {
  try {
    const url = new URL(value);
    const secure = url.protocol === "https:";
    const localHttp = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);

    return Boolean(
      (secure || (!production && localHttp)) &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
    );
  } catch {
    return false;
  }
}

export function validateRuntimeEnvironment(
  env: RuntimeEnvironment = process.env,
): EnvironmentValidation {
  const missing = REQUIRED_RUNTIME_ENV.filter((name) => !configuredValue(env, name));
  const invalid: string[] = [];
  const production = env.NODE_ENV === "production";

  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_APP_URL"] as const) {
    const value = configuredValue(env, name);
    if (value && (!isValidOrigin(value, production) || (production && PLACEHOLDER_PATTERN.test(value)))) {
      invalid.push(name);
    }
  }

  for (const name of ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    const value = configuredValue(env, name);
    if (value && production && PLACEHOLDER_PATTERN.test(value)) invalid.push(name);
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing: [...missing],
    invalid,
  };
}

export async function runtimeReadiness({
  env = process.env,
  fetchImpl = fetch,
  timeoutMs = 3_000,
  timeoutSignal = AbortSignal.timeout,
}: ReadinessOptions = {}): Promise<RuntimeReadinessReport> {
  const configuration = validateRuntimeEnvironment(env);
  if (!configuration.valid) {
    return {
      status: "not_ready",
      checks: {
        configuration: "error",
        auth: "skipped",
        database: "skipped",
        storage: "skipped",
      },
    };
  }

  const baseUrl = configuredValue(env, "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = configuredValue(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = configuredValue(env, "SUPABASE_SERVICE_ROLE_KEY");
  const common = {
    method: "GET" as const,
    cache: "no-store" as const,
    redirect: "error" as const,
  };

  const [auth, database, storage] = await Promise.all([
    probeDependency(
      fetchImpl,
      new URL("/auth/v1/health", baseUrl),
      { apikey: publishableKey },
      common,
      timeoutMs,
      timeoutSignal,
    ),
    probeDependency(
      fetchImpl,
      new URL("/rest/v1/profiles?select=user_id&limit=1", baseUrl),
      { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      common,
      timeoutMs,
      timeoutSignal,
    ),
    probeDependency(
      fetchImpl,
      new URL("/storage/v1/bucket", baseUrl),
      { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      common,
      timeoutMs,
      timeoutSignal,
    ),
  ]);

  const ready = auth === "ok" && database === "ok" && storage === "ok";

  return {
    status: ready ? "ready" : "not_ready",
    checks: { configuration: "ok", auth, database, storage },
  };
}

async function probeDependency(
  fetchImpl: typeof fetch,
  url: URL,
  headers: Record<string, string>,
  common: { method: "GET"; cache: "no-store"; redirect: "error" },
  timeoutMs: number,
  timeoutSignal: (timeoutMs: number) => AbortSignal,
): Promise<CheckStatus> {
  try {
    const response = await fetchImpl(url, {
      ...common,
      headers,
      signal: timeoutSignal(timeoutMs),
    });
    return response.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export function launchReadinessPasses(results: readonly LaunchGateResult[]): boolean {
  return results.length > 0 && results.every((result) => result.passed);
}
