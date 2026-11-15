import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
vi.mock('server-only', () => ({}))
import { authorizeRecallDisclosure } from './recall-assistance'
import type { StudyBuddyAssistanceClient } from './study-buddy-assistance'

// Opaque contract fixtures only; not a learning-evaluation corpus.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const owner = id(1), assignment = id(2)
const card = { id: id(3), owner_id: owner, front: 'opaque prompt', back: 'opaque saved answer',
  source_anchor: null, student_required_action: null, source_assignment_id: assignment,
  source_note_id: null, source_artifact_id: null }
type Client = Parameters<typeof authorizeRecallDisclosure>[0]
function database(rows: Record<string, unknown> = {}) {
  rows = { assignments: { id: assignment, owner_id: owner, class_id: id(6), ai_mode_override: null },
    classes: { id: id(6), ai_mode: 'green' }, profiles: { age_bracket: 'adult', consent_ai: true }, ...rows }
  const queries: {table: string; filters: [string, unknown][]}[] = []
  const from = vi.fn((table: string) => {
    const query = { table, filters: [] as [string, unknown][] }; queries.push(query)
    const chain = { select: vi.fn(() => chain), not: vi.fn(() => chain), limit: vi.fn(() => chain), eq: vi.fn((key: string, value: unknown) => {
      query.filters.push([key, value]); return chain
    }), maybeSingle: vi.fn(async () => ({ error: null, data: rows[table] ?? null })) }
    return chain
  })
  const rpc = vi.fn<StudyBuddyAssistanceClient['rpc']>(async (_name, args) => ({ error: null, data: {
    schemaVersion: 'assignment-assistance-v1', scope: 'assignment', ownerId: owner,
    assignmentId: args.p_assignment, requestId: args.p_request, selectedProblemId: null,
    payloadSha256: args.p_payload_sha256, channel: args.p_channel, kind: args.p_kind,
    recordedAt: '2026-09-29T00:00:00Z', independenceBlocked: true,
  } }))
  return { from, rpc, queries }
}
const client = (db: ReturnType<typeof database>) => db as unknown as Client
beforeEach(() => {
  vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', 'true')
  vi.stubEnv('DIANA_HOMEWORK_PRODUCT_TIER', 'school_tier')
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network'))
})
afterEach(() => { expect(fetch).not.toHaveBeenCalled(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs() })

describe('Recall answers require durable assistance before disclosure', () => {
  it('does no provenance or RPC work while enforcement is disabled', async () => {
    vi.stubEnv('DIANA_DURABLE_TASK_ASSISTANCE_ENABLED', undefined)
    const db = database(); await authorizeRecallDisclosure(client(db), owner, [card])
    expect(db.from).not.toHaveBeenCalled(); expect(db.rpc).not.toHaveBeenCalled()
  })
  it('awaits the receipt before releasing any card answers', async () => {
    const db = database(), release = vi.fn(), impl = db.rpc.getMockImplementation()!
    let finish!: () => void, called!: () => void
    const held = new Promise<void>(done => { finish = done })
    const started = new Promise<void>(done => { called = done })
    db.rpc.mockImplementation(async (name, args) => { called(); await held; return impl(name, args) })
    const pending = authorizeRecallDisclosure(client(db), owner, [card]).then(release)
    await started; expect(release).not.toHaveBeenCalled(); finish(); await pending
    expect(release).toHaveBeenCalledOnce()
    expect(db.rpc.mock.calls[0][1]).toMatchObject({ p_assignment: assignment, p_selected_problem: null, p_channel: 'local' })
  })
  it('uses stable payload keys independent of FSRS scheduling, changing on answer edits', async () => {
    const db = database()
    await authorizeRecallDisclosure(client(db), owner, [{ ...card, reps: 1 }])
    await authorizeRecallDisclosure(client(db), owner, [{ ...card, reps: 9 }])
    expect(db.rpc.mock.calls[0]).toEqual(db.rpc.mock.calls[1])
    await authorizeRecallDisclosure(client(db), owner, [{ ...card, back: 'edited' }])
    expect(db.rpc.mock.calls[2][1].p_request).not.toBe(db.rpc.mock.calls[0][1].p_request)
    expect(db.rpc.mock.calls[2][1].p_payload_sha256).not.toBe(db.rpc.mock.calls[0][1].p_payload_sha256)
  })
  it('resolves both owned note and legacy artifact-only assignment provenance', async () => {
    const note = { id: id(4), owner_id: owner, assignment_id: assignment, class_id: null }
    for (const artifactOnly of [false, true]) {
      const db = database({ notes: note, study_artifacts: { id: id(5), owner_id: owner, source_type: 'note', source_id: id(4) } })
      await authorizeRecallDisclosure(client(db), owner, [{ ...card, source_assignment_id: null,
        source_note_id: artifactOnly ? null : id(4), source_artifact_id: artifactOnly ? id(5) : null }])
      expect(db.rpc.mock.calls[0][1].p_assignment).toBe(assignment)
      for (const query of db.queries) expect(query.filters).toContainEqual([query.table === 'profiles' ? 'user_id' : 'owner_id', owner])
    }
  })
  it('preserves genuinely general and verified class-only cards without invented assignment', async () => {
    const db = database({ notes: { id: id(4), owner_id: owner, assignment_id: null, class_id: id(6) },
      classes: { id: id(6), ai_mode: 'green' } })
    await authorizeRecallDisclosure(client(db), owner, [{ ...card, source_assignment_id: null },
      { ...card, source_assignment_id: null, source_note_id: id(4) }])
    expect(db.rpc).not.toHaveBeenCalled()
  })
  it('rejects missing, foreign, malformed or contradictory provenance instead of degrading scope', async () => {
    const variants = [
      { rows: {}, change: { source_note_id: id(4) } },
      { rows: {}, change: { source_artifact_id: id(5) } },
      { rows: { notes: { id: id(4), owner_id: id(99), assignment_id: null, class_id: null } }, change: { source_note_id: id(4) } },
      { rows: { notes: { id: id(4), owner_id: owner, assignment_id: 'invalid', class_id: null } }, change: { source_note_id: id(4) } },
      { rows: { notes: { id: id(4), owner_id: owner, assignment_id: id(99), class_id: null } }, change: { source_note_id: id(4) } },
      { rows: { study_artifacts: { id: id(5), owner_id: id(99), source_type: 'assignment', source_id: assignment } }, change: { source_artifact_id: id(5) } },
      { rows: {}, change: { owner_id: id(99) } },
    ]
    for (const { rows, change } of variants) {
      const db = database(rows)
      await expect(authorizeRecallDisclosure(client(db), owner, [{ ...card, ...change }])).rejects.toThrow()
      expect(db.rpc).not.toHaveBeenCalled()
    }
  })
  it('blocks missing assignment, denied policy and unavailable receipts', async () => {
    const db = database()
    await expect(authorizeRecallDisclosure(client(database({ assignments: null })), owner, [card])).rejects.toThrow()
    for (const [override, classMode] of [['red', 'green'], ['yellow', 'green'], [null, 'red'], [null, 'yellow']]) {
      const denied = database({ assignments: { id: assignment, owner_id: owner, class_id: id(6), ai_mode_override: override },
        classes: { id: id(6), ai_mode: classMode } })
      await expect(authorizeRecallDisclosure(client(denied), owner, [card])).rejects.toThrow()
      expect(denied.rpc).not.toHaveBeenCalled()
    }
    expect(db.rpc).not.toHaveBeenCalled()
    for (const receipt of [{ data: null, error: { code: 'PGRST202' } }, { data: {}, error: null }]) {
      db.rpc.mockResolvedValueOnce(receipt)
      await expect(authorizeRecallDisclosure(client(db), owner, [card])).rejects.toThrow('assistance_receipt_unavailable')
    }
  })
  it('rejects oversized queues and serializes no content before the page boundary completes', async () => {
    const db = database()
    await expect(authorizeRecallDisclosure(client(db), owner, Array(61).fill(card))).rejects.toThrow()
    expect(db.rpc).not.toHaveBeenCalled()
    const source = readFileSync('app/(app)/study/recall/page.tsx', 'utf8')
    expect(source.indexOf('await authorizeRecallDisclosure(')).toBeLessThan(source.indexOf('<RecallSession'))
    expect(source).toContain('source_assignment_id,source_note_id,source_artifact_id')
    expect(source).toContain('catch')
  })
  it('enforces actual account consent and deletion status before assignment disclosure', async () => {
    for (const rows of [{ profiles: { age_bracket: 'adult', consent_ai: false } },
      { profiles: { age_bracket: 'under_13', consent_ai: true } }, { data_deletion_requests: { status: 'pending' } }]) {
      const db = database(rows)
      await expect(authorizeRecallDisclosure(client(db), owner, [card])).rejects.toThrow()
      expect(db.rpc).not.toHaveBeenCalled()
    }
  })
})
