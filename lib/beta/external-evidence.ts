import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  assertBetaFreshEvidenceTimestamp,
} from "./attestations";
import {
  getBetaCertificationInputDirectory,
  readBetaCertificationReceipt,
  type BetaCertificationCheck,
  type BetaCertificationReceipt,
} from "./certifications";
import { getBetaQaResourceNamespace, getBetaQaRunId } from "./qa-resources";
import { redactForEvidence } from "./redaction";
import { validateBetaReleaseSha, validateBetaStagingUrl } from "./release-validation";
import { validateBetaRunId } from "./run-id";

export const BETA_EXTERNAL_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const BETA_EXTERNAL_EVIDENCE_KIND = "diana-beta-external-evidence" as const;
export const BETA_EXTERNAL_EVIDENCE_TEMPLATE_KIND =
  "diana-beta-external-evidence-template" as const;

export const BETA_EXTERNAL_EVIDENCE_TYPES = [
  "ios-device",
  "android-device",
  "chromebook-device",
  "database-restore",
  "alerts-ready",
  "authenticated-browser",
  "managed-voice-disabled",
  "soak-72h",
] as const;

export type BetaExternalEvidenceType =
  (typeof BETA_EXTERNAL_EVIDENCE_TYPES)[number];
export type BetaExternalEvidenceStatus = "pass" | "block";

export interface BetaExternalEvidence {
  schemaVersion: typeof BETA_EXTERNAL_EVIDENCE_SCHEMA_VERSION;
  kind: typeof BETA_EXTERNAL_EVIDENCE_KIND;
  evidenceType: BetaExternalEvidenceType;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  url: string;
  status: BetaExternalEvidenceStatus;
  observedAt: string;
  sensitiveDataExcluded: true;
  details: unknown;
}

export interface BetaExternalEvidenceTemplate {
  schemaVersion: typeof BETA_EXTERNAL_EVIDENCE_SCHEMA_VERSION;
  kind: typeof BETA_EXTERNAL_EVIDENCE_TEMPLATE_KIND;
  evidenceType: BetaExternalEvidenceType;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  url: string;
  status: "block";
  observedAt: null;
  sensitiveDataExcluded: true;
  details: Record<string, unknown>;
}

export interface BetaExternalEvidenceExpectation {
  runId: string;
  releaseSha: string;
  url: string;
  evidenceType: BetaExternalEvidenceType;
  now?: Date;
}

export interface BetaValidatedExternalEvidence {
  receipt: BetaCertificationReceipt;
  evidence: BetaExternalEvidence;
}

interface DetailValidation {
  passing: boolean;
  latestTimestamp: string;
  timestamps: string[];
}

interface EvidenceCheck {
  id: string;
  status: BetaExternalEvidenceStatus;
  evidenceId: string;
}

interface EvidenceIdRegistry {
  ids: Set<string>;
  artifactSha256: Set<string>;
}

const EVIDENCE_TYPE_TO_CERTIFICATION = {
  "ios-device": "ios-device",
  "android-device": "android-device",
  "chromebook-device": "chromebook-device",
  "database-restore": "database-restore",
  "alerts-ready": "alerts-ready",
  "authenticated-browser": "browser",
  "managed-voice-disabled": "managed-voice-disabled",
  "soak-72h": "soak-72h",
} as const satisfies Record<BetaExternalEvidenceType, BetaCertificationCheck>;

const PHYSICAL_DEVICE_CHECKS = [
  "login",
  "today-navigation",
  "assignment-workspace",
  "ask-diana",
  "realtime-voice",
  "file-upload",
  "touch-or-pen",
  "save-reopen",
  "submission-review",
  "sign-out",
] as const;

const DATABASE_RESTORE_CHECKS = [
  "backup-readable",
  "schema-current",
  "row-counts-reconciled",
  "rls-enforced",
  "storage-references-valid",
  "application-smoke",
  "cleanup-confirmed",
] as const;

const OPERATION_OWNER_FUNCTIONS = [
  "student-record-incidents",
  "account-deletion-requests",
  "ai-provider-failures",
  "launch-day-monitoring",
] as const;

const ALERT_CHECKS = [
  "cross-student-access",
  "lost-work",
  "submission-ambiguity",
  "ai-availability",
  "authentication-errors",
] as const;

const INCIDENT_DRILL_CHECKS = [
  "alert-fired",
  "owner-acknowledged",
  "student-data-protected",
  "provider-state-reconciled",
  "postmortem-recorded",
] as const;

