import { createHash, createPublicKey, verify } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export type BetaEnvironment = Readonly<Record<string, string | undefined>>;

export const BETA_ATTESTATION_TRUST_ROOT_PATH =
  "config/beta-attestation-trust-root.json" as const;
export const BETA_ATTESTATION_KEY_REGISTRY_PATH =
  "config/beta-attestation-public-keys.json" as const;
export const BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV =
  "DIANA_BETA_ATTESTATION_TRUST_ROOT_SHA256" as const;
// Legacy names remain exported so inherited configuration can be rejected explicitly.
export const BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV =
  "DIANA_BETA_ATTESTATION_TRUST_REGISTRY_PATH" as const;
export const BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV =
  "DIANA_BETA_ATTESTATION_TRUST_REGISTRY_SHA256" as const;
export const BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION = 1 as const;
export const BETA_ATTESTATION_TRUST_ROOT_KIND =
  "diana-beta-attestation-trust-root" as const;
export const BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION = 2 as const;
export const BETA_ATTESTATION_KEY_REGISTRY_KIND =
  "diana-beta-attestation-public-keys" as const;
export const BETA_RELEASE_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const BETA_RELEASE_EVIDENCE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type BetaAttestationProducerKind = "automation" | "operator" | "human";

export interface BetaAttestationProducer {
  id: string;
  kind: BetaAttestationProducerKind;
  tool: string;
  version: string;
}

export interface BetaAttestationSignature {
  algorithm: "ed25519";
  keyId: string;
  value: string;
}

export interface BetaTrustedAttestationKey {
  keyId: string;
  subjectId: string;
  producerKinds: BetaAttestationProducerKind[];
  purposes: string[];
  publicKeyPem: string;
  status: "active" | "revoked";
  revokedAt: string | null;
}

export interface BetaAttestationTrustRegistrySource {
  registryPath: string;
  expectedSha256: string;
}

export interface BetaResolvedAttestationTrustRoot {
  trustRootPath: string;
  trustRootSha256: string;
  registryPath: string;
  registrySha256: string;
}

export interface BetaVerifiedAttestation {
  keyId: string;
  subjectId: string;
  publicKeySha256: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const wanted = [...expected].sort((left, right) => left.localeCompare(right));
  return JSON.stringify(actual) === JSON.stringify(wanted);
}

function validateContractKey(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9:._-]{1,127}$/u.test(value);
}

function validateSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string"
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function publicKeySha256(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const der = key.export({ format: "der", type: "spki" });
  return createHash("sha256").update(der).digest("hex");
}

function assertRegularFileWithoutSymlinkSegments(
  projectRoot: string,
  relativePath: string,
  label: string,
): string {
  const segments = relativePath.split("/");
  const resolved = path.resolve(projectRoot, ...segments);
  if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error(`${label} escaped the repository root.`);
  }
  let current = projectRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!existsSync(current)) throw new Error(`${label} is unavailable.`);
    const stats = lstatSync(current);
    if (stats.isSymbolicLink()) {
      throw new Error(`${label} path cannot contain symbolic links.`);
    }
  }
  if (!lstatSync(resolved).isFile()) {
    throw new Error(`${label} must be a regular file.`);
  }
  return resolved;
}

function assertNoCallerSelectedTrustRegistry(
  environment: BetaEnvironment,
): void {
  if (
    environment[BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV]?.trim()
    || environment[BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV]?.trim()
  ) {
    throw new Error(
      "Caller-selected beta trust-registry paths and digests are not permitted; use the repository trust root.",
    );
  }
}

