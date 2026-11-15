import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
const finish = vi.hoisted(() => vi.fn());
vi.mock('@/lib/worker-tier/worker-execution-server', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/worker-tier/worker-execution-server')>(), finishWorkerExecution: finish }));
vi.mock('@/lib/supabase/ai-service', () => ({ createAiServiceClient: () => ({}) }));
const request = (token = 'worker-token') => new Request('http://diana.test/api/workers/complete',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({traceId:'dw-1',workerId:'worker-a',capability:'a'.repeat(64)})});
beforeEach(() => { vi.stubEnv('WORKER_API_TOKEN','worker-token'); finish.mockReset().mockResolvedValue(undefined); });
afterEach(() => vi.unstubAllEnvs());
describe('worker completion route', () => {
  it('requires bearer before touching the capability boundary',async()=>{ expect((await POST(request('bad'))).status).toBe(401); expect(finish).not.toHaveBeenCalled(); });
  it('always delegates to server accounting and moderation boundary',async()=>{ const response=await POST(request()); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store'); expect(finish).toHaveBeenCalledTimes(1); });
  it('does not report success when settlement or audit fails',async()=>{ finish.mockRejectedValue(new Error('private DB content')); const response=await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private'); });
});
