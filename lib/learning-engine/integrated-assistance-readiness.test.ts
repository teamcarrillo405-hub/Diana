import { describe, expect, it, vi } from 'vitest';
import { readIntegratedAssistanceReadiness } from '@/supabase/functions/_shared/learning/integrated-assistance-readiness';

function client(data: unknown, error: unknown = null) {
  const maybeSingle = vi.fn(async () => ({ data, error }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { from, select, eq, maybeSingle };
}
describe('actual database assistance control preflight', () => {
  it.each([true, false])('reads exact singleton boolean %s through the supplied service client', async enforced => {
    const c = client({ singleton: true, enforced });
    expect(await readIntegratedAssistanceReadiness(c)).toBe(enforced ? 'ready' : 'staged');
    expect(c.from).toHaveBeenCalledExactlyOnceWith('learning_task_assistance_control');
    expect(c.select).toHaveBeenCalledExactlyOnceWith('singleton,enforced');
    expect(c.eq).toHaveBeenCalledExactlyOnceWith('singleton', true);
    expect(c.maybeSingle).toHaveBeenCalledOnce();
  });
  it.each([null, [], {}, { singleton: false, enforced: true }, { singleton: true, enforced: 'true' }, { singleton: true, enforced: null }])('rejects missing or malformed control %j', async data => {
    expect(await readIntegratedAssistanceReadiness(client(data))).toBe('unavailable');
  });
  it('fails closed on a database error even alongside a seemingly ready row', async () => {
    expect(await readIntegratedAssistanceReadiness(client({ singleton: true, enforced: true }, { code: '42501' }))).toBe('unavailable');
  });
  it('fails closed on a thrown transport error', async () => {
    const c = client(null); c.maybeSingle.mockRejectedValue(new Error('transport'));
    expect(await readIntegratedAssistanceReadiness(c)).toBe('unavailable');
  });
});
