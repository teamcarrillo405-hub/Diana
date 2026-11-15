import 'server-only'
import { z } from 'zod'
import type { createClient } from '@/lib/supabase/server'
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility'
import { resolveDianaHomeworkTrust } from '@/lib/ai/diana-trust-rules'
import { assignmentHelpDispatchKey, assignmentHelpRequestId } from './assignment-assistance-dispatch'
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from './study-buddy-assistance'

type Client = Awaited<ReturnType<typeof createClient>>
const uuid = z.string().uuid()
const cardSchema = z.object({ id: uuid, owner_id: uuid, front: z.string(), back: z.string(),
  source_anchor: z.string().nullable(), student_required_action: z.string().nullable(),
  source_assignment_id: uuid.nullable(), source_note_id: uuid.nullable(), source_artifact_id: uuid.nullable() })
const noteSchema = z.object({ id: uuid, owner_id: uuid, assignment_id: uuid.nullable(), class_id: uuid.nullable() })
const artifactSchema = z.object({ id: uuid, owner_id: uuid, source_type: z.enum(['assignment', 'note']), source_id: uuid })

/** Saves assistance before answers enter HTML, client props, TTS or the offline queue.
 * This records disclosure only; it does not grant or revoke FSRS review credit.
 */
export async function authorizeRecallDisclosure(client: Client, ownerId: string, cards: readonly unknown[]): Promise<void> {
  if (process.env.DIANA_DURABLE_TASK_ASSISTANCE_ENABLED !== 'true') return
  if (cards.length > 60) throw new Error('recall_source_unavailable')
  for (const input of cards) {
    const card = cardSchema.parse(input)
    if (card.owner_id !== ownerId) throw new Error('recall_source_unavailable')
    const assignments = new Set<string>(), notes = new Set<string>()
    if (card.source_assignment_id) assignments.add(card.source_assignment_id)
    if (card.source_note_id) notes.add(card.source_note_id)
    let artifact: z.infer<typeof artifactSchema> | null = null
    if (card.source_artifact_id) {
      const result = await client.from('study_artifacts').select('id,owner_id,source_type,source_id')
        .eq('id', card.source_artifact_id).eq('owner_id', ownerId).maybeSingle()
      if (result.error || !result.data) throw new Error('recall_source_unavailable')
      artifact = artifactSchema.parse(result.data)
      if (artifact.id !== card.source_artifact_id || artifact.owner_id !== ownerId) throw new Error('recall_source_unavailable')
      if (artifact.source_type === 'assignment') assignments.add(artifact.source_id)
      else notes.add(artifact.source_id)
    }
    const resolvedNotes: z.infer<typeof noteSchema>[] = []
    for (const noteId of [...notes].sort()) {
      const result = await client.from('notes').select('id,owner_id,assignment_id,class_id')
        .eq('id', noteId).eq('owner_id', ownerId).maybeSingle()
      if (result.error || !result.data) throw new Error('recall_source_unavailable')
      const note = noteSchema.parse(result.data)
      if (note.id !== noteId || note.owner_id !== ownerId) throw new Error('recall_source_unavailable')
      resolvedNotes.push(note)
      if (note.assignment_id) assignments.add(note.assignment_id)
      else if (note.class_id) {
        const course = await client.from('classes').select('id,ai_mode').eq('id', note.class_id)
          .eq('owner_id', ownerId).maybeSingle()
        if (course.error || !course.data || course.data.id !== note.class_id ||
          !resolveDianaHomeworkTrust({ classAiMode: course.data.ai_mode }).allowed) throw new Error('recall_source_unavailable')
      }
    }
    // Conflicting historical links require repair; never silently select a convenient origin.
    if (assignments.size > 1 || notes.size > 1) throw new Error('recall_source_unavailable')
    const assignmentId = [...assignments][0]
    if (!assignmentId) continue // Verified general card or general/class-only note.
    if (!(await studyBuddyEligibility(client, { ownerId, assignmentId, classId: null })).ok) throw new Error('recall_source_unavailable')
    const result = await client.from('assignments').select('id,owner_id,class_id,ai_mode_override')
      .eq('id', assignmentId).eq('owner_id', ownerId).maybeSingle()
    const assignment = result.data
    if (result.error || !assignment || assignment.id !== assignmentId || assignment.owner_id !== ownerId) throw new Error('recall_source_unavailable')
    let classAiMode: string | null = null
    if (assignment.class_id) {
      const course = await client.from('classes').select('id,ai_mode').eq('id', assignment.class_id)
        .eq('owner_id', ownerId).maybeSingle()
      if (course.error || !course.data || course.data.id !== assignment.class_id) throw new Error('recall_source_unavailable')
      classAiMode = course.data.ai_mode
    }
    const policy = resolveDianaHomeworkTrust({ classAiMode, assignmentAiModeOverride: assignment.ai_mode_override })
    if (!policy.allowed || policy.aiMode !== 'green') throw new Error('recall_source_unavailable')
    const snapshot = { surface: 'recall-disclosure', card, artifact, notes: resolvedNotes,
      assignmentId, policy }
    const key = assignmentHelpDispatchKey('recall-disclosure', ownerId, snapshot)
    await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient, {
      ownerId, assignmentId, requestId: assignmentHelpRequestId(key), selectedProblemId: null,
      channel: 'local', kind: 'guide',
    }, snapshot)
  }
}
