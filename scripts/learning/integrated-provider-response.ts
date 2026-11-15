/** Validate one explicitly supplied capture. Never discovers files or dispatches a provider. */
import { constants } from 'node:fs';
import { lstat, open, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { integratedProviderBytesSha256, IntegratedProviderResponseError, parseIntegratedProviderResponse } from '../../lib/learning-engine/integrated-provider-response';

const CAPTURE_LIMIT = 16 * 1024 * 1024;
const EXPECTATION_LIMIT = 16 * 1024;
class CliError extends Error {}

async function regularUtf8File(path: string, limit: number) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink()) throw new CliError('input_not_regular_file');
  if (before.size > limit) throw new CliError('input_byte_limit');
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) throw new CliError('input_changed');
    if (opened.size > limit) throw new CliError('input_byte_limit');
    // Read at most limit+1 bytes, including when a file grows after stat.
    const buffer = Buffer.alloc(limit + 1);
    let total = 0;
    while (total < buffer.length) {
      const { bytesRead } = await handle.read(buffer, total, buffer.length - total, null);
      if (!bytesRead) break;
      total += bytesRead;
    }
    const after = await handle.stat();
    if (total > limit) throw new CliError('input_byte_limit');
    if (total !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw new CliError('input_changed');
    try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, total)); }
    catch { throw new CliError('input_not_utf8'); }
  } finally { await handle.close(); }
}

function parsedJson(value: string) {
  try { return JSON.parse(value) as unknown; } catch { throw new CliError('input_not_json'); }
}

/** Returns a safe summary only; the exclusive output contains the original raw evidence. */
export async function verifyIntegratedProviderCaptureFiles(args: string[]) {
  if (args.length !== 8 || args[0] !== 'verify' || args[2] !== '--expectation' || args[4] !== '--expectation-sha256' || args[6] !== '--out' || !/^[a-f0-9]{64}$/u.test(args[5])) {
    throw new CliError('usage: verify <capture.json> --expectation <expectation.json> --expectation-sha256 <trusted-file-digest> --out <new-output.json>');
  }
  const expectationText = await regularUtf8File(args[3], EXPECTATION_LIMIT);
  const expectationFileSha256 = integratedProviderBytesSha256(expectationText);
  if (expectationFileSha256 !== args[5]) throw new CliError('expectation_file_digest_mismatch');
  const captureText = await regularUtf8File(args[1], CAPTURE_LIMIT);
  const captureFileSha256 = integratedProviderBytesSha256(captureText);
  const parsed = parseIntegratedProviderResponse(parsedJson(captureText), parsedJson(expectationText));
  const report = { schema: 'integrated-provider-capture-report-v1', captureFileSha256, expectationFileSha256, parsed };
  await writeFile(args[7], JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return { ok: true, classification: parsed.classification, completeText: parsed.completeText,
    captureFileSha256, expectationFileSha256, executionAuthorityVerified: false, productionEligible: false };
}

export async function integratedProviderResponseCli(args: string[], stdout: (value: string) => void, stderr: (value: string) => void) {
  try { stdout(JSON.stringify(await verifyIntegratedProviderCaptureFiles(args))); return 0; }
  catch (error) {
    const code = error instanceof CliError || error instanceof IntegratedProviderResponseError ? error.message
      : typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST' ? 'output_already_exists' : 'capture_file_io_error';
    stderr(JSON.stringify({ ok: false, error: code, executionAuthorityVerified: false, productionEligible: false }));
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void integratedProviderResponseCli(process.argv.slice(2), value => console.log(value), value => console.error(value)).then(code => { process.exitCode = code; });
}
