import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  computeReleaseValidatorHash,
  readAndAssertValidationReceipt,
  validateReleaseEvidenceFilesystem,
  writeReleaseValidationReceipt,
} from "@/lib/screendesign/release-evidence";
import { REVIEW_OUTPUT_RELATIVE_ROOT } from "@/lib/screendesign/review-gallery";

interface CliArguments {
  expected: number;
  expectedSha: string;
  requireComplete: boolean;
  requiredFiles: string[];
  runId: string;
  writeReceipt: string | null;
}

const usage =
  "Usage: npx tsx scripts/validate-screendesign-review-gallery.ts --expected 47 --require-complete --expected-sha HEAD --run-id phase36-plan30 [--write-receipt test-results/screendesign-review/validation.json] [--require-file path]";

const takeValue = (argv: readonly string[], index: number, option: string): string => {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
  return value;
};

export const parseValidationArguments = (argv: readonly string[]): CliArguments => {
  const parsed: CliArguments = {
    expected: 0,
    expectedSha: "",
    requireComplete: false,
    requiredFiles: [],
    runId: "",
    writeReceipt: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--require-complete") {
      parsed.requireComplete = true;
      continue;
    }
    if (option === "--expected") {
      parsed.expected = Number(takeValue(argv, index, option));
      index += 1;
      continue;
    }
    if (option === "--expected-sha") {
      parsed.expectedSha = takeValue(argv, index, option);
      index += 1;
      continue;
    }
    if (option === "--run-id") {
      parsed.runId = takeValue(argv, index, option);
      index += 1;
      continue;
    }
    if (option === "--write-receipt") {
      parsed.writeReceipt = takeValue(argv, index, option);
      index += 1;
      continue;
    }
    if (option === "--require-file") {
      parsed.requiredFiles.push(takeValue(argv, index, option));
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${option}`);
  }

  if (parsed.expected !== 47) throw new Error("--expected must be exactly 47.");
  if (!parsed.requireComplete) throw new Error("--require-complete is required.");
  if (!parsed.expectedSha) throw new Error("--expected-sha is required.");
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(parsed.runId)) {
    throw new Error("--run-id must be a safe non-empty run id.");
  }
  return parsed;
};

const resolveGitSha = (projectRoot: string, ref: string): string => {
  const result = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Could not resolve expected Git SHA ${ref}.`);
  }
  return String(result.stdout).trim();
};

export const main = async (
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> => {
  const args = parseValidationArguments(argv);
  const projectRoot = process.cwd();
  const reviewRoot = path.join(
    projectRoot,
    ...REVIEW_OUTPUT_RELATIVE_ROOT.split("/"),
  );
  const expectedSha = resolveGitSha(projectRoot, args.expectedSha);
  const validatorHash = await computeReleaseValidatorHash(projectRoot);
  const result = await validateReleaseEvidenceFilesystem({
    projectRoot,
    reviewRoot,
    expectedCount: args.expected,
    expectedRunId: args.runId,
    expectedReleaseSha: expectedSha,
  });

  for (const requested of args.requiredFiles) {
    const requiredPath = path.resolve(projectRoot, requested);
    if (!(await stat(requiredPath)).isFile()) {
      throw new Error(`Required evidence file is not a file: ${requested}`);
    }
    if (requiredPath === path.join(reviewRoot, "validation.json")) {
      await readAndAssertValidationReceipt({
        filePath: requiredPath,
        result,
        validatorHash,
      });
    } else {
      await readFile(requiredPath);
    }
  }

  let receiptPath: string | null = null;
  if (args.writeReceipt) {
    receiptPath = path.resolve(projectRoot, args.writeReceipt);
    await writeReleaseValidationReceipt({
      projectRoot,
      reviewRoot,
      outputPath: receiptPath,
      result,
      validatorHash,
    });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "pass",
        count: result.count,
        runId: result.runId,
        releaseSha: result.releaseSha,
        indexSha256: result.indexSha256,
        validatorSha256: validatorHash,
        receipt: receiptPath
          ? path.relative(projectRoot, receiptPath).replaceAll("\\", "/")
          : null,
      },
      null,
      2,
    )}\n`,
  );
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n${usage}\n`);
  process.exitCode = 1;
});
