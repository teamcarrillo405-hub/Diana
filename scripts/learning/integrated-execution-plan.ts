import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readIntegratedCaptureFile } from './integrated-capture-files';
import { integratedProviderBytesSha256 as sha256 } from '../../lib/learning-engine/integrated-provider-response';
import { compileIntegratedExecutionPlan } from '../../lib/learning-engine/integrated-execution-plan';
export async function integratedExecutionPlanCli(args: string[]) {
  if (args.length !== 10 || args[0] !== 'compile' || args[2] !== '--prepared-sha256' || args[4] !== '--quote' || args[6] !== '--quote-sha256' || args[8] !== '--out') throw new Error('execution_compile_usage');
  const quote = await readIntegratedCaptureFile(args[5], 16_384), prepared = await readIntegratedCaptureFile(args[1], 32 * 1024 * 1024);
  if (sha256(quote) !== args[7] || sha256(prepared) !== args[3]) throw new Error('pinned_file_digest');
  const plan = compileIntegratedExecutionPlan(JSON.parse(prepared), JSON.parse(quote));
  await writeFile(args[9], JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { ok: true, planSha256: plan.planSha256, planned: plan.planned, requests: plan.requests.length,
    reservedCeilingCents: plan.requests.reduce((sum, row) => sum + row.reservedCents, 0),
    maxModerationCalls: 2 * plan.requests.length, providerCalls: 0, approvalGranted: false };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  integratedExecutionPlanCli(process.argv.slice(2)).then(result => console.log(JSON.stringify(result))).catch(() => {
    console.error(JSON.stringify({ ok: false, error: 'execution_plan_not_compiled', providerCalls: 0 })); process.exitCode = 1;
  });
}
