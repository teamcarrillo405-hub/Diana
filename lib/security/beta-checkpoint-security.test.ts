import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";

import {
  TEST_CHECKPOINT_SCANNER,
  installedTestGitleaks,
  testReleasePolicy,
  writeTestCheckpointPolicy,
} from "../beta/checkpoint-provenance.test-fixtures";
import { PINNED_GIT_EXECUTABLE } from "../../scripts/beta/trusted-executables.mjs";

const CHECKPOINT = path.join(
  process.cwd(),
  "scripts",
  "beta",
  "checkpoint.mjs",
);

type ScanContext = {
  mode: "git" | "dir";
  target: string;
  configPath: string;
  reportPath: string;
  projectRoot: string;
};

type Scanner = {
  identity: typeof TEST_CHECKPOINT_SCANNER;
  scan(context: ScanContext): void;
};

type CheckpointReceipt = {
  checkpointCommit: string;
  checkpointRef: string;
  receiptPath: string;
};

type CreateCheckpoint = (input: {
  projectRoot: string;
  argv: string[];
  environment?: NodeJS.ProcessEnv;
  scanner?: Scanner;
  temporaryParent?: string;
  testHook?: (
    phase: "after-receipt-publish",
    context: { receiptPath: string; checkpointRef: string; checkpointCommit: string },
  ) => void;
  cleanupTestHook?: (
    phase: "after-directory-list",
    context: { directory: string; entries: string[] },
  ) => void;
  scannerExecutionTestHook?: (
    phase: "scanner-copy-ready" | "scanner-descriptor-ready",
    context: { executablePath: string },
  ) => void;
}) => CheckpointReceipt;

type ResolvePosixScannerDescriptorPath = (input: {
  childDescriptor?: number;
  filesystemType: bigint | number;
  platform: string;
}) => string;

type Fixture = {
  ownerRoot: string;
  projectRoot: string;
  parentSha: string;
};

const cleanupRoots = new Set<string>();
const REAL_GITLEAKS = installedTestGitleaks();
const realGitleaksIt = process.platform === "win32" && process.arch === "x64" ? it : it.skip;
const posixLinuxIt = process.platform === "linux" ? it : it.skip;
let createCheckpoint: CreateCheckpoint;
let resolvePosixScannerDescriptorPath: ResolvePosixScannerDescriptorPath;

beforeAll(async () => {
  const checkpointModule = await import(pathToFileURL(CHECKPOINT).href) as {
    createCheckpoint: CreateCheckpoint;
    resolvePosixScannerDescriptorPath: ResolvePosixScannerDescriptorPath;
  };
  createCheckpoint = checkpointModule.createCheckpoint;
  resolvePosixScannerDescriptorPath = checkpointModule.resolvePosixScannerDescriptorPath;
});

afterEach(() => {
  for (const root of cleanupRoots) rmSync(root, { recursive: true, force: true });
  cleanupRoots.clear();
});

function cleanEnvironment(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  ) as NodeJS.ProcessEnv;
}

