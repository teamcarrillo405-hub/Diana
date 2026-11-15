import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const owner = '11111111-1111-4111-8111-111111111111'
const assignment = '22222222-2222-4222-8222-222222222222'
const second = '33333333-3333-4333-8333-333333333333'
const note = '44444444-4444-4444-8444-444444444444'
const note2 = '55555555-5555-4555-8555-555555555555'
const rpc = vi.fn(), auth = vi.fn(), provider = vi.fn(), env = vi.fn(), notes = vi.fn()
type BoundaryContext = { request: Request; body: Record<string, unknown>; feature: string; sourceNoteIds?: string[] }
let boundary: {
  runAssignmentScopedHomeworkAdapter(context: BoundaryContext, input: Record<string, unknown>): Promise<unknown>
  recordEdgeAssignmentHelp(context: BoundaryContext, input: { ownerId: string; recipe: unknown; kind: string }): Promise<unknown>
}
let bundle: string
const features = ['math-step', 'math-example', 'math-scaffold', 'reading-scaffold', 'reading-level', 'vocab-hover',
  'writing-aid', 'writing-cowrite', 'science-scaffold', 'history-scaffold', 'cs-scaffold', 'language-scaffold',
  'arts-scaffold', 'health-scaffold', 'ap-scaffold', 'citation-gen', 'study-artifacts', 'assignment-review',
  'assignment-realtime-reason', 'assignment-realtime', 'task-breakdown', 'note-synthesis', 'visual-tools']

beforeAll(async () => {
  const result = await build({ entryPoints: [resolve('supabase/functions/_shared/learning/assignment-help-boundary.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{ name: 'mock-io', setup(builder) {
      builder.onResolve({ filter: /\/(student-auth|homework-adapter)\.ts$/ }, args => ({ path: args.path, namespace: 'io' }))
      builder.onLoad({ filter: /.*/, namespace: 'io' }, args => ({ loader: 'js', contents: args.path.endsWith('student-auth.ts')
        ? 'export const requireStudentContext=(...args)=>globalThis.testIO.auth(...args);'
        : 'export const runOpenAIHomeworkAdapter=(...args)=>globalThis.testIO.provider(...args); export const homeworkQualityForTask=()=>"quality";' }))
    } }] })
  bundle = result.outputFiles[0].text
})
beforeEach(() => {
  vi.resetAllMocks()
  env.mockReturnValue('true')
  rpc.mockImplementation(async (_name, args) => ({ data: receipt(args), error: null }))
  notes.mockResolvedValue({ data: [{ id: note, assignment_id: assignment }], error: null })
  const userClient = { rpc, from: vi.fn(() => ({ select: () => ({ eq: () => ({ in: notes }) }) })) }
  auth.mockResolvedValue({ ownerId: owner, userClient, serviceClient: { rpc: vi.fn(() => { throw new Error('privileged receipt forbidden') }) } })
  provider.mockResolvedValue({ content: 'One next question?', tokens: 12, model: 'mock-model' })
  const runtimeModule = { exports: {} }
  runInNewContext(bundle, { module: runtimeModule, exports: runtimeModule.exports, Deno: { env: { get: env } },
    testIO: { auth, provider }, crypto: webcrypto, Request, Response, Headers, TextEncoder, console })
  boundary = runtimeModule.exports as typeof boundary
})
function receipt(args: Record<string, unknown>) {
  return { schemaVersion: 'assignment-assistance-v1', scope: 'assignment', requestId: args.p_request,
    ownerId: owner, assignmentId: args.p_assignment, selectedProblemId: null, payloadSha256: args.p_payload_sha256,
    channel: 'api', kind: args.p_kind, independenceBlocked: true, recordedAt: '2026-09-29T01:00:00.000Z' }
}
const context = (body: Record<string, unknown> = { assignmentId: assignment, idempotencyKey: 'request-one' }) => ({
  request: new Request('https://functions.example/math-step', { method: 'POST', body: JSON.stringify(body) }),
  body, feature: 'math-step',
})
const input = () => ({ task: 'math_step' as const, ownerId: owner, supabase: {} as never,
  system: 'Use one next question.', user: 'My source and attempt.', maxTokens: 400 })
