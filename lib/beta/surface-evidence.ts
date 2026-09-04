import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { BETA_GATE_SCHEMA_VERSION } from "./contracts";
import {
  addBetaEvidenceEntry,
  assertBetaSourceIdentity,
  assertBetaRunOwnership,
  readBetaRunManifest,
  writeBetaRunManifest,
} from "./evidence";
import { getBetaQaRunId } from "./qa-resources";
import { redactForEvidence } from "./redaction";
import {
  BETA_BROWSER_BUILD_COMMAND,
  BETA_FIXED_SURFACE_COMMANDS,
  BETA_SURFACE_NAMES,
  BETA_SURFACE_RECEIPT_KIND,
  getBetaSubjectGateCommand,
  type BetaQaResource,
  type BetaSurfaceCheck,
  type BetaSurfaceName,
  type BetaSurfaceReceipt,
} from "./surface-contracts";
import { validateBetaRunId } from "./run-id";
import { betaSourceIdentityMatches } from "./source-identity";

export const BETA_SURFACE_RECEIPT_DIRECTORY = "surfaces" as const;

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

function assertRegularFile(filePath: string, label: string): void {
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
}

function assertDirectory(directoryPath: string, label: string): void {
  const stats = lstatSync(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function assertSurfaceCheck(value: unknown): asserts value is BetaSurfaceCheck {
  if (!isRecord(value)) throw new Error("Beta surface checks must be objects.");
  assertExactKeys(value, ["id", "label", "status", "detail"], "Beta surface check");
  if (
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9-]{1,63}$/u.test(value.id) ||
    typeof value.label !== "string" ||
    value.label.length === 0 ||
    !["pass", "block"].includes(String(value.status)) ||
    typeof value.detail !== "string" ||
    value.detail.length === 0
  ) {
    throw new Error("Beta surface check fields are invalid.");
  }
}

function assertQaResource(value: unknown, qaRunId: string): asserts value is BetaQaResource {
  if (!isRecord(value)) throw new Error("Beta QA resources must be objects.");
  assertExactKeys(value, ["kind", "id", "disposable"], "Beta QA resource");
  if (
    !["namespace", "student", "course", "assignment", "submission", "browser-profile"].includes(
      String(value.kind),
    ) ||
    typeof value.id !== "string" ||
    !value.id.includes(qaRunId) ||
    !/^[a-z0-9][a-z0-9-]{3,127}$/u.test(value.id) ||
    value.disposable !== true
  ) {
    throw new Error("Beta QA resource fields are invalid or are not bound to QA_RUN_ID.");
  }
}

function assertFixedCommand(receipt: Record<string, unknown>): void {
  if (receipt.command === null) {
    if (receipt.status !== "blocked" && receipt.surface !== "fixtures") {
      throw new Error("A passing beta surface must name its fixed command boundary.");
    }
    return;
  }
  if (
    !Array.isArray(receipt.command) ||
    receipt.command.length === 0 ||
    !receipt.command.every((argument) => typeof argument === "string" && argument.length > 0)
  ) {
    throw new Error("Beta surface command must be a non-empty string array or null.");
  }

  const surface = receipt.surface as Exclude<BetaSurfaceName, "fixtures">;
  const expected = surface === "subjects"
    ? getBetaSubjectGateCommand(String(receipt.runId))
    : BETA_FIXED_SURFACE_COMMANDS[surface];
  const isBlockedBrowserBuild = surface === "browser"
    && JSON.stringify(receipt.command) === JSON.stringify(BETA_BROWSER_BUILD_COMMAND);
  if (!expected || (
    JSON.stringify(receipt.command) !== JSON.stringify(expected)
    && !isBlockedBrowserBuild
  )) {
    throw new Error("Beta surface receipt does not match its fixed command boundary.");
  }
  if (
    isBlockedBrowserBuild
    && (
      receipt.status !== "blocked"
      || receipt.network !== "not-run"
      || receipt.writes !== "none"
    )
  ) {
    throw new Error("A blocked browser production build cannot report browser activity.");
  }
}

export function assertBetaSurfaceReceipt(
  value: unknown,
  expectedRunId?: string,
  expectedSurface?: BetaSurfaceName,
): asserts value is BetaSurfaceReceipt {
  if (!isRecord(value)) throw new Error("Beta surface receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "surface",
      "status",
      "startedAt",
      "completedAt",
      "command",
      "exitCode",
      "signal",
      "network",
      "writes",
      "outputCaptured",
      "error",
      "bindings",
      "source",
      "resources",
      "checks",
    ],
    "Beta surface receipt",
  );
  if (
    value.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    value.kind !== BETA_SURFACE_RECEIPT_KIND
  ) {
    throw new Error("Beta surface receipt schema or kind is not supported.");
  }

  const runId = validateBetaRunId(value.runId);
  const qaRunId = getBetaQaRunId(runId);
  if (
    (expectedRunId !== undefined && runId !== expectedRunId) ||
    value.qaRunId !== qaRunId ||
    !BETA_SURFACE_NAMES.includes(value.surface as BetaSurfaceName) ||
    (expectedSurface !== undefined && value.surface !== expectedSurface) ||
    !["pass", "blocked"].includes(String(value.status)) ||
    (value.exitCode !== null && (!Number.isInteger(value.exitCode) || Number(value.exitCode) < 0)) ||
    (value.signal !== null && typeof value.signal !== "string") ||
    !["none", "intercepted", "local-browser", "staging-providers", "not-run"].includes(
      String(value.network),
    ) ||
    !["none", "disposable-local", "disposable-staging", "disposable-cleanup"].includes(
      String(value.writes),
    ) ||
    value.outputCaptured !== false ||
    (value.error !== null && typeof value.error !== "string")
  ) {
    throw new Error("Beta surface receipt fields are invalid.");
  }
  assertIsoTimestamp(value.startedAt, "surface.startedAt");
  assertIsoTimestamp(value.completedAt, "surface.completedAt");
  if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) {
    throw new Error("Beta surface completion time cannot precede its start time.");
  }

  assertFixedCommand(value);

  if (!isRecord(value.bindings)) throw new Error("Beta surface bindings are missing.");
  assertExactKeys(value.bindings, ["releaseSha", "url"], "Beta surface bindings");
  if (
    (value.bindings.releaseSha !== null &&
      (typeof value.bindings.releaseSha !== "string" ||
        !/^[a-f0-9]{40}$/u.test(value.bindings.releaseSha))) ||
    (value.bindings.url !== null && typeof value.bindings.url !== "string")
  ) {
    throw new Error("Beta surface bindings are invalid.");
  }
  assertBetaSourceIdentity(value.source, "Beta surface source identity");

  if (!Array.isArray(value.resources) || value.resources.length === 0) {
    throw new Error("Beta surface receipt must include QA_RUN_ID resources.");
  }
  for (const resource of value.resources) assertQaResource(resource, qaRunId);
  const resourceKeys = value.resources.map((resource) => `${resource.kind}:${resource.id}`);
  if (new Set(resourceKeys).size !== resourceKeys.length) {
    throw new Error("Beta QA resources must be unique.");
  }

  if (!Array.isArray(value.checks) || value.checks.length === 0) {
    throw new Error("Beta surface receipt must include checks.");
  }
  for (const check of value.checks) assertSurfaceCheck(check);
  const checkIds = value.checks.map((check) => check.id);
  if (new Set(checkIds).size !== checkIds.length) {
    throw new Error("Beta surface check ids must be unique.");
  }
  const hasBlock = value.checks.some((check) => check.status === "block");
  if ((value.status === "pass" && hasBlock) || (value.status === "blocked" && !hasBlock)) {
    throw new Error("Beta surface status does not match its checks.");
  }
  if (value.status === "pass" && (value.exitCode !== 0 || value.signal !== null || value.error !== null)) {
    throw new Error("A passing beta surface must have a clean command result.");
  }
  const writesAllowed =
    value.writes === "none" ||
    (value.surface === "fixtures" && value.writes === "disposable-local") ||
    (value.surface === "browser" && value.writes === "disposable-local") ||
    (value.surface === "lms-staging" && value.writes === "disposable-staging") ||
    (value.surface === "cleanup" && value.writes === "disposable-cleanup");
  if (!writesAllowed) {
    throw new Error("Beta surface writes do not match the fixed disposable resource boundary.");
  }
  if (JSON.stringify(redactForEvidence(value)) !== JSON.stringify(value)) {
    throw new Error("Beta surface receipt contains unredacted sensitive data.");
  }
}

