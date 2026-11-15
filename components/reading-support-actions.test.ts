import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ client: vi.fn(), kernel: vi.fn(), receipt: vi.fn(), invoke: vi.fn(), source: vi.fn(), eligibility: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }))
vi.mock('@/lib/assignment-help/server-understanding', () => ({ loadAssignmentHomeworkKernel: mocks.kernel }))
vi.mock('@/lib/assignment-help/study-buddy-eligibility', () => ({ studyBuddyEligibility: mocks.eligibility }))
vi.mock('@/lib/learning-engine/study-buddy-assistance', () => ({ recordAssignmentAssistance: mocks.receipt }))
import { adaptReadingLevel } from './reading-support-actions'

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const assignmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const noteId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const input = { text: 'A long sentence explains the first step. A second sentence gives more detail.', target: 'simpler' as const, aiMode: 'green' as const,
  source: { sourceType: 'note' as const, sourceId: noteId } }

describe('reading support assignment provenance', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const chain = { select: vi.fn(), eq: vi.fn(), single: mocks.source }
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain)
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: ownerId } } }) },
      from: () => chain, functions: { invoke: mocks.invoke } })
    mocks.source.mockResolvedValue({ data: { id: noteId, owner_id: ownerId, class_id: null, assignment_id: assignmentId } })
    mocks.kernel.mockResolvedValue({ trustDecision: { allowed: true, aiMode: 'green' } })
    mocks.eligibility.mockResolvedValue({ ok: true, classId: null })
    mocks.invoke.mockResolvedValue({ data: null, error: new Error('provider unavailable') })
    mocks.receipt.mockResolvedValue({ status: 'disabled', receipt: null })
  })

  it('resolves a note assignment on the server and forwards its scope to Edge', async () => {
    mocks.invoke.mockResolvedValue({ data: { text: 'Simplified passage.' }, error: null })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: true, text: 'Simplified passage.', fallback: false })
    expect(mocks.kernel).toHaveBeenCalledWith(expect.objectContaining({ ownerId, assignmentId }))
    expect(mocks.invoke).toHaveBeenCalledWith('reading-level', { body: expect.objectContaining({ ownerId, assignmentId, noteId,
      idempotencyKey: expect.stringMatching(/^reading-level:/) }) })
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('holds a linked local fallback until the receipt commits', async () => {
    let release!: (value: unknown) => void
    mocks.receipt.mockImplementation(() => new Promise(resolve => { release = resolve }))
    let settled = false
    const pending = adaptReadingLevel(input).then(result => { settled = true; return result })
    await vi.waitFor(() => expect(mocks.receipt).toHaveBeenCalledOnce())
    expect(settled).toBe(false)
    expect(mocks.receipt.mock.calls[0][1]).toMatchObject({ ownerId, assignmentId, channel: 'local', kind: 'guide' })
    release({ status: 'disabled', receipt: null })
    expect(await pending).toMatchObject({ ok: true, fallback: true })
  })

  it('does not leak fallback content after receipt failure or malformed Edge output', async () => {
    mocks.invoke.mockResolvedValue({ data: { text: '' }, error: null })
    mocks.receipt.mockRejectedValue(new Error('private database detail'))
    expect(await adaptReadingLevel(input)).toEqual({ ok: false, error: 'Reading support is unavailable right now. Your original text is still here.' })
  })

  it('rejects foreign source ownership before Edge and before fallback', async () => {
    mocks.source.mockResolvedValue({ data: { id: noteId, owner_id: 'other', assignment_id: assignmentId } })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('respects resolved assignment policy even when the client asks for green help', async () => {
    mocks.kernel.mockResolvedValue({ trustDecision: { allowed: false, aiMode: 'red' } })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it.each([403, 503])('blocks reading and local fallback after account eligibility returns %i', async status => {
    mocks.eligibility.mockResolvedValue({ ok: false, status, error: 'Study help unavailable.' })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.eligibility).toHaveBeenCalledWith(expect.anything(), { ownerId, assignmentId, classId: null })
    expect(mocks.kernel).not.toHaveBeenCalled()
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('preserves a legitimate unscoped local fallback without fabricating an assignment', async () => {
    const { source: _source, ...generic } = input
    expect(await adaptReadingLevel(generic)).toMatchObject({ ok: true, fallback: true })
    expect(mocks.invoke.mock.calls[0][1].body).toMatchObject({ assignmentId: null, noteId: null })
    expect(mocks.receipt).not.toHaveBeenCalled()
    expect(mocks.source).not.toHaveBeenCalled()
  })

  it.each([401, 403, 409, 429, 500, 503])('never turns an explicit Edge %i denial into local help', async status => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(null, { status }) } })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('withholds help when authoritative account status cannot be checked', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ error: 'authorization_unavailable' }), { status: 503 }) } })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('withholds fallback after an explicit structured Edge error', async () => {
    mocks.invoke.mockResolvedValue({ data: { error: 'policy_unavailable' }, error: null })
    expect(await adaptReadingLevel(input)).toMatchObject({ ok: false })
    expect(mocks.receipt).not.toHaveBeenCalled()
  })
})
