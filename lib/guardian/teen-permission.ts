import {
  hasCurrentTeenGuardianPermission,
  type TeenGuardianPermissionRecord,
} from "@/lib/learner-access-policy";

export const TEEN_PERMISSION_CONTROLLED_SURFACES = [
  "ai_assistance",
  "voice_inputs",
  "saved_audio",
  "file_uploads",
  "school_integrations",
  "wellness",
] as const;

export type TeenPermissionControlledSurface =
  typeof TEEN_PERMISSION_CONTROLLED_SURFACES[number];

export type TeenPermissionSurfaceDecision = Readonly<{
  allowed: boolean;
  surface: TeenPermissionControlledSurface;
  reasonCode:
    | "allowed"
    | "under_13_disabled"
    | "guardian_permission_required"
    | "ai_consent_required"
    | "age_bracket_invalid";
}>;

export function teenPermissionForSurface(
  record: TeenGuardianPermissionRecord,
  surface: TeenPermissionControlledSurface,
  now: Date = new Date(),
): TeenPermissionSurfaceDecision {
  if (record.age_bracket === "under_13") {
    return { allowed: false, surface, reasonCode: "under_13_disabled" };
  }
  if (record.age_bracket === "adult") {
    return { allowed: true, surface, reasonCode: "allowed" };
  }
  if (record.age_bracket !== "13_to_17") {
    return { allowed: false, surface, reasonCode: "age_bracket_invalid" };
  }
  if (!hasCurrentTeenGuardianPermission(record, now)) {
    return { allowed: false, surface, reasonCode: "guardian_permission_required" };
  }
  if (surface === "ai_assistance" && record.consent_ai !== true) {
    return { allowed: false, surface, reasonCode: "ai_consent_required" };
  }
  return { allowed: true, surface, reasonCode: "allowed" };
}
