import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { assignmentDispatchSnapshot, assignmentHelpDispatchKey, assignmentHelpRequestId } from './assignment-assistance-dispatch'

describe('assignment dispatch identity', () => {
  it('reuses canonical wire input identity and separates owners, routes and changed inputs', () => {
    const key = assignmentHelpDispatchKey('math-step', 'owner-a', { prompt: 'Help', assignmentId: 'one', unused: undefined })
    expect(assignmentHelpDispatchKey('math-step', 'owner-a', { assignmentId: 'one', prompt: 'Help' })).toBe(key)
    expect(assignmentHelpDispatchKey('math-step', 'owner-b', { assignmentId: 'one', prompt: 'Help' })).not.toBe(key)
    expect(assignmentHelpDispatchKey('writing-aid', 'owner-a', { assignmentId: 'one', prompt: 'Help' })).not.toBe(key)
    expect(assignmentHelpDispatchKey('math-step', 'owner-a', { assignmentId: 'one', prompt: 'Changed' })).not.toBe(key)
  })

  it('retains explicit request identity across changed payloads so the receipt can reject key reuse', () => {
    const first = assignmentHelpDispatchKey('assignment-review', 'owner', { source: 'v1' }, 'request')
    const second = assignmentHelpDispatchKey('assignment-review', 'owner', { source: 'v2' }, 'request')
    expect(second).toBe(first)
    expect(assignmentHelpRequestId(first)).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/)
    expect(assignmentHelpRequestId(second)).toBe(assignmentHelpRequestId(first))
  })

  it('snapshots nested mutable context before asynchronous receipt work', () => {
    const input = { sources: [{ text: 'original' }], optional: undefined }
    const snapshot = assignmentDispatchSnapshot(input)
    input.sources[0].text = 'changed'
    expect(snapshot).toEqual({ sources: [{ text: 'original' }] })
  })
})
