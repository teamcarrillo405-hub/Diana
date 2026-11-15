import { describe, expect, it } from "vitest";

import {
  CHILD_DATA_REGISTRY,
  requiredProcessorCleanupBindings,
} from "./child-data-registry";
import {
  GUARDIAN_CONSENT_SCOPES,
  versionGuardianConsentScopes,
} from "./contracts";
import {
  GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
  validateSyntheticGuardianLifecycle,
  type SyntheticGuardianLifecycleFixture,
} from "./lifecycle";

const NOW = new Date("2026-08-31T12:00:00.000Z");
const DIGEST = "a".repeat(64);

describe("synthetic guardian lifecycle contracts", () => {
  it("covers links, verification, versioned scopes, rights receipts, and processor cleanup", () => {
    const fixture = completeSyntheticFixture();
    const validation = validateSyntheticGuardianLifecycle(fixture, NOW);

    expect(validation).toEqual({
      valid: true,
      accountAccess: "blocked",
      directAiAccess: "blocked",
      reasonCode: "guardian_foundation_disabled",
      issues: [],
    });
    expect(fixture.verificationSession.identityEvidenceStored).toBe(false);
    expect(fixture.exportReceipt.rawDataEmbedded).toBe(false);
    expect(fixture.withdrawalReceipt).toEqual(expect.objectContaining({
      status: "complete",
      childAccountEnabled: false,
      directAiEnabled: false,
      rawDataEmbedded: false,
    }));
    expect(fixture.deletionReceipt.rawDataEmbedded).toBe(false);
    expect(fixture.processorCleanupReceipts.every((receipt) => (
      receipt.rawProviderPayloadStored === false
    ))).toBe(true);
  });

  it("blocks suspended and withdrawn guardian relationships", () => {
    const fixture = completeSyntheticFixture();
    const suspended = validateSyntheticGuardianLifecycle({
      ...fixture,
      link: {
        ...fixture.link,
        state: "suspended",
        suspendedAt: "2026-08-30T12:00:00.000Z",
      },
      consent: {
        ...fixture.consent,
        status: "suspended",
        suspendedAt: "2026-08-30T12:00:00.000Z",
      },
    }, NOW);

    expect(suspended.valid).toBe(false);
    expect(suspended.issues).toEqual(expect.arrayContaining([
      { code: "link_suspended" },
      { code: "consent_not_active" },
    ]));
    expect(suspended.accountAccess).toBe("blocked");
    expect(suspended.directAiAccess).toBe("blocked");

    const withdrawn = validateSyntheticGuardianLifecycle({
      ...fixture,
      link: {
        ...fixture.link,
        state: "withdrawn",
        withdrawnAt: "2026-08-30T12:00:00.000Z",
      },
      consent: {
        ...fixture.consent,
        status: "withdrawn",
        withdrawnAt: "2026-08-30T12:00:00.000Z",
      },
    }, NOW);
    expect(withdrawn.issues).toEqual(expect.arrayContaining([
      { code: "link_withdrawn" },
      { code: "consent_not_active" },
    ]));
  });

  it("fails a drill for expired verification, stale scopes, missing registry rows, or cleanup gaps", () => {
    const fixture = completeSyntheticFixture();
    const incomplete = validateSyntheticGuardianLifecycle({
      ...fixture,
      verificationSession: {
        ...fixture.verificationSession,
        expiresAt: "2026-08-30T12:00:00.000Z",
      },
      consent: {
        ...fixture.consent,
        scopeGrants: fixture.consent.scopeGrants.map((grant, index) => (
          index === 0 ? { ...grant, scopeVersion: "account_request_v0" } : grant
        )),
      },
      exportReceipt: {
        ...fixture.exportReceipt,
        registeredEntryKeys: fixture.exportReceipt.registeredEntryKeys.slice(1),
      },
      withdrawalReceipt: {
        ...fixture.withdrawalReceipt,
        status: "pending",
        scopeGrants: fixture.withdrawalReceipt.scopeGrants.slice(1),
        completedAt: null,
      },
      processorCleanupReceipts: fixture.processorCleanupReceipts.slice(1),
    }, NOW);

    expect(incomplete.valid).toBe(false);
    expect(incomplete.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "verification_not_current",
      "consent_scope_version_invalid",
      "receipt_registry_coverage_incomplete",
      "withdrawal_receipt_incomplete",
      "withdrawal_scope_coverage_incomplete",
      "invalid_timestamp",
      "processor_cleanup_missing",
    ]));
  });

  it("rejects real-looking identifiers and any retained identity or provider payload", () => {
    const fixture = completeSyntheticFixture();
    const unsafe = validateSyntheticGuardianLifecycle({
      ...fixture,
      fixtureKind: "production",
      link: {
        ...fixture.link,
        contractVersion: 2,
        guardianUserId: "real-user-id",
        childAccountEnabled: true,
      },
      verificationSession: {
        ...fixture.verificationSession,
        identityEvidenceStored: true,
      },
      processorCleanupReceipts: [{
        ...fixture.processorCleanupReceipts[0],
        rawProviderPayloadStored: true,
      }, ...fixture.processorCleanupReceipts.slice(1)],
    } as unknown as SyntheticGuardianLifecycleFixture, NOW);

    expect(unsafe.issues).toEqual(expect.arrayContaining([
      { code: "fixture_not_synthetic" },
      { code: "invalid_contract_version" },
      { code: "non_synthetic_identifier", value: "real-user-id" },
      { code: "access_enablement_attempt" },
      { code: "identity_evidence_retained" },
      {
        code: "processor_cleanup_contains_raw_payload",
        value: `${fixture.processorCleanupReceipts[0].entryKey}:${fixture.processorCleanupReceipts[0].processorKey}`,
      },
    ]));
  });
});

