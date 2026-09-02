import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";

import type { BetaSourceIdentity } from "./contracts";
import { assertBetaRunOwnership, readBetaRunManifest } from "./evidence";
import { getBetaQaResourceNamespace, getBetaQaRunId } from "./qa-resources";
import { redactForEvidence, redactText } from "./redaction";
import { validateBetaReleaseSha, validateBetaStagingUrl } from "./release-validation";
import { validateBetaRunId } from "./run-id";
import { betaSourceIdentityMatches } from "./source-identity";
import {
  publishCrashAtomicDirectory,
  writeCrashAtomicFileExclusive,
} from "./atomic-evidence";

export const BETA_LMS_STAGING_WRITE_ACK = "DISPOSABLE_STAGING_WRITES" as const;
export const BETA_LMS_STAGING_WRITE_SCHEMA_VERSION = 1 as const;
export const BETA_LMS_STAGING_WRITE_DIRECTORY = "provider-writes" as const;
export const BETA_LMS_STAGING_WRITE_INTENT_KIND =
  "diana-beta-lms-staging-write-intent" as const;
export const BETA_LMS_STAGING_WRITE_RESOLUTION_KIND =
  "diana-beta-lms-staging-write-resolution" as const;

const INTENT_FILE = "intent.json";
const RESOLUTION_FILE = "resolution.json";
const DISCOVERY_DIRECTORY = "discoveries";
const OBSERVATION_DIRECTORY = "observations";
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;
const RECORD_ID_PATTERN = /^[a-f0-9]{64}$/u;
const PROVIDER_RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const ATOMIC_TEMP_ENTRY_PATTERN = /^\..+\.tmp-\d+-[0-9a-f-]{36}$/u;

export type BetaLmsStagingWriteProvider = "canvas" | "google_classroom";
export type BetaLmsStagingWriteOperation =
  | "canvas_text_submission"
  | "canvas_file_submission"
  | "canvas_grade_delivery"
  | "google_file_submission";
export type BetaLmsStagingWriteResourceKind =
  | "submission"
  | "file"
  | "student_submission"
  | "drive_file";

export interface BetaLmsStagingWriteBinding {
  projectRoot: string;
  runId: string;
  releaseSha: string;
  stagingUrl: string;
  resourceNamespace: string;
  acknowledgement: string | null;
  now?: () => Date;
}

export interface BetaLmsStagingWriteObservation {
  state: "known" | "unknown";
  providerSubmissionId: string | null;
  providerState: string | null;
  attempt: number | null;
  submittedAt: string | null;
  attachmentIds: string[];
  observedScore?: number | null;
  observedDraftScore?: number | null;
}

export interface BetaLmsStagingWriteResource {
  provider: BetaLmsStagingWriteProvider;
  providerResourceId: string;
  kind: BetaLmsStagingWriteResourceKind;
  resourceTag: string;
  parentResourceId: string | null;
  bindingDigest: string;
  disposable: true;
}

export interface BetaLmsStagingWriteIntent {
  schemaVersion: typeof BETA_LMS_STAGING_WRITE_SCHEMA_VERSION;
  kind: typeof BETA_LMS_STAGING_WRITE_INTENT_KIND;
  recordId: string;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  stagingUrl: string;
  source: BetaSourceIdentity;
  resourceNamespace: string;
  acknowledgement: typeof BETA_LMS_STAGING_WRITE_ACK;
  provider: BetaLmsStagingWriteProvider;
  operation: BetaLmsStagingWriteOperation;
  targetDigest: string;
  payloadDigest: string;
  baseline: BetaLmsStagingWriteObservation;
  createdAt: string;
}

export interface BetaLmsStagingWriteResolution {
  schemaVersion: typeof BETA_LMS_STAGING_WRITE_SCHEMA_VERSION;
  kind: typeof BETA_LMS_STAGING_WRITE_RESOLUTION_KIND;
  recordId: string;
  intentDigest: string;
  status: "confirmed";
  verification: "provider_readback";
  observationDigest: string;
  resources: BetaLmsStagingWriteResource[];
  confirmedAt: string;
}

