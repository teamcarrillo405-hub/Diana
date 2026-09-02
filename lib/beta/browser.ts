import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  createBetaSurfaceEnvironment,
  runBetaSurfaceCommand,
  type BetaSurfaceCommandRunner,
} from "./surface-command";
import {
  BETA_BROWSER_COMMAND,
  BETA_BROWSER_SPEC_PATH,
  type BetaSurfaceCheck,
} from "./surface-contracts";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";
import { getBetaQaRunId } from "./qa-resources";

export interface BetaBrowserOptions extends BetaSurfaceBaseOptions {
  runCommand?: BetaSurfaceCommandRunner;
}

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function environmentValue(
  environment: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const key = Object.keys(environment).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? environment[key]?.trim() : undefined;
}

function betaBrowserSupabaseEnvironment(
  environment: Record<string, string | undefined>,
  appBaseUrl: string,
): Record<string, string> {
  const urlValue = environmentValue(environment, "DIANA_BETA_LOCAL_SUPABASE_URL");
  const publishableKey = environmentValue(
    environment,
    "DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY",
  );
  const serviceRoleKey = environmentValue(
    environment,
    "DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY",
  );
  let url: URL;
  try {
    url = new URL(urlValue ?? "");
  } catch {
    throw new Error("The beta browser requires a dedicated loopback Supabase URL.");
  }
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("The beta browser may use only a dedicated loopback Supabase project.");
  }
  if (!url.port || url.origin === new URL(appBaseUrl).origin) {
    throw new Error("The beta browser Supabase project must use its own loopback port.");
  }
  if (!publishableKey || publishableKey.length < 20 || !serviceRoleKey || serviceRoleKey.length < 20) {
    throw new Error("The beta browser requires dedicated local Supabase publishable and service credentials.");
  }
  if (publishableKey === serviceRoleKey) {
    throw new Error("The beta browser publishable and service credentials must be distinct.");
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: url.origin,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publishableKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
}

export function betaBrowserRuntime(runId: string): {
  baseUrl: string;
  distDirectory: string;
  localStudentEmail: string;
  typeScriptConfig: string;
} {
  const digest = createHash("sha256").update(getBetaQaRunId(runId)).digest("hex");
  const port = 3100 + (Number.parseInt(digest.slice(0, 4), 16) % 700);
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    distDirectory: `.next-beta-${digest.slice(0, 12)}`,
    localStudentEmail: `diana-beta-${digest.slice(0, 16)}@local.test`,
    typeScriptConfig: `.tsconfig-beta-${digest.slice(0, 12)}.json`,
  };
}

