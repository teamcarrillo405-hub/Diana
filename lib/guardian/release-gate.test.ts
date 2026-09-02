import { describe, expect, it } from "vitest";

import {
  UNDER_13_EXTERNAL_GATE_REQUIREMENTS,
  UNDER_13_RELEASE_GATE_CONTRACT_VERSION,
  UNDER_13_TECHNICAL_GATE_IDS,
  assertBeta13PlusReleaseBoundary,
  evaluateUnder13ReleaseGate,
  type Under13ExternalGateReceipt,
  type Under13TechnicalGateId,
} from "./release-gate";

const RELEASE_SHA = "a".repeat(40);
const NOW = new Date("2026-09-01T12:00:00.000Z");
const COMPLETE_TECHNICAL_EVIDENCE = Object.fromEntries(
  UNDER_13_TECHNICAL_GATE_IDS.map((gateId) => [gateId, true]),
) as Record<Under13TechnicalGateId, boolean>;

describe("under-13 release gate", () => {
  it("locks the first beta manifest to age 13+ with child access disabled", () => {
    const manifest = {
      profile: "web-pwa-13-plus",
      ageBoundary: {
        minimumAccountAge: 13,
        under13AccountsEnabled: false,
        under13DirectAiEnabled: false,
        guardianFoundation: "disabled",
        under13ReleaseGateContractVersion: 1,
      },
    };

    expect(() => assertBeta13PlusReleaseBoundary(manifest)).not.toThrow();
    expect(() => assertBeta13PlusReleaseBoundary({
      ...manifest,
      ageBoundary: { ...manifest.ageBoundary, under13AccountsEnabled: true },
    })).toThrow("attempted to weaken the under-13 boundary");
  });

  it("requires every legal, privacy, provider, penetration, and deletion receipt", () => {
    const decision = evaluateUnder13ReleaseGate({
      releaseProfile: "under-13-candidate",
      releaseSha: RELEASE_SHA,
      foundationHardDisabled: true,
      technicalEvidence: COMPLETE_TECHNICAL_EVIDENCE,
      externalReceipts: [],
    }, NOW);

    expect(decision.state).toBe("blocked");
    expect(decision.childAccountsEnabled).toBe(false);
    expect(decision.directAiEnabled).toBe(false);
    expect(decision.issues).toEqual(
      UNDER_13_EXTERNAL_GATE_REQUIREMENTS.map(({ gateId }) => ({
        code: "external_gate_missing",
        gateId,
      })),
    );
  });

  it("never enables access even after every prerequisite receipt validates", () => {
    const decision = evaluateUnder13ReleaseGate({
      releaseProfile: "under-13-candidate",
      releaseSha: RELEASE_SHA,
      foundationHardDisabled: true,
      technicalEvidence: COMPLETE_TECHNICAL_EVIDENCE,
      externalReceipts: completeExternalReceipts(),
    }, NOW);

    expect(decision).toEqual({
      state: "activation_code_review_required",
      childAccountsEnabled: false,
      directAiEnabled: false,
      issues: [],
    });
  });

  it("blocks stale, unsigned, release-mismatched, and incomplete evidence", () => {
    const receipts = completeExternalReceipts();
    const decision = evaluateUnder13ReleaseGate({
      releaseProfile: "under-13-candidate",
      releaseSha: RELEASE_SHA,
      foundationHardDisabled: true,
      technicalEvidence: {
        ...COMPLETE_TECHNICAL_EVIDENCE,
        synthetic_deletion_receipt: false,
      },
      externalReceipts: receipts.map((receipt) => (
        receipt.gateId === "provider"
          ? { ...receipt, releaseSha: "b".repeat(40), signatureVerified: false }
          : receipt
      )),
    }, NOW);

    expect(decision.state).toBe("blocked");
    expect(decision.issues).toEqual(expect.arrayContaining([
      { code: "technical_gate_missing", gateId: "synthetic_deletion_receipt" },
      { code: "external_gate_invalid", gateId: "provider" },
    ]));
  });
});

function completeExternalReceipts(): Under13ExternalGateReceipt[] {
  return UNDER_13_EXTERNAL_GATE_REQUIREMENTS.map(({ gateId, reviewerRole }) => ({
    contractVersion: UNDER_13_RELEASE_GATE_CONTRACT_VERSION,
    gateId,
    status: "pass",
    releaseSha: RELEASE_SHA,
    evidenceDigest: "b".repeat(64),
    issuedAt: "2026-08-31T12:00:00.000Z",
    expiresAt: "2026-10-01T12:00:00.000Z",
    reviewerRole,
    signatureVerified: true,
    sensitiveDataExcluded: true,
  }));
}
