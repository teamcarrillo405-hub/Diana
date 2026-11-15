export const GUARDIAN_FOUNDATION_CONTRACT_VERSION = 1 as const;

export const GUARDIAN_ACCOUNT_STATES = [
  "foundation_disabled",
  "guardian_verification_pending",
  "guardian_verification_recorded",
  "consent_pending",
  "consent_recorded",
  "suspended",
  "consent_revoked",
  "withdrawn",
  "closed",
] as const;

export type GuardianAccountState = typeof GUARDIAN_ACCOUNT_STATES[number];

export const GUARDIAN_CONSENT_SCOPES = [
  "account_request",
  "learning_records",
  "ai_assistance",
  "file_uploads",
  "voice_inputs",
  "saved_audio",
  "wellness",
  "school_integrations",
] as const;

export type GuardianConsentScope = typeof GUARDIAN_CONSENT_SCOPES[number];

export const GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION = 1 as const;

export const GUARDIAN_CONSENT_SCOPE_VERSIONS = Object.freeze({
  account_request: "account_request_v1",
  learning_records: "learning_records_v1",
  ai_assistance: "ai_assistance_v1",
  file_uploads: "file_uploads_v1",
  voice_inputs: "voice_inputs_v1",
  saved_audio: "saved_audio_v1",
  wellness: "wellness_v1",
  school_integrations: "school_integrations_v1",
} as const satisfies Readonly<Record<GuardianConsentScope, string>>);

export type VersionedGuardianConsentScope = Readonly<{
  contractVersion: typeof GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION;
  scope: GuardianConsentScope;
  scopeVersion: string;
}>;

export type GuardianConsentScopeInterface = Readonly<{
  contractVersion: typeof GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION;
  scope: GuardianConsentScope;
  scopeVersion: string;
  defaultDecision: "denied";
  separateDecisionRequired: true;
  collectionEnabled: false;
}>;

export const GUARDIAN_CONSENT_SCOPE_INTERFACES:
readonly GuardianConsentScopeInterface[] = Object.freeze(
  GUARDIAN_CONSENT_SCOPES.map((scope) => Object.freeze({
    contractVersion: GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION,
    scope,
    scopeVersion: GUARDIAN_CONSENT_SCOPE_VERSIONS[scope],
    defaultDecision: "denied" as const,
    separateDecisionRequired: true as const,
    collectionEnabled: false as const,
  })),
);

export function versionGuardianConsentScopes(
  scopes: readonly GuardianConsentScope[],
): readonly VersionedGuardianConsentScope[] {
  if (new Set(scopes).size !== scopes.length) {
    throw new Error("guardian consent scopes cannot contain duplicates");
  }

  return Object.freeze(scopes.map((scope) => Object.freeze({
    contractVersion: GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION,
    scope,
    scopeVersion: GUARDIAN_CONSENT_SCOPE_VERSIONS[scope],
  })));
}

export function hasCurrentGuardianConsentScopeVersions(
  grants: readonly VersionedGuardianConsentScope[],
): boolean {
  if (new Set(grants.map((grant) => grant.scope)).size !== grants.length) {
    return false;
  }

  return grants.every((grant) => (
    grant.contractVersion === GUARDIAN_CONSENT_SCOPE_CONTRACT_VERSION
    && GUARDIAN_CONSENT_SCOPES.includes(grant.scope)
    && grant.scopeVersion === GUARDIAN_CONSENT_SCOPE_VERSIONS[grant.scope]
  ));
}

export const GUARDIAN_FOUNDATION_POLICY = Object.freeze({
  contractVersion: GUARDIAN_FOUNDATION_CONTRACT_VERSION,
  enabled: false,
  childAccountsEnabled: false,
  directAiEnabled: false,
} as const);

export type GuardianAccountContractV1 = Readonly<{
  contractVersion: typeof GUARDIAN_FOUNDATION_CONTRACT_VERSION;
  requestId: string;
  guardianUserId: string;
  childSubjectId: string;
  state: GuardianAccountState;
  childAccountEnabled: false;
  directAiEnabled: false;
  createdAt: string;
  updatedAt: string;
}>;

