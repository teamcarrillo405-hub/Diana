import 'server-only'
import { z } from 'zod'
import type { createClient } from '@/lib/supabase/server'
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility'
import { resolveDianaHomeworkTrust } from '@/lib/ai/diana-trust-rules'
import { assignmentDispatchSnapshot, assignmentHelpDispatchKey, assignmentHelpRequestId } from './assignment-assistance-dispatch'
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from './study-buddy-assistance'

type Client = Awaited<ReturnType<typeof createClient>>
const identitySchema = z.object({ id: z.string().uuid(), owner_id: z.string().uuid(),
  source_type: z.enum(['assignment', 'note']), source_id: z.string().uuid() })
const noteSchema = z.object({ id: z.string().uuid(), owner_id: z.string().uuid(),
  assignment_id: z.string().uuid().nullable(), class_id: z.string().uuid().nullable() })

/** Await before serializing any saved guide, hint, answer or flashcard to a client. */
export async function authorizeSavedArtifactDisclosure(client: Client, ownerId: string,
  row: { id: string; owner_id: string; source_type: string; source_id: string }, disclosedPayload: unknown,
): Promise<{ assignmentId: string | null }> {
  const artifact = identitySchema.parse(row)
  if (artifact.owner_id !== ownerId) throw new Error('saved_artifact_unavailable')
  let assignmentId: string | null = artifact.source_type === 'assignment' ? artifact.source_id : null
  let note: z.infer<typeof noteSchema> | null = null
  if (artifact.source_type === 'note') {
    const result = await client.from('notes').select('id,owner_id,assignment_id,class_id')
      .eq('id', artifact.source_id).eq('owner_id', ownerId).maybeSingle()
    if (result.error || !result.data) throw new Error('saved_artifact_unavailable')
    note = noteSchema.parse(result.data)
    if (note.id !== artifact.source_id || note.owner_id !== ownerId) throw new Error('saved_artifact_unavailable')
    assignmentId = note.assignment_id
  }
  let policy = resolveDianaHomeworkTrust()
  if (assignmentId) {
    if (process.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED === 'true' &&
        !(await studyBuddyEligibility(client, { ownerId, assignmentId, classId: null })).ok) throw new Error('saved_artifact_unavailable')
    const result = await client.from('assignments').select('id,owner_id,class_id,ai_mode_override')
      .eq('id', assignmentId).eq('owner_id', ownerId).maybeSingle()
    const assignment = result.data
    if (result.error || !assignment || assignment.id !== assignmentId || assignment.owner_id !== ownerId) throw new Error('saved_artifact_unavailable')
    let classAiMode: string | null = null
    if (assignment.class_id) {
      const course = await client.from('classes').select('id,ai_mode').eq('id', assignment.class_id)
        .eq('owner_id', ownerId).maybeSingle()
      if (course.error || !course.data || course.data.id !== assignment.class_id) throw new Error('saved_artifact_unavailable')
      classAiMode = course.data.ai_mode
    }
    policy = resolveDianaHomeworkTrust({ classAiMode, assignmentAiModeOverride: assignment.ai_mode_override })
  } else if (note?.class_id) {
    const course = await client.from('classes').select('id,ai_mode').eq('id', note.class_id)
      .eq('owner_id', ownerId).maybeSingle()
    if (course.error || !course.data || course.data.id !== note.class_id) throw new Error('saved_artifact_unavailable')
    policy = resolveDianaHomeworkTrust({ classAiMode: course.data.ai_mode })
  }
  if (!policy.allowed || policy.aiMode !== 'green') throw new Error('saved_artifact_unavailable')
  if (assignmentId) {
    const snapshot = assignmentDispatchSnapshot({ surface: 'saved-artifact-disclosure', artifact, note,
      assignmentId, policy, disclosedPayload })
    const key = assignmentHelpDispatchKey('saved-artifact-disclosure', ownerId, snapshot)
    await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient, {
      ownerId, assignmentId, requestId: assignmentHelpRequestId(key), selectedProblemId: null,
      channel: 'local', kind: 'guide',
    }, snapshot)
  }
  return { assignmentId }
}
