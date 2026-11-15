import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rows: [] as unknown[], rpc: vi.fn(), select: vi.fn(), eq: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }) }))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ rpc: mocks.rpc, from: () => {
  const query = { select: (fields: string) => { mocks.select(fields); return query },
    eq: (...args: unknown[]) => { mocks.eq(...args); return query }, order: async () => ({ data: mocks.rows, error: null }) }
  return query
} }) }))
import { indexAssignmentSource } from './server'
import type { AssignmentHomeworkKernel } from '@/lib/assignment-help/server-understanding'
const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002'
const task = '00000000-0000-4000-8000-000000000003'
const kernel = { assignment: { id: assignment, class_id: null }, sources: [] } as unknown as AssignmentHomeworkKernel
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('DIANA_DURABLE_TASK_BINDING_ENABLED', 'false')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden'))
  mocks.rows = [{ id: task, owner_id: owner, assignment_id: assignment, problem_number: 1,
    problem_text: 'Solve 3x+5=20.', source: 'manual', unit_type: 'problem' }]
  mocks.rpc.mockImplementation(async (name, args) => {
    if (name === 'learning_store_document') return { error: null, data: args.p_document.version.id }
    if (name === 'learning_register_worksheet_task') return { error: null, data: { taskId: args.p_problem,
      ownerId: owner, assignmentId: assignment, originKind: 'worksheet_problem', originKey: args.p_problem,
      initialSnapshotSha256: args.p_snapshot_sha256, trustBasis: 'legacy_unresolved' } }
    return { error: null, data: { taskId: args.p_problem, sourceVersionId: args.p_source_version,
      sourcePage: args.p_source_page, sourceSnapshotSha256: args.p_source_snapshot_sha256 } }
  })
})
afterEach(() => { expect(globalThis.fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.unstubAllEnvs() })

describe('worksheet indexing optional durable origin sidecar', () => {
  it('preserves the existing document RPC and result shape before migration is enabled', async () => {
    const result = await indexAssignmentSource({ ownerId: owner, kernel, sourceId: 'assignment-problems', subject: 'math' })
    expect(result.status).toBe('ready')
    expect(Object.keys(result).sort()).toEqual(['blockCount', 'chunkCount', 'status', 'versionId'])
    expect(mocks.select).toHaveBeenCalledWith('id,owner_id,assignment_id,problem_number,problem_text,source,unit_type')
    expect(mocks.eq).toHaveBeenCalledWith('owner_id', owner)
    expect(mocks.eq).toHaveBeenCalledWith('assignment_id', assignment)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    const [name, args] = mocks.rpc.mock.calls[0]
    expect(name).toBe('learning_store_document')
    expect(Object.keys(args)).toEqual(['p_document'])
    expect(args.p_document.pages[0]).toMatchObject({ page: 1, text: '1. Solve 3x+5=20.' })
    expect(args.p_document.version).not.toHaveProperty('taskId')
  })

  it('binds the owned UUID only after document persistence through narrow authenticated RPCs', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_BINDING_ENABLED', 'true')
    const result = await indexAssignmentSource({ ownerId: owner, kernel, sourceId: 'assignment-problems', subject: 'math' })
    expect(mocks.rpc.mock.calls.map(call => call[0])).toEqual(['learning_store_document', 'learning_register_worksheet_task', 'learning_bind_worksheet_source'])
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({ p_problem: task, p_assignment: assignment })
    expect(mocks.rpc.mock.calls[1][1]).not.toHaveProperty('p_trust_basis')
    expect(mocks.rpc.mock.calls[2][1]).toMatchObject({ p_problem: task, p_source_version: result.versionId, p_source_page: 1 })
  })

  it('keeps index compatibility when the optional migration is absent and never binds failed storage', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_BINDING_ENABLED', 'true')
    mocks.rpc.mockImplementation(async (name, args) => name === 'learning_store_document'
      ? { data: args.p_document.version.id, error: null } : { data: null, error: { code: 'PGRST202' } })
    expect((await indexAssignmentSource({ ownerId: owner, kernel, sourceId: 'assignment-problems', subject: 'math' })).status).toBe('ready')
    expect(mocks.rpc).toHaveBeenCalledTimes(2)
    mocks.rpc.mockClear(); mocks.rpc.mockResolvedValue({ data: null, error: { code: 'store_unavailable' } })
    await expect(indexAssignmentSource({ ownerId: owner, kernel, sourceId: 'assignment-problems', subject: 'math' })).rejects.toThrow()
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })
})
