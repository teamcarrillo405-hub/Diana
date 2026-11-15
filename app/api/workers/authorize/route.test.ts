import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
const authorize = vi.hoisted(() => vi.fn());
vi.mock('@/lib/worker-tier/worker-execution-server', async importOriginal => ({ ...await importOriginal<typeof import('@/lib/worker-tier/worker-execution-server')>(), authorizeWorkerExecution: authorize }));
vi.mock('@/lib/supabase/ai-service', () => ({ createAiServiceClient: () => ({}) }));
const request=(token='worker-token')=>new Request('http://diana.test/api/workers/authorize',{method:'POST',headers:{authorization:`Bearer ${token}`},body:JSON.stringify({traceId:'dw-1',workerId:'worker-a',capability:'a'.repeat(64)})});
beforeEach(()=>{vi.stubEnv('WORKER_API_TOKEN','worker-token');authorize.mockReset().mockResolvedValue({input:{transcript:'Synthetic owned input'},expiresAt:'2099-01-01',timeoutMs:30000});});
afterEach(()=>vi.unstubAllEnvs());
describe('worker authorize route',()=>{
 it('requires bearer before capability processing',async()=>{expect((await POST(request('bad'))).status).toBe(401);expect(authorize).not.toHaveBeenCalled();});
 it('returns a no-store permit after the server boundary completes',async()=>{const response=await POST(request());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(await response.json()).toMatchObject({ok:true,permit:{input:{transcript:'Synthetic owned input'}}});});
 it('never releases input when the server boundary fails',async()=>{authorize.mockRejectedValue(new Error('private payload'));const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).toBe('{"ok":false}');});
});