function runGit(projectRoot: string, args: string[], encoding: "utf8" | "buffer" = "utf8") {
  return spawnSync(PINNED_GIT_EXECUTABLE, args, {
    cwd: projectRoot,
    encoding,
    env: cleanEnvironment(),
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function gitText(projectRoot: string, args: string[]): string {
  const result = runGit(projectRoot, args, "utf8");
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
    throw new Error(String(result.stderr || result.error || `git ${args[0]} failed`));
  }
  return result.stdout.trim();
}

function gitBuffer(projectRoot: string, args: string[]): Buffer {
  const result = runGit(projectRoot, args, "buffer");
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error(
      Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8")
        : String(result.error || `git ${args[0]} failed`),
    );
  }
  return result.stdout;
}

function createFixture(
  policy: Record<string, unknown> = testReleasePolicy({
    restoreFromHead: ["protected.txt"],
  }),
): Fixture {
  const ownerRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-checkpoint-test-"));
  cleanupRoots.add(ownerRoot);
  const projectRoot = path.join(ownerRoot, "repo");
  mkdirSync(projectRoot);
  gitText(projectRoot, ["init", "--quiet"]);
  gitText(projectRoot, ["config", "user.name", "Checkpoint Test"]);
  gitText(projectRoot, ["config", "user.email", "checkpoint@example.invalid"]);
  gitText(projectRoot, ["config", "core.autocrlf", "false"]);
  writeFileSync(
    path.join(projectRoot, ".gitignore"),
    "/artifacts/\n/ignored-secret.txt\n",
  );
  writeFileSync(path.join(projectRoot, ".gitattributes"), "*.txt text eol=crlf\n");
  writeFileSync(path.join(projectRoot, "protected.txt"), "trusted protected bytes\n");
  writeFileSync(path.join(projectRoot, "baseline.txt"), "baseline\n");
  writeTestCheckpointPolicy(projectRoot, policy);
  gitText(projectRoot, ["add", "."]);
  gitText(projectRoot, ["commit", "--quiet", "-m", "trusted checkpoint policy"]);
  return {
    ownerRoot,
    projectRoot,
    parentSha: gitText(projectRoot, ["rev-parse", "HEAD"]),
  };
}

function createFakePosixGitleaks() {
  const root = mkdtempSync(path.join(tmpdir(), "diana-fake-gitleaks-"));
  cleanupRoots.add(root);
  const executable = path.join(root, "gitleaks");
  const bytes = Buffer.from([
    "#!/bin/sh",
    "if [ \"$1\" = \"--version\" ]; then",
    "  printf '%s\\n' 'gitleaks version 8.30.1'",
    "  exit 0",
    "fi",
    "report=''",
    "for argument in \"$@\"; do",
    "  case \"$argument\" in",
    "    --report-path=*) report=${argument#--report-path=} ;;",
    "  esac",
    "done",
    "if [ -z \"$report\" ]; then exit 90; fi",
    "printf '[]\\n' > \"$report\"",
    "exit 0",
    "",
  ].join("\n"), "utf8");
  writeFileSync(executable, bytes, { mode: 0o500 });
  chmodSync(executable, 0o500);
  return {
    executable,
    identity: {
      name: "gitleaks" as const,
      version: "8.30.1",
      binarySha256: createHash("sha256").update(bytes).digest("hex"),
      platform: process.platform,
      arch: process.arch,
    },
  };
}

function scanner(scan: Scanner["scan"] = () => {}): Scanner {
  return {
    identity: TEST_CHECKPOINT_SCANNER,
    scan(context) {
      scan(context);
      if (!existsSync(context.reportPath)) writeFileSync(context.reportPath, "[]\n");
    },
  };
}

function checkpoint(
  fixture: Fixture,
  runId: string,
  options: {
    scanner?: Scanner;
    environment?: NodeJS.ProcessEnv;
    temporaryParent?: string;
    testHook?: (
      phase: "after-receipt-publish",
      context: { receiptPath: string; checkpointRef: string; checkpointCommit: string },
    ) => void;
    cleanupTestHook?: (
      phase: "after-directory-list",
      context: { directory: string; entries: string[] },
    ) => void;
  } = {},
): CheckpointReceipt {
  return createCheckpoint({
    projectRoot: fixture.projectRoot,
    argv: [`--name=${runId}`, "--profile=release"],
    scanner: options.scanner ?? scanner(),
    environment: options.environment,
    temporaryParent: options.temporaryParent,
    testHook: options.testHook,
    cleanupTestHook: options.cleanupTestHook,
  });
}

function checkpointTemporaryRoots(fixture: Fixture): string[] {
  return readdirSync(fixture.ownerRoot)
    .filter((entry) => entry.startsWith("diana-beta-checkpoint-"));
}

function productionCheckpoint(
  fixture: Fixture,
  runId: string,
  executable: string,
  scannerExecutionTestHook?: (
    phase: "scanner-copy-ready" | "scanner-descriptor-ready",
    context: { executablePath: string },
  ) => void,
): CheckpointReceipt {
  return createCheckpoint({
    projectRoot: fixture.projectRoot,
    argv: [`--name=${runId}`, "--profile=release"],
    environment: {
      ...cleanEnvironment(),
      DIANA_GITLEAKS_BIN: executable,
    },
    temporaryParent: fixture.ownerRoot,
    scannerExecutionTestHook,
  });
}

function receiptPath(fixture: Fixture, runId: string): string {
  return path.join(
    fixture.projectRoot,
    "artifacts",
    "beta-checkpoints",
    "release-candidates",
    `${runId}.json`,
  );
}

function expectNoCheckpoint(fixture: Fixture, runId: string): void {
  expect(existsSync(receiptPath(fixture, runId))).toBe(false);
  expect(runGit(
    fixture.projectRoot,
    ["show-ref", "--verify", "--quiet", `refs/beta/release-candidates/${runId}`],
  ).status).not.toBe(0);
}

describe("beta checkpoint security boundary", { timeout: 30_000 }, () => {
  it("uses HEAD policy and restores protected deletions in the alternate index", () => {
    const fixture = createFixture();
    const trustedPolicy = readFileSync(
      path.join(fixture.projectRoot, "config", "beta-release-manifest.json"),
    );
    rmSync(path.join(fixture.projectRoot, "protected.txt"));
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");
    writeFileSync(path.join(fixture.projectRoot, "ignored-secret.txt"), "must stay ignored\n");
    writeTestCheckpointPolicy(fixture.projectRoot, testReleasePolicy({
      includeFromWorktree: ["ignored-secret.txt"],
    }));

    const receipt = checkpoint(fixture, "beta-policy-attack");

    expect(gitBuffer(
      fixture.projectRoot,
      ["show", `${receipt.checkpointCommit}:config/beta-release-manifest.json`],
    )).toEqual(trustedPolicy);
    expect(gitBuffer(
      fixture.projectRoot,
      ["show", `${receipt.checkpointCommit}:protected.txt`],
    ).toString("utf8")).toBe("trusted protected bytes\n");
    expect(runGit(
      fixture.projectRoot,
      ["cat-file", "-e", `${receipt.checkpointCommit}:ignored-secret.txt`],
    ).status).not.toBe(0);
    expect(existsSync(path.join(fixture.projectRoot, "protected.txt"))).toBe(false);
  });

  it("scans byte-for-byte Git blobs without checkout or smudge conversion", () => {
    const fixture = createFixture();
    const worktreeBytes = Buffer.from("line one\r\nline two\r\n", "utf8");
    writeFileSync(path.join(fixture.projectRoot, "raw.txt"), worktreeBytes);
    let mirroredBytes: Buffer | null = null;
    const receipt = checkpoint(fixture, "beta-raw-blob", {
      scanner: scanner(({ mode, target }) => {
        if (mode === "dir") mirroredBytes = readFileSync(path.join(target, "raw.txt"));
      }),
    });
    const blobSha = gitText(
      fixture.projectRoot,
      ["rev-parse", `${receipt.checkpointCommit}:raw.txt`],
    );
    const blobBytes = gitBuffer(fixture.projectRoot, ["cat-file", "blob", blobSha]);

    expect(mirroredBytes).toEqual(blobBytes);
    expect(blobBytes.toString("utf8")).toBe("line one\nline two\n");
    expect(mirroredBytes).not.toEqual(worktreeBytes);
  });

  it("rejects a symbolic link forged into the alternate index after scanning", () => {
    const fixture = createFixture();
    const runId = "beta-forged-symlink";
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "../outside\n");
    const linkBlob = gitText(
      fixture.projectRoot,
      ["hash-object", "-w", "--", "candidate.txt"],
    );
    let forged = false;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(({ mode, reportPath }) => {
        if (mode !== "dir" || forged) return;
        forged = true;
        const result = spawnSync(PINNED_GIT_EXECUTABLE, [
          "update-index",
          "--add",
          "--cacheinfo",
          "120000",
          linkBlob,
          "forged-link",
        ], {
          cwd: fixture.projectRoot,
          encoding: "utf8",
          env: {
            ...cleanEnvironment(),
            GIT_INDEX_FILE: path.join(path.dirname(reportPath), "index"),
          },
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
        });
        if (result.error || result.status !== 0) {
          throw new Error(result.stderr || "Could not forge the alternate-index symlink.");
        }
      }),
      temporaryParent: fixture.ownerRoot,
    })).toThrow(/checkpoint candidate contains a symbolic link/iu);

    expect(forged).toBe(true);
    expect(checkpointTemporaryRoots(fixture)).toEqual([]);
    expectNoCheckpoint(fixture, runId);
  });

  it("detects a scan-mirror symlink swap before accepting the candidate scan", () => {
    const fixture = createFixture();
    const runId = "beta-mirror-escape";
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");
    const outside = path.join(fixture.ownerRoot, "outside-mirror");
    mkdirSync(outside);
    writeFileSync(path.join(outside, "sentinel.txt"), "outside remains untouched\n");
    let swapped = false;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(({ mode, target }) => {
        if (mode !== "dir" || swapped) return;
        swapped = true;
        renameSync(target, `${target}-original`);
        symlinkSync(outside, target, process.platform === "win32" ? "junction" : "dir");
      }),
      temporaryParent: fixture.ownerRoot,
    })).toThrow(/candidate scan mirror changed, became symbolic, or escaped/iu);

    expect(swapped).toBe(true);
    expect(readFileSync(path.join(outside, "sentinel.txt"), "utf8"))
      .toBe("outside remains untouched\n");
    expect(checkpointTemporaryRoots(fixture)).toEqual([]);
    expectNoCheckpoint(fixture, runId);
  });

  it("blocks Playwright browser authentication state before invoking the scanner", () => {
    const fixture = createFixture();
    const runId = "beta-browser-auth";
    mkdirSync(path.join(fixture.projectRoot, "playwright", ".auth"), { recursive: true });
    writeFileSync(
      path.join(fixture.projectRoot, "playwright", ".auth", "user.json"),
      "{\"cookies\":[]}",
    );
    let scans = 0;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        scans += 1;
      }),
    })).toThrow(/local secret or browser-session path/iu);
    expect(scans).toBe(0);
    expectNoCheckpoint(fixture, runId);
  });

  it("rejects arbitrary DIANA_GITLEAKS_BIN and unpinned injected identities", () => {
    const executableFixture = createFixture();
    expect(() => createCheckpoint({
      projectRoot: executableFixture.projectRoot,
      argv: ["--name=beta-arbitrary-scanner", "--profile=release"],
      environment: {
        ...cleanEnvironment(),
        DIANA_GITLEAKS_BIN: process.execPath,
      },
    })).toThrow(/semantic version|not pinned/iu);
    expectNoCheckpoint(executableFixture, "beta-arbitrary-scanner");

    const identityFixture = createFixture();
    let scans = 0;
    expect(() => checkpoint(identityFixture, "beta-unpinned-scanner", {
      scanner: {
        identity: {
          ...TEST_CHECKPOINT_SCANNER,
          binarySha256: "f".repeat(64),
        },
        scan: () => {
          scans += 1;
        },
      },
    })).toThrow(/not pinned by the HEAD beta release policy/iu);
    expect(scans).toBe(0);
    expectNoCheckpoint(identityFixture, "beta-unpinned-scanner");
  });

  it("allows only genuine Linux procfs descriptor execution without a pathname fallback", () => {
    expect(resolvePosixScannerDescriptorPath({
      platform: "linux",
      filesystemType: 0x9fa0,
      childDescriptor: 3,
    })).toBe("/proc/self/fd/3");

    expect(() => resolvePosixScannerDescriptorPath({
      platform: "darwin",
      filesystemType: 0x9fa0,
    })).toThrow(/unsupported on darwin.*pathname execution is forbidden/iu);

    expect(() => resolvePosixScannerDescriptorPath({
      platform: "linux",
      filesystemType: 0x65735546,
    })).toThrow(/requires procfs.*pathname execution is forbidden/iu);
  });

  it("pins the production Windows and Linux x64 scanner executables", () => {
    const manifest = JSON.parse(readFileSync(
      path.resolve("config", "beta-release-manifest.json"),
      "utf8",
    )) as {
      gitleaks: {
        allowedBinaries: Array<{ arch: string; platform: string; sha256: string }>;
        version: string;
      };
    };

    expect(manifest.gitleaks.version).toBe("8.30.1");
    expect(manifest.gitleaks.allowedBinaries).toEqual(expect.arrayContaining([
      {
        platform: "win32",
        arch: "x64",
        sha256: "17157e2ee8b76fc8b1d8bee607a250e34b8a8023c8bc81822d4b5ee4d78fcb7c",
      },
      {
        platform: "linux",
        arch: "x64",
        sha256: "88f91962aa2f93ac6ab281d553b9e125f5197bbbce38f9f2437f7299c32e5509",
      },
    ]));
  });

  posixLinuxIt("runs the production checkpoint through the verified scanner descriptor", () => {
    const fake = createFakePosixGitleaks();
    const fixture = createFixture(testReleasePolicy({ scanner: fake.identity }));
    const receipt = productionCheckpoint(fixture, "beta-posix-descriptor", fake.executable);

    expect(receipt.checkpointCommit).toMatch(/^[a-f0-9]{40}$/u);
    expect(gitText(fixture.projectRoot, [
      "show-ref",
      "--verify",
      "--hash",
      receipt.checkpointRef,
    ])).toBe(receipt.checkpointCommit);
  }, 30_000);

  posixLinuxIt("keeps executing the verified inode after its detached path is replaced", () => {
    const fake = createFakePosixGitleaks();
    const fixture = createFixture(testReleasePolicy({ scanner: fake.identity }));
    let replaced = false;

    const receipt = productionCheckpoint(
      fixture,
      "beta-posix-path-replacement",
      fake.executable,
      (phase, { executablePath }) => {
        if (phase !== "scanner-descriptor-ready") return;
        replaced = true;
        expect(existsSync(executablePath)).toBe(false);
        writeFileSync(executablePath, "#!/bin/sh\nexit 97\n", { mode: 0o500 });
        chmodSync(executablePath, 0o500);
      },
    );

    expect(replaced).toBe(true);
    expect(receipt.checkpointCommit).toMatch(/^[a-f0-9]{40}$/u);
  }, 30_000);

  posixLinuxIt("fails closed when the private scanner path is unlinked before detachment", () => {
    const fake = createFakePosixGitleaks();
    const fixture = createFixture(testReleasePolicy({ scanner: fake.identity }));
    const runId = "beta-posix-unlink-attempt";
    let unlinkAttempted = false;

    expect(() => productionCheckpoint(
      fixture,
      runId,
      fake.executable,
      (phase, { executablePath }) => {
        if (phase !== "scanner-copy-ready") return;
        unlinkAttempted = true;
        expect(existsSync(executablePath)).toBe(true);
        rmSync(executablePath);
      },
    )).toThrow(/metadata changed after it was opened/iu);

    expect(unlinkAttempted).toBe(true);
    expectNoCheckpoint(fixture, runId);
  }, 30_000);

  posixLinuxIt("fails closed when the opened private scanner digest changes", () => {
    const fake = createFakePosixGitleaks();
    const fixture = createFixture(testReleasePolicy({ scanner: fake.identity }));
    const runId = "beta-posix-digest-mismatch";
    let changed = false;

    expect(() => productionCheckpoint(
      fixture,
      runId,
      fake.executable,
      (phase, { executablePath }) => {
        if (phase !== "scanner-copy-ready") return;
        changed = true;
        chmodSync(executablePath, 0o700);
        writeFileSync(executablePath, "#!/bin/sh\nexit 0\n");
      },
    )).toThrow(/digest does not match the policy-pinned binary/iu);

    expect(changed).toBe(true);
    expectNoCheckpoint(fixture, runId);
  }, 30_000);

  it("rejects repository-local Git and Windows locator shadowing before scanning", () => {
    for (const executableName of ["git.exe", "where.exe", "gitleaks.exe"]) {
      const fixture = createFixture();
      const runId = `beta-shadow-${path.parse(executableName).name}`;
      const shadow = path.join(fixture.projectRoot, executableName);
      writeFileSync(shadow, "repository-controlled shadow\n");
      let scans = 0;

      expect(() => checkpoint(fixture, runId, {
        scanner: scanner(() => {
          scans += 1;
        }),
      })).toThrow(/repository-local executable shadowing is forbidden/iu);

      expect(scans).toBe(0);
      rmSync(shadow);
      expectNoCheckpoint(fixture, runId);
    }
  });

  it("rejects assume-unchanged and skip-worktree index entries before scanning", () => {
    for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
      const fixture = createFixture();
      const runId = `beta-index-${flag.slice(2)}`;
      gitText(fixture.projectRoot, ["update-index", flag, "baseline.txt"]);
      let scans = 0;

      expect(() => checkpoint(fixture, runId, {
        scanner: scanner(() => {
          scans += 1;
        }),
      })).toThrow(/forbid assume-unchanged and skip-worktree/iu);

      expect(scans).toBe(0);
      expectNoCheckpoint(fixture, runId);
    }
  });

  realGitleaksIt("uses Gitleaks 8.30.1 to reject a candidate gitleaks:allow suppression", () => {
    expect(REAL_GITLEAKS, "Gitleaks 8.30.1 is required on the release platform").not.toBeNull();
    const real = REAL_GITLEAKS!;
    const fixture = createFixture(testReleasePolicy({ scanner: real.identity }));
    const runId = "beta-real-allow-suppression";
    const token = ["ghp_", "7wJf9K2mQ4xV8cN1", "pR6tY3uI5oL0aS2dF7hG"].join("");
    expect(token).toHaveLength(40);
    writeFileSync(
      path.join(fixture.projectRoot, "suppressed-secret.ts"),
      `export const token = "${token}"; // gitleaks:allow\n`,
    );

    expect(() => productionCheckpoint(fixture, runId, real.executable))
      .toThrow(/Gitleaks dir scan did not pass/iu);

    expectNoCheckpoint(fixture, runId);
  }, 30_000);

  realGitleaksIt("scans secrets inside candidate archives", () => {
    expect(REAL_GITLEAKS, "Gitleaks 8.30.1 is required on the release platform").not.toBeNull();
    const real = REAL_GITLEAKS!;
    const fixture = createFixture(testReleasePolicy({ scanner: real.identity }));
    const runId = "beta-real-archive-scan";
    const token = ["ghp_", "ZYXWVUTSRQPONMLKJI", "HGFEDCBAabcdefghij"].join("");
    writeFileSync(
      path.join(fixture.projectRoot, "candidate-secrets.zip"),
      Buffer.from(zipSync({
        "secret.txt": strToU8(`token=${token}\n`),
      })),
    );

    expect(() => productionCheckpoint(fixture, runId, real.executable))
      .toThrow(/Gitleaks dir scan did not pass/iu);

    expectNoCheckpoint(fixture, runId);
  }, 30_000);

  realGitleaksIt("fails closed when the private scanner copy is swapped before execution", () => {
    expect(REAL_GITLEAKS, "Gitleaks 8.30.1 is required on the release platform").not.toBeNull();
    const real = REAL_GITLEAKS!;
    const fixture = createFixture(testReleasePolicy({ scanner: real.identity }));
    const runId = "beta-private-scanner-swap";
    const sourceCopy = path.join(fixture.ownerRoot, "trusted-gitleaks.exe");
    copyFileSync(real.executable, sourceCopy);
    let swapped = false;

    expect(() => productionCheckpoint(
      fixture,
      runId,
      sourceCopy,
      (phase, { executablePath }) => {
        if (phase !== "scanner-copy-ready" || swapped) return;
        swapped = true;
        renameSync(executablePath, `${executablePath}.original`);
        copyFileSync(process.execPath, executablePath);
      },
    )).toThrow(/locked Gitleaks executable did not report the policy-pinned version/iu);

    expect(swapped).toBe(true);
    expectNoCheckpoint(fixture, runId);
  }, 30_000);

  it("removes the temporary mirror and leaves no ref when scanning fails", () => {
    const fixture = createFixture();
    const runId = "beta-scan-failure";
    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        throw new Error("adversarial scanner failure");
      }),
      temporaryParent: fixture.ownerRoot,
    })).toThrow(/adversarial scanner failure/iu);
    expect(checkpointTemporaryRoots(fixture)).toEqual([]);
    expectNoCheckpoint(fixture, runId);
  });

  it("detects a worktree change made during the scan and cleans up", () => {
    const fixture = createFixture();
    const runId = "beta-worktree-race";
    writeFileSync(path.join(fixture.projectRoot, "race.txt"), "before\n");
    let changed = false;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        if (!changed) {
          changed = true;
          writeFileSync(path.join(fixture.projectRoot, "race.txt"), "after\n");
        }
      }),
      temporaryParent: fixture.ownerRoot,
    })).toThrow(/Source HEAD, index, or worktree changed/iu);
    expect(checkpointTemporaryRoots(fixture)).toEqual([]);
    expectNoCheckpoint(fixture, runId);
  });

  it("detects a HEAD change made during the scan and cleans up", () => {
    const fixture = createFixture();
    const runId = "beta-head-race";
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");
    let changed = false;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        if (!changed) {
          changed = true;
          gitText(fixture.projectRoot, [
            "commit",
            "--quiet",
            "--allow-empty",
            "-m",
            "concurrent HEAD change",
          ]);
        }
      }),
      temporaryParent: fixture.ownerRoot,
    })).toThrow(/Source HEAD, index, or worktree changed/iu);
    expect(gitText(fixture.projectRoot, ["rev-parse", "HEAD"])).not.toBe(fixture.parentSha);
    expect(checkpointTemporaryRoots(fixture)).toEqual([]);
    expectNoCheckpoint(fixture, runId);
  });

  it("rejects Git replacement objects before reading policy or invoking the scanner", () => {
    const fixture = createFixture();
    const runId = "beta-replacement-object";
    const tree = gitText(fixture.projectRoot, ["rev-parse", `${fixture.parentSha}^{tree}`]);
    const replacement = gitText(fixture.projectRoot, [
      "commit-tree",
      tree,
      "-m",
      "adversarial replacement",
    ]);
    gitText(fixture.projectRoot, ["replace", fixture.parentSha, replacement]);
    let scans = 0;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        scans += 1;
      }),
    })).toThrow(/replacement objects are forbidden/iu);

    expect(scans).toBe(0);
    expectNoCheckpoint(fixture, runId);
  });

  it("rejects effective LFS or custom filters before Git add can execute them", () => {
    const fixture = createFixture();
    const runId = "beta-filter-rejected";
    writeFileSync(path.join(fixture.projectRoot, ".gitattributes"), "*.txt filter=lfs\n");
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");
    gitText(fixture.projectRoot, ["config", "filter.lfs.required", "true"]);
    gitText(fixture.projectRoot, ["config", "filter.lfs.clean", "command-that-must-not-run"]);
    let scans = 0;

    expect(() => checkpoint(fixture, runId, {
      scanner: scanner(() => {
        scans += 1;
      }),
    })).toThrow(/cannot use clean, smudge, process, or LFS filters/iu);

    expect(scans).toBe(0);
    expect(readFileSync(path.join(fixture.projectRoot, "candidate.txt"), "utf8"))
      .toBe("candidate\n");
    expectNoCheckpoint(fixture, runId);
  });

  it("disables index and reference hooks for every checkpoint Git mutation", () => {
    const fixture = createFixture();
    const sentinel = path.join(fixture.ownerRoot, "hook-ran.txt");
    const hookBody = `#!/bin/sh\nprintf hook > '${sentinel.replaceAll("\\", "/")}'\n`;
    for (const hookName of ["post-index-change", "reference-transaction"]) {
      const hookPath = path.join(fixture.projectRoot, ".git", "hooks", hookName);
      writeFileSync(hookPath, hookBody);
      chmodSync(hookPath, 0o755);
    }
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");

    checkpoint(fixture, "beta-hooks-disabled");

    expect(existsSync(sentinel)).toBe(false);
  });

  it("will not place or recursively clean a temporary root inside the source checkout", () => {
    const fixture = createFixture();
    const runId = "beta-temp-containment";
    const sentinel = path.join(fixture.projectRoot, "keep-dirty.txt");
    writeFileSync(sentinel, "dirty source must survive\n");

    expect(() => checkpoint(fixture, runId, {
      temporaryParent: fixture.projectRoot,
    })).toThrow(/cannot contain or be contained by the source checkout/iu);

    expect(readFileSync(sentinel, "utf8")).toBe("dirty source must survive\n");
    expectNoCheckpoint(fixture, runId);
  });

  it("detects a source race after receipt publication and removes only its own artifacts", () => {
    const fixture = createFixture();
    const runId = "beta-publication-race";
    const dirtyPath = path.join(fixture.projectRoot, "publication-race.txt");
    writeFileSync(dirtyPath, "before\n");

    expect(() => checkpoint(fixture, runId, {
      testHook: (phase) => {
        if (phase === "after-receipt-publish") writeFileSync(dirtyPath, "after\n");
      },
    })).toThrow(/integrity changed through successful receipt publication/iu);

    expect(readFileSync(dirtyPath, "utf8")).toBe("after\n");
    expectNoCheckpoint(fixture, runId);
  });

  it("requires a real empty scanner report instead of trusting an injected success claim", () => {
    const fixture = createFixture();
    const runId = "beta-missing-scan-report";
    writeFileSync(path.join(fixture.projectRoot, "candidate.txt"), "candidate\n");

    expect(() => checkpoint(fixture, runId, {
      scanner: {
        identity: TEST_CHECKPOINT_SCANNER,
        scan: () => {},
      },
    })).toThrow(/Gitleaks git report is not a regular file/iu);

    expectNoCheckpoint(fixture, runId);
  });

  it("stops cleanup when an enumerated directory is replaced by a junction", () => {
    const fixture = createFixture();
    const runId = "beta-cleanup-junction-race";
    const nested = path.join(fixture.projectRoot, "nested");
    mkdirSync(nested);
    writeFileSync(path.join(nested, "candidate.txt"), "candidate\n");
    const outside = path.join(fixture.ownerRoot, "cleanup-outside");
    mkdirSync(outside);
    const sentinel = path.join(outside, "sentinel.txt");
    writeFileSync(sentinel, "outside remains\n");
    let raced = false;

    expect(() => checkpoint(fixture, runId, {
      temporaryParent: fixture.ownerRoot,
      cleanupTestHook: (phase, { directory }) => {
        if (phase !== "after-directory-list" || raced || path.basename(directory) !== "nested") {
          return;
        }
        raced = true;
        renameSync(directory, `${directory}-original`);
        symlinkSync(outside, directory, process.platform === "win32" ? "junction" : "dir");
      },
    })).toThrow(/temporary directory changed during cleanup/iu);

    expect(raced).toBe(true);
    expect(readFileSync(sentinel, "utf8")).toBe("outside remains\n");
    expectNoCheckpoint(fixture, runId);
  });
});
