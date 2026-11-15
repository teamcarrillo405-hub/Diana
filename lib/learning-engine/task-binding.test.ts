import { describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { buildWorksheetTaskIndex, persistWorksheetTaskOrigins, type TaskBindingClient, type WorksheetTaskRow } from './task-binding'
import { sha256, structureDocument } from './curriculum'

const owner = '00000000-0000-4000-8000-000000000001', assignment = '00000000-0000-4000-8000-000000000002'
const first = '00000000-0000-4000-8000-000000000003', second = '00000000-0000-4000-8000-000000000004'
function row(id = first, text = 'Solve 3x+5=20.', number = 1): WorksheetTaskRow {
  return { id, owner_id: owner, assignment_id: assignment, problem_number: number, problem_text: text, source: 'manual', unit_type: 'problem' }
}
async function fixture(rows = [row()]) {
  const index = await buildWorksheetTaskIndex(owner, assignment, rows)
  const document = await structureDocument({ documentId: 'assignment-problems', ownerId: owner, assignmentId: assignment,
    classId: null, title: 'Worksheet', edition: 'Current', subject: 'math', instructionRights: 'owner_provided' }, index.pages)
  return { index, document }
}
function client() {
  const rpc = vi.fn<TaskBindingClient['rpc']>(async (name, args) => ({ error: null, data: name === 'learning_register_worksheet_task'
    ? { taskId: args.p_problem, ownerId: owner, assignmentId: args.p_assignment, originKind: 'worksheet_problem',
      originKey: args.p_problem, initialSnapshotSha256: args.p_snapshot_sha256, trustBasis: 'legacy_unresolved' }
    : { taskId: args.p_problem, sourceVersionId: args.p_source_version, sourcePage: args.p_source_page, sourceSnapshotSha256: args.p_source_snapshot_sha256 } }))
  return { rpc }
}

describe('stable worksheet origin preservation', () => {
  it('retains row UUIDs across reorder, renumbering, identical text and source edits', async () => {
    const original = await fixture([row(first), row(second, 'Solve 3x+5=20.', 1)])
    const reordered = await fixture([row(second, 'Solve 3x+5=20.', 7), row(first, 'Solve 3x+5=20.', 8)])
    expect(original.index.origins.map(item => item.taskId)).toEqual([first, second])
    expect(reordered.index.origins.map(item => item.taskId)).toEqual([second, first])
    expect(original.index.origins[0].sourceSnapshotSha256).toBe(reordered.index.origins[1].sourceSnapshotSha256)
    expect(original.document.version.id).not.toBe(reordered.document.version.id)
    const edited = await fixture([row(first, 'Solve 3x+5=23.')])
    expect(edited.index.origins[0].taskId).toBe(first)
    expect(edited.index.origins[0].sourceSnapshotSha256).not.toBe(original.index.origins[0].sourceSnapshotSha256)
    expect(original.index.origins[0].sourceSnapshotSha256).toBe(await sha256(row().problem_text))
  })

  it('rejects missing or duplicated identities and foreign ownership instead of inferring from text', async () => {
    const { id: _id, ...withoutId } = row()
    for (const rows of [[withoutId], [row(), row()], [{ ...row(), owner_id: second }], [{ ...row(), assignment_id: second }], [{ ...row(), id: 'a'.repeat(64) }]]) {
      await expect(buildWorksheetTaskIndex(owner, assignment, rows)).rejects.toThrow()
    }
  })

  it('does not call new RPCs unless explicitly enabled and keeps both durable identities distinct', async () => {
    const { index, document } = await fixture(), db = client()
    expect(await persistWorksheetTaskOrigins(db, document, index, false)).toMatchObject({ status: 'disabled', boundCount: 0 })
    expect(db.rpc).not.toHaveBeenCalled()
    expect(await persistWorksheetTaskOrigins(db, document, index, true)).toMatchObject({ status: 'bound', boundCount: 1 })
    expect(db.rpc).toHaveBeenNthCalledWith(1, 'learning_register_worksheet_task', { p_assignment: assignment, p_problem: first, p_snapshot_sha256: index.origins[0].sourceSnapshotSha256 })
    expect(db.rpc).toHaveBeenNthCalledWith(2, 'learning_bind_worksheet_source', expect.objectContaining({ p_problem: first, p_source_version: document.version.id, p_source_page: 1 }))
    expect(document.blocks[0].id).not.toBe(first)
  })

  it('does not bind imported unknown or generated-step provenance', async () => {
    for (const source of [{ source: 'unknown' }, { source: 'ocr' }, { source: 'manual', unit_type: 'generated_step' }]) {
      const { index, document } = await fixture([{ ...row(), ...source }]), db = client()
      expect(await persistWorksheetTaskOrigins(db, document, index, true)).toMatchObject({ status: 'unresolved', boundCount: 0 })
      expect(db.rpc).not.toHaveBeenCalled()
    }
    const { index, document } = await fixture([{ ...row(), source: 'student_confirmed_source' }])
    expect((await persistWorksheetTaskOrigins(client(), document, index, true)).status).toBe('bound')
  })

  it('fails closed on altered page, foreign document, missing migration and forged receipts', async () => {
    const { index, document } = await fixture()
    for (const altered of [
      { ...document, pages: [{ ...document.pages[0], text: 'An unrelated task' }] },
      { ...document, version: { ...document.version, ownerId: second } },
      { ...document, version: { ...document.version, documentId: 'a-different-source' } },
    ]) {
      const db = client()
      expect((await persistWorksheetTaskOrigins(db, altered, index, true)).boundCount).toBe(0)
      expect(db.rpc).not.toHaveBeenCalled()
    }
    for (const response of [{ data: null, error: { code: 'PGRST202' } }, { data: { taskId: second }, error: null }]) {
      const db = client(); db.rpc.mockResolvedValueOnce(response)
      expect((await persistWorksheetTaskOrigins(db, document, index, true)).status).toBe('unresolved')
      expect(db.rpc).toHaveBeenCalledTimes(1)
    }
    const db = client(); db.rpc.mockRejectedValueOnce(new Error('unavailable'))
    expect((await persistWorksheetTaskOrigins(db, document, index, true)).status).toBe('unresolved')
    const wrongBinding = client(); wrongBinding.rpc.mockImplementationOnce(client().rpc).mockResolvedValueOnce({ data: { taskId: second }, error: null })
    expect((await persistWorksheetTaskOrigins(wrongBinding, document, index, true)).boundCount).toBe(0)
  })
})
