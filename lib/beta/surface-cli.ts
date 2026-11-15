import { parseBetaCliArguments } from "./cli";
import { validateBetaReleaseSha, validateBetaStagingUrl } from "./release-validation";

export interface BetaLmsStagingCliArguments {
  help: boolean;
  runId: string | null;
  acknowledgement: string | null;
}

export interface BetaSubjectsCliArguments {
  help: boolean;
  runId: string | null;
  full: boolean;
}

export interface BetaStagingGateCliArguments {
  help: boolean;
  runId: string | null;
  releaseSha: string | null;
  url: string | null;
}

function takeSingleEqualsOption(
  argv: readonly string[],
  name: string,
): { value: string | null; remaining: string[] } {
  let value: string | null = null;
  const prefix = `--${name}=`;
  const remaining: string[] = [];
  for (const token of argv) {
    if (token.startsWith(prefix)) {
      if (value !== null || token.length === prefix.length) {
        throw new Error(`--${name} requires exactly one non-empty value.`);
      }
      value = token.slice(prefix.length);
      continue;
    }
    if (token === `--${name}`) {
      throw new Error(`--${name} must use the --${name}=value form.`);
    }
    remaining.push(token);
  }
  return { value, remaining };
}

export function parseBetaLmsStagingCliArguments(
  argv: readonly string[],
): BetaLmsStagingCliArguments {
  const acknowledgement = takeSingleEqualsOption(argv, "ack");
  const base = parseBetaCliArguments(acknowledgement.remaining);
  return {
    help: base.help,
    runId: base.runId,
    acknowledgement: acknowledgement.value,
  };
}

export function parseBetaSubjectsCliArguments(
  argv: readonly string[],
): BetaSubjectsCliArguments {
  let full = false;
  const remaining: string[] = [];
  for (const token of argv) {
    if (token === "--full") {
      if (full) throw new Error("--full may only be provided once.");
      full = true;
    } else {
      remaining.push(token);
    }
  }
  const base = parseBetaCliArguments(remaining);
  return { help: base.help, runId: base.runId, full };
}

export function parseBetaStagingGateCliArguments(
  argv: readonly string[],
): BetaStagingGateCliArguments {
  const sha = takeSingleEqualsOption(argv, "sha");
  const url = takeSingleEqualsOption(sha.remaining, "url");
  const base = parseBetaCliArguments(url.remaining);
  if (base.help) {
    return { help: true, runId: null, releaseSha: null, url: null };
  }
  return {
    help: false,
    runId: base.runId,
    releaseSha: sha.value === null ? null : validateBetaReleaseSha(sha.value),
    url: url.value === null ? null : validateBetaStagingUrl(url.value),
  };
}
