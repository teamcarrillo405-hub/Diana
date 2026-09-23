import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEPRECATED_REMOTE_ONLY_FUNCTIONS,
  compareEdgeFunctionParity,
  listLocalFunctionDirectories,
  parseRemoteFunctionsJson,
} from "../../scripts/edge-function-parity";

describe("edge function deployment parity", () => {
  it("lists local function directories deterministically and excludes shared directories", () => {
    const root = mkdtempSync(join(tmpdir(), "edge-function-parity-"));

    try {
      mkdirSync(join(root, "zeta"));
      mkdirSync(join(root, "_shared"));
      mkdirSync(join(root, "alpha"));

      expect(listLocalFunctionDirectories(root)).toEqual(["alpha", "zeta"]);
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

  it("passes when remote-only functions are explicitly deprecated", () => {
    const report = compareEdgeFunctionParity(
      ["alpha"],
      ["alpha", "ai-classify-inbox"],
      DEPRECATED_REMOTE_ONLY_FUNCTIONS,
    );

    expect(report.status).toBe("pass");
    expect(report.allowlistedRemoteOnlyFunctions).toEqual(["ai-classify-inbox"]);
    expect(report.drift).toEqual({
      localOnlyFunctions: [],
      unexpectedRemoteOnlyFunctions: [],
    });
  });

  it("fails for a local function missing from the remote project", () => {
    const report = compareEdgeFunctionParity(["alpha", "local-new"], ["alpha"]);

    expect(report.status).toBe("fail");
    expect(report.drift.localOnlyFunctions).toEqual(["local-new"]);
  });

  it("fails for an unexpected remote-only function", () => {
    const report = compareEdgeFunctionParity(["alpha"], ["alpha", "remote-new"]);

    expect(report.status).toBe("fail");
    expect(report.drift.unexpectedRemoteOnlyFunctions).toEqual(["remote-new"]);
  });

  it("rejects malformed remote output instead of treating it as an empty list", () => {
    expect(() => parseRemoteFunctionsJson("{}"))
      .toThrow("Supabase function list JSON must be an array");
    expect(() => parseRemoteFunctionsJson('[{"status":"ACTIVE"}]'))
      .toThrow("Supabase function list entry 0 is missing a slug");
  });
});
