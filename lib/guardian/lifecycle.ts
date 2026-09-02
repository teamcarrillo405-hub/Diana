import {
  CHILD_DATA_REGISTRY,
  requiredProcessorCleanupBindings,
  type ChildDataProcessorKey,
  type ChildDataRegistryEntry,
} from "./child-data-registry";
import {
  GUARDIAN_CONSENT_SCOPES,
  hasCurrentGuardianConsentScopeVersions,
  type VersionedGuardianConsentScope,
} from "./contracts";

export const GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION = 1 as const;

export const GUARDIAN_LINK_STATES = [
  "pending_verification",
  "verified",
  "suspended",
  "withdrawn",
  "closed",
] as const;

export type GuardianLinkState = typeof GUARDIAN_LINK_STATES[number];

export const GUARDIAN_VERIFICATION_SESSION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "expired",
  "cancelled",
] as const;

export type GuardianVerificationSessionStatus =
  typeof GUARDIAN_VERIFICATION_SESSION_STATUSES[number];

export type SyntheticGuardianLinkContract = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  linkId: string;
  guardianUserId: string;
  childSubjectId: string;
  verificationSessionId: string;
  state: GuardianLinkState;
  createdAt: string;
  verifiedAt: string | null;
  suspendedAt: string | null;
  withdrawnAt: string | null;
  childAccountEnabled: false;
  directAiEnabled: false;
}>;

export type SyntheticGuardianVerificationSessionContract = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  sessionId: string;
  linkId: string;
  providerKey: string;
  verificationMethod: string;
  status: GuardianVerificationSessionStatus;
  providerReferenceDigest: string;
  webhookEventDigest: string;
  initiatedAt: string;
  verifiedAt: string | null;
  expiresAt: string;
  identityEvidenceStored: false;
}>;

export const GUARDIAN_CONSENT_LIFECYCLE_STATUSES = [
  "active",
  "withdrawn",
  "suspended",
  "expired",
] as const;

export type GuardianConsentLifecycleStatus =
  typeof GUARDIAN_CONSENT_LIFECYCLE_STATUSES[number];

export type SyntheticVersionedGuardianConsentContract = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  consentId: string;
  linkId: string;
  childSubjectId: string;
  noticeVersion: string;
  scopeGrants: readonly VersionedGuardianConsentScope[];
  status: GuardianConsentLifecycleStatus;
  evidenceDigest: string;
  recordedAt: string;
  withdrawnAt: string | null;
  suspendedAt: string | null;
  childAccountEnabled: false;
  directAiEnabled: false;
}>;

export type SyntheticGuardianExportReceipt = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  receiptId: string;
  childSubjectId: string;
  requestedByGuardianUserId: string;
  status: "complete" | "failed";
  registeredEntryKeys: readonly string[];
  manifestDigest: string;
  completedAt: string;
  rawDataEmbedded: false;
}>;

export type SyntheticGuardianWithdrawalReceipt = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  receiptId: string;
  childSubjectId: string;
  requestedByGuardianUserId: string;
  linkId: string;
  consentId: string;
  status: "complete" | "failed" | "pending";
  scopeGrants: readonly VersionedGuardianConsentScope[];
  requestedAt: string;
  completedAt: string | null;
  evidenceDigest: string;
  childAccountEnabled: false;
  directAiEnabled: false;
  rawDataEmbedded: false;
}>;

export type SyntheticProcessorCleanupReceipt = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  receiptId: string;
  childSubjectId: string;
  entryKey: string;
  processorKey: ChildDataProcessorKey;
  status: "complete" | "not_applicable" | "failed" | "pending";
  attemptedAt: string;
  completedAt: string | null;
  evidenceDigest: string;
  rawProviderPayloadStored: false;
}>;

export type SyntheticGuardianDeletionReceipt = Readonly<{
  contractVersion: typeof GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION;
  receiptId: string;
  childSubjectId: string;
  requestedByGuardianUserId: string;
  status: "complete" | "failed" | "pending";
  registeredEntryKeys: readonly string[];
  processorCleanupReceiptIds: readonly string[];
  manifestDigest: string;
  completedAt: string | null;
  rawDataEmbedded: false;
}>;

