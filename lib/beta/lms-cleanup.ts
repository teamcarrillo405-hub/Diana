import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";

import type { BetaSourceIdentity } from "./contracts";
import {
  assertBetaRunOwnership,
  assertBetaSourceIdentity,
  readBetaRunManifest,
} from "./evidence";
import { getBetaQaResourceNamespace, getBetaQaRunId } from "./qa-resources";
import { redactForEvidence, redactText } from "./redaction";
import {
  validateBetaReleaseSha,
  validateBetaStagingUrl,
  validateDisposableProviderOrigin,
} from "./release-validation";
import { validateBetaRunId } from "./run-id";
import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";
import { readBetaSurfaceReceipt } from "./surface-evidence";
import {
  assertCompleteBetaLmsStagingWriteSet,
  type ConfirmedBetaLmsStagingWriteRecord,
} from "./lms-staging-write-records";
import {
  acquireEvidenceLock,
  publishCrashAtomicDirectory,
  releaseEvidenceLock,
  removeEvidenceLockAfterCompletedReceipt,
  writeCrashAtomicFileExclusive,
} from "./atomic-evidence";

export const BETA_LMS_CLEANUP_SCHEMA_VERSION = 1 as const;
export const BETA_LMS_CLEANUP_MANIFEST_KIND =
  "diana-beta-lms-cleanup-resources" as const;
export const BETA_LMS_CLEANUP_RECEIPT_KIND =
  "diana-beta-lms-cleanup-receipt" as const;
export const BETA_LMS_CLEANUP_ACK =
  "DELETE_DISPOSABLE_STAGING_RESOURCES" as const;
export const BETA_LMS_CLEANUP_INPUT_FILE =
  "lms-cleanup-resources.json" as const;
export const BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY =
  "provider-cleanup" as const;
export const BETA_LMS_CLEANUP_RECEIPT_FILE = "lms-cleanup.json" as const;
export const BETA_LMS_CLEANUP_LOCK_FILE = ".lms-cleanup.lock" as const;
export const BETA_LMS_CLEANUP_ACTION_DIRECTORY = "action-records" as const;
export const BETA_LMS_CLEANUP_ACTION_INTENT_KIND =
  "diana-beta-lms-cleanup-action-intent" as const;
export const BETA_LMS_CLEANUP_ACTION_RESOLUTION_KIND =
  "diana-beta-lms-cleanup-action-resolution" as const;

const GOOGLE_CLASSROOM_API_ORIGIN = "https://classroom.googleapis.com";
const RESOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/u;

export type BetaLmsCleanupProvider = "canvas" | "google_classroom";

export type BetaLmsCleanupResourceKind =
  | "submission"
  | "file"
  | "assignment"
  | "enrollment"
  | "student_submission"
  | "drive_file"
  | "coursework"
  | "course"
  | "oauth_grant";

export interface BetaLmsCleanupResource {
  providerResourceId: string;
  kind: BetaLmsCleanupResourceKind;
  resourceTag: string;
  parentResourceId: string | null;
  expectedBindingDigest: string;
  writeRecordId: string;
  writeRecordDigest: string;
  disposable: true;
}

export interface BetaLmsCleanupProviderInventory {
  provider: BetaLmsCleanupProvider;
  origin: string;
  tenantMarker: string;
  resourceTag: string;
  disposable: true;
  inventoryComplete: true;
  resources: BetaLmsCleanupResource[];
}

export interface BetaLmsCleanupResourceManifest {
  schemaVersion: typeof BETA_LMS_CLEANUP_SCHEMA_VERSION;
  kind: typeof BETA_LMS_CLEANUP_MANIFEST_KIND;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  stagingUrl: string;
  source: BetaSourceIdentity;
  environment: "staging";
  resourceNamespace: string;
  disposable: true;
  inventoryComplete: true;
  providers: BetaLmsCleanupProviderInventory[];
}

export interface BetaLmsCleanupPlanAction extends BetaLmsCleanupResource {
  sequence: number;
  provider: BetaLmsCleanupProvider;
  origin: string;
  idempotencyKey: string;
}

export interface BetaLmsCleanupCheck {
  id: string;
  status: "pass" | "block";
  detail: string;
}

export interface BetaLmsCleanupPlan {
  runId: string;
  qaRunId: string;
  releaseSha: string | null;
  stagingUrl: string | null;
  source: BetaSourceIdentity;
  resourceNamespace: string;
  planDigest: string | null;
  actions: BetaLmsCleanupPlanAction[];
  checks: BetaLmsCleanupCheck[];
  authorized: boolean;
}

export interface BetaLmsCleanupInspection {
  state: "present" | "absent" | "unknown";
  provider: BetaLmsCleanupProvider;
  providerResourceId: string;
  resourceTag: string;
  parentResourceId: string | null;
  bindingDigest: string | null;
}

export interface BetaLmsCleanupRemovalResult {
  outcome: "removed" | "already_absent" | "unknown";
  providerReceiptReference?: string | null;
}

export interface BetaLmsCleanupProviderWorker {
  inspect(resource: BetaLmsCleanupPlanAction): Promise<BetaLmsCleanupInspection>;
  remove(
    resource: BetaLmsCleanupPlanAction,
    context: { idempotencyKey: string; acknowledgement: typeof BETA_LMS_CLEANUP_ACK },
  ): Promise<BetaLmsCleanupRemovalResult>;
}

export type BetaLmsCleanupProviderWorkers = Partial<
  Record<BetaLmsCleanupProvider, BetaLmsCleanupProviderWorker>
>;

export interface BetaLmsCleanupActionReceipt {
  sequence: number;
  provider: BetaLmsCleanupProvider;
  kind: BetaLmsCleanupResourceKind;
  resourceIdDigest: string;
  stateBefore: BetaLmsCleanupInspection["state"];
  removalOutcome: BetaLmsCleanupRemovalResult["outcome"] | "not-called";
  stateAfter: BetaLmsCleanupInspection["state"];
  providerReceiptDigest: string | null;
  reconciled: boolean;
}

export interface BetaLmsCleanupReceipt {
  schemaVersion: typeof BETA_LMS_CLEANUP_SCHEMA_VERSION;
  kind: typeof BETA_LMS_CLEANUP_RECEIPT_KIND;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  stagingUrl: string;
  source: BetaSourceIdentity;
  resourceNamespace: string;
  planDigest: string;
  status: "pass";
  startedAt: string;
  completedAt: string;
  execution: "provider-owned-serial";
  replayed: boolean;
  actions: BetaLmsCleanupActionReceipt[];
}

