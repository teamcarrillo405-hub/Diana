import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { recordStudyBuddyAssistance, type StudyBuddyAssistanceClient, type StudyBuddyAssistanceIdentity } from './study-buddy-assistance'
import { scopedAssistanceReceipt, verifiedAssignmentAssistanceReceipt, type AssignmentAssistanceReceipt } from './scoped-assistance-receipt'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const identity: StudyBuddyAssistanceIdentity = { ownerId: id(1), assignmentId: id(2), requestId: id(3), selectedProblemId: null, channel: 'local', kind: 'guide' }
const context = { messages: [{ role: 'user', content: 'Help me understand this assignment.' }],
  effectiveSystemPrompt: 'Use supplied evidence.', sourceVersions: ['a'.repeat(64)], assignmentContext: 'The whole assignment, including another problem.' }
function database() {
  const receipts = new Map<string, AssignmentAssistanceReceipt>()
  const rpc = vi.fn<StudyBuddyAssistanceClient['rpc']>(async (_name, args) => {
    const receipt: AssignmentAssistanceReceipt = { schemaVersion: 'assignment-assistance-v1', scope: 'assignment',
      requestId: args.p_request, ownerId: identity.ownerId, assignmentId: args.p_assignment, selectedProblemId: args.p_selected_problem,
      payloadSha256: args.p_payload_sha256, channel: args.p_channel, kind: args.p_kind,
      recordedAt: '2026-09-29T01:00:00.123456+00:00', independenceBlocked: true }
    const previous = receipts.get(receipt.requestId)
    if (previous && JSON.stringify(previous) !== JSON.stringify(receipt)) return { data: null, error: { code: '23505' } }
    receipts.set(receipt.requestId, receipt)
    return { data: receipt, error: null }
  })
  return { rpc, receipts }
}
beforeEach(() => { vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true'); vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network in helper')) })
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('Study Buddy assignment assistance before response release', () => {
  it('defaults to an inactive explicit result and makes no optional migration calls', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', undefined)
    const db = database()
    expect(await recordStudyBuddyAssistance(db, identity, context)).toEqual({ status: 'disabled', receipt: null })
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('records whole assignment scope even when a specific worksheet problem is selected', async () => {
    const db = database()
    const result = await recordStudyBuddyAssistance(db, { ...identity, selectedProblemId: id(4) }, context)
    expect(result).toMatchObject({ status: 'recorded', receipt: { scope: 'assignment', selectedProblemId: id(4), independenceBlocked: true } })
    const [name, args] = db.rpc.mock.calls[0]
    expect(name).toBe('learning_begin_assignment_assistance')
    expect(Object.keys(args).sort()).toEqual(['p_assignment', 'p_channel', 'p_kind', 'p_payload_sha256', 'p_request', 'p_selected_problem'])
    expect(args).not.toHaveProperty('p_owner')
    expect(JSON.stringify(args)).not.toContain(context.assignmentContext)
    expect(JSON.stringify(args)).not.toContain(context.messages[0].content)
  })

  it('retries the same bound request while rejecting content, scope and configuration shifts', async () => {
    const db = database()
    const first = await recordStudyBuddyAssistance(db, identity, context)
    expect(await recordStudyBuddyAssistance(db, identity, { ...context })).toEqual(first)
    for (const change of [{ messages: [{ role: 'user', content: 'Give me the final answer.' }] },
      { sourceVersions: ['b'.repeat(64)] }, { effectiveSystemPrompt: 'Different configuration' }]) {
      await expect(recordStudyBuddyAssistance(db, identity, { ...context, ...change })).rejects.toThrow('assistance_receipt_unavailable')
    }
    for (const change of [{ selectedProblemId: id(4) }, { assignmentId: id(5) }, { channel: 'api' as const }, { kind: 'hint' as const }]) {
      await expect(recordStudyBuddyAssistance(db, { ...identity, ...change }, context)).rejects.toThrow('assistance_receipt_unavailable')
    }
    expect(db.receipts.size).toBe(1)
  })

  it('waits for the committed receipt before a caller can release content', async () => {
    const db = database(), release = vi.fn()
    let resolve!: (value: Awaited<ReturnType<StudyBuddyAssistanceClient['rpc']>>) => void
    const held = new Promise<Awaited<ReturnType<StudyBuddyAssistanceClient['rpc']>>>(done => { resolve = done })
    const client: StudyBuddyAssistanceClient = { rpc: async (name, args) => {
      const result = await db.rpc(name, args)
      queueMicrotask(() => resolve(result))
      expect(release).not.toHaveBeenCalled()
      return held
    } }
    const guarded = async () => { await recordStudyBuddyAssistance(client, identity, context); release() }
    await guarded()
    expect(release).toHaveBeenCalledOnce()
  })

  it('blocks release on missing migration, RPC rejection, malformed receipt or foreign owner', async () => {
    for (const data of [null, { schemaVersion: 'task-assistance-v1' }, { schemaVersion: 'assignment-assistance-v1', independenceBlocked: false }]) {
      const release = vi.fn(), db = database(); db.rpc.mockResolvedValueOnce({ data, error: null })
      await expect((async () => { await recordStudyBuddyAssistance(db, identity, context); release() })()).rejects.toThrow('assistance_receipt_unavailable')
      expect(release).not.toHaveBeenCalled()
    }
    const absent = database(); absent.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Private database content' } })
    await expect(recordStudyBuddyAssistance(absent, identity, context)).rejects.toThrow(/^assistance_receipt_unavailable$/)
    const throwing = database(); throwing.rpc.mockRejectedValueOnce(new Error('Private source'))
    await expect(recordStudyBuddyAssistance(throwing, identity, context)).rejects.toThrow(/^assistance_receipt_unavailable$/)
    await expect(recordStudyBuddyAssistance(database(), { ...identity, ownerId: id(99) }, context)).rejects.toThrow('assistance_receipt_unavailable')
  })

  it('rejects ambiguous serialization, extra authority fields and oversized context before RPC', async () => {
    for (const value of [undefined, { missing: undefined }, { value: NaN }, { value: Infinity }, { value: -0 }, new Date(), [, 'hole'], 'x'.repeat(1_000_001)]) {
      const db = database()
      await expect(recordStudyBuddyAssistance(db, identity, value)).rejects.toThrow()
      expect(db.rpc).not.toHaveBeenCalled()
    }
    await expect(recordStudyBuddyAssistance(database(), { ...identity, scope: 'task' } as StudyBuddyAssistanceIdentity, context)).rejects.toThrow()
  })

  it('preserves distinct receipt scope and binds every assignment field', async () => {
    const result = await recordStudyBuddyAssistance(database(), identity, context)
    if (result.status !== 'recorded') throw new Error('fixture')
    const { schemaVersion: _version, recordedAt: _time, independenceBlocked: _blocked, ...expected } = result.receipt
    expect(scopedAssistanceReceipt(result.receipt).scope).toBe('assignment')
    expect(scopedAssistanceReceipt({ schemaVersion: 'task-assistance-v1', requestId: id(3), ownerId: id(1),
      assignmentId: id(2), taskId: id(4), sourceVersionId: null, sourceSnapshotSha256: 'd'.repeat(64),
      channel: 'local', kind: 'guide', recordedAt: result.receipt.recordedAt, independenceBlocked: true }).scope).toBe('task')
    for (const [field, value] of Object.entries({ scope: 'task', requestId: id(99), ownerId: id(99), assignmentId: id(99),
      selectedProblemId: id(99), payloadSha256: 'c'.repeat(64), channel: 'api', kind: 'hint', independenceBlocked: false })) {
      expect(() => verifiedAssignmentAssistanceReceipt({ ...result.receipt, [field]: value }, expected)).toThrow()
    }
  })
})
