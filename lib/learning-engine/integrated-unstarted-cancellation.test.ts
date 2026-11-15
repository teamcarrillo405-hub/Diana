import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createIntegratedExecutionHandler, type IntegratedExecutionDependencies } from '@/supabase/functions/_shared/learning/integrated-execution-handler';
import { verifyIntegratedExecutionPlan, integratedReservationCents, integratedExecutionPlanDigest } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
import { cancelUnstartedExperiment } from '@/supabase/functions/_shared/learning/experiment-accounting';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002', requestId = '00000000-0000-4000-8000-000000000003', batchId = '00000000-0000-4000-8000-000000000004';
const time = Date.parse('2026-09-29T00:00:00Z');
function fixture() {
  const recipe = prepareIntegratedPrimaryRecipe({ promptContext: 'opaque source', actualPromptAnchors: [], query: 'opaque query' }, 'synthetic-model');
  const body = { schema: 'integrated-execution-plan-v1', preparedPlanSha256: 'a'.repeat(64), projectUrl: 'https://project.test', operatorId: owner, model: 'synthetic-model', responseModel: 'synthetic-model',
    inputRate: 25, outputRate: 200, priceReviewedAt: new Date(time).toISOString(), expiresAt: new Date(time + 3600000).toISOString(),
    maxTotalCents: 100, maxBatchCents: 100, timeoutMs: 1000, maxOutputTokens: 800,
    moderation: { model: 'omni-moderation-latest', maxCallsPerCase: 2, reviewedCentsPerCall: 0 }, planned: 1, notScheduled: 0, unscheduled: [],
    requests: [{ requestId, batchId, caseId: 'opaque', assignmentId: assignment, captureSha256: 'b'.repeat(64), requestBody: recipe.requestBody,
      requestBodySha256: recipe.requestBodySha256, reservedCents: integratedReservationCents(recipe.requestBody, 25, 200), sourcePins: [{ id: 'version', contentHash: 'c'.repeat(64), sourceSha256: 'd'.repeat(64) }] }] };
  const plan = verifyIntegratedExecutionPlan({ ...body, planSha256: integratedExecutionPlanDigest(body) });
  const env: Record<string, string> = { DIANA_INTEGRATED_EXECUTION_ENABLED: 'true', DIANA_INTEGRATED_EXECUTION_PLAN_HASH: plan.planSha256,
    DIANA_INTEGRATED_EXECUTION_OPERATOR_ID: owner, DIANA_DURABLE_TASK_ASSISTANCE_ENABLED: 'true', OPENAI_API_KEY: 'synthetic-no-authority', SUPABASE_URL: 'https://project.test' };
  let reserved = false; const order: string[] = [], rpc = vi.fn(async (name: string) => {
    order.push(name);
    if (name === 'learning_reserve_experiment') { if (reserved) return { data: false, error: null }; reserved = true; }
    return { data: name === 'learning_record_experiment_usage' ? 1 : true, error: null };
  });
  const insert = vi.fn(async () => { order.push('raw_saved'); return { error: null }; });
  const client = { rpc, from: vi.fn(() => ({ insert })) };
  const payload = { id: 'resp_synthetic', object: 'response', created_at: 1, model: 'synthetic-model', status: 'completed', error: null, incomplete_details: null as null | { reason: string },
    usage: { input_tokens: 20, output_tokens: 10, total_tokens: 30 }, output: [{ id: 'msg_synthetic', type: 'message', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', annotations: [], text: JSON.stringify({ title: 'T', main: 'M', reason: 'R', steps: ['a', 'b', 'c'], anchor: 'A' }) }] }] };
  const fetch = vi.fn(async () => { order.push('provider'); return new Response(JSON.stringify(payload), { status: 200, headers: { 'x-request-id': 'synthetic-request' } }); });
  const auth = { ownerId: owner, serviceClient: client, userClient: client };
  const deps: IntegratedExecutionDependencies = { plan, env: key => env[key], now: () => time, fetch,
    assistanceReadiness: async () => 'ready',
    authenticate: vi.fn(async () => auth), verifySources: vi.fn(async () => true), recordAssistance: vi.fn(async () => { order.push('assistance'); }),
    guard: async input => ({ ok: true, value: await input.invoke() }) };
  const request = () => new Request('https://local.test', { method: 'POST', body: JSON.stringify({ planSha256: plan.planSha256, requestId }) });
  return { plan, env, deps, payload, request, client, rpc, insert, fetch, order, auth };
}

const cancellation = 'learning_cancel_unstarted_experiment';
const start = 'learning_start_experiment_provider';
describe('definitively unstarted experiment cancellation', () => {
  it.each([['budget', 429], ['safety', 422], ['screening', 503], ['accounting', 503]] as const)(
    'cancels a %s guard stop with exact identity and preserves status', async (kind, status) => {
      const f = fixture(); f.deps.guard = async () => ({ ok: false, kind, status });
      const response = await createIntegratedExecutionHandler(f.deps)(f.request());
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ kind, reservationSettlement: 'settled_zero', providerStartRequested: false });
      expect(f.rpc).toHaveBeenCalledWith(cancellation, { p_id: requestId, p_manifest_hash: f.plan.planSha256 });
      expect(f.rpc.mock.calls.map(call => call[0])).toEqual(['learning_reserve_experiment', cancellation]);
      expect(f.fetch).not.toHaveBeenCalled();
    });
  it.each(['before_screening', 'before_start', 'source', 'expiry', 'assistance'])(
    'cancels %s failure before invoking the start fence', async mode => {
      const f = fixture(); let authCalls = 0, sourceCalls = 0;
      if (mode === 'before_screening' || mode === 'before_start') f.deps.authenticate = async () =>
        ++authCalls === (mode === 'before_screening' ? 2 : 3) ? new Response('{}', { status: 403 }) : f.auth;
      if (mode === 'source') f.deps.verifySources = async () => ++sourceCalls < 3;
      if (mode === 'expiry') { let clock = time; f.deps.now = () => clock;
        f.deps.guard = async input => { clock += 2 * 3600000; return { ok: true, value: await input.invoke() }; }; }
      if (mode === 'assistance') f.deps.recordAssistance = async () => { throw new Error('synthetic receipt outage'); };
      const response = await createIntegratedExecutionHandler(f.deps)(f.request());
      expect(response.status).toBe(mode === 'before_screening' ? 403 : 503);
      expect(await response.json()).toMatchObject({ reservationSettlement: 'settled_zero', providerStartRequested: false });
      expect(f.rpc.mock.calls.filter(call => call[0] === cancellation)).toHaveLength(1);
      expect(f.rpc.mock.calls.some(call => call[0] === start)).toBe(false); expect(f.fetch).not.toHaveBeenCalled();
    });
  it.each(['false', 'error', 'throw'])('never cancels an ambiguous %s start acknowledgement', async mode => {
    const f = fixture(), original = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async name => {
      if (name !== start) return original(name);
      if (mode === 'throw') throw new Error('unknown commit');
      return { data: mode === 'error', error: mode === 'error' ? 'unknown commit' : null } as never;
    });
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ providerStartRequested: true });
    expect(f.rpc.mock.calls.some(call => call[0] === cancellation)).toBe(false); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('never cancels after acknowledged start, including provider transport failure', async () => {
    const f = fixture(); f.fetch.mockRejectedValue(new Error('unknown provider outcome'));
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBe(503); expect(await response.json()).toMatchObject({ providerStartRequested: true, providerAttempted: true });
    expect(f.rpc.mock.calls.some(call => call[0] === cancellation || call[0] === 'learning_settle_experiment')).toBe(false);
    expect(f.fetch).toHaveBeenCalledOnce();
  });
  it.each(['false', 'error', 'throw'])('reports unconfirmed %s cancellation without retry', async mode => {
    const f = fixture(), original = f.rpc.getMockImplementation()!;
    f.deps.guard = async () => ({ ok: false, kind: 'budget', status: 429 });
    f.rpc.mockImplementation(async name => {
      if (name !== cancellation) return original(name);
      if (mode === 'throw') throw new Error('unknown commit');
      return { data: mode === 'error', error: mode === 'error' ? 'unknown commit' : null } as never;
    });
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'execution_needs_reconciliation', reservationSettlement: 'unconfirmed', providerStartRequested: false });
    expect(f.rpc.mock.calls.filter(call => call[0] === cancellation)).toHaveLength(1); expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each(['false', 'throw'])('never cancels an unacknowledged %s reservation', async mode => {
    const f = fixture(); f.rpc.mockImplementation(async () => { if (mode === 'throw') throw new Error('unknown commit'); return { data: false, error: null }; });
    await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(f.rpc.mock.calls.map(call => call[0])).toEqual(['learning_reserve_experiment']); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('retains the no-replay fence after cancellation and admits only one concurrent winner', async () => {
    const f = fixture(); f.deps.guard = async () => ({ ok: false, kind: 'budget', status: 429 });
    const handler = createIntegratedExecutionHandler(f.deps);
    expect((await Promise.all([handler(f.request()), handler(f.request())])).map(r => r.status).sort()).toEqual([409, 429]);
    expect((await handler(f.request())).status).toBe(409);
    expect(f.rpc.mock.calls.filter(call => call[0] === cancellation)).toHaveLength(1); expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each([false, null, 1, 'true'])('requires strict true cancellation acknowledgement (%s)', async data => {
    const rpc = vi.fn(async () => ({ data, error: null }));
    await expect(cancelUnstartedExperiment({ rpc }, requestId, 'a'.repeat(64))).rejects.toThrow('reconciliation');
    expect(rpc).toHaveBeenCalledOnce();
  });
});