function completeSyntheticFixture(): SyntheticGuardianLifecycleFixture {
  const processorCleanupReceipts = requiredProcessorCleanupBindings().map((binding, index) => ({
    contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
    receiptId: `synthetic_cleanup_${index}`,
    childSubjectId: "synthetic_child_1",
    entryKey: binding.entryKey,
    processorKey: binding.processorKey,
    status: "complete" as const,
    attemptedAt: "2026-08-31T10:00:00.000Z",
    completedAt: "2026-08-31T10:01:00.000Z",
    evidenceDigest: DIGEST,
    rawProviderPayloadStored: false as const,
  }));
  const registeredEntryKeys = CHILD_DATA_REGISTRY.map((entry) => entry.entryKey);

  return {
    fixtureKind: "synthetic",
    link: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      linkId: "synthetic_link_1",
      guardianUserId: "synthetic_guardian_1",
      childSubjectId: "synthetic_child_1",
      verificationSessionId: "synthetic_verification_1",
      state: "verified",
      createdAt: "2026-08-30T09:00:00.000Z",
      verifiedAt: "2026-08-30T09:05:00.000Z",
      suspendedAt: null,
      withdrawnAt: null,
      childAccountEnabled: false,
      directAiEnabled: false,
    },
    verificationSession: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      sessionId: "synthetic_verification_1",
      linkId: "synthetic_link_1",
      providerKey: "synthetic_vpc_provider",
      verificationMethod: "synthetic_method",
      status: "verified",
      providerReferenceDigest: DIGEST,
      webhookEventDigest: DIGEST,
      initiatedAt: "2026-08-30T09:00:00.000Z",
      verifiedAt: "2026-08-30T09:05:00.000Z",
      expiresAt: "2026-09-30T09:05:00.000Z",
      identityEvidenceStored: false,
    },
    consent: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      consentId: "synthetic_consent_1",
      linkId: "synthetic_link_1",
      childSubjectId: "synthetic_child_1",
      noticeVersion: "synthetic_notice_v1",
      scopeGrants: versionGuardianConsentScopes(GUARDIAN_CONSENT_SCOPES),
      status: "active",
      evidenceDigest: DIGEST,
      recordedAt: "2026-08-30T09:10:00.000Z",
      withdrawnAt: null,
      suspendedAt: null,
      childAccountEnabled: false,
      directAiEnabled: false,
    },
    exportReceipt: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      receiptId: "synthetic_export_1",
      childSubjectId: "synthetic_child_1",
      requestedByGuardianUserId: "synthetic_guardian_1",
      status: "complete",
      registeredEntryKeys,
      manifestDigest: DIGEST,
      completedAt: "2026-08-31T10:00:00.000Z",
      rawDataEmbedded: false,
    },
    withdrawalReceipt: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      receiptId: "synthetic_withdrawal_1",
      childSubjectId: "synthetic_child_1",
      requestedByGuardianUserId: "synthetic_guardian_1",
      linkId: "synthetic_link_1",
      consentId: "synthetic_consent_1",
      status: "complete",
      scopeGrants: versionGuardianConsentScopes(GUARDIAN_CONSENT_SCOPES),
      requestedAt: "2026-08-31T09:00:00.000Z",
      completedAt: "2026-08-31T09:01:00.000Z",
      evidenceDigest: DIGEST,
      childAccountEnabled: false,
      directAiEnabled: false,
      rawDataEmbedded: false,
    },
    deletionReceipt: {
      contractVersion: GUARDIAN_SYNTHETIC_LIFECYCLE_CONTRACT_VERSION,
      receiptId: "synthetic_deletion_1",
      childSubjectId: "synthetic_child_1",
      requestedByGuardianUserId: "synthetic_guardian_1",
      status: "complete",
      registeredEntryKeys,
      processorCleanupReceiptIds: processorCleanupReceipts.map((receipt) => receipt.receiptId),
      manifestDigest: DIGEST,
      completedAt: "2026-08-31T10:02:00.000Z",
      rawDataEmbedded: false,
    },
    processorCleanupReceipts,
  };
}
