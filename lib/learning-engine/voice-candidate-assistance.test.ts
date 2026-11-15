import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { recordVoiceCandidateAssistance } from './voice-candidate-assistance'
import type { StudyBuddyAssistanceClient } from './study-buddy-assistance'
const ownerId = '11111111-1111-4111-8111-111111111111'
const assignmentId = '22222222-2222-4222-8222-222222222222'
const input = { ownerId, assignmentId, phase: 'dispatch' as const, key: 'stable-key', context: { transcript: 'Help me start.' } }
function database() {
  const digests = new Map<string, string>()
  return { rpc: vi.fn<StudyBuddyAssistanceClient['rpc']>(async (_name, args) => {
    if (digests.has(args.p_request) && digests.get(args.p_request) !== args.p_payload_sha256) return { data: null, error: 'conflict' }
    digests.set(args.p_request, args.p_payload_sha256)
    return { error: null, data: { schemaVersion: 'assignment-assistance-v1', scope: 'assignment',
      requestId: args.p_request, ownerId, assignmentId: args.p_assignment, selectedProblemId: null,
      payloadSha256: args.p_payload_sha256, channel: args.p_channel, kind: args.p_kind,
      recordedAt: '2026-09-29T02:00:00Z', independenceBlocked: true } }
  }) }
}
afterEach(() => vi.unstubAllEnvs())
describe('voice assistance receipt identity', () => {
  it('replays the same scoped dispatch and rejects changed content with the same key', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true'); const client = database()
    const first = await recordVoiceCandidateAssistance(client, input)
    expect(await recordVoiceCandidateAssistance(client, input)).toEqual(first)
    await expect(recordVoiceCandidateAssistance(client, { ...input, context: { transcript: 'Changed work' } })).rejects.toThrow('assistance_receipt_unavailable')
    expect(new Set(client.rpc.mock.calls.map(call => call[1].p_request)).size).toBe(1)
    expect(client.rpc.mock.calls[0][1]).toMatchObject({ p_assignment: assignmentId, p_channel: 'local', p_selected_problem: null })
  })
  it('separates dispatch and release without treating either as independent mastery', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true'); const client = database()
    await recordVoiceCandidateAssistance(client, input)
    const result = await recordVoiceCandidateAssistance(client, { ...input, phase: 'release', context: { response: 'A next step.' } })
    expect(client.rpc.mock.calls[0][1].p_request).not.toBe(client.rpc.mock.calls[1][1].p_request)
    expect(result?.status).toBe('recorded')
  })
  it('does not invent an assignment for general help or call the staged RPC when disabled', async () => {
    const client = database()
    expect(await recordVoiceCandidateAssistance(client, { ...input, assignmentId: null })).toBeNull()
    expect(await recordVoiceCandidateAssistance(client, input)).toEqual({ status: 'disabled', receipt: null })
    expect(client.rpc).not.toHaveBeenCalled()
  })
})
