import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { BETA_CHECKPOINT_EVIDENCE_FILE } from "./checkpoint-provenance";
import {
  BETA_GATE_KIND,
  BETA_GATE_RECEIPT_KIND,
  BETA_GATE_SCHEMA_VERSION,
  type BetaEvidenceEntry,
  type BetaGateReceipt,
  type BetaRunManifest,
  type BetaSourceIdentity,
} from "./contracts";
import { redactForEvidence } from "./redaction";
import { validateBetaRunId } from "./run-id";

export const BETA_GATE_ARTIFACT_ROOT = path.join("artifacts", "beta-gate");
export const BETA_GATE_MARKER_FILE = ".beta-gate-owned.json";
export const BETA_GATE_MANIFEST_FILE = "manifest.json";
export const BETA_GATE_REPORT_FILE = "report.md";
export const BETA_GATE_RECEIPT_DIRECTORY = "gates";
export const BETA_GATE_RUN_LOCK_FILE = ".beta-gate-run.lock";

type BetaRunMarker = {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_GATE_KIND;
  runId: string;
};

type InitializeBetaRunInput = Omit<
  BetaRunManifest,
  "schemaVersion" | "kind" | "createdAt" | "updatedAt" | "evidence"
> & {
  timestamp: string;
};

export interface BetaRunLockOptions {
  projectRoot: string;
  runId: string;
}

export interface BetaRunLock {
  readonly runId: string;
  release(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const expected = [...expectedKeys].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertIsoTimestamp(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
}

export function assertBetaSourceIdentity(
  value: unknown,
  label = "Beta source identity",
): asserts value is BetaSourceIdentity {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
  assertExactKeys(
    value,
    ["commitSha", "worktreeDigest", "dirty", "fileCount"],
    label,
  );
  if (
    typeof value.commitSha !== "string" ||
    !/^[a-f0-9]{40}$/u.test(value.commitSha) ||
    typeof value.worktreeDigest !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.worktreeDigest) ||
    typeof value.dirty !== "boolean" ||
    !Number.isInteger(value.fileCount) ||
    Number(value.fileCount) < 0
  ) {
    throw new Error(`${label} fields are invalid.`);
  }
}

function assertRelativeEvidencePath(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Evidence paths must be non-empty relative paths.");
  }

  const normalized = value.replace(/\\/gu, "/");
  if (
    path.isAbsolute(value) ||
    normalized.startsWith("/") ||
    normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error("Evidence paths must stay inside the beta run directory.");
  }
}

function assertRegularFile(filePath: string, label: string): void {
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
}

