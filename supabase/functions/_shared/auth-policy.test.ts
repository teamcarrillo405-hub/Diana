import {
  effectiveAiMode,
  evaluateProfileEligibility,
  isDeletionActive,
  isOwnedStoragePath,
  suppliedOwnerMatches,
} from "./auth-policy.ts";

const CURRENT_PERMISSION = {
  teen_guardian_permission_attested_at: "2020-01-01T00:00:00.000Z",
  teen_guardian_permission_policy_version: "teen_openai_beta_v1",
  teen_guardian_permission_source: "profile_center_attestation",
  teen_guardian_permission_withdrawn_at: null,
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("profile eligibility requires current teen permission and AI consent", () => {
  const under13 = evaluateProfileEligibility({
    age_bracket: "under_13",
    consent_ai: true,
    ...CURRENT_PERMISSION,
  });
  assert(!under13.allowed && under13.code === "under_13", "under-13 profile passed");

  const missingAge = evaluateProfileEligibility({ age_bracket: undefined, consent_ai: true });
  assert(
    !missingAge.allowed && missingAge.code === "age_bracket_invalid",
    "missing age bracket passed",
  );

  const unknownAge = evaluateProfileEligibility({ age_bracket: "unknown", consent_ai: true });
  assert(
    !unknownAge.allowed && unknownAge.code === "age_bracket_invalid",
    "unknown age bracket passed",
  );

  const missingPermission = evaluateProfileEligibility({ age_bracket: "13_to_17", consent_ai: true });
  assert(
    !missingPermission.allowed && missingPermission.code === "guardian_permission_required",
    "missing teen permission passed",
  );

  const withdrawn = evaluateProfileEligibility({
    age_bracket: "13_to_17",
    consent_ai: true,
    ...CURRENT_PERMISSION,
    teen_guardian_permission_withdrawn_at: "2026-08-01T00:00:00.000Z",
  });
  assert(!withdrawn.allowed && withdrawn.code === "guardian_permission_required", "withdrawal passed");

  const missingConsent = evaluateProfileEligibility({
    age_bracket: "13_to_17",
    consent_ai: false,
    ...CURRENT_PERMISSION,
  });
  assert(!missingConsent.allowed && missingConsent.code === "ai_consent_required", "missing consent passed");
  assert(evaluateProfileEligibility({
    age_bracket: "13_to_17",
    consent_ai: true,
    ...CURRENT_PERMISSION,
  }).allowed, "eligible teen profile blocked");
  assert(evaluateProfileEligibility({ age_bracket: "adult", consent_ai: true }).allowed, "adult blocked");
});

Deno.test("active deletion statuses fail closed", () => {
  assert(isDeletionActive("requested"), "requested deletion passed");
  assert(isDeletionActive("processing"), "processing deletion passed");
  assert(isDeletionActive("failed"), "legacy failed deletion passed");
  assert(isDeletionActive("db_purge_failed"), "partial deletion passed");
  assert(isDeletionActive("unexpected_state"), "unknown deletion state passed");
  assert(!isDeletionActive("cancelled"), "cancelled deletion blocked");
  assert(!isDeletionActive("completed"), "completed deletion blocked");
  assert(!isDeletionActive(null), "missing request blocked");
});

Deno.test("assignment override takes precedence over class policy", () => {
  assert(effectiveAiMode("red", "green") === "red", "assignment override ignored");
  assert(effectiveAiMode(null, "green") === "green", "class policy ignored");
  assert(effectiveAiMode(null, undefined) === "unknown", "missing policy failed open");
});

Deno.test("storage paths stay under the authenticated user prefix", () => {
  const userA = "00000000-0000-4000-8000-00000000000a";
  const userB = "00000000-0000-4000-8000-00000000000b";
  assert(isOwnedStoragePath(userA, `${userA}/notes/photo.png`), "user A path blocked");
  assert(!isOwnedStoragePath(userA, `${userB}/notes/photo.png`), "user B path allowed");
  assert(!isOwnedStoragePath(userA, `${userA}/../${userB}/photo.png`), "traversal path allowed");
});

Deno.test("user A cannot supply user B as owner", () => {
  const userA = "00000000-0000-4000-8000-00000000000a";
  const userB = "00000000-0000-4000-8000-00000000000b";
  assert(suppliedOwnerMatches(userA, userA), "matching owner rejected");
  assert(!suppliedOwnerMatches(userA, userB), "user B owner accepted for user A");
});
