import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertStagingDeploymentGuards,
  type DeploymentGitRunner,
} from "../../scripts/deploy-staging-edge-functions";
import {
  createStagingEdgeDeploymentReceipt,
  fingerprintEdgeFunctionSource,
  parseRemoteFunctionMetadataJson,
  parseStagingEdgeDeploymentReceipt,
  serializeStagingEdgeDeploymentReceipt,
} from "../../scripts/edge-function-deployment-manifest";
import {
  edgeFunctionManifestSha256,
  parseEdgeFunctionManifest,
} from "../../scripts/edge-function-inventory";
import {
  compareEdgeFunctionContentParity,
  parseCliOptions,
} from "../../scripts/edge-function-parity";

const PROJECT_REF = "abcdefghijklmnopqrst";
const PRODUCTION_PROJECT_REF = "zyxwvutsrqponmlkjihg";
const RELEASE_SHA = "a".repeat(40);
const SOURCE_FINGERPRINT = "b".repeat(64);
const REMOTE_HASH = "c".repeat(64);
const CREATED_AT = "2026-08-31T07:00:00.000Z";
const TEST_MANIFEST = parseEdgeFunctionManifest(JSON.stringify({
  schema: "diana-edge-function-manifest",
  schemaVersion: 1,
  functions: [{ name: "alpha", classification: "managed" }],
}));
const TEST_MANIFEST_SHA256 = edgeFunctionManifestSha256(TEST_MANIFEST);

function cleanGitRunner(options: {
  headSha?: string;
  status?: string;
} = {}): DeploymentGitRunner {
  return (args) => {
    if (args[0] === "cat-file") {
      return { status: 0, stdout: "commit\n", stderr: "" };
    }
    if (args[0] === "rev-parse") {
      return { status: 0, stdout: `${options.headSha ?? RELEASE_SHA}\n`, stderr: "" };
    }
    if (args[0] === "status") {
      return { status: 0, stdout: options.status ?? "", stderr: "" };
    }
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };
}

function makeReceipt(functionManifestSha256 = TEST_MANIFEST_SHA256) {
  return createStagingEdgeDeploymentReceipt({
    projectRef: PROJECT_REF,
    releaseSha: RELEASE_SHA,
    createdAt: CREATED_AT,
    functionManifestSha256,
    localSources: [{
      name: "alpha",
      sourceFingerprint: SOURCE_FINGERPRINT,
      sourceFiles: ["alpha/index.ts", "_shared/auth.ts"],
    }],
    remoteFunctions: [{
      name: "alpha",
      version: 7,
      ezbrSha256: REMOTE_HASH,
    }],
  });
}

describe("Edge Function source fingerprints", () => {
  it("hashes the entrypoint and recursive repository-local imports deterministically", () => {
    const functionsRoot = mkdtempSync(join(tmpdir(), "edge-function-source-"));

    try {
      mkdirSync(join(functionsRoot, "_shared"));
      mkdirSync(join(functionsRoot, "alpha"));
      mkdirSync(join(functionsRoot, "alias"));
      writeFileSync(
        join(functionsRoot, "_shared", "nested.ts"),
        "export const nested = 1;\r\n",
      );
      writeFileSync(
        join(functionsRoot, "_shared", "core.ts"),
        'export { nested } from "./nested.ts";\r\n',
      );
      writeFileSync(
        join(functionsRoot, "_shared", "unreferenced.ts"),
        "export const ignored = true;\n",
      );
      writeFileSync(
        join(functionsRoot, "alpha", "index.ts"),
        'import { nested } from "../_shared/core.ts";\r\nexport default nested;\r\n',
      );
      writeFileSync(
        join(functionsRoot, "alias", "index.ts"),
        'import "../alpha/index.ts";\n',
      );

      const first = fingerprintEdgeFunctionSource(functionsRoot, "alpha");
      const alias = fingerprintEdgeFunctionSource(functionsRoot, "alias");
      expect(first.sourceFiles).toEqual([
        "_shared/core.ts",
        "_shared/nested.ts",
        "alpha/index.ts",
      ]);
      expect(alias.sourceFiles).toEqual([
        "_shared/core.ts",
        "_shared/nested.ts",
        "alias/index.ts",
        "alpha/index.ts",
      ]);

      writeFileSync(
        join(functionsRoot, "_shared", "nested.ts"),
        "export const nested = 1;\n",
      );
      writeFileSync(
        join(functionsRoot, "alpha", "index.ts"),
        'import { nested } from "../_shared/core.ts";\nexport default nested;\n',
      );
      expect(fingerprintEdgeFunctionSource(functionsRoot, "alpha").sourceFingerprint)
        .toBe(first.sourceFingerprint);

      writeFileSync(
        join(functionsRoot, "_shared", "nested.ts"),
        "export const nested = 2;\n",
      );
      expect(fingerprintEdgeFunctionSource(functionsRoot, "alpha").sourceFingerprint)
        .not.toBe(first.sourceFingerprint);
    } finally {
      rmSync(functionsRoot, { recursive: true, force: true });
    }
  });
});

