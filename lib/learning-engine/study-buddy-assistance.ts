import 'server-only'
import { z } from 'zod'
import { assignmentAssistanceScopeSchema, verifiedAssignmentAssistanceReceipt,
  type AssignmentAssistanceReceipt } from './scoped-assistance-receipt'

export interface StudyBuddyAssistanceClient {
  rpc(name: 'learning_begin_assignment_assistance', args: {
    p_assignment: string; p_request: string; p_payload_sha256: string;
    p_channel: 'local' | 'api'; p_kind: 'hint' | 'example' | 'check' | 'guide'; p_selected_problem: string | null;
  }): PromiseLike<{ data: unknown; error: unknown }>
}
const identitySchema = assignmentAssistanceScopeSchema.omit({ scope: true, payloadSha256: true })
export type StudyBuddyAssistanceIdentity = z.infer<typeof identitySchema>
export type StudyBuddyAssistanceResult = Readonly<
  { status: 'disabled'; receipt: null } | { status: 'recorded'; receipt: AssignmentAssistanceReceipt }
>

/** Hash exact server-resolved context, never an answer key, bearer token or credential. */
function canonical(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return JSON.stringify(value)
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw new Error('assistance_payload_invalid')
    return `[${value.map(canonical).join(',')}]`
  }
  if (typeof value !== 'object' || value === null || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('assistance_payload_invalid')
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`
}

/**
 * Await before ANY substantive local/provider response release (and before provider dispatch).
 * Owner is supplied exclusively by the verified server session; SQL derives it from auth.uid().
 * Study Buddy sees whole-assignment context, so selectedProblemId never narrows scope.
 * The context must contain the complete effective input/configuration, including source versions.
 */
export async function recordAssignmentAssistance(client: StudyBuddyAssistanceClient,
  identity: StudyBuddyAssistanceIdentity, context: unknown): Promise<StudyBuddyAssistanceResult> {
  if (process.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED !== 'true') return { status: 'disabled', receipt: null }
  // Snapshot synchronously before hashing to prevent mutable caller context changing mid-request.
  const scopeIdentity = identitySchema.parse(identity)
  const serialized = canonical({ protocol: 'study-buddy-assignment-input-v1', ...scopeIdentity, context })
  const bytes = new TextEncoder().encode(serialized)
  if (bytes.length > 1_000_000) throw new Error('assistance_payload_too_large')
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const payloadSha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
  const expected = { scope: 'assignment' as const, ...scopeIdentity, payloadSha256 }
  try {
    const result = await client.rpc('learning_begin_assignment_assistance', {
      p_assignment: expected.assignmentId, p_request: expected.requestId, p_payload_sha256: payloadSha256,
      p_channel: expected.channel, p_kind: expected.kind, p_selected_problem: expected.selectedProblemId,
    })
    if (result.error) throw new Error('assistance_receipt_unavailable')
    return Object.freeze({ status: 'recorded', receipt: verifiedAssignmentAssistanceReceipt(result.data, expected) })
  } catch {
    // No raw database/provider error or student text enters a user-facing error/log.
    throw new Error('assistance_receipt_unavailable')
  }
}

export const recordStudyBuddyAssistance = recordAssignmentAssistance;
