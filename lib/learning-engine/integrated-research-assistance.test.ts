import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { integratedResearchAssistanceIdentity, readIntegratedResearchAssistanceReadiness, recordIntegratedResearchAssistance } from '@/supabase/functions/_shared/learning/integrated-research-assistance';
import type { IntegratedExecutionPlan } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture() {
  const owner = '00000000-0000-4000-8000-000000000001';
  const row = { requestId: '00000000-0000-4000-8000-000000000002', assignmentId: '00000000-0000-4000-8000-000000000003',
    requestBody: '{"opaque":"request"}', requestBodySha256: hash('{"opaque":"request"}') };
  // Only the identity projection is relevant here; no provider or plan compilation.
  const plan = { operatorId: owner, planSha256: 'a'.repeat(64), requests: [row] } as unknown as IntegratedExecutionPlan;
  return { owner, plan, row: plan.requests[0] };
}
describe('scoped research assistance receipt', () => {
  it('binds distinct body and payload hashes with the SQL newline recipe', () => {
    const f = fixture(), identity = integratedResearchAssistanceIdentity(f.owner, f.plan, f.row);
    const payload = hash('integrated-research-assistance-v1\n' + f.owner + '\n' + f.row.assignmentId + '\n' + f.row.requestId + '\n' + f.plan.planSha256 + '\n' + f.row.requestBodySha256 + '\napi\nhint');
    expect(identity.args).toEqual({ p_request: f.row.requestId, p_manifest: f.plan.planSha256, p_owner: f.owner,
      p_assignment: f.row.assignmentId, p_body_sha256: f.row.requestBodySha256, p_payload_sha256: payload });
    expect(payload).not.toBe(f.row.requestBodySha256);
    expect(payload).toBe('ed123325e9d1cd834899b9c492943834f2347944ad304e85317a5a9bb6b2414a');
    expect(identity.receipt).toMatchObject({ scope: 'assignment', selectedProblemId: null, independenceBlocked: true });
  });
  it.each(['owner', 'assignment', 'request', 'plan', 'body'] as const)('changes the payload for changed %s scope', field => {
    const f = fixture(), initial = integratedResearchAssistanceIdentity(f.owner, f.plan, f.row).args.p_payload_sha256;
    if (field === 'owner') { f.owner = '00000000-0000-4000-8000-000000000004'; f.plan.operatorId = f.owner; }
    if (field === 'assignment') f.row.assignmentId = '00000000-0000-4000-8000-000000000005';
    if (field === 'request') f.row.requestId = '00000000-0000-4000-8000-000000000006';
    if (field === 'plan') f.plan.planSha256 = 'b'.repeat(64);
    if (field === 'body') { f.row.requestBody += ' '; f.row.requestBodySha256 = hash(f.row.requestBody); }
    expect(integratedResearchAssistanceIdentity(f.owner, f.plan, f.row).args.p_payload_sha256).not.toBe(initial);
  });
  it('rejects actor, selected-row and raw request drift before database IO', async () => {
    const f = fixture(), rpc = vi.fn();
    expect(await readIntegratedResearchAssistanceReadiness({ rpc }, '00000000-0000-4000-8000-000000000009', f.plan, f.row)).toBe('unavailable');
    expect(() => integratedResearchAssistanceIdentity(f.owner, f.plan, { ...f.row })).toThrow('scope');
    f.row.requestBody += 'changed';
    await expect(recordIntegratedResearchAssistance({ rpc }, f.owner, f.plan, f.row)).rejects.toThrow('scope');
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([[true, null, 'ready'], [false, null, 'unauthorized'], [null, null, 'unavailable'], ['true', null, 'unavailable'], [true, { code: '42501' }, 'unavailable']] as const)('fails closed for readiness %j / %j', async (data, error, expected) => {
    const f = fixture(), rpc = vi.fn(async () => ({ data, error }));
    expect(await readIntegratedResearchAssistanceReadiness({ rpc }, f.owner, f.plan, f.row)).toBe(expected);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('learning_research_assistance_ready', integratedResearchAssistanceIdentity(f.owner, f.plan, f.row).args);
  });
  it('requires exact persisted receipt and makes no provisioning or activation call', async () => {
    const f = fixture(), identity = integratedResearchAssistanceIdentity(f.owner, f.plan, f.row);
    const rpc = vi.fn(async () => ({ data: { ...identity.receipt, recordedAt: '2026-09-29T00:00:00Z' }, error: null }));
    await recordIntegratedResearchAssistance({ rpc }, f.owner, f.plan, f.row);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('learning_begin_research_assistance', identity.args);
  });
  it.each(['ownerId', 'assignmentId', 'requestId', 'payloadSha256', 'scope', 'channel', 'kind', 'independenceBlocked', 'extra', 'recordedAt'])('rejects receipt drift in %s', async field => {
    const f = fixture(), expected = integratedResearchAssistanceIdentity(f.owner, f.plan, f.row).receipt;
    const data = { ...expected, recordedAt: '2026-09-29T00:00:00Z', [field]: 'invalid' };
    await expect(recordIntegratedResearchAssistance({ rpc: async () => ({ data, error: null }) }, f.owner, f.plan, f.row)).rejects.toThrow('receipt_unavailable');
  });
  it('does not swallow database failures as a receipt', async () => {
    const f = fixture();
    await expect(recordIntegratedResearchAssistance({ rpc: async () => ({ data: null, error: { code: '42501' } }) }, f.owner, f.plan, f.row)).rejects.toThrow('receipt_unavailable');
    expect(await readIntegratedResearchAssistanceReadiness({ rpc: async () => { throw Error('network'); } }, f.owner, f.plan, f.row)).toBe('unavailable');
  });
});
