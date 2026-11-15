import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createTestSourceCheckpointReceipt,
  installedTestGitleaks,
  testReleasePolicy,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import {
  type BetaCheckpointScannerIdentity,
  validateBetaCheckpointEvidence,
  validateBetaCheckpointEvidenceStructure,
} from "./checkpoint-provenance";
import { PINNED_GIT_EXECUTABLE } from "../../scripts/beta/trusted-executables.mjs";
import {
  assertNoCheckpointSourceFilters,
  protectedPathspecMatches,
  readSourceSnapshot,
  validateReleasePolicy,
} from "../../scripts/beta/checkpoint.mjs";

const RUN_ID = "beta-provenance-001";
const roots: string[] = [];
const REAL_GITLEAKS = installedTestGitleaks();
const realGitleaksIt = process.platform === "win32" && process.arch === "x64" ? it : it.skip;

function git(projectRoot: string, args: string[]): string {
  const environment: NodeJS.ProcessEnv = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
    ),
    NODE_ENV: process.env.NODE_ENV,
  };
  environment.GIT_OPTIONAL_LOCKS = "0";
  const result = spawnSync(PINNED_GIT_EXECUTABLE, args, {
    cwd: projectRoot,
    encoding: "utf8",
    env: environment,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || `git ${args[0]} did not complete`);
  }
  return result.stdout.trim();
}

function createFixture(
  policy: Record<string, unknown> = testReleasePolicy(),
  options: {
    candidateContent?: string;
    scanner?: BetaCheckpointScannerIdentity;
  } = {},
) {
  const owner = mkdtempSync(path.join(tmpdir(), "diana-checkpoint-provenance-test-"));
  roots.push(owner);
  const projectRoot = path.join(owner, "repo");
  mkdirSync(projectRoot);
  git(projectRoot, ["init", "--quiet"]);
  git(projectRoot, ["config", "user.name", "Checkpoint Provenance Test"]);
  git(projectRoot, ["config", "user.email", "provenance@example.invalid"]);
  writeFileSync(path.join(projectRoot, ".gitignore"), "/artifacts/\n");
  writeFileSync(path.join(projectRoot, "app.txt"), "base\n");
  writeTestCheckpointPolicy(projectRoot, policy);
  git(projectRoot, ["add", "."]);
  git(projectRoot, ["commit", "--quiet", "-m", "trusted parent"]);
  const parentSha = git(projectRoot, ["rev-parse", "HEAD"]);
  writeFileSync(path.join(projectRoot, "app.txt"), options.candidateContent ?? "candidate\n");
  git(projectRoot, ["add", "app.txt"]);
  git(projectRoot, ["commit", "--quiet", "-m", "candidate"]);
  const candidateSha = git(projectRoot, ["rev-parse", "HEAD"]);
  const receiptPath = path.join(
    projectRoot,
    "artifacts",
    "beta-checkpoints",
    "release-candidates",
    `${RUN_ID}.json`,
  );
  writeMaterializedCheckpointReceipt({
    projectRoot,
    runId: RUN_ID,
    candidateSha,
    parentSha,
    scanner: options.scanner,
  });
  return { candidateSha, parentSha, projectRoot, receiptPath };
}

