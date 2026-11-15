import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createIntegratedExecutionHandler, type IntegratedExecutionDependencies } from '@/supabase/functions/_shared/learning/integrated-execution-handler';
import { verifyIntegratedExecutionPlan, integratedReservationCents, integratedExecutionPlanDigest, pinIntegratedExecutionSources, verifyIntegratedExecutionSources } from '@/supabase/functions/_shared/learning/integrated-execution-plan';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import { prepareIntegratedPrimaryRecipe } from './integrated-primary-recipe';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileIntegratedExecutionPlan } from './integrated-execution-plan';
import { runIntegratedExecutionPlan } from './integrated-execution-run';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { integratedExecutionPlanCli } from '../../scripts/learning/integrated-execution-plan';
import { integratedExecutionRunCli } from '../../scripts/learning/integrated-execution-run';
import { runSyntheticAssignmentCapture } from '../../scripts/learning/integrated-assignment-capture';
import { prepareIntegratedRequestPlan } from './integrated-request-plan';
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
    assistanceReadiness: vi.fn(async () => { order.push('readiness'); return 'ready' as const; }),
    authenticate: vi.fn(async () => auth), verifySources: vi.fn(async () => true), recordAssistance: vi.fn(async () => { order.push('assistance'); }),
    guard: async input => ({ ok: true, value: await input.invoke() }) };
  const request = () => new Request('https://local.test', { method: 'POST', body: JSON.stringify({ planSha256: plan.planSha256, requestId }) });
  return { plan, env, deps, payload, request, client, rpc, insert, fetch, order, auth };
}
describe('default-off integrated execution Edge core', () => {
  it('releases a complete Responses capture with nested usage details after saving exact billing counters', async () => {
    const f = fixture();
    Object.assign(f.payload.usage, { input_tokens_details: { cached_tokens: 7 }, output_tokens_details: { reasoning_tokens: 3 } });
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ok:true,classification:'complete',usageSaved:true,rawSaved:true,
      result:{usage:{inputTokens:20,outputTokens:10,totalTokens:30},actualCents:1}});
    expect(f.rpc).toHaveBeenCalledWith('learning_record_experiment_usage', expect.objectContaining({p_input_tokens:20,p_output_tokens:10,p_total_tokens:30}));
    expect(f.fetch).toHaveBeenCalledOnce();
    expect(f.order.indexOf('learning_record_experiment_usage')).toBeLessThan(f.order.indexOf('raw_saved'));
    expect(f.rpc).toHaveBeenCalledWith('learning_record_experiment_output_state', expect.objectContaining({p_state:'released'}));
  });
  it.each(['staged', 'unauthorized', 'unavailable', 'throws'] as const)('stops %s assistance readiness before any reservation or moderation/token guard', async state => {
    const f = fixture();
    f.deps.assistanceReadiness = vi.fn(async () => { if (state === 'throws') throw Error('database unavailable'); return state; });
    const guard = vi.fn(); f.deps.guard = async () => { guard(); throw Error('guard must not run'); };
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: state === 'staged' ? 'assistance_enforcement_staged' : state === 'unauthorized' ? 'research_assistance_not_authorized' : 'assistance_readiness_unavailable', providerAttempted: false, reservationAttempted: false });
    expect(f.deps.assistanceReadiness).toHaveBeenCalledWith(f.auth, f.plan.requests[0], f.plan);
    expect(guard).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
    expect(f.deps.recordAssistance).not.toHaveBeenCalled(); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('does not read privileged readiness before authenticating the exact operator', async () => {
    const f = fixture(); f.auth.ownerId = assignment;
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBe(403);
    expect(f.deps.assistanceReadiness).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled();
  });
  it('awaits ready database control before budget reservation while retaining the write receipt', async () => {
    const f = fixture(); let resolveReadiness!: (value: 'ready') => void;
    f.deps.assistanceReadiness = vi.fn(() => new Promise<'ready'>(resolve => { resolveReadiness = resolve; }));
    const pending = createIntegratedExecutionHandler(f.deps)(f.request());
    await vi.waitFor(() => expect(f.deps.assistanceReadiness).toHaveBeenCalledOnce());
    expect(f.rpc).not.toHaveBeenCalled(); expect(f.fetch).not.toHaveBeenCalled();
    resolveReadiness('ready'); expect((await pending).status).toBe(200);
    expect(f.deps.recordAssistance).toHaveBeenCalledOnce();
  });
  it.each([undefined, 'false'])('requires its own assistance receipt without depending on global production flag %s', async flag => {
    const f = fixture();
    if (flag === undefined) delete f.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED;
    else f.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED = flag;
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBe(200);
    expect(f.deps.recordAssistance).toHaveBeenCalledOnce();
    expect(f.order.indexOf('assistance')).toBeLessThan(f.order.indexOf('learning_start_experiment_provider'));
    expect(f.fetch).toHaveBeenCalledOnce();
    const denied = fixture(); delete denied.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED;
    denied.deps.recordAssistance = async () => { throw new Error('receipt unavailable'); };
    expect((await createIntegratedExecutionHandler(denied.deps)(denied.request())).status).toBe(503);
    expect(denied.fetch).not.toHaveBeenCalled();
    expect(denied.rpc.mock.calls.some(call => call[0] === 'learning_start_experiment_provider')).toBe(false);
  });
  it('keeps unscreened reasoning and provider metadata only in the service raw record', async () => {
    const f = fixture();
    Object.assign(f.payload, { private_metadata: 'opaque-unscreened-metadata' });
    f.payload.output.push({ id: 'rs_synthetic', type: 'reasoning', summary: [{ type: 'summary_text', text: 'opaque-unscreened-reasoning' }] } as never);
    let screened = '';
    f.deps.guard = async input => { const value = await input.invoke(); screened = input.getOutput(value); return { ok: true, value }; };
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    const envelope = await response.json();
    expect(response.status).toBe(200);
    expect(envelope.result).toMatchObject({ schema: 'integrated-screened-completion-v1', text: screened });
    expect(JSON.stringify(envelope)).not.toContain('opaque-unscreened');
    expect(envelope.result).not.toHaveProperty('parsed');
    expect(JSON.stringify(f.insert.mock.calls)).toContain('opaque-unscreened-reasoning');
    expect(JSON.stringify(f.insert.mock.calls)).toContain('opaque-unscreened-metadata');
  });
  it('pins actual source pages and metadata, rejects altered data even when declared hashes survive', () => {
    const f = fixture(), row = f.plan.requests[0];
    const sources = [{ id: 'version', owner_id: owner, assignment_id: assignment, content_hash: 'c'.repeat(64),
      metadata: { id: 'version', ownerId: owner, assignmentId: assignment, contentHash: 'c'.repeat(64), title: 'opaque' },
      pages: [{ page: 1, pageLabel: '1', text: 'opaque alpha', interpretation: 'original' }] }];
    row.sourcePins = pinIntegratedExecutionSources(owner, assignment, row.sourcePins, sources);
    expect(verifyIntegratedExecutionSources(owner, row, sources)).toBe(true);
    // PostgreSQL JSONB object ordering does not alter the digest.
    const reordered = [{ ...sources[0], metadata: Object.fromEntries(Object.entries(sources[0].metadata).reverse()), pages: sources[0].pages.map(page => Object.fromEntries(Object.entries(page).reverse())) }];
    expect(verifyIntegratedExecutionSources(owner, row, reordered)).toBe(true);
    for (const change of ['page', 'metadata', 'owner', 'assignment', 'pin', 'missing', 'duplicate'] as const) {
      const altered = structuredClone(sources);
      if (change === 'page') altered[0].pages[0].text = 'opaque altered';
      if (change === 'metadata') altered[0].metadata.title = 'altered';
      if (change === 'owner') altered[0].owner_id = assignment;
      if (change === 'assignment') altered[0].metadata.assignmentId = owner;
      if (change === 'pin') altered[0].content_hash = 'f'.repeat(64);
      if (change === 'missing') altered.pop();
      if (change === 'duplicate') altered.push(altered[0]);
      expect(verifyIntegratedExecutionSources(owner, row, altered), change).toBe(false);
    }
  });
  it('retains the recovered parser implementation with portable source line endings', () => {
    const contract = JSON.parse(readFileSync('lib/learning-engine/fixtures/recovered-primary-contract.json', 'utf8'));
    const moved = readFileSync('supabase/functions/_shared/learning/integrated-provider-response.ts', 'utf8').replaceAll('\r\n', '\n');
    const prefix = "import { Buffer } from 'node:buffer';\n";
    expect(moved.startsWith(prefix)).toBe(true);
    expect(createHash('sha256').update(moved.slice(prefix.length)).digest('hex')).toBe(contract.parserBodySha256);
  });
  it('requires deployment approval before authentication or provider interaction', async () => {
    const f = fixture(); delete f.env.DIANA_INTEGRATED_EXECUTION_ENABLED;
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBe(404);
    expect(f.deps.authenticate).not.toHaveBeenCalled(); expect(f.rpc).not.toHaveBeenCalled(); expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each(['plan_hash', 'operator', 'expired', 'source', 'assistance'])('blocks %s without a provider request', async kind => {
    const f = fixture();
    if (kind === 'plan_hash') f.env.DIANA_INTEGRATED_EXECUTION_PLAN_HASH = 'f'.repeat(64);
    if (kind === 'operator') f.auth.ownerId = assignment;
    if (kind === 'expired') f.deps.now = () => time + 2 * 3600000;
    if (kind === 'source') f.deps.verifySources = async () => false;
    if (kind === 'assistance') f.deps.recordAssistance = async () => { throw new Error('receipt unavailable'); };
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBeGreaterThanOrEqual(400);
    expect(f.fetch).not.toHaveBeenCalled();
  });
  it('awaits receipt/start and settles exact usage before raw output release with zero retries', async () => {
    const f = fixture(), handler = createIntegratedExecutionHandler(f.deps);
    const result = await handler(f.request()); expect(result.status).toBe(200);
    expect(f.order.indexOf('assistance')).toBeLessThan(f.order.indexOf('learning_start_experiment_provider'));
    expect(f.order.indexOf('learning_record_experiment_usage')).toBeLessThan(f.order.indexOf('raw_saved'));
    expect(f.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({ body: f.plan.requests[0].requestBody, redirect: 'error' }));
    expect((await handler(f.request())).status).toBe(409); expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(f.insert).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ rawBodyComplete: true, usageSaved: true, rawCapture: expect.objectContaining({ requestBody: f.plan.requests[0].requestBody }) }) }));
  });
  it('admits only one concurrent attempt through the atomic reservation result', async () => {
    const f = fixture(), handler = createIntegratedExecutionHandler(f.deps);
    const results = await Promise.all([handler(f.request()), handler(f.request())]);
    expect(results.map(row => row.status).sort()).toEqual([200, 409]); expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves truncation raw bytes and charged usage without promoting partial output', async () => {
    const f = fixture(); f.payload.status = 'incomplete'; f.payload.incomplete_details = { reason: 'max_output_tokens' }; f.payload.output[0].status = 'incomplete';
    const result = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(await result.json()).toMatchObject({ classification: 'truncated', usageSaved: true, rawSaved: true });
    expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.insert).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ classification: 'truncated' }) }));
  });
  it('retains the reservation for unexpected-model pricing and saves original response', async () => {
    const f = fixture(); f.payload.model = 'unapproved-model';
    expect(await (await createIntegratedExecutionHandler(f.deps)(f.request())).json()).toMatchObject({ usageSaved: false, rawSaved: true, classification: 'capture_invalid' });
    expect(f.rpc.mock.calls.some(call => call[0] === 'learning_record_experiment_usage')).toBe(false);
  });
  it('does not retry or release reserved cents after a transport timeout', async () => {
    const f = fixture(); f.fetch.mockRejectedValue(new Error('timeout'));
    expect(await (await createIntegratedExecutionHandler(f.deps)(f.request())).json()).toMatchObject({ providerAttempted: true, usageSaved: false });
    expect(f.fetch).toHaveBeenCalledTimes(1); expect(f.rpc.mock.calls.some(call => call[0] === 'learning_settle_experiment')).toBe(false);
  });
  it('fails closed on ambiguous provider-start acknowledgement', async () => {
    const f = fixture(); f.rpc.mockImplementation(async name => ({ data: name === 'learning_start_experiment_provider' ? false : true, error: null }));
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBe(503); expect(f.fetch).not.toHaveBeenCalled();
  });
  it('withholds output when raw persistence fails after cost settlement', async () => {
    const f = fixture(); f.insert.mockResolvedValue({ error: 'storage unavailable' } as never);
    expect(await (await createIntegratedExecutionHandler(f.deps)(f.request())).json()).toMatchObject({ usageSaved: true, rawSaved: false });
  });
  it('rechecks consent/class policy after provider completion before releasing raw or tutor output', async () => {
    const f = fixture(); let authCalls = 0;
    f.deps.authenticate = async () => ++authCalls === 4 ? new Response('{}', { status: 403 }) : f.auth;
    const result = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(result.status).toBe(403); const output = await result.json();
    expect(output).toMatchObject({ error: 'policy_changed_before_release', usageSaved: true, rawSaved: true });
    expect(output.result).toBeUndefined(); expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it('rechecks plan expiry after moderation delay before provider start', async () => {
    const f = fixture(); let clock = time; f.deps.now = () => clock;
    f.deps.guard = async input => { clock += 2 * 3600000; return { ok: true, value: await input.invoke() }; };
    expect((await createIntegratedExecutionHandler(f.deps)(f.request())).status).toBe(503); expect(f.fetch).not.toHaveBeenCalled();
  });
  it.each(['blocked', 'unavailable'])('uses real safety guard and keeps measured cents when output moderation is %s', async mode => {
    const f = fixture(); const safetyPath = '../../supabase/functions/_shared/safety.ts';
    const { runSafeBudgetedAiCall } = await import(safetyPath);
    const original = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (name: string) => {
      if (name === 'reserve_ai_token_budget') return { data: [{ allowed: true, reservation_id: requestId, reserved_tokens: 800, remaining_tokens: 5000, reservation_status: 'active' }], error: null } as never;
      if (name === 'mark_ai_budget_provider_started') return { data: [{ reservation_id: requestId, reservation_status: 'active', provider_start_status: 'started', provider_started_at: new Date(time).toISOString() }], error: null } as never;
      if (name === 'settle_ai_token_budget') { f.order.push('token_settled'); return { data: [{ reservation_id: requestId, reservation_status: 'settled', actual_tokens: 30, charged_tokens: 30 }], error: null } as never; }
      return original(name);
    });
    let moderationCalls = 0;
    f.deps.guard = input => runSafeBudgetedAiCall({ ...input, moderator: async ({ phase }: { phase: string }) => {
      moderationCalls++; if (phase === 'input') return { safe: true };
      expect(f.order).toContain('learning_record_experiment_usage'); expect(f.order).toContain('raw_saved');
      if (mode === 'unavailable') throw new Error('synthetic moderation unavailable');
      return { safe: false, category: 'sensitive_data', redirect: 'Synthetic block' };
    } });
    const response = await createIntegratedExecutionHandler(f.deps)(f.request());
    expect(response.status).toBeGreaterThanOrEqual(400); expect(await response.json()).toMatchObject({ usageSaved: true, rawSaved: true });
    expect(moderationCalls).toBe(2); expect(f.order).toContain('token_settled'); expect(f.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('integrated execution plan compilation', () => {
  it('rejects resealed capture anchors outside their actual pinned source or owner scope', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'integrated-source-binding-'));
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'));
    try {
      const output = join(dir, 'capture.json'); await runSyntheticAssignmentCapture(output);
      const captured = JSON.parse(await readFile(output, 'utf8'));
      captured.execution = 'authenticated_supabase_lexical_retrieval_no_generation';
      const prepare = (batch: typeof captured) => {
        const row = batch.rows[0], { captureSha256: _old, ...body } = row;
        row.captureSha256 = sha256(JSON.stringify(body));
        const digest = sha256(JSON.stringify(batch));
        return prepareIntegratedRequestPlan(batch, { schema: 'integrated-request-plan-configuration-v1', id: requestId,
          model: 'synthetic-model', expectedResponseModel: 'synthetic-model', expectedCaseCount: 1,
          maxOutputTokens: 800, maxRequestBytes: 128000, captureFileSha256: digest }, digest);
      };
      expect(prepare(structuredClone(captured)).rows[0].sourcePins[0]).toHaveProperty('sourceSha256');
      const otherOwner = structuredClone(captured); otherOwner.rows[0].result.chunks[0].ownerId = assignment;
      expect(() => prepare(otherOwner)).toThrow('retrieved_source_scope');
      const changedPages = structuredClone(captured);
      changedPages.rows[0].trace.find((item: { stage: string }) => item.stage === 'documents').payload[0].pages[0].text = 'altered source text';
      expect(() => prepare(changedPages)).toThrow('retrieved_source_anchor');
      const missingTrace = structuredClone(captured); missingTrace.rows[0].trace = [];
      expect(() => prepare(missingTrace)).toThrow('source_snapshot_required');
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); await rm(dir, { recursive: true, force: true }); }
  });
  function inputs() {
    const f = fixture();
    const body = { schema: 'integrated-primary-request-plan-v1', planned: 1, preparedRequests: 1, notScheduled: 0,
      configuration: { model: f.plan.model, expectedResponseModel: f.plan.responseModel, maxOutputTokens: 800 },
      rows: [{ caseId: 'opaque', assignmentId: assignment, ownerId: owner, sourcePins: f.plan.requests[0].sourcePins, captureSha256: 'b'.repeat(64),
        status: 'prepared_not_authorized', request: { requestBody: f.plan.requests[0].requestBody, requestBodySha256: f.plan.requests[0].requestBodySha256 } }], providerCalls: 0, dispatchAuthorized: false };
    const prepared = { ...body, planSha256: sha256(JSON.stringify(body)) };
    const quote = { schema: 'integrated-execution-quote-v1', preparedPlanSha256: prepared.planSha256, operatorId: owner, projectUrl: 'https://project.test',
      inputRate: 25, outputRate: 200, priceReviewedAt: f.plan.priceReviewedAt, expiresAt: f.plan.expiresAt,
      maxTotalCents: 100, maxBatchCents: 100, timeoutMs: 1000, moderation: f.plan.moderation };
    return { prepared, quote };
  }
  it('freezes deterministic one-attempt identifiers and conservative cents without approval', () => {
    const f = inputs(); const plan = compileIntegratedExecutionPlan(f.prepared, f.quote);
    expect(verifyIntegratedExecutionPlan(plan)).toEqual(plan);
    expect(compileIntegratedExecutionPlan(f.prepared, f.quote)).toEqual(plan);
    expect(plan.requests[0]).toMatchObject({ requestBody: f.prepared.rows[0].request.requestBody, reservedCents: 1 });
  });
  it.each(['operator', 'digest', 'model', 'price', 'body'])('rejects altered %s', kind => {
    const f = inputs();
    if (kind === 'operator') f.quote.operatorId = assignment;
    if (kind === 'digest') f.quote.preparedPlanSha256 = 'f'.repeat(64);
    if (kind === 'model') f.prepared.configuration.model = 'changed';
    if (kind === 'price') f.quote.inputRate = -1;
    if (kind === 'body') f.prepared.rows[0].request.requestBody = '{}';
    expect(() => compileIntegratedExecutionPlan(f.prepared, f.quote)).toThrow();
  });
  it('compiles explicit pinned files exclusively and rejects a mismatched approval before authentication', async () => {
    const f = inputs(), dir = await mkdtemp(join(tmpdir(), 'integrated-execution-'));
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network forbidden'));
    try {
      const prepared = JSON.stringify(f.prepared), quote = JSON.stringify(f.quote), planPath = join(dir, 'plan.json');
      await writeFile(join(dir, 'prepared.json'), prepared); await writeFile(join(dir, 'quote.json'), quote);
      const args = ['compile', join(dir, 'prepared.json'), '--prepared-sha256', sha256(prepared), '--quote', join(dir, 'quote.json'), '--quote-sha256', sha256(quote), '--out', planPath];
      expect(await integratedExecutionPlanCli(args)).toMatchObject({ requests: 1, providerCalls: 0, approvalGranted: false });
      await expect(integratedExecutionPlanCli(args)).rejects.toMatchObject({ code: 'EEXIST' });
      const plan = await readFile(planPath, 'utf8'), approval = JSON.stringify({ schema: 'integrated-execution-approval-v1', approved: true, planSha256: 'f'.repeat(64), operatorId: owner, maxTotalCents: 100, expiresAt: new Date(time + 1000).toISOString() });
      await writeFile(join(dir, 'approval.json'), approval);
      await expect(integratedExecutionRunCli(['execute', planPath, '--plan-file-sha256', sha256(plan), '--approval', join(dir, 'approval.json'), '--approval-sha256', sha256(approval), '--out-dir', join(dir, 'run')])).rejects.toThrow('approval_mismatch');
      expect(fetch).not.toHaveBeenCalled();
    } finally { fetch.mockRestore(); await rm(dir, { recursive: true, force: true }); }
  });
});

