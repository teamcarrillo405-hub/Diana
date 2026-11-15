import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearningDatabase } from './database';
import { structureDocument } from './curriculum';
import { captureIntegratedAssignmentRetrieval, captureIntegratedAssignmentBatch } from './integrated-assignment-capture';
import { integratedProviderBytesSha256 as sha256 } from './integrated-provider-response';
import { retrievalOnlyFetch, readPublicCaptureConfiguration } from '../../scripts/learning/integrated-assignment-capture';
import { runIntegratedMockDelivery } from './integrated-mock-delivery';
import { prepareIntegratedRequestPlan } from './integrated-request-plan';
const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002', course = '00000000-0000-4000-8000-000000000003';
async function fixture() {
  const document = await structureDocument({ documentId: 'opaque', ownerId: owner, assignmentId: assignment, classId: course,
    title: 'Opaque graph', edition: '1', subject: 'other', instructionRights: 'owner_provided' },
  [{ page: 1, pageLabel: 'P', text: 'alpha '.repeat(220), interpretation: 'confirmed' }]);
  const tables: Record<string, unknown> = {
    profiles: { age_bracket: 'adult', consent_ai: true }, data_deletion_requests: null,
    assignments: { class_id: course, ai_mode_override: null }, classes: { ai_mode: 'green' },
    learning_documents: [{ id: document.version.id, owner_id: owner, assignment_id: assignment, document_id: 'opaque', content_hash: document.version.contentHash, metadata: document.version, pages: document.pages }],
    learning_blocks: document.blocks.map(payload => ({ payload })), learning_chunks: [],
  };
  const filters: unknown[][] = [];
  const from = vi.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'not', 'in', 'order', 'limit']) query[method] = (...args: unknown[]) => { filters.push([table, method, ...args]); return query; };
    query.maybeSingle = () => Promise.resolve({ data: tables[table], error: null });
    query.then = (resolve: (value: unknown) => void) => Promise.resolve({ data: tables[table], error: null }).then(resolve);
    return query;
  });
  const rpc = vi.fn(async () => ({ data: document.chunks.map((payload, index) => ({ payload, lexical_rank: index + 1, semantic_rank: null })), error: null }));
  const functions = { invoke: vi.fn().mockRejectedValue(new Error('No paid call')) };
  const auth = { getUser: vi.fn(async () => ({ data: { user: { id: owner } }, error: null })) };
  const client = { from, rpc, functions, auth } as unknown as SupabaseClient<LearningDatabase>;
  const input = { schema: 'integrated-assignment-retrieval-request-v1', caseId: 'opaque-1', expectedOwnerId: owner, assignmentId: assignment,
    query: 'alpha', versionPins: [{ id: document.version.id, contentHash: document.version.contentHash }] };
  return { client, tables, input, document, filters, rpc, functions, auth, from };
}
describe('authenticated integrated product retrieval capture', () => {
  it('reads only public config across CRLF, spaces, quotes, export and comments', () => {
    expect(readPublicCaptureConfiguration('\ufeffNEXT_PUBLIC_SUPABASE_URL = "https://return.supabase.co"\r\nexport NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=\'synthetic-rn-key\' # public\r\nSUPABASE_SERVICE_ROLE_KEY=secret\r\nQA_PASSWORD=secret')).toEqual({ NEXT_PUBLIC_SUPABASE_URL: 'https://return.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-rn-key' });
  });
  it('executes actual product retrieval and clipping through authenticated owned policy queries', async () => {
    const f = await fixture(); const out = await captureIntegratedAssignmentRetrieval(f.client, f.input);
    expect(out).toMatchObject({ status: 'matched', providerCalls: 0, assistanceReleased: false, authenticatedOwnerId: owner });
    if (out.kind !== 'retrieved') throw new Error('missing evidence');
    expect(out.actualPromptAnchors[0].exactText).toHaveLength(1000);
    expect(out.promptContext).toContain(JSON.stringify(out.actualPromptAnchors));
    expect(out.promptContextSha256).toBe(sha256(out.promptContext));
    const { captureSha256, ...body } = out; expect(captureSha256).toBe(sha256(JSON.stringify(body)));
    expect(f.filters).toContainEqual(['assignments', 'eq', 'owner_id', owner]);
    expect(f.filters).toContainEqual(['learning_documents', 'eq', 'assignment_id', assignment]);
    expect(f.rpc).toHaveBeenCalledWith('learning_search', expect.not.objectContaining({ p_embedding: expect.anything() }));
    expect(f.functions.invoke).not.toHaveBeenCalled();
  });
  it.each(['auth', 'owner', 'consent', 'deletion', 'assignment', 'class'])('rejects %s before retrieval', async kind => {
    const f = await fixture();
    if (kind === 'auth') f.auth.getUser.mockResolvedValue({ data: { user: { id: owner } }, error: 'rejected' } as never);
    if (kind === 'owner') f.input.expectedOwnerId = course;
    if (kind === 'consent') f.tables.profiles = { age_bracket: 'adult', consent_ai: false };
    if (kind === 'deletion') f.tables.data_deletion_requests = { status: 'pending' };
    if (kind === 'assignment') f.tables.assignments = null;
    if (kind === 'class') f.tables.classes = { ai_mode: 'red' };
    expect(await captureIntegratedAssignmentRetrieval(f.client, f.input)).toMatchObject({ status: expect.stringMatching(/rejected$/), providerCalls: 0 });
    expect(f.from).not.toHaveBeenCalledWith('learning_documents'); expect(f.rpc).not.toHaveBeenCalled();
  });
  it.each(['missing', 'changed'])('rejects %s frozen version', async kind => {
    const f = await fixture(); if (kind === 'missing') f.input.versionPins[0].id = 'absent'; else f.input.versionPins[0].contentHash = 'f'.repeat(64);
    expect(await captureIntegratedAssignmentRetrieval(f.client, f.input)).toMatchObject({ status: 'version_rejected' });
  });
  it('retries empty natural-language AND search without directive words and retains all subject terms', async () => {
    const f = await fixture(); f.input.query = 'Explain alpha beta'; const lexical = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (...args: unknown[]) => (args[1] as { p_query: string }).p_query === 'Explain alpha beta' ? { data: [], error: null } : lexical());
    const out = await captureIntegratedAssignmentRetrieval(f.client, f.input);
    expect(out.status).toBe('matched'); expect(f.rpc).toHaveBeenCalledTimes(2);
    expect(f.rpc).toHaveBeenLastCalledWith('learning_search', { p_assignment: assignment, p_versions: [f.document.version.id], p_query: 'alpha beta' });
    expect(out.trace.filter(event => event.stage === 'lexical_query')).toHaveLength(2);
    expect(f.functions.invoke).not.toHaveBeenCalled();
  });
  it('does not embed when no documents match and retains every terminal denominator', async () => {
    const f = await fixture(); f.tables.learning_documents = []; f.input.versionPins = [];
    const report = await captureIntegratedAssignmentBatch(f.client, [f.input, { ...f.input, caseId: 'other', expectedOwnerId: course }]);
    expect(report).toMatchObject({ planned: 2, completed: 2, rows: [{ status: 'no_evidence' }, { status: 'owner_rejected' }] });
    expect(f.functions.invoke).not.toHaveBeenCalled();
    await expect(captureIntegratedAssignmentBatch(f.client, [f.input, f.input])).rejects.toThrow('duplicate_case_id');
  });
  it.each(['https://other.test/rest/v1/profiles', 'https://db.test/functions/v1/learning-embed', 'https://db.test/functions/v1/study-buddy'])('transport blocks %s', async url => {
    const fetcher = vi.fn(); await expect(retrievalOnlyFetch('https://db.test', fetcher)(url)).rejects.toThrow('network_request_rejected'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('transport blocks semantic parameters and permits exact lexical request without redirects', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}')); const fetch = retrievalOnlyFetch('https://db.test', fetcher);
    await expect(fetch('https://db.test/rest/v1/rpc/learning_search', { method: 'POST', body: JSON.stringify({ p_embedding: '[]' }) })).rejects.toThrow('non_lexical_search_rejected');
    await fetch('https://db.test/rest/v1/rpc/learning_search', { method: 'POST', body: JSON.stringify({ p_assignment: assignment, p_versions: [], p_query: 'alpha' }) });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });
});

