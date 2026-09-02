import { validateBetaRunId } from "./run-id";

export interface BetaCliArguments {
  help: boolean;
  runId: string | null;
}

export function parseBetaCliArguments(argv: readonly string[]): BetaCliArguments {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { help: true, runId: null };
  }

  let runId: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--run-id") {
      if (runId !== null || argv[index + 1] === undefined) {
        throw new Error("--run-id requires exactly one value.");
      }
      runId = validateBetaRunId(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token.startsWith("--run-id=")) {
      if (runId !== null) throw new Error("--run-id may only be provided once.");
      runId = validateBetaRunId(token.slice("--run-id=".length));
      continue;
    }

    throw new Error(`Unknown beta gate option: ${token}`);
  }

  if (runId === null) throw new Error("--run-id is required.");
  return { help: false, runId };
}
