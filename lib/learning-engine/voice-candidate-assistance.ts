import 'server-only'
import { createHash } from 'node:crypto'
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from './study-buddy-assistance'

/** An assignment-linked candidate counts as broad assistance. Persist before
 * enqueue/inline dispatch and again before releasing older queued results.
 * Phase namespaces prevent a release observation conflicting with dispatch.
 */
export async function recordVoiceCandidateAssistance(client: StudyBuddyAssistanceClient, input: {
  ownerId: string; assignmentId: string | null; phase: 'dispatch' | 'release'; key: string; context: unknown
}) {
  if (!input.assignmentId) return null
  const hash = createHash('sha256').update(JSON.stringify(['voice-assistance-v1', input.ownerId, input.phase, input.key])).digest('hex')
  const variant = ((parseInt(hash[16], 16) & 3) | 8).toString(16)
  const requestId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${variant}${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  return recordAssignmentAssistance(client, { ownerId: input.ownerId, assignmentId: input.assignmentId,
    requestId, selectedProblemId: null, channel: 'local', kind: 'guide' },
  JSON.parse(JSON.stringify({ version: 'voice-assistance-v1', phase: input.phase, context: input.context })))
}
