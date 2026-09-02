import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  TEST_CHECKPOINT_SCANNER,
  writeSourceCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "../beta/checkpoint-provenance.test-fixtures";
import { PINNED_GIT_EXECUTABLE } from "../../scripts/beta/trusted-executables.mjs";

const MATERIALIZER = path.join(
  process.cwd(),
  "scripts",
  "beta",
  "materialize-checkpoint.mjs",
);
const RUN_ID = "beta-materialize-001";
// Materialization intentionally exercises a real detached Git worktree. The
// bounded allowance absorbs Windows antivirus and filesystem latency without
// hiding a hung command indefinitely.
const BETA_FILESYSTEM_TEST_TIMEOUT_MS = 120_000;

type Fixture = {
  candidateSha: string;
  parent: string;
  parentSha: string;
  receiptPath: string;
  ref: string;
  source: string;
  target: string;
  targetRoot: string;
  treeSha: string;
};

type MaterializationPhase =
  | "after-receipt-copy"
  | "before-receipt-copy"
  | "before-worktree-add"
  | "target-reserved";

type MaterializeCheckpoint = (input: {
  argv: string[];
  projectRoot: string;
  scanner?: {
    identity: typeof TEST_CHECKPOINT_SCANNER;
    scan(context: { mode: "git" | "dir"; reportPath: string; target: string }): void;
  };
  testHook?: (
    phase: MaterializationPhase,
    context: { target: string; worktreeRoot: string },
  ) => void;
}) => { target: string };

const cleanupRoots = new Set<string>();
let materializeCheckpoint: MaterializeCheckpoint;

beforeAll(async () => {
  const materializerModule = await import(pathToFileURL(MATERIALIZER).href) as {
    materializeCheckpoint: MaterializeCheckpoint;
  };
  materializeCheckpoint = materializerModule.materializeCheckpoint;
});

afterEach(() => {
  for (const root of cleanupRoots) rmSync(root, { recursive: true, force: true });
  cleanupRoots.clear();
});

function run(file: string, args: string[], cwd: string) {
  return spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function git(cwd: string, args: string[]): string {
  const result = run(PINNED_GIT_EXECUTABLE, args, cwd);
  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || `git ${args[0]} did not complete`);
  }
  return result.stdout.trim();
}

function createFixture(options: {
  candidateFilter?: boolean;
  forgedCandidateSymlink?: boolean;
} = {}): Fixture {
  const parent = mkdtempSync(path.join(tmpdir(), "diana-beta-materialize-test-"));
  cleanupRoots.add(parent);
  const source = path.join(parent, "Diana-fixture");
  mkdirSync(source);
  git(source, ["init", "--quiet"]);
  git(source, ["config", "user.email", "checkpoint-test@example.invalid"]);
  git(source, ["config", "user.name", "Checkpoint Test"]);
  writeFileSync(path.join(source, ".gitignore"), "/artifacts/\n");
  writeFileSync(path.join(source, "candidate.txt"), "base\n");
  writeTestCheckpointPolicy(source);
  git(source, ["add", "."]);
  git(source, ["commit", "--quiet", "-m", "base"]);
  const parentSha = git(source, ["rev-parse", "HEAD"]);

  writeFileSync(path.join(source, "candidate.txt"), "candidate\n");
  if (options.candidateFilter) {
    writeFileSync(path.join(source, ".gitattributes"), "*.txt filter=lfs\n");
  }
  git(source, ["add", "candidate.txt"]);
  if (options.candidateFilter) git(source, ["add", ".gitattributes"]);
  if (options.forgedCandidateSymlink) {
    const linkBlob = git(source, ["hash-object", "-w", "--", "candidate.txt"]);
    git(source, [
      "update-index",
      "--add",
      "--cacheinfo",
      "120000",
      linkBlob,
      "forged-candidate-link",
    ]);
  }
  const treeSha = git(source, ["write-tree"]);
  const candidateSha = git(source, [
    "commit-tree",
    treeSha,
    "-p",
    parentSha,
    "-m",
    "candidate",
  ]);
  git(source, ["read-tree", parentSha]);
  if (options.candidateFilter) rmSync(path.join(source, ".gitattributes"));
  const ref = `refs/beta/release-candidates/${RUN_ID}`;

  const receiptRelativePath = `artifacts/beta-checkpoints/release-candidates/${RUN_ID}.json`;
  const receiptPath = path.join(source, ...receiptRelativePath.split("/"));
  writeFileSync(path.join(source, "candidate.txt"), "dirty source content\n");
  writeFileSync(path.join(source, "source-only.txt"), "untracked source content\n");
  writeSourceCheckpointReceipt({
    projectRoot: source,
    runId: RUN_ID,
    candidateSha,
    parentSha,
  });
  const targetRoot = path.join(parent, `${path.basename(source)}-beta-worktrees`);
  const target = path.join(targetRoot, RUN_ID);
  return {
    candidateSha,
    parent,
    parentSha,
    receiptPath,
    ref,
    source,
    target,
    targetRoot,
    treeSha,
  };
}

