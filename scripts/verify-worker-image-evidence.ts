import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type ImageEvidence = {
  workflow?: unknown;
  sha?: unknown;
  runId?: unknown;
  runAttempt?: unknown;
  localImage?: unknown;
  remoteImage?: unknown;
  imageId?: unknown;
  pushRequested?: unknown;
};

type ImageOutcome = Pick<ImageEvidence, "workflow" | "sha" | "runId" | "runAttempt" | "pushRequested"> & {
  steps?: Record<string, unknown>;
};

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const allowedOutcomes = new Set(["success", "skipped", "failure", "cancelled"]);
const baseRequiredSteps = [
  "setupNode",
  "installDependencies",
  "deploymentCheck",
  "workerTests",
  "runtimeSmoke",
  "credentialProof",
  "buildImage",
  "recordImageEvidence",
  "commandSmoke",
  "containerProof",
] as const;
const pushSteps = ["loginRegistry", "pushImage"] as const;

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function main() {
  const dir = argValue("dir") ?? "worker-image-evidence";
  const requirePushed = process.argv.includes("--require-pushed");
  const checks = verifyEvidence({ dir, requirePushed });
  const ok = checks.every((check) => check.ok);
  console.log(JSON.stringify({ ok, dir, requirePushed, checks }, null, 2));
  if (!ok) process.exit(1);
}

