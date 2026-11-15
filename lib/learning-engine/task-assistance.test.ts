import { describe, expect, it } from 'vitest'
import { taskAssistanceRpcArguments, verifiedTaskAssistanceReceipt, type TaskAssistanceScope } from './task-assistance'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const scope: TaskAssistanceScope = {
  requestId: id(1), taskId: id(2), ownerId: id(3), assignmentId: id(4),
  sourceVersionId: 'a'.repeat(64), sourceSnapshotSha256: 'b'.repeat(64), channel: 'local', kind: 'hint',
}
const receipt = { ...scope, schemaVersion: 'task-assistance-v1', recordedAt: '2026-09-29T01:00:00.123456+00:00', independenceBlocked: true }

describe('durable task assistance receipt boundary', () => {
  it('accepts a committed scope match, including pre-index worksheet help', () => {
    expect(verifiedTaskAssistanceReceipt(receipt, scope)).toEqual(receipt)
    expect(verifiedTaskAssistanceReceipt({ ...receipt, sourceVersionId: null }, { ...scope, sourceVersionId: null }).sourceVersionId).toBeNull()
  })
  it.each(Object.keys(scope) as (keyof TaskAssistanceScope)[])('rejects another %s even when its receipt is well formed', key => {
    const changed = key === 'channel' ? 'api' : key === 'kind' ? 'guide'
      : key === 'sourceVersionId' || key === 'sourceSnapshotSha256' ? 'c'.repeat(64) : id(99)
    expect(() => verifiedTaskAssistanceReceipt({ ...receipt, [key]: changed }, scope)).toThrow(/scope mismatch/)
  })
  it('rejects unsupported, incomplete, nonblocking and extra-field receipts', () => {
    for (const patch of [{ schemaVersion: 'future' }, { independenceBlocked: false }, { recordedAt: 'today' },
      { sourceSnapshotSha256: 'x' }, { requestId: undefined }, { modelOutput: 'not part of this contract' }]) {
      expect(() => verifiedTaskAssistanceReceipt({ ...receipt, ...patch }, scope)).toThrow()
    }
  })
  it('constructs the exact SQL RPC fields and does not silently drop injected fields', () => {
    expect(taskAssistanceRpcArguments(scope)).toEqual({ p_owner: id(3), p_assignment: id(4), p_task: id(2), p_request: id(1),
      p_source_version: 'a'.repeat(64), p_source_snapshot_sha256: 'b'.repeat(64), p_channel: 'local', p_kind: 'hint' })
    expect(() => taskAssistanceRpcArguments({ ...scope, independenceBlocked: false } as TaskAssistanceScope)).toThrow()
  })
})