function validate(projectRoot: string) {
  return validateBetaCheckpointEvidenceStructure({
    projectRoot,
    runId: RUN_ID,
    location: "materialized",
    requireCurrentHead: true,
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("checkpoint provenance validation", { timeout: 30_000 }, () => {
  it("accepts only the canonical materialized schema with independent scan evidence", () => {
    const fixture = createFixture();

    const evidence = validate(fixture.projectRoot);

    expect(evidence.receipt.schemaVersion).toBe(3);
    expect(evidence.receipt.materialization?.independentlyReverified).toBe(true);
    expect(evidence.receipt.candidate.externalFiltersRejected).toBe(true);
  });

  it("rejects the same exact policy violations as checkpoint creation", () => {
    const malformedPolicies = [
      { ...testReleasePolicy(), unknown: true },
      {
        ...testReleasePolicy(),
        ageBoundary: {
          ...(testReleasePolicy().ageBoundary as Record<string, unknown>),
          minimumAccountAge: 12,
        },
      },
      testReleasePolicy({ restoreFromHead: ["../escape"] }),
      testReleasePolicy({ includeFromWorktree: ["asset.txt", "asset.txt"] }),
    ];

    for (const policy of malformedPolicies) {
      const fixture = createFixture(policy);
      expect(() => validate(fixture.projectRoot)).toThrow(
        /release manifest|policy path|duplicate paths|fixed policy schema/iu,
      );
    }
  });

  it("allows literal Next.js route folders without permitting pathspec injection", () => {
    expect(() => validateReleasePolicy(testReleasePolicy({
      includeFromWorktree: ["app/(app)/assignments/[id]/workspace/page.tsx"],
    }))).not.toThrow();
    expect(() => validateReleasePolicy(testReleasePolicy({
      includeFromWorktree: ["app/(app)/assignments/*.tsx"],
    }))).toThrow(/unsafe beta release policy path/iu);
    expect(() => validateReleasePolicy(testReleasePolicy({
      includeFromWorktree: [":(glob)app/**"],
    }))).toThrow(/unsafe beta release policy path/iu);
  });

  it("matches protected directories and globbed media without Git pathspec magic", () => {
    expect(protectedPathspecMatches("app/landing-3d", "app/landing-3d/logo-mask/page.tsx")).toBe(true);
    expect(protectedPathspecMatches("app/landing-3d", "app/landing/page.tsx")).toBe(false);
    expect(protectedPathspecMatches(
      ":(glob)public/assets/dashboard/diana-dashboard-desktop-*.webp",
      "public/assets/dashboard/diana-dashboard-desktop-1440.webp",
    )).toBe(true);
    expect(protectedPathspecMatches(
      ":(glob)public/assets/dashboard/diana-dashboard-desktop-*.webp",
      "public/assets/dashboard/diana-dashboard-mobile-390.webp",
    )).toBe(false);
  });

  it("records tracked deletions even when their empty parent directory is gone", () => {
    const fixture = createFixture();
    const nestedDirectory = path.join(fixture.projectRoot, "app", "(app)", "design", "compare");
    mkdirSync(nestedDirectory, { recursive: true });
    writeFileSync(path.join(nestedDirectory, "deleted-route.tsx"), "export {};\n");
    git(fixture.projectRoot, ["add", "app/(app)/design/compare/deleted-route.tsx"]);
    git(fixture.projectRoot, ["commit", "--quiet", "-m", "tracked route"]);
    rmSync(path.join(fixture.projectRoot, "app"), { recursive: true, force: true });

    expect(() => readSourceSnapshot(fixture.projectRoot)).not.toThrow();
    expect(() => assertNoCheckpointSourceFilters(
      fixture.projectRoot,
      git(fixture.projectRoot, ["rev-parse", "HEAD"]),
    )).not.toThrow();
  });

  it("rejects a canonical forged receipt whose raw-byte digest does not match the commit", () => {
    const fixture = createFixture();
    const receipt = JSON.parse(readFileSync(fixture.receiptPath, "utf8")) as Record<string, any>;
    receipt.candidate.contentManifestSha256 = "0".repeat(64);
    const sourceReceipt = { ...receipt, materialization: null };
    const sourceBytes = Buffer.from(`${JSON.stringify(sourceReceipt, null, 2)}\n`, "utf8");
    receipt.materialization.candidateContentManifestSha256 = "0".repeat(64);
    receipt.materialization.checkpointReceiptSha256 = createHash("sha256")
      .update(sourceBytes)
      .digest("hex");
    writeFileSync(fixture.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    expect(() => validate(fixture.projectRoot)).toThrow(/candidate byte manifest/iu);
  });

  it("rejects source-only and noncanonical receipts downstream", () => {
    const sourceOnly = createFixture();
    const sourceBytes = createTestSourceCheckpointReceipt({
      projectRoot: sourceOnly.projectRoot,
      runId: RUN_ID,
      candidateSha: sourceOnly.candidateSha,
      parentSha: sourceOnly.parentSha,
    });
    writeFileSync(sourceOnly.receiptPath, sourceBytes);
    expect(() => validate(sourceOnly.projectRoot)).toThrow(/materialization evidence/iu);

    const noncanonical = createFixture();
    const parsed = JSON.parse(readFileSync(noncanonical.receiptPath, "utf8"));
    writeFileSync(noncanonical.receiptPath, JSON.stringify(parsed));
    expect(() => validate(noncanonical.projectRoot)).toThrow(/canonical JSON representation/iu);
  });

  it("rejects replacement refs even when every receipt field remains internally consistent", () => {
    const fixture = createFixture();
    const tree = git(fixture.projectRoot, ["rev-parse", `${fixture.candidateSha}^{tree}`]);
    const replacement = git(fixture.projectRoot, [
      "commit-tree",
      tree,
      "-p",
      fixture.parentSha,
      "-m",
      "replacement candidate",
    ]);
    git(fixture.projectRoot, ["replace", fixture.candidateSha, replacement]);

    expect(() => validate(fixture.projectRoot)).toThrow(/replacement objects are forbidden/iu);
  });

  realGitleaksIt("rejects fabricated reverified metadata by rerunning the pinned scanner", () => {
    expect(REAL_GITLEAKS, "Gitleaks 8.30.1 is required on the release platform").not.toBeNull();
    const real = REAL_GITLEAKS!;
    const token = ["ghp_", "4mZq8T1vP6xR9cN2", "kL5sW7yD0fH3jB6uA8eQ"].join("");
    expect(token).toHaveLength(40);
    const fixture = createFixture(
      testReleasePolicy({ scanner: real.identity }),
      {
        candidateContent: `export const token = "${token}";\n`,
        scanner: real.identity,
      },
    );

    expect(() => validateBetaCheckpointEvidence({
      projectRoot: fixture.projectRoot,
      runId: RUN_ID,
      location: "materialized",
      requireCurrentHead: true,
      environment: {
        ...process.env,
        DIANA_GITLEAKS_BIN: real.executable,
      },
    })).toThrow(/Gitleaks (?:git|dir) scan did not pass/iu);
  }, 30_000);
});
