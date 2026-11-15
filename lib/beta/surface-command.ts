import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  sanitizeBetaChildEnvironment,
  type BetaProcessEnvironment,
} from "./local-gate";

export interface BetaSurfaceCommandContext {
  cwd: string;
  environment: BetaProcessEnvironment;
  captureOutput: boolean;
}

export interface BetaSurfaceCommandResult {
  status: number | null;
  signal: string | null;
  error?: Error;
  stdout: string | null;
  stderr: string | null;
}

export type BetaSurfaceCommandRunner = (
  command: readonly [string, ...string[]],
  context: BetaSurfaceCommandContext,
) => BetaSurfaceCommandResult;

interface CommandInvocation {
  file: string;
  args: string[];
}

function environmentValue(
  environment: BetaProcessEnvironment,
  name: string,
): string | undefined {
  const key = Object.keys(environment).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );
  return key ? environment[key] : undefined;
}

function resolveWindowsNpxCli(environment: BetaProcessEnvironment): string | null {
  const npmExecPath = environmentValue(environment, "npm_execpath");
  if (npmExecPath) {
    const sibling = path.join(path.dirname(npmExecPath), "npx-cli.js");
    if (existsSync(sibling)) return sibling;
  }

  const bundled = path.join(
    path.dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npx-cli.js",
  );
  if (existsSync(bundled)) return bundled;

  const searchPath = environmentValue(environment, "PATH");
  if (!searchPath) return null;
  for (const rawDirectory of searchPath.split(";")) {
    const directory = rawDirectory.replace(/^"|"$/gu, "");
    if (!directory) continue;
    const candidate = path.win32.join(
      directory,
      "node_modules",
      "npm",
      "bin",
      "npx-cli.js",
    );
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function resolveNpxInvocation(
  args: readonly string[],
  environment: BetaProcessEnvironment,
  platform: NodeJS.Platform = process.platform,
): CommandInvocation {
  if (platform !== "win32") return { file: "npx", args: [...args] };
  const npxCli = resolveWindowsNpxCli(environment);
  if (!npxCli) {
    throw new Error("Unable to resolve npx-cli.js for shell-free Windows execution.");
  }
  return { file: process.execPath, args: [npxCli, ...args] };
}

export function createBetaSurfaceEnvironment(
  environment: BetaProcessEnvironment,
  qaRunId: string,
  additions: BetaProcessEnvironment = {},
): BetaProcessEnvironment {
  return {
    ...sanitizeBetaChildEnvironment(environment),
    ...additions,
    QA_RUN_ID: qaRunId,
  };
}

export const runBetaSurfaceCommand: BetaSurfaceCommandRunner = (command, context) => {
  const [executable, ...args] = command;
  if (executable !== "npx") {
    return {
      status: null,
      signal: null,
      error: new Error("Beta surface child commands must use the fixed npx boundary."),
      stdout: null,
      stderr: null,
    };
  }

  try {
    const invocation = resolveNpxInvocation(args, context.environment);
    const result = spawnSync(invocation.file, invocation.args, {
      cwd: context.cwd,
      env: context.environment as NodeJS.ProcessEnv,
      shell: false,
      stdio: context.captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return {
      status: result.status,
      signal: result.signal,
      error: result.error,
      stdout: typeof result.stdout === "string" ? result.stdout : null,
      stderr: typeof result.stderr === "string" ? result.stderr : null,
    };
  } catch (error) {
    return {
      status: null,
      signal: null,
      error: error instanceof Error ? error : new Error(String(error)),
      stdout: null,
      stderr: null,
    };
  }
};
