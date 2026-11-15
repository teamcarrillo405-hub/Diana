import { createHash, randomBytes } from 'node:crypto';
import { createAiServiceClient } from '@/lib/supabase/ai-service';
import { guardStudentContent, estimateTokenReservation, type StructuredModerator } from '@/lib/ai/safety';
import { buildDianaVoiceSidecarMessages, normalizeDianaVoiceCandidateInput } from '@/lib/integrations/diana-voice-sidecar';
import { studyBuddyEligibility } from '@/lib/assignment-help/study-buddy-eligibility';
import { isAllowedWorkerQueueName } from './production-worker-tier';
import { voiceJobScope } from './voice-job-scope';
import { isWorkerOperationalErrorCode, sanitizeWorkerErrorMetadata, type WorkerJobRow } from './worker-queue';

type Client = NonNullable<ReturnType<typeof createAiServiceClient>>;
type Identity = { traceId: string; workerId: string; capability: string };
type Transition = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
export class WorkerExecutionError extends Error {
  constructor(readonly status = 409) { super('worker_execution_unavailable'); }
}
export function executionIdentity(raw: unknown): Identity {
  if (!raw || typeof raw !== 'object') throw new WorkerExecutionError(400);
  const value = raw as Record<string, unknown>;
  if (typeof value.traceId !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(value.traceId)
    || typeof value.workerId !== 'string' || !/^[a-zA-Z0-9._:-]{1,128}$/.test(value.workerId)
    || typeof value.capability !== 'string' || !/^[a-f0-9]{64}$/.test(value.capability)) {
    throw new WorkerExecutionError(400);
  }
  return { traceId: value.traceId, workerId: value.workerId, capability: value.capability };
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
async function transition(client: Client, action: string, identity: Identity, data = {}) {
  // This forward migration intentionally is not part of the frozen DB typings.
  const result = await (client.rpc as unknown as Transition)('worker_execution_transition', {
    p_action: action, p_trace_id: identity.traceId, p_worker_id: identity.workerId,
    p_capability_hash: hash(identity.capability), p_data: data,
  });
  if (result.error || !result.data || typeof result.data !== 'object') throw new WorkerExecutionError();
  return result.data as Record<string, unknown>;
}
async function eligible(client: Client, job: WorkerJobRow) {
  const scope = voiceJobScope(job.payload);
  if (job.feature !== 'diana.voice_candidate' || job.queue_mode !== 'managed_queue'
    || !isAllowedWorkerQueueName(job.queue_name) || !scope.ok) return false;
  return (await studyBuddyEligibility(client, { ownerId: job.owner_id, assignmentId: scope.assignmentId, classId: null })).ok;
}
export async function issueWorkerExecution(client: Client, traceId: string, workerId: string) {
  const identity = executionIdentity({ traceId, workerId, capability: randomBytes(32).toString('hex') });
  const result = await transition(client, 'issue', identity);
  return { traceId, capability: identity.capability, expiresAt: result.expiresAt };
}
export async function rejectWorkerClaim(client: Client, raw: unknown) {
  const result = await transition(client, 'reject', executionIdentity(raw));
  if (result.rejected !== true) throw new WorkerExecutionError();
}
export async function authorizeWorkerExecution(client: Client, raw: unknown, moderator?: StructuredModerator) {
  const identity = executionIdentity(raw);
  const job = await transition(client, 'begin', identity) as unknown as WorkerJobRow;
  if (!await eligible(client, job)) throw new WorkerExecutionError(403);
  const input = normalizeDianaVoiceCandidateInput((job.payload as { input?: unknown })?.input);
  if (!input) throw new WorkerExecutionError(400);
  const screened = await guardStudentContent({ phase: 'input', text: [input.transcript, input.learnedContext ?? ''].join('\n') }, moderator);
  if (screened) throw new WorkerExecutionError(screened.status);
  // Reserve using the exact existing sidecar messages, including injected safety policy.
  const messages = buildDianaVoiceSidecarMessages(input);
  const requestedTokens = estimateTokenReservation({ input: messages[1].content, systemPrompt: messages[0].content, maxOutputTokens: 500 });
  const permit = await transition(client, 'dispatch', identity, { requestedTokens });
  if (permit.authorized !== true) throw new WorkerExecutionError();
  const constraints = job.constraints as { budget?: { timeoutMs?: unknown } } | null;
  const timeout = constraints?.budget?.timeoutMs;
  return { input, expiresAt: permit.expiresAt, timeoutMs: typeof timeout === 'number' && Number.isFinite(timeout)
    ? Math.max(1, Math.min(30000, Math.floor(timeout))) : 30000 };
}
export async function finishWorkerExecution(client: Client, raw: unknown, moderator?: StructuredModerator) {
  const identity = executionIdentity(raw);
  const body = raw as Record<string, unknown>;
  const candidate = body.result as Record<string, unknown> | null;
  let result: Record<string, unknown>;
  if (body.status === 'succeeded') {
    if (!candidate || typeof candidate.response !== 'string' || candidate.response.length < 1 || candidate.response.length > 1200
      || candidate.provider !== 'openjarvis' || typeof candidate.model !== 'string' || !/^[a-zA-Z0-9._:/-]{1,128}$/.test(candidate.model)) {
      throw new WorkerExecutionError(400);
    }
    result = { status: 'succeeded', response: candidate.response, responseChars: candidate.response.length,
      provider: 'openjarvis', model: candidate.model, workerId: identity.workerId,
      durationMs: typeof candidate.durationMs === 'number' && Number.isFinite(candidate.durationMs)
        ? Math.max(0, Math.min(300000, Math.floor(candidate.durationMs))) : 0,
      ...(typeof candidate.imageSha === 'string' && /^[a-zA-Z0-9._:-]{1,128}$/.test(candidate.imageSha) ? { imageSha: candidate.imageSha } : {}),
    };
  } else if (body.status === 'error' && isWorkerOperationalErrorCode(body.errorCode)) {
    result = { status: 'error', errorCode: body.errorCode, errorMetadata: sanitizeWorkerErrorMetadata(body.errorMetadata) };
  } else throw new WorkerExecutionError(400);
  const completionHash = hash(JSON.stringify(result));
  const started = await transition(client, 'begin_complete', identity, { completionHash });
  if (started.replayed === true) return;
  const job = started as unknown as WorkerJobRow;
  if (!await eligible(client, job)) {
    result = { status: 'error', errorCode: 'student_eligibility_denied' };
  } else if (result.status === 'succeeded') {
    const screened = await guardStudentContent({ phase: 'output', text: result.response as string }, moderator);
    if (screened) result = { status: 'error', errorCode: screened.kind === 'screening' ? 'safety_screen_unavailable' : 'safety_output_blocked' };
  }
  const finished = await transition(client, 'finish', identity, { completionHash, result });
  if (finished.completed !== true) throw new WorkerExecutionError();
}
