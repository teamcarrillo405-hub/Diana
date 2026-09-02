import {
  GUARDIAN_CONSENT_SCOPES,
  GUARDIAN_CONSENT_SCOPE_VERSIONS,
  versionGuardianConsentScopes,
  type GuardianConsentScope,
  type VersionedGuardianConsentScope,
} from "./contracts";

export const CHILD_DATA_REGISTRY_CONTRACT_VERSION = 1 as const;

export const CHILD_DATA_FEATURE_SURFACES = [
  "account_request",
  "learning_records",
  "ai_assistance",
  "file_uploads",
  "voice_inputs",
  "saved_audio",
  "wellness",
  "school_integrations",
] as const;

export const CHILD_DATA_OPERATIONAL_SURFACES = [
  "guardian_links",
  "guardian_verification_sessions",
  "guardian_consent_records",
  "guardian_consent_audit_events",
  "guardian_export_receipts",
  "guardian_withdrawal_receipts",
  "guardian_deletion_receipts",
  "processor_cleanup_receipts",
  "teen_permission_records",
] as const;

export const CHILD_DATA_SURFACES = [
  ...CHILD_DATA_FEATURE_SURFACES,
  ...CHILD_DATA_OPERATIONAL_SURFACES,
] as const;

export type ChildDataSurface = typeof CHILD_DATA_SURFACES[number];

export const CHILD_DATA_CATEGORIES = [
  "child_profile",
  "learning_activity",
  "ai_input_output",
  "uploaded_content",
  "voice_recording",
  "saved_audio",
  "wellness_record",
  "school_record",
  "guardian_relationship",
  "verification_metadata",
  "consent_record",
  "consent_audit_event",
  "export_receipt",
  "withdrawal_receipt",
  "deletion_receipt",
  "processor_cleanup_receipt",
  "teen_permission_attestation",
] as const;

export type ChildDataCategory = typeof CHILD_DATA_CATEGORIES[number];

export const CHILD_DATA_PROCESSOR_KEYS = [
  "diana_first_party",
  "supabase",
  "openai",
  "vpc_provider",
  "school_integration_provider",
] as const;

export type ChildDataProcessorKey = typeof CHILD_DATA_PROCESSOR_KEYS[number];

export const CHILD_DATA_PROCESSOR_UNDER_13_STATUSES = [
  "foundation_only",
  "contract_review_required",
  "endpoint_review_required",
  "provider_unselected",
  "approved",
] as const;

export type ChildDataProcessorUnder13Status =
  typeof CHILD_DATA_PROCESSOR_UNDER_13_STATUSES[number];

export type ChildDataProcessorRegistration = Readonly<{
  processorKey: ChildDataProcessorKey;
  kind: "first_party" | "infrastructure" | "ai" | "verification" | "school_integration";
  under13Status: ChildDataProcessorUnder13Status;
  cleanupRuleKey: string;
}>;

export const CHILD_DATA_PROCESSOR_REGISTRY = Object.freeze([
  processorRegistration(
    "diana_first_party",
    "first_party",
    "foundation_only",
    "diana_child_data_cleanup_v1",
  ),
  processorRegistration(
    "supabase",
    "infrastructure",
    "contract_review_required",
    "supabase_child_data_cleanup_v1",
  ),
  processorRegistration(
    "openai",
    "ai",
    "endpoint_review_required",
    "openai_retention_or_cleanup_receipt_v1",
  ),
  processorRegistration(
    "vpc_provider",
    "verification",
    "provider_unselected",
    "vpc_verification_metadata_cleanup_v1",
  ),
  processorRegistration(
    "school_integration_provider",
    "school_integration",
    "contract_review_required",
    "school_integration_child_data_cleanup_v1",
  ),
] satisfies readonly ChildDataProcessorRegistration[]);

export const CHILD_DATA_IMPLEMENTATION_STATUSES = [
  "collection_blocked",
  "implemented_disabled",
  "contract_only",
] as const;

export type ChildDataImplementationStatus =
  typeof CHILD_DATA_IMPLEMENTATION_STATUSES[number];

