import { z } from 'zod'
import { taskAssistanceReceiptSchema } from './task-assistance'

const uuid = z.string().uuid()
const sha = z.string().regex(/^[a-f0-9]{64}$/)
export const assignmentAssistanceScopeSchema = z.object({
  scope: z.literal('assignment'),
  requestId: uuid,
  ownerId: uuid,
  assignmentId: uuid,
  selectedProblemId: uuid.nullable(),
  payloadSha256: sha,
  channel: z.enum(['local', 'api']),
  kind: z.enum(['hint', 'example', 'check', 'guide']),
}).strict()
export const assignmentAssistanceReceiptSchema = assignmentAssistanceScopeSchema.extend({
  schemaVersion: z.literal('assignment-assistance-v1'),
  recordedAt: z.string().datetime({ offset: true }),
  independenceBlocked: z.literal(true),
}).strict()
export type AssignmentAssistanceScope = z.infer<typeof assignmentAssistanceScopeSchema>
export type AssignmentAssistanceReceipt = z.infer<typeof assignmentAssistanceReceiptSchema>

const rawReceiptSchema = z.discriminatedUnion('schemaVersion', [taskAssistanceReceiptSchema, assignmentAssistanceReceiptSchema])
/** Existing task RPC receipts are explicitly tagged by this adapter, never reinterpreted as broad help. */
export function scopedAssistanceReceipt(value: unknown) {
  const receipt = rawReceiptSchema.parse(value)
  return receipt.schemaVersion === 'task-assistance-v1'
    ? { scope: 'task' as const, receipt }
    : { scope: 'assignment' as const, receipt }
}
export type ScopedAssistanceReceipt = ReturnType<typeof scopedAssistanceReceipt>

export function verifiedAssignmentAssistanceReceipt(value: unknown, expected: AssignmentAssistanceScope): AssignmentAssistanceReceipt {
  const scope = assignmentAssistanceScopeSchema.parse(expected)
  const receipt = assignmentAssistanceReceiptSchema.parse(value)
  for (const key of Object.keys(scope) as (keyof AssignmentAssistanceScope)[]) {
    if (receipt[key] !== scope[key]) throw new Error(`Assignment assistance receipt scope mismatch: ${key}`)
  }
  return Object.freeze(receipt)
}
