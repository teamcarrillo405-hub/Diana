export type ProfileEligibility = {
  age_bracket?: unknown;
  consent_ai?: unknown;
};

export type EligibilityResult =
  | { allowed: true }
  | { allowed: false; code: "under_13" | "ai_consent_required" };

export function evaluateProfileEligibility(profile: ProfileEligibility): EligibilityResult {
  if (profile.age_bracket === "under_13") return { allowed: false, code: "under_13" };
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
