import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ client: vi.fn(), user: vi.fn(), kernel: vi.fn(), receipt: vi.fn(), provider: vi.fn(),
  invoke: vi.fn(), local: vi.fn(), contexts: vi.fn(), eligibility: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }))
vi.mock('@/lib/assignment-help/study-buddy-eligibility', () => ({ studyBuddyEligibility: mocks.eligibility }))
vi.mock('@/lib/learning-engine/study-buddy-assistance', () => ({ recordAssignmentAssistance: mocks.receipt }))
vi.mock('@/lib/math/linear-equation-tutor', () => ({ createLinearEquationReview: mocks.local }))
vi.mock('@/lib/assignment-help/server-understanding', () => ({ loadAssignmentHomeworkKernel: mocks.kernel,
  formatHomeworkKernelForTutor: () => 'Verified assignment context', homeworkModelRouting: () => ({ academicBand: 'high_school' }) }))
vi.mock('@/lib/assignment-submission-server', () => ({ loadCanonicalSpecialistContextsForAssignment: mocks.contexts,
  formatCanonicalSpecialistContextsForPrompt: () => 'Verified specialist context' }))
vi.mock('@/lib/ai/openai-homework-adapter', () => ({ runOpenAIHomeworkJson: mocks.provider,
  selectOpenAIHomeworkQuality: () => 'quality', openAIHomeworkModel: () => 'test-model' }))

import { requestAssignmentReview, requestMathStep, requestWritingAid } from './ai-tools-actions'

const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const assignmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const requestId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const localResult = { title: 'Check the next step', strength: 'You started the equation.', improvement: 'Compare both sides.',
  nextMove: 'Subtract five from each side.', question: 'What remains?', evidenceAnchor: 'Student work',
  visualAid: { kind: 'none', title: '', description: '', steps: [] } }
const input = { assignmentId, requestId, template: 'math' as const, focus: 'Check the next step', question: 'Help',
  fields: [{ label: 'Problem', value: '3x+5=20' }] }

function kernel() {
  return { assignment: { id: assignmentId, class_id: null }, sources: [{ id: 'source', title: 'Worksheet', extracted_text: '3x+5=20', source_location: 'Page 1' }],
    sourcePacket: { citations: ['Page 1'] }, profile: {}, trustDecision: { allowed: true, aiMode: 'green' } }
}