function prepareBetaBrowserTypeScriptConfig(
  projectRoot: string,
  typeScriptConfig: string,
  distDirectory: string,
): () => void {
  const rootConfig = path.resolve(projectRoot, "tsconfig.json");
  const generatedConfig = path.resolve(projectRoot, typeScriptConfig);
  if (path.dirname(generatedConfig) !== projectRoot) {
    throw new Error("Generated beta TypeScript config escaped the project root.");
  }
  const rootStats = lstatSync(rootConfig);
  if (rootStats.isSymbolicLink() || !rootStats.isFile()) {
    throw new Error("The root TypeScript config must be a regular file.");
  }

  const content = `${JSON.stringify({
    extends: "./tsconfig.json",
    include: [
      "next-env.d.ts",
      `${distDirectory}/types/**/*.ts`,
      "**/*.ts",
      "**/*.tsx",
    ],
    exclude: ["node_modules"],
  }, null, 2)}\n`;

  if (existsSync(generatedConfig)) {
    const existingStats = lstatSync(generatedConfig);
    if (existingStats.isSymbolicLink() || !existingStats.isFile()) {
      throw new Error("Generated beta TypeScript config path is not a regular file.");
    }
    if (readFileSync(generatedConfig, "utf8") !== content) {
      throw new Error("Generated beta TypeScript config already exists with unexpected content.");
    }
    unlinkSync(generatedConfig);
  }

  writeFileSync(generatedConfig, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return () => {
    if (!existsSync(generatedConfig)) return;
    const cleanupStats = lstatSync(generatedConfig);
    if (cleanupStats.isSymbolicLink() || !cleanupStats.isFile()) {
      throw new Error("Generated beta TypeScript config changed type during cleanup.");
    }
    unlinkSync(generatedConfig);
  };
}

function inspectBrowserSpec(projectRoot: string): { available: boolean; detail: string } {
  const specPath = path.resolve(projectRoot, BETA_BROWSER_SPEC_PATH);
  if (path.dirname(specPath) !== path.resolve(projectRoot, "tests")) {
    throw new Error("Beta browser spec escaped its fixed test boundary.");
  }
  if (!existsSync(specPath)) {
    return {
      available: false,
      detail: `The fixed browser spec is not available at ${BETA_BROWSER_SPEC_PATH}.`,
    };
  }
  const stats = lstatSync(specPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return {
      available: false,
      detail: "The fixed browser spec must be a regular file, not a symbolic link.",
    };
  }
  return {
    available: true,
    detail: `The browser surface is pinned to ${BETA_BROWSER_SPEC_PATH} and project chromium.`,
  };
}

export function runBetaBrowser(options: BetaBrowserOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    true,
  );
  const spec = inspectBrowserSpec(projectRoot);
  const checks: BetaSurfaceCheck[] = [
    ...prerequisites.checks,
    {
      id: "browser-boundary",
      label: "Fixed browser project and spec",
      status: spec.available ? "pass" : "block",
      detail: spec.detail,
    },
  ];

  let command: readonly string[] | null = null;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let error: Error | null = null;
  if (prerequisites.canRun && spec.available) {
    try {
      const qaRunId = getBetaQaRunId(options.runId);
      const runtime = betaBrowserRuntime(qaRunId);
      const sourceEnvironment = options.environment ?? process.env;
      const supabaseEnvironment = betaBrowserSupabaseEnvironment(
        sourceEnvironment,
        runtime.baseUrl,
      );
      const environment = createBetaSurfaceEnvironment(
        sourceEnvironment,
        qaRunId,
        {
          CI: "true",
          NEXT_PUBLIC_APP_URL: runtime.baseUrl,
          VITE_DIANA_LOGIN_URL: `${runtime.baseUrl}/login`,
          VITE_DIANA_SIGNUP_URL: `${runtime.baseUrl}/signup`,
          QA_BASE_URL: runtime.baseUrl,
          QA_CREATE_USER: "true",
          QA_NEXT_DIST_DIR: runtime.distDirectory,
          QA_TSCONFIG_PATH: runtime.typeScriptConfig,
          QA_REUSE_EXISTING_SERVER: "false",
          QA_TEST_EMAIL: runtime.localStudentEmail,
          ...supabaseEnvironment,
        },
      );
      const cleanupTypeScriptConfig = prepareBetaBrowserTypeScriptConfig(
        projectRoot,
        runtime.typeScriptConfig,
        runtime.distDirectory,
      );
      let result: ReturnType<BetaSurfaceCommandRunner>;
      try {
        command = BETA_BROWSER_COMMAND;
        result = (options.runCommand ?? runBetaSurfaceCommand)(BETA_BROWSER_COMMAND, {
          cwd: projectRoot,
          environment,
          captureOutput: false,
        });
      } finally {
        cleanupTypeScriptConfig();
      }
      exitCode = result.status;
      signal = result.signal;
      error = result.error ?? null;
      const passed = !error && signal === null && exitCode === 0;
      checks.push({
        id: "browser-result",
        label: "Local browser checks",
        status: passed ? "pass" : "block",
        detail: passed
          ? "The fixed local browser command completed with code 0."
          : error
            ? error.message
            : signal
              ? `The browser command ended from signal ${signal}.`
              : `The browser command exited with code ${exitCode ?? "unknown"}.`,
      });
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
      checks.push({
        id: "browser-configuration",
        label: "Isolated browser configuration",
        status: "block",
        detail: error.message,
      });
      checks.push({
        id: "browser-result",
        label: "Local browser checks",
        status: "block",
        detail: "The browser command was not run because its isolated configuration is not ready.",
      });
    }
  } else {
    checks.push({
      id: "browser-result",
      label: "Local browser checks",
      status: "block",
      detail: "The browser command was not run because a required boundary is not ready.",
    });
  }

  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "browser",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command,
    exitCode,
    signal,
    network: command ? "local-browser" : "not-run",
    writes: command ? "disposable-local" : "none",
    error,
    checks,
  });
}
