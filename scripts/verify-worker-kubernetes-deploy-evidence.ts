import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type DeployEvidence = {
  workflow?: unknown;
  targetOrigin?: unknown;
  image?: unknown;
  expectedAppSha?: unknown;
  namespace?: unknown;
  replicas?: unknown;
  imagePullSecretName?: unknown;
  runCanary?: unknown;
  sha?: unknown;
  runId?: unknown;
  runAttempt?: unknown;
};

type DeployOutcome = DeployEvidence & {
  steps?: Record<string, unknown>;
};

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const allowedOutcomes = new Set(["success", "skipped", "failure", "cancelled"]);
const baseRequiredSteps = [
  "setupKubectl",
  "checkInputs",
  "configureKubeconfig",
  "ensureNamespace",
  "applyImagePullSecret",
  "applyWorkerSecretsAndConfig",
  "applyWorkerWorkload",
  "workerDeploymentStatus",
] as const;
const canarySteps = [
  "setupNode",
  "installDependencies",
  "productionPreflight",
  "deployedCanary",
] as const;

const logByStep: Record<string, string> = {
  configureKubeconfig: "kubectl-version.log",
  ensureNamespace: "namespace.log",
  applyImagePullSecret: "image-pull-secret.log",
  applyWorkerSecretsAndConfig: "worker-secret.log",
  applyWorkerWorkload: "rollout-status.log",
  workerDeploymentStatus: "pod-status.log",
  productionPreflight: "production-preflight.log",
  deployedCanary: "deployed-canary.log",
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function main() {
  const dir = argValue("dir") ?? "worker-kubernetes-deploy-evidence";
  const requireSuccess = process.argv.includes("--require-success");
  const checks = verifyEvidence({ dir, requireSuccess });
  const ok = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ok, dir, requireSuccess, checks }, null, 2));
  if (!ok) process.exit(1);
}

function verifyEvidence({ dir, requireSuccess }: { dir: string; requireSuccess: boolean }): Check[] {
  const checks: Check[] = [];
  const summary = readJson<DeployEvidence>(join(dir, "summary.json"));
  const outcome = readJson<DeployOutcome>(join(dir, "outcome.json"));

  checks.push(check("summary.json is readable", Boolean(summary), "required deploy metadata"));
  checks.push(check("outcome.json is readable", Boolean(outcome), "required deploy step outcomes"));
  if (!summary || !outcome) return checks;

  checks.push(check(
    "artifact metadata identifies worker kubernetes deploy",
    summary.workflow === "Worker kubernetes deploy" && outcome.workflow === "Worker kubernetes deploy",
    "workflow must match Worker kubernetes deploy",
  ));
  checks.push(check(
    "artifact metadata includes target, image, and run ids",
    isHttpUrl(outcome.targetOrigin) &&
      isNonEmptyString(outcome.image) &&
      isNonEmptyString(outcome.namespace) &&
      isNonEmptyString(outcome.replicas) &&
      isNonEmptyString(outcome.imagePullSecretName) &&
      isNonEmptyString(outcome.sha) &&
      isNonEmptyString(outcome.runId) &&
      isNonEmptyString(outcome.runAttempt),
    "targetOrigin, image, namespace, replicas, imagePullSecretName, sha, runId, and runAttempt are required",
  ));
  checks.push(check(
    "artifact summary and outcome metadata match",
    metadataValue(summary.targetOrigin) === metadataValue(outcome.targetOrigin) &&
      metadataValue(summary.image) === metadataValue(outcome.image) &&
      metadataValue(summary.expectedAppSha) === metadataValue(outcome.expectedAppSha) &&
      metadataValue(summary.namespace) === metadataValue(outcome.namespace) &&
      metadataValue(summary.replicas) === metadataValue(outcome.replicas) &&
      metadataValue(summary.imagePullSecretName) === metadataValue(outcome.imagePullSecretName) &&
      metadataValue(summary.runCanary) === metadataValue(outcome.runCanary) &&
      metadataValue(summary.sha) === metadataValue(outcome.sha) &&
      metadataValue(summary.runId) === metadataValue(outcome.runId) &&
      metadataValue(summary.runAttempt) === metadataValue(outcome.runAttempt),
    "summary.json and outcome.json must describe the same deploy target, image, inputs, commit, and run",
  ));
  checks.push(check(
    "artifact metadata uses safe deploy input values",
    metadataValue(outcome.image).startsWith("ghcr.io/teamcarrillo405-hub/diana/diana-worker:") &&
      !metadataValue(outcome.image).includes("replace-with-worker-image-sha") &&
      Number(metadataValue(outcome.replicas)) >= 2 &&
      ["true", "false"].includes(metadataValue(outcome.runCanary)),
    "image must be a real Diana GHCR tag, replicas must be at least 2, runCanary must be true or false",
  ));

  const steps = outcome.steps ?? {};
  const expectedAppSha = metadataValue(outcome.expectedAppSha);
  const runCanary = outcome.runCanary === "true";
  const requiredSteps: string[] = [
    ...baseRequiredSteps,
    ...(runCanary ? canarySteps : []),
  ];
  const optionalSteps: string[] = runCanary ? [] : [...canarySteps];

  for (const step of [...baseRequiredSteps, ...canarySteps]) {
    const outcomeValue = steps[step];
    checks.push(check(
      `${step} outcome is present`,
      typeof outcomeValue === "string" && allowedOutcomes.has(outcomeValue),
      `outcome=${String(outcomeValue)}`,
    ));
  }

  if (requireSuccess) {
    for (const step of requiredSteps) {
      checks.push(check(
        `${step} completed successfully`,
        steps[step] === "success",
        `outcome=${String(steps[step])}`,
      ));
    }
    for (const step of optionalSteps) {
      checks.push(check(
        `${step} is skipped when canary is disabled`,
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
    if (step === "productionPreflight" || step === "deployedCanary") {
      checks.push(check(
        `${logName} records ok true`,
        logText.includes("\"ok\": true") || logText.includes("\"ok\":true"),
        "command output should include ok true JSON",
      ));
    }
    if (step === "productionPreflight" && expectedAppSha) {
      checks.push(check(
        `${logName} records expected app sha`,
        logText.includes("Worker version authorized") &&
          logText.includes(expectedAppSha) &&
          logText.includes("expected"),
        "production-preflight.log must prove the expected Diana app SHA",
      ));
    }
    if (step === "deployedCanary") {
      checks.push(check(
        `${logName} records worker image sha`,
        logText.includes("\"imageSha\"") || logText.includes("\"imageSha\":"),
        "deployed-canary.log must include the worker image SHA that consumed the job",
      ));
    }
    if (step === "applyWorkerWorkload") {
      checks.push(check(
        `${logName} records rollout completion`,
        logText.includes("successfully rolled out"),
        "rollout-status.log must record a completed rollout",
      ));
    }
    if (step === "workerDeploymentStatus") {
      checks.push(check(
        `${logName} records worker pods`,
        logText.includes("diana-worker"),
        "pod-status.log must include diana-worker pods",
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