describe('integrated synthetic delivery boundary', () => {
  const config = { model: 'frozen-test-model', responseModel: 'frozen-test-model', requestId: '00000000-0000-4000-8000-000000000004' };
  it.each(['disabled', 'error', 'wrong_identity'])('does not invoke even mock transport when receipt is %s', async mode => {
    const f = await fixture(); const callback = vi.fn(); vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', mode === 'disabled' ? 'false' : 'true');
    const lexical = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (...args: unknown[]) => args[0] === 'learning_search' ? lexical() : ({ data: {}, error: mode === 'error' ? 'unavailable' : null }) as never);
    try { expect(await runIntegratedMockDelivery(f.client, f.input, config, callback)).toMatchObject({ delivered: false }); expect(callback).not.toHaveBeenCalled(); }
    finally { vi.unstubAllEnvs(); }
  });
  it('awaits verified receipt before synthetic capture, captures usage, and rejects truncated delivery', async () => {
    const f = await fixture(); vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true');
    const order: string[] = []; const lexical = f.rpc.getMockImplementation()!;
    f.rpc.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === 'learning_search') return lexical();
      await Promise.resolve(); order.push('receipt'); const p = args[1] as Record<string, string>;
      return { data: { schemaVersion: 'assignment-assistance-v1', scope: 'assignment', requestId: p.p_request, ownerId: owner,
        assignmentId: assignment, selectedProblemId: null, payloadSha256: p.p_payload_sha256, channel: 'local', kind: 'hint',
        recordedAt: new Date().toISOString(), independenceBlocked: true }, error: null } as never;
    });
    try {
      for (const status of ['completed', 'incomplete']) {
        const result = await runIntegratedMockDelivery(f.client, f.input, config, async requestBody => {
          expect(order.at(-1)).toBe('receipt'); order.push('mock');
          return { schema: 'integrated-openai-responses-capture-v1', endpoint: '/v1/responses', transport: 'http_json', requestBody,
            responseBody: JSON.stringify({ id: 'resp_synthetic', object: 'response', created_at: 1, model: config.model, status,
              error: null, incomplete_details: status === 'completed' ? null : { reason: 'max_output_tokens' }, usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
              output: [{ id: 'msg_test', type: 'message', role: 'assistant', status: status === 'completed' ? 'completed' : 'incomplete', content: [{ type: 'output_text', annotations: [], text: JSON.stringify({ title: 'T', main: 'M', reason: 'R', anchor: 'A', steps: ['a', 'b', 'c'] }) }] }] }),
            httpStatus: 200, providerRequestId: null, startedAt: '2026-09-29T00:00:00Z', receivedAt: '2026-09-29T00:00:01Z' };
        });
        expect(result).toMatchObject({ delivered: status === 'completed', providerCalls: 0, parsed: { usage: { totalTokens: 30 } } });
      }
    } finally { vi.unstubAllEnvs(); }
  });
});