export interface ConfirmedBetaLmsStagingWriteRecord {
  intent: BetaLmsStagingWriteIntent;
  resolution: BetaLmsStagingWriteResolution;
  recordDigest: string;
  replayed: boolean;
  reconciled: boolean;
}

export interface BetaLmsStagingWriteDecision {
  confirmed: boolean;
  detail: string;
  resources: BetaLmsStagingWriteResource[];
}

export interface ExecuteBetaLmsStagingWriteOptions {
  binding: BetaLmsStagingWriteBinding;
  provider: BetaLmsStagingWriteProvider;
  operation: BetaLmsStagingWriteOperation;
  targetDigest: string;
  payloadDigest: string;
  inspect: () => Promise<BetaLmsStagingWriteObservation>;
  write: (context: {
    recordResource: (resource: BetaLmsStagingWriteResource) => void;
  }) => Promise<void>;
  confirm: (input: {
    baseline: BetaLmsStagingWriteObservation;
    current: BetaLmsStagingWriteObservation;
    discoveredResources: readonly BetaLmsStagingWriteResource[];
  }) => BetaLmsStagingWriteDecision;
}

type NormalizedBinding = Omit<BetaLmsStagingWriteBinding, "projectRoot" | "now"> & {
  projectRoot: string;
  runId: string;
  qaRunId: string;
  source: BetaSourceIdentity;
  now: () => Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestBetaLmsStagingWriteValue(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const canonicalExpected = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(canonicalExpected)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertDirectory(directory: string, label: string): void {
  const stats = lstatSync(directory);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function assertRegularFile(filePath: string, label: string): void {
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
}

function ensureDirectory(directory: string, label: string): void {
  if (!existsSync(directory)) mkdirSync(directory);
  assertDirectory(directory, label);
}

function safeTimestamp(date: Date): string {
  const timestamp = date.toISOString();
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("Invalid staging write timestamp.");
  return timestamp;
}

function writeDurableJson(filePath: string, value: unknown): void {
  const redacted = redactForEvidence(value);
  if (canonicalJson(redacted) !== canonicalJson(value)) {
    throw new Error("LMS staging write evidence contains a credential or secret-like value.");
  }
  writeCrashAtomicFileExclusive(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath: string, label: string): unknown {
  assertRegularFile(filePath, label);
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

function normalizeBinding(binding: BetaLmsStagingWriteBinding): NormalizedBinding {
  const projectRoot = path.resolve(binding.projectRoot);
  const runId = validateBetaRunId(binding.runId);
  const qaRunId = getBetaQaRunId(runId);
  const releaseSha = validateBetaReleaseSha(binding.releaseSha);
  const stagingUrl = validateBetaStagingUrl(binding.stagingUrl);
  const resourceNamespace = getBetaQaResourceNamespace(runId);
  const manifest = readBetaRunManifest(projectRoot, runId);
  if (
    binding.acknowledgement !== BETA_LMS_STAGING_WRITE_ACK ||
    binding.resourceNamespace !== resourceNamespace ||
    releaseSha !== manifest.source.commitSha
  ) {
    throw new Error("LMS staging write binding is not authorized for this exact beta run.");
  }
  return {
    ...binding,
    projectRoot,
    runId,
    qaRunId,
    releaseSha,
    stagingUrl,
    resourceNamespace,
    acknowledgement: BETA_LMS_STAGING_WRITE_ACK,
    source: manifest.source,
    now: binding.now ?? (() => new Date()),
  };
}

function assertDigest(value: string, label: string): void {
  if (!DIGEST_PATTERN.test(value)) throw new Error(`${label} must be a lowercase SHA-256 digest.`);
}

function assertProviderOperation(
  provider: BetaLmsStagingWriteProvider,
  operation: BetaLmsStagingWriteOperation,
): void {
  const valid = provider === "canvas"
    ? operation === "canvas_text_submission"
      || operation === "canvas_file_submission"
      || operation === "canvas_grade_delivery"
    : operation === "google_file_submission";
  if (!valid) throw new Error("Provider staging operation does not match its provider.");
}

function normalizeObservation(
  value: BetaLmsStagingWriteObservation,
): BetaLmsStagingWriteObservation {
  if (
    !value ||
    !["known", "unknown"].includes(value.state) ||
    (value.providerSubmissionId !== null && typeof value.providerSubmissionId !== "string") ||
    (value.providerState !== null && typeof value.providerState !== "string") ||
    (value.attempt !== null && (!Number.isInteger(value.attempt) || value.attempt < 0)) ||
    (value.submittedAt !== null && (
      typeof value.submittedAt !== "string" ||
      Number.isNaN(Date.parse(value.submittedAt))
    )) ||
    !Array.isArray(value.attachmentIds) ||
    value.attachmentIds.some((id) => !PROVIDER_RESOURCE_ID_PATTERN.test(id)) ||
    (value.observedScore !== undefined && value.observedScore !== null && !Number.isFinite(value.observedScore)) ||
    (value.observedDraftScore !== undefined && value.observedDraftScore !== null && !Number.isFinite(value.observedDraftScore))
  ) {
    throw new Error("Provider staging observation is invalid.");
  }
  const normalized = {
    state: value.state,
    providerSubmissionId: value.providerSubmissionId?.trim() || null,
    providerState: value.providerState?.trim() || null,
    attempt: value.attempt,
    submittedAt: value.submittedAt,
    attachmentIds: [...new Set(value.attachmentIds)].sort((left, right) => left.localeCompare(right)),
    ...(value.observedScore === undefined ? {} : { observedScore: value.observedScore }),
    ...(value.observedDraftScore === undefined ? {} : { observedDraftScore: value.observedDraftScore }),
  } satisfies BetaLmsStagingWriteObservation;
  if (
    normalized.providerSubmissionId !== null &&
    !PROVIDER_RESOURCE_ID_PATTERN.test(normalized.providerSubmissionId)
  ) {
    throw new Error("Provider submission identifier is invalid.");
  }
  if (canonicalJson(redactForEvidence(normalized)) !== canonicalJson(normalized)) {
    throw new Error("Provider staging observation contains sensitive data.");
  }
  return normalized;
}

function normalizeResource(
  value: BetaLmsStagingWriteResource,
  provider: BetaLmsStagingWriteProvider,
  namespace: string,
): BetaLmsStagingWriteResource {
  if (
    !value ||
    value.provider !== provider ||
    value.resourceTag !== namespace ||
    value.disposable !== true ||
    !PROVIDER_RESOURCE_ID_PATTERN.test(value.providerResourceId) ||
    (
      value.parentResourceId !== null &&
      !PROVIDER_RESOURCE_ID_PATTERN.test(value.parentResourceId)
    ) ||
    !["submission", "file", "student_submission", "drive_file"].includes(value.kind) ||
    (provider === "canvas" && !["submission", "file"].includes(value.kind)) ||
    (provider === "google_classroom" && !["student_submission", "drive_file"].includes(value.kind))
  ) {
    throw new Error("Provider staging resource is not bound to this operation.");
  }
  assertDigest(value.bindingDigest, "Provider resource binding");
  return { ...value };
}

function writeRoot(projectRoot: string, runId: string): string {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const directory = path.resolve(runDirectory, BETA_LMS_STAGING_WRITE_DIRECTORY);
  if (path.dirname(directory) !== runDirectory) {
    throw new Error("Provider staging write directory escaped the beta run.");
  }
  ensureDirectory(directory, "Provider staging write directory");
  return directory;
}

function recordPaths(projectRoot: string, runId: string, recordId: string): {
  directory: string;
  intent: string;
  resolution: string;
  discoveries: string;
  observations: string;
} {
  if (!RECORD_ID_PATTERN.test(recordId)) throw new Error("Provider staging record id is invalid.");
  const root = writeRoot(projectRoot, runId);
  const directory = path.resolve(root, recordId);
  if (path.dirname(directory) !== root) throw new Error("Provider staging record escaped its evidence root.");
  return {
    directory,
    intent: path.join(directory, INTENT_FILE),
    resolution: path.join(directory, RESOLUTION_FILE),
    discoveries: path.join(directory, DISCOVERY_DIRECTORY),
    observations: path.join(directory, OBSERVATION_DIRECTORY),
  };
}

function stableWriteIdentity(input: {
  binding: NormalizedBinding;
  provider: BetaLmsStagingWriteProvider;
  operation: BetaLmsStagingWriteOperation;
  targetDigest: string;
  payloadDigest: string;
}) {
  return {
    schemaVersion: BETA_LMS_STAGING_WRITE_SCHEMA_VERSION,
    kind: BETA_LMS_STAGING_WRITE_INTENT_KIND,
    runId: input.binding.runId,
    qaRunId: input.binding.qaRunId,
    releaseSha: input.binding.releaseSha,
    stagingUrl: input.binding.stagingUrl,
    source: input.binding.source,
    resourceNamespace: input.binding.resourceNamespace,
    acknowledgement: BETA_LMS_STAGING_WRITE_ACK,
    provider: input.provider,
    operation: input.operation,
    targetDigest: input.targetDigest,
    payloadDigest: input.payloadDigest,
  } as const;
}

function stableIntentFields(
  identity: ReturnType<typeof stableWriteIdentity>,
  baseline: BetaLmsStagingWriteObservation,
) {
  return {
    ...identity,
    baseline,
  } as const;
}

function intentDigest(intent: BetaLmsStagingWriteIntent): string {
  return digestBetaLmsStagingWriteValue(intent);
}

function parseIntent(value: unknown): BetaLmsStagingWriteIntent {
  if (!isRecord(value)) throw new Error("Provider staging write intent must be an object.");
  assertExactKeys(value, [
    "schemaVersion", "kind", "recordId", "runId", "qaRunId", "releaseSha",
    "stagingUrl", "source", "resourceNamespace", "acknowledgement", "provider",
    "operation", "targetDigest", "payloadDigest", "baseline", "createdAt",
  ], "Provider staging write intent");
  if (
    value.schemaVersion !== BETA_LMS_STAGING_WRITE_SCHEMA_VERSION ||
    value.kind !== BETA_LMS_STAGING_WRITE_INTENT_KIND ||
    typeof value.recordId !== "string" ||
    !RECORD_ID_PATTERN.test(value.recordId) ||
    typeof value.runId !== "string" ||
    typeof value.qaRunId !== "string" ||
    typeof value.releaseSha !== "string" ||
    typeof value.stagingUrl !== "string" ||
    !isRecord(value.source) ||
    typeof value.resourceNamespace !== "string" ||
    value.acknowledgement !== BETA_LMS_STAGING_WRITE_ACK ||
    !["canvas", "google_classroom"].includes(String(value.provider)) ||
    !["canvas_text_submission", "canvas_file_submission", "canvas_grade_delivery", "google_file_submission"].includes(String(value.operation)) ||
    typeof value.targetDigest !== "string" ||
    typeof value.payloadDigest !== "string" ||
    !isRecord(value.baseline) ||
    typeof value.createdAt !== "string" ||
    Number.isNaN(Date.parse(value.createdAt))
  ) {
    throw new Error("Provider staging write intent fields are invalid.");
  }
  assertDigest(value.targetDigest, "Provider write target");
  assertDigest(value.payloadDigest, "Provider write payload");
  const intent = value as unknown as BetaLmsStagingWriteIntent;
  intent.baseline = normalizeObservation(intent.baseline);
  assertProviderOperation(intent.provider, intent.operation);
  return intent;
}

function parseResolution(
  value: unknown,
  intent: BetaLmsStagingWriteIntent,
): BetaLmsStagingWriteResolution {
  if (!isRecord(value)) throw new Error("Provider staging write resolution must be an object.");
  assertExactKeys(value, [
    "schemaVersion", "kind", "recordId", "intentDigest", "status", "verification",
    "observationDigest", "resources", "confirmedAt",
  ], "Provider staging write resolution");
  if (
    value.schemaVersion !== BETA_LMS_STAGING_WRITE_SCHEMA_VERSION ||
    value.kind !== BETA_LMS_STAGING_WRITE_RESOLUTION_KIND ||
    value.recordId !== intent.recordId ||
    value.intentDigest !== intentDigest(intent) ||
    value.status !== "confirmed" ||
    value.verification !== "provider_readback" ||
    typeof value.observationDigest !== "string" ||
    !Array.isArray(value.resources) ||
    value.resources.length === 0 ||
    typeof value.confirmedAt !== "string" ||
    Number.isNaN(Date.parse(value.confirmedAt))
  ) {
    throw new Error("Provider staging write resolution fields are invalid.");
  }
  assertDigest(value.observationDigest, "Provider write observation");
  const resources = value.resources.map((resource) =>
    normalizeResource(
      resource as BetaLmsStagingWriteResource,
      intent.provider,
      intent.resourceNamespace,
    ));
  const ids = new Set(resources.map((resource) => resource.providerResourceId));
  if (ids.size !== resources.length) throw new Error("Provider staging resolution repeats a resource id.");
  return { ...(value as unknown as BetaLmsStagingWriteResolution), resources };
}

function readRecord(
  projectRoot: string,
  runId: string,
  recordId: string,
): { intent: BetaLmsStagingWriteIntent; resolution: BetaLmsStagingWriteResolution | null } {
  const paths = recordPaths(projectRoot, runId, recordId);
  assertDirectory(paths.directory, "Provider staging record directory");
  const intent = parseIntent(readJson(paths.intent, "Provider staging write intent"));
  if (intent.recordId !== recordId || intent.runId !== runId) {
    throw new Error("Provider staging record identity does not match its path.");
  }
  const resolution = existsSync(paths.resolution)
    ? parseResolution(readJson(paths.resolution, "Provider staging write resolution"), intent)
    : null;
  return { intent, resolution };
}

function discoveredResources(
  projectRoot: string,
  intent: BetaLmsStagingWriteIntent,
): BetaLmsStagingWriteResource[] {
  const paths = recordPaths(projectRoot, intent.runId, intent.recordId);
  if (!existsSync(paths.discoveries)) return [];
  assertDirectory(paths.discoveries, "Provider staging discovery directory");
  const resources = readdirSync(paths.discoveries, { withFileTypes: true })
    .filter((entry) => !ATOMIC_TEMP_ENTRY_PATTERN.test(entry.name))
    .map((entry) => {
      if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.endsWith(".json")) {
        throw new Error("Provider staging discovery directory contains an unsupported entry.");
      }
      const value = readJson(path.join(paths.discoveries, entry.name), "Provider staging resource discovery");
      if (!isRecord(value)) throw new Error("Provider staging resource discovery must be an object.");
      assertExactKeys(value, ["recordId", "intentDigest", "resource", "discoveredAt"], "Provider staging resource discovery");
      if (
        value.recordId !== intent.recordId ||
        value.intentDigest !== intentDigest(intent) ||
        !isRecord(value.resource) ||
        typeof value.discoveredAt !== "string" ||
        Number.isNaN(Date.parse(value.discoveredAt))
      ) {
        throw new Error("Provider staging resource discovery fields are invalid.");
      }
      return normalizeResource(
        value.resource as unknown as BetaLmsStagingWriteResource,
        intent.provider,
        intent.resourceNamespace,
      );
    });
  const byId = new Map<string, BetaLmsStagingWriteResource>();
  for (const resource of resources) {
    const current = byId.get(resource.providerResourceId);
    if (current && canonicalJson(current) !== canonicalJson(resource)) {
      throw new Error("Provider staging resource discovery conflicts with an earlier record.");
    }
    byId.set(resource.providerResourceId, resource);
  }
  return [...byId.values()].sort((left, right) =>
    left.providerResourceId.localeCompare(right.providerResourceId));
}

function recordResource(
  binding: NormalizedBinding,
  intent: BetaLmsStagingWriteIntent,
  resource: BetaLmsStagingWriteResource,
): void {
  const normalized = normalizeResource(resource, intent.provider, intent.resourceNamespace);
  const paths = recordPaths(binding.projectRoot, binding.runId, intent.recordId);
  ensureDirectory(paths.discoveries, "Provider staging discovery directory");
  const resourceDigest = digestBetaLmsStagingWriteValue(normalized);
  const filePath = path.join(paths.discoveries, `${resourceDigest}.json`);
  const value = {
    recordId: intent.recordId,
    intentDigest: intentDigest(intent),
    resource: normalized,
    discoveredAt: safeTimestamp(binding.now()),
  };
  if (existsSync(filePath)) {
    const existing = readJson(filePath, "Provider staging resource discovery");
    if (!isRecord(existing)) {
      throw new Error("Provider staging resource discovery was tampered with.");
    }
    const { discoveredAt: _existingDiscoveredAt, ...existingStable } = existing;
    const { discoveredAt: _newDiscoveredAt, ...newStable } = value;
    if (canonicalJson(existingStable) !== canonicalJson(newStable)) {
      throw new Error("Provider staging resource discovery was tampered with.");
    }
    return;
  }
  writeDurableJson(filePath, value);
}

function writeObservation(
  binding: NormalizedBinding,
  intent: BetaLmsStagingWriteIntent,
  observation: BetaLmsStagingWriteObservation,
  phase: "post_write" | "reconciliation",
): void {
  const paths = recordPaths(binding.projectRoot, binding.runId, intent.recordId);
  ensureDirectory(paths.observations, "Provider staging observation directory");
  const observedAt = safeTimestamp(binding.now());
  const value = {
    recordId: intent.recordId,
    intentDigest: intentDigest(intent),
    phase,
    observation,
    observedAt,
  };
  const suffix = digestBetaLmsStagingWriteValue(value);
  const observationPath = path.join(
    paths.observations,
    `${observedAt.replace(/[:.]/gu, "-")}-${suffix}.json`,
  );
  if (existsSync(observationPath)) {
    const existing = readJson(observationPath, "Provider staging write observation");
    if (canonicalJson(existing) !== canonicalJson(value)) {
      throw new Error("Provider staging write observation was tampered with.");
    }
    return;
  }
  writeDurableJson(observationPath, value);
}

function recordDigest(
  intent: BetaLmsStagingWriteIntent,
  resolution: BetaLmsStagingWriteResolution,
): string {
  return digestBetaLmsStagingWriteValue({ intent, resolution });
}

function writeResolution(
  binding: NormalizedBinding,
  intent: BetaLmsStagingWriteIntent,
  observation: BetaLmsStagingWriteObservation,
  decision: BetaLmsStagingWriteDecision,
): BetaLmsStagingWriteResolution {
  if (!decision.confirmed || !decision.detail.trim() || decision.resources.length === 0) {
    throw new Error("Provider staging write cannot be resolved without confirmed provider readback.");
  }
  const resources = decision.resources.map((resource) =>
    normalizeResource(resource, intent.provider, intent.resourceNamespace));
  const resolution: BetaLmsStagingWriteResolution = {
    schemaVersion: BETA_LMS_STAGING_WRITE_SCHEMA_VERSION,
    kind: BETA_LMS_STAGING_WRITE_RESOLUTION_KIND,
    recordId: intent.recordId,
    intentDigest: intentDigest(intent),
    status: "confirmed",
    verification: "provider_readback",
    observationDigest: digestBetaLmsStagingWriteValue(observation),
    resources,
    confirmedAt: safeTimestamp(binding.now()),
  };
  const paths = recordPaths(binding.projectRoot, binding.runId, intent.recordId);
  try {
    writeDurableJson(paths.resolution, resolution);
    return resolution;
  } catch (error) {
    if (!existsSync(paths.resolution)) throw error;
    const existing = parseResolution(
      readJson(paths.resolution, "Provider staging write resolution"),
      intent,
    );
    if (
      existing.observationDigest !== resolution.observationDigest ||
      canonicalJson(existing.resources) !== canonicalJson(resolution.resources)
    ) {
      throw new Error("Provider staging write resolution conflicts with durable evidence.");
    }
    return existing;
  }
}

function assertIntentMatches(
  existing: BetaLmsStagingWriteIntent,
  desired: ReturnType<typeof stableWriteIdentity>,
  recordId: string,
): void {
  const {
    recordId: _recordId,
    createdAt: _createdAt,
    baseline: _baseline,
    ...identity
  } = existing;
  if (
    existing.recordId !== recordId ||
    canonicalJson(identity) !== canonicalJson(desired)
  ) {
    throw new Error("Existing provider staging intent does not match this exact write.");
  }
}

async function reconcileRecord(
  options: ExecuteBetaLmsStagingWriteOptions,
  binding: NormalizedBinding,
  intent: BetaLmsStagingWriteIntent,
  resolution: BetaLmsStagingWriteResolution | null,
): Promise<ConfirmedBetaLmsStagingWriteRecord> {
  let current: BetaLmsStagingWriteObservation;
  try {
    current = normalizeObservation(await options.inspect());
  } catch (error) {
    throw new Error(
      `Provider staging write ${intent.recordId} is pending and provider state could not be reconciled. No automatic retry was attempted. ${redactText(error instanceof Error ? error.message : String(error))}`,
    );
  }
  writeObservation(binding, intent, current, "reconciliation");
  const discoveries = discoveredResources(binding.projectRoot, intent);
  const decision = options.confirm({
    baseline: intent.baseline,
    current,
    discoveredResources: discoveries,
  });
  if (!decision.confirmed) {
    throw new Error(
      `Provider staging write ${intent.recordId} remains pending after provider readback. No automatic retry was attempted. ${redactText(decision.detail)}`,
    );
  }
  if (resolution) {
    const expected = decision.resources.map((resource) =>
      normalizeResource(resource, intent.provider, intent.resourceNamespace));
    if (canonicalJson(expected) !== canonicalJson(resolution.resources)) {
      throw new Error("Provider readback no longer matches the durable staging write resolution.");
    }
    return {
      intent,
      resolution,
      recordDigest: recordDigest(intent, resolution),
      replayed: true,
      reconciled: true,
    };
  }
  const nextResolution = writeResolution(binding, intent, current, decision);
  return {
    intent,
    resolution: nextResolution,
    recordDigest: recordDigest(intent, nextResolution),
    replayed: false,
    reconciled: true,
  };
}

export async function executeDurableBetaLmsStagingWrite(
  options: ExecuteBetaLmsStagingWriteOptions,
): Promise<ConfirmedBetaLmsStagingWriteRecord> {
  const binding = normalizeBinding(options.binding);
  assertProviderOperation(options.provider, options.operation);
  assertDigest(options.targetDigest, "Provider write target");
  assertDigest(options.payloadDigest, "Provider write payload");

  const identity = stableWriteIdentity({
    binding,
    provider: options.provider,
    operation: options.operation,
    targetDigest: options.targetDigest,
    payloadDigest: options.payloadDigest,
  });
  const recordId = digestBetaLmsStagingWriteValue(identity);
  const paths = recordPaths(binding.projectRoot, binding.runId, recordId);

  if (existsSync(paths.directory)) {
    const existing = readRecord(binding.projectRoot, binding.runId, recordId);
    assertIntentMatches(existing.intent, identity, recordId);
    return reconcileRecord(options, binding, existing.intent, existing.resolution);
  }

  const baseline = normalizeObservation(await options.inspect());
  if (baseline.state === "unknown") {
    throw new Error("Provider state is unknown; no staging write intent was created.");
  }
  const stable = stableIntentFields(identity, baseline);

  const intent: BetaLmsStagingWriteIntent = {
    ...stable,
    recordId,
    createdAt: safeTimestamp(binding.now()),
  };
  const published = publishCrashAtomicDirectory(paths.directory, (temporaryDirectory) => {
    writeDurableJson(path.join(temporaryDirectory, INTENT_FILE), intent);
  });
  if (!published) {
    const existing = readRecord(binding.projectRoot, binding.runId, recordId);
    assertIntentMatches(existing.intent, identity, recordId);
    return reconcileRecord(options, binding, existing.intent, existing.resolution);
  }
  assertDirectory(paths.directory, "Provider staging record directory");

  let writeError: unknown = null;
  try {
    await options.write({
      recordResource: (resource) => recordResource(binding, intent, resource),
    });
  } catch (error) {
    writeError = error;
  }

  let current: BetaLmsStagingWriteObservation;
  try {
    current = normalizeObservation(await options.inspect());
  } catch (error) {
    throw new Error(
      `Provider staging write ${recordId} is pending because provider state could not be read back. No automatic retry will occur. ${redactText(error instanceof Error ? error.message : String(error))}`,
    );
  }
  writeObservation(binding, intent, current, "post_write");
  const discoveries = discoveredResources(binding.projectRoot, intent);
  const decision = options.confirm({
    baseline: intent.baseline,
    current,
    discoveredResources: discoveries,
  });
  if (!decision.confirmed) {
    const providerDetail = writeError
      ? ` Provider call detail: ${redactText(writeError instanceof Error ? writeError.message : String(writeError))}`
      : "";
    throw new Error(
      `Provider staging write ${recordId} remains pending after provider readback. No automatic retry will occur. ${redactText(decision.detail)}${providerDetail}`,
    );
  }
  const resolution = writeResolution(binding, intent, current, decision);
  return {
    intent,
    resolution,
    recordDigest: recordDigest(intent, resolution),
    replayed: false,
    reconciled: writeError !== null,
  };
}

export function readConfirmedBetaLmsStagingWriteRecords(
  projectRoot: string,
  runId: string,
): ConfirmedBetaLmsStagingWriteRecord[] {
  const root = writeRoot(path.resolve(projectRoot), validateBetaRunId(runId));
  const entries = readdirSync(root, { withFileTypes: true })
    .filter((entry) => !ATOMIC_TEMP_ENTRY_PATTERN.test(entry.name));
  const records = entries.map((entry) => {
    if (!entry.isDirectory() || entry.isSymbolicLink() || !RECORD_ID_PATTERN.test(entry.name)) {
      throw new Error("Provider staging write evidence contains an unsupported entry.");
    }
    const record = readRecord(projectRoot, runId, entry.name);
    if (!record.resolution) {
      throw new Error(`Provider staging write ${entry.name} is still pending.`);
    }
    return {
      intent: record.intent,
      resolution: record.resolution,
      recordDigest: recordDigest(record.intent, record.resolution),
      replayed: true,
      reconciled: true,
    };
  });
  return records.sort((left, right) =>
    left.intent.operation.localeCompare(right.intent.operation));
}

export function assertCompleteBetaLmsStagingWriteSet(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  stagingUrl: string,
): ConfirmedBetaLmsStagingWriteRecord[] {
  const manifest = readBetaRunManifest(path.resolve(projectRoot), validateBetaRunId(runId));
  const expectedReleaseSha = validateBetaReleaseSha(releaseSha);
  const expectedStagingUrl = validateBetaStagingUrl(stagingUrl);
  const expectedOperations: BetaLmsStagingWriteOperation[] = [
    "canvas_file_submission",
    "canvas_grade_delivery",
    "canvas_text_submission",
    "google_file_submission",
  ];
  const records = readConfirmedBetaLmsStagingWriteRecords(projectRoot, runId);
  if (
    records.length !== expectedOperations.length ||
    canonicalJson(records.map((record) => record.intent.operation)) !== canonicalJson(expectedOperations)
  ) {
    throw new Error("The durable staging write set is incomplete or contains an unexpected operation.");
  }
  for (const record of records) {
    if (
      record.intent.releaseSha !== expectedReleaseSha ||
      record.intent.stagingUrl !== expectedStagingUrl ||
      !betaSourceIdentityMatches(record.intent.source, manifest.source) ||
      record.intent.resourceNamespace !== getBetaQaResourceNamespace(runId)
    ) {
      throw new Error("A durable staging write record does not match the release-bound beta run.");
    }
  }
  return records;
}