export type ChildDataRegistryEntry = Readonly<{
  contractVersion: typeof CHILD_DATA_REGISTRY_CONTRACT_VERSION;
  entryKey: string;
  surface: ChildDataSurface;
  dataCategories: readonly ChildDataCategory[];
  consentScopes: readonly GuardianConsentScope[];
  consentScopeVersions: readonly VersionedGuardianConsentScope[];
  collectionEnabled: false;
  implementationStatus: ChildDataImplementationStatus;
  purposeKey: string;
  storageTargets: readonly string[];
  processorKeys: readonly ChildDataProcessorKey[];
  processorCleanupRequired: boolean;
  retentionPolicyKey: string;
  exportRuleKey: string;
  deletionRuleKey: string;
  sqlFoundationSeeded: boolean;
}>;

export const CHILD_DATA_GOVERNANCE_STORAGE_TARGETS = Object.freeze([
  "public.guardian_foundation_config",
  "public.guardian_vpc_providers",
  "public.child_data_registry_entries",
] as const);

export const CHILD_DATA_REGISTRY: readonly ChildDataRegistryEntry[] = Object.freeze([
  featureRegistryEntry(
    "account_request_v1",
    "account_request",
    "child_profile",
    "account_request",
    ["diana_first_party", "supabase"],
  ),
  featureRegistryEntry(
    "learning_records_v1",
    "learning_records",
    "learning_activity",
    "learning_records",
    ["diana_first_party", "supabase"],
  ),
  featureRegistryEntry(
    "ai_assistance_v1",
    "ai_assistance",
    "ai_input_output",
    "ai_assistance",
    ["diana_first_party", "supabase", "openai"],
  ),
  featureRegistryEntry(
    "file_uploads_v1",
    "file_uploads",
    "uploaded_content",
    "file_uploads",
    ["diana_first_party", "supabase"],
  ),
  featureRegistryEntry(
    "voice_inputs_v1",
    "voice_inputs",
    "voice_recording",
    "voice_inputs",
    ["diana_first_party", "supabase", "openai"],
  ),
  featureRegistryEntry(
    "saved_audio_v1",
    "saved_audio",
    "saved_audio",
    "saved_audio",
    ["diana_first_party", "supabase"],
  ),
  featureRegistryEntry(
    "wellness_v1",
    "wellness",
    "wellness_record",
    "wellness",
    ["diana_first_party", "supabase"],
  ),
  featureRegistryEntry(
    "school_integrations_v1",
    "school_integrations",
    "school_record",
    "school_integrations",
    ["diana_first_party", "supabase", "school_integration_provider"],
  ),
  registryEntry({
    entryKey: "guardian_links_v1",
    surface: "guardian_links",
    dataCategories: ["guardian_relationship", "child_profile"],
    consentScopes: ["account_request"],
    implementationStatus: "implemented_disabled",
    purposeKey: "guardian_child_relationship_v1",
    storageTargets: ["public.guardian_account_requests"],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: true,
    retentionPolicyKey: "guardian_link_until_withdrawal_or_closure_v1",
    exportRuleKey: "guardian_link_export_v1",
    deletionRuleKey: "guardian_link_delete_v1",
  }),
  registryEntry({
    entryKey: "guardian_verification_sessions_v1",
    surface: "guardian_verification_sessions",
    dataCategories: ["verification_metadata"],
    consentScopes: ["account_request"],
    implementationStatus: "contract_only",
    purposeKey: "guardian_verification_v1",
    storageTargets: [],
    processorKeys: ["diana_first_party", "supabase", "vpc_provider"],
    processorCleanupRequired: true,
    retentionPolicyKey: "verification_metadata_minimum_audit_window_v1",
    exportRuleKey: "guardian_verification_metadata_export_v1",
    deletionRuleKey: "guardian_verification_metadata_delete_v1",
  }),
  registryEntry({
    entryKey: "guardian_consent_records_v1",
    surface: "guardian_consent_records",
    dataCategories: ["consent_record"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "implemented_disabled",
    purposeKey: "versioned_guardian_consent_v1",
    storageTargets: ["public.guardian_consent_records"],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: true,
    retentionPolicyKey: "guardian_consent_legal_audit_window_v1",
    exportRuleKey: "guardian_consent_export_v1",
    deletionRuleKey: "guardian_consent_delete_or_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "guardian_consent_audit_events_v1",
    surface: "guardian_consent_audit_events",
    dataCategories: ["consent_audit_event"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "implemented_disabled",
    purposeKey: "guardian_consent_audit_v1",
    storageTargets: ["public.guardian_consent_audit_events"],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: true,
    retentionPolicyKey: "guardian_consent_audit_legal_window_v1",
    exportRuleKey: "guardian_consent_audit_export_v1",
    deletionRuleKey: "guardian_consent_audit_delete_or_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "guardian_export_receipts_v1",
    surface: "guardian_export_receipts",
    dataCategories: ["export_receipt"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "contract_only",
    purposeKey: "guardian_rights_export_evidence_v1",
    storageTargets: [],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: false,
    retentionPolicyKey: "guardian_rights_receipt_audit_window_v1",
    exportRuleKey: "guardian_export_receipt_export_v1",
    deletionRuleKey: "guardian_export_receipt_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "guardian_withdrawal_receipts_v1",
    surface: "guardian_withdrawal_receipts",
    dataCategories: ["withdrawal_receipt"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "contract_only",
    purposeKey: "guardian_rights_withdrawal_evidence_v1",
    storageTargets: [],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: false,
    retentionPolicyKey: "guardian_rights_receipt_audit_window_v1",
    exportRuleKey: "guardian_withdrawal_receipt_export_v1",
    deletionRuleKey: "guardian_withdrawal_receipt_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "guardian_deletion_receipts_v1",
    surface: "guardian_deletion_receipts",
    dataCategories: ["deletion_receipt"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "contract_only",
    purposeKey: "guardian_rights_deletion_evidence_v1",
    storageTargets: [],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: false,
    retentionPolicyKey: "guardian_rights_receipt_audit_window_v1",
    exportRuleKey: "guardian_deletion_receipt_export_v1",
    deletionRuleKey: "guardian_deletion_receipt_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "processor_cleanup_receipts_v1",
    surface: "processor_cleanup_receipts",
    dataCategories: ["processor_cleanup_receipt"],
    consentScopes: GUARDIAN_CONSENT_SCOPES,
    implementationStatus: "contract_only",
    purposeKey: "processor_cleanup_evidence_v1",
    storageTargets: [],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: false,
    retentionPolicyKey: "processor_cleanup_receipt_audit_window_v1",
    exportRuleKey: "processor_cleanup_receipt_export_v1",
    deletionRuleKey: "processor_cleanup_receipt_legal_hold_v1",
  }),
  registryEntry({
    entryKey: "teen_permission_records_v1", // gitleaks:allow registry identifier, not a credential
    surface: "teen_permission_records",
    dataCategories: ["teen_permission_attestation"],
    consentScopes: ["ai_assistance"],
    implementationStatus: "implemented_disabled",
    purposeKey: "teen_ai_permission_v1", // gitleaks:allow registry identifier, not a credential
    storageTargets: ["public.profiles.teen_guardian_permission"],
    processorKeys: ["diana_first_party", "supabase"],
    processorCleanupRequired: true,
    retentionPolicyKey: "teen_permission_until_withdrawal_or_account_delete_v1",
    exportRuleKey: "teen_permission_export_v1",
    deletionRuleKey: "teen_permission_delete_v1",
  }),
]);

export type ChildDataRegistryCoverageIssueCode =
  | "duplicate_entry_key"
  | "duplicate_surface"
  | "invalid_contract_version"
  | "invalid_entry_key"
  | "unknown_surface"
  | "missing_data_category"
  | "duplicate_data_category"
  | "unknown_data_category"
  | "missing_consent_scope"
  | "duplicate_consent_scope"
  | "unknown_consent_scope"
  | "consent_scope_version_missing"
  | "consent_scope_version_stale"
  | "unexpected_consent_scope_version"
  | "collection_not_blocked"
  | "invalid_implementation_status"
  | "storage_target_missing"
  | "invalid_storage_target"
  | "purpose_rule_missing"
  | "processor_missing"
  | "duplicate_processor"
  | "unknown_processor"
  | "processor_cleanup_rule_missing"
  | "retention_policy_missing"
  | "export_rule_missing"
  | "deletion_rule_missing"
  | "missing_surface_coverage"
  | "missing_scope_coverage";

export type ChildDataRegistryCoverageIssue = Readonly<{
  code: ChildDataRegistryCoverageIssueCode;
  entryKey?: string;
  value?: string;
}>;

export type ChildDataRegistryCoverage = Readonly<{
  valid: boolean;
  coveredSurfaces: readonly ChildDataSurface[];
  missingSurfaces: readonly ChildDataSurface[];
  coveredConsentScopes: readonly GuardianConsentScope[];
  missingConsentScopes: readonly GuardianConsentScope[];
  coveredProcessors: readonly ChildDataProcessorKey[];
  issues: readonly ChildDataRegistryCoverageIssue[];
}>;

export function validateChildDataRegistryCoverage(
  entries: readonly ChildDataRegistryEntry[],
  requiredSurfaces: readonly ChildDataSurface[] = CHILD_DATA_SURFACES,
  requiredConsentScopes: readonly GuardianConsentScope[] = GUARDIAN_CONSENT_SCOPES,
  processors: readonly ChildDataProcessorRegistration[] = CHILD_DATA_PROCESSOR_REGISTRY,
): ChildDataRegistryCoverage {
  const issues: ChildDataRegistryCoverageIssue[] = [];
  const entryKeys = new Set<string>();
  const surfaces = new Set<ChildDataSurface>();
  const scopes = new Set<GuardianConsentScope>();
  const coveredProcessors = new Set<ChildDataProcessorKey>();
  const knownSurfaces = new Set<string>(CHILD_DATA_SURFACES);
  const knownCategories = new Set<string>(CHILD_DATA_CATEGORIES);
  const knownScopes = new Set<string>(GUARDIAN_CONSENT_SCOPES);
  const knownProcessors = new Map(processors.map((processor) => [
    processor.processorKey,
    processor,
  ]));
  const knownImplementationStatuses = new Set<string>(CHILD_DATA_IMPLEMENTATION_STATUSES);

  for (const entry of entries) {
    const entryKey = typeof entry.entryKey === "string" ? entry.entryKey : "";
    if (!isContractKey(entryKey)) {
      issues.push({ code: "invalid_entry_key", entryKey });
    }
    if (entryKeys.has(entryKey)) {
      issues.push({ code: "duplicate_entry_key", entryKey });
    }
    entryKeys.add(entryKey);

    if (entry.contractVersion !== CHILD_DATA_REGISTRY_CONTRACT_VERSION) {
      issues.push({ code: "invalid_contract_version", entryKey });
    }

    if (!knownSurfaces.has(entry.surface)) {
      issues.push({ code: "unknown_surface", entryKey, value: String(entry.surface) });
    } else if (surfaces.has(entry.surface)) {
      issues.push({ code: "duplicate_surface", entryKey, value: entry.surface });
    } else {
      surfaces.add(entry.surface);
    }

    const dataCategories = Array.isArray(entry.dataCategories) ? entry.dataCategories : [];
    if (dataCategories.length === 0) {
      issues.push({ code: "missing_data_category", entryKey });
    }
    if (new Set(dataCategories).size !== dataCategories.length) {
      issues.push({ code: "duplicate_data_category", entryKey });
    }
    for (const category of dataCategories) {
      if (!knownCategories.has(category)) {
        issues.push({ code: "unknown_data_category", entryKey, value: String(category) });
      }
    }

    const consentScopes = Array.isArray(entry.consentScopes) ? entry.consentScopes : [];
    if (consentScopes.length === 0) {
      issues.push({ code: "missing_consent_scope", entryKey });
    }
    if (new Set(consentScopes).size !== consentScopes.length) {
      issues.push({ code: "duplicate_consent_scope", entryKey });
    }
    for (const scope of consentScopes) {
      if (!knownScopes.has(scope)) {
        issues.push({ code: "unknown_consent_scope", entryKey, value: String(scope) });
      } else {
        scopes.add(scope);
      }
    }
    validateConsentScopeVersions(entry, issues);

    if (entry.collectionEnabled !== false) {
      issues.push({ code: "collection_not_blocked", entryKey });
    }
    if (!knownImplementationStatuses.has(entry.implementationStatus)) {
      issues.push({
        code: "invalid_implementation_status",
        entryKey,
        value: String(entry.implementationStatus),
      });
    }

    const storageTargets = Array.isArray(entry.storageTargets) ? entry.storageTargets : [];
    if (entry.implementationStatus === "implemented_disabled" && storageTargets.length === 0) {
      issues.push({ code: "storage_target_missing", entryKey });
    }
    for (const storageTarget of storageTargets) {
      if (!isStorageTarget(storageTarget)) {
        issues.push({ code: "invalid_storage_target", entryKey, value: String(storageTarget) });
      }
    }

    if (!isContractKey(entry.purposeKey)) {
      issues.push({ code: "purpose_rule_missing", entryKey });
    }

    const processorKeys = Array.isArray(entry.processorKeys) ? entry.processorKeys : [];
    if (processorKeys.length === 0) {
      issues.push({ code: "processor_missing", entryKey });
    }
    if (new Set(processorKeys).size !== processorKeys.length) {
      issues.push({ code: "duplicate_processor", entryKey });
    }
    for (const processorKey of processorKeys) {
      const processor = knownProcessors.get(processorKey);
      if (!processor) {
        issues.push({ code: "unknown_processor", entryKey, value: String(processorKey) });
        continue;
      }
      coveredProcessors.add(processorKey);
      if (!isContractKey(processor.cleanupRuleKey)) {
        issues.push({ code: "processor_cleanup_rule_missing", entryKey, value: processorKey });
      }
    }

    if (!isContractKey(entry.retentionPolicyKey)) {
      issues.push({ code: "retention_policy_missing", entryKey });
    }
    if (!isContractKey(entry.exportRuleKey)) {
      issues.push({ code: "export_rule_missing", entryKey });
    }
    if (!isContractKey(entry.deletionRuleKey)) {
      issues.push({ code: "deletion_rule_missing", entryKey });
    }
  }

  const missingSurfaces = requiredSurfaces.filter((surface) => !surfaces.has(surface));
  const missingConsentScopes = requiredConsentScopes.filter((scope) => !scopes.has(scope));

  for (const surface of missingSurfaces) {
    issues.push({ code: "missing_surface_coverage", value: surface });
  }
  for (const scope of missingConsentScopes) {
    issues.push({ code: "missing_scope_coverage", value: scope });
  }

  return {
    valid: issues.length === 0,
    coveredSurfaces: CHILD_DATA_SURFACES.filter((surface) => surfaces.has(surface)),
    missingSurfaces,
    coveredConsentScopes: GUARDIAN_CONSENT_SCOPES.filter((scope) => scopes.has(scope)),
    missingConsentScopes,
    coveredProcessors: CHILD_DATA_PROCESSOR_KEYS.filter((key) => coveredProcessors.has(key)),
    issues,
  };
}

export function assertChildDataRegistryCoverage(
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
): void {
  const coverage = validateChildDataRegistryCoverage(entries);
  if (!coverage.valid) {
    const issueCodes = coverage.issues.map((issue) => issue.code).join(", ");
    throw new Error(`Child data registry coverage is incomplete: ${issueCodes}`);
  }
}

export type ChildDataStorageRegistrationCoverage = Readonly<{
  valid: boolean;
  registeredTargets: readonly string[];
  unregisteredTargets: readonly string[];
  unexpectedTargets: readonly string[];
}>;

export function validateChildDataStorageRegistration(
  codeOwnedTargets: readonly string[],
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
): ChildDataStorageRegistrationCoverage {
  const registeredTargets = [...new Set(entries.flatMap((entry) => entry.storageTargets))].sort();
  const expectedTargets = [...new Set(codeOwnedTargets)].sort();
  const registeredSet = new Set(registeredTargets);
  const expectedSet = new Set(expectedTargets);
  const unregisteredTargets = expectedTargets.filter((target) => !registeredSet.has(target));
  const unexpectedTargets = registeredTargets.filter((target) => !expectedSet.has(target));

  return {
    valid: unregisteredTargets.length === 0 && unexpectedTargets.length === 0,
    registeredTargets,
    unregisteredTargets,
    unexpectedTargets,
  };
}

export function assertChildDataStorageRegistration(
  codeOwnedTargets: readonly string[],
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
): void {
  const coverage = validateChildDataStorageRegistration(codeOwnedTargets, entries);
  if (!coverage.valid) {
    throw new Error(
      `Guardian storage registration is incomplete: unregistered=${coverage.unregisteredTargets.join(",")}; unexpected=${coverage.unexpectedTargets.join(",")}`,
    );
  }
}

export type ProcessorCleanupBinding = Readonly<{
  entryKey: string;
  processorKey: ChildDataProcessorKey;
}>;

export function requiredProcessorCleanupBindings(
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
  processors: readonly ChildDataProcessorRegistration[] = CHILD_DATA_PROCESSOR_REGISTRY,
): readonly ProcessorCleanupBinding[] {
  const processorKinds = new Map(processors.map((processor) => [
    processor.processorKey,
    processor.kind,
  ]));

  return Object.freeze(entries.flatMap((entry) => (
    entry.processorCleanupRequired
      ? entry.processorKeys
        .filter((processorKey) => processorKinds.get(processorKey) !== "first_party")
        .map((processorKey) => Object.freeze({ entryKey: entry.entryKey, processorKey }))
      : []
  )));
}

export type Under13ProcessorReadiness = Readonly<{
  ready: boolean;
  blockedProcessorKeys: readonly ChildDataProcessorKey[];
}>;

export function validateUnder13ProcessorReadiness(
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
  processors: readonly ChildDataProcessorRegistration[] = CHILD_DATA_PROCESSOR_REGISTRY,
): Under13ProcessorReadiness {
  const referenced = new Set(entries.flatMap((entry) => entry.processorKeys));
  const statuses = new Map(processors.map((processor) => [
    processor.processorKey,
    processor.under13Status,
  ]));
  const blockedProcessorKeys = CHILD_DATA_PROCESSOR_KEYS.filter((processorKey) => (
    referenced.has(processorKey) && statuses.get(processorKey) !== "approved"
  ));

  return {
    ready: blockedProcessorKeys.length === 0,
    blockedProcessorKeys,
  };
}

export type Under13RegistryReadiness = Readonly<{
  ready: boolean;
  structuralCoverageValid: boolean;
  incompleteEntryKeys: readonly string[];
  blockedProcessorKeys: readonly ChildDataProcessorKey[];
}>;

export function validateUnder13RegistryReadiness(
  entries: readonly ChildDataRegistryEntry[] = CHILD_DATA_REGISTRY,
  processors: readonly ChildDataProcessorRegistration[] = CHILD_DATA_PROCESSOR_REGISTRY,
): Under13RegistryReadiness {
  const coverage = validateChildDataRegistryCoverage(
    entries,
    CHILD_DATA_SURFACES,
    GUARDIAN_CONSENT_SCOPES,
    processors,
  );
  const incompleteEntryKeys = entries
    .filter((entry) => entry.implementationStatus !== "implemented_disabled")
    .map((entry) => entry.entryKey)
    .sort();
  const processorReadiness = validateUnder13ProcessorReadiness(entries, processors);

  return {
    ready:
      coverage.valid
      && incompleteEntryKeys.length === 0
      && processorReadiness.ready,
    structuralCoverageValid: coverage.valid,
    incompleteEntryKeys,
    blockedProcessorKeys: processorReadiness.blockedProcessorKeys,
  };
}

export function discoverGuardianChildDataStorageTargets(
  migrationSql: string,
): readonly string[] {
  const targets = [...migrationSql.matchAll(
    /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.((?:guardian|child_data)_[a-z0-9_]+)/giu,
  )].map((match) => `public.${match[1]}`);
  const governanceTargets = new Set<string>(CHILD_DATA_GOVERNANCE_STORAGE_TARGETS);
  const codeOwnedTargets = targets.filter((target) => !governanceTargets.has(target));

  if (/\bteen_guardian_permission_attested_at\b/iu.test(migrationSql)) {
    codeOwnedTargets.push("public.profiles.teen_guardian_permission");
  }

  return Object.freeze([...new Set(codeOwnedTargets)].sort());
}

function featureRegistryEntry(
  entryKey: string,
  surface: typeof CHILD_DATA_FEATURE_SURFACES[number],
  dataCategory: ChildDataCategory,
  consentScope: GuardianConsentScope,
  processorKeys: readonly ChildDataProcessorKey[],
): ChildDataRegistryEntry {
  return registryEntry({
    entryKey,
    surface,
    dataCategories: [dataCategory],
    consentScopes: [consentScope],
    implementationStatus: "collection_blocked",
    purposeKey: `${surface}_purpose_v1`,
    storageTargets: [],
    processorKeys,
    processorCleanupRequired: true,
    retentionPolicyKey: `${surface}_retention_v1`,
    exportRuleKey: `${surface}_export_v1`,
    deletionRuleKey: `${surface}_deletion_v1`,
    sqlFoundationSeeded: true,
  });
}

function registryEntry(input: {
  entryKey: string;
  surface: ChildDataSurface;
  dataCategories: readonly ChildDataCategory[];
  consentScopes: readonly GuardianConsentScope[];
  implementationStatus: ChildDataImplementationStatus;
  purposeKey: string;
  storageTargets: readonly string[];
  processorKeys: readonly ChildDataProcessorKey[];
  processorCleanupRequired: boolean;
  retentionPolicyKey: string;
  exportRuleKey: string;
  deletionRuleKey: string;
  sqlFoundationSeeded?: boolean;
}): ChildDataRegistryEntry {
  return Object.freeze({
    contractVersion: CHILD_DATA_REGISTRY_CONTRACT_VERSION,
    entryKey: input.entryKey,
    surface: input.surface,
    dataCategories: Object.freeze([...input.dataCategories]),
    consentScopes: Object.freeze([...input.consentScopes]),
    consentScopeVersions: versionGuardianConsentScopes(input.consentScopes),
    collectionEnabled: false as const,
    implementationStatus: input.implementationStatus,
    purposeKey: input.purposeKey,
    storageTargets: Object.freeze([...input.storageTargets]),
    processorKeys: Object.freeze([...input.processorKeys]),
    processorCleanupRequired: input.processorCleanupRequired,
    retentionPolicyKey: input.retentionPolicyKey,
    exportRuleKey: input.exportRuleKey,
    deletionRuleKey: input.deletionRuleKey,
    sqlFoundationSeeded: input.sqlFoundationSeeded ?? false,
  });
}

function processorRegistration(
  processorKey: ChildDataProcessorKey,
  kind: ChildDataProcessorRegistration["kind"],
  under13Status: ChildDataProcessorUnder13Status,
  cleanupRuleKey: string,
): ChildDataProcessorRegistration {
  return Object.freeze({ processorKey, kind, under13Status, cleanupRuleKey });
}

function validateConsentScopeVersions(
  entry: ChildDataRegistryEntry,
  issues: ChildDataRegistryCoverageIssue[],
): void {
  const versions = Array.isArray(entry.consentScopeVersions)
    ? entry.consentScopeVersions
    : [];
  const versionsByScope = new Map<GuardianConsentScope, string>();

  for (const grant of versions) {
    if (versionsByScope.has(grant.scope)) {
      issues.push({
        code: "unexpected_consent_scope_version",
        entryKey: entry.entryKey,
        value: grant.scope,
      });
      continue;
    }
    versionsByScope.set(grant.scope, grant.scopeVersion);
  }

  for (const scope of entry.consentScopes) {
    const scopeVersion = versionsByScope.get(scope);
    if (!scopeVersion) {
      issues.push({ code: "consent_scope_version_missing", entryKey: entry.entryKey, value: scope });
    } else if (scopeVersion !== GUARDIAN_CONSENT_SCOPE_VERSIONS[scope]) {
      issues.push({ code: "consent_scope_version_stale", entryKey: entry.entryKey, value: scope });
    }
  }

  for (const scope of versionsByScope.keys()) {
    if (!entry.consentScopes.includes(scope)) {
      issues.push({
        code: "unexpected_consent_scope_version",
        entryKey: entry.entryKey,
        value: scope,
      });
    }
  }
}

function isContractKey(value: unknown): value is string {
  return typeof value === "string"
    && /^[a-z0-9][a-z0-9_-]{1,119}$/u.test(value)
    && !value.includes("not_configured");
}

function isStorageTarget(value: unknown): value is string {
  return typeof value === "string"
    && /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/u.test(value);
}
