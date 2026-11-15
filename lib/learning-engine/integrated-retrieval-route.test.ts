import { describe, it, expect, vi, afterEach } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ client: vi.fn(), getUser: vi.fn(), capture: vi.fn() }));
vi.mock('./server', () => ({ createLearningClient: mocks.client }));
vi.mock('./integrated-assignment-capture', () => ({ captureIntegratedAssignmentBatch: mocks.capture }));
import { POST } from '@/app/api/research/integrated-retrieval/route';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('isolated no-generation research route', () => {
  it('is default off before creating an auth client', async () => {
    vi.stubEnv('DIANA_INTEGRATED_RETRIEVAL_CAPTURE_ENABLED', '');
    expect((await POST(new Request('https://local.test', { method: 'POST', body: '[]' }))).status).toBe(404);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it.each([null, 'other'])('rejects unapproved operator %s before request parsing', async id => {
    vi.stubEnv('DIANA_INTEGRATED_RETRIEVAL_CAPTURE_ENABLED', 'true'); vi.stubEnv('DIANA_INTEGRATED_RETRIEVAL_OPERATOR_IDS', 'allowed');
    mocks.client.mockResolvedValue({ auth: { getUser: mocks.getUser } }); mocks.getUser.mockResolvedValue({ data: { user: id ? { id } : null }, error: null });
    expect((await POST(new Request('https://local.test', { method: 'POST', body: 'invalid' }))).status).toBe(403);
    expect(mocks.capture).not.toHaveBeenCalled();
  });
  it('uses the authenticated server client, refuses oversized bodies and disables caching', async () => {
    vi.stubEnv('DIANA_INTEGRATED_RETRIEVAL_CAPTURE_ENABLED', 'true'); vi.stubEnv('DIANA_INTEGRATED_RETRIEVAL_OPERATOR_IDS', 'allowed');
    const client = { auth: { getUser: mocks.getUser } }; mocks.client.mockResolvedValue(client);
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'allowed' } }, error: null }); mocks.capture.mockResolvedValue({ providerCalls: 0 });
    const success = await POST(new Request('https://local.test', { method: 'POST', body: '[]' }));
    expect(success.status).toBe(200); expect(success.headers.get('cache-control')).toBe('no-store'); expect(mocks.capture).toHaveBeenCalledWith(client, []);
    const rejected = await POST(new Request('https://local.test', { method: 'POST', body: 'x'.repeat(128_001) }));
    expect(rejected.status).toBe(400); expect(mocks.capture).toHaveBeenCalledTimes(1);
  });
});
