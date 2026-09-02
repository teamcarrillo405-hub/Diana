import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  generateBetaEducationalEvaluationCorpusManifest,
  generateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-harness";
import {
  BetaEducationalEvaluationManifestValidationError,
  validateBetaEducationalEvaluationCorpusManifest,
  validateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-validator";

const MAX_INPUT_BYTES = 64 * 1024 * 1024;

export const BETA_EDUCATIONAL_EVALUATION_HARNESS_USAGE = `Usage:
  tsx scripts/beta/evaluation-harness.ts corpus
  tsx scripts/beta/evaluation-harness.ts sample
  tsx scripts/beta/evaluation-harness.ts validate-corpus --input=<manifest.json>
  tsx scripts/beta/evaluation-harness.ts validate-sample --input=<manifest.json>

The generated JSON contains case definitions or sampling instructions only.
It is awaiting model execution or expert review and contains no results or judgments.`;

export type BetaEducationalEvaluationHarnessCommand =
  | "corpus"
  | "sample"
  | "validate-corpus"
  | "validate-sample";

export interface BetaEducationalEvaluationHarnessCliOptions {
  readonly help: boolean;
  readonly command: BetaEducationalEvaluationHarnessCommand | null;
  readonly inputPath: string | null;
}

export interface BetaEducationalEvaluationHarnessCliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly cwd: string;
}

const DEFAULT_IO: BetaEducationalEvaluationHarnessCliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  cwd: process.cwd(),
};

function commandFrom(value: string): BetaEducationalEvaluationHarnessCommand {
  if (
    value === "corpus" ||
    value === "sample" ||
    value === "validate-corpus" ||
    value === "validate-sample"
  ) {
    return value;
  }
  throw new Error(`Unknown educational evaluation harness command: ${value}.`);
}

export function parseBetaEducationalEvaluationHarnessCliArguments(
  argv: readonly string[],
): BetaEducationalEvaluationHarnessCliOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    if (argv.length !== 1) {
      throw new Error("Help cannot be combined with another argument.");
    }
    return { help: true, command: null, inputPath: null };
  }
  if (argv.length === 0) {
    throw new Error("An educational evaluation harness command is required.");
  }

  const command = commandFrom(argv[0]);
  let inputPath: string | null = null;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--input") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--input requires a file path.");
      }
      if (inputPath !== null) {
        throw new Error("--input may only be provided once.");
      }
      inputPath = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--input=")) {
      const value = argument.slice("--input=".length);
      if (!value) throw new Error("--input requires a file path.");
      if (inputPath !== null) {
        throw new Error("--input may only be provided once.");
      }
      inputPath = value;
      continue;
    }
    throw new Error(`Unknown educational evaluation harness argument: ${argument}.`);
  }

  const validates = command === "validate-corpus" || command === "validate-sample";
  if (validates && inputPath === null) {
    throw new Error(`${command} requires --input.`);
  }
  if (!validates && inputPath !== null) {
    throw new Error(`${command} does not accept --input.`);
  }
  return { help: false, command, inputPath };
}

function readStrictJsonInput(cwd: string, inputPath: string): unknown {
  const resolved = path.resolve(cwd, inputPath);
  if (!existsSync(resolved)) {
    throw new Error("The evaluation input file does not exist.");
  }
  const stats = lstatSync(resolved);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error("The evaluation input must be a regular file, not a symbolic link.");
  }
  if (stats.size > MAX_INPUT_BYTES) {
    throw new Error("The evaluation input exceeds the 64 MiB size limit.");
  }
  try {
    return JSON.parse(readFileSync(resolved, "utf8")) as unknown;
  } catch {
    throw new Error("The evaluation input must contain valid JSON.");
  }
}

function validationErrorMessage(error: unknown): string {
  if (error instanceof BetaEducationalEvaluationManifestValidationError) {
    const displayed = error.issues.slice(0, 20);
    const remaining = error.issues.length - displayed.length;
    return [
      error.message,
      ...displayed.map((issue) => `- ${issue}`),
      ...(remaining > 0 ? [`- ${remaining} additional issues were omitted.`] : []),
    ].join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

export function runBetaEducationalEvaluationHarnessCli(
  argv: readonly string[],
  io: Partial<BetaEducationalEvaluationHarnessCliIo> = {},
): number {
  const output = { ...DEFAULT_IO, ...io };
  try {
    const options = parseBetaEducationalEvaluationHarnessCliArguments(argv);
    if (options.help) {
      output.stdout(`${BETA_EDUCATIONAL_EVALUATION_HARNESS_USAGE}\n`);
      return 0;
    }

    switch (options.command) {
      case "corpus":
        output.stdout(
          `${JSON.stringify(generateBetaEducationalEvaluationCorpusManifest(), null, 2)}\n`,
        );
        return 0;
      case "sample":
        output.stdout(
          `${JSON.stringify(generateBetaEducationalEvaluationExpertSampleManifest(), null, 2)}\n`,
        );
        return 0;
      case "validate-corpus": {
        const manifest = validateBetaEducationalEvaluationCorpusManifest(
          readStrictJsonInput(output.cwd, options.inputPath!),
        );
        output.stdout(`${JSON.stringify({
          status: "valid_input_awaiting_execution",
          artifactKind: manifest.artifactKind,
          corpusVersion: manifest.corpusVersion,
          caseCount: manifest.caseCount,
          containsModelResults: manifest.containsModelResults,
          containsExpertJudgments: manifest.containsExpertJudgments,
        }, null, 2)}\n`);
        return 0;
      }
      case "validate-sample": {
        const manifest = validateBetaEducationalEvaluationExpertSampleManifest(
          readStrictJsonInput(output.cwd, options.inputPath!),
        );
        output.stdout(`${JSON.stringify({
          status: "valid_sample_awaiting_expert_review",
          artifactKind: manifest.artifactKind,
          sampleVersion: manifest.sampleVersion,
          sampleCaseCount: manifest.sampleCaseCount,
          containsModelResults: manifest.containsModelResults,
          containsExpertJudgments: manifest.containsExpertJudgments,
        }, null, 2)}\n`);
        return 0;
      }
      case null:
        throw new Error("An educational evaluation harness command is required.");
    }
  } catch (error) {
    output.stderr(`evaluation-harness: ${validationErrorMessage(error)}\n`);
    output.stderr(`${BETA_EDUCATIONAL_EVALUATION_HARNESS_USAGE}\n`);
    return 2;
  }
}