describe("staging Edge Function deployment receipt", () => {
  it("parses remote version and ezbr_sha256 metadata strictly", () => {
    const metadata = parseRemoteFunctionMetadataJson(JSON.stringify([{
      slug: "alpha",
      version: 7,
      ezbr_sha256: REMOTE_HASH.toUpperCase(),
    }]));

    expect(metadata).toEqual([{
      name: "alpha",
      version: 7,
      ezbrSha256: REMOTE_HASH,
    }]);
    expect(() => parseRemoteFunctionMetadataJson(JSON.stringify([{
      slug: "alpha",
      version: 7,
    }]))).toThrow("ezbr_sha256");
  });

  it("serializes only the versioned redacted receipt contract", () => {
    const serialized = serializeStagingEdgeDeploymentReceipt(makeReceipt());
    const parsed = parseStagingEdgeDeploymentReceipt(serialized);

    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.environment).toBe("staging");
    expect(parsed.sensitiveDataExcluded).toBe(true);
    expect(parsed.functionManifestSha256).toBe(TEST_MANIFEST_SHA256);
    expect(serialized).not.toMatch(/access.?token|service.?role|secret/iu);

    const withSecretField = JSON.parse(serialized) as Record<string, unknown>;
    withSecretField.accessToken = "must-not-be-recorded";
    expect(() => parseStagingEdgeDeploymentReceipt(JSON.stringify(withSecretField)))
      .toThrow("must contain only");

    const unsupportedVersion = JSON.parse(serialized) as Record<string, unknown>;
    unsupportedVersion.schemaVersion = 1;
    expect(() => parseStagingEdgeDeploymentReceipt(JSON.stringify(unsupportedVersion)))
      .toThrow("version is unsupported");
  });
});

describe("content-level Edge Function parity", () => {
  it("passes only when current source and live metadata match the receipt", () => {
    const report = compareEdgeFunctionContentParity({
      manifest: TEST_MANIFEST,
      expectedProjectRef: PROJECT_REF,
      expectedReleaseSha: RELEASE_SHA,
      localFunctionNames: ["alpha"],
      localFunctions: [{
        name: "alpha",
        sourceFingerprint: SOURCE_FINGERPRINT,
        sourceFiles: ["alpha/index.ts"],
      }],
      remoteFunctions: [{ name: "alpha", version: 7, ezbrSha256: REMOTE_HASH }],
      receipt: makeReceipt(),
    });

    expect(report.status).toBe("pass");
    expect(report.mode).toBe("content");
  });

  it("fails for source, remote version, and remote hash drift", () => {
    const report = compareEdgeFunctionContentParity({
      manifest: TEST_MANIFEST,
      expectedProjectRef: PROJECT_REF,
      expectedReleaseSha: RELEASE_SHA,
      localFunctionNames: ["alpha"],
      localFunctions: [{
        name: "alpha",
        sourceFingerprint: "d".repeat(64),
        sourceFiles: ["alpha/index.ts"],
      }],
      remoteFunctions: [{
        name: "alpha",
        version: 8,
        ezbrSha256: "e".repeat(64),
      }],
      receipt: makeReceipt(),
    });

    expect(report.status).toBe("fail");
    expect(report.drift.sourceFingerprintMismatches.map(({ name }) => name))
      .toEqual(["alpha"]);
    expect(report.drift.remoteVersionMismatches.map(({ name }) => name))
      .toEqual(["alpha"]);
    expect(report.drift.remoteHashMismatches.map(({ name }) => name))
      .toEqual(["alpha"]);
  });

  it("binds read-only receipt evidence to the source-owned function manifest", () => {
    const report = compareEdgeFunctionContentParity({
      manifest: TEST_MANIFEST,
      expectedProjectRef: PROJECT_REF,
      expectedReleaseSha: RELEASE_SHA,
      localFunctionNames: ["alpha"],
      localFunctions: [{
        name: "alpha",
        sourceFingerprint: SOURCE_FINGERPRINT,
        sourceFiles: ["alpha/index.ts"],
      }],
      remoteFunctions: [{ name: "alpha", version: 7, ezbrSha256: REMOTE_HASH }],
      receipt: makeReceipt("d".repeat(64)),
    });

    expect(report.status).toBe("fail");
    expect(report.drift.functionManifestSha256Mismatch).toBe(true);
  });

  it("excludes local-only and deprecated functions from the content receipt while verifying their placement", () => {
    const manifest = parseEdgeFunctionManifest(JSON.stringify({
      schema: "diana-edge-function-manifest",
      schemaVersion: 1,
      functions: [
        { name: "alpha", classification: "managed" },
        { name: "draft-helper", classification: "local-only" },
        { name: "retired-helper", classification: "deprecated" },
      ],
    }));
    const receipt = createStagingEdgeDeploymentReceipt({
      projectRef: PROJECT_REF,
      releaseSha: RELEASE_SHA,
      createdAt: CREATED_AT,
      functionManifestSha256: edgeFunctionManifestSha256(manifest),
      localSources: [{
        name: "alpha",
        sourceFingerprint: SOURCE_FINGERPRINT,
        sourceFiles: ["alpha/index.ts"],
      }],
      remoteFunctions: [{ name: "alpha", version: 7, ezbrSha256: REMOTE_HASH }],
    });
    const report = compareEdgeFunctionContentParity({
      manifest,
      expectedProjectRef: PROJECT_REF,
      expectedReleaseSha: RELEASE_SHA,
      localFunctionNames: ["alpha", "draft-helper"],
      localFunctions: [{
        name: "alpha",
        sourceFingerprint: SOURCE_FINGERPRINT,
        sourceFiles: ["alpha/index.ts"],
      }],
      remoteFunctions: [
        { name: "alpha", version: 7, ezbrSha256: REMOTE_HASH },
        { name: "retired-helper", version: 4, ezbrSha256: "d".repeat(64) },
      ],
      receipt,
    });

    expect(report.status).toBe("pass");
    expect(report.manifest.localOnlyFunctions).toEqual(["draft-helper"]);
    expect(report.manifest.deprecatedFunctions).toEqual(["retired-helper"]);
  });

  it("keeps name-only parity behind an explicit diagnostic option", () => {
    expect(parseCliOptions([]).nameOnly).toBe(false);
    expect(parseCliOptions(["--name-only", "--json"])).toMatchObject({
      nameOnly: true,
      json: true,
      receiptPath: null,
      releaseSha: null,
    });
  });
});