export type GuardianAccountContract = GuardianAccountContractV1;

export type GuardianFoundationAccessDecision = Readonly<{
  state: GuardianAccountState;
  accountAccess: "blocked";
  directAiAccess: "blocked";
  reasonCode: "guardian_foundation_disabled";
}>;

export function guardianFoundationAccessForState(
  state: GuardianAccountState,
): GuardianFoundationAccessDecision {
  return {
    state,
    accountAccess: "blocked",
    directAiAccess: "blocked",
    reasonCode: "guardian_foundation_disabled",
  };
}

export const VPC_PROVIDER_CONTRACT_VERSION = 1 as const;

export type VPCProvider = Readonly<{
  contractVersion: typeof VPC_PROVIDER_CONTRACT_VERSION;
  providerKey: string;
  adapterKey: string;
  status: "disabled";
  verificationMethods: readonly string[];
}>;

export function createDisabledVPCProvider(input: {
  providerKey: string;
  adapterKey: string;
  verificationMethods?: readonly string[];
}): VPCProvider {
  assertContractKey(input.providerKey, "providerKey");
  assertContractKey(input.adapterKey, "adapterKey");

  const methods = [...new Set(input.verificationMethods ?? [])];
  if (methods.some((method) => method.trim().length === 0)) {
    throw new Error("verificationMethods cannot contain blank values");
  }

  return Object.freeze({
    contractVersion: VPC_PROVIDER_CONTRACT_VERSION,
    providerKey: input.providerKey,
    adapterKey: input.adapterKey,
    status: "disabled" as const,
    verificationMethods: Object.freeze(methods),
  });
}

export const GUARDIAN_CONSENT_CONTRACT_VERSION = 1 as const;

export const GUARDIAN_CONSENT_STATUSES = [
  "recorded",
  "suspended",
  "revoked",
  "withdrawn",
  "expired",
] as const;

export type GuardianConsentStatus = typeof GUARDIAN_CONSENT_STATUSES[number];

export type GuardianConsentRecordV1 = Readonly<{
  contractVersion: typeof GUARDIAN_CONSENT_CONTRACT_VERSION;
  consentId: string;
  guardianAccountRequestId: string;
  childSubjectId: string;
  providerKey: string;
  noticeVersion: string;
  scopes: readonly GuardianConsentScope[];
  scopeGrants: readonly VersionedGuardianConsentScope[];
  status: GuardianConsentStatus;
  evidenceDigest: string;
  recordedAt: string;
  suspendedAt: string | null;
  revokedAt: string | null;
  withdrawnAt: string | null;
  childAccountEnabled: false;
  directAiEnabled: false;
}>;

export type GuardianConsentContractV1 = GuardianConsentRecordV1;

export type GuardianConsentContract = GuardianConsentContractV1;

export const GUARDIAN_AUDIT_CONTRACT_VERSION = 1 as const;

export const GUARDIAN_AUDIT_EVENT_TYPES = [
  "foundation_status_checked",
  "account_request_blocked",
  "verification_result_recorded",
  "consent_recorded",
  "consent_suspended",
  "consent_revoked",
  "consent_withdrawn",
  "registry_validated",
] as const;

export type GuardianAuditEventType = typeof GUARDIAN_AUDIT_EVENT_TYPES[number];

export type GuardianAuditActorKind = "guardian" | "service" | "operator";

export type GuardianAuditEventV1 = Readonly<{
  contractVersion: typeof GUARDIAN_AUDIT_CONTRACT_VERSION;
  eventId: string;
  guardianAccountRequestId: string | null;
  consentId: string | null;
  eventType: GuardianAuditEventType;
  actorKind: GuardianAuditActorKind;
  actorUserId: string | null;
  reasonCode: string;
  eventDigest: string;
  previousEventDigest: string | null;
  occurredAt: string;
  childAccountEnabled: false;
  directAiEnabled: false;
}>;

export type GuardianAuditContractV1 = GuardianAuditEventV1;

export type GuardianAuditContract = GuardianAuditContractV1;

function assertContractKey(value: string, field: string): void {
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/u.test(value)) {
    throw new Error(`${field} must be a lowercase contract key`);
  }
}
