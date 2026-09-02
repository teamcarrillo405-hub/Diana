import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BETA_ATTESTATION_KEY_REGISTRY_KIND,
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV,
  BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV,
  BETA_ATTESTATION_TRUST_ROOT_KIND,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
  BETA_RELEASE_CLOCK_SKEW_MS,
  BETA_RELEASE_EVIDENCE_MAX_AGE_MS,
  assertBetaFreshEvidenceTimestamp,
  betaAttestationTrustRegistryFromEnvironment,
  canonicalizeBetaAttestation,
  readBetaTrustedAttestationKeys,
  resolveProtectedBetaAttestationTrustRoot,
  resolveBetaAttestationTrustRoot,
  verifyBetaAttestation,
  type BetaAttestationProducer,
  type BetaAttestationTrustRegistrySource,
  type BetaTrustedAttestationKey,
} from "./attestations";

const roots: string[] = [];
const REFERENCE_TIME = new Date("2026-09-01T20:00:00.000Z");
const PRODUCER: BetaAttestationProducer = {
  id: "release-producer",
  kind: "automation",
  tool: "release-test",
  version: "1.0.0",
};

function trustedKey(
  publicKey: KeyObject,
  overrides: Partial<BetaTrustedAttestationKey> = {},
): BetaTrustedAttestationKey {
  return {
    keyId: "release-producer-key",
    subjectId: PRODUCER.id,
    producerKinds: [PRODUCER.kind],
    purposes: ["release-finalization"],
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    status: "active",
    revokedAt: null,
    ...overrides,
  };
}

