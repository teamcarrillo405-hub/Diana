import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  assertBetaFreshEvidenceTimestamp,
  assertBetaAttestationProducer,
  assertBetaAttestationSignature,
  type BetaAttestationProducer,
  type BetaAttestationSignature,
  type BetaAttestationTrustRegistrySource,
  verifyBetaAttestation,
} from "./attestations";
import {
  BETA_GATE_SCHEMA_VERSION,
  BETA_REQUIRED_NODE_ENGINE,
} from "./contracts";
import {
  BETA_EXTERNAL_EVIDENCE_KIND,
  assertBetaExternalEvidence,
  type BetaExternalEvidenceType,
} from "./external-evidence";
import { getBetaQaRunId } from "./qa-resources";
import { redactForEvidence } from "./redaction";
import { validateBetaReleaseSha, validateBetaStagingUrl } from "./release-validation";
import { validateBetaRunId } from "./run-id";

export const BETA_CERTIFICATION_KIND = "diana-beta-certification" as const;
export const BETA_CERTIFICATION_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const BETA_CERTIFICATION_EVIDENCE_KIND =
  "diana-beta-certification-evidence" as const;
export const BETA_HUMAN_APPROVAL_KIND = "diana-beta-human-approvals" as const;
export const BETA_NPM_CI_PROVENANCE_KIND =
  "diana-beta-npm-ci-provenance" as const;
export const BETA_NPM_CI_PROVENANCE_SCHEMA_VERSION = 1 as const;
export const BETA_CYCLONEDX_SBOM_EVIDENCE_KIND =
  "diana-beta-cyclonedx-sbom-evidence" as const;
export const BETA_CYCLONEDX_SBOM_EVIDENCE_SCHEMA_VERSION = 1 as const;
export const BETA_NPM_CI_COMMAND = [
  "npm",
  "ci",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  "--include=dev",
  "--include=optional",
  "--include=peer",
] as const;
export const BETA_CYCLONEDX_SBOM_COMMAND = [
  "npm",
  "sbom",
  "--package-lock-only",
  "--sbom-format",
  "cyclonedx",
  "--sbom-type",
  "application",
] as const;
export const BETA_CERTIFICATION_INPUT_ROOT = path.join(
  "artifacts",
  "beta-gate-inputs",
) as string;

export const BETA_CERTIFICATION_CHECKS = [
  "subjects",
  "browser",
  "lms-mock",
  "lms-staging",
  "lms-cleanup",
  "preview-identity",
  "migration-parity",
  "types-parity",
  "edge-parity",
  "edge-deployment-content",
  "database-restore",
  "security-scan",
  "dependency-audit",
  "npm-ci-provenance",
  "cyclonedx-sbom",
  "accessibility",
  "ai-smoke",
  "voice-smoke",
  "managed-voice-disabled",
  "ios-device",
  "android-device",
  "chromebook-device",
  "alerts-ready",
  "soak-72h",
] as const;

export type BetaCertificationCheck = (typeof BETA_CERTIFICATION_CHECKS)[number];

export const BETA_CERTIFICATION_ASSERTION_IDS = {
  subjects: ["corpus-complete", "expert-review-complete", "all-cases-pass"],
  browser: [],
  "lms-mock": ["provider-contracts-pass", "network-intercepted", "writes-none"],
  "lms-staging": [
    "provider-contracts-pass",
    "disposable-resources-only",
    "release-binding-confirmed",
  ],
  "lms-cleanup": ["inventory-complete", "resources-absent", "cleanup-reconciled"],
  "preview-identity": [
    "deployment-inspected",
    "served-sha-matched",
    "preview-origin-matched",
  ],
  "migration-parity": [
    "local-migrations-enumerated",
    "staging-migrations-enumerated",
    "migration-sets-match",
  ],
  "types-parity": ["generated-types-current", "staging-schema-matched"],
  "edge-parity": [
    "expected-functions-enumerated",
    "deployed-functions-enumerated",
    "function-names-match",
  ],
  "edge-deployment-content": [
    "deployment-manifest-current",
    "function-content-digests-match",
  ],
  "database-restore": [],
  "security-scan": [
    "secret-scan-pass",
    "static-analysis-pass",
    "high-severity-findings-zero",
  ],
  "dependency-audit": ["lockfile-scanned", "high-severity-vulnerabilities-zero"],
  "npm-ci-provenance": [],
  "cyclonedx-sbom": [],
  accessibility: ["automated-audit-pass", "keyboard-flow-pass", "screen-reader-flow-pass"],
  "ai-smoke": ["staging-authenticated", "response-received", "authorship-log-recorded"],
  "voice-smoke": ["staging-authenticated", "session-established", "session-cleanup-confirmed"],
  "managed-voice-disabled": [],
  "ios-device": [],
  "android-device": [],
  "chromebook-device": [],
  "alerts-ready": [],
  "soak-72h": [],
} as const satisfies Record<BetaCertificationCheck, readonly string[]>;

const EXTERNAL_EVIDENCE_TYPE_BY_CHECK = {
  subjects: null,
  browser: "authenticated-browser",
  "lms-mock": null,
  "lms-staging": null,
  "lms-cleanup": null,
  "preview-identity": null,
  "migration-parity": null,
  "types-parity": null,
  "edge-parity": null,
  "edge-deployment-content": null,
  "database-restore": "database-restore",
  "security-scan": null,
  "dependency-audit": null,
  "npm-ci-provenance": null,
  "cyclonedx-sbom": null,
  accessibility: null,
  "ai-smoke": null,
  "voice-smoke": null,
  "managed-voice-disabled": "managed-voice-disabled",
  "ios-device": "ios-device",
  "android-device": "android-device",
  "chromebook-device": "chromebook-device",
  "alerts-ready": "alerts-ready",
  "soak-72h": "soak-72h",
} as const satisfies Record<BetaCertificationCheck, BetaExternalEvidenceType | null>;

