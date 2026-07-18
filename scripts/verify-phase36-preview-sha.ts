import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  assertPreviewShaEquality,
  sanitizeBuildIdentity,
} from "@/lib/screendesign/release-evidence";

interface PreviewArguments {
  readonly url: string;
  readonly expected: string;
  readonly inspectionSha: string | null;
}

const usage =
  "Usage: npx tsx scripts/verify-phase36-preview-sha.ts --url https://preview.example --expected HEAD [--inspection-sha FULL_SHA]";

const parseArguments = (argv: readonly string[]): PreviewArguments => {
  let url = "";
  let expected = "";
  let inspectionSha: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!["--url", "--expected", "--inspection-sha"].includes(option) || !value) {
      throw new Error(`Unknown or incomplete option: ${option}`);
    }
    if (option === "--url") url = value;
    if (option === "--expected") expected = value;
    if (option === "--inspection-sha") inspectionSha = value;
    index += 1;
  }
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "127.0.0.1") {
    throw new Error("--url must use HTTPS, except for 127.0.0.1 local verification.");
  }
  if (!expected) throw new Error("--expected is required.");
  return { url: parsedUrl.origin, expected, inspectionSha };
};

const runGit = (args: readonly string[]): string => {
  const result = spawnSync("git", [...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Could not resolve local Git identity with git ${args.join(" ")}.`);
  }
  return String(result.stdout).trim();
};

const findNpxCli = (): string | null => {
  if (process.platform !== "win32") return null;
  const pathValue = process.env.PATH ?? process.env.Path ?? "";
  for (const directory of pathValue.split(";")) {
    const clean = directory.replace(/^"|"$/gu, "");
    if (!clean) continue;
    const shim = path.win32.join(clean, "npx.cmd");
    const cli = path.win32.join(clean, "node_modules", "npm", "bin", "npx-cli.js");
    if (existsSync(shim) && existsSync(cli)) return cli;
  }
  return null;
};

const findShaInValue = (value: unknown): string | null => {
  if (typeof value === "string" && /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/iu.test(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = findShaInValue(child);
      if (found) return found;
    }
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const preferred of [
      "githubCommitSha",
      "gitCommitSha",
      "commitSha",
      "gitlabCommitSha",
      "bitbucketCommitSha",
    ]) {
      const found = findShaInValue(record[preferred]);
      if (found) return found;
    }
    for (const child of Object.values(record)) {
      const found = findShaInValue(child);
      if (found) return found;
    }
  }
  return null;
};

const inspectPreviewSha = (url: string): string => {
  const npxCli = findNpxCli();
  const file = npxCli ? process.execPath : process.platform === "win32" ? "npx.cmd" : "npx";
  const args = [
    ...(npxCli ? [npxCli] : []),
    "--no-install",
    "vercel",
    "inspect",
    url,
    "--json",
  ];
  const result = spawnSync(file, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      "Vercel inspection SHA was unavailable. Run authenticated `vercel inspect` or pass --inspection-sha.",
    );
  }
  const output = String(result.stdout).trim();
  let parsed: unknown = output;
  try {
    parsed = JSON.parse(output) as unknown;
  } catch {
    // Some Vercel versions print text even with --json; the full SHA scan below is fail-closed.
  }
  const sha = findShaInValue(parsed);
  if (!sha) throw new Error("Vercel inspection output did not contain a full Git SHA.");
  return sha;
};

export const main = async (
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> => {
  const args = parseArguments(argv);
  const expectedSha = runGit(["rev-parse", "--verify", `${args.expected}^{commit}`]);
  const inspectionSha =
    args.inspectionSha ?? process.env.VERCEL_INSPECTION_SHA ?? inspectPreviewSha(args.url);
  const response = await fetch(`${args.url}/api/build-info`, {
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Build identity endpoint returned HTTP ${response.status}.`);
  const identity = sanitizeBuildIdentity((await response.json()) as Record<string, unknown>);
  if (!identity.gitCommitSha || !identity.deploymentId) {
    throw new Error("Build identity endpoint did not return safe deployment identity.");
  }
  const equality = assertPreviewShaEquality({
    expectedSha,
    inspectionSha,
    servedSha: identity.gitCommitSha,
  });
  process.stdout.write(
    `${JSON.stringify(
      { status: "pass", ...equality, deploymentId: identity.deploymentId },
      null,
      2,
    )}\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
  process.exitCode = 1;
});
