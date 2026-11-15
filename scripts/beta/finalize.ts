import { createHash } from "node:crypto";

import type { BetaAttestationProducer } from "../../lib/beta/attestations";
import { redactText } from "../../lib/beta/redaction";
import {
  canonicalizeBetaReleaseBundlePayload,
  finalizeBetaReleaseBundle,
  getBetaReleaseBundlePath,
  prepareBetaReleaseBundle,
  verifyBetaReleaseBundle,
} from "../../lib/beta/release-finalization";

const USAGE = [
  "Usage:",
  "  npx tsx scripts/beta/finalize.ts prepare --run-a=<run-id> --run-b=<run-id> --sha=<full-sha> --url=<staging-origin> --finalized-at=<iso-time> --producer-id=<id> --producer-kind=<automation|operator|human> --producer-tool=<tool> --producer-version=<version>",
  "  npx tsx scripts/beta/finalize.ts finalize --run-a=<run-id> --run-b=<run-id> --sha=<full-sha> --url=<staging-origin> --finalized-at=<iso-time> --producer-id=<id> --producer-kind=<automation|operator|human> --producer-tool=<tool> --producer-version=<version> --key-id=<trusted-key-id> --signature=<base64-ed25519-signature>",
  "  npx tsx scripts/beta/finalize.ts verify --sha=<full-sha>",
  "",
  "The prepare command writes the exact canonical payload to stdout. Sign those UTF-8 bytes outside this process, then pass only the detached public signature to finalize.",
].join("\n");

type Command = "prepare" | "finalize" | "verify";

interface ParsedArguments {
  command: Command;
  values: Map<string, string>;
}

const COMMON_KEYS = [
  "run-a",
  "run-b",
  "sha",
  "url",
  "finalized-at",
  "producer-id",
  "producer-kind",
  "producer-tool",
  "producer-version",
] as const;

function parseArguments(argv: readonly string[]): ParsedArguments | null {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return null;
  const command = argv[0];
  if (!command || !["prepare", "finalize", "verify"].includes(command)) {
    throw new Error("The first argument must be prepare, finalize, or verify.");
  }
  const allowed = new Set<string>(
    command === "verify"
      ? ["sha"]
      : command === "finalize"
        ? [...COMMON_KEYS, "key-id", "signature"]
        : [...COMMON_KEYS],
  );
  const requiredKeys = command === "verify"
    ? ["sha"]
    : command === "finalize"
      ? [...COMMON_KEYS, "key-id", "signature"]
      : [...COMMON_KEYS];
  const values = new Map<string, string>();
  for (const argument of argv.slice(1)) {
    const match = /^--([a-z][a-z0-9-]*)=(.+)$/u.exec(argument);
    if (!match) throw new Error(`Invalid argument format: ${argument}.`);
    const [, key, value] = match;
    if (!key || value === undefined || !allowed.has(key)) {
      throw new Error(`Unknown argument: ${argument}.`);
    }
    if (values.has(key)) throw new Error(`Argument --${key} was supplied more than once.`);
    values.set(key, value);
  }
  for (const key of requiredKeys) {
    if (!values.has(key)) throw new Error(`Missing required argument --${key}.`);
  }
  return { command: command as Command, values };
}

function required(values: ReadonlyMap<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) throw new Error(`Missing required argument --${key}.`);
  return value;
}

function producer(values: ReadonlyMap<string, string>): BetaAttestationProducer {
  const kind = required(values, "producer-kind");
  if (!(["automation", "operator", "human"] as const).includes(
    kind as BetaAttestationProducer["kind"],
  )) {
    throw new Error("--producer-kind must be automation, operator, or human.");
  }
  return {
    id: required(values, "producer-id"),
    kind: kind as BetaAttestationProducer["kind"],
    tool: required(values, "producer-tool"),
    version: required(values, "producer-version"),
  };
}

function commonInput(values: ReadonlyMap<string, string>) {
  return {
    projectRoot: process.cwd(),
    runIds: [required(values, "run-a"), required(values, "run-b")] as const,
    releaseSha: required(values, "sha"),
    stagingUrl: required(values, "url"),
    finalizedAt: required(values, "finalized-at"),
  };
}

function printBundleSummary(bundle: ReturnType<typeof verifyBetaReleaseBundle>): void {
  console.log(JSON.stringify({
    releaseSha: bundle.releaseSha,
    stagingUrl: bundle.stagingUrl,
    runIds: bundle.runIds,
    finalizedAt: bundle.finalizedAt,
    signer: {
      producerId: bundle.producer.id,
      keyId: bundle.signature.keyId,
      algorithm: bundle.signature.algorithm,
    },
    evidenceFiles: bundle.evidence.length,
    evidenceRootSha256: bundle.evidenceRootSha256,
    trustRootSha256: bundle.trustRoot.sha256,
    bundle: getBetaReleaseBundlePath(process.cwd(), bundle.releaseSha),
  }, null, 2));
}

function main(): void {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed) {
    console.log(USAGE);
    return;
  }
  if (parsed.command === "verify") {
    printBundleSummary(verifyBetaReleaseBundle({
      projectRoot: process.cwd(),
      releaseSha: required(parsed.values, "sha"),
    }));
    return;
  }

  const input = commonInput(parsed.values);
  const attestationProducer = producer(parsed.values);
  if (parsed.command === "prepare") {
    const payload = prepareBetaReleaseBundle({
      ...input,
      producer: attestationProducer,
    });
    const canonicalPayload = canonicalizeBetaReleaseBundlePayload(payload);
    console.log(canonicalPayload);
    console.error(`payload-sha256: ${createHash("sha256")
      .update(canonicalPayload, "utf8")
      .digest("hex")}`);
    return;
  }

  const bundle = finalizeBetaReleaseBundle({
    ...input,
    signer: {
      producer: attestationProducer,
      signature: {
        algorithm: "ed25519",
        keyId: required(parsed.values, "key-id"),
        value: required(parsed.values, "signature"),
      },
    },
  });
  printBundleSummary(bundle);
}

try {
  main();
} catch (error) {
  console.error(
    `beta-release-finalization: ${redactText(error instanceof Error ? error.message : String(error))}`,
  );
  console.error(USAGE);
  process.exitCode = 2;
}
