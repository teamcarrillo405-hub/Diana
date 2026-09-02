import { createHash } from "node:crypto";

import { createServiceClient } from "@/lib/supabase/service";
import {
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
} from "@/lib/security/canvas-institutions";

import { LmsReconnectRequiredError } from "./errors";
import { assertLmsProviderFeatureEnabled } from "./provider-features";
import type { NormalizedAssignment } from "./types";

export type CourseModeIdentityProvider = "canvas" | "google_classroom";

export interface VerifiedCourseModeProviderIdentity {
  provider: CourseModeIdentityProvider;
  externalStudentId: string;
  verificationSource: "provider_profile_readback";
  canvasInstitutionId: string | null;
  canvasOrigin: string | null;
}

type CourseModeIdentityRpcStore = {
  rpc(
    functionName: string,
    args: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

const EXTERNAL_STUDENT_ID_PATTERN = /^\S(?:[\s\S]{0,298}\S)?$/u;

function normalizeExternalStudentId(value: unknown): string {
  const externalStudentId = typeof value === "number"
    ? String(value)
    : typeof value === "string" ? value.trim() : "";
  if (!EXTERNAL_STUDENT_ID_PATTERN.test(externalStudentId)) {
    throw new Error("The provider profile did not return a bounded student identity.");
  }
  return externalStudentId;
}

export async function readCanvasCourseModeProviderIdentity(input: {
  institutionId?: string | null;
  baseUrl?: string | null;
  token: string;
}): Promise<VerifiedCourseModeProviderIdentity> {
  const institution = await resolveCanvasConnectionDestination({
    institution_id: input.institutionId,
    base_url: input.baseUrl,
  });
  const response = await fetchCanvasDestination(
    institution,
    `${institution.origin}/api/v1/users/self/profile`,
    {
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/json",
      },
    },
  );
  if (response.status === 401 || response.status === 403) {
    throw new LmsReconnectRequiredError(
      "canvas",
      "Reconnect Canvas before Diana verifies the provider student identity.",
    );
  }
  if (!response.ok) {
    throw new Error(`Canvas could not verify the provider student identity (${response.status}).`);
  }
  const profile = await response.json() as { id?: string | number };
  return {
    provider: "canvas",
    externalStudentId: normalizeExternalStudentId(profile.id),
    verificationSource: "provider_profile_readback",
    canvasInstitutionId: institution.id,
    canvasOrigin: institution.origin,
  };
}

export async function readGoogleCourseModeProviderIdentity(input: {
  token: string;
}): Promise<VerifiedCourseModeProviderIdentity> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${input.token}`,
      Accept: "application/json",
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new LmsReconnectRequiredError(
      "google_classroom",
      "Reconnect Google Classroom before Diana verifies the provider student identity.",
    );
  }
  if (!response.ok) {
    throw new Error(`Google could not verify the provider student identity (${response.status}).`);
  }
  const profile = await response.json() as { sub?: string; email_verified?: boolean };
  if (profile.email_verified !== true) {
    throw new Error("Google did not confirm a verified account identity.");
  }
  return {
    provider: "google_classroom",
    externalStudentId: normalizeExternalStudentId(profile.sub),
    verificationSource: "provider_profile_readback",
    canvasInstitutionId: null,
    canvasOrigin: null,
  };
}

function observedCourseIds(assignments: readonly NormalizedAssignment[]): string[] {
  const courseIds = assignments
    .map((assignment) => assignment.external_course_id?.trim() ?? "")
    .filter((courseId) => courseId.length > 0 && courseId.length <= 300);
  return [...new Set(courseIds)].sort((left, right) => left.localeCompare(right));
}

function evidenceDigest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value), "utf8")
    .digest("hex");
}

export async function provisionCourseModeLmsStudentLinksFromImport(input: {
  studentId: string;
  identityConnectionId: string;
  provider: CourseModeIdentityProvider;
  token: string;
  assignments: readonly NormalizedAssignment[];
  canvasInstitutionId?: string | null;
  canvasBaseUrl?: string | null;
  store?: CourseModeIdentityRpcStore | null;
  now?: () => Date;
}): Promise<{ linked: number; provider: CourseModeIdentityProvider }> {
  assertLmsProviderFeatureEnabled(
    input.provider === "canvas" ? "canvas_import" : "google_import",
  );
  const courseIds = observedCourseIds(input.assignments);

  const identity = input.provider === "canvas"
    ? await readCanvasCourseModeProviderIdentity({
        institutionId: input.canvasInstitutionId,
        baseUrl: input.canvasBaseUrl,
        token: input.token,
      })
    : await readGoogleCourseModeProviderIdentity({ token: input.token });
  if (identity.provider !== input.provider) {
    throw new Error("Provider identity readback did not match the imported provider.");
  }

  const observedAt = (input.now ?? (() => new Date()))().toISOString();
  const providerEvidenceDigest = evidenceDigest({
    provider: input.provider,
    externalStudentId: identity.externalStudentId,
    courseIds,
    identityConnectionId: input.identityConnectionId,
    canvasInstitutionId: identity.canvasInstitutionId,
    canvasOrigin: identity.canvasOrigin,
    observedAt,
  });
  const store = input.store ?? (
    createServiceClient() as unknown as CourseModeIdentityRpcStore | null
  );
  if (!store) throw new Error("Course mode identity provisioning is unavailable.");

  const { data, error } = await store.rpc(
    "provision_course_mode_lms_student_links_from_provider",
    {
      p_student_id: input.studentId,
      p_identity_connection_id: input.identityConnectionId,
      p_provider: input.provider,
      p_external_student_id: identity.externalStudentId,
      p_observed_external_course_ids: courseIds,
      p_observed_at: observedAt,
      p_provider_evidence_digest: providerEvidenceDigest,
      p_canvas_institution_id: identity.canvasInstitutionId,
      p_canvas_origin: identity.canvasOrigin,
    },
  );
  if (error) throw new Error(`Course mode identity provisioning was rejected: ${error.message}`);
  const linked = typeof data === "number"
    ? data
    : typeof data === "string" && /^\d+$/u.test(data) ? Number(data) : Number.NaN;
  if (!Number.isSafeInteger(linked) || linked < 0) {
    throw new Error("Course mode identity provisioning returned an invalid result.");
  }
  return { linked, provider: input.provider };
}
