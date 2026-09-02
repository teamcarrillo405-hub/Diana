import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  BetaEducationalEvaluationEvidenceValidationError,
  calculateBetaEducationalEvaluationRecordSha256,
  validateBetaEducationalEvaluationEvidence,
  type BetaEducationalEvaluationEvidenceReceipt,
  type ValidatedBetaEducationalEvaluationEvidence,
} from "../beta/evaluation-evidence";
import {
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
} from "./contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import {
  assertEducationalEvaluationCorpusIntegrity,
  EDUCATIONAL_EVALUATION_CORPUS_SHA256,
} from "./integrity";
import { renderEducationalEvaluationTextReport } from "./report";
import {
  EducationalEvaluationResultValidationError,
} from "./result-schema";
import {
  educationalEvaluationExpertSampleManifest,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS,
} from "./sample";
import {
  assessEducationalEvaluationResults,
  type EducationalEvaluationGateReport,
} from "./score";

const MAX_RESULT_FILE_BYTES = 8 * 1024 * 1024;

export const EDUCATIONAL_EVALUATION_CLI_HELP = `Diana educational evaluation sidecar

Usage:
  npx tsx scripts/educational-evaluation-gate.ts corpus
  npx tsx scripts/educational-evaluation-gate.ts sample [--format=json|ids]
  npx tsx scripts/educational-evaluation-gate.ts gate --input=<results.json> [--format=text|json] [--detail-limit=50]

The sidecar reads deterministic local data only. It never calls an external model.
The gate requires digest-bound evidence plus trusted automation and human signatures.
`;

export type EducationalEvaluationCliCommand = "corpus" | "sample" | "gate";
export type EducationalEvaluationCliFormat = "text" | "json" | "ids";

export interface EducationalEvaluationCliArguments {
  readonly help: boolean;
  readonly command: EducationalEvaluationCliCommand | null;
  readonly inputPath: string | null;
  readonly format: EducationalEvaluationCliFormat;
  readonly detailLimit: number;
}

