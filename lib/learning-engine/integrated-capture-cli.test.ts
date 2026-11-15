import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSyntheticAssignmentCapture } from '../../scripts/learning/integrated-assignment-capture';
import { integratedRequestPlanCli } from '../../scripts/learning/integrated-request-plan';
import { readIntegratedCaptureFile } from '../../scripts/learning/integrated-capture-files';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
describe('explicit integrated capture CLI', () => {
  it('dry-runs without any network, creates private exclusive evidence and prepares pinned bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integrated-cli-')); const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'));
    try {
      const capturePath = join(dir, 'capture.json'), configPath = join(dir, 'configuration.json'), out = join(dir, 'plan.json');
      expect(await runSyntheticAssignmentCapture(capturePath)).toMatchObject({ completed: 1, providerCalls: 0 });
      await expect(runSyntheticAssignmentCapture(capturePath)).rejects.toMatchObject({ code: 'EEXIST' });
      const synthetic = JSON.parse(await readFile(capturePath, 'utf8'));
      expect(synthetic).toMatchObject({ authenticatedScopeVerified: false, hostedDatabaseFtsExecuted: false });
      // Shape-only fixture: falsified label still cannot confer execution authority in the plan.
      synthetic.execution = 'authenticated_supabase_lexical_retrieval_no_generation';
      const raw = JSON.stringify(synthetic); await writeFile(capturePath, raw);
      const config = JSON.stringify({ schema: 'integrated-request-plan-configuration-v1', id: '00000000-0000-4000-8000-000000000005', model: 'synthetic-model', expectedResponseModel: 'synthetic-model', expectedCaseCount: 1, maxOutputTokens: 800, maxRequestBytes: 128000, captureFileSha256: sha256(raw) });
      await writeFile(configPath, config);
      const args = ['prepare', capturePath, '--capture-sha256', sha256(raw), '--configuration', configPath, '--configuration-sha256', sha256(config), '--out', out];
      expect(await integratedRequestPlanCli(args)).toMatchObject({ preparedRequests: 1, dispatchAuthorized: false });
      expect(JSON.parse(await readFile(out, 'utf8'))).toMatchObject({ executionAuthorityVerified: false, paidLedgerReserved: false });
      await expect(integratedRequestPlanCli(args)).rejects.toMatchObject({ code: 'EEXIST' });
      args[7] = 'f'.repeat(64); await expect(integratedRequestPlanCli(args)).rejects.toThrow('file_digest_mismatch');
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); await rm(dir, { recursive: true, force: true }); }
  });
  it('rejects directories, byte limits and invalid UTF8 before parsing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integrated-file-'));
    try {
      await expect(readIntegratedCaptureFile(dir, 20)).rejects.toThrow('input_file_rejected');
      const path = join(dir, 'input'); await writeFile(path, 'x'.repeat(21));
      await expect(readIntegratedCaptureFile(path, 20)).rejects.toThrow('input_file_rejected');
      await writeFile(path, Buffer.from([0xff])); await expect(readIntegratedCaptureFile(path, 20)).rejects.toThrow();
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
});
