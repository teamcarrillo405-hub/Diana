import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export const DEPENDENCY_AUDIT_MAX_ATTEMPTS = 2;
export const DEPENDENCY_AUDIT_TIMEOUT_MS = 240_000;

export class DependencyAuditError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DependencyAuditError";
    this.code = code;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toText(value) {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return "";
}

export function readAuditCounts(stdout) {
  const value = stdout.trim();
  if (!value) return null;

  try {
    const report = JSON.parse(value);
    const counts = isRecord(report)
      && isRecord(report.metadata)
      && isRecord(report.metadata.vulnerabilities)
      ? report.metadata.vulnerabilities
      : null;
    if (
      !counts
      || typeof counts.high !== "number"
      || typeof counts.critical !== "number"
      || counts.high < 0
      || counts.critical < 0
    ) {
      return null;
    }
    return { high: counts.high, critical: counts.critical };
  } catch {
    return null;
  }
}

function bundledNpmCli() {
  const nodeDirectory = path.dirname(process.execPath);
  const candidates = process.platform === "win32"
    ? [path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js")]
    : [
      path.resolve(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
      path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
    ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function defaultRunCommand({ cwd, environment, npmCliPath }) {
  return spawnSync(
    process.execPath,
    [npmCliPath, "audit", "--audit-level=high", "--json"],
    {
      cwd,
      env: environment,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: DEPENDENCY_AUDIT_TIMEOUT_MS,
      windowsHide: true,
    },
  );
}

function unavailableMessage(result) {
  if (result.error?.code === "ETIMEDOUT") return "npm audit timed out";
  if (result.error?.message) return `npm audit could not start: ${result.error.message}`;
  if (result.signal) return `npm audit ended from signal ${result.signal}`;
  return `npm audit exited with code ${result.status ?? "unknown"} without a valid report`;
}

export function runDependencyAudit({
  cwd = process.cwd(),
  environment = process.env,
  maxAttempts = DEPENDENCY_AUDIT_MAX_ATTEMPTS,
  npmCliPath = bundledNpmCli(),
  runCommand = defaultRunCommand,
} = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new DependencyAuditError("DEPENDENCY_AUDIT_CONFIGURATION_INVALID", "Audit attempts must be a positive integer.");
  }
  if (!npmCliPath) {
    throw new DependencyAuditError("DEPENDENCY_AUDIT_NPM_UNAVAILABLE", "The npm CLI bundled with Node could not be found.");
  }

  let lastUnavailableReason = "npm audit did not return a valid report";
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = runCommand({ cwd, environment, npmCliPath });
    const counts = readAuditCounts(toText(result.stdout));

    if (counts) {
      if (counts.high > 0 || counts.critical > 0) {
        throw new DependencyAuditError(
          "DEPENDENCY_VULNERABILITIES_FOUND",
          `Dependency audit found ${counts.high} high and ${counts.critical} critical vulnerabilities.`,
        );
      }
      if (result.status === 0 && !result.error && !result.signal) {
        return { attempts: attempt, ...counts };
      }
      throw new DependencyAuditError(
        "DEPENDENCY_AUDIT_EXECUTION_FAILED",
        `Dependency audit returned a clean report but exited unexpectedly with code ${result.status ?? "unknown"}.`,
      );
    }

    lastUnavailableReason = unavailableMessage(result);
    if (attempt < maxAttempts) {
      console.warn(`Dependency audit response was unavailable; retrying (${attempt + 1}/${maxAttempts}).`);
    }
  }

  throw new DependencyAuditError(
    "DEPENDENCY_AUDIT_UNAVAILABLE",
    `Dependency audit could not obtain a valid registry report after ${maxAttempts} attempts: ${lastUnavailableReason}.`,
  );
}

function main() {
  try {
    const result = runDependencyAudit();
    console.log(`Dependency audit passed: ${result.high} high and ${result.critical} critical vulnerabilities after ${result.attempts} attempt${result.attempts === 1 ? "" : "s"}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Dependency audit blocked: ${message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href) {
  main();
}
