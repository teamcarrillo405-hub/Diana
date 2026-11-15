import { afterEach, describe, expect, it, vi } from 'vitest';
import { runOneDianaWorkerCycle, type DianaWorkerConfig } from './worker-runner';
import { DianaVoiceProviderError } from '@/lib/integrations/diana-voice-sidecar';
const config: DianaWorkerConfig = { baseUrl: 'http://diana.test', token: 'worker-token', workerId: 'worker-a', queueName: 'student-ai-candidate', leaseSeconds: 60 };
const identity = { traceId: 'dw-1', workerId: 'worker-a', capability: 'a'.repeat(64) };
const claim = () => new Response(JSON.stringify({ ok: true, job: { ...identity, tenantId: 'personal:student', expiresAt: new Date(Date.now()+60000).toISOString() } }));
const permit = () => new Response(JSON.stringify({ ok: true, permit: { input: { transcript: 'Help me start this problem.', source: 'typed' }, timeoutMs: 30000, expiresAt: new Date(Date.now()+60000).toISOString() } }));
const result = { response: 'What do you know already?', trace: { provider: 'openjarvis', model: 'local-model' } };
afterEach(() => vi.unstubAllEnvs());
describe('credential-free worker execution', () => {
  it('authorizes before provider and sends its job capability to server completion without DB credentials', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', ''); vi.stubEnv('OPENAI_API_KEY', '');
    const events: string[] = [];
    const fetchImpl = vi.fn(async (url: unknown) => { const path = new URL(String(url)).pathname; events.push(path); return path.endsWith('claim') ? claim() : path.endsWith('authorize') ? permit() : new Response('{}'); });
    const provider = vi.fn(async () => { events.push('provider'); return result as never; });
    const cycle = await runOneDianaWorkerCycle({ config, fetchImpl, executeVoiceCandidate: provider });
    expect(cycle.status).toBe('completed');
    expect(events).toEqual(['/api/workers/claim','/api/workers/authorize','provider','/api/workers/complete']);
    const calls = fetchImpl.mock.calls as unknown as Array<[URL, RequestInit]>;
    expect(JSON.parse(String(calls[1][1].body))).toEqual(identity);
    expect(JSON.parse(String(calls[2][1].body))).toMatchObject({ ...identity, status: 'succeeded', result: { response: result.response } });
  });
  it.each([403,409,503])('never dispatches after authorization status %s', async status => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(claim()).mockResolvedValueOnce(new Response('{}',{status}));
    const provider = vi.fn();
    expect((await runOneDianaWorkerCycle({ config, fetchImpl, executeVoiceCandidate: provider })).status).toBe('error');
    expect(provider).not.toHaveBeenCalled(); expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('does not dispatch an expired permit', async () => {
    const body = await permit().json(); body.permit.expiresAt = '2000-01-01T00:00:00Z';
    const fetchImpl = vi.fn().mockResolvedValueOnce(claim()).mockResolvedValueOnce(new Response(JSON.stringify(body)));
    const provider = vi.fn(); await runOneDianaWorkerCycle({ config, fetchImpl, executeVoiceCandidate: provider });
    expect(provider).not.toHaveBeenCalled();
  });
  it('reports a provider error through the same capability so the server conservatively settles', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(claim()).mockResolvedValueOnce(permit()).mockResolvedValueOnce(new Response('{}'));
    const cycle = await runOneDianaWorkerCycle({ config, fetchImpl, executeVoiceCandidate: vi.fn().mockRejectedValue(new DianaVoiceProviderError('provider_http_error')) });
    expect(cycle).toMatchObject({ status: 'error', errorCode: 'provider_http_error' });
    expect(JSON.parse(fetchImpl.mock.calls[2][1].body)).toMatchObject({ ...identity, status: 'error', errorCode: 'provider_http_error' });
  });
  it('does not retry provider or replace completion after an ambiguous completion failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(claim()).mockResolvedValueOnce(permit()).mockResolvedValueOnce(new Response('{}',{status:503}));
    const provider = vi.fn().mockResolvedValue(result);
    expect(await runOneDianaWorkerCycle({ config, fetchImpl, executeVoiceCandidate: provider })).toMatchObject({ errorCode: 'worker_completion_unavailable' });
    expect(provider).toHaveBeenCalledTimes(1); expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
  it('is idle on a valid empty claim', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:true,job:null})));
    expect(await runOneDianaWorkerCycle({config,fetchImpl})).toEqual({status:'idle'});
  });
});