const sha = (value: string) => createHash('sha256').update(value).digest('hex')

describe('direct Edge assignment-help boundary', () => {
  it('preserves the existing adapter path when disabled', async () => {
    env.mockReturnValue(undefined)
    const params = input()
    await boundary.runAssignmentScopedHomeworkAdapter(context(), params)
    expect(provider).toHaveBeenCalledWith(params)
    expect(auth).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled()
  })
  it('waits for a matching authenticated receipt before any provider or fallback', async () => {
    let finish!: (value: unknown) => void
    rpc.mockReturnValue(new Promise(resolve => { finish = resolve }))
    const pending = boundary.runAssignmentScopedHomeworkAdapter(context(), { ...input(), fallbackContent: 'local fallback' })
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledOnce())
    expect(provider).not.toHaveBeenCalled()
    finish({ data: receipt(rpc.mock.calls[0][1]), error: null })
    await pending
    expect(provider).toHaveBeenCalledOnce()
    expect(provider.mock.calls[0][0].idempotencyKey).toBe('request-one')
  })
  it.each(['error', 'malformed', 'wrong-owner', 'wrong-scope', 'wrong-digest', 'extra-field'])('rejects %s receipts without provider use', async failure => {
    rpc.mockImplementation(async (_name, args) => {
      const data: Record<string, unknown> = receipt(args)
      if (failure === 'wrong-owner') data.ownerId = second
      if (failure === 'wrong-scope') data.scope = 'task'
      if (failure === 'wrong-digest') data.payloadSha256 = '0'.repeat(64)
      if (failure === 'extra-field') data.extra = true
      return { data: failure === 'malformed' ? null : data, error: failure === 'error' ? { message: 'private detail' } : null }
    })
    await expect(boundary.runAssignmentScopedHomeworkAdapter(context(), input())).rejects.toMatchObject({ status: 503 })
    expect(provider).not.toHaveBeenCalled()
  })
  it('binds the exact normalized prompt, source parts, token ceiling and routing', async () => {
    const params = { ...input(), parts: [{ type: 'text' as const, text: 'source bytes' }], routing: { sourceChars: 12 } }
    await boundary.runAssignmentScopedHomeworkAdapter(context(), params)
    const args = rpc.mock.calls[0][1]
    expect(args.p_payload_sha256).toBe(sha(JSON.stringify({ protocol: 'edge-assignment-help-v1', feature: 'math-step', ownerId: owner,
      assignmentIds: [assignment], sourceNoteIds: [], assignmentId: assignment, requestId: args.p_request, channel: 'api', kind: 'hint',
      recipe: { task: params.task, ownerId: owner, system: params.system, user: params.user, maxTokens: 400,
        parts: params.parts, routing: params.routing, json: false, quality: 'quality', idempotencyKey: 'request-one' } })))
    expect(JSON.stringify(args)).not.toContain(params.user)
  })
  it('uses stable feature-specific request IDs and changes payload hashes for changed recipes', async () => {
    await boundary.runAssignmentScopedHomeworkAdapter(context(), input())
    await boundary.runAssignmentScopedHomeworkAdapter(context(), { ...input(), user: 'changed source' })
    await boundary.runAssignmentScopedHomeworkAdapter({ ...context(), feature: 'writing-aid' }, input())
    expect(rpc.mock.calls[0][1].p_request).toBe(rpc.mock.calls[1][1].p_request)
    expect(rpc.mock.calls[0][1].p_payload_sha256).not.toBe(rpc.mock.calls[1][1].p_payload_sha256)
    expect(rpc.mock.calls[2][1].p_request).not.toBe(rpc.mock.calls[0][1].p_request)
  })
  it('retains genuine unscoped help without an invented assignment receipt', async () => {
    const result = await boundary.recordEdgeAssignmentHelp(context({ classId: second }), { ownerId: owner, recipe: {}, kind: 'guide' })
    expect(result).toEqual({ scope: 'unscoped', assignmentIds: [] })
    await boundary.runAssignmentScopedHomeworkAdapter(context({}), input())
    expect(provider).toHaveBeenCalledOnce(); expect(rpc).not.toHaveBeenCalled()
  })
  it('rejects missing scope only for functions that already require an assignment', async () => {
    for (const feature of ['assignment-review', 'assignment-realtime', 'assignment-realtime-reason']) {
      await expect(boundary.recordEdgeAssignmentHelp({ ...context({}), feature }, { ownerId: owner, recipe: {}, kind: 'guide' }))
        .rejects.toMatchObject({ status: 400 })
    }
    expect(rpc).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled()
  })
  it('resolves owned note scopes and records every actual assignment before dispatch', async () => {
    notes.mockResolvedValue({ data: [{ id: note, assignment_id: assignment }, { id: note2, assignment_id: second }], error: null })
    await boundary.runAssignmentScopedHomeworkAdapter({ ...context({}), feature: 'note-synthesis', sourceNoteIds: [note2, note] }, input())
    expect(notes).toHaveBeenCalledWith('id', [note2, note])
    expect(rpc.mock.calls.map(([, args]) => args.p_assignment)).toEqual([assignment, second])
    expect(rpc.mock.invocationCallOrder.at(-1)).toBeLessThan(provider.mock.invocationCallOrder[0])
  })
  it('does not treat an unavailable or incomplete note ownership lookup as unscoped', async () => {
    notes.mockResolvedValue({ data: [], error: null })
    await expect(boundary.runAssignmentScopedHomeworkAdapter({ ...context({}), sourceNoteIds: [note] }, input())).rejects.toMatchObject({ status: 503 })
    expect(provider).not.toHaveBeenCalled(); expect(rpc).not.toHaveBeenCalled()
  })
  it('stops if one of several assignment receipts fails', async () => {
    notes.mockResolvedValue({ data: [{ id: note, assignment_id: assignment }, { id: note2, assignment_id: second }], error: null })
    rpc.mockImplementation(async (_name, args) => ({ data: args.p_assignment === assignment ? receipt(args) : null, error: null }))
    await expect(boundary.runAssignmentScopedHomeworkAdapter({ ...context({}), sourceNoteIds: [note, note2] }, input())).rejects.toMatchObject({ status: 503 })
    expect(rpc).toHaveBeenCalledTimes(2); expect(provider).not.toHaveBeenCalled()
  })
  it('preserves authoritative authorization failures and ignores forged caller receipts', async () => {
    auth.mockResolvedValue(new Response('Denied', { status: 403 }))
    await expect(boundary.runAssignmentScopedHomeworkAdapter(context({ assignmentId: assignment, assistanceRecorded: true }), input())).rejects.toMatchObject({ status: 403 })
    expect(rpc).not.toHaveBeenCalled(); expect(provider).not.toHaveBeenCalled()
  })
})

describe('direct Edge integration inventory', () => {
  it('keeps every audited instructional entrypoint behind the boundary and bundles unchanged generic handlers', async () => {
    for (const feature of features) {
      const path = resolve(`supabase/functions/${feature}/index.ts`)
      const source = readFileSync(path, 'utf8')
      expect(source).toContain('../_shared/learning/assignment-help-boundary.ts')
      if (feature !== 'math-scaffold') expect(source).not.toContain('await runOpenAIHomeworkAdapter(')
      // Real syntax/import checking; IO imports remain external and no entrypoint executes.
      await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['jsr:*', 'npm:*', 'https:*'] })
    }
    const math = readFileSync(resolve('supabase/functions/math-scaffold/index.ts'), 'utf8')
    expect(math.match(/await runOpenAIHomeworkAdapter\(/g)).toHaveLength(1)
    expect(math).toContain('task: "source_extraction"')
  }, 30_000)
})
