import { describe, expect, it } from "vitest";

import {
  CHILD_DATA_OPERATIONAL_SURFACES,
  CHILD_DATA_PROCESSOR_KEYS,
  CHILD_DATA_REGISTRY,
  CHILD_DATA_SURFACES,
  assertChildDataRegistryCoverage,
  assertChildDataStorageRegistration,
  discoverGuardianChildDataStorageTargets,
  requiredProcessorCleanupBindings,
  validateChildDataRegistryCoverage,
  validateChildDataStorageRegistration,
  validateUnder13ProcessorReadiness,
  validateUnder13RegistryReadiness,
  type ChildDataRegistryEntry,
} from "./child-data-registry";
import { GUARDIAN_CONSENT_SCOPES } from "./contracts";

describe("child data registry coverage", () => {
  it("registers every feature and operational surface while collection stays blocked", () => {
    const coverage = validateChildDataRegistryCoverage(CHILD_DATA_REGISTRY);

    expect(coverage).toEqual({
      valid: true,
      coveredSurfaces: CHILD_DATA_SURFACES,
      missingSurfaces: [],
      coveredConsentScopes: GUARDIAN_CONSENT_SCOPES,
      missingConsentScopes: [],
      coveredProcessors: CHILD_DATA_PROCESSOR_KEYS,
      issues: [],
    });
    expect(CHILD_DATA_REGISTRY.every((entry) => entry.collectionEnabled === false)).toBe(true);
    expect(CHILD_DATA_REGISTRY.every((entry) => (
      entry.purposeKey.length > 0
      && entry.retentionPolicyKey.length > 0
      && entry.exportRuleKey.length > 0
      && entry.deletionRuleKey.length > 0
      && entry.processorKeys.length > 0
    ))).toBe(true);
    expect(() => assertChildDataRegistryCoverage()).not.toThrow();

    for (const surface of CHILD_DATA_OPERATIONAL_SURFACES) {
      expect(CHILD_DATA_REGISTRY.some((entry) => entry.surface === surface)).toBe(true);
    }
    expect(CHILD_DATA_REGISTRY.find((entry) => (
      entry.surface === "guardian_verification_sessions"
    ))).toEqual(expect.objectContaining({
      implementationStatus: "contract_only",
      dataCategories: ["verification_metadata"],
      processorKeys: ["diana_first_party", "supabase", "vpc_provider"],
    }));
    expect(CHILD_DATA_REGISTRY.find((entry) => entry.surface === "saved_audio")).toEqual(
      expect.objectContaining({
        dataCategories: ["saved_audio"],
        consentScopes: ["saved_audio"],
        collectionEnabled: false,
        storageTargets: [],
      }),
    );
  });

  it("fails closed when an operational surface or consent scope registration is removed", () => {
    const withoutVerification = CHILD_DATA_REGISTRY.filter((entry) => (
      entry.surface !== "guardian_verification_sessions"
    ));
    const surfaceCoverage = validateChildDataRegistryCoverage(withoutVerification);

    expect(surfaceCoverage.valid).toBe(false);
    expect(surfaceCoverage.missingSurfaces).toEqual(["guardian_verification_sessions"]);
    expect(surfaceCoverage.issues).toContainEqual({
      code: "missing_surface_coverage",
      value: "guardian_verification_sessions",
    });

    const withoutAiScope = CHILD_DATA_REGISTRY.map((entry) => ({
      ...entry,
      consentScopes: entry.consentScopes.filter((scope) => scope !== "ai_assistance"),
      consentScopeVersions: entry.consentScopeVersions.filter((grant) => (
        grant.scope !== "ai_assistance"
      )),
    })) as readonly ChildDataRegistryEntry[];
    const scopeCoverage = validateChildDataRegistryCoverage(withoutAiScope);
    expect(scopeCoverage.missingConsentScopes).toEqual(["ai_assistance"]);
    expect(scopeCoverage.issues).toContainEqual({
      code: "missing_scope_coverage",
      value: "ai_assistance",
    });
  });

  it("rejects duplicates, stale scope versions, unknown processors, and collection enablement", () => {
    const duplicate = {
      ...CHILD_DATA_REGISTRY[0],
      entryKey: "account_request_duplicate",
    } satisfies ChildDataRegistryEntry;
    const invalidEntry = {
      ...CHILD_DATA_REGISTRY[1],
      collectionEnabled: true,
      processorKeys: ["unknown_processor"],
      consentScopeVersions: [{
        ...CHILD_DATA_REGISTRY[1].consentScopeVersions[0],
        scopeVersion: "learning_records_v0",
      }],
    } as unknown as ChildDataRegistryEntry;

    const duplicateCoverage = validateChildDataRegistryCoverage([
      ...CHILD_DATA_REGISTRY,
      duplicate,
    ]);
    expect(duplicateCoverage.issues).toContainEqual({
      code: "duplicate_surface",
      entryKey: "account_request_duplicate",
      value: "account_request",
    });

    const invalidCoverage = validateChildDataRegistryCoverage([
      CHILD_DATA_REGISTRY[0],
      invalidEntry,
      ...CHILD_DATA_REGISTRY.slice(2),
    ]);
    expect(invalidCoverage.issues).toEqual(expect.arrayContaining([
      { code: "collection_not_blocked", entryKey: "learning_records_v1" },
      {
        code: "consent_scope_version_stale",
        entryKey: "learning_records_v1",
        value: "learning_records",
      },
      {
        code: "unknown_processor",
        entryKey: "learning_records_v1",
        value: "unknown_processor",
      },
    ]));
    expect(() => assertChildDataRegistryCoverage([
      CHILD_DATA_REGISTRY[0],
      invalidEntry,
      ...CHILD_DATA_REGISTRY.slice(2),
    ])).toThrow("Child data registry coverage is incomplete");
  });

  it("fails storage registration for new or stale guardian-owned targets", () => {
    const registeredTargets = CHILD_DATA_REGISTRY.flatMap((entry) => entry.storageTargets);

    expect(validateChildDataStorageRegistration(registeredTargets)).toEqual({
      valid: true,
      registeredTargets: [...registeredTargets].sort(),
      unregisteredTargets: [],
      unexpectedTargets: [],
    });
    expect(() => assertChildDataStorageRegistration(registeredTargets)).not.toThrow();

    expect(validateChildDataStorageRegistration([
      ...registeredTargets,
      "public.guardian_new_child_table",
    ])).toEqual(expect.objectContaining({
      valid: false,
      unregisteredTargets: ["public.guardian_new_child_table"],
    }));
    expect(validateChildDataStorageRegistration(registeredTargets.slice(1))).toEqual(
      expect.objectContaining({
        valid: false,
        unexpectedTargets: [registeredTargets[0]],
      }),
    );
  });

  it("keeps processor cleanup explicit and under-13 processor readiness blocked", () => {
    const cleanupBindings = requiredProcessorCleanupBindings();

    expect(cleanupBindings).toContainEqual({
      entryKey: "ai_assistance_v1",
      processorKey: "openai",
    });
    expect(cleanupBindings).toContainEqual({
      entryKey: "guardian_verification_sessions_v1",
      processorKey: "vpc_provider",
    });
    expect(cleanupBindings.some((binding) => (
      binding.processorKey === "diana_first_party"
    ))).toBe(false);

    expect(validateUnder13ProcessorReadiness()).toEqual({
      ready: false,
      blockedProcessorKeys: CHILD_DATA_PROCESSOR_KEYS,
    });
    expect(validateUnder13RegistryReadiness()).toEqual(expect.objectContaining({
      ready: false,
      structuralCoverageValid: true,
      blockedProcessorKeys: CHILD_DATA_PROCESSOR_KEYS,
    }));
    expect(validateUnder13RegistryReadiness().incompleteEntryKeys).toEqual(
      expect.arrayContaining([
        "ai_assistance_v1",
        "guardian_verification_sessions_v1",
        "guardian_withdrawal_receipts_v1",
      ]),
    );
  });

  it("discovers implemented guardian storage for the CI registration check", () => {
    const migrationSql = `
      create table public.guardian_foundation_config (id integer);
      create table public.guardian_account_requests (id uuid);
      create table if not exists public.guardian_withdrawal_receipts (id uuid);
      alter table public.profiles add column teen_guardian_permission_attested_at timestamptz;
    `;

    expect(discoverGuardianChildDataStorageTargets(migrationSql)).toEqual([
      "public.guardian_account_requests",
      "public.guardian_withdrawal_receipts",
      "public.profiles.teen_guardian_permission",
    ]);
  });
});