export interface BetaLmsCleanupRunResult {
  status: "dry-run" | "blocked" | "pass";
  replayed: boolean;
  network: "none" | "provider-owned";
  writes: "none" | "disposable-provider-cleanup";
  plan: BetaLmsCleanupPlan;
  actions: BetaLmsCleanupActionReceipt[];
  receiptPath: string | null;
  error: string | null;
}

export interface BuildBetaLmsCleanupPlanOptions {
  projectRoot: string;
  runId: string;
  acknowledgement: string | null;
  apply: boolean;
  resourceManifest?: unknown;
}

export interface RunBetaLmsCleanupOptions
  extends BuildBetaLmsCleanupPlanOptions {
  workers?: BetaLmsCleanupProviderWorkers;
  now?: () => Date;
}

const RESOURCE_KINDS: Record<
  BetaLmsCleanupProvider,
  ReadonlySet<BetaLmsCleanupResourceKind>
> = {
  canvas: new Set([
    "submission",
    "file",
    "assignment",
    "enrollment",
    "course",
    "oauth_grant",
  ]),
  google_classroom: new Set([
    "student_submission",
    "drive_file",
    "coursework",
    "course",
    "oauth_grant",
  ]),
};

const KIND_ORDER: Record<BetaLmsCleanupResourceKind, number> = {
  submission: 0,
  student_submission: 0,
  file: 1,
  drive_file: 1,
  assignment: 2,
  coursework: 2,
  enrollment: 3,
  course: 4,
  oauth_grant: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const sortedExpected = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertNoSensitiveStrings(value: unknown, label: string): void {
  if (typeof value === "string") {
    if (redactText(value) !== value) {
      throw new Error(`${label} must not contain credentials or secret-like values.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSensitiveStrings(entry, `${label}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    for (const [key, entry] of Object.entries(value)) {
      assertNoSensitiveStrings(entry, `${label}.${key}`);
    }
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

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
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

function inputPath(projectRoot: string, runId: string): string {
  const validatedRunId = validateBetaRunId(runId);
  const inputRoot = path.resolve(projectRoot, "artifacts", "beta-gate-inputs");
  const runDirectory = path.resolve(inputRoot, validatedRunId);
  if (path.dirname(runDirectory) !== inputRoot) {
    throw new Error("LMS cleanup input directory escaped its fixed root.");
  }
  const filePath = path.resolve(runDirectory, BETA_LMS_CLEANUP_INPUT_FILE);
  if (path.dirname(filePath) !== runDirectory) {
    throw new Error("LMS cleanup input file escaped its run directory.");
  }
  return filePath;
}

function evidencePaths(projectRoot: string, runId: string): {
  directory: string;
  receipt: string;
  lock: string;
} {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const directory = path.resolve(runDirectory, BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY);
  if (path.dirname(directory) !== runDirectory) {
    throw new Error("LMS cleanup evidence directory escaped the beta run.");
  }
  return {
    directory,
    receipt: path.join(directory, BETA_LMS_CLEANUP_RECEIPT_FILE),
    lock: path.join(directory, BETA_LMS_CLEANUP_LOCK_FILE),
  };
}

function readResourceManifest(
  projectRoot: string,
  runId: string,
  supplied: unknown,
): unknown {
  if (supplied !== undefined) return supplied;
  const filePath = inputPath(projectRoot, runId);
  if (!existsSync(filePath)) {
    throw new Error(
      `Missing ${path.relative(projectRoot, filePath).replace(/\\/gu, "/")}.`,
    );
  }
  assertRegularFile(filePath, "LMS cleanup resource manifest");
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error("LMS cleanup resource manifest must contain valid JSON.");
  }
}

function assertProviderOrigin(
  provider: BetaLmsCleanupProvider,
  origin: string,
): string {
  if (provider === "canvas") return validateDisposableProviderOrigin(origin);
  if (origin !== GOOGLE_CLASSROOM_API_ORIGIN) {
    throw new Error(
      "Google Classroom cleanup must use the fixed Classroom API origin; isolation comes from the bound testing project and disposable resource tag.",
    );
  }
  return origin;
}

function parseResource(
  value: unknown,
  provider: BetaLmsCleanupProvider,
  namespace: string,
): BetaLmsCleanupResource {
  if (!isRecord(value)) throw new Error("LMS cleanup resource must be an object.");
  assertExactKeys(
    value,
    [
      "providerResourceId",
      "kind",
      "resourceTag",
      "parentResourceId",
      "expectedBindingDigest",
      "writeRecordId",
      "writeRecordDigest",
      "disposable",
    ],
    "LMS cleanup resource",
  );
  const providerResourceId = String(value.providerResourceId ?? "");
  const kind = String(value.kind ?? "") as BetaLmsCleanupResourceKind;
  const parentResourceId = value.parentResourceId;
  if (!RESOURCE_ID_PATTERN.test(providerResourceId)) {
    throw new Error("Provider resource ids must use the bounded cleanup identifier format.");
  }
  if (!RESOURCE_KINDS[provider].has(kind)) {
    throw new Error(`${kind || "Unknown resource kind"} is not valid for ${provider}.`);
  }
  if (
    parentResourceId !== null &&
    (typeof parentResourceId !== "string" || !RESOURCE_ID_PATTERN.test(parentResourceId))
  ) {
    throw new Error("Parent resource ids must be null or a bounded cleanup identifier.");
  }
  if (value.resourceTag !== namespace || value.disposable !== true) {
    throw new Error("Every provider resource must carry the exact disposable QA_RUN_ID tag.");
  }
  if (
    typeof value.expectedBindingDigest !== "string" ||
    !DIGEST_PATTERN.test(value.expectedBindingDigest)
  ) {
    throw new Error("Every provider resource requires a lowercase SHA-256 binding digest.");
  }
  if (
    typeof value.writeRecordId !== "string" ||
    !DIGEST_PATTERN.test(value.writeRecordId) ||
    typeof value.writeRecordDigest !== "string" ||
    !DIGEST_PATTERN.test(value.writeRecordDigest)
  ) {
    throw new Error("Every cleanup resource must reference one durable staging write record.");
  }
  return {
    providerResourceId,
    kind,
    resourceTag: namespace,
    parentResourceId: parentResourceId as string | null,
    expectedBindingDigest: value.expectedBindingDigest,
    writeRecordId: value.writeRecordId,
    writeRecordDigest: value.writeRecordDigest,
    disposable: true,
  };
}

function parseProviderInventory(
  value: unknown,
  namespace: string,
): BetaLmsCleanupProviderInventory {
  if (!isRecord(value)) throw new Error("LMS cleanup provider inventory must be an object.");
  assertExactKeys(
    value,
    [
      "provider",
      "origin",
      "tenantMarker",
      "resourceTag",
      "disposable",
      "inventoryComplete",
      "resources",
    ],
    "LMS cleanup provider inventory",
  );
  const provider = String(value.provider ?? "") as BetaLmsCleanupProvider;
  if (!(["canvas", "google_classroom"] as const).includes(provider)) {
    throw new Error("LMS cleanup supports only Canvas and Google Classroom.");
  }
  if (
    value.tenantMarker !== namespace ||
    value.resourceTag !== namespace ||
    value.disposable !== true ||
    value.inventoryComplete !== true
  ) {
    throw new Error("Provider inventory must be complete and bound to the exact disposable namespace.");
  }
  if (!Array.isArray(value.resources) || value.resources.length === 0) {
    throw new Error(`${provider} cleanup inventory must contain at least one resource.`);
  }
  const origin = assertProviderOrigin(provider, String(value.origin ?? ""));
  const resources = value.resources.map((resource) =>
    parseResource(resource, provider, namespace));
  const ids = new Set<string>();
  for (const resource of resources) {
    if (ids.has(resource.providerResourceId)) {
      throw new Error(`${provider} cleanup inventory contains duplicate resource ids.`);
    }
    ids.add(resource.providerResourceId);
  }
  for (const resource of resources) {
    if (
      resource.parentResourceId !== null &&
      !ids.has(resource.parentResourceId)
    ) {
      throw new Error(`${provider} cleanup resource refers to an unbound parent.`);
    }
    if (resource.parentResourceId === resource.providerResourceId) {
      throw new Error(`${provider} cleanup resource cannot be its own parent.`);
    }
  }
  return {
    provider,
    origin,
    tenantMarker: namespace,
    resourceTag: namespace,
    disposable: true,
    inventoryComplete: true,
    resources,
  };
}

export function parseBetaLmsCleanupResourceManifest(
  value: unknown,
): BetaLmsCleanupResourceManifest {
  assertNoSensitiveStrings(value, "LMS cleanup resource manifest");
  if (!isRecord(value)) throw new Error("LMS cleanup resource manifest must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "releaseSha",
      "stagingUrl",
      "source",
      "environment",
      "resourceNamespace",
      "disposable",
      "inventoryComplete",
      "providers",
    ],
    "LMS cleanup resource manifest",
  );
  if (
    value.schemaVersion !== BETA_LMS_CLEANUP_SCHEMA_VERSION ||
    value.kind !== BETA_LMS_CLEANUP_MANIFEST_KIND ||
    value.environment !== "staging" ||
    value.disposable !== true ||
    value.inventoryComplete !== true
  ) {
    throw new Error("LMS cleanup resource manifest is not an approved disposable staging inventory.");
  }
  const runId = validateBetaRunId(value.runId);
  const qaRunId = validateBetaRunId(value.qaRunId);
  const namespace = getBetaQaResourceNamespace(runId);
  if (
    qaRunId !== getBetaQaRunId(runId) ||
    value.resourceNamespace !== namespace
  ) {
    throw new Error("LMS cleanup manifest QA_RUN_ID bindings do not match the requested run.");
  }
  const releaseSha = validateBetaReleaseSha(String(value.releaseSha ?? ""));
  const stagingUrl = validateBetaStagingUrl(String(value.stagingUrl ?? ""));
  assertBetaSourceIdentity(value.source, "LMS cleanup manifest source identity");
  if (!Array.isArray(value.providers) || value.providers.length !== 2) {
    throw new Error("LMS cleanup inventory must include exactly Canvas and Google Classroom.");
  }
  const providers = value.providers.map((provider) =>
    parseProviderInventory(provider, namespace));
  if (
    new Set(providers.map((provider) => provider.provider)).size !== 2 ||
    !providers.some((provider) => provider.provider === "canvas") ||
    !providers.some((provider) => provider.provider === "google_classroom")
  ) {
    throw new Error("LMS cleanup inventory must contain one entry for each provider.");
  }
  return {
    schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
    kind: BETA_LMS_CLEANUP_MANIFEST_KIND,
    runId,
    qaRunId,
    releaseSha,
    stagingUrl,
    source: value.source,
    environment: "staging",
    resourceNamespace: namespace,
    disposable: true,
    inventoryComplete: true,
    providers,
  };
}

function stagingResourceKey(provider: BetaLmsCleanupProvider, providerResourceId: string): string {
  return `${provider}\0${providerResourceId}`;
}

function assertCleanupInventoryWriteBindings(
  projectRoot: string,
  manifest: BetaLmsCleanupResourceManifest,
): ConfirmedBetaLmsStagingWriteRecord[] {
  const records = assertCompleteBetaLmsStagingWriteSet(
    projectRoot,
    manifest.runId,
    manifest.releaseSha,
    manifest.stagingUrl,
  );
  const recorded = new Map<string, {
    record: ConfirmedBetaLmsStagingWriteRecord;
    resource: ConfirmedBetaLmsStagingWriteRecord["resolution"]["resources"][number];
  }>();
  for (const record of records) {
    for (const resource of record.resolution.resources) {
      const key = stagingResourceKey(record.intent.provider, resource.providerResourceId);
      if (recorded.has(key)) {
        throw new Error("A provider resource appears in more than one durable staging write record.");
      }
      recorded.set(key, { record, resource });
    }
  }

  const inventoryKeys = new Set<string>();
  for (const providerInventory of manifest.providers) {
    for (const resource of providerInventory.resources) {
      const key = stagingResourceKey(providerInventory.provider, resource.providerResourceId);
      const durable = recorded.get(key);
      if (
        !durable ||
        resource.writeRecordId !== durable.record.intent.recordId ||
        resource.writeRecordDigest !== durable.record.recordDigest ||
        resource.kind !== durable.resource.kind ||
        resource.resourceTag !== durable.resource.resourceTag ||
        resource.parentResourceId !== durable.resource.parentResourceId ||
        resource.expectedBindingDigest !== durable.resource.bindingDigest ||
        durable.resource.disposable !== true
      ) {
        throw new Error(
          "LMS cleanup inventory contains a resource that is not exactly bound to a confirmed durable staging write record.",
        );
      }
      if (inventoryKeys.has(key)) {
        throw new Error("LMS cleanup inventory repeats a durable provider resource.");
      }
      inventoryKeys.add(key);
    }
  }
  if (inventoryKeys.size !== recorded.size) {
    throw new Error(
      "LMS cleanup inventory must exactly cover every resource in the durable staging write set.",
    );
  }
  return records;
}

function resourceDepth(
  resource: BetaLmsCleanupResource,
  byId: ReadonlyMap<string, BetaLmsCleanupResource>,
  visiting: Set<string>,
): number {
  if (resource.parentResourceId === null) return 0;
  if (visiting.has(resource.providerResourceId)) {
    throw new Error("LMS cleanup resource parents contain a cycle.");
  }
  visiting.add(resource.providerResourceId);
  const parent = byId.get(resource.parentResourceId);
  if (!parent) throw new Error("LMS cleanup resource parent is missing.");
  const depth = 1 + resourceDepth(parent, byId, visiting);
  visiting.delete(resource.providerResourceId);
  return depth;
}

function createActions(
  manifest: BetaLmsCleanupResourceManifest,
): BetaLmsCleanupPlanAction[] {
  const staged = manifest.providers.flatMap((providerInventory) => {
    const byId = new Map(
      providerInventory.resources.map((resource) => [resource.providerResourceId, resource]),
    );
    return providerInventory.resources.map((resource) => ({
      ...resource,
      provider: providerInventory.provider,
      origin: providerInventory.origin,
      depth: resourceDepth(resource, byId, new Set()),
    }));
  });
  staged.sort((left, right) =>
    right.depth - left.depth ||
    left.provider.localeCompare(right.provider) ||
    KIND_ORDER[left.kind] - KIND_ORDER[right.kind] ||
    left.providerResourceId.localeCompare(right.providerResourceId));
  const planSeed = canonicalJson({
    runId: manifest.runId,
    releaseSha: manifest.releaseSha,
    stagingUrl: manifest.stagingUrl,
    source: manifest.source,
    resourceNamespace: manifest.resourceNamespace,
    resources: staged.map(({ depth: _depth, ...resource }) => resource),
  });
  const seedDigest = sha256(planSeed);
  return staged.map(({ depth: _depth, ...resource }, index) => ({
    ...resource,
    sequence: index + 1,
    idempotencyKey: sha256(
      `${seedDigest}\0${resource.provider}\0${resource.providerResourceId}`,
    ),
  }));
}

function blockedCheck(id: string, error: unknown): BetaLmsCleanupCheck {
  return {
    id,
    status: "block",
    detail: error instanceof Error ? error.message : String(error),
  };
}

export function buildBetaLmsCleanupPlan(
  options: BuildBetaLmsCleanupPlanOptions,
): BetaLmsCleanupPlan {
  const projectRoot = path.resolve(options.projectRoot);
  const runId = validateBetaRunId(options.runId);
  const runManifest = readBetaRunManifest(projectRoot, runId);
  const namespace = getBetaQaResourceNamespace(runId);
  const checks: BetaLmsCleanupCheck[] = [];
  let resourceManifest: BetaLmsCleanupResourceManifest | null = null;
  let stagingReceipt: ReturnType<typeof readBetaSurfaceReceipt> | null = null;
  let releaseSha: string | null = null;
  let stagingUrl: string | null = null;
  let actions: BetaLmsCleanupPlanAction[] = [];
  let planDigest: string | null = null;

  try {
    const currentSource = readBetaSourceIdentity(projectRoot);
    if (!betaSourceIdentityMatches(runManifest.source, currentSource)) {
      throw new Error("Source changed after the beta run. Start a new QA_RUN_ID.");
    }
    checks.push({
      id: "source-identity",
      status: "pass",
      detail: "Current source exactly matches the immutable beta run source.",
    });
  } catch (error) {
    checks.push(blockedCheck("source-identity", error));
  }

  try {
    stagingReceipt = readBetaSurfaceReceipt(projectRoot, runId, "lms-staging");
    if (
      stagingReceipt.status !== "pass" ||
      stagingReceipt.network !== "staging-providers" ||
      stagingReceipt.writes !== "disposable-staging" ||
      stagingReceipt.command === null
    ) {
      throw new Error("A passing release-bound LMS staging write receipt is required.");
    }
    releaseSha = stagingReceipt.bindings.releaseSha;
    stagingUrl = stagingReceipt.bindings.url;
    if (releaseSha === null || stagingUrl === null) {
      throw new Error("LMS staging receipt is missing release SHA or staging URL bindings.");
    }
    checks.push({
      id: "lms-staging-receipt",
      status: "pass",
      detail: "Cleanup is bound to a passing disposable LMS staging write receipt.",
    });
  } catch (error) {
    checks.push(blockedCheck("lms-staging-receipt", error));
  }

  try {
    resourceManifest = parseBetaLmsCleanupResourceManifest(
      readResourceManifest(projectRoot, runId, options.resourceManifest),
    );
    if (
      resourceManifest.runId !== runId ||
      resourceManifest.qaRunId !== getBetaQaRunId(runId) ||
      resourceManifest.resourceNamespace !== namespace ||
      !betaSourceIdentityMatches(resourceManifest.source, runManifest.source) ||
      resourceManifest.releaseSha !== runManifest.source.commitSha ||
      resourceManifest.releaseSha !== releaseSha ||
      resourceManifest.stagingUrl !== stagingUrl
    ) {
      throw new Error("LMS cleanup inventory does not exactly match its run, source, release, and staging bindings.");
    }
    const writeRecords = assertCleanupInventoryWriteBindings(projectRoot, resourceManifest);
    actions = createActions(resourceManifest);
    planDigest = sha256(canonicalJson({ resourceManifest, actions }));
    checks.push({
      id: "resource-inventory",
      status: "pass",
      detail: `Validated ${actions.length} child-first disposable resources against ${writeRecords.length} durable staging write records.`,
    });
  } catch (error) {
    checks.push(blockedCheck("resource-inventory", error));
  }

  const acknowledged = options.acknowledgement === BETA_LMS_CLEANUP_ACK;
  checks.push({
    id: "cleanup-acknowledgement",
    status: !options.apply || acknowledged ? "pass" : "block",
    detail: !options.apply
      ? "Dry-run does not authorize provider actions."
      : acknowledged
        ? "The exact disposable cleanup acknowledgement is present."
        : `Apply mode requires --ack=${BETA_LMS_CLEANUP_ACK}.`,
  });

  return {
    runId,
    qaRunId: getBetaQaRunId(runId),
    releaseSha,
    stagingUrl,
    source: runManifest.source,
    resourceNamespace: namespace,
    planDigest,
    actions,
    checks,
    authorized: checks.every((check) => check.status === "pass"),
  };
}

function validateInspection(
  inspection: BetaLmsCleanupInspection,
  action: BetaLmsCleanupPlanAction,
): void {
  if (
    !inspection ||
    !["present", "absent", "unknown"].includes(inspection.state) ||
    inspection.provider !== action.provider ||
    inspection.providerResourceId !== action.providerResourceId ||
    inspection.resourceTag !== action.resourceTag ||
    inspection.parentResourceId !== action.parentResourceId
  ) {
    throw new Error("Provider inspection did not match the exact cleanup resource binding.");
  }
  if (
    inspection.state === "present" &&
    inspection.bindingDigest !== action.expectedBindingDigest
  ) {
    throw new Error("Provider inspection binding digest does not match the disposable inventory.");
  }
  if (
    inspection.bindingDigest !== null &&
    !DIGEST_PATTERN.test(inspection.bindingDigest)
  ) {
    throw new Error("Provider inspection returned an invalid binding digest.");
  }
}

function actionReceipt(
  action: BetaLmsCleanupPlanAction,
  input: Omit<
    BetaLmsCleanupActionReceipt,
    "sequence" | "provider" | "kind" | "resourceIdDigest"
  >,
): BetaLmsCleanupActionReceipt {
  return {
    sequence: action.sequence,
    provider: action.provider,
    kind: action.kind,
    resourceIdDigest: sha256(action.providerResourceId),
    ...input,
  };
}

interface BetaLmsCleanupActionIntent {
  schemaVersion: typeof BETA_LMS_CLEANUP_SCHEMA_VERSION;
  kind: typeof BETA_LMS_CLEANUP_ACTION_INTENT_KIND;
  runId: string;
  planDigest: string;
  idempotencyKey: string;
  sequence: number;
  provider: BetaLmsCleanupProvider;
  resourceKind: BetaLmsCleanupResourceKind;
  resourceIdDigest: string;
  expectedBindingDigest: string;
  stateBefore: "present" | "absent";
  acknowledgement: typeof BETA_LMS_CLEANUP_ACK;
  createdAt: string;
}

interface BetaLmsCleanupActionResolution {
  schemaVersion: typeof BETA_LMS_CLEANUP_SCHEMA_VERSION;
  kind: typeof BETA_LMS_CLEANUP_ACTION_RESOLUTION_KIND;
  intentDigest: string;
  status: "absent";
  receipt: BetaLmsCleanupActionReceipt;
  completedAt: string;
}

function cleanupActionPaths(
  projectRoot: string,
  plan: BetaLmsCleanupPlan,
  action: BetaLmsCleanupPlanAction,
): { directory: string; intent: string; resolution: string } {
  if (!plan.planDigest || !DIGEST_PATTERN.test(plan.planDigest)) {
    throw new Error("LMS cleanup action requires a canonical plan digest.");
  }
  const evidence = evidencePaths(projectRoot, plan.runId);
  if (!existsSync(evidence.directory)) mkdirSync(evidence.directory);
  assertDirectory(evidence.directory, "LMS cleanup evidence directory");
  const root = path.resolve(evidence.directory, BETA_LMS_CLEANUP_ACTION_DIRECTORY);
  if (path.dirname(root) !== evidence.directory) {
    throw new Error("LMS cleanup action directory escaped its evidence root.");
  }
  if (!existsSync(root)) mkdirSync(root);
  assertDirectory(root, "LMS cleanup action directory");
  const directory = path.resolve(
    root,
    `${String(action.sequence).padStart(4, "0")}-${action.idempotencyKey}`,
  );
  if (path.dirname(directory) !== root) {
    throw new Error("LMS cleanup action record escaped its evidence root.");
  }
  return {
    directory,
    intent: path.join(directory, "intent.json"),
    resolution: path.join(directory, "resolution.json"),
  };
}

function writeDurableCleanupJson(filePath: string, value: unknown): void {
  if (canonicalJson(redactForEvidence(value)) !== canonicalJson(value)) {
    throw new Error("LMS cleanup action evidence contains sensitive data.");
  }
  writeCrashAtomicFileExclusive(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function cleanupActionIntentDigest(intent: BetaLmsCleanupActionIntent): string {
  return sha256(canonicalJson(intent));
}

function readCleanupActionRecord(
  projectRoot: string,
  plan: BetaLmsCleanupPlan,
  action: BetaLmsCleanupPlanAction,
): {
  intent: BetaLmsCleanupActionIntent;
  resolution: BetaLmsCleanupActionResolution | null;
} | null {
  const paths = cleanupActionPaths(projectRoot, plan, action);
  if (!existsSync(paths.directory)) return null;
  assertDirectory(paths.directory, "LMS cleanup action record directory");
  if (!existsSync(paths.intent)) {
    throw new Error("LMS cleanup action record is missing its durable pending intent.");
  }
  const rawIntent = JSON.parse(readFileSync(paths.intent, "utf8")) as unknown;
  if (!isRecord(rawIntent)) throw new Error("LMS cleanup action intent must be an object.");
  assertExactKeys(rawIntent, [
    "schemaVersion", "kind", "runId", "planDigest", "idempotencyKey", "sequence",
    "provider", "resourceKind", "resourceIdDigest", "expectedBindingDigest",
    "stateBefore", "acknowledgement", "createdAt",
  ], "LMS cleanup action intent");
  if (
    rawIntent.schemaVersion !== BETA_LMS_CLEANUP_SCHEMA_VERSION ||
    rawIntent.kind !== BETA_LMS_CLEANUP_ACTION_INTENT_KIND ||
    rawIntent.runId !== plan.runId ||
    rawIntent.planDigest !== plan.planDigest ||
    rawIntent.idempotencyKey !== action.idempotencyKey ||
    rawIntent.sequence !== action.sequence ||
    rawIntent.provider !== action.provider ||
    rawIntent.resourceKind !== action.kind ||
    rawIntent.resourceIdDigest !== sha256(action.providerResourceId) ||
    rawIntent.expectedBindingDigest !== action.expectedBindingDigest ||
    !["present", "absent"].includes(String(rawIntent.stateBefore)) ||
    rawIntent.acknowledgement !== BETA_LMS_CLEANUP_ACK ||
    typeof rawIntent.createdAt !== "string" ||
    Number.isNaN(Date.parse(rawIntent.createdAt))
  ) {
    throw new Error("LMS cleanup action intent does not match the canonical cleanup action.");
  }
  const intent = rawIntent as unknown as BetaLmsCleanupActionIntent;
  if (!existsSync(paths.resolution)) return { intent, resolution: null };
  const rawResolution = JSON.parse(readFileSync(paths.resolution, "utf8")) as unknown;
  if (!isRecord(rawResolution)) {
    throw new Error("LMS cleanup action resolution must be an object.");
  }
  assertExactKeys(rawResolution, [
    "schemaVersion", "kind", "intentDigest", "status", "receipt", "completedAt",
  ], "LMS cleanup action resolution");
  if (
    rawResolution.schemaVersion !== BETA_LMS_CLEANUP_SCHEMA_VERSION ||
    rawResolution.kind !== BETA_LMS_CLEANUP_ACTION_RESOLUTION_KIND ||
    rawResolution.intentDigest !== cleanupActionIntentDigest(intent) ||
    rawResolution.status !== "absent" ||
    !isRecord(rawResolution.receipt) ||
    typeof rawResolution.completedAt !== "string" ||
    Number.isNaN(Date.parse(rawResolution.completedAt))
  ) {
    throw new Error("LMS cleanup action resolution fields are invalid.");
  }
  const receipt = rawResolution.receipt as unknown as BetaLmsCleanupActionReceipt;
  if (
    receipt.sequence !== action.sequence ||
    receipt.provider !== action.provider ||
    receipt.kind !== action.kind ||
    receipt.resourceIdDigest !== sha256(action.providerResourceId) ||
    !["present", "absent"].includes(receipt.stateBefore) ||
    !["removed", "already_absent", "unknown", "not-called"].includes(receipt.removalOutcome) ||
    receipt.stateAfter !== "absent" ||
    receipt.reconciled !== true ||
    (
      receipt.providerReceiptDigest !== null &&
      !DIGEST_PATTERN.test(receipt.providerReceiptDigest)
    )
  ) {
    throw new Error("LMS cleanup action resolution does not match the canonical cleanup action.");
  }
  return {
    intent,
    resolution: {
      ...(rawResolution as unknown as BetaLmsCleanupActionResolution),
      receipt,
    },
  };
}

function createCleanupActionIntent(
  projectRoot: string,
  plan: BetaLmsCleanupPlan,
  action: BetaLmsCleanupPlanAction,
  stateBefore: "present" | "absent",
  now: () => Date,
): { intent: BetaLmsCleanupActionIntent; created: boolean } {
  const paths = cleanupActionPaths(projectRoot, plan, action);
  const intent: BetaLmsCleanupActionIntent = {
    schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
    kind: BETA_LMS_CLEANUP_ACTION_INTENT_KIND,
    runId: plan.runId,
    planDigest: plan.planDigest!,
    idempotencyKey: action.idempotencyKey,
    sequence: action.sequence,
    provider: action.provider,
    resourceKind: action.kind,
    resourceIdDigest: sha256(action.providerResourceId),
    expectedBindingDigest: action.expectedBindingDigest,
    stateBefore,
    acknowledgement: BETA_LMS_CLEANUP_ACK,
    createdAt: now().toISOString(),
  };
  const published = publishCrashAtomicDirectory(paths.directory, (temporaryDirectory) => {
    writeDurableCleanupJson(path.join(temporaryDirectory, "intent.json"), intent);
  });
  if (!published) {
    const existing = readCleanupActionRecord(projectRoot, plan, action);
    if (existing) return { intent: existing.intent, created: false };
    throw new Error("LMS cleanup action was claimed without a readable durable intent.");
  }
  assertDirectory(paths.directory, "LMS cleanup action record directory");
  return { intent, created: true };
}

function resolveCleanupAction(
  projectRoot: string,
  plan: BetaLmsCleanupPlan,
  action: BetaLmsCleanupPlanAction,
  intent: BetaLmsCleanupActionIntent,
  receipt: BetaLmsCleanupActionReceipt,
  now: () => Date,
): BetaLmsCleanupActionReceipt {
  const paths = cleanupActionPaths(projectRoot, plan, action);
  const resolution: BetaLmsCleanupActionResolution = {
    schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
    kind: BETA_LMS_CLEANUP_ACTION_RESOLUTION_KIND,
    intentDigest: cleanupActionIntentDigest(intent),
    status: "absent",
    receipt,
    completedAt: now().toISOString(),
  };
  try {
    writeDurableCleanupJson(paths.resolution, resolution);
    return receipt;
  } catch (error) {
    if (!existsSync(paths.resolution)) throw error;
    const existing = readCleanupActionRecord(projectRoot, plan, action);
    if (!existing?.resolution) throw error;
    if (canonicalJson(existing.resolution.receipt) !== canonicalJson(receipt)) {
      throw new Error("LMS cleanup action resolution conflicts with durable evidence.");
    }
    return existing.resolution.receipt;
  }
}

async function executeCleanupAction(input: {
  projectRoot: string;
  plan: BetaLmsCleanupPlan;
  action: BetaLmsCleanupPlanAction;
  worker: BetaLmsCleanupProviderWorker;
  now: () => Date;
  onProviderWriteAttempted: () => void;
}): Promise<{
  receipt: BetaLmsCleanupActionReceipt;
  providerWriteAttempted: boolean;
  error?: string;
}> {
  const existing = readCleanupActionRecord(input.projectRoot, input.plan, input.action);
  if (existing) {
    const current = await inspectExact(input.worker, input.action);
    if (existing.resolution) {
      if (current.state !== "absent") {
        throw new Error("A resolved LMS cleanup action no longer reads back as absent.");
      }
      return { receipt: existing.resolution.receipt, providerWriteAttempted: false };
    }
    if (current.state !== "absent") {
      throw new Error(
        `LMS cleanup action ${input.action.sequence} remains pending after provider readback (${current.state}); no automatic retry was attempted.`,
      );
    }
    const receipt = actionReceipt(input.action, {
      stateBefore: existing.intent.stateBefore,
      removalOutcome: existing.intent.stateBefore === "absent" ? "not-called" : "unknown",
      stateAfter: "absent",
      providerReceiptDigest: null,
      reconciled: true,
    });
    return {
      receipt: resolveCleanupAction(
        input.projectRoot,
        input.plan,
        input.action,
        existing.intent,
        receipt,
        input.now,
      ),
      providerWriteAttempted: false,
    };
  }

  const before = await inspectExact(input.worker, input.action);
  if (before.state === "unknown") {
    throw new Error("Provider state is unknown; no deletion intent was persisted.");
  }
  const createdIntent = createCleanupActionIntent(
    input.projectRoot,
    input.plan,
    input.action,
    before.state,
    input.now,
  );
  if (!createdIntent.created) {
    const current = await inspectExact(input.worker, input.action);
    if (current.state !== "absent") {
      throw new Error(
        `LMS cleanup action ${input.action.sequence} was already claimed and reads back as ${current.state}; no automatic retry was attempted.`,
      );
    }
    const receipt = actionReceipt(input.action, {
      stateBefore: createdIntent.intent.stateBefore,
      removalOutcome: createdIntent.intent.stateBefore === "absent" ? "not-called" : "unknown",
      stateAfter: "absent",
      providerReceiptDigest: null,
      reconciled: true,
    });
    return {
      receipt: resolveCleanupAction(
        input.projectRoot,
        input.plan,
        input.action,
        createdIntent.intent,
        receipt,
        input.now,
      ),
      providerWriteAttempted: false,
    };
  }
  const intent = createdIntent.intent;
  if (before.state === "absent") {
    const receipt = actionReceipt(input.action, {
      stateBefore: "absent",
      removalOutcome: "not-called",
      stateAfter: "absent",
      providerReceiptDigest: null,
      reconciled: true,
    });
    return {
      receipt: resolveCleanupAction(
        input.projectRoot,
        input.plan,
        input.action,
        intent,
        receipt,
        input.now,
      ),
      providerWriteAttempted: false,
    };
  }

  let removal: BetaLmsCleanupRemovalResult | null = null;
  let removalError: unknown = null;
  try {
    input.onProviderWriteAttempted();
    removal = await input.worker.remove(input.action, {
      idempotencyKey: input.action.idempotencyKey,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
    });
    if (!removal || !["removed", "already_absent", "unknown"].includes(removal.outcome)) {
      removalError = new Error("Provider cleanup worker returned an invalid removal result.");
      removal = null;
    }
  } catch (error) {
    removalError = error;
  }
  const after = await inspectExact(input.worker, input.action);
  if (after.state !== "absent") {
    return {
      receipt: actionReceipt(input.action, {
        stateBefore: "present",
        removalOutcome: removal?.outcome ?? "unknown",
        stateAfter: after.state,
        providerReceiptDigest: removal?.providerReceiptReference
          ? sha256(removal.providerReceiptReference)
          : null,
        reconciled: true,
      }),
      providerWriteAttempted: true,
      error: `Provider cleanup action ${input.action.sequence} remains pending after provider readback (${after.state}); no automatic retry will occur. ${removalError instanceof Error ? removalError.message : ""}`.trim(),
    };
  }
  const receipt = actionReceipt(input.action, {
    stateBefore: "present",
    removalOutcome: removal?.outcome ?? "unknown",
    stateAfter: "absent",
    providerReceiptDigest: removal?.providerReceiptReference
      ? sha256(removal.providerReceiptReference)
      : null,
    reconciled: true,
  });
  return {
    receipt: resolveCleanupAction(
      input.projectRoot,
      input.plan,
      input.action,
      intent,
      receipt,
      input.now,
    ),
    providerWriteAttempted: true,
  };
}

function readExistingReceipt(
  projectRoot: string,
  plan: BetaLmsCleanupPlan,
): { receipt: BetaLmsCleanupReceipt; path: string } | null {
  const paths = evidencePaths(projectRoot, plan.runId);
  if (!existsSync(paths.receipt)) return null;
  assertRegularFile(paths.receipt, "LMS cleanup receipt");
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(paths.receipt, "utf8")) as unknown;
  } catch {
    throw new Error("Existing LMS cleanup receipt is not valid JSON.");
  }
  if (!isRecord(value)) throw new Error("Existing LMS cleanup receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "releaseSha",
      "stagingUrl",
      "source",
      "resourceNamespace",
      "planDigest",
      "status",
      "startedAt",
      "completedAt",
      "execution",
      "replayed",
      "actions",
    ],
    "Existing LMS cleanup receipt",
  );
  assertBetaSourceIdentity(value.source, "Existing LMS cleanup receipt source");
  if (
    value.schemaVersion !== BETA_LMS_CLEANUP_SCHEMA_VERSION ||
    value.kind !== BETA_LMS_CLEANUP_RECEIPT_KIND ||
    value.runId !== plan.runId ||
    value.qaRunId !== plan.qaRunId ||
    value.releaseSha !== plan.releaseSha ||
    value.stagingUrl !== plan.stagingUrl ||
    value.resourceNamespace !== plan.resourceNamespace ||
    value.planDigest !== plan.planDigest ||
    value.status !== "pass" ||
    value.execution !== "provider-owned-serial" ||
    value.replayed !== false ||
    !betaSourceIdentityMatches(value.source, plan.source) ||
    typeof value.startedAt !== "string" ||
    Number.isNaN(Date.parse(value.startedAt)) ||
    new Date(value.startedAt).toISOString() !== value.startedAt ||
    typeof value.completedAt !== "string" ||
    Number.isNaN(Date.parse(value.completedAt)) ||
    new Date(value.completedAt).toISOString() !== value.completedAt ||
    !Array.isArray(value.actions) ||
    value.actions.length !== plan.actions.length
  ) {
    throw new Error("Existing LMS cleanup receipt does not match this exact cleanup plan.");
  }
  for (let index = 0; index < plan.actions.length; index += 1) {
    const expected = plan.actions[index];
    const candidate = value.actions[index];
    if (!isRecord(candidate)) {
      throw new Error("Existing LMS cleanup receipt action must be an object.");
    }
    assertExactKeys(
      candidate,
      [
        "sequence",
        "provider",
        "kind",
        "resourceIdDigest",
        "stateBefore",
        "removalOutcome",
        "stateAfter",
        "providerReceiptDigest",
        "reconciled",
      ],
      "Existing LMS cleanup receipt action",
    );
    if (
      candidate.sequence !== expected.sequence ||
      candidate.provider !== expected.provider ||
      candidate.kind !== expected.kind ||
      candidate.resourceIdDigest !== sha256(expected.providerResourceId) ||
      !["present", "absent"].includes(String(candidate.stateBefore)) ||
      !["removed", "already_absent", "unknown", "not-called"].includes(
        String(candidate.removalOutcome),
      ) ||
      candidate.stateAfter !== "absent" ||
      candidate.reconciled !== true ||
      (
        candidate.providerReceiptDigest !== null &&
        (
          typeof candidate.providerReceiptDigest !== "string" ||
          !DIGEST_PATTERN.test(candidate.providerReceiptDigest)
        )
      )
    ) {
      throw new Error("Existing LMS cleanup receipt action does not match the canonical plan.");
    }
  }
  return {
    receipt: value as unknown as BetaLmsCleanupReceipt,
    path: paths.receipt,
  };
}

export function readBetaLmsCleanupReceipt(
  projectRoot: string,
  runId: string,
): BetaLmsCleanupReceipt {
  const plan = buildBetaLmsCleanupPlan({
    projectRoot,
    runId,
    acknowledgement: BETA_LMS_CLEANUP_ACK,
    apply: true,
  });
  if (!plan.authorized) {
    const blocker = plan.checks.find((check) => check.status === "block");
    throw new Error(
      blocker?.detail ?? "The provider cleanup plan is not authorized.",
    );
  }
  const existing = readExistingReceipt(path.resolve(projectRoot), plan);
  if (!existing) {
    throw new Error("The release-bound provider cleanup receipt is unavailable.");
  }
  return existing.receipt;
}

function writeReceipt(
  projectRoot: string,
  receipt: BetaLmsCleanupReceipt,
): string {
  const paths = evidencePaths(projectRoot, receipt.runId);
  assertDirectory(paths.directory, "LMS cleanup evidence directory");
  if (canonicalJson(redactForEvidence(receipt)) !== canonicalJson(receipt)) {
    throw new Error("LMS cleanup receipt contains sensitive data.");
  }
  writeCrashAtomicFileExclusive(paths.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
  return paths.receipt;
}

async function inspectExact(
  worker: BetaLmsCleanupProviderWorker,
  action: BetaLmsCleanupPlanAction,
): Promise<BetaLmsCleanupInspection> {
  const inspection = await worker.inspect(action);
  validateInspection(inspection, action);
  return inspection;
}

export async function runBetaLmsCleanup(
  options: RunBetaLmsCleanupOptions,
): Promise<BetaLmsCleanupRunResult> {
  const projectRoot = path.resolve(options.projectRoot);
  let plan: BetaLmsCleanupPlan;
  try {
    plan = buildBetaLmsCleanupPlan(options);
  } catch (error) {
    const runId = validateBetaRunId(options.runId);
    const manifest = readBetaRunManifest(projectRoot, runId);
    return {
      status: "blocked",
      replayed: false,
      network: "none",
      writes: "none",
      plan: {
        runId,
        qaRunId: getBetaQaRunId(runId),
        releaseSha: null,
        stagingUrl: null,
        source: manifest.source,
        resourceNamespace: getBetaQaResourceNamespace(runId),
        planDigest: null,
        actions: [],
        checks: [blockedCheck("cleanup-plan", error)],
        authorized: false,
      },
      actions: [],
      receiptPath: null,
      error: redactText(error instanceof Error ? error.message : String(error)),
    };
  }

  if (!options.apply) {
    return {
      status: plan.authorized ? "dry-run" : "blocked",
      replayed: false,
      network: "none",
      writes: "none",
      plan,
      actions: [],
      receiptPath: null,
      error: plan.authorized ? null : "LMS cleanup dry-run is blocked by its validation checks.",
    };
  }
  if (!plan.authorized || plan.planDigest === null || plan.releaseSha === null || plan.stagingUrl === null) {
    return {
      status: "blocked",
      replayed: false,
      network: "none",
      writes: "none",
      plan,
      actions: [],
      receiptPath: null,
      error: "LMS cleanup is not authorized.",
    };
  }

  const existing = readExistingReceipt(projectRoot, plan);
  if (existing) {
    const completedPaths = evidencePaths(projectRoot, plan.runId);
    removeEvidenceLockAfterCompletedReceipt(completedPaths.lock);
    return {
      status: "pass",
      replayed: true,
      network: "none",
      writes: "none",
      plan,
      actions: existing.receipt.actions,
      receiptPath: existing.path,
      error: null,
    };
  }

  const missingWorker = (["canvas", "google_classroom"] as const).find(
    (provider) => !options.workers?.[provider],
  );
  if (missingWorker) {
    return {
      status: "blocked",
      replayed: false,
      network: "none",
      writes: "none",
      plan,
      actions: [],
      receiptPath: null,
      error: `No provider-owned cleanup worker is configured for ${missingWorker}.`,
    };
  }

  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const paths = evidencePaths(projectRoot, plan.runId);
  if (!existsSync(paths.directory)) mkdirSync(paths.directory);
  assertDirectory(paths.directory, "LMS cleanup evidence directory");
  let cleanupLock: ReturnType<typeof acquireEvidenceLock>;
  try {
    cleanupLock = acquireEvidenceLock(paths.lock, {
      runId: plan.runId,
      planDigest: plan.planDigest,
      startedAt,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
    });
  } catch (error) {
    return {
      status: "blocked",
      replayed: false,
      network: "none",
      writes: "none",
      plan,
      actions: [],
      receiptPath: null,
      error: `LMS cleanup is already locked for this run. ${redactText(error instanceof Error ? error.message : String(error))}`,
    };
  }
  const receipts: BetaLmsCleanupActionReceipt[] = [];
  let providerActionAttempted = false;
  try {
    for (const action of plan.actions) {
      const worker = options.workers?.[action.provider];
      if (!worker) throw new Error(`Provider worker disappeared for ${action.provider}.`);
      const executed = await executeCleanupAction({
        projectRoot,
        plan,
        action,
        worker,
        now,
        onProviderWriteAttempted: () => {
          providerActionAttempted = true;
        },
      });
      providerActionAttempted ||= executed.providerWriteAttempted;
      receipts.push(executed.receipt);
      if (executed.error) throw new Error(executed.error);
    }

    const completedAt = now().toISOString();
    const receipt: BetaLmsCleanupReceipt = {
      schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
      kind: BETA_LMS_CLEANUP_RECEIPT_KIND,
      runId: plan.runId,
      qaRunId: plan.qaRunId,
      releaseSha: plan.releaseSha,
      stagingUrl: plan.stagingUrl,
      source: plan.source,
      resourceNamespace: plan.resourceNamespace,
      planDigest: plan.planDigest,
      status: "pass",
      startedAt,
      completedAt,
      execution: "provider-owned-serial",
      replayed: false,
      actions: receipts,
    };
    const receiptPath = writeReceipt(projectRoot, receipt);
    releaseEvidenceLock(cleanupLock);
    return {
      status: "pass",
      replayed: false,
      network: "provider-owned",
      writes: providerActionAttempted ? "disposable-provider-cleanup" : "none",
      plan,
      actions: receipts,
      receiptPath,
      error: null,
    };
  } catch (error) {
    return {
      status: "blocked",
      replayed: false,
      network: providerActionAttempted ? "provider-owned" : "none",
      writes: providerActionAttempted ? "disposable-provider-cleanup" : "none",
      plan,
      actions: receipts,
      receiptPath: null,
      error: redactText(error instanceof Error ? error.message : String(error)),
    };
  }
}