describe("staging deployment guards", () => {
  it("accepts only a clean immutable staging worktree", () => {
    expect(assertStagingDeploymentGuards({
      projectRoot: "C:\\repo",
      releaseSha: RELEASE_SHA,
      deploymentEnvironment: "staging",
      projectRef: PROJECT_REF,
      stagingProjectRef: PROJECT_REF,
      productionProjectRef: PRODUCTION_PROJECT_REF,
      runGit: cleanGitRunner(),
    })).toMatchObject({
      projectRef: PROJECT_REF,
      releaseSha: RELEASE_SHA,
    });
  });

  it("refuses production before inspecting or deploying the worktree", () => {
    let gitCalls = 0;
    expect(() => assertStagingDeploymentGuards({
      projectRoot: "C:\\repo",
      releaseSha: RELEASE_SHA,
      deploymentEnvironment: "staging",
      projectRef: PRODUCTION_PROJECT_REF,
      stagingProjectRef: PROJECT_REF,
      productionProjectRef: PRODUCTION_PROJECT_REF,
      runGit: (..._args) => {
        gitCalls += 1;
        return { status: 0, stdout: "", stderr: "" };
      },
    })).toThrow("Production Supabase Edge Function deployment is refused");
    expect(gitCalls).toBe(0);
  });

  it("refuses dirty and non-HEAD worktrees", () => {
    expect(() => assertStagingDeploymentGuards({
      projectRoot: "C:\\repo",
      releaseSha: RELEASE_SHA,
      deploymentEnvironment: "staging",
      projectRef: PROJECT_REF,
      stagingProjectRef: PROJECT_REF,
      productionProjectRef: PRODUCTION_PROJECT_REF,
      runGit: cleanGitRunner({ status: " M supabase/functions/alpha/index.ts\n" }),
    })).toThrow("clean worktree");

    expect(() => assertStagingDeploymentGuards({
      projectRoot: "C:\\repo",
      releaseSha: RELEASE_SHA,
      deploymentEnvironment: "staging",
      projectRef: PROJECT_REF,
      stagingProjectRef: PROJECT_REF,
      productionProjectRef: PRODUCTION_PROJECT_REF,
      runGit: cleanGitRunner({ headSha: "f".repeat(40) }),
    })).toThrow("current HEAD commit");
  });
});
