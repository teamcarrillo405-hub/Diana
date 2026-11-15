import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
vi.mock('server-only', () => ({}))
import { authorizeSavedArtifactDisclosure } from './saved-artifact-assistance'
import type { StudyBuddyAssistanceClient } from './study-buddy-assistance'

// Contract fixtures only, not evaluation cases or student data.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ownerId = id(1), assignmentId = id(2)
const row = { id: id(3), owner_id: ownerId, source_type: 'assignment', source_id: assignmentId }
const payload = { guide: ['stored'], quiz: [{ hint: 'opaque hint', answer: 'opaque answer' }] }
function database(note: unknown = null, course: unknown = { id: id(6), ai_mode: 'green' },
  assignment: unknown = { id: assignmentId, owner_id: ownerId, class_id: id(6), ai_mode_override: null },
  profile: unknown = { age_bracket: 'adult', consent_ai: true }, deletion: unknown = null) {
  const queries: { table: string; filters: [string, unknown][] }[] = []
  const rpc = vi.fn<StudyBuddyAssistanceClient['rpc']>(async (_name, args) => ({ error: null, data: {
    schemaVersion: 'assignment-assistance-v1', scope: 'assignment', ownerId, assignmentId: args.p_assignment,
    requestId: args.p_request, selectedProblemId: null, payloadSha256: args.p_payload_sha256,
    channel: args.p_channel, kind: args.p_kind, recordedAt: '2026-09-29T00:00:00Z', independenceBlocked: true,
  } }))
  const from = vi.fn((table: string) => {
    const query = { table, filters: [] as [string, unknown][] }; queries.push(query)
    const chain = { select: vi.fn(() => chain), not: vi.fn(() => chain), limit: vi.fn(() => chain), eq: vi.fn((key: string, value: unknown) => {
      query.filters.push([key, value]); return chain
    }), maybeSingle: vi.fn(async () => ({ error: null, data: table === 'notes' ? note : table === 'assignments' ? assignment : table === 'profiles' ? profile : table === 'data_deletion_requests' ? deletion : course })) }
    return chain
  })
  return { rpc, from, queries }
}
type Client = Parameters<typeof authorizeSavedArtifactDisclosure>[0]
const client = (db: ReturnType<typeof database>) => db as unknown as Client
beforeEach(() => {
  vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true')
  vi.stubEnv('DIANA_HOMEWORK_PRODUCT_TIER', 'school_tier')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network'))
})
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs() })