describe('frozen request preparation from captured product rows', () => {
  async function preparedFixture() {
    const f = await fixture();
    const capture = { execution: 'authenticated_supabase_lexical_retrieval_no_generation', ...await captureIntegratedAssignmentBatch(f.client, [f.input, { ...f.input, caseId: 'denied', expectedOwnerId: course }]) };
    const digest = sha256(JSON.stringify(capture));
    const configuration = { schema: 'integrated-request-plan-configuration-v1', id: '00000000-0000-4000-8000-000000000005', model: 'frozen-test-model', expectedResponseModel: 'frozen-test-model', expectedCaseCount: 2, maxOutputTokens: 800, maxRequestBytes: 128_000, captureFileSha256: digest };
    return { capture, configuration, digest };
  }
  it('retains rejected cases in denominator and prepares exact primary request without granting authority', async () => {
    const f = await preparedFixture(); const plan = prepareIntegratedRequestPlan(f.capture, f.configuration, f.digest);
    expect(plan).toMatchObject({ planned: 2, preparedRequests: 1, notScheduled: 1, aggregateOutputTokenCeiling: 800, providerCalls: 0, dispatchAuthorized: false, executionAuthorityVerified: false });
    expect(plan.rows[0].request?.requestBody).toContain('Return a valid JSON object matching the requested structure.');
    expect(plan.rows[1]).toMatchObject({ status: 'not_scheduled', reason: 'owner_rejected', request: null });
  });
  it('preserves a real batch exception row through plan preparation and denominator validation', async () => {
    const f = await fixture(); f.auth.getUser.mockImplementationOnce(() => { throw new Error('synthetic client exception'); });
    const capture = { execution: 'authenticated_supabase_lexical_retrieval_no_generation', ...await captureIntegratedAssignmentBatch(f.client, [f.input, { ...f.input, caseId: 'second' }]) };
    const digest = sha256(JSON.stringify(capture));
    const configuration = { ...(await preparedFixture()).configuration, captureFileSha256: digest };
    const plan = prepareIntegratedRequestPlan(capture, configuration, digest);
    expect(plan).toMatchObject({ planned: 2, preparedRequests: 1, notScheduled: 1 });
    expect(plan.rows[0]).toMatchObject({ caseId: f.input.caseId, reason: 'capture_error', request: null });
  });
  it.each(['row', 'denominator', 'digest', 'input_hash', 'ceiling'])('rejects altered %s', async kind => {
    const f = await preparedFixture();
    if (kind === 'row') Object.assign(f.capture.rows[0], { promptContext: 'changed' });
    if (kind === 'denominator') f.configuration.expectedCaseCount = 3;
    if (kind === 'digest') f.digest = 'f'.repeat(64);
    if (kind === 'input_hash') f.capture.plannedInputsSha256 = 'f'.repeat(64);
    if (kind === 'ceiling') f.configuration.maxRequestBytes = 1;
    expect(() => prepareIntegratedRequestPlan(f.capture, f.configuration, f.digest)).toThrow();
  });
});
