export const UNDER_13_RELEASE_GATE_CONTRACT_VERSION = 1 as const;

export const UNDER_13_EXTERNAL_GATE_REQUIREMENTS = Object.freeze([
  { gateId: "legal", reviewerRole: "qualified_privacy_counsel" },
  { gateId: "privacy", reviewerRole: "privacy_program_owner" },
  { gateId: "provider", reviewerRole: "provider_risk_owner" },
  { gateId: "penetration", reviewerRole: "independent_penetration_tester" },
  { gateId: "deletion", reviewerRole: "deletion_operations_owner" },
] as const);

export type Under13ExternalGateId =
  typeof UNDER_13_EXTERNAL_GATE_REQUIREMENTS[number]["gateId"];

export const UNDER_13_TECHNICAL_GATE_IDS = [
  "signup_denial",
  "authenticated_app_denial",
  "database_denial",
  "ai_denial",
  "registry_coverage",
  "processor_readiness",
  "synthetic_export_receipt",
  "synthetic_withdrawal_receipt",
  "synthetic_deletion_receipt",
] as const;

export type Under13TechnicalGateId = typeof UNDER_13_TECHNICAL_GATE_IDS[number];

export type Under13ExternalGateReceipt = Readonly<{
  contractVersion: typeof UNDER_13_RELEASE_GATE_CONTRACT_VERSION;
  gateId: Under13ExternalGateId;
  status: "pass" | "block";
  releaseSha: string;
  evidenceDigest: string;
  issuedAt: string;
  expiresAt: string;
  reviewerRole: string;
  signatureVerified: boolean;
  sensitiveDataExcluded: true;
}>;

export type Under13ReleaseGateInput = Readonly<{
  releaseProfile: string;
  releaseSha: string;
  foundationHardDisabled: boolean;
  technicalEvidence: Readonly<Record<Under13TechnicalGateId, boolean>>;
  externalReceipts: readonly Under13ExternalGateReceipt[];
}>;

export type Under13ReleaseGateIssue = Readonly<{
  code:
    | "release_profile_not_under_13_candidate"
    | "invalid_release_sha"
    | "foundation_lock_missing"
    | "technical_gate_missing"
    | "external_gate_missing"
    | "external_gate_duplicate"
    | "external_gate_invalid";
  gateId?: Under13TechnicalGateId | Under13ExternalGateId;
}>;

export type Under13ReleaseGateDecision = Readonly<{
  state: "blocked" | "activation_code_review_required";
  childAccountsEnabled: false;
  directAiEnabled: false;
  issues: readonly Under13ReleaseGateIssue[];
}>;

export type Beta13PlusAgeBoundary = Readonly<{
  minimumAccountAge: 13;
  under13AccountsEnabled: false;
  under13DirectAiEnabled: false;
  guardianFoundation: "disabled";
  under13ReleaseGateContractVersion: typeof UNDER_13_RELEASE_GATE_CONTRACT_VERSION;
}>;

export function assertBeta13PlusReleaseBoundary(value: unknown): asserts value is {
  profile: "web-pwa-13-plus";
  ageBoundary: Beta13PlusAgeBoundary;
} {
  if (!isRecord(value) || value.profile !== "web-pwa-13-plus") {
    throw new Error("The beta release profile must remain web-pwa-13-plus.");
  }
  const boundary = value.ageBoundary;
  if (!isRecord(boundary)) {
    throw new Error("The beta release manifest must declare its age boundary.");
  }
  const keys = Object.keys(boundary).sort();
  const expectedKeys = [
    "guardianFoundation",
    "minimumAccountAge",
    "under13AccountsEnabled",
    "under13DirectAiEnabled",
    "under13ReleaseGateContractVersion",
  ].sort();
  if (
    JSON.stringify(keys) !== JSON.stringify(expectedKeys)
    || boundary.minimumAccountAge !== 13
    || boundary.under13AccountsEnabled !== false
    || boundary.under13DirectAiEnabled !== false
    || boundary.guardianFoundation !== "disabled"
    || boundary.under13ReleaseGateContractVersion
      !== UNDER_13_RELEASE_GATE_CONTRACT_VERSION
  ) {
    throw new Error("The beta release manifest attempted to weaken the under-13 boundary.");
  }
}

export function evaluateUnder13ReleaseGate(
  input: Under13ReleaseGateInput,
  now: Date = new Date(),
): Under13ReleaseGateDecision {
  const issues: Under13ReleaseGateIssue[] = [];
  if (input.releaseProfile !== "under-13-candidate") {
    issues.push({ code: "release_profile_not_under_13_candidate" });
  }
  if (!/^[a-f0-9]{40}$/u.test(input.releaseSha)) {
    issues.push({ code: "invalid_release_sha" });
  }
  if (!input.foundationHardDisabled) {
    issues.push({ code: "foundation_lock_missing" });
  }

  for (const gateId of UNDER_13_TECHNICAL_GATE_IDS) {
    if (input.technicalEvidence[gateId] !== true) {
      issues.push({ code: "technical_gate_missing", gateId });
    }
  }

  for (const requirement of UNDER_13_EXTERNAL_GATE_REQUIREMENTS) {
    const receipts = input.externalReceipts.filter((receipt) => (
      receipt.gateId === requirement.gateId
    ));
    if (receipts.length === 0) {
      issues.push({ code: "external_gate_missing", gateId: requirement.gateId });
      continue;
    }
    if (receipts.length !== 1) {
      issues.push({ code: "external_gate_duplicate", gateId: requirement.gateId });
      continue;
    }
    if (!externalReceiptIsCurrent(
      receipts[0],
      requirement.reviewerRole,
      input.releaseSha,
      now,
    )) {
      issues.push({ code: "external_gate_invalid", gateId: requirement.gateId });
    }
  }

  return {
    state: issues.length === 0 ? "activation_code_review_required" : "blocked",
    childAccountsEnabled: false,
    directAiEnabled: false,
    issues,
  };
}

function externalReceiptIsCurrent(
  receipt: Under13ExternalGateReceipt,
  reviewerRole: string,
  releaseSha: string,
  now: Date,
): boolean {
  const issuedAt = Date.parse(receipt.issuedAt);
  const expiresAt = Date.parse(receipt.expiresAt);
  return receipt.contractVersion === UNDER_13_RELEASE_GATE_CONTRACT_VERSION
    && receipt.status === "pass"
    && receipt.releaseSha === releaseSha
    && /^[a-f0-9]{64}$/u.test(receipt.evidenceDigest)
    && Number.isFinite(issuedAt)
    && Number.isFinite(expiresAt)
    && issuedAt <= now.getTime()
    && expiresAt > now.getTime()
    && receipt.reviewerRole === reviewerRole
    && receipt.signatureVerified === true
    && receipt.sensitiveDataExcluded === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
