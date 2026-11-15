import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareIntegratedRequestPlan } from '../../lib/learning-engine/integrated-request-plan';
import { integratedProviderBytesSha256 as sha256 } from '../../lib/learning-engine/integrated-provider-response';
import { readIntegratedCaptureFile } from './integrated-capture-files';
async function pinnedFile(path: string, digest: string, limit: number) {
  if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error('digest_required');
  const text = await readIntegratedCaptureFile(path, limit);
  if (sha256(text) !== digest) throw new Error('file_digest_mismatch');
  return JSON.parse(text) as unknown;
}
export async function integratedRequestPlanCli(args: string[]) {
  if (args.length !== 10 || args[0] !== 'prepare' || args[2] !== '--capture-sha256' || args[4] !== '--configuration' || args[6] !== '--configuration-sha256' || args[8] !== '--out') throw new Error('prepare_usage');
  const config = await pinnedFile(args[5], args[7], 16_384);
  const capture = await pinnedFile(args[1], args[3], 32 * 1024 * 1024);
  const plan = prepareIntegratedRequestPlan(capture, config, args[3]);
  await writeFile(args[9], JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { ok: true, planSha256: plan.planSha256, planned: plan.planned, preparedRequests: plan.preparedRequests,
    notScheduled: plan.notScheduled, aggregateRequestBytes: plan.aggregateRequestBytes,
    aggregateOutputTokenCeiling: plan.aggregateOutputTokenCeiling, providerCalls: 0, dispatchAuthorized: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  integratedRequestPlanCli(process.argv.slice(2)).then(result => console.log(JSON.stringify(result))).catch(() => {
    console.error(JSON.stringify({ ok: false, error: 'integrated_plan_not_prepared', providerCalls: 0 })); process.exitCode = 1;
  });
}
