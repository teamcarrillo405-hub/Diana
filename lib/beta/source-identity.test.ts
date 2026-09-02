import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";
import { PINNED_GIT_EXECUTABLE } from "../../scripts/beta/trusted-executables.mjs";

const roots: string[] = [];

function createProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-source-"));
  roots.push(root);
  writeFileSync(path.join(root, "package.json"), '{"name":"diana"}\n');
  return root;
}

function git(projectRoot: string, args: string[]): void {
  const result = spawnSync(PINNED_GIT_EXECUTABLE, args, {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || `Git ${args[0]} did not complete.`);
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("beta source identity", () => {
  it("changes when release source content changes", () => {
    const root = createProject();
    const before = readBetaSourceIdentity(root);

    writeFileSync(path.join(root, "package.json"), '{"name":"diana","version":"2"}\n');
    const after = readBetaSourceIdentity(root);

    expect(betaSourceIdentityMatches(before, after)).toBe(false);
    expect(before.worktreeDigest).not.toBe(after.worktreeDigest);
  });

  it("ignores run evidence written below the fixed beta artifact directory", () => {
    const root = createProject();
    const before = readBetaSourceIdentity(root);
    const runDirectory = path.join(root, "artifacts", "beta-gate", "beta-test-001");
    mkdirSync(runDirectory, { recursive: true });
    writeFileSync(path.join(runDirectory, "manifest.json"), "{}\n");

    const after = readBetaSourceIdentity(root);
    expect(betaSourceIdentityMatches(before, after)).toBe(true);
  });

  it("rejects hidden index flags instead of certifying stale filesystem bytes", () => {
    for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
      const root = createProject();
      git(root, ["init", "--quiet"]);
      git(root, ["config", "user.name", "Source Identity Test"]);
      git(root, ["config", "user.email", "source-identity@example.invalid"]);
      git(root, ["add", "package.json"]);
      git(root, ["commit", "--quiet", "-m", "base"]);
      git(root, ["update-index", flag, "package.json"]);

      expect(() => readBetaSourceIdentity(root))
        .toThrow(/forbids assume-unchanged and skip-worktree/iu);
    }
  });
});