describe('operator one-attempt Edge runner', () => {
  it('stops before another dispatch when the shorter local approval expires', async () => {
    const f = fixture(), { planSha256: _digest, ...body } = f.plan;
    body.planned = 2; body.requests.push({ ...body.requests[0], caseId: 'opaque-two', requestId: '00000000-0000-4000-8000-000000000005' });
    const plan = { ...body, planSha256: integratedExecutionPlanDigest(body) };
    f.deps.plan = plan; f.env.DIANA_INTEGRATED_EXECUTION_PLAN_HASH = plan.planSha256;
    let clock = time;
    const handler = createIntegratedExecutionHandler(f.deps), fetch = vi.fn(async (url, init) => handler(new Request(url, init)));
    const report = await runIntegratedExecutionPlan(plan, { accessToken: 'synthetic-token', publishableKey: 'synthetic-key', fetch,
      approvalExpiresAt: new Date(time + 1000).toISOString(), now: () => clock, save: async () => { clock += 2000; } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(report).toMatchObject({ planned: 2, accountedRows: 2, edgeAttempts: 1, stopped: true,
      rows: [{ status: 'captured_complete' }, { status: 'not_attempted_approval_expired' }] });
  });
  it('calls only the pinned Edge URL and persists raw envelopes before accepting a completion', async () => {
    const f = fixture(), handler = createIntegratedExecutionHandler(f.deps), save = vi.fn(async (..._args: unknown[]) => undefined);
    const fetch = vi.fn(async (url, init) => handler(new Request(url, init)));
    const report = await runIntegratedExecutionPlan(f.plan, { accessToken: 'synthetic-user-token', publishableKey: 'synthetic-public-key', fetch, save, now: () => time });
    expect(report).toMatchObject({ planned: 1, accountedRows: 1, edgeAttempts: 1, stopped: false, rows: [{ status: 'captured_complete' }] });
    expect(fetch).toHaveBeenCalledWith('https://project.test/functions/v1/learning-integrated-execution', expect.objectContaining({ redirect: 'error' }));
    expect(save).toHaveBeenCalledTimes(1); expect(JSON.stringify(save.mock.calls)).not.toContain('synthetic-user-token');
  });
  it('stops after ambiguity and retains every later row without retries', async () => {
    const f = fixture(); const { planSha256: _hash, ...body } = f.plan;
    body.planned = 2; body.requests.push({ ...body.requests[0], caseId: 'opaque-two', requestId: '00000000-0000-4000-8000-000000000005' });
    const plan = { ...body, planSha256: integratedExecutionPlanDigest(body) }, fetch = vi.fn().mockRejectedValue(new Error('timeout')), save = vi.fn(async (..._args: unknown[]) => undefined);
    const report = await runIntegratedExecutionPlan(plan, { accessToken: 'synthetic-token', publishableKey: 'synthetic-key', fetch, save, now: () => time });
    expect(report).toMatchObject({ planned: 2, accountedRows: 2, edgeAttempts: 1, stopped: true, rows: [{ status: 'requires_reconciliation_no_retry' }, { status: 'not_attempted_after_stop' }] });
    expect(fetch).toHaveBeenCalledTimes(1); expect(save.mock.calls[0][0]).toBe(requestId + '-uncertain');
  });
  it('fails closed when saving the received envelope is unavailable', async () => {
    const f = fixture(), handler = createIntegratedExecutionHandler(f.deps), save = vi.fn().mockRejectedValue(new Error('disk unavailable'));
    const report = await runIntegratedExecutionPlan(f.plan, { accessToken: 'synthetic-token', publishableKey: 'synthetic-key', fetch: (url, init) => handler(new Request(url, init)), save, now: () => time });
    expect(report.stopped).toBe(true); expect(report.rows[0].status).toBe('requires_reconciliation_no_retry');
  });
});
