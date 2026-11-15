import 'server-only';
import { z } from 'zod';
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility';
import { assignmentDispatchSnapshot, assignmentHelpDispatchKey, assignmentHelpRequestId } from './assignment-assistance-dispatch';
import { recordAssignmentAssistance, type StudyBuddyAssistanceClient } from './study-buddy-assistance';

const scopeSchema = z.object({ assignmentId: z.string().uuid().nullable().optional() });
type Client = Parameters<typeof studyBuddyEligibility>[0];
export class TodayAssistanceError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** Only explicit IDs enter this boundary. Today ordering and titles never select scope. */
export async function authorizeTodayAcademicScope(client: Client, ownerId: string, raw: unknown) {
  const parsed = scopeSchema.safeParse(raw);
  if (!parsed.success) throw new TodayAssistanceError(400, 'Choose a valid assignment for this question.');
  const assignmentId = parsed.data.assignmentId ?? null;
  const eligibility = await studyBuddyEligibility(client, { ownerId, assignmentId, classId: null });
  if (!eligibility.ok) throw new TodayAssistanceError(eligibility.status, eligibility.error);
  return assignmentId;
}

export async function recordTodayAcademicAssistance(client: Client & { rpc: unknown }, input: {
  ownerId: string; assignmentId: string | null; surface: 'today-complex' | 'today-search' | 'today-realtime';
  callId: string; recipe: unknown;
}) {
  const context = assignmentDispatchSnapshot({ surface: input.surface, recipe: input.recipe });
  const key = assignmentHelpDispatchKey(input.surface, input.ownerId, context, input.callId);
  // The additive receipt RPC is deliberately isolated from generated database types.
  if (input.assignmentId) await recordAssignmentAssistance(client as unknown as StudyBuddyAssistanceClient, {
    ownerId: input.ownerId, assignmentId: input.assignmentId, requestId: assignmentHelpRequestId(key),
    selectedProblemId: null, channel: 'api', kind: 'guide',
  }, context);
  return key;
}