export function getBetaSurfaceReceiptPath(
  projectRoot: string,
  runIdInput: string,
  surface: BetaSurfaceName,
): string {
  const runDirectory = assertBetaRunOwnership(projectRoot, validateBetaRunId(runIdInput));
  const receiptDirectory = path.join(runDirectory, BETA_SURFACE_RECEIPT_DIRECTORY);
  if (existsSync(receiptDirectory)) {
    assertDirectory(receiptDirectory, "Beta surface receipt directory");
  }
  return path.join(receiptDirectory, `${surface}.json`);
}

export function writeBetaSurfaceReceipt(
  projectRoot: string,
  receipt: BetaSurfaceReceipt,
): string {
  assertBetaSurfaceReceipt(receipt, receipt.runId, receipt.surface);
  const manifest = readBetaRunManifest(projectRoot, receipt.runId);
  if (!betaSourceIdentityMatches(receipt.source, manifest.source)) {
    throw new Error("Beta surface receipt source does not match its run manifest.");
  }
  if (manifest.status === "running") {
    throw new Error("Beta surface evidence cannot be written while local gates are running.");
  }
  if (receipt.status === "pass" && manifest.status !== "passed") {
    throw new Error("A beta surface can pass only after the fixed local gate passes.");
  }

  const runDirectory = assertBetaRunOwnership(projectRoot, receipt.runId);
  const receiptDirectory = path.join(runDirectory, BETA_SURFACE_RECEIPT_DIRECTORY);
  if (!existsSync(receiptDirectory)) mkdirSync(receiptDirectory);
  assertDirectory(receiptDirectory, "Beta surface receipt directory");
  const receiptPath = path.join(receiptDirectory, `${receipt.surface}.json`);
  if (path.dirname(receiptPath) !== receiptDirectory) {
    throw new Error("Beta surface receipt path escaped its evidence directory.");
  }
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });

  const relativePath = `${BETA_SURFACE_RECEIPT_DIRECTORY}/${receipt.surface}.json`;
  const updated = addBetaEvidenceEntry(manifest, {
    kind: "surface-receipt",
    path: relativePath,
  });
  writeBetaRunManifest(projectRoot, { ...updated, updatedAt: receipt.completedAt });
  return relativePath;
}

export function readBetaSurfaceReceipt(
  projectRoot: string,
  runIdInput: string,
  surface: BetaSurfaceName,
): BetaSurfaceReceipt {
  const runId = validateBetaRunId(runIdInput);
  const receiptPath = getBetaSurfaceReceiptPath(projectRoot, runId, surface);
  assertRegularFile(receiptPath, "Beta surface receipt");
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(receiptPath, "utf8")) as unknown;
  } catch (error) {
    throw new Error(
      `Beta surface receipt is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assertBetaSurfaceReceipt(value, runId, surface);
  const manifest = readBetaRunManifest(projectRoot, runId);
  if (!betaSourceIdentityMatches(value.source, manifest.source)) {
    throw new Error("Beta surface receipt source does not match its run manifest.");
  }
  return value;
}
