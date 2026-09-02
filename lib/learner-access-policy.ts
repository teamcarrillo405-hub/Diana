import type { AgeBracket } from "@/lib/age";

export const TEEN_GUARDIAN_PERMISSION_POLICY_VERSION = "teen_openai_beta_v1" as const;

export const TEEN_GUARDIAN_PERMISSION_SOURCES = [
  "signup_attestation",
  "profile_center_attestation",
  "synthetic_qa_fixture",
] as const;

export type TeenGuardianPermissionSource =
  (typeof TEEN_GUARDIAN_PERMISSION_SOURCES)[number];

export type TeenGuardianPermissionRecord = {
  age_bracket?: unknown;
  consent_ai?: unknown;
  teen_guardian_permission_attested_at?: unknown;
  teen_guardian_permission_policy_version?: unknown;
  teen_guardian_permission_source?: unknown;
  teen_guardian_permission_withdrawn_at?: unknown;
};

export const DIANA_CONTENT_LEVELS = [
  "middle_school",
  "high_school",
  "college",
  "advanced_independent_study",
] as const;

export type DianaContentLevel = typeof DIANA_CONTENT_LEVELS[number];

export type LearnerAccessDecision = {
  contentCoverage: "supported";
  accountAccess: "allowed" | "requires_verified_guardian_workflow";
  directAiAccess:
    | "allowed"
    | "requires_parent_guardian_permission"
    | "requires_verified_guardian_workflow";
  reason: string | null;
};

export function isTeenGuardianPermissionSource(
  value: unknown,
): value is TeenGuardianPermissionSource {
  return typeof value === "string"
    && TEEN_GUARDIAN_PERMISSION_SOURCES.some((source) => source === value);
}

export function hasCurrentTeenGuardianPermission(
  record: TeenGuardianPermissionRecord,
  now: Date = new Date(),
): boolean {
  const attestedAt = record.teen_guardian_permission_attested_at;
  if (typeof attestedAt !== "string") return false;

  const attestedAtMs = Date.parse(attestedAt);
  if (!Number.isFinite(attestedAtMs) || attestedAtMs > now.getTime()) return false;

  return record.teen_guardian_permission_policy_version
      === TEEN_GUARDIAN_PERMISSION_POLICY_VERSION
    && isTeenGuardianPermissionSource(record.teen_guardian_permission_source)
    && record.teen_guardian_permission_withdrawn_at == null;
}

/**
 * Curriculum coverage is independent from account eligibility. Diana can
 * scaffold middle-school content without permitting an unverified under-13
 * account to use student AI routes.
 */
export function learnerAccessForAgeBracket(bracket: AgeBracket): LearnerAccessDecision {
  if (bracket === "under_13") {
    return {
      contentCoverage: "supported",
      accountAccess: "requires_verified_guardian_workflow",
      directAiAccess: "requires_verified_guardian_workflow",
      reason: "Diana does not yet have a verified guardian-consent workflow for students under 13.",
    };
  }
  if (bracket === "13_to_17") {
    return {
      contentCoverage: "supported",
      accountAccess: "allowed",
      directAiAccess: "requires_parent_guardian_permission",
      reason: "A parent or guardian must give permission for a teen to use the 13+ AI beta.",
    };
  }
  return {
    contentCoverage: "supported",
    accountAccess: "allowed",
    directAiAccess: "allowed",
    reason: null,
  };
}
