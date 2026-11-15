import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { readIntegratedCaptureFile } from './integrated-capture-files';
import { readPublicCaptureConfiguration } from './integrated-assignment-capture';
import { integratedProviderBytesSha256 as sha256 } from '../../lib/learning-engine/integrated-provider-response';
import { verifyIntegratedExecutionPlan } from '../../supabase/functions/_shared/learning/integrated-execution-plan';
import { runIntegratedExecutionPlan } from '../../lib/learning-engine/integrated-execution-run';

export async function integratedExecutionRunCli(args: string[]) {
  if (args.length !== 10 || args[0] !== 'execute' || args[2] !== '--plan-file-sha256' || args[4] !== '--approval' || args[6] !== '--approval-sha256' || args[8] !== '--out-dir') throw new Error('execution_usage');
  const planText = await readIntegratedCaptureFile(args[1], 32 * 1024 * 1024), approvalText = await readIntegratedCaptureFile(args[5], 16384);
  if (sha256(planText) !== args[3] || sha256(approvalText) !== args[7]) throw new Error('execution_file_digest');
  const plan = verifyIntegratedExecutionPlan(JSON.parse(planText));
  const approval = z.object({ schema: z.literal('integrated-execution-approval-v1'), approved: z.literal(true), planSha256: z.string(), operatorId: z.string().uuid(), maxTotalCents: z.number().int().positive(), expiresAt: z.string().datetime({ offset: true }) }).strict().parse(JSON.parse(approvalText));
  if (approval.planSha256 !== plan.planSha256 || approval.operatorId !== plan.operatorId || approval.maxTotalCents !== plan.maxTotalCents || Date.parse(approval.expiresAt) <= Date.now() || Date.parse(approval.expiresAt) > Date.parse(plan.expiresAt)) throw new Error('approval_mismatch');
  const email = process.env.DIANA_CAPTURE_QA_EMAIL, password = process.env.DIANA_CAPTURE_QA_PASSWORD;
  if (!email || !password) throw new Error('existing_operator_credentials_required');
  const publicConfig = readPublicCaptureConfiguration(await readFile(resolve('.env.local'), 'utf8'));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? publicConfig.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? publicConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url !== plan.projectUrl || !key) throw new Error('project_configuration_mismatch');
  // Local approval is an operator guard; server-deployed plan/hash/allowlist is authoritative.
  await mkdir(args[9], { recursive: false, mode: 0o700 });
  await writeFile(join(args[9], 'plan.json'), planText, { flag: 'wx', mode: 0o600 });
  const authFetch: typeof fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input instanceof URL ? input : input.url);
    if (requestUrl.origin !== plan.projectUrl || !['/auth/v1/token', '/auth/v1/user', '/auth/v1/logout'].includes(requestUrl.pathname)) throw new Error('operator_auth_endpoint_rejected');
    return fetch(input, { ...init, redirect: 'error' });
  };
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: authFetch } });
  try {
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error || !signed.data.session || signed.data.user.id !== plan.operatorId) throw new Error('operator_authentication_rejected');
    const result = await runIntegratedExecutionPlan(plan, { accessToken: signed.data.session.access_token, publishableKey: key, fetch, approvalExpiresAt: approval.expiresAt,
      save: (requestId, evidence) => writeFile(join(args[9], requestId + '.json'), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx', mode: 0o600 }) });
    await writeFile(join(args[9], 'result.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    return { ok: !result.stopped, planned: result.planned, accountedRows: result.accountedRows, edgeAttempts: result.edgeAttempts, stopped: result.stopped, semanticAcceptance: false };
  } finally { await client.auth.signOut({ scope: 'local' }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  integratedExecutionRunCli(process.argv.slice(2)).then(result => { console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1; }).catch(() => {
    console.error(JSON.stringify({ ok: false, error: 'integrated_execution_not_completed' })); process.exitCode = 1;
  });
}
