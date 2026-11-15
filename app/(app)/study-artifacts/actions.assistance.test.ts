import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const mocks = vi.hoisted(() => ({ client: vi.fn(), kernel: vi.fn(), receipt: vi.fn(), invoke: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }))
vi.mock('@/lib/assignment-help/server-understanding', () => ({ loadAssignmentHomeworkKernel: mocks.kernel,
  formatHomeworkKernelForTutor: () => '', homeworkAuthorshipMetadata: () => ({}) }))
vi.mock('@/lib/learning-engine/study-buddy-assistance', () => ({ recordAssignmentAssistance: mocks.receipt }))
import { generateStudyArtifact } from './actions'

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const assignmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const noteId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const input = { sourceType: 'note' as const, sourceId: noteId, artifactType: 'study_guide' as const, studyMode: 'guided_steps' as const }

describe('local study artifact assistance boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('QA_CREATE_USER', 'true')
    vi.stubEnv('NODE_ENV', 'test')
    const note = { id: noteId, owner_id: ownerId, title: 'Lesson notes', body_text: 'Plants use light energy to produce sugars during photosynthesis.',
      transcript_text: null, outline_json: null, class_id: null, assignment_id: assignmentId }
    const chain = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: note }) }
    chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain)
    mocks.from.mockReturnValue(chain)
    mocks.client.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: ownerId } } }) },
      from: mocks.from, functions: { invoke: mocks.invoke } })
    mocks.kernel.mockResolvedValue({ trustDecision: { allowed: true, aiMode: 'green' } })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('cannot persist or release a QA artifact before its linked assignment receipt', async () => {
    let reject!: (reason: Error) => void
    mocks.receipt.mockImplementation(() => new Promise((_resolve, deny) => { reject = deny }))
    let settled = false
    const pending = generateStudyArtifact(input).then(result => { settled = true; return result })
    await vi.waitFor(() => expect(mocks.receipt).toHaveBeenCalledOnce())
    expect(settled).toBe(false)
    expect(mocks.receipt.mock.calls[0][1]).toMatchObject({ ownerId, assignmentId, channel: 'local', kind: 'guide' })
    expect(mocks.receipt.mock.calls[0][2]).toHaveProperty('artifact')
    expect(mocks.from).not.toHaveBeenCalledWith('study_artifacts')
    reject(new Error('assistance_receipt_unavailable'))
    expect(await pending).toMatchObject({ ok: false })
    expect(mocks.from).not.toHaveBeenCalledWith('study_artifacts')
    expect(mocks.invoke).not.toHaveBeenCalled()
  })

  it('checks a note-linked assignment policy before producing QA support', async () => {
    mocks.kernel.mockResolvedValue({ trustDecision: { allowed: false, aiMode: 'red' } })
    expect(await generateStudyArtifact(input)).toMatchObject({ ok: false })
    expect(mocks.receipt).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalledWith('study_artifacts')
  })

  it('forwards verified note and assignment identity with stable provider request keys', async () => {
    vi.stubEnv('QA_CREATE_USER', 'false')
    mocks.invoke.mockResolvedValue({ data: { error: 'unavailable' }, error: null })
    await generateStudyArtifact(input)
    await generateStudyArtifact(input)
    expect(mocks.invoke.mock.calls[0][1].body).toMatchObject({ ownerId, assignmentId, noteId, sourceId: noteId })
    expect(mocks.invoke.mock.calls[1][1].body.idempotencyKey).toBe(mocks.invoke.mock.calls[0][1].body.idempotencyKey)
    expect(mocks.receipt).not.toHaveBeenCalled()
  })
})
