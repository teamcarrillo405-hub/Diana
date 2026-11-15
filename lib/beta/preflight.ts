import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  type ValidatedBetaCheckpointEvidence,
  validateBetaCheckpointEvidence,
} from "./checkpoint-provenance";
import {
  BETA_DEPENDENCY_INSTALL_SCRIPT_NAME,
  BETA_LOCAL_GATE_DEFINITIONS,
  BETA_PUBLIC_PACKAGE_COMMANDS,
  BETA_REQUIRED_NODE_ENGINE,
  type BetaIssue,
  type BetaPreflightCheck,
  type BetaRunManifest,
  type BetaSourceIdentity,
} from "./contracts";
import {
  assertBetaEvidenceLocationAvailable,
  initializeBetaRun,
} from "./evidence";
import { validateBetaRunId } from "./run-id";
import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";

type PackageMetadata = {
  name?: unknown;
  version?: unknown;
  engines?: { node?: unknown };
  scripts?: Record<string, unknown>;
};

const ZERO_COMMIT_SHA = "0".repeat(40);

export interface BetaPreflightOptions {
  projectRoot: string;
  runId: string;
  runtimeVersion?: string;
  now?: () => Date;
}

function check(
  id: string,
  label: string,
  ok: boolean,
  passDetail: string,
  failDetail: string,
): BetaPreflightCheck {
  return {
    id,
    label,
    status: ok ? "pass" : "fail",
    detail: ok ? passDetail : failDetail,
  };
}

