import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type GateMetadata = {
  workflow?: unknown;
  targetOrigin?: unknown;
  expectedAppSha?: unknown;
  expectedWorkerImageSha?: unknown;
  loadCount?: unknown;
  seededChecks?: unknown;
  dianaStatusSmoke?: unknown;
  sha?: unknown;
  runId?: unknown;
  runAttempt?: unknown;
};

type GateOutcome = GateMetadata & {
  steps?: Record<string, unknown>;
};

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const allowedOutcomes = new Set(["success", "skipped", "failure", "cancelled"]);
const baseRequiredSteps = [
  "installDependencies",
  "requiredSecrets",
  "deploymentCheck",
  "productionPreflight",
] as const;
const seededSteps = [
  "tenantCanary",
  "e2eSmoke",
  "deployedCanary",
  "loadSmoke",
] as const;
const statusSmokeSteps = [
  "installChromium",
  "dianaStatusSmoke",
] as const;

const logByStep: Record<string, string> = {
  deploymentCheck: "deployment-check.log",
  productionPreflight: "production-preflight.log",
  tenantCanary: "tenant-canary.log",
  e2eSmoke: "e2e-smoke.log",
  deployedCanary: "deployed-canary.log",
  dianaStatusSmoke: "diana-status-smoke.log",
  loadSmoke: "load-smoke.log",
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function main() {
  const dir = argValue("dir") ?? "worker-gate-evidence";
  const requireSuccess = process.argv.includes("--require-success");
  const checks = verifyEvidence({ dir, requireSuccess });
  const ok = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ok, dir, requireSuccess, checks }, null, 2));
  if (!ok) process.exit(1);
}

function verifyEvidence({ dir, requireSuccess }: { dir: string; requireSuccess: boolean }): Check[] {
  const checks: Check[] = [];
  const summary = readJson<GateMetadata>(join(dir, "summary.json"));
  const outcome = readJson<GateOutcome>(join(dir, "outcome.json"));

  checks.push(check("summary.json is readable", Boolean(summary), "required artifact metadata"));
  checks.push(check("outcome.json is readable", Boolean(outcome), "required step outcome metadata"));
  if (!summary || !outcome) return checks;

  checks.push(check(
    "artifact metadata identifies worker production gate",
    summary.workflow === "Worker production gate" && outcome.workflow === "Worker production gate",
    "workflow must match Worker production gate",
  ));
  checks.push(check(
    "artifact metadata includes target and run ids",
    isNonEmptyString(outcome.targetOrigin) &&
      isNonEmptyString(outcome.sha) &&
      isNonEmptyString(outcome.runId) &&
      isNonEmptyString(outcome.runAttempt),
    "targetOrigin, sha, runId, and runAttempt are required",
  ));
  checks.push(check(
    "artifact summary and outcome metadata match",
    metadataValue(summary.targetOrigin) === metadataValue(outcome.targetOrigin) &&
      metadataValue(summary.expectedAppSha) === metadataValue(outcome.expectedAppSha) &&
      metadataValue(summary.expectedWorkerImageSha) === metadataValue(outcome.expectedWorkerImageSha) &&
      metadataValue(summary.loadCount) === metadataValue(outcome.loadCount) &&
      metadataValue(summary.seededChecks) === metadataValue(outcome.seededChecks) &&
      metadataValue(summary.dianaStatusSmoke) === metadataValue(outcome.dianaStatusSmoke) &&
      metadataValue(summary.sha) === metadataValue(outcome.sha) &&
      metadataValue(summary.runId) === metadataValue(outcome.runId) &&
      metadataValue(summary.runAttempt) === metadataValue(outcome.runAttempt),
    "summary.json and outcome.json must describe the same target, inputs, commit, and run",
  ));
  checks.push(check(
    "artifact metadata uses expected input values",
    isHttpUrl(outcome.targetOrigin) &&
      ["true", "false"].includes(metadataValue(outcome.seededChecks)) &&
      ["true", "false"].includes(metadataValue(outcome.dianaStatusSmoke)) &&
      /^\d+$/.test(metadataValue(outcome.loadCount)) &&
      (!metadataValue(outcome.expectedWorkerImageSha) || outcome.seededChecks === "true"),
    "targetOrigin must be an http(s) URL; booleans and loadCount must match workflow inputs; expectedWorkerImageSha requires seededChecks",
  ));

  const steps = outcome.steps ?? {};
  const expectedAppSha = metadataValue(outcome.expectedAppSha);
  const expectedWorkerImageSha = metadataValue(outcome.expectedWorkerImageSha);
  const seededChecks = outcome.seededChecks === "true";
  const dianaStatusSmoke = outcome.dianaStatusSmoke === "true";
  const requiredSteps: string[] = [
    ...baseRequiredSteps,
    ...(seededChecks ? seededSteps : []),
    ...(seededChecks && dianaStatusSmoke ? statusSmokeSteps : []),
  ];
  const optionalSteps: string[] = [
    ...(!seededChecks ? seededSteps : []),
    ...(!seededChecks || !dianaStatusSmoke ? statusSmokeSteps : []),
  ];

  for (const step of [...baseRequiredSteps, ...seededSteps, ...statusSmokeSteps]) {
    const outcomeValue = steps[step];
    checks.push(check(
      `${step} outcome is present`,
      typeof outcomeValue === "string" && allowedOutcomes.has(outcomeValue),
      `outcome=${String(outcomeValue)}`,
    ));
  }

  if (requireSuccess) {
    if (expectedWorkerImageSha) {
      checks.push(check(
        "expected worker image sha is proven by deployed canary",
        seededChecks && steps.deployedCanary === "success",
        "expectedWorkerImageSha requires a successful deployed-worker canary",
      ));
    }
    for (const step of requiredSteps) {
      checks.push(check(
        `${step} completed successfully`,
        steps[step] === "success",
        `outcome=${String(steps[step])}`,
      ));
    }
    for (const step of optionalSteps) {
      checks.push(check(
        `${step} is skipped when disabled`,
        steps[step] === "skipped" || steps[step] === "success",
        `outcome=${String(steps[step])}`,
      ));
    }
  }

  for (const [step, logName] of Object.entries(logByStep)) {
    const outcomeValue = steps[step];
    const logPath = join(dir, logName);
    const logIsRequired = outcomeValue === "success" || (requireSuccess && requiredSteps.includes(step));
    if (!logIsRequired) continue;

    const logText = existsSync(logPath) ? readFileSync(logPath, "utf8") : "";
    checks.push(check(
      `${logName} exists for ${step}`,
      existsSync(logPath) && statSync(logPath).size > 0,
      logPath,
    ));
    checks.push(check(
      `${logName} records ok true`,
      logText.includes("\"ok\": true") || logText.includes("\"ok\":true"),
      "command output should include ok true JSON",
    ));
    if (step === "productionPreflight" && expectedAppSha) {
      checks.push(check(
        `${logName} records expected app sha`,
        logText.includes("Worker version authorized") &&
          logText.includes(expectedAppSha) &&
          logText.includes("expected"),
        "production-preflight.log must prove the expected Diana app SHA",
      ));
    }
    if (step === "deployedCanary" && expectedWorkerImageSha) {
      checks.push(check(
        `${logName} records expected worker image sha`,
        (logText.includes("\"imageSha\"") || logText.includes("\"imageSha\":")) &&
          logText.includes(expectedWorkerImageSha),
        "deployed-canary.log must prove the expected worker image SHA",
      ));
    }
  }

  return checks;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return null;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function metadataValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function check(name: string, ok: boolean, detail: string): Check {
  return { name, ok, detail };
}

main();
