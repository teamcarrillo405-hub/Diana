import {
  BETA_EXTERNAL_EVIDENCE_TYPES,
  createBetaExternalEvidenceTemplate,
  readAndValidateSignedBetaExternalEvidence,
  type BetaExternalEvidenceType,
} from "../../lib/beta/external-evidence";
import { redactText } from "../../lib/beta/redaction";

const USAGE = [
  "Usage:",
  "  npx tsx scripts/beta/external-evidence.ts template --kind=<type> --run-id=<id> --sha=<full-sha> --url=<preview-origin>",
  "  npx tsx scripts/beta/external-evidence.ts validate --kind=<type> --run-id=<id> --sha=<full-sha> --url=<preview-origin>",
  "  npx tsx scripts/beta/external-evidence.ts validate-all --run-id=<id> --sha=<full-sha> --url=<preview-origin>",
  `Types: ${BETA_EXTERNAL_EVIDENCE_TYPES.join(", ")}`,
].join("\n");

interface CliOptions {
  command: "template" | "validate" | "validate-all";
  kind: BetaExternalEvidenceType | null;
  runId: string;
  releaseSha: string;
  url: string;
}

function parseArguments(args: string[]): CliOptions {
  const [command, ...flags] = args;
  if (!["template", "validate", "validate-all"].includes(String(command))) {
    throw new Error("The external-evidence command is invalid.");
  }
  const values = new Map<string, string>();
  for (const flag of flags) {
    const match = /^(--kind|--run-id|--sha|--url)=(.+)$/u.exec(flag);
    if (!match || values.has(match[1]!)) {
      throw new Error("External-evidence arguments must be fixed, unique --name=value flags.");
    }
    values.set(match[1]!, match[2]!);
  }
  for (const required of ["--run-id", "--sha", "--url"]) {
    if (!values.has(required)) throw new Error(`Missing required argument ${required}.`);
  }
  const kindValue = values.get("--kind") ?? null;
  if (command === "validate-all" && kindValue !== null) {
    throw new Error("validate-all does not accept --kind.");
  }
  if (command !== "validate-all" && kindValue === null) {
    throw new Error("template and validate require --kind.");
  }
  if (
    kindValue !== null &&
    !BETA_EXTERNAL_EVIDENCE_TYPES.includes(kindValue as BetaExternalEvidenceType)
  ) {
    throw new Error("External evidence type is not supported.");
  }
  return {
    command: command as CliOptions["command"],
    kind: kindValue as BetaExternalEvidenceType | null,
    runId: values.get("--run-id")!,
    releaseSha: values.get("--sha")!,
    url: values.get("--url")!,
  };
}

try {
  if (process.argv.slice(2).includes("--help")) {
    console.log(USAGE);
  } else {
    const options = parseArguments(process.argv.slice(2));
    if (options.command === "template") {
      console.log(JSON.stringify(createBetaExternalEvidenceTemplate({
        evidenceType: options.kind!,
        runId: options.runId,
        releaseSha: options.releaseSha,
        url: options.url,
      }), null, 2));
    } else {
      const types = options.command === "validate-all"
        ? BETA_EXTERNAL_EVIDENCE_TYPES
        : [options.kind!];
      const results = types.map((evidenceType) => {
        const result = readAndValidateSignedBetaExternalEvidence({
          projectRoot: process.cwd(),
          runId: options.runId,
          releaseSha: options.releaseSha,
          url: options.url,
          evidenceType,
        });
        return {
          evidenceType,
          check: result.receipt.check,
          status: result.evidence.status,
          releaseSha: result.evidence.releaseSha,
          url: result.evidence.url,
          issuedAt: result.receipt.issuedAt,
        };
      });
      console.log(JSON.stringify({
        runId: options.runId,
        status: "pass",
        results,
      }, null, 2));
    }
  }
} catch (error) {
  console.error(`beta-external-evidence: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

