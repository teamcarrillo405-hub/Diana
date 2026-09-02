import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { learnerAccessForAgeBracket } from "../../lib/learner-access-policy";
import {
  CHILD_DATA_REGISTRY,
  GUARDIAN_ACCOUNT_STATES,
  GUARDIAN_CONSENT_SCOPE_INTERFACES,
  assertBeta13PlusReleaseBoundary,
  assertChildDataRegistryCoverage,
  assertChildDataStorageRegistration,
  discoverGuardianChildDataStorageTargets,
  evaluateUnder13ReleaseGate,
  guardianFoundationAccessForState,
  validateChildDataRegistryCoverage,
  validateUnder13RegistryReadiness,
} from "../../lib/guardian";
import { evaluateProfileEligibility } from "../../supabase/functions/_shared/auth-policy";

const projectRoot = path.resolve(process.cwd());
const manifest = JSON.parse(read("config/beta-release-manifest.json")) as unknown;
assertBeta13PlusReleaseBoundary(manifest);

assertChildDataRegistryCoverage();
const registryCoverage = validateChildDataRegistryCoverage(CHILD_DATA_REGISTRY);
const registryReadiness = validateUnder13RegistryReadiness();
if (!registryCoverage.valid || registryReadiness.ready) {
  throw new Error(
    "The child-data registry must be structurally complete while under-13 readiness remains blocked.",
  );
}

const migrationDirectory = path.join(projectRoot, "supabase", "migrations");
const migrationSql = readdirSync(migrationDirectory)
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort()
  .map((fileName) => readFileSync(path.join(migrationDirectory, fileName), "utf8"))
  .join("\n");
const storageTargets = discoverGuardianChildDataStorageTargets(migrationSql);
assertChildDataStorageRegistration(storageTargets);

const signupSource = read("app/(auth)/signup/page.tsx");
const authenticatedLayoutSource = read("app/(app)/layout.tsx");
const studentAuthSource = read("supabase/functions/_shared/student-auth.ts");
const foundationMigration = read(
  "supabase/migrations/20260831090000_guardian_foundation.sql",
);

const signupDenied = learnerAccessForAgeBracket("under_13").accountAccess
  !== "allowed"
  && signupSource.includes("validateDateOfBirth")
  && signupSource.includes('access.accountAccess !== "allowed"');
const authenticatedAppDenied = authenticatedLayoutSource.includes(
  'profile?.age_bracket === "under_13"',
) && authenticatedLayoutSource.includes('redirect("/")');
const databaseDenied = latestFunctionDefinition(
  migrationSql,
  "enforce_profile_age_and_ai_consent",
).includes("Diana accounts require an age of at least 13")
  && latestFunctionDefinition(migrationSql, "handle_new_user")
    .includes("Diana accounts require an age of at least 13");
const aiDenied = evaluateProfileEligibility({
  age_bracket: "under_13",
  consent_ai: true,
}).allowed === false
  && evaluateProfileEligibility({
    age_bracket: undefined,
    consent_ai: true,
  }).allowed === false
  && studentAuthSource.includes("evaluateProfileEligibility(profileResult.data)");
const foundationHardDisabled = [
  "check (foundation_enabled = false)",
  "check (child_accounts_enabled = false)",
  "check (direct_ai_enabled = false)",
  "check (child_account_enabled = false)",
].every((requiredSql) => foundationMigration.includes(requiredSql));

if (
  !signupDenied
  || !authenticatedAppDenied
  || !databaseDenied
  || !aiDenied
  || !foundationHardDisabled
) {
  throw new Error(
    "The signup, authenticated app, database, AI, or guardian-foundation age denial is incomplete.",
  );
}
if (
  /update\s+public\.guardian_foundation_config[\s\S]{0,500}\b(?:foundation_enabled|child_accounts_enabled|direct_ai_enabled)\s*=\s*true/iu
    .test(migrationSql)
  || /alter\s+table\s+public\.guardian_foundation_config[\s\S]{0,300}\bdrop\s+constraint\b/iu
    .test(migrationSql)
) {
  throw new Error("A migration attempted to remove or bypass the disabled guardian foundation.");
}

for (const state of GUARDIAN_ACCOUNT_STATES) {
  const access = guardianFoundationAccessForState(state);
  if (access.accountAccess !== "blocked" || access.directAiAccess !== "blocked") {
    throw new Error(`Guardian state ${state} is not fail-closed.`);
  }
}
if (
  GUARDIAN_CONSENT_SCOPE_INTERFACES.length === 0
  || GUARDIAN_CONSENT_SCOPE_INTERFACES.some((scope) => (
    scope.defaultDecision !== "denied"
    || scope.separateDecisionRequired !== true
    || scope.collectionEnabled !== false
  ))
) {
  throw new Error("Guardian consent scope interfaces are not deny-by-default.");
}

const releaseDecision = evaluateUnder13ReleaseGate({
  releaseProfile: manifest.profile,
  releaseSha: "0".repeat(40),
  foundationHardDisabled,
  technicalEvidence: {
    signup_denial: signupDenied,
    authenticated_app_denial: authenticatedAppDenied,
    database_denial: databaseDenied,
    ai_denial: aiDenied,
    registry_coverage: registryCoverage.valid,
    processor_readiness: registryReadiness.ready,
    synthetic_export_receipt: false,
    synthetic_withdrawal_receipt: false,
    synthetic_deletion_receipt: false,
  },
  externalReceipts: [],
});
if (
  releaseDecision.state !== "blocked"
  || releaseDecision.childAccountsEnabled !== false
  || releaseDecision.directAiEnabled !== false
) {
  throw new Error("The under-13 release gate did not remain blocked.");
}

console.log(
  `Under-13 boundary blocked: ${releaseDecision.issues.length} release prerequisites unresolved; `
  + `${CHILD_DATA_REGISTRY.length} child-data registry entries validated.`,
);

function read(relativePath: string): string {
  return readFileSync(path.join(projectRoot, ...relativePath.split("/")), "utf8");
}

function latestFunctionDefinition(sql: string, functionName: string): string {
  const marker = `create or replace function public.${functionName}()`;
  const start = sql.toLowerCase().lastIndexOf(marker);
  if (start < 0) throw new Error(`Missing database function ${functionName}.`);
  const nextFunction = sql.toLowerCase().indexOf("create or replace function public.", start + marker.length);
  return sql.slice(start, nextFunction < 0 ? sql.length : nextFunction);
}