describe('saved artifact pre-disclosure assistance', () => {
  it('records broad assignment scope and waits for receipt before release', async () => {
    const db = database(), release = vi.fn()
    const impl = db.rpc.getMockImplementation()!
    let finish!: () => void
    const waiting = new Promise<void>(done => { finish = done })
    let called!: () => void
    const started = new Promise<void>(done => { called = done })
    db.rpc.mockImplementation(async (name, args) => { called(); await waiting; return impl(name, args) })
    const pending = authorizeSavedArtifactDisclosure(client(db), ownerId, row, payload).then(release)
    await started
    expect(release).not.toHaveBeenCalled()
    finish(); await pending
    expect(release).toHaveBeenCalledWith({ assignmentId })
    expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_assignment: assignmentId, p_selected_problem: null, p_channel: 'local', p_kind: 'guide' })
  })
  it('binds exact saved answers and stable artifact identity into repeatable receipt keys', async () => {
    const db = database()
    await authorizeSavedArtifactDisclosure(client(db), ownerId, row, payload)
    await authorizeSavedArtifactDisclosure(client(db), ownerId, row, structuredClone(payload))
    expect(db.rpc.mock.calls[0]).toEqual(db.rpc.mock.calls[1])
    await authorizeSavedArtifactDisclosure(client(db), ownerId, row, { ...payload, quiz: [{ hint: 'changed', answer: 'changed' }] })
    await authorizeSavedArtifactDisclosure(client(db), ownerId, { ...row, id: id(4) }, payload)
    for (const index of [2, 3]) {
      expect(db.rpc.mock.calls[index][1].p_payload_sha256).not.toBe(db.rpc.mock.calls[0][1].p_payload_sha256)
      expect(db.rpc.mock.calls[index][1].p_request).not.toBe(db.rpc.mock.calls[0][1].p_request)
    }
  })
  it('resolves owned note assignment and returns it for subsequent chat', async () => {
    const db = database({ id: id(5), owner_id: ownerId, assignment_id: assignmentId, class_id: id(6) })
    expect(await authorizeSavedArtifactDisclosure(client(db), ownerId, { ...row, source_type: 'note', source_id: id(5) }, payload)).toEqual({ assignmentId })
    expect(db.queries[0].filters).toEqual([['id', id(5)], ['owner_id', ownerId]])
    expect(db.rpc.mock.calls[0][1].p_assignment).toBe(assignmentId)
  })
  it('never treats missing or foreign notes as unscoped', async () => {
    for (const note of [null, { id: id(5), owner_id: id(99), assignment_id: null, class_id: null },
      { id: id(99), owner_id: ownerId, assignment_id: null, class_id: null }]) {
      const db = database(note)
      await expect(authorizeSavedArtifactDisclosure(client(db), ownerId, { ...row, source_type: 'note', source_id: id(5) }, payload)).rejects.toThrow()
      expect(db.rpc).not.toHaveBeenCalled()
    }
  })
  it('keeps verified general/class-only notes unscoped without invented receipts', async () => {
    for (const classId of [null, id(6)]) {
      const db = database({ id: id(5), owner_id: ownerId, assignment_id: null, class_id: classId }, { id: id(6), ai_mode: 'green' })
      expect(await authorizeSavedArtifactDisclosure(client(db), ownerId, { ...row, source_type: 'note', source_id: id(5) }, payload)).toEqual({ assignmentId: null })
      expect(db.rpc).not.toHaveBeenCalled()
    }
  })
  it('rejects foreign artifact, missing assignment and denied assignment/class policy', async () => {
    const db = database()
    await expect(authorizeSavedArtifactDisclosure(client(db), id(99), row, payload)).rejects.toThrow()
    await expect(authorizeSavedArtifactDisclosure(client(database(null, null, null)), ownerId, row, payload)).rejects.toThrow()
    for (const [override, classMode] of [['red', 'green'], ['yellow', 'green'], [null, 'red'], [null, 'yellow']]) {
      const denied = database(null, { id: id(6), ai_mode: classMode }, {
        id: assignmentId, owner_id: ownerId, class_id: id(6), ai_mode_override: override,
      })
      await expect(authorizeSavedArtifactDisclosure(client(denied), ownerId, row, payload)).rejects.toThrow()
      expect(denied.rpc).not.toHaveBeenCalled()
      expect(denied.queries.find(item => item.table === 'assignments')?.filters).toContainEqual(['owner_id', ownerId])
    }
    expect(db.rpc).not.toHaveBeenCalled()
    const notes = database({ id: id(5), owner_id: ownerId, assignment_id: null, class_id: id(6) }, { id: id(6), ai_mode: 'yellow' })
    await expect(authorizeSavedArtifactDisclosure(client(notes), ownerId, { ...row, source_type: 'note', source_id: id(5) }, payload)).rejects.toThrow()
    expect(notes.rpc).not.toHaveBeenCalled()
  })
  it('withholds release for missing migration, mismatched or rejected receipts', async () => {
    for (const result of [{ data: null, error: { code: 'PGRST202' } }, { data: {}, error: null }]) {
      const db = database(), release = vi.fn(); db.rpc.mockResolvedValueOnce(result)
      await expect(authorizeSavedArtifactDisclosure(client(db), ownerId, row, payload).then(release)).rejects.toThrow('assistance_receipt_unavailable')
      expect(release).not.toHaveBeenCalled()
    }
  })
  it('enforces actual account consent and deletion status before assignment disclosure', async () => {
    for (const [profile, deletion] of [[{ age_bracket: 'adult', consent_ai: false }, null],
      [{ age_bracket: 'under_13', consent_ai: true }, null], [{ age_bracket: 'adult', consent_ai: true }, { status: 'pending' }]]) {
      const db = database(undefined, undefined, undefined, profile, deletion)
      await expect(authorizeSavedArtifactDisclosure(client(db), ownerId, row, payload)).rejects.toThrow()
      expect(db.rpc).not.toHaveBeenCalled()
    }
  })
  it('keeps the receipt migration optional while the flag is disabled', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', undefined)
    const db = database()
    expect(await authorizeSavedArtifactDisclosure(client(db), ownerId, row, payload)).toEqual({ assignmentId })
    expect(db.rpc).not.toHaveBeenCalled()
  })
  it('awaits the boundary before passing saved payloads and uses resolved chat scope in the page', () => {
    const source = readFileSync('app/(app)/study-artifacts/[id]/page.tsx', 'utf8')
    const boundary = source.indexOf('await authorizeSavedArtifactDisclosure(')
    expect(boundary).toBeGreaterThan(0)
    for (const marker of ['<PracticeTestSession', '<ArtifactFlashcards', 'artifact.guide.map']) expect(source.indexOf(marker)).toBeGreaterThan(boundary)
    expect(source).toContain('assignmentId={assignmentId}')
    expect(source).toContain('storedPayload: row.payload, artifact')
    expect(source.slice(boundary, source.indexOf('if (row.artifact_type'))).toContain('catch')
  })
})