function readPackageMetadata(projectRoot: string): {
  metadata: PackageMetadata | null;
  error: string | null;
} {
  const packagePath = path.join(projectRoot, "package.json");
  if (!existsSync(packagePath)) {
    return { metadata: null, error: "package.json is missing" };
  }

  const stats = lstatSync(packagePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return { metadata: null, error: "package.json is not a regular file" };
  }

  try {
    const parsed = JSON.parse(readFileSync(packagePath, "utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { metadata: null, error: "package.json must contain an object" };
    }
    return { metadata: parsed as PackageMetadata, error: null };
  } catch {
    return { metadata: null, error: "package.json is not valid JSON" };
  }
}

function nodeRuntimeMatches(metadata: PackageMetadata | null, runtimeVersion: string): boolean {
  return metadata?.engines?.node === BETA_REQUIRED_NODE_ENGINE
    && /^24\.\d+\.\d+$/u.test(runtimeVersion);
}

function localGateScriptProblems(metadata: PackageMetadata | null): string[] {
  const scripts = metadata?.scripts;
  const problems: string[] = [];
  for (const gate of BETA_LOCAL_GATE_DEFINITIONS) {
    const scriptName = gate.command[2];
    if (scripts?.[scriptName] !== gate.packageScript) problems.push(scriptName);
    for (const lifecycleName of [`pre${scriptName}`, `post${scriptName}`]) {
      if (scripts?.[lifecycleName] !== undefined) problems.push(lifecycleName);
    }
  }
  return problems;
}

function publicCommandScriptProblems(metadata: PackageMetadata | null): string[] {
  const scripts = metadata?.scripts;
  const problems: string[] = [];
  for (const command of BETA_PUBLIC_PACKAGE_COMMANDS) {
    if (scripts?.[command.scriptName] !== command.packageScript) {
      problems.push(command.scriptName);
    }
    for (const lifecycleName of [
      `pre${command.scriptName}`,
      `post${command.scriptName}`,
    ]) {
      if (scripts?.[lifecycleName] !== undefined) problems.push(lifecycleName);
    }
  }
  return problems;
}

export function assertBetaPackageScriptContract(projectRoot: string): void {
  const packageResult = readPackageMetadata(projectRoot);
  if (packageResult.error) throw new Error(packageResult.error);
  const problems = [
    ...localGateScriptProblems(packageResult.metadata),
    ...publicCommandScriptProblems(packageResult.metadata),
  ];
  if (problems.length > 0) {
    throw new Error(
      `Required beta package scripts or lifecycle boundaries changed: ${problems.join(", ")}.`,
    );
  }
}

export function inspectBetaPreflight(
  projectRoot: string,
  runId: string,
  runtimeVersion: string = process.versions.node,
): {
  checks: BetaPreflightCheck[];
  project: BetaRunManifest["project"];
  source: BetaSourceIdentity;
  checkpointEvidence: ValidatedBetaCheckpointEvidence | null;
} {
  validateBetaRunId(runId);
  const packageResult = readPackageMetadata(projectRoot);
  const metadata = packageResult.metadata;
  const projectName = typeof metadata?.name === "string" ? metadata.name : "unknown";
  const projectVersion = typeof metadata?.version === "string" ? metadata.version : "unknown";
  const scriptProblems = localGateScriptProblems(metadata);
  const publicCommandProblems = publicCommandScriptProblems(metadata);
  const sourceBefore = readBetaSourceIdentity(projectRoot);
  let checkpointEvidence: ValidatedBetaCheckpointEvidence | null = null;
  let checkpointError: string | null = null;
  try {
    checkpointEvidence = validateBetaCheckpointEvidence({
      projectRoot,
      runId,
      location: "materialized",
      requireCurrentHead: true,
    });
  } catch (error) {
    checkpointError = error instanceof Error ? error.message : String(error);
  }
  const source = readBetaSourceIdentity(projectRoot);
  const sourceStable = betaSourceIdentityMatches(sourceBefore, source);
  const gitMetadataPresent = existsSync(path.join(projectRoot, ".git"));
  const sourceIdentityAvailable = gitMetadataPresent
    && source.commitSha !== ZERO_COMMIT_SHA
    && !source.dirty;
  const checkpointBound = checkpointEvidence !== null
    && sourceStable
    && source.commitSha === checkpointEvidence.receipt.checkpointCommit
    && !source.dirty;

  let evidencePathSafe = true;
  try {
    assertBetaEvidenceLocationAvailable(projectRoot, runId);
  } catch {
    evidencePathSafe = false;
  }

  const checks = [
    check(
      "project-package",
      "Diana package metadata",
      packageResult.error === null && projectName === "diana",
      "package.json is a regular Diana package file",
      packageResult.error ?? "package.json package name must be diana",
    ),
    check(
      "node-runtime",
      "Pinned Node runtime",
      nodeRuntimeMatches(metadata, runtimeVersion),
      `Node ${runtimeVersion} matches the allowed ${BETA_REQUIRED_NODE_ENGINE} runtime`,
      metadata?.engines?.node !== BETA_REQUIRED_NODE_ENGINE
        ? `package.json must pin Node to ${BETA_REQUIRED_NODE_ENGINE}`
        : `Node ${runtimeVersion} is outside the allowed ${BETA_REQUIRED_NODE_ENGINE} runtime`,
    ),
    check(
      "local-gate-scripts",
      "Pinned local gate scripts",
      scriptProblems.length === 0,
      `Matched ${BETA_LOCAL_GATE_DEFINITIONS.length} exact package scripts with no lifecycle hooks`,
      `Missing, modified, or lifecycle-hooked scripts: ${scriptProblems.join(", ") || "package metadata unavailable"}`,
    ),
    check(
      "public-command-scripts",
      "Pinned beta npm commands",
      publicCommandProblems.length === 0,
      `Matched ${BETA_PUBLIC_PACKAGE_COMMANDS.length} exact beta package scripts with no lifecycle hooks`,
      `Missing, modified, or lifecycle-hooked beta scripts: ${publicCommandProblems.join(", ") || "package metadata unavailable"}`,
    ),
    check(
      "checkpoint-provenance",
      "Materialized checkpoint provenance",
      checkpointBound,
      checkpointEvidence
        ? `Bound the run to checkpoint receipt ${checkpointEvidence.receiptSha256}`
        : "Checkpoint provenance is available",
      checkpointError
        ?? (sourceStable
          ? "Checkpoint receipt does not match the clean materialized source"
          : "Source changed while checkpoint provenance was validated"),
    ),
    check(
      "source-identity",
      "Git source identity",
      sourceIdentityAvailable,
      `Bound the run to clean Git commit ${source.commitSha}`,
      "Preflight requires a clean materialized Git worktree with a readable commit identity",
    ),
    check(
      "evidence-location",
      "Isolated evidence location",
      evidencePathSafe,
      "Run directory is an unused exact child of artifacts/beta-gate",
      "Run directory exists, escapes the beta evidence root, or crosses a symbolic link",
    ),
    check(
      "local-only-boundary",
      "Local-only command boundary",
      BETA_LOCAL_GATE_DEFINITIONS.every(
        (gate) => gate.command.length === 3
          && gate.command[0] === "npm"
          && gate.command[1] === "run"
          && typeof gate.command[2] === "string"
          && gate.command[2].length > 0,
      )
        && BETA_LOCAL_GATE_DEFINITIONS.some(
          (gate) => gate.command[2] === BETA_DEPENDENCY_INSTALL_SCRIPT_NAME,
        ),
      "All beta gates invoke fixed local package scripts and no deploy command",
      "A beta gate command is outside the fixed local package-script boundary",
    ),
  ];

  return {
    checks,
    project: {
      name: projectName,
      version: projectVersion,
      nodeVersion: runtimeVersion,
    },
    source,
    checkpointEvidence,
  };
}

export function runBetaPreflight(options: BetaPreflightOptions): BetaRunManifest {
  const projectRoot = path.resolve(options.projectRoot);
  const runId = validateBetaRunId(options.runId);
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const { checks, project, source, checkpointEvidence } = inspectBetaPreflight(
    projectRoot,
    runId,
    options.runtimeVersion,
  );
  const blockedChecks = checks.filter((candidate) => candidate.status === "fail");
  const issues: BetaIssue[] = blockedChecks.map((blockedCheck) => ({
    id: `preflight-${blockedCheck.id}`,
    gateId: "preflight",
    severity: "blocker",
    title: `${blockedCheck.label} did not pass`,
    detail: blockedCheck.detail,
    remediation: "Correct the local preflight condition and start a new run id.",
  }));

  if (checkpointEvidence === null) {
    throw new Error(
      "A valid materialized checkpoint receipt is required before beta preflight can create evidence.",
    );
  }

  return initializeBetaRun(
    {
      runId,
      status: blockedChecks.length === 0 ? "ready" : "preflight-blocked",
      completedAt: blockedChecks.length === 0 ? null : timestamp,
      project,
      source,
      preflight: checks,
      gates: BETA_LOCAL_GATE_DEFINITIONS.map((gate) => ({
        id: gate.id,
        label: gate.label,
        command: [...gate.command],
        status: "pending",
        startedAt: null,
        completedAt: null,
        exitCode: null,
        evidenceFile: null,
      })),
      issues,
      timestamp,
    },
    projectRoot,
    checkpointEvidence.receiptBytes,
  );
}