function writeRegistry(keys: BetaTrustedAttestationKey[]): {
  projectRoot: string;
  trustRegistry: BetaAttestationTrustRegistrySource;
} {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-attestation-"));
  roots.push(projectRoot);
  const registryPath = path.join(
    projectRoot,
    ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/"),
  );
  mkdirSync(path.dirname(registryPath), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify({
    schemaVersion: BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
    kind: BETA_ATTESTATION_KEY_REGISTRY_KIND,
    keys,
  }, null, 2)}\n`);
  writeFileSync(registryPath, bytes);
  writeFileSync(
    path.join(projectRoot, ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/")),
    `${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_TRUST_ROOT_KIND,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      registrySha256: createHash("sha256").update(bytes).digest("hex"),
    }, null, 2)}\n`,
  );
  return {
    projectRoot,
    trustRegistry: {
      registryPath,
      expectedSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("beta attestation trust", () => {
  it("rejects caller-selected registries and enforces the repository trust-root pin", () => {
    const pair = generateKeyPairSync("ed25519");
    const { projectRoot, trustRegistry } = writeRegistry([trustedKey(pair.publicKey)]);
    const attackerRegistry = path.join(projectRoot, "attacker-keys.json");
    writeFileSync(attackerRegistry, "{}\n");
    expect(() => readBetaTrustedAttestationKeys(projectRoot, {
      registryPath: attackerRegistry,
      expectedSha256: createHash("sha256").update("{}\n").digest("hex"),
    })).toThrow(/cannot replace.*repository-controlled/iu);
    expect(() => betaAttestationTrustRegistryFromEnvironment(projectRoot, {
      NODE_ENV: "test",
      [BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV]: trustRegistry.registryPath,
      [BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV]: trustRegistry.expectedSha256,
    })).toThrow(/caller-selected/iu);

    const resolved = resolveBetaAttestationTrustRoot(projectRoot);
    expect(() => resolveBetaAttestationTrustRoot(projectRoot, {
      NODE_ENV: "test",
      [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "0".repeat(64),
    })).toThrow(/does not match.*pin/iu);
    expect(betaAttestationTrustRegistryFromEnvironment(projectRoot, {
      NODE_ENV: "test",
      [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: resolved.trustRootSha256,
    })).toEqual(trustRegistry);
  });

  it("requires the fixed trust-root pin only for protected verification", () => {
    const pair = generateKeyPairSync("ed25519");
    const { projectRoot } = writeRegistry([trustedKey(pair.publicKey)]);
    const resolved = resolveBetaAttestationTrustRoot(projectRoot, {
      NODE_ENV: "test",
    });

    expect(resolved.registryPath).toBe(path.join(
      projectRoot,
      ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/"),
    ));
    expect(() => resolveProtectedBetaAttestationTrustRoot(projectRoot, {
      NODE_ENV: "test",
    })).toThrow(new RegExp(BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV, "u"));
    expect(() => resolveProtectedBetaAttestationTrustRoot(projectRoot, {
      NODE_ENV: "test",
      [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "0".repeat(64),
    })).toThrow(/does not match.*pin/iu);
    expect(resolveProtectedBetaAttestationTrustRoot(projectRoot, {
      NODE_ENV: "test",
      [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: resolved.trustRootSha256,
    })).toEqual(resolved);
  });

  it("rejects a valid signature after its trusted key is revoked", () => {
    const pair = generateKeyPairSync("ed25519");
    const { projectRoot, trustRegistry } = writeRegistry([trustedKey(pair.publicKey, {
      status: "revoked",
      revokedAt: "2026-09-01T19:00:00.000Z",
    })]);
    const payload = { releaseSha: "a".repeat(40), status: "pass" };
    const signature = sign(
      null,
      Buffer.from(canonicalizeBetaAttestation(payload), "utf8"),
      pair.privateKey,
    ).toString("base64");

    expect(() => verifyBetaAttestation({
      projectRoot,
      trustRegistry,
      payload,
      producer: PRODUCER,
      signature: {
        algorithm: "ed25519",
        keyId: "release-producer-key",
        value: signature,
      },
      purpose: "release-finalization",
    })).toThrow(/revoked/iu);
  });

  it("rejects a registry changed without a repository trust-root update", () => {
    const pair = generateKeyPairSync("ed25519");
    const { projectRoot, trustRegistry } = writeRegistry([trustedKey(pair.publicKey)]);
    writeFileSync(trustRegistry.registryPath, "{}\n");
    expect(() => readBetaTrustedAttestationKeys(projectRoot))
      .toThrow(/does not match the immutable repository trust root/iu);
  });

  it("rejects producer and approver key overlap, including key aliases", () => {
    const pair = generateKeyPairSync("ed25519");
    const mixed = writeRegistry([trustedKey(pair.publicKey, {
      producerKinds: ["automation", "human"],
      purposes: ["release-finalization", "human-approval:product-owner"],
    })]);
    expect(() => readBetaTrustedAttestationKeys(
      mixed.projectRoot,
      mixed.trustRegistry,
    )).toThrow(/producer and human-approver key roles must be separated/iu);

    const aliased = writeRegistry([
      trustedKey(pair.publicKey),
      trustedKey(pair.publicKey, {
        keyId: "product-owner-key",
        subjectId: "product-owner",
        producerKinds: ["human"],
        purposes: ["human-approval:product-owner"],
      }),
    ]);
    expect(() => readBetaTrustedAttestationKeys(
      aliased.projectRoot,
      aliased.trustRegistry,
    )).toThrow(/public keys must be unique/iu);
  });

  it("rejects payload tampering before accepting a trusted signature", () => {
    const pair = generateKeyPairSync("ed25519");
    const { projectRoot, trustRegistry } = writeRegistry([trustedKey(pair.publicKey)]);
    const signedPayload = { releaseSha: "a".repeat(40), status: "pass" };
    const signature = sign(
      null,
      Buffer.from(canonicalizeBetaAttestation(signedPayload), "utf8"),
      pair.privateKey,
    ).toString("base64");

    expect(() => verifyBetaAttestation({
      projectRoot,
      trustRegistry,
      payload: { ...signedPayload, status: "block" },
      producer: PRODUCER,
      signature: {
        algorithm: "ed25519",
        keyId: "release-producer-key",
        value: signature,
      },
      purpose: "release-finalization",
    })).toThrow(/signature could not be verified/iu);
  });

  it("rejects future and stale release-evidence timestamps", () => {
    const future = new Date(
      REFERENCE_TIME.getTime() + BETA_RELEASE_CLOCK_SKEW_MS + 1,
    ).toISOString();
    const stale = new Date(
      REFERENCE_TIME.getTime() - BETA_RELEASE_EVIDENCE_MAX_AGE_MS - 1,
    ).toISOString();

    expect(() => assertBetaFreshEvidenceTimestamp(
      future,
      "evidence.observedAt",
      REFERENCE_TIME,
    )).toThrow(/clock skew/iu);
    expect(() => assertBetaFreshEvidenceTimestamp(
      stale,
      "evidence.observedAt",
      REFERENCE_TIME,
    )).toThrow(/stale/iu);
  });
});
