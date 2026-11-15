import 'server-only'
import { z } from 'zod'
import { sha256 } from './curriculum'
import { assignmentProblemSourceState } from './assignment-problem-source'
import type { SourcePage, StructuredDocument } from './contracts'

const worksheetRowSchema = z.object({
  id: z.string().uuid(), owner_id: z.string().uuid(), assignment_id: z.string().uuid(),
  problem_number: z.number().int().positive(), problem_text: z.string().min(1).max(250000),
  source: z.string(), unit_type: z.string(),
}).strict()
export type WorksheetTaskRow = z.infer<typeof worksheetRowSchema>
export type WorksheetTaskOrigin = Readonly<{
  taskId: string; ownerId: string; assignmentId: string; originKey: string
  sourcePage: number; sourceSnapshotSha256: string; pageTextSha256: string
  sourceConfirmed: boolean
}>
export type WorksheetTaskIndex = Readonly<{ pages: SourcePage[]; origins: readonly WorksheetTaskOrigin[] }>

/** The row identity travels with the page at construction; no later text/number matching. */
export async function buildWorksheetTaskIndex(ownerId: string, assignmentId: string, rawRows: unknown): Promise<WorksheetTaskIndex> {
  z.string().uuid().parse(ownerId); z.string().uuid().parse(assignmentId)
  const rows = worksheetRowSchema.array().max(1500).parse(rawRows)
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('duplicate_worksheet_identity')
  if (rows.some(row => row.owner_id !== ownerId || row.assignment_id !== assignmentId)) throw new Error('worksheet_scope_mismatch')
  const pages: SourcePage[] = rows.map((row, index) => ({ page: index + 1, pageLabel: `Problem ${row.problem_number}`,
    text: `${row.problem_number}. ${row.problem_text}`, interpretation: assignmentProblemSourceState(row.source, row.unit_type).interpretation }))
  const origins = await Promise.all(rows.map(async (row, index) => Object.freeze({ taskId: row.id, ownerId, assignmentId,
    originKey: row.id, sourcePage: pages[index].page, sourceSnapshotSha256: await sha256(row.problem_text),
    pageTextSha256: await sha256(pages[index].text), sourceConfirmed: pages[index].interpretation !== 'model_extraction' })))
  return { pages, origins: Object.freeze(origins) }
}

export type TaskBindingRpc = 'learning_register_worksheet_task' | 'learning_bind_worksheet_source'
export interface TaskBindingClient {
  rpc(name: TaskBindingRpc, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}
export type WorksheetBindingResult = Readonly<{ status: 'disabled' | 'bound' | 'unresolved'; boundCount: number; unresolvedCount: number }>

/**
 * Optional migration-gated sidecar. It never changes learning_store_document or its schema.
 * SQL must independently verify current owned origin, document/page and exact source hash.
 * Partial registration is not a binding; unknown provenance or missing RPC fails closed.
 */
export async function persistWorksheetTaskOrigins(client: TaskBindingClient, document: StructuredDocument,
  index: WorksheetTaskIndex, enabled: boolean): Promise<WorksheetBindingResult> {
  if (!enabled) return { status: 'disabled', boundCount: 0, unresolvedCount: index.origins.length }
  let boundCount = 0
  for (const origin of index.origins) {
    try {
      if (!origin.sourceConfirmed || document.version.documentId !== 'assignment-problems'
        || document.version.ownerId !== origin.ownerId || document.version.assignmentId !== origin.assignmentId) continue
      const page = document.pages.find(item => item.page === origin.sourcePage)
      if (!page || page.interpretation === 'model_extraction' || await sha256(page.text) !== origin.pageTextSha256) continue
      const registered = await client.rpc('learning_register_worksheet_task', { p_assignment: origin.assignmentId,
        p_problem: origin.taskId, p_snapshot_sha256: origin.sourceSnapshotSha256 })
      const registration = z.object({ taskId: z.literal(origin.taskId), ownerId: z.literal(origin.ownerId),
        assignmentId: z.literal(origin.assignmentId), originKind: z.literal('worksheet_problem'), originKey: z.literal(origin.originKey),
        initialSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/), trustBasis: z.literal('legacy_unresolved') }).safeParse(registered.data)
      if (registered.error || !registration.success) continue
      const bound = await client.rpc('learning_bind_worksheet_source', { p_assignment: origin.assignmentId,
        p_problem: origin.taskId, p_source_version: document.version.id, p_source_page: origin.sourcePage,
        p_source_snapshot_sha256: origin.sourceSnapshotSha256 })
      const receipt = z.object({ taskId: z.literal(origin.taskId), sourceVersionId: z.literal(document.version.id),
        sourcePage: z.literal(origin.sourcePage), sourceSnapshotSha256: z.literal(origin.sourceSnapshotSha256) }).safeParse(bound.data)
      if (!bound.error && receipt.success) boundCount++
    } catch { /* Keep unknown provenance unbound, including migration-not-installed failures. */ }
  }
  return { status: boundCount === index.origins.length && boundCount > 0 ? 'bound' : 'unresolved',
    boundCount, unresolvedCount: index.origins.length - boundCount }
}