const AUTHENTICATED_BROWSER_CHECKS = [
  "login",
  "today",
  "work",
  "assignment-workspace",
  "ask-diana",
  "realtime-voice",
  "file-upload",
  "save-reopen",
  "sign-out",
] as const;

const MANAGED_VOICE_CHECKS = [
  "deployment-configuration",
  "managed-worker-route",
  "web-realtime-route",
  "session-cleanup",
] as const;

const INCIDENT_SCENARIOS = [
  "uncertain-provider-write",
  "cross-student-access",
  "lost-work",
  "provider-outage",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const wanted = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertText(value: unknown, label: string, maxLength = 160): asserts value is string {
  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    value.length < 2 ||
    value.length > maxLength ||
    /[\r\n\u0000-\u001f]/u.test(value)
  ) {
    throw new Error(`${label} must be concise non-empty text.`);
  }
}

function assertIdentifier(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9:._-]{1,127}$/u.test(value)
  ) {
    throw new Error(`${label} must be a stable non-secret identifier.`);
  }
}

function assertSha256(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest.`);
  }
}

export function createBetaExternalEvidenceId(
  checkId: string,
  artifactSha256: string,
): string {
  assertIdentifier(checkId, "External evidence check ID");
  assertSha256(artifactSha256, "External evidence artifact digest");
  return `${checkId}:sha256:${artifactSha256}`;
}

function assertBoundEvidenceId(
  value: unknown,
  label: string,
  checkId: string,
  registry: EvidenceIdRegistry,
): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${label} must bind its check to a SHA-256-addressed artifact.`);
  }
  const prefix = `${checkId}:sha256:`;
  const artifactSha256 = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  if (!/^[a-f0-9]{64}$/u.test(artifactSha256)) {
    throw new Error(
      `${label} must bind check ${checkId} to a concrete SHA-256-addressed artifact.`,
    );
  }
  if (registry.ids.has(value) || registry.artifactSha256.has(artifactSha256)) {
    throw new Error(
      "External evidence IDs and artifact digests must be unique per concrete check.",
    );
  }
  registry.ids.add(value);
  registry.artifactSha256.add(artifactSha256);
}

