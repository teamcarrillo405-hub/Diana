import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  resolveNpmInvocation,
  sanitizeBetaChildEnvironment,
  sanitizeBetaLocalGateChildEnvironment,
} from "./local-gate";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("trusted npm execution", () => {
  it("uses the npm CLI bundled with the running Node installation on Windows", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "diana-beta-fake-npm-"));
    temporaryDirectories.push(directory);
    const fakeNpmCli = path.join(directory, "node_modules", "npm", "bin", "npm-cli.js");
    mkdirSync(path.dirname(fakeNpmCli), { recursive: true });
    writeFileSync(fakeNpmCli, "// same-version fake npm cli\n");
    writeFileSync(
      path.join(directory, "node_modules", "npm", "package.json"),
      JSON.stringify({ name: "npm", version: "11.11.0" }),
    );
    writeFileSync(path.join(directory, "npm.cmd"), "@echo fake npm\n");

    const environment = {
      NPM_EXECPATH: fakeNpmCli,
      PATH: `${directory};${process.env.PATH ?? ""}`,
    };
    const invocation = resolveNpmInvocation(["run", "beta:dependencies"], environment, "win32");
    const expectedNpmCli = path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js",
    );

    expect(existsSync(expectedNpmCli)).toBe(true);
    expect(invocation).toEqual({
      file: process.execPath,
      args: [expectedNpmCli, "run", "beta:dependencies"],
    });
    expect(sanitizeBetaLocalGateChildEnvironment(environment, "dependency-install"))
      .not.toHaveProperty("NPM_EXECPATH");
    expect(sanitizeBetaChildEnvironment(environment, ["NPM_EXECPATH"]))
      .not.toHaveProperty("NPM_EXECPATH");
  });

  it("enables npm audit only for the explicit dependency-audit gate", () => {
    const environment = {
      PATH: process.env.PATH,
      NPM_CONFIG_AUDIT: "false",
    };

    expect(sanitizeBetaLocalGateChildEnvironment(environment, "dependency-install"))
      .toMatchObject({ NPM_CONFIG_AUDIT: "false" });
    expect(sanitizeBetaLocalGateChildEnvironment(environment, "dependency-audit"))
      .toMatchObject({ NPM_CONFIG_AUDIT: "true" });
  });
});