function materializationArguments(fixture: Fixture): string[] {
  return [
    `--run-id=${RUN_ID}`,
    `--receipt=artifacts/beta-checkpoints/release-candidates/${RUN_ID}.json`,
    `--ref=${fixture.ref}`,
    `--sha=${fixture.candidateSha}`,
  ];
}

function materialize(fixture: Fixture, args: string[] = []) {
  const defaults = materializationArguments(fixture);
  try {
    const result = materializeCheckpoint({
      projectRoot: fixture.source,
      argv: args.length > 0 ? args : defaults,
      scanner: testScanner(),
    }) as { nextCommands?: string[]; cleanupCommands?: string[] };
    return {
      status: 0,
      stderr: "",
      stdout: [
        "Run exactly these commands next:",
        ...(result.nextCommands ?? []),
        ...(result.cleanupCommands ?? []),
      ].join("\n"),
    };
  } catch (error) {
    return {
      status: 1,
      stderr: error instanceof Error ? error.message : String(error),
      stdout: "",
    };
  }
}

function testScanner(scan?: (context: {
  mode: "git" | "dir";
  reportPath: string;
  target: string;
}) => void) {
  return {
    identity: TEST_CHECKPOINT_SCANNER,
    scan(context: { mode: "git" | "dir"; reportPath: string; target: string }) {
      scan?.(context);
      if (!existsSync(context.reportPath)) writeFileSync(context.reportPath, "[]\n");
    },
  };
}

function sourceSnapshot(source: string) {
  const indexPathOutput = git(source, ["rev-parse", "--git-path", "index"]);
  const indexPath = path.isAbsolute(indexPathOutput)
    ? indexPathOutput
    : path.resolve(source, indexPathOutput);
  const status = run(
    PINNED_GIT_EXECUTABLE,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    source,
  );
  if (status.error || status.status !== 0) throw new Error(status.stderr);
  return {
    candidate: readFileSync(path.join(source, "candidate.txt"), "utf8"),
    head: git(source, ["rev-parse", "HEAD"]),
    index: readFileSync(indexPath).toString("hex"),
    status: Buffer.from(status.stdout).toString("hex"),
    untracked: readFileSync(path.join(source, "source-only.txt"), "utf8"),
  };
}