describe('assignment action assistance boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('OPENAI_API_KEY', '')
    mocks.user.mockResolvedValue({ data: { user: { id: ownerId } } })
    mocks.client.mockResolvedValue({ auth: { getUser: mocks.user }, functions: { invoke: mocks.invoke } })
    mocks.kernel.mockResolvedValue(kernel())
    mocks.eligibility.mockResolvedValue({ ok: true, classId: null })
    mocks.contexts.mockResolvedValue([])
    mocks.local.mockReturnValue(localResult)
    mocks.receipt.mockResolvedValue({ status: 'disabled', receipt: null })
    mocks.provider.mockResolvedValue({ ok: true, value: localResult })
    mocks.invoke.mockResolvedValue({ data: { content: 'A hint' }, error: null })
  })
  afterEach(() => vi.unstubAllEnvs())

  it('awaits a durable local receipt before releasing algebra feedback', async () => {
    let release!: (value: unknown) => void
    mocks.receipt.mockImplementation(() => new Promise(resolve => { release = resolve }))
    let settled = false
    const pending = requestAssignmentReview(input).then(result => { settled = true; return result })
    await vi.waitFor(() => expect(mocks.receipt).toHaveBeenCalledOnce())
    expect(settled).toBe(false)
    expect(mocks.provider).not.toHaveBeenCalled()
    expect(mocks.receipt).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ownerId, assignmentId, channel: 'local', kind: 'check', selectedProblemId: null }),
      expect.objectContaining({ result: localResult, algorithm: 'linear-equation-review-v1', kernel: expect.objectContaining({ sources: kernel().sources }) }))
    release({ status: 'disabled', receipt: null })
    expect(await pending).toMatchObject({ ok: true, result: localResult })
  })

  it('withholds deterministic output when the receipt cannot commit', async () => {
    mocks.receipt.mockRejectedValue(new Error('private database details'))
    expect(await requestAssignmentReview(input)).toEqual({ ok: false, error: 'Diana help is unavailable right now. Try again in a moment.' })
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it.each([403, 503])('denies deterministic review and provider dispatch when eligibility returns %i', async status => {
    mocks.eligibility.mockResolvedValue({ ok: false, status, error: 'Study help unavailable.' })
    expect(await requestAssignmentReview(input)).toMatchObject({ ok: false })
    expect(mocks.eligibility).toHaveBeenCalledWith(expect.anything(), { ownerId, assignmentId, classId: null })
    expect(mocks.kernel).not.toHaveBeenCalled()
    expect(mocks.local).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it('does not dispatch a provider or leak the local fallback after a receipt rejection', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-not-a-credential')
    mocks.receipt.mockRejectedValue(new Error('assistance_receipt_unavailable'))
    expect(await requestAssignmentReview(input)).toMatchObject({ ok: false })
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it('records exact provider input and the possible fallback before provider dispatch', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-not-a-credential')
    let release!: (value: unknown) => void
    mocks.receipt.mockImplementation(() => new Promise(resolve => { release = resolve }))
    const pending = requestAssignmentReview(input)
    await vi.waitFor(() => expect(mocks.receipt).toHaveBeenCalledOnce())
    expect(mocks.provider).not.toHaveBeenCalled()
    const recipe = mocks.receipt.mock.calls[0][2]
    expect(recipe).toMatchObject({ model: 'test-model', maxOutputTokens: 850, json: true, deterministicFallback: localResult })
    release({ status: 'disabled', receipt: null })
    expect(await pending).toMatchObject({ ok: true })
    expect(mocks.provider.mock.calls[0][0].messages).toEqual(recipe.messages)
    expect(mocks.provider.mock.calls[0][0].routing).toEqual(recipe.routing)
  })

  it('allows the bound deterministic fallback after provider failure with a committed boundary', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-only-not-a-credential')
    mocks.provider.mockResolvedValue({ ok: false, error: 'Provider unavailable' })
    expect(await requestAssignmentReview(input)).toMatchObject({ ok: true, result: localResult })
    expect(mocks.receipt).toHaveBeenCalledOnce()
  })

  it('keeps explicit retry identity while binding changed source text to a different receipt payload', async () => {
    await requestAssignmentReview(input)
    mocks.kernel.mockResolvedValue({ ...kernel(), sources: [{ ...kernel().sources[0], extracted_text: '4x+1=9' }] })
    await requestAssignmentReview(input)
    expect(mocks.receipt.mock.calls[1][1].requestId).toBe(mocks.receipt.mock.calls[0][1].requestId)
    expect(mocks.receipt.mock.calls[1][2]).not.toEqual(mocks.receipt.mock.calls[0][2])
  })

  it('rejects missing authentication and foreign assignments before recording or dispatch', async () => {
    mocks.user.mockResolvedValueOnce({ data: { user: null } })
    expect(await requestAssignmentReview(input)).toMatchObject({ ok: false })
    expect(mocks.kernel).not.toHaveBeenCalled()
    mocks.kernel.mockResolvedValueOnce(null)
    expect(await requestAssignmentReview(input)).toMatchObject({ ok: false })
    expect(mocks.receipt).not.toHaveBeenCalled()
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it('preserves the resolved assignment policy before local or provider assistance', async () => {
    mocks.kernel.mockResolvedValue({ ...kernel(), trustDecision: { allowed: false, aiMode: 'red', reason: 'Help is disabled.' } })
    expect(await requestAssignmentReview(input)).toEqual({ ok: false, error: 'Help is disabled.' })
    expect(mocks.local).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it('forwards stable owner-bound retry keys to the authoritative Edge boundary', async () => {
    const args = { assignmentId, requestId, aiMode: 'green' as const, prompt: 'Help', history: [] }
    await requestMathStep(args)
    await requestMathStep({ ...args, prompt: 'Changed' })
    const first = mocks.invoke.mock.calls[0][1].body
    expect(first.ownerId).toBe(ownerId)
    expect(first.idempotencyKey).toMatch(/^math-step:[a-f0-9]{64}$/)
    expect(mocks.invoke.mock.calls[1][1].body.idempotencyKey).toBe(first.idempotencyKey)
    expect(first).not.toHaveProperty('requestId')
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('preserves legitimate generic help without assigning an invented task scope', async () => {
    expect(await requestWritingAid({ assignmentId: null, aiMode: 'green', prompt: 'Explain commas' })).toEqual({ content: 'A hint' })
    expect(mocks.invoke.mock.calls[0][1].body.assignmentId).toBeNull()
    expect(mocks.kernel).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
  })

  it('blocks a school-policy denial before forwarding to Edge', async () => {
    mocks.kernel.mockResolvedValue({ ...kernel(), trustDecision: { allowed: false, aiMode: 'yellow' } })
    expect(await requestMathStep({ assignmentId, aiMode: 'green', prompt: 'Help', history: [] })).toHaveProperty('error')
    expect(mocks.invoke).not.toHaveBeenCalled()
    expect(mocks.receipt).not.toHaveBeenCalled()
  })
})