export function verifyEvidence({ dir, requirePushed }: { dir: string; requirePushed: boolean }): Check[] {
  const checks: Check[] = [];
  const summaryPath = join(dir, "summary.json");
  const summary = readJson<ImageEvidence>(summaryPath);
  const outcome = readJson<ImageOutcome>(join(dir, "outcome.json"));

  checks.push(check("summary.json is readable", Boolean(summary), "required worker image metadata"));
  checks.push(check("outcome.json is readable", Boolean(outcome), "required worker image step outcomes"));
  if (!summary || !outcome) return checks;

  checks.push(check(
    "artifact metadata identifies worker image workflow",
    summary.workflow === "Worker image" && outcome.workflow === "Worker image",
    "workflow must match Worker image",
  ));
  checks.push(check(
    "artifact metadata includes run ids",
    typeof outcome.sha === "string" && /^[a-f0-9]{40}$/.test(outcome.sha) &&
      typeof outcome.runId === "string" && /^[1-9][0-9]*$/.test(outcome.runId) &&
      typeof outcome.runAttempt === "string" && /^[1-9][0-9]*$/.test(outcome.runAttempt),
    "a full lowercase commit sha and positive numeric runId/runAttempt are required",
  ));
  checks.push(check(
    "artifact summary and outcome metadata match",
    metadataValue(summary.sha) === metadataValue(outcome.sha) &&
      metadataValue(summary.runId) === metadataValue(outcome.runId) &&
      metadataValue(summary.runAttempt) === metadataValue(outcome.runAttempt) &&
      metadataValue(summary.pushRequested) === metadataValue(outcome.pushRequested),
    "summary.json and outcome.json must describe the same commit, run, and push request",
  ));
  checks.push(check(
    "artifact metadata includes image tags",
    isNonEmptyString(summary.localImage) &&
      isNonEmptyString(summary.remoteImage) &&
      summary.localImage === `diana-worker:${summary.sha}` &&
      /^ghcr\.io\/[a-z0-9][a-z0-9._/-]*\/diana-worker:[a-f0-9]{40}$/.test(summary.remoteImage) &&
      summary.remoteImage.endsWith(`:${summary.sha}`),
    "localImage and remoteImage must use the exact commit sha tag; remoteImage must be a GHCR worker tag",
  ));
  checks.push(check(
    "artifact metadata includes docker image id",
    typeof summary.imageId === "string" && /^sha256:[a-f0-9]{64}$/.test(summary.imageId),
    "imageId must be a Docker sha256 digest",
  ));
  checks.push(check(
    "artifact metadata records push request state",
    outcome.pushRequested === "true" || outcome.pushRequested === "false",
    "pushRequested must be true or false",
  ));

  const steps = outcome.steps ?? {};
  const pushWasRequested = outcome.pushRequested === "true";
  const requiredSteps: string[] = [
    ...baseRequiredSteps,
    ...(pushWasRequested ? pushSteps : []),
  ];
  const optionalSteps: string[] = pushWasRequested ? [] : [...pushSteps];

  for (const step of [...baseRequiredSteps, ...pushSteps]) {
    const outcomeValue = steps[step];
    checks.push(check(
      `${step} outcome is present`,
      typeof outcomeValue === "string" && allowedOutcomes.has(outcomeValue),
      `outcome=${String(outcomeValue)}`,
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
      `${step} is skipped when push is not requested`,
      steps[step] === "skipped",
      `outcome=${String(steps[step])}`,
    ));
  }

  const proofPath = join(dir, "credential-proof.log");
  const proofLines = existsSync(proofPath) ? readFileSync(proofPath, "utf8").split(/\r?\n/u) : [];
  const provesCapabilityCycle = proofLines.some(line => {
    try {
      const proof = JSON.parse(line) as Record<string, unknown>;
      return proof.ok === true && proof.compiledCycle === "completed" &&
        proof.network === "loopback_synthetic_only" && proof.outputTokenLimit === 500 &&
        proof.privateContentLogged === false && Array.isArray(proof.credentialNames) &&
        proof.credentialNames.length === 1 && proof.credentialNames[0] === "WORKER_API_TOKEN";
    } catch { return false; }
  });
  checks.push(check("compiled capability protocol proof is present", provesCapabilityCycle,
    "credential-proof.log must show a completed synthetic loopback cycle with only the worker token and no private content logging"));

  const containerProofPath = join(dir, "container-proof.log");
  const containerProofLines = existsSync(containerProofPath) ? readFileSync(containerProofPath, "utf8").split(/\r?\n/u) : [];
  const provesRestrictedImage = containerProofLines.some(line => {
    try {
      const proof = JSON.parse(line) as Record<string, unknown>;
      return proof.ok === true && proof.imageId === summary.imageId && proof.compiledCycle === "completed" &&
        proof.network === "none_with_container_loopback" && proof.readOnlyRoot === true && proof.runtimeNodeModules === false &&
        typeof proof.runtimeUser === "string" && proof.runtimeUser.length > 0 && !/^(root|0+)(:|$)/.test(proof.runtimeUser) &&
        proof.outputTokenLimit === 500 && proof.privateContentLogged === false;
    } catch { return false; }
  });
  checks.push(check("restricted image protocol proof matches image identity", provesRestrictedImage,
    "container-proof.log must bind the built image to a complete non-root protocol cycle with no application node_modules directories or external networking"));

  const pushedImagePath = join(dir, "pushed-image.txt");
  const pushedImage = existsSync(pushedImagePath) ? readFileSync(pushedImagePath, "utf8").trim() : "";
  if (requirePushed || pushWasRequested || pushedImage) {
    const pushedReceipt = readJson<{ remoteImage?: unknown; imageId?: unknown; repositoryDigest?: unknown }>(join(dir, "pushed-image.json"));
    const remote = metadataValue(summary.remoteImage);
    const repository = remote.slice(0, remote.lastIndexOf(":"));
    checks.push(check("pushed receipt binds the tested image and repository digest",
      !!pushedReceipt && pushedReceipt.remoteImage === summary.remoteImage && pushedReceipt.imageId === summary.imageId &&
        typeof pushedReceipt.repositoryDigest === "string" && pushedReceipt.repositoryDigest.startsWith(repository + "@sha256:") &&
        /^sha256:[a-f0-9]{64}$/.test(pushedReceipt.repositoryDigest.slice(repository.length + 1)),
      "pushed-image.json must bind the tested imageId to the pushed repository and immutable manifest digest"));
    checks.push(check(
      "pushed image has successful publishing outcomes",
      pushWasRequested && pushSteps.every(step => steps[step] === "success"),
      "pushed evidence requires pushRequested=true and successful registry login and image push",
    ));
    checks.push(check(
      "pushed-image.txt is present",
      existsSync(pushedImagePath) && statSync(pushedImagePath).size > 0,
      pushedImagePath,
    ));
    checks.push(check(
      "pushed image matches remote image",
      pushedImage === metadataValue(summary.remoteImage),
      "pushed-image.txt must match summary.remoteImage",
    ));
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

function check(name: string, ok: boolean, detail: string): Check {
  return { name, ok, detail };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
