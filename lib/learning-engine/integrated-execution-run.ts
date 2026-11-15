import { verifyIntegratedExecutionPlan, integratedReleasedCompletionSchema } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';

/** Calls only the authenticated Edge execution endpoint, once per planned request.
 * Persistence is awaited before advancing. Any ambiguity stops the remaining run.
 */
export async function runIntegratedExecutionPlan(raw: unknown, options: {
  accessToken: string; publishableKey: string; fetch: typeof fetch;
  save: (requestId: string, evidence: unknown) => Promise<void>; now?: () => number; approvalExpiresAt?: string;
}) {
  const plan = verifyIntegratedExecutionPlan(raw), now = options.now ?? Date.now;
  if (!options.accessToken || !options.publishableKey || Date.parse(plan.expiresAt) <= now()) throw new Error('execution_credentials_or_expiry');
  const localExpiry = options.approvalExpiresAt === undefined ? Date.parse(plan.expiresAt) : Date.parse(options.approvalExpiresAt);
  if (!Number.isFinite(localExpiry) || localExpiry > Date.parse(plan.expiresAt) || localExpiry <= now()) throw new Error('execution_approval_expiry');
  const rows: Array<{ caseId: string; requestId: string | null; status: string; responseSha256?: string }> = [];
  let stopped = false, attempts = 0;
  for (const row of plan.requests) {
    if (stopped) { rows.push({ caseId: row.caseId, requestId: row.requestId, status: 'not_attempted_after_stop' }); continue; }
    if (now() >= localExpiry || now() >= Date.parse(plan.expiresAt)) {
      stopped = true; rows.push({ caseId: row.caseId, requestId: row.requestId, status: 'not_attempted_approval_expired' }); continue;
    }
    attempts++;
    let rawResponse = '', status = 0;
    try {
      const response = await options.fetch(plan.projectUrl + '/functions/v1/learning-integrated-execution', {
        method: 'POST', redirect: 'error', headers: { Authorization: 'Bearer ' + options.accessToken, apikey: options.publishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSha256: plan.planSha256, requestId: row.requestId }), signal: AbortSignal.timeout(plan.timeoutMs + 60000),
      });
      status = response.status;
      const reader = response.body?.getReader(); let bytes = 0; const decoder = new TextDecoder('utf-8', { fatal: true });
      if (reader) { try { while (true) { const part = await reader.read(); if (part.done) break;
        bytes += part.value.length; if (bytes > 16 * 1024 * 1024) throw new Error('edge_response_limit'); rawResponse += decoder.decode(part.value, { stream: true });
      } rawResponse += decoder.decode(); } finally { await reader.cancel().catch(() => undefined); } }
      const responseSha256 = sha256(rawResponse);
      await options.save(row.requestId, { schema: 'integrated-edge-execution-envelope-v1', planSha256: plan.planSha256, requestId: row.requestId,
        caseId: row.caseId, receivedAt: new Date(now()).toISOString(), httpStatus: status, rawResponse, responseSha256 });
      const envelope = JSON.parse(rawResponse);
      if (!response.ok || envelope.ok !== true || envelope.requestId !== row.requestId || envelope.caseId !== row.caseId || envelope.rawSaved !== true || envelope.usageSaved !== true) throw new Error('edge_terminal_not_success');
      const parsed = integratedReleasedCompletionSchema.parse(envelope.result);
      if (parsed.requestBodySha256 !== row.requestBodySha256 || parsed.responseModel !== plan.responseModel || envelope.classification !== 'complete') throw new Error('edge_completion_mismatch');
      rows.push({ caseId: row.caseId, requestId: row.requestId, status: 'captured_complete', responseSha256 });
    } catch {
      stopped = true;
      // Distinct uncertainty evidence never overwrites a received raw envelope.
      await options.save(row.requestId + '-uncertain', { schema: 'integrated-execution-uncertainty-v1', planSha256: plan.planSha256,
        requestId: row.requestId, caseId: row.caseId, httpStatus: status, receivedPartialResponse: rawResponse,
        status: 'requires_reconciliation_no_retry' }).catch(() => undefined);
      rows.push({ caseId: row.caseId, requestId: row.requestId, status: 'requires_reconciliation_no_retry' });
    }
  }
  rows.push(...plan.unscheduled.map(row => ({ caseId: row.caseId, requestId: null, status: 'not_scheduled:' + row.reason })));
  return { schema: 'integrated-execution-run-v1', planSha256: plan.planSha256, planned: plan.planned, accountedRows: rows.length,
    edgeAttempts: attempts, stopped, rows, executionAuthorityVerified: false, semanticAcceptance: false, productionEligible: false };
}
