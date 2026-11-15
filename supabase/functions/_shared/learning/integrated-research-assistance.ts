import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response.ts';
import type { IntegratedExecutionPlan } from './integrated-execution-plan.ts';
import type { ExperimentAccountingClient } from './experiment-accounting.ts';

type Row = IntegratedExecutionPlan['requests'][number];
export function integratedResearchAssistanceIdentity(ownerId: string, plan: IntegratedExecutionPlan, row: Row) {
  if (ownerId !== plan.operatorId || !plan.requests.some(candidate => candidate.requestId === row.requestId && candidate === row)
    || sha256(row.requestBody) !== row.requestBodySha256) throw new Error('research_assistance_scope');
  // Distinct from the provider body hash. This binds plan, actor, assignment, request and help kind.
  const payloadSha256 = sha256(['integrated-research-assistance-v1', ownerId, row.assignmentId, row.requestId,
    plan.planSha256, row.requestBodySha256, 'api', 'hint'].join('\n'));
  return {
    args: { p_request: row.requestId, p_manifest: plan.planSha256, p_owner: ownerId,
      p_assignment: row.assignmentId, p_body_sha256: row.requestBodySha256, p_payload_sha256: payloadSha256 },
    receipt: { schemaVersion: 'assignment-assistance-v1', scope: 'assignment', requestId: row.requestId,
      ownerId, assignmentId: row.assignmentId, selectedProblemId: null, payloadSha256,
      channel: 'api', kind: 'hint', independenceBlocked: true },
  };
}
export async function readIntegratedResearchAssistanceReadiness(client: ExperimentAccountingClient, ownerId: string, plan: IntegratedExecutionPlan, row: Row): Promise<'ready' | 'unauthorized' | 'unavailable'> {
  try {
    const { args } = integratedResearchAssistanceIdentity(ownerId, plan, row);
    const result = await client.rpc('learning_research_assistance_ready', args);
    if (result.error || typeof result.data !== 'boolean') return 'unavailable';
    return result.data ? 'ready' : 'unauthorized';
  } catch { return 'unavailable'; }
}
export async function recordIntegratedResearchAssistance(client: ExperimentAccountingClient, ownerId: string, plan: IntegratedExecutionPlan, row: Row): Promise<void> {
  const expected = integratedResearchAssistanceIdentity(ownerId, plan, row);
  const result = await client.rpc('learning_begin_research_assistance', expected.args);
  const receipt = result.data as Record<string, unknown> | null;
  if (result.error || !receipt || typeof receipt !== 'object' || Array.isArray(receipt)
    || Object.entries(expected.receipt).some(([key, value]) => receipt[key] !== value)
    || Object.keys(receipt).length !== Object.keys(expected.receipt).length + 1
    || typeof receipt.recordedAt !== 'string' || !Number.isFinite(Date.parse(receipt.recordedAt))) {
    throw new Error('research_assistance_receipt_unavailable');
  }
}
