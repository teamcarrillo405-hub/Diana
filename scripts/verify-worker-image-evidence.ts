import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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
  "buildImage",
  "recordImageEvidence",
  "commandSmoke",
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

function verifyEvidence({ dir, requirePushed }: { dir: string; requirePushed: boolean }): Check[] {
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
    isNonEmptyString(outcome.sha) &&
      isNonEmptyString(outcome.runId) &&
      isNonEmptyString(outcome.runAttempt),
    "sha, runId, and runAttempt are required",
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
      metadataValue(summary.localImage).includes(metadataValue(summary.sha)) &&
      metadataValue(summary.remoteImage).includes(metadataValue(summary.sha)) &&
      metadataValue(summary.remoteImage).startsWith("ghcr.io/"),
    "localImage and remoteImage must include the commit sha; remoteImage must be a GHCR tag",
  ));
  checks.push(check(
    "artifact metadata includes docker image id",
    /^sha256:[a-f0-9]{64}$/i.test(metadataValue(summary.imageId)),
    "imageId must be a Docker sha256 digest",
  ));
  checks.push(check(
    "artifact metadata records push request state",
    ["true", "false"].includes(metadataValue(outcome.pushRequested)),
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
      steps[step] === "skipped" || steps[step] === "success",
      `outcome=${String(steps[step])}`,
    ));
  }

  const pushedImagePath = join(dir, "pushed-image.txt");
  const pushedImage = existsSync(pushedImagePath) ? readFileSync(pushedImagePath, "utf8").trim() : "";
  if (requirePushed || pushedImage) {
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

main();
