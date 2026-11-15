import { describe, expect, it } from "vitest";

import {
  GUARDIAN_ACCOUNT_STATES,
  GUARDIAN_AUDIT_CONTRACT_VERSION,
  GUARDIAN_CONSENT_CONTRACT_VERSION,
  GUARDIAN_CONSENT_SCOPES,
  GUARDIAN_CONSENT_SCOPE_INTERFACES,
  GUARDIAN_CONSENT_SCOPE_VERSIONS,
  GUARDIAN_FOUNDATION_POLICY,
  VPC_PROVIDER_CONTRACT_VERSION,
  createDisabledVPCProvider,
  guardianFoundationAccessForState,
  hasCurrentGuardianConsentScopeVersions,
  versionGuardianConsentScopes,
  type GuardianAuditContract,
  type GuardianConsentContract,
} from "./contracts";

describe("guardian foundation contracts", () => {
  it("keeps every guardian account state blocked from child account and AI access", () => {
    expect(GUARDIAN_ACCOUNT_STATES).toEqual([
      "foundation_disabled",
      "guardian_verification_pending",
      "guardian_verification_recorded",
      "consent_pending",
      "consent_recorded",
      "suspended",
      "consent_revoked",
      "withdrawn",
      "closed",
    ]);
    expect(GUARDIAN_ACCOUNT_STATES).not.toContain("active");
    expect(GUARDIAN_ACCOUNT_STATES).not.toContain("enabled");

    for (const state of GUARDIAN_ACCOUNT_STATES) {
      expect(guardianFoundationAccessForState(state)).toEqual({
        state,
        accountAccess: "blocked",
        directAiAccess: "blocked",
        reasonCode: "guardian_foundation_disabled",
      });
    }

    expect(GUARDIAN_FOUNDATION_POLICY).toEqual({
      contractVersion: 1,
      enabled: false,
      childAccountsEnabled: false,
      directAiEnabled: false,
    });
  });

  it("defines explicit technical consent scopes without changing access", () => {
    expect(GUARDIAN_CONSENT_SCOPES).toEqual([
      "account_request",
      "learning_records",
      "ai_assistance",
      "file_uploads",
      "voice_inputs",
      "saved_audio",
      "wellness",
      "school_integrations",
    ]);

    const consent = {
      contractVersion: GUARDIAN_CONSENT_CONTRACT_VERSION,
      consentId: "consent-1",
      guardianAccountRequestId: "request-1",
      childSubjectId: "subject-1",
      providerKey: "provider_placeholder",
      noticeVersion: "notice-v1",
      scopes: ["account_request"],
      scopeGrants: versionGuardianConsentScopes(["account_request"]),
      status: "recorded",
      evidenceDigest: "a".repeat(64),
      recordedAt: "2026-08-30T00:00:00.000Z",
      suspendedAt: null,
      revokedAt: null,
      withdrawnAt: null,
      childAccountEnabled: false,
      directAiEnabled: false,
    } as const satisfies GuardianConsentContract;

    expect(consent.contractVersion).toBe(1);
    expect(consent.childAccountEnabled).toBe(false);
    expect(consent.directAiEnabled).toBe(false);
  });

  it("binds every consent scope to an explicit current version", () => {
    const grants = versionGuardianConsentScopes(GUARDIAN_CONSENT_SCOPES);

    expect(grants).toHaveLength(GUARDIAN_CONSENT_SCOPES.length);
    expect(grants.map((grant) => [grant.scope, grant.scopeVersion])).toEqual(
      GUARDIAN_CONSENT_SCOPES.map((scope) => [
        scope,
        GUARDIAN_CONSENT_SCOPE_VERSIONS[scope],
      ]),
    );
    expect(hasCurrentGuardianConsentScopeVersions(grants)).toBe(true);
    expect(GUARDIAN_CONSENT_SCOPE_INTERFACES).toEqual(
      GUARDIAN_CONSENT_SCOPES.map((scope) => ({
        contractVersion: 1,
        scope,
        scopeVersion: GUARDIAN_CONSENT_SCOPE_VERSIONS[scope],
        defaultDecision: "denied",
        separateDecisionRequired: true,
        collectionEnabled: false,
      })),
    );
    expect(hasCurrentGuardianConsentScopeVersions([
      { ...grants[0], scopeVersion: "account_request_v0" },
    ])).toBe(false);
    expect(() => versionGuardianConsentScopes([
      "account_request",
      "account_request",
    ])).toThrow("guardian consent scopes cannot contain duplicates");
  });

  it("creates only disabled provider adapter descriptors", () => {
    const provider = createDisabledVPCProvider({
      providerKey: "provider_placeholder",
      adapterKey: "adapter_placeholder",
      verificationMethods: ["method_a", "method_a"],
    });

    expect(provider).toEqual({
      contractVersion: VPC_PROVIDER_CONTRACT_VERSION,
      providerKey: "provider_placeholder",
      adapterKey: "adapter_placeholder",
      status: "disabled",
      verificationMethods: ["method_a"],
    });
    expect(Object.isFrozen(provider)).toBe(true);
    expect(() => createDisabledVPCProvider({
      providerKey: "Vendor Name",
      adapterKey: "adapter_placeholder",
    })).toThrow("providerKey must be a lowercase contract key");
  });

  it("versions audit events and carries forward the hard access denials", () => {
    const event = {
      contractVersion: GUARDIAN_AUDIT_CONTRACT_VERSION,
      eventId: "event-1",
      guardianAccountRequestId: null,
      consentId: null,
      eventType: "foundation_status_checked",
      actorKind: "service",
      actorUserId: null,
      reasonCode: "guardian_foundation_disabled",
      eventDigest: "b".repeat(64),
      previousEventDigest: null,
      occurredAt: "2026-08-30T00:00:00.000Z",
      childAccountEnabled: false,
      directAiEnabled: false,
    } as const satisfies GuardianAuditContract;

    expect(event.contractVersion).toBe(1);
    expect(event.childAccountEnabled).toBe(false);
    expect(event.directAiEnabled).toBe(false);
  });
});