export type SyntheticGuardianLifecycleFixture = Readonly<{
  fixtureKind: "synthetic";
  link: SyntheticGuardianLinkContract;
  verificationSession: SyntheticGuardianVerificationSessionContract;
  consent: SyntheticVersionedGuardianConsentContract;
  exportReceipt: SyntheticGuardianExportReceipt;
  withdrawalReceipt: SyntheticGuardianWithdrawalReceipt;
  deletionReceipt: SyntheticGuardianDeletionReceipt;
  processorCleanupReceipts: readonly SyntheticProcessorCleanupReceipt[];
}>;

export type SyntheticGuardianLifecycleIssueCode =
  | "fixture_not_synthetic"
  | "invalid_contract_version"
  | "non_synthetic_identifier"
  | "access_enablement_attempt"
  | "subject_mismatch"
  | "guardian_mismatch"
  | "link_not_verified"
  | "link_suspended"
  | "link_withdrawn"
  | "verification_link_mismatch"
  | "verification_not_current"
  | "identity_evidence_retained"
  | "consent_link_mismatch"
  | "consent_not_active"
  | "consent_scope_missing"
  | "consent_scope_version_invalid"
  | "receipt_not_complete"
  | "receipt_registry_coverage_incomplete"
  | "receipt_contains_raw_data"
  | "withdrawal_receipt_mismatch"
  | "withdrawal_receipt_incomplete"
  | "withdrawal_scope_coverage_incomplete"
  | "withdrawal_access_not_blocked"
  | "withdrawal_receipt_contains_raw_data"
  | "invalid_timestamp"
  | "processor_cleanup_missing"
  | "processor_cleanup_incomplete"
  | "processor_cleanup_contains_raw_payload"
  | "invalid_digest";

export type SyntheticGuardianLifecycleIssue = Readonly<{
  code: SyntheticGuardianLifecycleIssueCode;
  value?: string;
}>;

export type SyntheticGuardianLifecycleValidation = Readonly<{
  valid: boolean;
  accountAccess: "blocked";
  directAiAccess: "blocked";
  reasonCode: "guardian_foundation_disabled";
  issues: readonly SyntheticGuardianLifecycleIssue[];
}>;

