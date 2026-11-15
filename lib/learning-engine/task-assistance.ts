import { z } from 'zod'

const uuid = z.string().uuid()
const sha = z.string().regex(/^[a-f0-9]{64}$/)

/** A persisted receipt is required before substantive tutor output is released.
 * Parsing a shape alone is insufficient: callers must match the exact request scope.
 */
export const taskAssistanceScopeSchema = z.object({
  requestId: uuid,
  taskId: uuid,
  ownerId: uuid,
  assignmentId: uuid,
  sourceVersionId: sha.nullable(),
  sourceSnapshotSha256: sha,
  channel: z.enum(['local', 'api']),
  kind: z.enum(['hint', 'example', 'check', 'guide']),
}).strict()

export const taskAssistanceReceiptSchema = taskAssistanceScopeSchema.extend({
  schemaVersion: z.literal('task-assistance-v1'),
  recordedAt: z.string().datetime({ offset: true }),
  independenceBlocked: z.literal(true),
}).strict()

export type TaskAssistanceScope = z.infer<typeof taskAssistanceScopeSchema>
export type TaskAssistanceReceipt = z.infer<typeof taskAssistanceReceiptSchema>

export function verifiedTaskAssistanceReceipt(value: unknown, expected: TaskAssistanceScope): TaskAssistanceReceipt {
  const scope = taskAssistanceScopeSchema.parse(expected)
  const receipt = taskAssistanceReceiptSchema.parse(value)
  for (const key of Object.keys(scope) as (keyof TaskAssistanceScope)[]) {
    if (receipt[key] !== scope[key]) throw new Error(`Assistance receipt scope mismatch: ${key}`)
  }
  return receipt
}

/** Build only the allowlisted RPC arguments, never accepting a caller's owner
 * claim as authentication. The server obtains ownerId from its verified session.
 */
export function taskAssistanceRpcArguments(value: TaskAssistanceScope) {
  const scope = taskAssistanceScopeSchema.parse(value)
  return {
    p_owner: scope.ownerId, p_assignment: scope.assignmentId, p_task: scope.taskId,
    p_request: scope.requestId, p_source_version: scope.sourceVersionId,
    p_source_snapshot_sha256: scope.sourceSnapshotSha256, p_channel: scope.channel, p_kind: scope.kind,
  }
}
