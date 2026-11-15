import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ claim: vi.fn(), metrics: vi.fn(), service: vi.fn() }));
vi.mock('@/lib/worker-tier/worker-queue', () => ({ claimWorkerJob: mocks.claim }));
vi.mock('@/lib/supabase/ai-service', () => ({ createAiServiceClient: mocks.service }));
vi.mock('@/lib/worker-tier/worker-metrics', () => ({ getWorkerQueueMetrics: mocks.metrics, formatWorkerQueueMetricsPrometheus: () => 'synthetic 0' }));
vi.mock('@/lib/worker-tier/worker-execution-server', () => ({ issueWorkerExecution: vi.fn(), rejectWorkerClaim: vi.fn() }));
vi.mock('@/lib/assignment-help/study-buddy-eligibility', () => ({ studyBuddyEligibility: vi.fn() }));
import { POST } from '@/app/api/workers/claim/route';
import { GET as metrics } from '@/app/api/workers/metrics/route';
import { GET as prometheus } from '@/app/api/workers/metrics/prometheus/route';
import { WINDOWS_WORKER_SMOKE_QUEUE } from './worker-api-auth';
const host = 'b'.repeat(64);
const headers = (token = host) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
describe('dedicated host credential route boundaries', () => {
  beforeEach(() => {
    vi.stubEnv('WORKER_API_TOKEN', 'legacy-secret'); vi.stubEnv('DIANA_WINDOWS_WORKER_API_TOKEN', host);
    vi.clearAllMocks(); mocks.service.mockReturnValue({}); mocks.claim.mockResolvedValue(null); mocks.metrics.mockResolvedValue({});
  });
  afterEach(() => vi.unstubAllEnvs());
  it.each([undefined, 'student-ai-candidate', 'student-ai-candidate-smoke-other'])('rejects host claims outside its exact queue before service IO: %s', async queueName => {
    const response = await POST(new Request('http://unit.test/api/workers/claim', { method: 'POST', headers: headers(), body: JSON.stringify({ queueName, workerId: 'host-1' }) }));
    expect(response.status).toBe(403); expect(mocks.claim).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled();
  });
  it('allows its empty smoke queue and retains the legacy default', async () => {
    for (const [token, queueName] of [[host, WINDOWS_WORKER_SMOKE_QUEUE], ['legacy-secret', undefined]] as const) {
      const response = await POST(new Request('http://unit.test/api/workers/claim', { method: 'POST', headers: headers(token), body: JSON.stringify({ queueName, workerId: 'host-1' }) }));
      expect(response.status).toBe(200); expect(await response.json()).toEqual({ ok: true, job: null });
    }
    expect(mocks.claim.mock.calls.map(([call]) => call.queueName)).toEqual([WINDOWS_WORKER_SMOKE_QUEUE, 'student-ai-candidate']);
  });
  it.each([metrics, prometheus])('defaults host health to smoke metrics and rejects production metrics', async route => {
    expect((await route(new Request('http://unit.test/api/workers/metrics', { headers: headers() }))).status).toBe(200);
    expect(mocks.metrics).toHaveBeenCalledWith(expect.objectContaining({ queueName: WINDOWS_WORKER_SMOKE_QUEUE }));
    mocks.metrics.mockClear();
    expect((await route(new Request('http://unit.test/api/workers/metrics?queueName=student-ai-candidate', { headers: headers() }))).status).toBe(403);
    expect(mocks.metrics).not.toHaveBeenCalled();
  });
  it('returns 401 before any backend call when host credential is absent on server', async () => {
    vi.stubEnv('DIANA_WINDOWS_WORKER_API_TOKEN', '');
    expect((await POST(new Request('http://unit.test/api/workers/claim', { method: 'POST', headers: headers(), body: '{}' }))).status).toBe(401);
    expect(mocks.service).not.toHaveBeenCalled();
  });
});