function assertDirectoryNoSymlink(directoryPath: string, label: string): void {
  const stats = lstatSync(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function ensureDirectoryNoSymlink(directoryPath: string, label: string): void {
  if (!existsSync(directoryPath)) mkdirSync(directoryPath);
  assertDirectoryNoSymlink(directoryPath, label);
}

function readJson(filePath: string, label: string): unknown {
  assertRegularFile(filePath, label);
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getBetaGateRoot(projectRoot: string): string {
  return path.resolve(projectRoot, BETA_GATE_ARTIFACT_ROOT);
}

export function getBetaRunDirectory(projectRoot: string, runId: string): string {
  const validatedRunId = validateBetaRunId(runId);
  const betaRoot = getBetaGateRoot(projectRoot);
  const runDirectory = path.resolve(betaRoot, validatedRunId);

  if (path.dirname(runDirectory) !== betaRoot) {
    throw new Error("Beta run directory must be an exact child of artifacts/beta-gate.");
  }

  return runDirectory;
}

export function assertBetaEvidenceLocationAvailable(
  projectRoot: string,
  runId: string,
): string {
  const runDirectory = getBetaRunDirectory(projectRoot, runId);
  const artifactsDirectory = path.resolve(projectRoot, "artifacts");
  const betaRoot = getBetaGateRoot(projectRoot);

  if (existsSync(artifactsDirectory)) {
    assertDirectoryNoSymlink(artifactsDirectory, "Artifacts root");
  }
  if (existsSync(betaRoot)) {
    assertDirectoryNoSymlink(betaRoot, "Beta gate root");
  }
  if (existsSync(runDirectory)) {
    throw new Error(`Beta run already exists: ${runId}. Existing evidence is never overwritten.`);
  }

  return runDirectory;
}

export function initializeBetaRun(
  input: InitializeBetaRunInput,
  projectRoot: string,
  checkpointReceiptBytes: Buffer,
): BetaRunManifest {
  validateBetaRunId(input.runId);
  assertIsoTimestamp(input.timestamp, "Beta run timestamp");
  if (!Buffer.isBuffer(checkpointReceiptBytes) || checkpointReceiptBytes.length === 0) {
    throw new Error("A validated checkpoint receipt is required to initialize a beta run.");
  }
  const runDirectory = assertBetaEvidenceLocationAvailable(projectRoot, input.runId);
  const artifactsDirectory = path.resolve(projectRoot, "artifacts");
  const betaRoot = getBetaGateRoot(projectRoot);

  ensureDirectoryNoSymlink(artifactsDirectory, "Artifacts root");
  ensureDirectoryNoSymlink(betaRoot, "Beta gate root");
  mkdirSync(runDirectory);
  assertDirectoryNoSymlink(runDirectory, "Beta run directory");

  const marker: BetaRunMarker = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_GATE_KIND,
    runId: input.runId,
  };
  writeFileSync(
    path.join(runDirectory, BETA_GATE_MARKER_FILE),
    `${JSON.stringify(marker, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  writeFileSync(
    path.join(runDirectory, BETA_CHECKPOINT_EVIDENCE_FILE),
    checkpointReceiptBytes,
    { flag: "wx", mode: 0o600 },
  );

  const manifest: BetaRunManifest = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_GATE_KIND,
    runId: input.runId,
    status: input.status,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    completedAt: input.completedAt,
    project: input.project,
    source: input.source,
    preflight: input.preflight,
    gates: input.gates,
    issues: input.issues,
    evidence: [
      { kind: "ownership-marker", path: BETA_GATE_MARKER_FILE },
      { kind: "checkpoint-receipt", path: BETA_CHECKPOINT_EVIDENCE_FILE },
      { kind: "manifest", path: BETA_GATE_MANIFEST_FILE },
    ],
  };

  assertBetaRunManifest(manifest, input.runId);
  writeFileSync(
    path.join(runDirectory, BETA_GATE_MANIFEST_FILE),
    `${JSON.stringify(redactForEvidence(manifest), null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  return manifest;
}

export function assertBetaRunManifest(
  value: unknown,
  expectedRunId?: string,
): asserts value is BetaRunManifest {
  if (!isRecord(value)) throw new Error("Beta manifest must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "status",
      "createdAt",
      "updatedAt",
      "completedAt",
      "project",
      "source",
      "preflight",
      "gates",
      "issues",
      "evidence",
    ],
    "Beta manifest",
  );
  if (value.schemaVersion !== BETA_GATE_SCHEMA_VERSION || value.kind !== BETA_GATE_KIND) {
    throw new Error("Beta manifest schema or kind is not supported.");
  }

  const runId = validateBetaRunId(value.runId);
  if (expectedRunId !== undefined && runId !== expectedRunId) {
    throw new Error("Beta manifest run id does not match its directory.");
  }

  if (!["ready", "preflight-blocked", "running", "passed", "gate-blocked"].includes(String(value.status))) {
    throw new Error("Beta manifest has an invalid status.");
  }
  assertIsoTimestamp(value.createdAt, "createdAt");
  assertIsoTimestamp(value.updatedAt, "updatedAt");
  if (value.completedAt !== null) assertIsoTimestamp(value.completedAt, "completedAt");

  if (!isRecord(value.project)) throw new Error("Beta manifest project metadata is missing.");
  assertExactKeys(value.project, ["name", "version", "nodeVersion"], "Beta project metadata");
  for (const key of ["name", "version", "nodeVersion"] as const) {
    if (typeof value.project[key] !== "string" || value.project[key].length === 0) {
      throw new Error(`Beta manifest project.${key} must be a non-empty string.`);
    }
  }
  assertBetaSourceIdentity(value.source, "Beta manifest source identity");

  if (!Array.isArray(value.preflight) || !Array.isArray(value.gates) || !Array.isArray(value.issues)) {
    throw new Error("Beta manifest checks, gates, and issues must be arrays.");
  }
  for (const candidate of value.preflight) {
    if (!isRecord(candidate)) throw new Error("Beta preflight checks must be objects.");
    assertExactKeys(candidate, ["id", "label", "status", "detail"], "Beta preflight check");
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.label !== "string" ||
      typeof candidate.detail !== "string" ||
      !["pass", "fail"].includes(String(candidate.status))
    ) {
      throw new Error("Beta preflight check fields are invalid.");
    }
  }
  for (const gate of value.gates) {
    if (!isRecord(gate)) throw new Error("Beta gate results must be objects.");
    assertExactKeys(
      gate,
      [
        "id",
        "label",
        "command",
        "status",
        "startedAt",
        "completedAt",
        "exitCode",
        "evidenceFile",
      ],
      "Beta gate result",
    );
    if (
      typeof gate.id !== "string" ||
      typeof gate.label !== "string" ||
      !Array.isArray(gate.command) ||
      gate.command.length === 0 ||
      !gate.command.every((argument) => typeof argument === "string") ||
      !["pending", "running", "pass", "fail", "blocked"].includes(String(gate.status)) ||
      (gate.exitCode !== null && (!Number.isInteger(gate.exitCode) || Number(gate.exitCode) < 0)) ||
      (gate.evidenceFile !== null && typeof gate.evidenceFile !== "string")
    ) {
      throw new Error("Beta gate result fields are invalid.");
    }
    if (gate.startedAt !== null) assertIsoTimestamp(gate.startedAt, "gate.startedAt");
    if (gate.completedAt !== null) assertIsoTimestamp(gate.completedAt, "gate.completedAt");
    if (gate.evidenceFile !== null) assertRelativeEvidencePath(gate.evidenceFile);
  }
  for (const issue of value.issues) {
    if (!isRecord(issue)) throw new Error("Beta issues must be objects.");
    const issueKeys = ["id", "gateId", "severity", "title", "detail"];
    if (issue.remediation !== undefined) issueKeys.push("remediation");
    assertExactKeys(issue, issueKeys, "Beta issue");
    if (
      typeof issue.id !== "string" ||
      typeof issue.gateId !== "string" ||
      typeof issue.title !== "string" ||
      typeof issue.detail !== "string" ||
      !["blocker", "error", "warning"].includes(String(issue.severity)) ||
      (issue.remediation !== undefined && typeof issue.remediation !== "string")
    ) {
      throw new Error("Beta issue fields are invalid.");
    }
  }
  if (!Array.isArray(value.evidence)) throw new Error("Beta manifest evidence must be an array.");
  for (const entry of value.evidence) {
    if (!isRecord(entry)) throw new Error("Beta evidence entries must be objects.");
    assertExactKeys(entry, ["kind", "path"], "Beta evidence entry");
    if (
      ![
        "ownership-marker",
        "manifest",
        "checkpoint-receipt",
        "gate-receipt",
        "surface-receipt",
        "report",
      ].includes(String(entry.kind))
    ) {
      throw new Error("Beta evidence entry has an invalid kind.");
    }
    assertRelativeEvidencePath(entry.path);
  }
  if (new Set(value.gates.map((gate) => (gate as Record<string, unknown>).id)).size !== value.gates.length) {
    throw new Error("Beta gate ids must be unique.");
  }
  if (new Set(value.evidence.map((entry) => (entry as Record<string, unknown>).path)).size !== value.evidence.length) {
    throw new Error("Beta evidence paths must be unique.");
  }
  const checkpointEvidence = value.evidence.filter((entry) =>
    (entry as Record<string, unknown>).kind === "checkpoint-receipt");
  if (
    checkpointEvidence.length !== 1
    || (checkpointEvidence[0] as Record<string, unknown>).path !== BETA_CHECKPOINT_EVIDENCE_FILE
  ) {
    throw new Error("Beta manifest must register exactly one fixed checkpoint receipt.");
  }
}

export function assertBetaRunOwnership(projectRoot: string, runId: string): string {
  const runDirectory = getBetaRunDirectory(projectRoot, runId);
  assertDirectoryNoSymlink(runDirectory, "Beta run directory");
  const markerPath = path.join(runDirectory, BETA_GATE_MARKER_FILE);
  const marker = readJson(markerPath, "Beta run ownership marker");

  if (!isRecord(marker)) {
    throw new Error("Beta run ownership marker must be an object.");
  }
  assertExactKeys(marker, ["schemaVersion", "kind", "runId"], "Beta run ownership marker");
  if (
    marker.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    marker.kind !== BETA_GATE_KIND ||
    marker.runId !== runId
  ) {
    throw new Error("Beta run ownership marker does not match the requested run.");
  }

  return runDirectory;
}

export function acquireBetaRunLock(options: BetaRunLockOptions): BetaRunLock {
  const runId = validateBetaRunId(options.runId);
  const runDirectory = assertBetaRunOwnership(options.projectRoot, runId);
  const lockPath = path.join(runDirectory, BETA_GATE_RUN_LOCK_FILE);
  if (path.dirname(lockPath) !== runDirectory) {
    throw new Error("Beta run lock path escaped its run directory.");
  }

  const token = randomUUID();
  const contents = `${JSON.stringify({ runId, token })}\n`;
  try {
    writeFileSync(lockPath, contents, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      assertRegularFile(lockPath, "Beta run lock");
      throw new Error(`Beta run ${runId} is locked by another operation.`);
    }
    throw error;
  }

  let released = false;
  return {
    runId,
    release(): void {
      if (released) return;
      assertRegularFile(lockPath, "Beta run lock");
      if (readFileSync(lockPath, "utf8") !== contents) {
        throw new Error("Beta run lock ownership changed before release.");
      }
      unlinkSync(lockPath);
      released = true;
    },
  };
}

export function withBetaRunLock<T>(
  options: BetaRunLockOptions,
  operation: (lock: BetaRunLock) => T,
): T {
  const lock = acquireBetaRunLock(options);
  try {
    return operation(lock);
  } finally {
    lock.release();
  }
}

export function readBetaRunManifest(projectRoot: string, runId: string): BetaRunManifest {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const value = readJson(path.join(runDirectory, BETA_GATE_MANIFEST_FILE), "Beta manifest");
  assertBetaRunManifest(value, runId);
  return value;
}

export function writeBetaRunManifest(projectRoot: string, manifest: BetaRunManifest): void {
  assertBetaRunManifest(manifest, manifest.runId);
  const runDirectory = assertBetaRunOwnership(projectRoot, manifest.runId);
  const manifestPath = path.join(runDirectory, BETA_GATE_MANIFEST_FILE);
  assertRegularFile(manifestPath, "Beta manifest");
  writeFileSync(
    manifestPath,
    `${JSON.stringify(redactForEvidence(manifest), null, 2)}\n`,
    { encoding: "utf8", flag: "w" },
  );
}

export function addBetaEvidenceEntry(
  manifest: BetaRunManifest,
  entry: BetaEvidenceEntry,
): BetaRunManifest {
  assertRelativeEvidencePath(entry.path);
  const evidence = manifest.evidence.some((candidate) => candidate.path === entry.path)
    ? manifest.evidence
    : [...manifest.evidence, entry].sort((left, right) => left.path.localeCompare(right.path));
  return { ...manifest, evidence };
}

export function writeBetaGateReceipt(
  projectRoot: string,
  receipt: BetaGateReceipt,
): string {
  validateBetaRunId(receipt.runId);
  if (receipt.schemaVersion !== BETA_GATE_SCHEMA_VERSION || receipt.kind !== BETA_GATE_RECEIPT_KIND) {
    throw new Error("Beta gate receipt schema or kind is not supported.");
  }
  if (!/^[a-z][a-z0-9-]{1,63}$/u.test(receipt.gateId)) {
    throw new Error("Beta gate receipt has an invalid gate id.");
  }
  assertBetaSourceIdentity(receipt.source, "Beta gate receipt source identity");

  const runDirectory = assertBetaRunOwnership(projectRoot, receipt.runId);
  const receiptDirectory = path.join(runDirectory, BETA_GATE_RECEIPT_DIRECTORY);
  if (!existsSync(receiptDirectory)) mkdirSync(receiptDirectory);
  assertDirectoryNoSymlink(receiptDirectory, "Beta gate receipt directory");
  const receiptPath = path.join(receiptDirectory, `${receipt.gateId}.json`);
  if (path.dirname(receiptPath) !== receiptDirectory) {
    throw new Error("Beta gate receipt path escaped its evidence directory.");
  }

  writeFileSync(receiptPath, `${JSON.stringify(redactForEvidence(receipt), null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return `${BETA_GATE_RECEIPT_DIRECTORY}/${receipt.gateId}.json`;
}

export function readBetaGateReceipt(
  projectRoot: string,
  runId: string,
  gateId: string,
): BetaGateReceipt {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const receiptPath = path.join(runDirectory, BETA_GATE_RECEIPT_DIRECTORY, `${gateId}.json`);
  const value = readJson(receiptPath, "Beta gate receipt");
  if (!isRecord(value)) throw new Error("Beta gate receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "gateId",
      "command",
      "status",
      "startedAt",
      "completedAt",
      "exitCode",
      "signal",
      "outputCaptured",
      "error",
      "source",
    ],
    "Beta gate receipt",
  );
  if (
    value.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    value.kind !== BETA_GATE_RECEIPT_KIND ||
    value.runId !== runId ||
    value.gateId !== gateId ||
    !Array.isArray(value.command) ||
    value.command.length === 0 ||
    !value.command.every((argument) => typeof argument === "string") ||
    !["pass", "fail"].includes(String(value.status)) ||
    value.outputCaptured !== false ||
    (value.exitCode !== null && (!Number.isInteger(value.exitCode) || Number(value.exitCode) < 0)) ||
    (value.signal !== null && typeof value.signal !== "string") ||
    (value.error !== null && typeof value.error !== "string")
  ) {
    throw new Error("Beta gate receipt does not match the requested run and gate.");
  }
  assertBetaSourceIdentity(value.source, "Beta gate receipt source identity");
  assertIsoTimestamp(value.startedAt, "receipt.startedAt");
  assertIsoTimestamp(value.completedAt, "receipt.completedAt");
  return value as unknown as BetaGateReceipt;
}

export function writeBetaReportArtifact(
  projectRoot: string,
  runId: string,
  report: string,
): string {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const reportPath = path.join(runDirectory, BETA_GATE_REPORT_FILE);
  writeFileSync(reportPath, report, { encoding: "utf8", flag: "wx" });
  return BETA_GATE_REPORT_FILE;
}