export const BETA_HUMAN_APPROVAL_IDS = [
  "product-owner",
  "privacy",
  "security",
  "teacher",
  "teen",
  "accessibility",
  "physical-devices",
  "operations",
] as const;

export type BetaHumanApprovalId = (typeof BETA_HUMAN_APPROVAL_IDS)[number];

export interface BetaCertificationEvidence {
  relativePath: string;
  sha256: string;
  byteCount: number;
}

export interface BetaCertificationSupplementalEvidence {
  kind: "cyclonedx-sbom" | "machine-evidence";
  filePath: string;
}

export interface BetaCertificationEvidenceAssertion {
  id: string;
  status: "pass" | "block";
  evidenceId: string;
  evidencePath: string;
  evidenceSha256: string;
  evidenceByteCount: number;
}

export interface BetaCertificationValidationContext {
  trustRegistry?: BetaAttestationTrustRegistrySource;
  now?: Date;
}

export interface BetaCertificationEvidencePayload {
  schemaVersion: typeof BETA_CERTIFICATION_EVIDENCE_SCHEMA_VERSION;
  kind: typeof BETA_CERTIFICATION_EVIDENCE_KIND;
  runId: string;
  qaRunId: string;
  check: BetaCertificationCheck;
  status: "pass" | "block";
  environment: "preview" | "staging";
  releaseSha: string;
  url: string;
  observedAt: string;
  sensitiveDataExcluded: true;
  assertions: BetaCertificationEvidenceAssertion[];
}

export interface BetaCertificationReceipt {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_CERTIFICATION_KIND;
  runId: string;
  qaRunId: string;
  check: BetaCertificationCheck;
  status: "pass" | "block";
  environment: "preview" | "staging";
  releaseSha: string;
  url: string;
  issuedAt: string;
  sensitiveDataExcluded: true;
  inspectionSha: string | null;
  servedSha: string | null;
  producer: BetaAttestationProducer;
  evidence: BetaCertificationEvidence;
  signature: BetaAttestationSignature;
}

export interface BetaHumanApproval {
  id: BetaHumanApprovalId;
  approved: boolean;
  approvedAt: string;
  producer: BetaAttestationProducer;
  signature: BetaAttestationSignature;
}