export function resolveBetaAttestationTrustRoot(
  projectRootInput: string,
  environment: BetaEnvironment = process.env,
): BetaResolvedAttestationTrustRoot {
  assertNoCallerSelectedTrustRegistry(environment);
  const projectRoot = realpathSync(path.resolve(projectRootInput));
  const trustRootPath = assertRegularFileWithoutSymlinkSegments(
    projectRoot,
    BETA_ATTESTATION_TRUST_ROOT_PATH,
    "The beta attestation trust root",
  );
  const trustRootBytes = readFileSync(trustRootPath);
  const trustRootSha256 = createHash("sha256").update(trustRootBytes).digest("hex");
  const inheritedPin = environment[BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]?.trim();
  if (inheritedPin !== undefined && inheritedPin !== "") {
    if (!validateSha256(inheritedPin) || inheritedPin !== trustRootSha256) {
      throw new Error(
        "The repository beta attestation trust root does not match its validated parent or CI pin.",
      );
    }
  }

  let value: unknown;
  try {
    value = JSON.parse(trustRootBytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("The beta attestation trust root must contain valid JSON.");
  }
  if (
    !isRecord(value)
    || !exactKeys(value, [
      "schemaVersion",
      "kind",
      "registryPath",
      "registrySha256",
    ])
    || value.schemaVersion !== BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION
    || value.kind !== BETA_ATTESTATION_TRUST_ROOT_KIND
    || value.registryPath !== BETA_ATTESTATION_KEY_REGISTRY_PATH
    || !validateSha256(value.registrySha256)
  ) {
    throw new Error("The repository beta attestation trust root is invalid.");
  }

  const registryPath = assertRegularFileWithoutSymlinkSegments(
    projectRoot,
    BETA_ATTESTATION_KEY_REGISTRY_PATH,
    "The beta attestation key registry",
  );
  const registrySha256 = createHash("sha256")
    .update(readFileSync(registryPath))
    .digest("hex");
  if (registrySha256 !== value.registrySha256) {
    throw new Error(
      "The beta attestation key registry does not match the immutable repository trust root.",
    );
  }
  return {
    trustRootPath,
    trustRootSha256,
    registryPath,
    registrySha256,
  };
}

export function resolveProtectedBetaAttestationTrustRoot(
  projectRootInput: string,
  environment: BetaEnvironment = process.env,
): BetaResolvedAttestationTrustRoot {
  const inheritedPin = environment[BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]?.trim();
  if (!inheritedPin) {
    throw new Error(
      `Protected beta attestation verification requires ${BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV}.`,
    );
  }
  return resolveBetaAttestationTrustRoot(projectRootInput, environment);
}

export function assertBetaFreshEvidenceTimestamp(
  value: unknown,
  label: string,
  referenceTime: Date = new Date(),
): asserts value is string {
  if (!isIsoTimestamp(value) || Number.isNaN(referenceTime.getTime())) {
    throw new Error(`${label} must be an ISO timestamp with a valid reference time.`);
  }
  const timestamp = Date.parse(value);
  if (timestamp > referenceTime.getTime() + BETA_RELEASE_CLOCK_SKEW_MS) {
    throw new Error(`${label} is later than the permitted clock skew.`);
  }
  if (timestamp < referenceTime.getTime() - BETA_RELEASE_EVIDENCE_MAX_AGE_MS) {
    throw new Error(`${label} is stale for release evidence.`);
  }
}

export function assertBetaTimestampNotFuture(
  value: unknown,
  label: string,
  referenceTime: Date = new Date(),
): asserts value is string {
  if (!isIsoTimestamp(value) || Number.isNaN(referenceTime.getTime())) {
    throw new Error(`${label} must be an ISO timestamp with a valid reference time.`);
  }
  if (Date.parse(value) > referenceTime.getTime() + BETA_RELEASE_CLOCK_SKEW_MS) {
    throw new Error(`${label} is later than the permitted clock skew.`);
  }
}

export function canonicalizeBetaAttestation(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeBetaAttestation(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${canonicalizeBetaAttestation(record[key])}`);
  return `{${entries.join(",")}}`;
}

export function readBetaTrustedAttestationKeys(
  projectRootInput: string,
  trustRegistryInput?: BetaAttestationTrustRegistrySource,
): BetaTrustedAttestationKey[] {
  const trustRoot = resolveBetaAttestationTrustRoot(projectRootInput);
  if (trustRegistryInput !== undefined) {
    if (
      path.resolve(trustRegistryInput.registryPath) !== trustRoot.registryPath
      || trustRegistryInput.expectedSha256 !== trustRoot.registrySha256
    ) {
      throw new Error(
        "A caller cannot replace the repository-controlled beta attestation trust registry or its digest.",
      );
    }
  }
  const bytes = readFileSync(trustRoot.registryPath);

  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    throw new Error("The beta attestation key registry must contain valid JSON.");
  }
  if (
    !isRecord(value) ||
    !exactKeys(value, ["schemaVersion", "kind", "keys"]) ||
    value.schemaVersion !== BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION ||
    value.kind !== BETA_ATTESTATION_KEY_REGISTRY_KIND ||
    !Array.isArray(value.keys)
  ) {
    throw new Error("The beta attestation key registry is invalid.");
  }

  const keys = value.keys.map((candidate) => {
    if (
      !isRecord(candidate) ||
      !exactKeys(candidate, [
        "keyId",
        "subjectId",
        "producerKinds",
        "purposes",
        "publicKeyPem",
        "status",
        "revokedAt",
      ]) ||
      !validateContractKey(candidate.keyId) ||
      !validateContractKey(candidate.subjectId) ||
      !Array.isArray(candidate.producerKinds) ||
      candidate.producerKinds.length === 0 ||
      !candidate.producerKinds.every((kind) =>
        ["automation", "operator", "human"].includes(String(kind))) ||
      !Array.isArray(candidate.purposes) ||
      candidate.purposes.length === 0 ||
      !candidate.purposes.every(validateContractKey) ||
      typeof candidate.publicKeyPem !== "string" ||
      !candidate.publicKeyPem.includes("BEGIN PUBLIC KEY") ||
      !["active", "revoked"].includes(String(candidate.status)) ||
      (candidate.status === "active" && candidate.revokedAt !== null) ||
      (candidate.status === "revoked" && !isIsoTimestamp(candidate.revokedAt))
    ) {
      throw new Error("The beta attestation key registry contains an invalid key.");
    }
    const producerKinds = candidate.producerKinds as string[];
    const purposes = candidate.purposes as string[];
    if (
      new Set(producerKinds).size !== producerKinds.length
      || new Set(purposes).size !== purposes.length
    ) {
      throw new Error("Beta attestation key roles and purposes must be unique.");
    }
    const hasHumanApprovalPurpose = purposes.some((purpose) =>
      purpose.startsWith("human-approval:"));
    const hasExpertReviewPurpose = purposes.includes("evaluation:expert-review");
    const hasModelExecutionPurpose = purposes.includes("evaluation:model-execution");
    if (
      hasHumanApprovalPurpose
      && (
        producerKinds.length !== 1
        || producerKinds[0] !== "human"
        || purposes.some((purpose) => !purpose.startsWith("human-approval:"))
      )
    ) {
      throw new Error(
        "Beta attestation producer and human-approver key roles must be separated.",
      );
    }
    if (
      hasExpertReviewPurpose
      && (producerKinds.length !== 1 || producerKinds[0] !== "human")
    ) {
      throw new Error(
        "Educational expert-review keys must belong only to a human producer identity.",
      );
    }
    if (
      hasModelExecutionPurpose
      && (producerKinds.length !== 1 || producerKinds[0] !== "automation")
    ) {
      throw new Error(
        "Educational model-execution keys must belong only to an automation producer identity.",
      );
    }
    try {
      const publicKey = createPublicKey(candidate.publicKeyPem);
      if (publicKey.asymmetricKeyType !== "ed25519") throw new Error("not ed25519");
    } catch {
      throw new Error("The beta attestation registry contains a non-Ed25519 key.");
    }
    return candidate as unknown as BetaTrustedAttestationKey;
  });
  if (new Set(keys.map((key) => key.keyId)).size !== keys.length) {
    throw new Error("Beta attestation key IDs must be unique.");
  }
  if (new Set(keys.map((key) => publicKeySha256(key.publicKeyPem))).size !== keys.length) {
    throw new Error(
      "Beta attestation public keys must be unique across producer and approver identities.",
    );
  }
  return keys;
}

export function betaAttestationTrustRegistryFromEnvironment(
  projectRootInput: string,
  environment: BetaEnvironment = process.env,
): BetaAttestationTrustRegistrySource {
  const trustRoot = resolveBetaAttestationTrustRoot(projectRootInput, environment);
  return {
    registryPath: trustRoot.registryPath,
    expectedSha256: trustRoot.registrySha256,
  };
}

export function assertBetaAttestationProducer(
  value: unknown,
): asserts value is BetaAttestationProducer {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["id", "kind", "tool", "version"]) ||
    !validateContractKey(value.id) ||
    !["automation", "operator", "human"].includes(String(value.kind)) ||
    !validateContractKey(value.tool) ||
    typeof value.version !== "string" ||
    value.version.trim().length === 0 ||
    value.version.length > 80
  ) {
    throw new Error("Beta attestation producer is invalid.");
  }
}

export function assertBetaAttestationSignature(
  value: unknown,
): asserts value is BetaAttestationSignature {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["algorithm", "keyId", "value"]) ||
    value.algorithm !== "ed25519" ||
    !validateContractKey(value.keyId) ||
    typeof value.value !== "string" ||
    !/^[A-Za-z0-9+/]{86}==$/u.test(value.value)
  ) {
    throw new Error("Beta attestation signature is invalid.");
  }
}

export function verifyBetaAttestation(input: {
  projectRoot: string;
  trustRegistry?: BetaAttestationTrustRegistrySource;
  payload: unknown;
  producer: BetaAttestationProducer;
  signature: BetaAttestationSignature;
  purpose: string;
}): BetaVerifiedAttestation {
  assertBetaAttestationProducer(input.producer);
  assertBetaAttestationSignature(input.signature);
  if (!validateContractKey(input.purpose)) throw new Error("Beta attestation purpose is invalid.");
  const key = readBetaTrustedAttestationKeys(input.projectRoot, input.trustRegistry)
    .find((candidate) => candidate.keyId === input.signature.keyId);
  if (
    !key ||
    key.subjectId !== input.producer.id ||
    !key.producerKinds.includes(input.producer.kind) ||
    !key.purposes.includes(input.purpose)
  ) {
    throw new Error("Beta attestation signer is not trusted for this purpose.");
  }
  if (key.status !== "active") {
    throw new Error("Beta attestation signer has been revoked.");
  }
  const valid = verify(
    null,
    Buffer.from(canonicalizeBetaAttestation(input.payload), "utf8"),
    createPublicKey(key.publicKeyPem),
    Buffer.from(input.signature.value, "base64"),
  );
  if (!valid) throw new Error("Beta attestation signature could not be verified.");
  return {
    keyId: key.keyId,
    subjectId: key.subjectId,
    publicKeySha256: publicKeySha256(key.publicKeyPem),
  };
}