function assertIsoTimestamp(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be an explicit ISO timestamp.`);
  }
}

function timestamp(value: string): number {
  return Date.parse(value);
}

function assertOrderedTimestamps(
  values: readonly { label: string; value: unknown }[],
): string[] {
  const result = values.map(({ label, value }) => {
    assertIsoTimestamp(value, label);
    return value;
  });
  for (let index = 1; index < result.length; index += 1) {
    if (timestamp(result[index]!) < timestamp(result[index - 1]!)) {
      throw new Error(`${values[index]!.label} cannot precede ${values[index - 1]!.label}.`);
    }
  }
  return result;
}

function maxTimestamp(values: readonly string[]): string {
  return values.reduce((latest, candidate) =>
    timestamp(candidate) > timestamp(latest) ? candidate : latest);
}

function assertFixedChecks(
  value: unknown,
  expectedIds: readonly string[],
  label: string,
  evidenceIds: EvidenceIdRegistry,
): { checks: EvidenceCheck[]; passing: boolean } {
  if (!Array.isArray(value) || value.length !== expectedIds.length) {
    throw new Error(`${label} must contain every fixed check exactly once.`);
  }
  const checks = value.map((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`${label}[${index}] must be an object.`);
    assertExactKeys(candidate, ["id", "status", "evidenceId"], `${label}[${index}]`);
    if (
      candidate.id !== expectedIds[index] ||
      !["pass", "block"].includes(String(candidate.status))
    ) {
      throw new Error(`${label} must preserve the fixed order and valid status values.`);
    }
    assertBoundEvidenceId(
      candidate.evidenceId,
      `${label}[${index}].evidenceId`,
      expectedIds[index]!,
      evidenceIds,
    );
    return candidate as unknown as EvidenceCheck;
  });
  return { checks, passing: checks.every((check) => check.status === "pass") };
}

function checkTemplate(ids: readonly string[]): Record<string, unknown>[] {
  return ids.map((id) => ({ id, status: null, evidenceId: null }));
}

function physicalDeviceTemplate(evidenceType: BetaExternalEvidenceType) {
  const identity = evidenceType === "ios-device"
    ? { deviceClass: "ios-phone", osName: "iOS", browserName: "Safari" }
    : evidenceType === "android-device"
      ? { deviceClass: "android-phone", osName: "Android", browserName: "Chrome" }
      : { deviceClass: "managed-chromebook", osName: "ChromeOS", browserName: "Chrome" };
  return {
    ...identity,
    hardwareModel: null,
    osVersion: null,
    browserVersion: null,
    testerId: null,
    testMatrixVersion: null,
    startedAt: null,
    completedAt: null,
    checks: checkTemplate(PHYSICAL_DEVICE_CHECKS),
  };
}

function databaseRestoreTemplate() {
  return {
    backupId: null,
    restoreTarget: "disposable-staging",
    procedureVersion: null,
    startedAt: null,
    completedAt: null,
    checks: checkTemplate(DATABASE_RESTORE_CHECKS),
  };
}

function alertsReadyTemplate() {
  return {
    owners: OPERATION_OWNER_FUNCTIONS.map((operation) => ({
      operation,
      primaryOwnerId: null,
      backupOwnerId: null,
      contactPath: null,
      acceptedAt: null,
    })),
    alerts: checkTemplate(ALERT_CHECKS),
    alertsVerifiedAt: null,
    incidentDrill: {
      drillId: null,
      scenario: null,
      procedureVersion: null,
      startedAt: null,
      detectedAt: null,
      acknowledgedAt: null,
      resolvedAt: null,
      outcome: null,
      checks: checkTemplate(INCIDENT_DRILL_CHECKS),
    },
  };
}

function authenticatedBrowserTemplate(runId: string, releaseSha: string, url: string) {
  const namespace = getBetaQaResourceNamespace(runId);
  return {
    accountKind: "synthetic-staging-student",
    accountId: `${namespace}-student`,
    browserProfileId: `${namespace}-browser`,
    authMethod: null,
    observedReleaseSha: releaseSha,
    observedUrl: url,
    startedAt: null,
    completedAt: null,
    sessionDestroyedAt: null,
    checks: checkTemplate(AUTHENTICATED_BROWSER_CHECKS),
  };
}

function managedVoiceTemplate(releaseSha: string, url: string) {
  return {
    observedReleaseSha: releaseSha,
    observedUrl: url,
    configurationSha256: null,
    inspectedAt: null,
    managedWorkerEnabled: null,
    managedWorkerReachable: null,
    webRealtimeEnabled: null,
    checks: checkTemplate(MANAGED_VOICE_CHECKS),
  };
}

function soakTemplate(releaseSha: string, url: string) {
  return {
    startedAt: null,
    completedAt: null,
    releaseShaAtStart: releaseSha,
    releaseShaAtEnd: releaseSha,
    urlAtStart: url,
    urlAtEnd: url,
    monitoringCheckCount: null,
    deploymentsDuringWindow: null,
    p0Incidents: null,
    p1Incidents: null,
    unresolvedAlerts: null,
    checkpoints: ["start", "24h", "48h", "end"].map((phase) => ({
      phase,
      observedAt: null,
      releaseSha,
      url,
      status: null,
      evidenceId: null,
    })),
  };
}

export function createBetaExternalEvidenceTemplate(input: {
  evidenceType: BetaExternalEvidenceType;
  runId: string;
  releaseSha: string;
  url: string;
}): BetaExternalEvidenceTemplate {
  if (!BETA_EXTERNAL_EVIDENCE_TYPES.includes(input.evidenceType as BetaExternalEvidenceType)) {
    throw new Error("External evidence type is not supported.");
  }
  const runId = validateBetaRunId(input.runId);
  const releaseSha = validateBetaReleaseSha(input.releaseSha);
  const url = validateBetaStagingUrl(input.url);
  let details: Record<string, unknown>;
  if (["ios-device", "android-device", "chromebook-device"].includes(input.evidenceType)) {
    details = physicalDeviceTemplate(input.evidenceType);
  } else if (input.evidenceType === "database-restore") {
    details = databaseRestoreTemplate();
  } else if (input.evidenceType === "alerts-ready") {
    details = alertsReadyTemplate();
  } else if (input.evidenceType === "authenticated-browser") {
    details = authenticatedBrowserTemplate(runId, releaseSha, url);
  } else if (input.evidenceType === "managed-voice-disabled") {
    details = managedVoiceTemplate(releaseSha, url);
  } else {
    details = soakTemplate(releaseSha, url);
  }
  return {
    schemaVersion: BETA_EXTERNAL_EVIDENCE_SCHEMA_VERSION,
    kind: BETA_EXTERNAL_EVIDENCE_TEMPLATE_KIND,
    evidenceType: input.evidenceType,
    runId,
    qaRunId: getBetaQaRunId(runId),
    releaseSha,
    url,
    status: "block",
    observedAt: null,
    sensitiveDataExcluded: true,
    details,
  };
}

function validatePhysicalDevice(
  evidenceType: BetaExternalEvidenceType,
  value: unknown,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Physical-device details must be an object.");
  assertExactKeys(value, [
    "deviceClass",
    "hardwareModel",
    "osName",
    "osVersion",
    "browserName",
    "browserVersion",
    "testerId",
    "testMatrixVersion",
    "startedAt",
    "completedAt",
    "checks",
  ], "Physical-device details");
  const expected = evidenceType === "ios-device"
    ? ["ios-phone", "iOS", "Safari"]
    : evidenceType === "android-device"
      ? ["android-phone", "Android", "Chrome"]
      : ["managed-chromebook", "ChromeOS", "Chrome"];
  if (
    value.deviceClass !== expected[0] ||
    value.osName !== expected[1] ||
    value.browserName !== expected[2]
  ) {
    throw new Error("Physical-device identity does not match its evidence type.");
  }
  assertText(value.hardwareModel, "physicalDevice.hardwareModel");
  assertText(value.osVersion, "physicalDevice.osVersion", 80);
  assertText(value.browserVersion, "physicalDevice.browserVersion", 80);
  assertIdentifier(value.testerId, "physicalDevice.testerId");
  assertIdentifier(value.testMatrixVersion, "physicalDevice.testMatrixVersion");
  const [startedAt, completedAt] = assertOrderedTimestamps([
    { label: "physicalDevice.startedAt", value: value.startedAt },
    { label: "physicalDevice.completedAt", value: value.completedAt },
  ]);
  if (timestamp(completedAt!) === timestamp(startedAt!)) {
    throw new Error("Physical-device validation must have a non-zero observed interval.");
  }
  const checks = assertFixedChecks(
    value.checks,
    PHYSICAL_DEVICE_CHECKS,
    "physicalDevice.checks",
    evidenceIds,
  );
  return {
    passing: checks.passing,
    latestTimestamp: completedAt!,
    timestamps: [startedAt!, completedAt!],
  };
}

function validateDatabaseRestore(
  value: unknown,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Database-restore details must be an object.");
  assertExactKeys(value, [
    "backupId",
    "restoreTarget",
    "procedureVersion",
    "startedAt",
    "completedAt",
    "checks",
  ], "Database-restore details");
  assertIdentifier(value.backupId, "databaseRestore.backupId");
  if (value.restoreTarget !== "disposable-staging") {
    throw new Error("Database restore must target a disposable staging environment.");
  }
  assertIdentifier(value.procedureVersion, "databaseRestore.procedureVersion");
  const [startedAt, completedAt] = assertOrderedTimestamps([
    { label: "databaseRestore.startedAt", value: value.startedAt },
    { label: "databaseRestore.completedAt", value: value.completedAt },
  ]);
  if (timestamp(completedAt!) === timestamp(startedAt!)) {
    throw new Error("Database restore must have a non-zero observed interval.");
  }
  const checks = assertFixedChecks(
    value.checks,
    DATABASE_RESTORE_CHECKS,
    "databaseRestore.checks",
    evidenceIds,
  );
  return {
    passing: checks.passing,
    latestTimestamp: completedAt!,
    timestamps: [startedAt!, completedAt!],
  };
}

export function assertBetaAlertOwnerEvidence(value: unknown): void {
  if (!Array.isArray(value) || value.length !== OPERATION_OWNER_FUNCTIONS.length) {
    throw new Error("Alert-owner evidence must name every fixed operational function.");
  }
  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`alertOwners[${index}] must be an object.`);
    assertExactKeys(candidate, [
      "operation",
      "primaryOwnerId",
      "backupOwnerId",
      "contactPath",
      "acceptedAt",
    ], `alertOwners[${index}]`);
    if (candidate.operation !== OPERATION_OWNER_FUNCTIONS[index]) {
      throw new Error("Alert owners must preserve every fixed operational function in order.");
    }
    assertIdentifier(candidate.primaryOwnerId, `alertOwners[${index}].primaryOwnerId`);
    assertIdentifier(candidate.backupOwnerId, `alertOwners[${index}].backupOwnerId`);
    if (candidate.primaryOwnerId === candidate.backupOwnerId) {
      throw new Error("Primary and backup operational owners must be different.");
    }
    assertText(candidate.contactPath, `alertOwners[${index}].contactPath`);
    assertIsoTimestamp(candidate.acceptedAt, `alertOwners[${index}].acceptedAt`);
  });
}

function validateBetaIncidentDrillEvidence(
  value: unknown,
  evidenceIds: EvidenceIdRegistry,
): { passing: boolean; timestamps: string[] } {
  if (!isRecord(value)) throw new Error("Incident-drill evidence must be an object.");
  assertExactKeys(value, [
    "drillId",
    "scenario",
    "procedureVersion",
    "startedAt",
    "detectedAt",
    "acknowledgedAt",
    "resolvedAt",
    "outcome",
    "checks",
  ], "Incident-drill evidence");
  assertIdentifier(value.drillId, "incidentDrill.drillId");
  if (!INCIDENT_SCENARIOS.includes(value.scenario as (typeof INCIDENT_SCENARIOS)[number])) {
    throw new Error("Incident-drill scenario is not one of the fixed beta scenarios.");
  }
  assertIdentifier(value.procedureVersion, "incidentDrill.procedureVersion");
  const timestamps = assertOrderedTimestamps([
    { label: "incidentDrill.startedAt", value: value.startedAt },
    { label: "incidentDrill.detectedAt", value: value.detectedAt },
    { label: "incidentDrill.acknowledgedAt", value: value.acknowledgedAt },
    { label: "incidentDrill.resolvedAt", value: value.resolvedAt },
  ]);
  const [startedAt, , , resolvedAt] = timestamps;
  if (timestamp(resolvedAt!) === timestamp(startedAt!)) {
    throw new Error("Incident drill must have a non-zero observed interval.");
  }
  if (!["pass", "block"].includes(String(value.outcome))) {
    throw new Error("Incident-drill outcome must be pass or block.");
  }
  const checks = assertFixedChecks(
    value.checks,
    INCIDENT_DRILL_CHECKS,
    "incidentDrill.checks",
    evidenceIds,
  );
  return {
    passing: value.outcome === "pass" && checks.passing,
    timestamps,
  };
}

export function assertBetaIncidentDrillEvidence(value: unknown): void {
  validateBetaIncidentDrillEvidence(value, {
    ids: new Set(),
    artifactSha256: new Set(),
  });
}

function validateAlertsReady(
  value: unknown,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Alerts-ready details must be an object.");
  assertExactKeys(
    value,
    ["owners", "alerts", "alertsVerifiedAt", "incidentDrill"],
    "Alerts-ready details",
  );
  assertBetaAlertOwnerEvidence(value.owners);
  const ownerTimes = (value.owners as Record<string, unknown>[])
    .map((owner) => owner.acceptedAt as string);
  const alerts = assertFixedChecks(
    value.alerts,
    ALERT_CHECKS,
    "alertsReady.alerts",
    evidenceIds,
  );
  assertIsoTimestamp(value.alertsVerifiedAt, "alertsReady.alertsVerifiedAt");
  const drillValidation = validateBetaIncidentDrillEvidence(
    value.incidentDrill,
    evidenceIds,
  );
  const timestamps = [
    ...ownerTimes,
    value.alertsVerifiedAt,
    ...drillValidation.timestamps,
  ];
  return {
    passing: alerts.passing && drillValidation.passing,
    latestTimestamp: maxTimestamp(timestamps),
    timestamps,
  };
}

function validateAuthenticatedBrowser(
  value: unknown,
  expected: BetaExternalEvidenceExpectation,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Authenticated-browser details must be an object.");
  assertExactKeys(value, [
    "accountKind",
    "accountId",
    "browserProfileId",
    "authMethod",
    "observedReleaseSha",
    "observedUrl",
    "startedAt",
    "completedAt",
    "sessionDestroyedAt",
    "checks",
  ], "Authenticated-browser details");
  const namespace = getBetaQaResourceNamespace(expected.runId);
  if (
    value.accountKind !== "synthetic-staging-student" ||
    value.accountId !== `${namespace}-student` ||
    value.browserProfileId !== `${namespace}-browser`
  ) {
    throw new Error("Authenticated-browser evidence must use the run-owned synthetic account and profile.");
  }
  if (!["email-password", "google-oauth"].includes(String(value.authMethod))) {
    throw new Error("Authenticated-browser auth method is invalid.");
  }
  if (value.observedReleaseSha !== expected.releaseSha || value.observedUrl !== expected.url) {
    throw new Error("Authenticated-browser evidence is not bound to the requested source and preview.");
  }
  const [startedAt, completedAt, sessionDestroyedAt] = assertOrderedTimestamps([
    { label: "authenticatedBrowser.startedAt", value: value.startedAt },
    { label: "authenticatedBrowser.completedAt", value: value.completedAt },
    { label: "authenticatedBrowser.sessionDestroyedAt", value: value.sessionDestroyedAt },
  ]);
  if (timestamp(completedAt!) === timestamp(startedAt!)) {
    throw new Error("Authenticated-browser validation must have a non-zero observed interval.");
  }
  const checks = assertFixedChecks(
    value.checks,
    AUTHENTICATED_BROWSER_CHECKS,
    "authenticatedBrowser.checks",
    evidenceIds,
  );
  return {
    passing: checks.passing,
    latestTimestamp: sessionDestroyedAt!,
    timestamps: [startedAt!, completedAt!, sessionDestroyedAt!],
  };
}

function validateManagedVoice(
  value: unknown,
  expected: BetaExternalEvidenceExpectation,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Managed-voice details must be an object.");
  assertExactKeys(value, [
    "observedReleaseSha",
    "observedUrl",
    "configurationSha256",
    "inspectedAt",
    "managedWorkerEnabled",
    "managedWorkerReachable",
    "webRealtimeEnabled",
    "checks",
  ], "Managed-voice details");
  if (value.observedReleaseSha !== expected.releaseSha || value.observedUrl !== expected.url) {
    throw new Error("Managed-voice evidence is not bound to the requested source and preview.");
  }
  assertSha256(value.configurationSha256, "managedVoice.configurationSha256");
  assertIsoTimestamp(value.inspectedAt, "managedVoice.inspectedAt");
  if (
    typeof value.managedWorkerEnabled !== "boolean" ||
    typeof value.managedWorkerReachable !== "boolean" ||
    typeof value.webRealtimeEnabled !== "boolean"
  ) {
    throw new Error("Managed-voice deployment states must be explicit booleans.");
  }
  const checks = assertFixedChecks(
    value.checks,
    MANAGED_VOICE_CHECKS,
    "managedVoice.checks",
    evidenceIds,
  );
  return {
    passing:
      value.managedWorkerEnabled === false &&
      value.managedWorkerReachable === false &&
      value.webRealtimeEnabled === true &&
      checks.passing,
    latestTimestamp: value.inspectedAt,
    timestamps: [value.inspectedAt],
  };
}

function validateSoak(
  value: unknown,
  expected: BetaExternalEvidenceExpectation,
  evidenceIds: EvidenceIdRegistry,
): DetailValidation {
  if (!isRecord(value)) throw new Error("Soak details must be an object.");
  assertExactKeys(value, [
    "startedAt",
    "completedAt",
    "releaseShaAtStart",
    "releaseShaAtEnd",
    "urlAtStart",
    "urlAtEnd",
    "monitoringCheckCount",
    "deploymentsDuringWindow",
    "p0Incidents",
    "p1Incidents",
    "unresolvedAlerts",
    "checkpoints",
  ], "Soak details");
  const [startedAt, completedAt] = assertOrderedTimestamps([
    { label: "soak.startedAt", value: value.startedAt },
    { label: "soak.completedAt", value: value.completedAt },
  ]);
  const minimumDuration = 72 * 60 * 60 * 1000;
  if (timestamp(completedAt!) - timestamp(startedAt!) < minimumDuration) {
    throw new Error("Staging soak must contain at least 72 observed hours.");
  }
  if (
    value.releaseShaAtStart !== expected.releaseSha ||
    value.releaseShaAtEnd !== expected.releaseSha ||
    value.urlAtStart !== expected.url ||
    value.urlAtEnd !== expected.url
  ) {
    throw new Error("Soak evidence is not bound to one unchanged source and preview.");
  }
  for (const [field, minimum] of [
    ["monitoringCheckCount", 72],
    ["deploymentsDuringWindow", 0],
    ["p0Incidents", 0],
    ["p1Incidents", 0],
    ["unresolvedAlerts", 0],
  ] as const) {
    if (!Number.isSafeInteger(value[field]) || Number(value[field]) < minimum) {
      throw new Error(`soak.${field} must be an explicit non-negative integer.`);
    }
  }
  if (!Array.isArray(value.checkpoints) || value.checkpoints.length !== 4) {
    throw new Error("Soak evidence must contain the four fixed checkpoints.");
  }
  const phases = ["start", "24h", "48h", "end"] as const;
  const checkpointTimes = value.checkpoints.map((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`soak.checkpoints[${index}] must be an object.`);
    assertExactKeys(candidate, [
      "phase",
      "observedAt",
      "releaseSha",
      "url",
      "status",
      "evidenceId",
    ], `soak.checkpoints[${index}]`);
    if (
      candidate.phase !== phases[index] ||
      candidate.releaseSha !== expected.releaseSha ||
      candidate.url !== expected.url ||
      !["pass", "block"].includes(String(candidate.status))
    ) {
      throw new Error("Soak checkpoints must preserve fixed phases, source, preview, and status.");
    }
    assertIsoTimestamp(candidate.observedAt, `soak.checkpoints[${index}].observedAt`);
    assertBoundEvidenceId(
      candidate.evidenceId,
      `soak.checkpoints[${index}].evidenceId`,
      `checkpoint-${phases[index]}`,
      evidenceIds,
    );
    return candidate.observedAt;
  });
  assertOrderedTimestamps(checkpointTimes.map((value, index) => ({
    label: `soak.checkpoints[${index}].observedAt`,
    value,
  })));
  const thresholds = [0, 24, 48, 72].map((hours) =>
    timestamp(startedAt!) + hours * 60 * 60 * 1000);
  checkpointTimes.forEach((candidate, index) => {
    const observed = timestamp(candidate);
    const upperBound = index === 0
      ? thresholds[0]!
      : index < 3
        ? thresholds[index + 1]!
        : timestamp(completedAt!);
    if (
      observed < thresholds[index]! ||
      observed > timestamp(completedAt!) ||
      (index > 0 && index < 3 && observed >= upperBound)
    ) {
      throw new Error(`Soak checkpoint ${phases[index]} is outside its required observation window.`);
    }
  });
  if (
    timestamp(checkpointTimes[0]!) !== timestamp(startedAt!) ||
    timestamp(checkpointTimes[3]!) !== timestamp(completedAt!)
  ) {
    throw new Error("Soak start and end checkpoints must equal the recorded soak boundaries.");
  }
  const passing =
    Number(value.monitoringCheckCount) >= 72 &&
    value.deploymentsDuringWindow === 0 &&
    value.p0Incidents === 0 &&
    value.p1Incidents === 0 &&
    value.unresolvedAlerts === 0 &&
    value.checkpoints.every((checkpoint) =>
      isRecord(checkpoint) && checkpoint.status === "pass");
  return {
    passing,
    latestTimestamp: completedAt!,
    timestamps: [startedAt!, completedAt!, ...checkpointTimes],
  };
}

function validateDetails(
  evidence: BetaExternalEvidence,
  expected: BetaExternalEvidenceExpectation,
): DetailValidation {
  const evidenceIds: EvidenceIdRegistry = {
    ids: new Set(),
    artifactSha256: new Set(),
  };
  if (["ios-device", "android-device", "chromebook-device"].includes(evidence.evidenceType)) {
    return validatePhysicalDevice(evidence.evidenceType, evidence.details, evidenceIds);
  }
  if (evidence.evidenceType === "database-restore") {
    return validateDatabaseRestore(evidence.details, evidenceIds);
  }
  if (evidence.evidenceType === "alerts-ready") {
    return validateAlertsReady(evidence.details, evidenceIds);
  }
  if (evidence.evidenceType === "authenticated-browser") {
    return validateAuthenticatedBrowser(evidence.details, expected, evidenceIds);
  }
  if (evidence.evidenceType === "managed-voice-disabled") {
    return validateManagedVoice(evidence.details, expected, evidenceIds);
  }
  return validateSoak(evidence.details, expected, evidenceIds);
}

export function assertBetaExternalEvidence(
  value: unknown,
  expected: BetaExternalEvidenceExpectation,
): asserts value is BetaExternalEvidence {
  if (!BETA_EXTERNAL_EVIDENCE_TYPES.includes(expected.evidenceType as BetaExternalEvidenceType)) {
    throw new Error("External evidence type is not supported.");
  }
  if (!isRecord(value)) throw new Error("External evidence must be an object.");
  assertExactKeys(value, [
    "schemaVersion",
    "kind",
    "evidenceType",
    "runId",
    "qaRunId",
    "releaseSha",
    "url",
    "status",
    "observedAt",
    "sensitiveDataExcluded",
    "details",
  ], "External evidence");
  const runId = validateBetaRunId(expected.runId);
  const releaseSha = validateBetaReleaseSha(expected.releaseSha);
  const url = validateBetaStagingUrl(expected.url);
  if (
    value.schemaVersion !== BETA_EXTERNAL_EVIDENCE_SCHEMA_VERSION ||
    value.kind !== BETA_EXTERNAL_EVIDENCE_KIND ||
    value.evidenceType !== expected.evidenceType ||
    value.runId !== runId ||
    value.qaRunId !== getBetaQaRunId(runId) ||
    value.releaseSha !== releaseSha ||
    value.url !== url ||
    !["pass", "block"].includes(String(value.status)) ||
    value.sensitiveDataExcluded !== true
  ) {
    throw new Error("External evidence does not match the requested run, source, or preview.");
  }
  const validationTime = expected.now ?? new Date();
  assertBetaFreshEvidenceTimestamp(
    value.observedAt,
    "externalEvidence.observedAt",
    validationTime,
  );
  if (JSON.stringify(redactForEvidence(value)) !== JSON.stringify(value)) {
    throw new Error("External evidence contains unredacted sensitive data.");
  }
  const evidence = value as unknown as BetaExternalEvidence;
  const detail = validateDetails(evidence, {
    ...expected,
    runId,
    releaseSha,
    url,
  });
  for (const [index, detailTimestamp] of detail.timestamps.entries()) {
    assertBetaFreshEvidenceTimestamp(
      detailTimestamp,
      `externalEvidence.detailTimestamp[${index}]`,
      validationTime,
    );
  }
  if (timestamp(evidence.observedAt) < timestamp(detail.latestTimestamp)) {
    throw new Error("External evidence observation cannot precede its latest recorded check.");
  }
  if (evidence.status === "pass" && !detail.passing) {
    throw new Error("External evidence cannot pass while a required check or invariant blocks.");
  }
}

function readBoundEvidence(
  projectRootInput: string,
  receipt: BetaCertificationReceipt,
): unknown {
  const projectRoot = path.resolve(projectRootInput);
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, receipt.runId);
  const evidencePath = path.resolve(
    inputDirectory,
    ...receipt.evidence.relativePath.split("/"),
  );
  if (!evidencePath.startsWith(`${inputDirectory}${path.sep}`) || !existsSync(evidencePath)) {
    throw new Error("Signed external evidence is unavailable or escaped its fixed directory.");
  }
  const stats = lstatSync(evidencePath);
  if (
    stats.isSymbolicLink()
    || !stats.isFile()
    || stats.size !== receipt.evidence.byteCount
  ) {
    throw new Error("Signed external evidence must be a regular file.");
  }
  const bytes = readFileSync(evidencePath);
  if (createHash("sha256").update(bytes).digest("hex") !== receipt.evidence.sha256) {
    throw new Error("Signed external evidence changed after receipt validation.");
  }
  try {
    return JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("Signed external evidence must contain valid JSON.");
  }
}

export function readAndValidateSignedBetaExternalEvidence(input: {
  projectRoot: string;
  runId: string;
  releaseSha: string;
  url: string;
  evidenceType: BetaExternalEvidenceType;
  now?: Date;
}): BetaValidatedExternalEvidence {
  if (!BETA_EXTERNAL_EVIDENCE_TYPES.includes(input.evidenceType as BetaExternalEvidenceType)) {
    throw new Error("External evidence type is not supported.");
  }
  const expected: BetaExternalEvidenceExpectation = {
    runId: validateBetaRunId(input.runId),
    releaseSha: validateBetaReleaseSha(input.releaseSha),
    url: validateBetaStagingUrl(input.url),
    evidenceType: input.evidenceType,
    now: input.now,
  };
  const check = EVIDENCE_TYPE_TO_CERTIFICATION[input.evidenceType];
  const receipt = readBetaCertificationReceipt(
    input.projectRoot,
    expected.runId,
    check,
    expected.releaseSha,
    expected.url,
    { now: input.now },
  );
  if (receipt.status !== "pass") {
    throw new Error("The signed certification receipt blocks this external evidence.");
  }
  const value = readBoundEvidence(input.projectRoot, receipt);
  assertBetaExternalEvidence(value, expected);
  if (value.status !== "pass") {
    throw new Error("The signed external evidence does not record a passing result.");
  }
  if (timestamp(receipt.issuedAt) < timestamp(value.observedAt)) {
    throw new Error("The certification receipt cannot predate the external observation.");
  }
  return { receipt, evidence: value };
}
