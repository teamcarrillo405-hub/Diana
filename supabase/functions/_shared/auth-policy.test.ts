import {
  effectiveAiMode,
  evaluateProfileEligibility,
  isDeletionActive,
  isOwnedStoragePath,
  suppliedOwnerMatches,
} from "./auth-policy.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("profile eligibility rejects under-13 and non-consenting profiles", () => {
  assert(!evaluateProfileEligibility({ age_bracket: "under_13", consent_ai: false }).allowed, "under-13 profile passed");
  assert(!evaluateProfileEligibility({ age_bracket: "13_to_17", consent_ai: false }).allowed, "missing consent passed");
  assert(evaluateProfileEligibility({ age_bracket: "13_to_17", consent_ai: true }).allowed, "eligible profile blocked");
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
