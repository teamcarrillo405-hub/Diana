export const TEEN_GUARDIAN_PERMISSION_POLICY_VERSION = "teen_openai_beta_v1";

const TEEN_GUARDIAN_PERMISSION_SOURCES = new Set([
  "signup_attestation",
  "profile_center_attestation",
  "synthetic_qa_fixture",
]);

export type ProfileEligibility = {
  age_bracket?: unknown;
  consent_ai?: unknown;
  teen_guardian_permission_attested_at?: unknown;
  teen_guardian_permission_policy_version?: unknown;
  teen_guardian_permission_source?: unknown;
  teen_guardian_permission_withdrawn_at?: unknown;
};

export type EligibilityResult =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | "under_13"
        | "age_bracket_invalid"
        | "guardian_permission_required"
        | "ai_consent_required";
    };

export function hasCurrentTeenGuardianPermission(
  profile: ProfileEligibility,
  nowMs: number = Date.now(),
): boolean {
  const attestedAt = profile.teen_guardian_permission_attested_at;
  if (typeof attestedAt !== "string") return false;

  const attestedAtMs = Date.parse(attestedAt);
  if (!Number.isFinite(attestedAtMs) || attestedAtMs > nowMs) return false;

  return profile.teen_guardian_permission_policy_version
      === TEEN_GUARDIAN_PERMISSION_POLICY_VERSION
    && typeof profile.teen_guardian_permission_source === "string"
    && TEEN_GUARDIAN_PERMISSION_SOURCES.has(profile.teen_guardian_permission_source)
    && profile.teen_guardian_permission_withdrawn_at == null;
}

export function evaluateProfileEligibility(profile: ProfileEligibility): EligibilityResult {
  if (profile.age_bracket === "under_13") return { allowed: false, code: "under_13" };
  if (profile.age_bracket !== "13_to_17" && profile.age_bracket !== "adult") {
    return { allowed: false, code: "age_bracket_invalid" };
  }
  if (
    profile.age_bracket === "13_to_17"
    && !hasCurrentTeenGuardianPermission(profile)
  ) {
    return { allowed: false, code: "guardian_permission_required" };
  }
  if (profile.consent_ai !== true) return { allowed: false, code: "ai_consent_required" };
  return { allowed: true };
}

export function isDeletionActive(status: unknown): boolean {
  if (status === undefined || status === null) return false;
  return status !== "completed" && status !== "cancelled";
}

export function suppliedOwnerMatches(authenticatedOwnerId: string, suppliedOwnerId: unknown): boolean {
  return suppliedOwnerId === undefined || suppliedOwnerId === null || suppliedOwnerId === authenticatedOwnerId;
}

export function effectiveAiMode(
  assignmentOverride: unknown,
  classMode: unknown,
): "green" | "yellow" | "red" | "unknown" {
  const mode = assignmentOverride ?? classMode;
  return mode === "green" || mode === "yellow" || mode === "red" ? mode : "unknown";
}

export function isOwnedStoragePath(ownerId: string, storageKey: string): boolean {
  if (!ownerId || !storageKey || storageKey.includes("\\")) return false;
  const segments = storageKey.split("/");
  if (segments[0] !== ownerId || segments.length < 2) return false;
  return segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