export function validateSyntheticGuardianLifecycle(
  fixture: SyntheticGuardianLifecycleFixture,
  now: Date,
  registry: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
): SyntheticGuardianLifecycleValidation {
  const issues: SyntheticGuardianLifecycleIssue[] = [];
  const childSubjectId = fixture.link.childSubjectId;
  const guardianUserId = fixture.link.guardianUserId;

  if (fixture.fixtureKind !== "synthetic") {
    issues.push({ code: "fixture_not_synthetic" });
  }
  const versionedContracts = [
    fixture.link,
    fixture.verificationSession,
    fixture.consent,
    fixture.exportReceipt,
    fixture.withdrawalReceipt,
    fixture.deletionReceipt,
    ...fixture.processorCleanupReceipts,
  ];
  if (versionedContracts.some((contract) => (
    contract.contractVersion !== GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION
  ))) {
    issues.push({ code: "invalid_contract_version" });
  }
  if (
    fixture.link.childAccountEnabled !== false
    || fixture.link.directAiEnabled !== false
    || fixture.consent.childAccountEnabled !== false
    || fixture.consent.directAiEnabled !== false
    || fixture.withdrawalReceipt.childAccountEnabled !== false
    || fixture.withdrawalReceipt.directAiEnabled !== false
  ) {
    issues.push({ code: "access_enablement_attempt" });
  }

  validateSyntheticIdentifiers(fixture, issues);

  if (
    fixture.consent.childSubjectId !== childSubjectId
    || fixture.exportReceipt.childSubjectId !== childSubjectId
    || fixture.withdrawalReceipt.childSubjectId !== childSubjectId
    || fixture.deletionReceipt.childSubjectId !== childSubjectId
    || fixture.processorCleanupReceipts.some((receipt) => receipt.childSubjectId !== childSubjectId)
  ) {
    issues.push({ code: "subject_mismatch" });
  }
  if (
    fixture.exportReceipt.requestedByGuardianUserId !== guardianUserId
    || fixture.withdrawalReceipt.requestedByGuardianUserId !== guardianUserId
    || fixture.deletionReceipt.requestedByGuardianUserId !== guardianUserId
  ) {
    issues.push({ code: "guardian_mismatch" });
  }

  if (fixture.link.state === "suspended") {
    issues.push({ code: "link_suspended" });
  } else if (fixture.link.state === "withdrawn") {
    issues.push({ code: "link_withdrawn" });
  } else if (fixture.link.state !== "verified") {
    issues.push({ code: "link_not_verified" });
  }

  if (
    fixture.link.verificationSessionId !== fixture.verificationSession.sessionId
    || fixture.verificationSession.linkId !== fixture.link.linkId
  ) {
    issues.push({ code: "verification_link_mismatch" });
  }
  if (
    fixture.verificationSession.status !== "verified"
    || !isTimestampAtOrBefore(fixture.verificationSession.verifiedAt, now)
    || !isTimestampAfter(fixture.verificationSession.expiresAt, now)
  ) {
    issues.push({ code: "verification_not_current" });
  }
  if (fixture.verificationSession.identityEvidenceStored !== false) {
    issues.push({ code: "identity_evidence_retained" });
  }

  if (
    fixture.consent.linkId !== fixture.link.linkId
    || fixture.consent.childSubjectId !== childSubjectId
  ) {
    issues.push({ code: "consent_link_mismatch" });
  }
  if (fixture.consent.status !== "active") {
    issues.push({ code: "consent_not_active" });
  }
  if (!hasCurrentGuardianConsentScopeVersions(fixture.consent.scopeGrants)) {
    issues.push({ code: "consent_scope_version_invalid" });
  }
  const grantedScopes = new Set(fixture.consent.scopeGrants.map((grant) => grant.scope));
  for (const scope of GUARDIAN_CONSENT_SCOPES) {
    if (!grantedScopes.has(scope)) {
      issues.push({ code: "consent_scope_missing", value: scope });
    }
  }

  validateDigest(fixture.verificationSession.providerReferenceDigest, issues);
  validateDigest(fixture.verificationSession.webhookEventDigest, issues);
  validateDigest(fixture.consent.evidenceDigest, issues);
  validateDigest(fixture.exportReceipt.manifestDigest, issues);
  validateDigest(fixture.withdrawalReceipt.evidenceDigest, issues);
  validateDigest(fixture.deletionReceipt.manifestDigest, issues);

  validateWithdrawalReceipt(fixture, now, issues);

  const registeredEntryKeys = registry.map((entry) => entry.entryKey);
  validateRightsReceipt(
    fixture.exportReceipt.status,
    fixture.exportReceipt.registeredEntryKeys,
    fixture.exportReceipt.rawDataEmbedded,
    registeredEntryKeys,
    issues,
  );
  validateRightsReceipt(
    fixture.deletionReceipt.status,
    fixture.deletionReceipt.registeredEntryKeys,
    fixture.deletionReceipt.rawDataEmbedded,
    registeredEntryKeys,
    issues,
  );

  const cleanupByBinding = new Map<string, SyntheticProcessorCleanupReceipt>();
  for (const receipt of fixture.processorCleanupReceipts) {
    cleanupByBinding.set(`${receipt.entryKey}:${receipt.processorKey}`, receipt);
    validateDigest(receipt.evidenceDigest, issues);
    if (receipt.status !== "complete" && receipt.status !== "not_applicable") {
      issues.push({
        code: "processor_cleanup_incomplete",
        value: `${receipt.entryKey}:${receipt.processorKey}`,
      });
    }
    if (receipt.rawProviderPayloadStored !== false) {
      issues.push({
        code: "processor_cleanup_contains_raw_payload",
        value: `${receipt.entryKey}:${receipt.processorKey}`,
      });
    }
  }

  for (const binding of requiredProcessorCleanupBindings(registry)) {
    const bindingKey = `${binding.entryKey}:${binding.processorKey}`;
    if (!cleanupByBinding.has(bindingKey)) {
      issues.push({ code: "processor_cleanup_missing", value: bindingKey });
    }
  }

  const cleanupReceiptIds = new Set(fixture.processorCleanupReceipts.map((receipt) => receipt.receiptId));
  const deletionCleanupReceiptIds = new Set(fixture.deletionReceipt.processorCleanupReceiptIds);
  for (const receiptId of new Set([...cleanupReceiptIds, ...deletionCleanupReceiptIds])) {
    if (!cleanupReceiptIds.has(receiptId) || !deletionCleanupReceiptIds.has(receiptId)) {
      issues.push({ code: "processor_cleanup_missing", value: receiptId });
    }
  }

  return {
    valid: issues.length === 0,
    accountAccess: "blocked",
    directAiAccess: "blocked",
    reasonCode: "guardian_foundation_disabled",
    issues,
  };
}

