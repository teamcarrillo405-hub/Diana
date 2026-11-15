import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { authorizeTodayAcademicScope, recordTodayAcademicAssistance } from './today-assistance';
import type { StudyBuddyAssistanceClient } from './study-buddy-assistance';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const input = { ownerId: id(1), assignmentId: id(2), surface: 'today-complex' as const, callId: 'call-1', recipe: { question: 'Explain this slope.', model: 'existing-model', maxOutputTokens: 700 } };

function database(options: { consent?: boolean; age?: string; deletion?: string; assignment?: boolean; policy?: string; override?: string; course?: boolean } = {}) {
  const queries: { table: string; filters: Record<string, unknown> }[] = [];
  const receipts = new Map<string, unknown>();
  const rpc = vi.fn<StudyBuddyAssistanceClient['rpc']>(async (_name, args) => {
    const receipt = { schemaVersion: 'assignment-assistance-v1', scope: 'assignment', ownerId: id(1), assignmentId: args.p_assignment,
      requestId: args.p_request, payloadSha256: args.p_payload_sha256, channel: args.p_channel, kind: args.p_kind,
      selectedProblemId: args.p_selected_problem, independenceBlocked: true, recordedAt: '2026-09-29T05:00:00Z' };
    const prior = receipts.get(args.p_request);
    if (prior && JSON.stringify(prior) !== JSON.stringify(receipt)) return { data: null, error: { code: '23505' } };
    receipts.set(args.p_request, receipt);
    return { data: receipt, error: null };
  });
  const client = {
    rpc,
    from(table: string) {
      const query = { table, filters: {} as Record<string, unknown> }; queries.push(query);
      const chain = {
        select: () => chain, not: () => chain, limit: () => chain,
        eq: (key: string, value: unknown) => { query.filters[key] = value; return chain; },
        maybeSingle: async () => {
          if (table === 'profiles') return { data: { consent_ai: options.consent ?? true, age_bracket: options.age ?? 'adult' }, error: null };
          if (table === 'data_deletion_requests') return { data: options.deletion ? { status: options.deletion } : null, error: null };
          if (table === 'assignments') return { data: options.assignment === false ? null : { class_id: id(3), ai_mode_override: options.override ?? null }, error: null };
          if (table === 'classes') return { data: options.course === false ? null : { ai_mode: options.policy ?? 'green' }, error: null };
          throw new Error('Unexpected table');
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as Parameters<typeof authorizeTodayAcademicScope>[0] & StudyBuddyAssistanceClient, queries, rpc, receipts };
}

beforeEach(() => vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true'));
afterEach(() => vi.unstubAllEnvs());

describe('Today explicit academic scope boundary', () => {
  it('keeps a general question unscoped even when a Next Move is supplied', async () => {
    const db = database();
    const assignmentId = await authorizeTodayAcademicScope(db.client, id(1), { nextMove: { id: id(2) }, question: 'Explain slopes' });
    expect(assignmentId).toBeNull();
    await recordTodayAcademicAssistance(db.client, { ...input, assignmentId });
    expect(db.queries.map(query => query.table)).toEqual(['profiles', 'data_deletion_requests']);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it.each([null, [], { assignmentId: 'a-1' }, { assignmentId: 9 }])('rejects malformed explicit scope %j before querying', async raw => {
    const db = database();
    await expect(authorizeTodayAcademicScope(db.client, id(1), raw)).rejects.toMatchObject({ status: 400 });
    expect(db.queries).toEqual([]);
  });

  it('verifies owner-filtered assignment and class policy using actual rows', async () => {
    const db = database();
    expect(await authorizeTodayAcademicScope(db.client, id(1), { assignmentId: id(2) })).toBe(id(2));
    expect(db.queries.find(query => query.table === 'assignments')?.filters).toEqual({ id: id(2), owner_id: id(1) });
    expect(db.queries.find(query => query.table === 'classes')?.filters).toEqual({ id: id(3), owner_id: id(1) });
  });

  it.each([
    [{ assignment: false }, 404], [{ course: false }, 404], [{ policy: 'red' }, 403], [{ policy: 'yellow' }, 403],
    [{ override: 'red' }, 403], [{ consent: false }, 403], [{ deletion: 'requested' }, 403], [{ age: 'under_13' }, 403],
  ] as const)('blocks disallowed real-row eligibility %j', async (options, status) => {
    const db = database(options);
    await expect(authorizeTodayAcademicScope(db.client, id(1), { assignmentId: id(2) })).rejects.toMatchObject({ status });
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('records whole assignment assistance and blocks payload changes under a stable call identity', async () => {
    const db = database();
    const key = await recordTodayAcademicAssistance(db.client, input);
    expect(await recordTodayAcademicAssistance(db.client, input)).toBe(key);
    expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_assignment: id(2), p_channel: 'api', p_kind: 'guide', p_selected_problem: null });
    await expect(recordTodayAcademicAssistance(db.client, { ...input, recipe: { ...input.recipe, question: 'Another question' } })).rejects.toThrow('assistance_receipt_unavailable');
    await expect(recordTodayAcademicAssistance(db.client, { ...input, assignmentId: id(4) })).rejects.toThrow('assistance_receipt_unavailable');
    expect(db.receipts.size).toBe(1);
  });

  it('awaits the actual receipt RPC and fails closed on errors', async () => {
    const db = database();
    let resolve!: (value: Awaited<ReturnType<StudyBuddyAssistanceClient['rpc']>>) => void;
    const pending = new Promise<Awaited<ReturnType<StudyBuddyAssistanceClient['rpc']>>>(done => { resolve = done; });
    const entered = Promise.withResolvers<void>();
    db.rpc.mockImplementationOnce(() => { entered.resolve(); return pending; });
    const released = vi.fn();
    const running = recordTodayAcademicAssistance(db.client, input).then(released);
    await entered.promise;
    expect(released).not.toHaveBeenCalled();
    resolve({ data: null, error: { code: 'PGRST202' } });
    await expect(running).rejects.toThrow('assistance_receipt_unavailable');
    expect(released).not.toHaveBeenCalled();
  });

  it('keeps the existing disabled rollout inactive', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', undefined);
    const db = database();
    await recordTodayAcademicAssistance(db.client, input);
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
