import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, statSync, truncateSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { integratedProviderBytesSha256 } from './integrated-provider-response';
import { integratedProviderResponseCli } from '../../scripts/learning/integrated-provider-response';

const roots: string[] = [];
function files() {
  const root = mkdtempSync(join(tmpdir(), 'diana-provider-cli-')); roots.push(root);
  const requestBody = JSON.stringify({ model: 'opaque-model', input: 'PRIVATE_INPUT_SENTINEL', max_output_tokens: 50 });
  const responseBody = JSON.stringify({ id: 'resp_fixture', object: 'response', created_at: 100, status: 'completed', model: 'opaque-model', error: null, incomplete_details: null,
    output: [{ id: 'msg_fixture', type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'PRIVATE_RESPONSE_SENTINEL', annotations: [] }] }],
    usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 } });
  const capture = join(root, 'capture.json'), expectation = join(root, 'expectation.json'), output = join(root, 'report.json');
  const expected = JSON.stringify({ requestBodySha256: integratedProviderBytesSha256(requestBody), requestModel: 'opaque-model', responseModel: 'opaque-model', maxOutputTokens: 50 });
  writeFileSync(expectation, expected);
  writeFileSync(capture, JSON.stringify({ schema: 'integrated-openai-responses-capture-v1', endpoint: '/v1/responses', transport: 'http_json', requestBody, responseBody,
    httpStatus: 200, providerRequestId: 'req_fixture', startedAt: '2026-09-29T01:00:00Z', receivedAt: '2026-09-29T01:00:01Z' }));
  const args = ['verify', capture, '--expectation', expectation, '--expectation-sha256', integratedProviderBytesSha256(expected), '--out', output];
  const stdout = vi.fn(), stderr = vi.fn();
  return { root, capture, expectation, output, requestBody, responseBody, args, stdout, stderr, run: () => integratedProviderResponseCli(args, stdout, stderr) };
}
afterEach(() => {
  for (const root of roots.splice(0)) {
    if (!resolve(root).startsWith(resolve(tmpdir()) + sep) || !root.includes('diana-provider-cli-')) throw new Error('Unexpected fixture cleanup target');
    rmSync(root, { recursive: true, force: true });
  }
});

describe('explicit offline provider capture CLI', () => {
  it('writes original raw evidence exclusively and prints only a safe consistency summary', async () => {
    const f = files();
    expect(await f.run()).toBe(0);
    const report = JSON.parse(readFileSync(f.output, 'utf8'));
    expect(report.parsed.original).toMatchObject({ requestBody: f.requestBody, responseBody: f.responseBody });
    expect(report.parsed.provenance.executionAuthorityVerified).toBe(false);
    expect(JSON.parse(f.stdout.mock.calls[0][0])).toMatchObject({ ok: true, completeText: true, executionAuthorityVerified: false, productionEligible: false });
    expect(JSON.stringify(f.stdout.mock.calls)).not.toContain('PRIVATE_');
    expect(f.stderr).not.toHaveBeenCalled();
    if (process.platform !== 'win32') expect(statSync(f.output).mode & 0o777).toBe(0o600);
  });

  it('never replaces an earlier report or input', async () => {
    const f = files(); writeFileSync(f.output, 'ORIGINAL_REPORT');
    expect(await f.run()).toBe(1);
    expect(readFileSync(f.output, 'utf8')).toBe('ORIGINAL_REPORT');
    expect(f.stderr.mock.calls[0][0]).toContain('output_already_exists');
    const originalCapture = readFileSync(f.capture, 'utf8'); f.args[7] = f.capture;
    expect(await f.run()).toBe(1); expect(readFileSync(f.capture, 'utf8')).toBe(originalCapture);
  });

  it('verifies separately trusted expectation bytes before reading the capture', async () => {
    const f = files(); f.args[5] = '0'.repeat(64); f.args[1] = join(f.root, 'absent.json');
    expect(await f.run()).toBe(1);
    expect(f.stderr.mock.calls[0][0]).toContain('expectation_file_digest_mismatch');
    expect(f.stdout).not.toHaveBeenCalled();
  });

  it('rejects a reserialized expectation unless its exact file digest was separately pinned', async () => {
    const f = files(); writeFileSync(f.expectation, readFileSync(f.expectation, 'utf8') + '\n');
    expect(await f.run()).toBe(1); expect(f.stderr.mock.calls[0][0]).toContain('expectation_file_digest_mismatch');
  });

  it.each(['directory', 'oversized_capture', 'oversized_expectation', 'invalid_utf8', 'invalid_json'])('rejects %s input safely', async kind => {
    const f = files();
    if (kind === 'directory') f.args[1] = f.root;
    if (kind === 'oversized_capture') truncateSync(f.capture, 16 * 1024 * 1024 + 1);
    if (kind === 'oversized_expectation') truncateSync(f.expectation, 16 * 1024 + 1);
    if (kind === 'invalid_utf8') writeFileSync(f.capture, Buffer.from([0xff, 0xfe, 0x41]));
    if (kind === 'invalid_json') writeFileSync(f.capture, '{PRIVATE_INVALID_JSON');
    expect(await f.run()).toBe(1);
    expect(JSON.stringify(f.stderr.mock.calls)).not.toContain('PRIVATE_');
    expect(f.stdout).not.toHaveBeenCalled();
    expect(() => statSync(f.output)).toThrow();
  });

  it('rejects an invalid provider envelope without echoing private content', async () => {
    const f = files();
    const capture = JSON.parse(readFileSync(f.capture, 'utf8'));
    capture.responseBody = JSON.stringify({ privateField: 'PRIVATE_RESPONSE_SENTINEL' });
    writeFileSync(f.capture, JSON.stringify(capture));
    expect(await f.run()).toBe(1); expect(f.stderr.mock.calls[0][0]).toContain('response_shape');
    expect(JSON.stringify(f.stderr.mock.calls)).not.toContain('PRIVATE_');
  });

  it('writes a truncated record as non-complete without manufacturing an execution failure', async () => {
    const f = files(), capture = JSON.parse(readFileSync(f.capture, 'utf8')), response = JSON.parse(capture.responseBody);
    response.status = 'incomplete'; response.incomplete_details = { reason: 'max_output_tokens' }; capture.responseBody = JSON.stringify(response);
    writeFileSync(f.capture, JSON.stringify(capture));
    expect(await f.run()).toBe(0);
    expect(JSON.parse(f.stdout.mock.calls[0][0])).toMatchObject({ classification: 'truncated', completeText: false, productionEligible: false });
  });

  it('rejects ambiguous CLI arguments and missing input paths without private error dumps', async () => {
    const f = files();
    expect(await integratedProviderResponseCli([...f.args, '--unknown'], f.stdout, f.stderr)).toBe(1);
    f.args[1] = join(f.root, 'PRIVATE_FILE_SENTINEL.json');
    expect(await f.run()).toBe(1);
    expect(JSON.stringify(f.stderr.mock.calls)).not.toContain('PRIVATE_FILE_SENTINEL');
  });

  it('runs the actual CLI entrypoint and keeps private capture text off stdout/stderr', () => {
    const f = files();
    const child = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/learning/integrated-provider-response.ts'), ...f.args],
      { encoding: 'utf8', timeout: 20000, windowsHide: true });
    expect(child.status, child.stderr).toBe(0);
    expect(JSON.parse(child.stdout.trim())).toMatchObject({ ok: true, executionAuthorityVerified: false, productionEligible: false });
    expect(child.stdout + child.stderr).not.toContain('PRIVATE_');
  });
});
