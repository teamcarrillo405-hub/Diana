import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: { id: '00000000-0000-4000-8000-000000000001' } as { id: string } | null,
  mode: 'green', source: null as unknown, block: null as unknown, exercises: [] as unknown[], read: vi.fn(), save: vi.fn(), eq: vi.fn(), assistance: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/learning-engine/server', () => ({ learningAccess: async () => true, createLearningClient: async () => ({
  auth: { getUser: async () => ({ data: { user: mocks.user } }) }, rpc: async () => ({ data: mocks.exercises, error: null }),
  from: (table: string) => { const query = { select: () => query, eq: (...args: unknown[]) => { mocks.eq(...args); return query },
    maybeSingle: async () => ({ error: null, data: table === 'assignments' ? { class_id: '00000000-0000-4000-8000-000000000003', ai_mode_override: null }
      : table === 'classes' ? { ai_mode: mocks.mode } : table === 'learning_documents' ? mocks.source : { payload: mocks.block } }) }; return query },
}) }))
vi.mock('@/lib/learning-engine/problem-store', () => ({ readProblem: mocks.read, saveProblem: mocks.save }))
vi.mock('@/lib/learning-engine/study-buddy-assistance', () => ({ recordAssignmentAssistance: mocks.assistance }))
import { POST } from './route'
import { structureDocument } from '@/lib/learning-engine/curriculum'
import * as shadowRouter from '@/lib/learning-engine/capability-router'
const ownerId = '00000000-0000-4000-8000-000000000001', assignmentId = '00000000-0000-4000-8000-000000000002'
const classId = '00000000-0000-4000-8000-000000000003'
async function fixture() {
  const document = await structureDocument({ ownerId, assignmentId, classId, documentId: 'private-source', title: 'Private algebra',
    edition: '1', subject: 'math', instructionRights: 'owner_provided' },
  [{ page: 1, pageLabel: '1', text: 'Solve 3x+5=20 and explain the operation.', interpretation: 'original' }])
  mocks.source = { metadata: document.version, pages: document.pages }
  mocks.block = document.blocks[0]
  const exerciseId = document.blocks[0].id
  mocks.exercises = [{ id: exerciseId, version_id: document.version.id, skill_id: 'math.linear_equations',
    prompt: 'Solve 3x+5=20.', reviewed: false, practice_check: { kind: 'equation_value', reference: '3x+5=20' } }]
  return { recordId: '00000000-0000-4000-8000-000000000004', requestId: '00000000-0000-4000-8000-000000000005',
    expectedRevision: 0, assignmentId, exerciseId, versionId: document.version.id, mode: 'hint', response: 'Private student response', confirmed: true, modality: 'typed' }
}
const request = (body: unknown) => new Request('http://localhost/api/learning/tutor', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => { vi.clearAllMocks(); mocks.user = { id: ownerId }; mocks.mode = 'green'; mocks.read.mockResolvedValue(null); mocks.save.mockResolvedValue(undefined)
  mocks.assistance.mockResolvedValue({ status: 'disabled', receipt: null })
  vi.spyOn(console, 'info').mockImplementation(() => {}); vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No provider call')) })
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks() })

describe('local tutor shadow route integration', () => {
  it('withholds substantive local help when its assistance receipt cannot commit', async () => {
    mocks.assistance.mockRejectedValueOnce(new Error('assistance_receipt_unavailable'))
    const body = await fixture(), result = await POST(request(body))
    expect(result.status).toBe(503); expect((await result.json()).feedback).toBeUndefined()
    expect(mocks.assistance).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ownerId, assignmentId,
      requestId: body.requestId, selectedProblemId: null, channel: 'local', kind: 'hint' }), expect.objectContaining({ route: 'learning/tutor' }))
    expect(mocks.save).not.toHaveBeenCalled(); expect(console.info).not.toHaveBeenCalled()
  })

  it('awaits assistance commitment before saving or exposing feedback', async () => {
    let release!: () => void
    const entered = new Promise<void>(resolve => {
      mocks.assistance.mockImplementationOnce(() => { resolve(); return new Promise<void>(done => { release = done }) })
    })
    const pending = POST(request(await fixture())); await entered
    expect(mocks.save).not.toHaveBeenCalled()
    release(); expect((await pending).status).toBe(200)
    expect(mocks.save).toHaveBeenCalledOnce()
  })
  it('preserves feedback and increments assistance only once after one durable save', async () => {
    const body = await fixture()
    const result = await POST(request(body)), payload = await result.json()
    expect(result.status).toBe(200)
    expect(Object.keys(payload).sort()).toEqual(['feedback', 'state'])
    expect(payload.state.supportCount).toBe(1)
    expect(payload.feedback.assistance).toBe('hinted')
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', ownerId)
    expect(console.info).toHaveBeenCalledTimes(1)
    const receipt = JSON.parse(vi.mocked(console.info).mock.calls[0][1])
    // The current tutor still provides its hint; shadow routing notices an unparseable attempted answer.
    expect(receipt).toMatchObject({ adapter: 'local_tutor', route: 'review', reason: 'checker_unsupported', feedbackEqual: true, authoritative: false, providerCalled: false })
    const logged = JSON.stringify(vi.mocked(console.info).mock.calls)
    for (const secret of [body.response, body.exerciseId, body.versionId, ownerId, assignmentId, '3x+5=20']) expect(logged).not.toContain(secret)
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(console.info).mock.invocationCallOrder[0])
  })

  it('does not observe denied or unsuccessfully persisted requests', async () => {
    const body = await fixture()
    mocks.mode = 'yellow'
    expect((await POST(request(body))).status).toBe(403)
    mocks.mode = 'green'; mocks.save.mockRejectedValueOnce(new Error('store_unavailable'))
    expect((await POST(request(body))).status).toBe(503)
    expect(console.info).not.toHaveBeenCalled()
  })

  it('retains unconfirmed behavior and isolates logging failure from saved feedback', async () => {
    const body = await fixture()
    vi.mocked(console.info).mockImplementation(() => { throw new Error('logging_unavailable') })
    const result = await POST(request({ ...body, confirmed: false })), payload = await result.json()
    expect(result.status).toBe(200)
    expect(payload.state.supportCount).toBe(0)
    expect(payload.feedback.status).toBe('needs_confirmation')
    expect(mocks.assistance).not.toHaveBeenCalled()
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('keeps the original response when shadow evaluation throws and logs no exception details', async () => {
    const body = await fixture()
    vi.spyOn(shadowRouter, 'routeCapability').mockRejectedValueOnce(new Error('Private source text in an evaluator exception'))
    const result = await POST(request(body)), payload = await result.json()
    expect(result.status).toBe(200)
    expect(payload.feedback.assistance).toBe('hinted')
    expect(payload.state.supportCount).toBe(1)
    expect(mocks.save).toHaveBeenCalledTimes(1)
    expect(JSON.parse(vi.mocked(console.info).mock.calls[0][1])).toMatchObject({ observation: 'unavailable', feedbackEqual: null, route: null })
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain('Private source text')
  })
})