export interface BetaHumanApprovalReceipt {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_HUMAN_APPROVAL_KIND;
  runId: string;
  qaRunId: string;
  releaseSha: string;
  url: string;
  status: "approved" | "block";
  issuedAt: string;
  sensitiveDataExcluded: true;
  approvals: BetaHumanApproval[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const sortedExpected = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertIsoTimestamp(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
}

function assertEvidenceIdentifier(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9][a-z0-9:._-]{2,127}$/u.test(value) ||
    ["evidence", "generic", "none", "pass", "passed", "result"].includes(value)
  ) {
    throw new Error(`${label} must be a specific non-secret evidence identifier.`);
  }
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const NODE_PLATFORMS = new Set([
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "openbsd",
  "sunos",
  "win32",
]);

interface DependencySourceBinding {
  packageName: string;
  packageVersion: string;
  nodeEngine: typeof BETA_REQUIRED_NODE_ENGINE;
  npmVersion: string;
  packageJsonSha256: string;
  packageLockSha256: string;
}

interface NpmCiProvenancePayload {
  source: Record<string, unknown>;
  runtime: Record<string, unknown>;
}

interface CertificationEvidenceValidation {
  evidence: BetaCertificationEvidence;
  parsedEvidence: unknown;
  supplementalEvidence: BetaCertificationSupplementalEvidence[];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${stableJson(value[key])}`,
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readDependencySourceBinding(projectRootInput: string): DependencySourceBinding {
  const projectRoot = path.resolve(projectRootInput);
  const packagePath = path.join(projectRoot, "package.json");
  const lockPath = path.join(projectRoot, "package-lock.json");
  const packageJson = readFixedJson(packagePath, "package.json");
  const lockfile = readFixedJson(lockPath, "package-lock.json");
  if (!isRecord(packageJson) || !isRecord(lockfile)) {
    throw new Error("Dependency source files must contain JSON objects.");
  }
  const engines = isRecord(packageJson.engines) ? packageJson.engines : {};
  const npmVersion = typeof packageJson.packageManager === "string"
    ? /^npm@(\d+\.\d+\.\d+)$/u.exec(packageJson.packageManager)?.[1]
    : undefined;
  const packages = isRecord(lockfile.packages) ? lockfile.packages : {};
  const lockRoot = isRecord(packages[""]) ? packages[""] : {};
  if (
    typeof packageJson.name !== "string" ||
    packageJson.name.length === 0 ||
    typeof packageJson.version !== "string" ||
    packageJson.version.length === 0 ||
    engines.node !== BETA_REQUIRED_NODE_ENGINE ||
    typeof npmVersion !== "string" ||
    engines.npm !== npmVersion ||
    lockfile.lockfileVersion !== 3 ||
    lockfile.requires !== true ||
    lockfile.name !== packageJson.name ||
    lockfile.version !== packageJson.version ||
    lockRoot.name !== packageJson.name ||
    lockRoot.version !== packageJson.version
  ) {
    throw new Error("Dependency source metadata is not fixed to the release runtime and lockfile.");
  }
  return {
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    nodeEngine: BETA_REQUIRED_NODE_ENGINE,
    npmVersion,
    packageJsonSha256: sha256(readFileSync(packagePath)),
    packageLockSha256: sha256(readFileSync(lockPath)),
  };
}

function readReferencedEvidenceFile(
  inputDirectory: string,
  relativePath: unknown,
  expectedPattern: RegExp,
  expectedSha256: unknown,
  expectedByteCount: unknown,
  label: string,
): { bytes: Buffer; filePath: string } {
  if (
    typeof relativePath !== "string" ||
    !expectedPattern.test(relativePath) ||
    typeof expectedSha256 !== "string" ||
    !SHA256_PATTERN.test(expectedSha256) ||
    !Number.isSafeInteger(expectedByteCount) ||
    Number(expectedByteCount) <= 0
  ) {
    throw new Error(`${label} reference fields are invalid.`);
  }
  const filePath = path.resolve(inputDirectory, ...relativePath.split("/"));
  if (!filePath.startsWith(`${inputDirectory}${path.sep}`) || !existsSync(filePath)) {
    throw new Error(`${label} escaped its fixed input directory or is unavailable.`);
  }
  let currentPath = inputDirectory;
  for (const segment of relativePath.split("/")) {
    currentPath = path.join(currentPath, segment);
    const segmentStats = lstatSync(currentPath);
    if (segmentStats.isSymbolicLink()) {
      throw new Error(`${label} path cannot contain symbolic links.`);
    }
  }
  const stats = lstatSync(filePath);
  if (!stats.isFile() || stats.size !== expectedByteCount) {
    throw new Error(`${label} must be the exact referenced regular file.`);
  }
  const bytes = readFileSync(filePath);
  if (sha256(bytes) !== expectedSha256) {
    throw new Error(`${label} digest does not match the referenced file.`);
  }
  return { bytes, filePath };
}

interface CertificationEvidenceExpectation {
  runId: string;
  check: BetaCertificationCheck;
  status: "pass" | "block";
  environment: "preview" | "staging";
  releaseSha: string;
  url: string;
  issuedAt: string;
  validationTime: Date;
  trustRegistry?: BetaAttestationTrustRegistrySource;
}

function assertInternalCertificationEvidence(
  value: unknown,
  expected: CertificationEvidenceExpectation,
  projectRoot: string,
): BetaCertificationSupplementalEvidence[] {
  if (!isRecord(value)) throw new Error("Certification evidence payload must be an object.");
  assertExactKeys(value, [
    "schemaVersion",
    "kind",
    "runId",
    "qaRunId",
    "check",
    "status",
    "environment",
    "releaseSha",
    "url",
    "observedAt",
    "sensitiveDataExcluded",
    "assertions",
  ], "Certification evidence payload");
  if (
    value.schemaVersion !== BETA_CERTIFICATION_EVIDENCE_SCHEMA_VERSION ||
    value.kind !== BETA_CERTIFICATION_EVIDENCE_KIND ||
    value.runId !== expected.runId ||
    value.qaRunId !== getBetaQaRunId(expected.runId) ||
    value.check !== expected.check ||
    value.status !== expected.status ||
    value.environment !== expected.environment ||
    value.releaseSha !== expected.releaseSha ||
    value.url !== expected.url ||
    value.sensitiveDataExcluded !== true ||
    !Array.isArray(value.assertions)
  ) {
    throw new Error("Certification evidence payload does not match its signed receipt.");
  }
  assertBetaFreshEvidenceTimestamp(
    value.observedAt,
    "certificationEvidence.observedAt",
    expected.validationTime,
  );
  if (Date.parse(value.observedAt) > Date.parse(expected.issuedAt)) {
    throw new Error("Certification receipt cannot predate its evidence observation.");
  }

  const expectedAssertionIds = BETA_CERTIFICATION_ASSERTION_IDS[expected.check];
  if (value.assertions.length !== expectedAssertionIds.length) {
    throw new Error(`Certification evidence for ${expected.check} must contain every fixed assertion.`);
  }
  const inputDirectory = getBetaCertificationInputDirectory(
    projectRoot,
    expected.runId,
  );
  const supplementalEvidence: BetaCertificationSupplementalEvidence[] = [];
  const assertions = value.assertions.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`Certification evidence assertion ${index} must be an object.`);
    }
    assertExactKeys(
      candidate,
      [
        "id",
        "status",
        "evidenceId",
        "evidencePath",
        "evidenceSha256",
        "evidenceByteCount",
      ],
      `Certification evidence assertion ${index}`,
    );
    if (
      candidate.id !== expectedAssertionIds[index] ||
      !["pass", "block"].includes(String(candidate.status))
    ) {
      throw new Error(`Certification evidence for ${expected.check} has invalid assertions.`);
    }
    assertEvidenceIdentifier(
      candidate.evidenceId,
      `Certification evidence assertion ${index}.evidenceId`,
    );
    const evidencePath = `evidence/machine/${expected.check}/${String(candidate.id)}.json`;
    if (candidate.evidencePath !== evidencePath) {
      throw new Error(
        `Certification evidence assertion ${index} must use its fixed machine-evidence path.`,
      );
    }
    const referenced = readReferencedEvidenceFile(
      inputDirectory,
      candidate.evidencePath,
      /^evidence\/machine\/[a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9-]*\.json$/u,
      candidate.evidenceSha256,
      candidate.evidenceByteCount,
      `Certification evidence assertion ${index}`,
    );
    let parsedMachineEvidence: unknown;
    try {
      parsedMachineEvidence = JSON.parse(referenced.bytes.toString("utf8")) as unknown;
    } catch {
      throw new Error(`Certification evidence assertion ${index} must reference JSON output.`);
    }
    if (
      JSON.stringify(redactForEvidence(parsedMachineEvidence))
      !== JSON.stringify(parsedMachineEvidence)
    ) {
      throw new Error(`Certification evidence assertion ${index} contains sensitive data.`);
    }
    supplementalEvidence.push({ kind: "machine-evidence", filePath: referenced.filePath });
    return candidate as unknown as BetaCertificationEvidenceAssertion;
  });
  if (new Set(assertions.map((assertion) => assertion.evidenceId)).size !== assertions.length) {
    throw new Error("Certification evidence assertions must use distinct evidence identifiers.");
  }
  const allPassing = assertions.every((assertion) => assertion.status === "pass");
  if (value.status !== (allPassing ? "pass" : "block")) {
    throw new Error("Certification evidence status does not match its fixed assertions.");
  }
  return supplementalEvidence;
}

function assertNpmCiProvenanceEvidence(
  value: unknown,
  projectRoot: string,
): asserts value is NpmCiProvenancePayload {
  if (!isRecord(value)) throw new Error("npm ci provenance must be an object.");
  assertExactKeys(
    value,
    ["schemaVersion", "kind", "status", "install", "source", "runtime", "tree"],
    "npm ci provenance",
  );
  if (
    value.schemaVersion !== BETA_NPM_CI_PROVENANCE_SCHEMA_VERSION ||
    value.kind !== BETA_NPM_CI_PROVENANCE_KIND ||
    value.status !== "pass" ||
    !isRecord(value.install) ||
    !isRecord(value.source) ||
    !isRecord(value.runtime) ||
    !isRecord(value.tree)
  ) {
    throw new Error("npm ci provenance does not record a passing fixed install.");
  }

  assertExactKeys(value.install, [
    "command",
    "exitCode",
    "packageJsonUnchanged",
    "packageLockUnchanged",
    "lifecycleScriptsRun",
    "network",
  ], "npm ci install provenance");
  if (
    stableJson(value.install.command) !== stableJson(BETA_NPM_CI_COMMAND) ||
    value.install.exitCode !== 0 ||
    value.install.packageJsonUnchanged !== true ||
    value.install.packageLockUnchanged !== true ||
    value.install.lifecycleScriptsRun !== false ||
    value.install.network !== "registry-or-cache"
  ) {
    throw new Error("npm ci provenance must record the exact successful install boundary.");
  }

  const source = readDependencySourceBinding(projectRoot);
  assertExactKeys(value.source, [
    "packageJsonSha256",
    "packageLockSha256",
    "lockfileVersion",
  ], "npm ci source binding");
  if (
    value.source.packageJsonSha256 !== source.packageJsonSha256 ||
    value.source.packageLockSha256 !== source.packageLockSha256 ||
    value.source.lockfileVersion !== 3
  ) {
    throw new Error("npm ci provenance is not bound to the release package and lockfile bytes.");
  }

  assertExactKeys(value.runtime, [
    "nodeEngine",
    "nodeVersion",
    "nodeExecutableSha256",
    "npmVersion",
    "npmCliSha256",
    "platform",
    "arch",
  ], "npm ci runtime binding");
  if (
    value.runtime.nodeEngine !== source.nodeEngine ||
    typeof value.runtime.nodeVersion !== "string" ||
    !/^24\.\d+\.\d+$/u.test(value.runtime.nodeVersion) ||
    typeof value.runtime.nodeExecutableSha256 !== "string" ||
    !SHA256_PATTERN.test(value.runtime.nodeExecutableSha256) ||
    value.runtime.npmVersion !== source.npmVersion ||
    typeof value.runtime.npmCliSha256 !== "string" ||
    !SHA256_PATTERN.test(value.runtime.npmCliSha256) ||
    typeof value.runtime.platform !== "string" ||
    !NODE_PLATFORMS.has(value.runtime.platform) ||
    typeof value.runtime.arch !== "string" ||
    !/^[a-z0-9][a-z0-9_-]{1,31}$/u.test(value.runtime.arch)
  ) {
    throw new Error("npm ci provenance runtime does not match the fixed release runtime.");
  }

  assertExactKeys(value.tree, [
    "lockPackageCount",
    "installedPackageCount",
    "optionalPlaceholderCount",
    "optionalPeerPlaceholderCount",
    "peerPlaceholderCount",
  ], "npm ci tree result");
  const counts = [
    value.tree.lockPackageCount,
    value.tree.installedPackageCount,
    value.tree.optionalPlaceholderCount,
    value.tree.optionalPeerPlaceholderCount,
    value.tree.peerPlaceholderCount,
  ];
  if (
    counts.some((count) => !Number.isSafeInteger(count) || Number(count) < 0) ||
    Number(value.tree.lockPackageCount) === 0 ||
    Number(value.tree.installedPackageCount) > Number(value.tree.lockPackageCount)
  ) {
    throw new Error("npm ci provenance tree counts are invalid.");
  }
}

function assertCycloneDxDocument(
  value: unknown,
  source: DependencySourceBinding,
  observedNoLaterThan: string,
): void {
  if (!isRecord(value)) throw new Error("CycloneDX SBOM must be an object.");
  const metadata = isRecord(value.metadata) ? value.metadata : null;
  const component = metadata && isRecord(metadata.component)
    ? metadata.component
    : null;
  if (
    value["$schema"] !== "https://cyclonedx.org/schema/bom-1.5.schema.json" ||
    value.bomFormat !== "CycloneDX" ||
    value.specVersion !== "1.5" ||
    typeof value.serialNumber !== "string" ||
    !/^urn:uuid:[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(value.serialNumber) ||
    value.version !== 1 ||
    metadata === null ||
    component === null ||
    !Array.isArray(value.components) ||
    value.components.length === 0 ||
    !Array.isArray(value.dependencies) ||
    value.dependencies.length === 0
  ) {
    throw new Error("SBOM evidence must be a complete CycloneDX 1.5 document.");
  }
  assertIsoTimestamp(metadata.timestamp, "cyclonedx.metadata.timestamp");
  if (Date.parse(metadata.timestamp) > Date.parse(observedNoLaterThan)) {
    throw new Error("CycloneDX generation cannot postdate its signed certification.");
  }
  const npmToolPresent = Array.isArray(metadata.tools) && metadata.tools.some((tool) =>
    isRecord(tool) &&
    tool.vendor === "npm" &&
    tool.name === "cli" &&
    tool.version === source.npmVersion
  );
  const preBuildLifecyclePresent = Array.isArray(metadata.lifecycles) &&
    metadata.lifecycles.some((lifecycle) =>
      isRecord(lifecycle) && lifecycle.phase === "pre-build"
    );
  const rootRef = component["bom-ref"];
  if (
    !npmToolPresent ||
    !preBuildLifecyclePresent ||
    component.type !== "application" ||
    typeof component.name !== "string" ||
    component.name.toLowerCase() !== source.packageName.toLowerCase() ||
    component.version !== source.packageVersion ||
    component.purl !== `pkg:npm/${source.packageName}@${source.packageVersion}` ||
    typeof rootRef !== "string" ||
    !value.dependencies.some((dependency) =>
      isRecord(dependency) && dependency.ref === rootRef && Array.isArray(dependency.dependsOn)
    )
  ) {
    throw new Error("CycloneDX SBOM metadata does not match the release package and npm runtime.");
  }
  const componentRefs = value.components.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry["bom-ref"] !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.version !== "string"
    ) {
      throw new Error(`CycloneDX component ${index} is incomplete.`);
    }
    return entry["bom-ref"];
  });
  if (new Set(componentRefs).size !== componentRefs.length) {
    throw new Error("CycloneDX component references must be unique.");
  }
}

function assertCycloneDxSbomEvidence(
  value: unknown,
  projectRoot: string,
  expected: CertificationEvidenceExpectation,
): BetaCertificationSupplementalEvidence[] {
  if (!isRecord(value)) throw new Error("CycloneDX SBOM evidence must be an object.");
  assertExactKeys(value, [
    "schemaVersion",
    "kind",
    "runId",
    "releaseSha",
    "source",
    "runtime",
    "generator",
    "npmCiProvenanceSha256",
    "sbom",
  ], "CycloneDX SBOM evidence");
  if (
    value.schemaVersion !== BETA_CYCLONEDX_SBOM_EVIDENCE_SCHEMA_VERSION ||
    value.kind !== BETA_CYCLONEDX_SBOM_EVIDENCE_KIND ||
    value.runId !== expected.runId ||
    value.releaseSha !== expected.releaseSha ||
    !isRecord(value.source) ||
    !isRecord(value.runtime) ||
    !isRecord(value.generator) ||
    !isRecord(value.sbom)
  ) {
    throw new Error("CycloneDX SBOM evidence is not bound to the requested release SHA.");
  }
  if (expected.status !== "pass") {
    throw new Error("CycloneDX SBOM evidence can only back a passing certification.");
  }

  const provenanceReceipt = readBetaCertificationReceipt(
    projectRoot,
    expected.runId,
    "npm-ci-provenance",
    expected.releaseSha,
    expected.url,
    {
      trustRegistry: expected.trustRegistry,
      now: expected.validationTime,
    },
  );
  if (provenanceReceipt.status !== "pass") {
    throw new Error("CycloneDX SBOM requires passing npm ci provenance.");
  }
  const provenanceValidation = readCertificationEvidence(
    projectRoot,
    expected.runId,
    provenanceReceipt.evidence,
    {
      runId: expected.runId,
      check: "npm-ci-provenance",
      status: provenanceReceipt.status,
      environment: provenanceReceipt.environment,
      releaseSha: expected.releaseSha,
      url: expected.url,
      issuedAt: provenanceReceipt.issuedAt,
      validationTime: expected.validationTime,
      trustRegistry: expected.trustRegistry,
    },
  );
  const provenance = provenanceValidation.parsedEvidence as NpmCiProvenancePayload;
  if (
    value.npmCiProvenanceSha256 !== provenanceReceipt.evidence.sha256 ||
    stableJson(value.source) !== stableJson(provenance.source) ||
    stableJson(value.runtime) !== stableJson(provenance.runtime)
  ) {
    throw new Error("CycloneDX SBOM evidence does not match its npm ci provenance.");
  }
  assertExactKeys(value.generator, ["command", "npmVersion"], "CycloneDX generator");
  if (
    stableJson(value.generator.command) !== stableJson(BETA_CYCLONEDX_SBOM_COMMAND) ||
    value.generator.npmVersion !== provenance.runtime.npmVersion
  ) {
    throw new Error("CycloneDX SBOM was not generated by the fixed pinned npm command.");
  }
  assertExactKeys(value.sbom, ["relativePath", "sha256", "byteCount"], "CycloneDX SBOM file");
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, expected.runId);
  const sbomFile = readReferencedEvidenceFile(
    inputDirectory,
    value.sbom.relativePath,
    /^evidence\/[a-z0-9][a-z0-9._-]*\.cdx\.json$/u,
    value.sbom.sha256,
    value.sbom.byteCount,
    "CycloneDX SBOM file",
  );
  let parsedSbom: unknown;
  try {
    parsedSbom = JSON.parse(sbomFile.bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("CycloneDX SBOM file must contain valid JSON.");
  }
  if (JSON.stringify(redactForEvidence(parsedSbom)) !== JSON.stringify(parsedSbom)) {
    throw new Error("CycloneDX SBOM contains unredacted sensitive data.");
  }
  assertCycloneDxDocument(
    parsedSbom,
    readDependencySourceBinding(projectRoot),
    expected.issuedAt,
  );
  return [{ kind: "cyclonedx-sbom", filePath: sbomFile.filePath }];
}

function assertCertificationEvidenceSemantics(
  value: unknown,
  expected: CertificationEvidenceExpectation,
  projectRoot: string,
): BetaCertificationSupplementalEvidence[] {
  if (expected.check === "npm-ci-provenance") {
    if (expected.status !== "pass") {
      throw new Error("npm ci provenance can only back a passing certification.");
    }
    assertNpmCiProvenanceEvidence(value, projectRoot);
    return [];
  }
  if (expected.check === "cyclonedx-sbom") {
    return assertCycloneDxSbomEvidence(value, projectRoot, expected);
  }
  const externalEvidenceType = EXTERNAL_EVIDENCE_TYPE_BY_CHECK[expected.check];
  if (isRecord(value) && value.kind === BETA_EXTERNAL_EVIDENCE_KIND) {
    if (externalEvidenceType === null) {
      throw new Error(`${expected.check} does not accept external-evidence payloads.`);
    }
    assertBetaExternalEvidence(value, {
      runId: expected.runId,
      releaseSha: expected.releaseSha,
      url: expected.url,
      evidenceType: externalEvidenceType,
      now: expected.validationTime,
    });
    if (value.status !== expected.status) {
      throw new Error("External certification evidence status does not match its signed receipt.");
    }
    if (Date.parse(value.observedAt) > Date.parse(expected.issuedAt)) {
      throw new Error("Certification receipt cannot predate its external evidence observation.");
    }
    return [];
  }
  if (externalEvidenceType !== null) {
    throw new Error(
      `${expected.check} requires its detailed ${externalEvidenceType} external evidence payload.`,
    );
  }
  return assertInternalCertificationEvidence(value, expected, projectRoot);
}

function assertDirectory(directoryPath: string, label: string): void {
  const stats = lstatSync(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function readFixedJson(filePath: string, label: string): unknown {
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

export function betaCertificationAttestationPayload(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const { signature: _signature, ...unsigned } = value;
  return unsigned;
}

export function betaHumanApprovalAttestationPayload(
  receipt: Record<string, unknown>,
  approval: Record<string, unknown>,
): Record<string, unknown> {
  const { signature: _signature, ...unsignedApproval } = approval;
  return {
    schemaVersion: receipt.schemaVersion,
    kind: receipt.kind,
    runId: receipt.runId,
    qaRunId: receipt.qaRunId,
    releaseSha: receipt.releaseSha,
    url: receipt.url,
    issuedAt: receipt.issuedAt,
    sensitiveDataExcluded: receipt.sensitiveDataExcluded,
    approval: unsignedApproval,
  };
}

function readCertificationEvidence(
  projectRoot: string,
  runId: string,
  value: unknown,
  expected: CertificationEvidenceExpectation,
): CertificationEvidenceValidation {
  if (!isRecord(value)) throw new Error("Certification evidence must be an object.");
  assertExactKeys(value, ["relativePath", "sha256", "byteCount"], "Certification evidence");
  if (
    typeof value.relativePath !== "string" ||
    !/^evidence\/[a-z0-9][a-z0-9._-]*\.json$/u.test(value.relativePath) ||
    typeof value.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.sha256) ||
    !Number.isSafeInteger(value.byteCount) ||
    Number(value.byteCount) <= 0
  ) {
    throw new Error("Certification evidence fields are invalid.");
  }

  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
  const evidencePath = path.resolve(inputDirectory, ...value.relativePath.split("/"));
  if (!evidencePath.startsWith(`${inputDirectory}${path.sep}`) || !existsSync(evidencePath)) {
    throw new Error("Certification evidence escaped its fixed input directory or is unavailable.");
  }
  const stats = lstatSync(evidencePath);
  if (stats.isSymbolicLink() || !stats.isFile() || stats.size !== value.byteCount) {
    throw new Error("Certification evidence must be the exact referenced regular file.");
  }
  const evidenceBytes = readFileSync(evidencePath);
  const digest = createHash("sha256").update(evidenceBytes).digest("hex");
  if (digest !== value.sha256) {
    throw new Error("Certification evidence digest does not match the referenced file.");
  }
  let parsedEvidence: unknown;
  try {
    parsedEvidence = JSON.parse(evidenceBytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("Certification evidence must be valid redacted JSON.");
  }
  if (JSON.stringify(redactForEvidence(parsedEvidence)) !== JSON.stringify(parsedEvidence)) {
    throw new Error("Certification evidence contains unredacted sensitive data.");
  }
  const supplementalEvidence = assertCertificationEvidenceSemantics(
    parsedEvidence,
    expected,
    projectRoot,
  );
  return {
    evidence: value as unknown as BetaCertificationEvidence,
    parsedEvidence,
    supplementalEvidence,
  };
}

export function getBetaCertificationInputDirectory(
  projectRootInput: string,
  runIdInput: string,
): string {
  const projectRoot = path.resolve(projectRootInput);
  const runId = validateBetaRunId(runIdInput);
  const inputRoot = path.resolve(projectRoot, BETA_CERTIFICATION_INPUT_ROOT);
  const runDirectory = path.resolve(inputRoot, runId);
  if (path.dirname(runDirectory) !== inputRoot) {
    throw new Error("Certification input path escaped its fixed read-only root.");
  }
  return runDirectory;
}

function getFixedInputPath(
  projectRoot: string,
  runId: string,
  fileName: string,
): string {
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
  const inputRoot = path.dirname(inputDirectory);
  const artifactsRoot = path.dirname(inputRoot);
  if (!existsSync(artifactsRoot) || !existsSync(inputRoot) || !existsSync(inputDirectory)) {
    throw new Error("The fixed certification input directory is not available.");
  }
  assertDirectory(artifactsRoot, "Artifacts root");
  assertDirectory(inputRoot, "Certification input root");
  assertDirectory(inputDirectory, "Certification run input directory");
  const filePath = path.resolve(inputDirectory, fileName);
  if (path.dirname(filePath) !== inputDirectory) {
    throw new Error("Certification input file escaped its fixed read-only directory.");
  }
  if (!existsSync(filePath)) throw new Error(`Certification input ${fileName} is not available.`);
  return filePath;
}

export function assertBetaCertificationReceipt(
  projectRoot: string,
  value: unknown,
  expected: {
    runId: string;
    check: BetaCertificationCheck;
    releaseSha: string;
    url: string;
  },
  context: BetaCertificationValidationContext = {},
): asserts value is BetaCertificationReceipt {
  if (!isRecord(value)) throw new Error("Certification receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "check",
      "status",
      "environment",
      "releaseSha",
      "url",
      "issuedAt",
      "sensitiveDataExcluded",
      "inspectionSha",
      "servedSha",
      "producer",
      "evidence",
      "signature",
    ],
    "Certification receipt",
  );
  const runId = validateBetaRunId(expected.runId);
  const releaseSha = validateBetaReleaseSha(expected.releaseSha);
  const url = validateBetaStagingUrl(expected.url);
  if (
    value.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    value.kind !== BETA_CERTIFICATION_KIND ||
    value.runId !== runId ||
    value.qaRunId !== getBetaQaRunId(runId) ||
    value.check !== expected.check ||
    !["pass", "block"].includes(String(value.status)) ||
    !["preview", "staging"].includes(String(value.environment)) ||
    value.releaseSha !== releaseSha ||
    value.url !== url ||
    value.sensitiveDataExcluded !== true
  ) {
    throw new Error("Certification receipt does not match the requested staging release.");
  }
  const validationTime = context.now ?? new Date();
  assertBetaAttestationProducer(value.producer);
  assertBetaAttestationSignature(value.signature);
  verifyBetaAttestation({
    projectRoot,
    trustRegistry: context.trustRegistry,
    payload: betaCertificationAttestationPayload(value),
    producer: value.producer,
    signature: value.signature,
    purpose: `certification:${expected.check}`,
  });
  assertBetaFreshEvidenceTimestamp(
    value.issuedAt,
    "certification.issuedAt",
    validationTime,
  );
  readCertificationEvidence(projectRoot, runId, value.evidence, {
    runId,
    check: expected.check,
    status: value.status as "pass" | "block",
    environment: value.environment as "preview" | "staging",
    releaseSha,
    url,
    issuedAt: value.issuedAt,
    validationTime,
    trustRegistry: context.trustRegistry,
  });

  if (expected.check === "preview-identity") {
    if (value.inspectionSha !== releaseSha || value.servedSha !== releaseSha) {
      throw new Error("Preview identity receipt must bind inspected and served output to the release SHA.");
    }
  } else if (value.inspectionSha !== null || value.servedSha !== null) {
    throw new Error("Only preview identity may include inspected and served SHA fields.");
  }
  if (JSON.stringify(redactForEvidence(value)) !== JSON.stringify(value)) {
    throw new Error("Certification receipt contains unredacted sensitive data.");
  }
}

export function readBetaCertificationReceipt(
  projectRoot: string,
  runId: string,
  check: BetaCertificationCheck,
  releaseSha: string,
  url: string,
  context: BetaCertificationValidationContext = {},
): BetaCertificationReceipt {
  const filePath = getFixedInputPath(projectRoot, runId, `${check}.json`);
  const value = readFixedJson(filePath, "Certification receipt");
  assertBetaCertificationReceipt(
    projectRoot,
    value,
    { runId, check, releaseSha, url },
    context,
  );
  return value;
}

export function readBetaCertificationSupplementalEvidence(
  projectRoot: string,
  receipt: BetaCertificationReceipt,
  context: BetaCertificationValidationContext = {},
): BetaCertificationSupplementalEvidence[] {
  return readCertificationEvidence(
    projectRoot,
    receipt.runId,
    receipt.evidence,
    {
      runId: receipt.runId,
      check: receipt.check,
      status: receipt.status,
      environment: receipt.environment,
      releaseSha: receipt.releaseSha,
      url: receipt.url,
      issuedAt: receipt.issuedAt,
      validationTime: context.now ?? new Date(),
      trustRegistry: context.trustRegistry,
    },
  ).supplementalEvidence;
}

export function assertBetaHumanApprovalReceipt(
  projectRoot: string,
  value: unknown,
  expected: { runId: string; releaseSha: string; url: string },
  context: BetaCertificationValidationContext = {},
): asserts value is BetaHumanApprovalReceipt {
  if (!isRecord(value)) throw new Error("Human approval receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "releaseSha",
      "url",
      "status",
      "issuedAt",
      "sensitiveDataExcluded",
      "approvals",
    ],
    "Human approval receipt",
  );
  const runId = validateBetaRunId(expected.runId);
  const releaseSha = validateBetaReleaseSha(expected.releaseSha);
  const url = validateBetaStagingUrl(expected.url);
  if (
    value.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    value.kind !== BETA_HUMAN_APPROVAL_KIND ||
    value.runId !== runId ||
    value.qaRunId !== getBetaQaRunId(runId) ||
    value.releaseSha !== releaseSha ||
    value.url !== url ||
    !["approved", "block"].includes(String(value.status)) ||
    value.sensitiveDataExcluded !== true ||
    !Array.isArray(value.approvals)
  ) {
    throw new Error("Human approval receipt does not match the requested staging release.");
  }
  const validationTime = context.now ?? new Date();
  const verifiedApprovals = value.approvals.map((approval) => {
    if (!isRecord(approval)) throw new Error("Human approvals must be objects.");
    assertExactKeys(
      approval,
      ["id", "approved", "approvedAt", "producer", "signature"],
      "Human approval",
    );
    if (
      !BETA_HUMAN_APPROVAL_IDS.includes(approval.id as BetaHumanApprovalId) ||
      typeof approval.approved !== "boolean"
    ) {
      throw new Error("Human approval fields are invalid.");
    }
    assertBetaAttestationProducer(approval.producer);
    assertBetaAttestationSignature(approval.signature);
    const verified = verifyBetaAttestation({
      projectRoot,
      trustRegistry: context.trustRegistry,
      payload: betaHumanApprovalAttestationPayload(value, approval),
      producer: approval.producer,
      signature: approval.signature,
      purpose: `human-approval:${String(approval.id)}`,
    });
    return {
      approval: approval as unknown as BetaHumanApproval,
      verified,
    };
  });

  assertBetaFreshEvidenceTimestamp(
    value.issuedAt,
    "approvals.issuedAt",
    validationTime,
  );
  for (const { approval } of verifiedApprovals) {
    assertBetaFreshEvidenceTimestamp(
      approval.approvedAt,
      "approval.approvedAt",
      validationTime,
    );
    if (Date.parse(approval.approvedAt) > Date.parse(value.issuedAt)) {
      throw new Error("Human approval receipt cannot predate an approval.");
    }
    if (approval.producer.kind !== "human") {
      throw new Error("Every independent approval must be produced by a human identity.");
    }
  }
  const ids = verifiedApprovals.map(({ approval }) => approval.id);
  if (
    verifiedApprovals.length !== BETA_HUMAN_APPROVAL_IDS.length ||
    new Set(ids).size !== ids.length ||
    BETA_HUMAN_APPROVAL_IDS.some((id) => !ids.includes(id))
  ) {
    throw new Error("Human approval receipt must contain every fixed approval role exactly once.");
  }
  const producerIds = verifiedApprovals.map(({ approval }) => approval.producer.id);
  const keyIds = verifiedApprovals.map(({ approval }) => approval.signature.keyId);
  const verifiedKeyFingerprints = verifiedApprovals.map(
    ({ verified }) => verified.publicKeySha256,
  );
  if (
    new Set(producerIds).size !== verifiedApprovals.length
    || new Set(keyIds).size !== verifiedApprovals.length
    || new Set(verifiedKeyFingerprints).size !== verifiedApprovals.length
  ) {
    throw new Error(
      "Human approvals require distinct producer identities and distinct signing keys.",
    );
  }
  if (JSON.stringify(redactForEvidence(value)) !== JSON.stringify(value)) {
    throw new Error("Human approval receipt contains unredacted sensitive data.");
  }
  const allApproved = verifiedApprovals.every(
    ({ approval }) => approval.approved === true,
  );
  if (value.status !== (allApproved ? "approved" : "block")) {
    throw new Error("Human approval receipt status does not match its signed approvals.");
  }
}

export function readBetaHumanApprovalReceipt(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  url: string,
  context: BetaCertificationValidationContext = {},
): BetaHumanApprovalReceipt {
  const filePath = getFixedInputPath(projectRoot, runId, "human-approvals.json");
  const value = readFixedJson(filePath, "Human approval receipt");
  assertBetaHumanApprovalReceipt(
    projectRoot,
    value,
    { runId, releaseSha, url },
    context,
  );
  return value;
}