describe("beta checkpoint materialization", () => {
  it("materializes a detached clean candidate without changing the dirty source", () => {
    const fixture = createFixture();
    const before = sourceSnapshot(fixture.source);

    const result = materialize(fixture);

    expect(result.status, result.stderr).toBe(0);
    expect(sourceSnapshot(fixture.source)).toEqual(before);
    expect(git(fixture.target, ["rev-parse", "HEAD"])).toBe(fixture.candidateSha);
    expect(git(fixture.target, ["status", "--porcelain=v1", "--untracked-files=all"]))
      .toBe("");
    expect(run(
      PINNED_GIT_EXECUTABLE,
      ["symbolic-ref", "-q", "HEAD"],
      fixture.target,
    ).status).toBe(1);
    expect(readFileSync(path.join(fixture.target, "candidate.txt"), "utf8"))
      .toMatch(/^candidate\r?\n$/u);
    const materializedReceipt = JSON.parse(readFileSync(path.join(
      fixture.target,
      "artifacts",
      "beta-checkpoints",
      "release-candidates",
      `${RUN_ID}.json`,
    ), "utf8")) as { materialization: { independentlyReverified: boolean } | null };
    const sourceReceipt = JSON.parse(readFileSync(fixture.receiptPath, "utf8")) as {
      materialization: unknown;
    };
    expect(materializedReceipt.materialization?.independentlyReverified).toBe(true);
    expect(sourceReceipt.materialization).toBeNull();
    expect(result.stdout).toContain("Run exactly these commands next:");
    expect(result.stdout).toContain(`npm run beta:preflight -- --run-id=${RUN_ID}`);
    expect(result.stdout).toContain(`npm run beta:gate:local -- --run-id=${RUN_ID}`);
    expect(result.stdout).toContain(`${PINNED_GIT_EXECUTABLE}' worktree remove --`);
    expect(result.stdout).not.toContain("worktree remove --force");
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks when the checkpoint ref no longer matches the receipt and SHA", () => {
    const fixture = createFixture();
    git(fixture.source, ["update-ref", fixture.ref, fixture.parentSha, fixture.candidateSha]);

    const result = materialize(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Checkpoint ref does not resolve to the requested SHA");
    expect(() => readFileSync(path.join(fixture.target, ".git"))).toThrow();
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks a receipt whose commit tree does not match the candidate", () => {
    const fixture = createFixture();
    const receipt = JSON.parse(readFileSync(fixture.receiptPath, "utf8")) as Record<string, unknown>;
    receipt.checkpointTree = "0".repeat(40);
    writeFileSync(fixture.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);

    const result = materialize(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Checkpoint commit tree does not match its receipt");
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks when the requested SHA differs from the checkpoint receipt", () => {
    const fixture = createFixture();
    const result = materialize(fixture, [
      `--run-id=${RUN_ID}`,
      `--receipt=artifacts/beta-checkpoints/release-candidates/${RUN_ID}.json`,
      `--ref=${fixture.ref}`,
      `--sha=${fixture.parentSha}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Checkpoint receipt does not match");
    expect(() => readFileSync(path.join(fixture.target, ".git"))).toThrow();
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("rejects a forged v3 receipt that claims a symbolic-link candidate was safe", () => {
    const fixture = createFixture({ forgedCandidateSymlink: true });

    const result = materialize(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("checkpoint candidate contains a symbolic link");
    expect(existsSync(path.join(fixture.target, ".git"))).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("refuses both empty and nonempty existing target directories", () => {
    for (const nonempty of [false, true]) {
      const fixture = createFixture();
      mkdirSync(fixture.target, { recursive: true });
      if (nonempty) writeFileSync(path.join(fixture.target, "keep.txt"), "keep\n");

      const result = materialize(fixture);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        nonempty ? "already exists and is not empty" : "already exists and will not be reused",
      );
    }
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("refuses a symbolic-link target", () => {
    const fixture = createFixture();
    const outside = path.join(fixture.parent, "outside");
    mkdirSync(fixture.targetRoot);
    mkdirSync(outside);
    symlinkSync(outside, fixture.target, process.platform === "win32" ? "junction" : "dir");

    const result = materialize(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("already exists as a symbolic link");
    expect(readFileSync(path.join(fixture.source, "candidate.txt"), "utf8"))
      .toBe("dirty source content\n");
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("refuses a symbolic-link worktree root", () => {
    const fixture = createFixture();
    const outside = path.join(fixture.parent, "outside-root");
    mkdirSync(outside);
    symlinkSync(
      outside,
      fixture.targetRoot,
      process.platform === "win32" ? "junction" : "dir",
    );

    const result = materialize(fixture);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("worktree root must be a real directory");
    expect(() => readFileSync(path.join(fixture.target, ".git"))).toThrow();
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks a target replacement race before Git can escape the reserved root", () => {
    const fixture = createFixture();
    const outside = path.join(fixture.parent, "race-outside");
    mkdirSync(outside);

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(),
      testHook: (phase, { target }) => {
        if (phase !== "before-worktree-add") return;
        rmSync(target, { recursive: true, force: false });
        symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
      },
    })).toThrow(/Reserved beta worktree target changed or escaped/iu);

    expect(existsSync(path.join(outside, ".git"))).toBe(false);
    expect(existsSync(path.join(outside, "candidate.txt"))).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks a receipt-parent escape raced in after worktree creation", () => {
    const fixture = createFixture();
    const outside = path.join(fixture.parent, "receipt-outside");
    mkdirSync(outside);

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(),
      testHook: (phase, { target }) => {
        if (phase !== "before-receipt-copy") return;
        symlinkSync(
          outside,
          path.join(target, "artifacts"),
          process.platform === "win32" ? "junction" : "dir",
        );
      },
    })).toThrow(/receipt parents must be real directories/iu);

    expect(existsSync(path.join(
      outside,
      "beta-checkpoints",
      "release-candidates",
      `${RUN_ID}.json`,
    ))).toBe(false);
    expect(existsSync(path.join(fixture.target, ".git"))).toBe(true);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("rejects an escaped run id before creating a sibling worktree root", () => {
    const fixture = createFixture();
    const result = materialize(fixture, [
      "--run-id=../escape",
      `--receipt=artifacts/beta-checkpoints/release-candidates/${RUN_ID}.json`,
      `--ref=${fixture.ref}`,
      `--sha=${fixture.candidateSha}`,
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Beta run id must be 3-64 lowercase letters or digits");
    expect(() => readFileSync(path.join(fixture.target, ".git"))).toThrow();
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("independently rescans raw candidate bytes instead of trusting a passing source receipt", () => {
    const fixture = createFixture();
    let rawScans = 0;

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(({ mode }) => {
        if (mode !== "dir") return;
        rawScans += 1;
        throw new Error("independent raw scan found a secret");
      }),
    })).toThrow(/independent raw scan found a secret/iu);

    expect(rawScans).toBe(1);
    expect(existsSync(fixture.target)).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("blocks before scanning when the source checkout changed after checkpoint publication", () => {
    const fixture = createFixture();
    writeFileSync(path.join(fixture.source, "source-only.txt"), "changed after checkpoint\n");
    let scans = 0;

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(() => {
        scans += 1;
      }),
    })).toThrow(/no longer matches the checkpointed source snapshot/iu);

    expect(scans).toBe(0);
    expect(readFileSync(path.join(fixture.source, "source-only.txt"), "utf8"))
      .toBe("changed after checkpoint\n");
    expect(existsSync(fixture.target)).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("rejects hidden source index flags before independent scanning", () => {
    for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
      const fixture = createFixture();
      git(fixture.source, ["update-index", flag, "candidate.txt"]);
      let scans = 0;

      expect(() => materializeCheckpoint({
        projectRoot: fixture.source,
        argv: materializationArguments(fixture),
        scanner: testScanner(() => {
          scans += 1;
        }),
      })).toThrow(/forbid assume-unchanged and skip-worktree/iu);

      expect(scans).toBe(0);
      expect(existsSync(fixture.target)).toBe(false);
    }
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("rejects a forged filter-safe claim before LFS or process filters can materialize", () => {
    const fixture = createFixture({ candidateFilter: true });
    let scans = 0;

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(() => {
        scans += 1;
      }),
    })).toThrow(/cannot use clean, smudge, process, or LFS filters/iu);

    expect(scans).toBe(0);
    expect(existsSync(fixture.target)).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("disables checkout and reference hooks during materialization", () => {
    const fixture = createFixture();
    const sentinel = path.join(fixture.parent, "materialize-hook-ran.txt");
    const hookBody = `#!/bin/sh\nprintf hook > '${sentinel.replaceAll("\\", "/")}'\n`;
    for (const hookName of ["post-checkout", "reference-transaction"]) {
      const hookPath = path.join(fixture.source, ".git", "hooks", hookName);
      writeFileSync(hookPath, hookBody);
      chmodSync(hookPath, 0o755);
    }

    const result = materialize(fixture);

    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(sentinel)).toBe(false);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

  it("revalidates source integrity after publishing the materialized receipt", () => {
    const fixture = createFixture();
    const sourcePath = path.join(fixture.source, "source-only.txt");

    expect(() => materializeCheckpoint({
      projectRoot: fixture.source,
      argv: materializationArguments(fixture),
      scanner: testScanner(),
      testHook: (phase) => {
        if (phase === "after-receipt-copy") {
          writeFileSync(sourcePath, "raced after materialized receipt publication\n");
        }
      },
    })).toThrow(/Source HEAD, worktree, or checkpoint receipt changed during materialization/iu);

    expect(readFileSync(sourcePath, "utf8"))
      .toBe("raced after materialized receipt publication\n");
    expect(existsSync(path.join(fixture.target, ".git"))).toBe(true);
  }, BETA_FILESYSTEM_TEST_TIMEOUT_MS);
});