function validateSyntheticIdentifiers(
  fixture: SyntheticGuardianLifecycleFixture,
  issues: SyntheticGuardianLifecycleIssue[],
): void {
  const identifiers = [
    fixture.link.linkId,
    fixture.link.guardianUserId,
    fixture.link.childSubjectId,
    fixture.link.verificationSessionId,
    fixture.verificationSession.sessionId,
    fixture.consent.consentId,
    fixture.exportReceipt.receiptId,
    fixture.withdrawalReceipt.receiptId,
    fixture.deletionReceipt.receiptId,
    ...fixture.processorCleanupReceipts.map((receipt) => receipt.receiptId),
  ];

  for (const identifier of identifiers) {
    if (!/^synthetic_[a-z0-9_]+$/u.test(identifier)) {
      issues.push({ code: "non_synthetic_identifier", value: identifier });
    }
  }
}

function validateWithdrawalReceipt(
  fixture: SyntheticGuardianLifecycleFixture,
  now: Date,
  issues: SyntheticGuardianLifecycleIssue[],
): void {
  const receipt = fixture.withdrawalReceipt;
  if (
    receipt.linkId !== fixture.link.linkId
    || receipt.consentId !== fixture.consent.consentId
  ) {
    issues.push({ code: "withdrawal_receipt_mismatch" });
  }
  if (receipt.status !== "complete" || receipt.completedAt === null) {
    issues.push({ code: "withdrawal_receipt_incomplete" });
  }
  if (
    receipt.childAccountEnabled !== false
    || receipt.directAiEnabled !== false
  ) {
    issues.push({ code: "withdrawal_access_not_blocked" });
  }
  if (receipt.rawDataEmbedded !== false) {
    issues.push({ code: "withdrawal_receipt_contains_raw_data" });
  }

  const requestedAt = Date.parse(receipt.requestedAt);
  const completedAt = receipt.completedAt === null
    ? Number.NaN
    : Date.parse(receipt.completedAt);
  if (
    !Number.isFinite(requestedAt)
    || !Number.isFinite(completedAt)
    || completedAt < requestedAt
    || completedAt > now.getTime()
  ) {
    issues.push({ code: "invalid_timestamp", value: receipt.receiptId });
  }

  const scopeVersionsCurrent = hasCurrentGuardianConsentScopeVersions(receipt.scopeGrants);
  const receiptScopes = new Set(receipt.scopeGrants.map((grant) => grant.scope));
  if (
    !scopeVersionsCurrent
    || receiptScopes.size !== GUARDIAN_CONSENT_SCOPES.length
    || GUARDIAN_CONSENT_SCOPES.some((scope) => !receiptScopes.has(scope))
  ) {
    issues.push({ code: "withdrawal_scope_coverage_incomplete" });
  }
}

function validateRightsReceipt(
  status: string,
  receiptEntryKeys: readonly string[],
  rawDataEmbedded: boolean,
  registeredEntryKeys: readonly string[],
  issues: SyntheticGuardianLifecycleIssue[],
): void {
  if (status !== "complete") {
    issues.push({ code: "receipt_not_complete" });
  }
  const receiptKeys = new Set(receiptEntryKeys);
  if (
    receiptKeys.size !== receiptEntryKeys.length
    || registeredEntryKeys.some((entryKey) => !receiptKeys.has(entryKey))
    || receiptEntryKeys.some((entryKey) => !registeredEntryKeys.includes(entryKey))
  ) {
    issues.push({ code: "receipt_registry_coverage_incomplete" });
  }
  if (rawDataEmbedded !== false) {
    issues.push({ code: "receipt_contains_raw_data" });
  }
}

function validateDigest(
  value: string,
  issues: SyntheticGuardianLifecycleIssue[],
): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) {
    issues.push({ code: "invalid_digest", value });
  }
}

function isTimestampAtOrBefore(value: string | null, now: Date): boolean {
  if (value === null) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

function isTimestampAfter(value: string, now: Date): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > now.getTime();
}
