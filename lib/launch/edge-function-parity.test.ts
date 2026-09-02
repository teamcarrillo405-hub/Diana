import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  compareEdgeFunctionParity,
  listLocalFunctionDirectories,
  parseRemoteFunctionsJson,
} from "../../scripts/edge-function-parity";
import {
  functionNamesForClassification,
  parseEdgeFunctionManifest,
  readEdgeFunctionManifest,
} from "../../scripts/edge-function-inventory";
import {
  managedFunctionsForStagingDeployment,
} from "../../scripts/deploy-staging-edge-functions";

function makeManifest() {
  return parseEdgeFunctionManifest(JSON.stringify({
    schema: "diana-edge-function-manifest",
    schemaVersion: 1,
    functions: [
      { name: "alpha", classification: "managed" },
      { name: "draft-helper", classification: "local-only" },
      { name: "retired-helper", classification: "deprecated" },
    ],
  }));
}

describe("edge function deployment parity", () => {
  it("lists local function directories deterministically and excludes only the shared directory", () => {
    const root = mkdtempSync(join(tmpdir(), "edge-function-parity-"));

    try {
      mkdirSync(join(root, "zeta"));
      mkdirSync(join(root, "_shared"));
      mkdirSync(join(root, "_unclassified"));
      mkdirSync(join(root, "alpha"));

      expect(listLocalFunctionDirectories(root)).toEqual(["_unclassified", "alpha", "zeta"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("parses and sorts Supabase function list JSON by slug", () => {
    const json = JSON.stringify([
      { name: "zeta", slug: "zeta", status: "ACTIVE" },
      { name: "alpha", slug: "alpha", status: "ACTIVE" },
    ]);

    expect(parseRemoteFunctionsJson(json)).toEqual(["alpha", "zeta"]);
  });

  it("allows explicitly deprecated remote functions and keeps local-only functions off staging", () => {
    const report = compareEdgeFunctionParity({
      manifest: makeManifest(),
      localFunctions: ["alpha", "draft-helper"],
      remoteFunctions: ["alpha", "retired-helper"],
    });

    expect(report.status).toBe("pass");
    expect(report.deprecatedRemoteFunctions).toEqual(["retired-helper"]);
    expect(report.drift).toEqual({
      unknownLocalFunctions: [],
      missingManagedFunctions: [],
      missingLocalOnlyFunctions: [],
      deprecatedLocalFunctions: [],
      missingManagedRemoteFunctions: [],
      localOnlyRemoteFunctions: [],
      unexpectedRemoteFunctions: [],
    });
  });

  it("fails for unclassified local functions and unexpected or local-only remote functions", () => {
    const report = compareEdgeFunctionParity({
      manifest: makeManifest(),
      localFunctions: ["alpha", "draft-helper", "local-new"],
      remoteFunctions: ["alpha", "draft-helper", "remote-new"],
    });

    expect(report.status).toBe("fail");
    expect(report.drift.unknownLocalFunctions).toEqual(["local-new"]);
    expect(report.drift.localOnlyRemoteFunctions).toEqual(["draft-helper"]);
    expect(report.drift.unexpectedRemoteFunctions).toEqual(["remote-new"]);
  });

  it("rejects a manifest that is not canonical", () => {
    expect(() => parseEdgeFunctionManifest(JSON.stringify({
      schema: "diana-edge-function-manifest",
      schemaVersion: 1,
      functions: [
        { name: "zeta", classification: "managed" },
        { name: "alpha", classification: "managed" },
      ],
    }))).toThrow("must be sorted by name");
  });

  it("only returns manifest-managed functions to the deployment path", () => {
    expect(managedFunctionsForStagingDeployment({
      manifest: makeManifest(),
      localFunctions: ["alpha", "draft-helper"],
      remoteFunctions: ["retired-helper"],
    })).toEqual(["alpha"]);

    expect(() => managedFunctionsForStagingDeployment({
      manifest: makeManifest(),
      localFunctions: ["alpha", "draft-helper", "unknown-local"],
      remoteFunctions: ["retired-helper"],
    })).toThrow("unknown local functions");

    expect(() => managedFunctionsForStagingDeployment({
      manifest: makeManifest(),
      localFunctions: ["alpha", "draft-helper"],
      remoteFunctions: ["retired-helper", "unknown-remote"],
    })).toThrow("unknown remote functions");
  });

  it("rejects malformed remote output instead of treating it as an empty list", () => {
    expect(() => parseRemoteFunctionsJson("{}"))
      .toThrow("Supabase function list JSON must be an array");
    expect(() => parseRemoteFunctionsJson('[{"status":"ACTIVE"}]'))
      .toThrow("Supabase function list entry 0 is missing a valid slug");
    expect(() => parseRemoteFunctionsJson(JSON.stringify([
      { slug: "alpha" },
      { slug: "alpha" },
    ]))).toThrow("contains duplicate slugs");
  });

  it("keeps the checked-in function inventory exhaustive and source-owned", () => {
    const manifest = readEdgeFunctionManifest(process.cwd());
    const localFunctions = listLocalFunctionDirectories(
      join(process.cwd(), "supabase", "functions"),
    );
    const report = compareEdgeFunctionParity({
      manifest,
      localFunctions,
      remoteFunctions: [
        ...functionNamesForClassification(manifest, "managed"),
        ...functionNamesForClassification(manifest, "deprecated"),
      ],
    });

    expect(report.status).toBe("pass");
    expect(report.manifest.localOnlyFunctions).toEqual([]);
    expect(report.deprecatedRemoteFunctions).toEqual([
      "ai-classify-inbox",
      "ai-comprehension",
      "ai-summarize-rubric",
    ]);
  });
});