function takeOptionValue(
  argv: readonly string[],
  index: number,
  name: string,
): { value: string; consumed: number } | null {
  const token = argv[index];
  if (token === name) {
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${name} requires exactly one value.`);
    }
    return { value, consumed: 2 };
  }
  if (token.startsWith(`${name}=`)) {
    const value = token.slice(name.length + 1);
    if (!value) throw new Error(`${name} requires exactly one value.`);
    return { value, consumed: 1 };
  }
  return null;
}

export function parseEducationalEvaluationCliArguments(
  argv: readonly string[],
): EducationalEvaluationCliArguments {
  if (argv.includes("--help") || argv.includes("-h")) {
    return {
      help: true,
      command: null,
      inputPath: null,
      format: "text",
      detailLimit: 50,
    };
  }
  const command = argv[0];
  if (command !== "corpus" && command !== "sample" && command !== "gate") {
    throw new Error("A command is required: corpus, sample, or gate.");
  }

  let inputPath: string | null = null;
  let format: EducationalEvaluationCliFormat =
    command === "sample" ? "json" : "text";
  let detailLimit = 50;
  let index = 1;
  while (index < argv.length) {
    const input = takeOptionValue(argv, index, "--input");
    if (input) {
      if (inputPath !== null) throw new Error("--input may only be provided once.");
      inputPath = input.value;
      index += input.consumed;
      continue;
    }
    const formatOption = takeOptionValue(argv, index, "--format");
    if (formatOption) {
      if (!(["text", "json", "ids"] as const).includes(
        formatOption.value as EducationalEvaluationCliFormat,
      )) {
        throw new Error("--format must be text, json, or ids.");
      }
      format = formatOption.value as EducationalEvaluationCliFormat;
      index += formatOption.consumed;
      continue;
    }
    const detail = takeOptionValue(argv, index, "--detail-limit");
    if (detail) {
      detailLimit = Number(detail.value);
      if (!Number.isInteger(detailLimit) || detailLimit < 0 || detailLimit > 500) {
        throw new Error("--detail-limit must be an integer from 0 through 500.");
      }
      index += detail.consumed;
      continue;
    }
    throw new Error(`Unknown educational evaluation option: ${argv[index]}`);
  }

  if (command === "gate" && inputPath === null) {
    throw new Error("The gate command requires --input.");
  }
  if (command !== "gate" && inputPath !== null) {
    throw new Error("--input is only valid with the gate command.");
  }
  if (command === "corpus" && format !== "text") {
    throw new Error("The corpus command uses text output only.");
  }
  if (command === "sample" && format !== "json" && format !== "ids") {
    throw new Error("The sample command supports json or ids output.");
  }
  if (command === "gate" && format !== "text" && format !== "json") {
    throw new Error("The gate command supports text or json output.");
  }

  return { help: false, command, inputPath, format, detailLimit };
}

function readResultInput(cwd: string, inputPath: string): {
  value: unknown;
  resolvedPath: string;
} {
  const resolvedPath = path.resolve(cwd, inputPath);
  if (!existsSync(resolvedPath)) {
    throw new Error("Evaluation input is not available.");
  }
  const stat = lstatSync(resolvedPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Evaluation input must be a regular file and cannot be a symbolic link.");
  }
  if (stat.size > MAX_RESULT_FILE_BYTES) {
    throw new Error(`Evaluation input exceeds ${MAX_RESULT_FILE_BYTES} bytes.`);
  }
  const raw = readFileSync(resolvedPath, "utf8");
  try {
    return { value: JSON.parse(raw) as unknown, resolvedPath };
  } catch {
    throw new Error("Evaluation input is not valid JSON.");
  }
}

export interface EducationalEvaluationCliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

export interface EducationalEvaluationCliContext {
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string | undefined>>;
}

const PROCESS_IO: EducationalEvaluationCliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

const PROCESS_CONTEXT: EducationalEvaluationCliContext = {
  cwd: process.cwd(),
  environment: process.env,
};

function renderEvidenceProvenance(
  receipt: BetaEducationalEvaluationEvidenceReceipt,
): string {
  return [
    "Evidence provenance",
    `- VERIFIED corpus SHA-256: ${receipt.corpusSha256}`,
    `- VERIFIED model execution: ${receipt.modelExecution.producerId} (${receipt.modelExecution.provider}/${receipt.modelExecution.model}@${receipt.modelExecution.modelVersion}; key ${receipt.modelExecution.keyId})`,
    `- VERIFIED model evidence SHA-256: ${receipt.modelExecution.evidenceSha256}`,
    `- VERIFIED expert review: ${receipt.expertReview.reviewCount} records by ${receipt.expertReview.producerId} (key ${receipt.expertReview.keyId})`,
    `- VERIFIED expert evidence SHA-256: ${receipt.expertReview.evidenceSha256}`,
    "",
  ].join("\n");
}

function finalizeValidatedGateReport(
  assessment: EducationalEvaluationGateReport,
  verified: ValidatedBetaEducationalEvaluationEvidence,
): EducationalEvaluationGateReport {
  const { bundle, receipt } = verified;
  const caseResultsSha256 = calculateBetaEducationalEvaluationRecordSha256(
    bundle.caseResults,
  );
  const expertReviewsSha256 = calculateBetaEducationalEvaluationRecordSha256(
    bundle.expertReviews,
  );
  const receiptMatches = receipt.schemaVersion === 1 &&
    receipt.status === "verified" &&
    receipt.runId === assessment.runId &&
    receipt.runId === bundle.runId &&
    receipt.corpusSha256 === bundle.corpusSha256 &&
    receipt.expertSampleVersion === bundle.expertSampleVersion &&
    receipt.caseResultsSha256 === caseResultsSha256 &&
    receipt.caseResultsSha256 === bundle.modelExecution.caseResultsSha256 &&
    receipt.expertReviewsSha256 === expertReviewsSha256 &&
    receipt.expertReviewsSha256 === bundle.expertReview.expertReviewsSha256 &&
    receipt.modelExecution.producerId === bundle.modelExecution.producer.id &&
    receipt.modelExecution.keyId === bundle.modelExecution.signature.keyId &&
    receipt.modelExecution.provider === bundle.modelExecution.provider &&
    receipt.modelExecution.model === bundle.modelExecution.model &&
    receipt.modelExecution.modelVersion === bundle.modelExecution.modelVersion &&
    receipt.modelExecution.evidenceSha256 === bundle.modelExecution.evidence.sha256 &&
    receipt.expertReview.producerId === bundle.expertReview.producer.id &&
    receipt.expertReview.keyId === bundle.expertReview.signature.keyId &&
    receipt.expertReview.reviewCount === bundle.expertReview.reviewCount &&
    receipt.expertReview.evidenceSha256 === bundle.expertReview.evidence.sha256;

  if (!receiptMatches) {
    throw new Error(
      "Educational evaluation evidence receipt is not bound to the scored model results and human reviews.",
    );
  }

  return Object.freeze({
    ...assessment,
    passed: assessment.metricsPassed,
    evidenceValidation: Object.freeze({
      status: "verified" as const,
      detail: "Signed model execution and external human-review evidence were validated before scoring.",
    }),
  });
}

export function runEducationalEvaluationCli(
  argv: readonly string[],
  io: EducationalEvaluationCliIo = PROCESS_IO,
  context: Partial<EducationalEvaluationCliContext> = {},
): number {
  const executionContext = { ...PROCESS_CONTEXT, ...context };
  try {
    const args = parseEducationalEvaluationCliArguments(argv);
    if (args.help) {
      io.stdout(EDUCATIONAL_EVALUATION_CLI_HELP);
      return 0;
    }
    assertEducationalEvaluationCorpusIntegrity();

    if (args.command === "corpus") {
      io.stdout([
        `Corpus version: ${EDUCATIONAL_EVALUATION_CORPUS_VERSION}`,
        `Cases: ${EDUCATIONAL_EVALUATION_CORPUS.length}`,
        `SHA-256: ${EDUCATIONAL_EVALUATION_CORPUS_SHA256}`,
        `Expert sample version: ${EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION}`,
        `Expert sample cases: ${EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS.length}`,
        "",
      ].join("\n"));
      return 0;
    }

    if (args.command === "sample") {
      if (args.format === "ids") {
        io.stdout(`${EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS.join("\n")}\n`);
      } else {
        io.stdout(`${JSON.stringify(educationalEvaluationExpertSampleManifest(), null, 2)}\n`);
      }
      return 0;
    }

    if (args.command !== "gate" || args.inputPath === null) {
      throw new Error("The requested educational evaluation command is incomplete.");
    }
    const resultInput = readResultInput(executionContext.cwd, args.inputPath);
    const verified = validateBetaEducationalEvaluationEvidence({
      projectRoot: executionContext.cwd,
      inputPath: resultInput.resolvedPath,
      value: resultInput.value,
      expectedRunId: executionContext.environment.QA_RUN_ID ?? null,
    });
    const report = finalizeValidatedGateReport(
      assessEducationalEvaluationResults(verified.bundle),
      verified,
    );
    io.stdout(
      args.format === "json"
        ? `${JSON.stringify({
            ...report,
            evidenceProvenance: verified.receipt,
          }, null, 2)}\n`
        : `${renderEducationalEvaluationTextReport(report, args.detailLimit)}${renderEvidenceProvenance(verified.receipt)}`,
    );
    return report.passed ? 0 : 1;
  } catch (error) {
    if (
      error instanceof EducationalEvaluationResultValidationError ||
      error instanceof BetaEducationalEvaluationEvidenceValidationError
    ) {
      io.stderr(`${error.message}\n`);
      for (const issue of error.issues.slice(0, 50)) io.stderr(`- ${issue}\n`);
      if (error.issues.length > 50) {
        io.stderr(`- ${error.issues.length - 50} additional validation issues omitted.\n`);
      }
      return 2;
    }
    io.stderr(`${error instanceof Error ? error.message : "Educational evaluation gate could not complete."}\n`);
    return 2;
  }
}
