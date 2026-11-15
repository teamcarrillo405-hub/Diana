import { createDianaVoiceCandidate, DianaVoiceProviderError, normalizeDianaVoiceCandidateInput,
  type DianaVoiceCandidateInput, type DianaVoiceCandidateResult } from '@/lib/integrations/diana-voice-sidecar';
import { sanitizeWorkerErrorMetadata, type WorkerErrorMetadata, type WorkerOperationalErrorCode } from './worker-protocol';

export type DianaWorkerConfig = { baseUrl: string; token: string; workerId: string; imageSha?: string; queueName: string; leaseSeconds: number };
export type ClaimedWorkerJob = { traceId: string; tenantId: string; capability: string; expiresAt: string };
export type DianaWorkerCycleResult = { status: 'idle' } | { status: 'completed'; traceId: string; tenantId: string; responseChars: number }
  | { status: 'error'; traceId: string; tenantId: string; errorCode: WorkerOperationalErrorCode; errorMetadata: WorkerErrorMetadata };
class WorkerCycleFailure extends Error {
  constructor(readonly code: WorkerOperationalErrorCode, readonly metadata: WorkerErrorMetadata = {}) { super(code); }
}
export async function claimNextWorkerJob({ config, fetchImpl = fetch }: { config: DianaWorkerConfig; fetchImpl?: typeof fetch }): Promise<ClaimedWorkerJob | null> {
  const response = await fetchImpl(new URL('/api/workers/claim', config.baseUrl), { method: 'POST', headers: workerHeaders(config.token),
    body: JSON.stringify({ queueName: config.queueName, workerId: config.workerId, leaseSeconds: config.leaseSeconds }) });
  if (!response.ok) throw new WorkerCycleFailure('worker_internal_error', { phase: 'claim', retryable: true });
  const body = await response.json();
  if (body?.ok !== true) throw new WorkerCycleFailure('invalid_job_payload', { phase: 'claim' });
  if (body.job === null) return null;
  const job = body.job;
  if (!job || typeof job.traceId !== 'string' || typeof job.tenantId !== 'string'
    || typeof job.capability !== 'string' || !/^[a-f0-9]{64}$/.test(job.capability)
    || typeof job.expiresAt !== 'string' || !Number.isFinite(Date.parse(job.expiresAt))) {
    throw new WorkerCycleFailure('invalid_job_payload', { phase: 'claim' });
  }
  return job;
}
export async function runOneDianaWorkerCycle({ config, fetchImpl = fetch,
  executeVoiceCandidate = ({ input, signal }) => createDianaVoiceCandidate({ input, signal, fetchImpl, maxOutputTokens: 500 }),
}: { config: DianaWorkerConfig; fetchImpl?: typeof fetch;
  executeVoiceCandidate?: (args: { input: DianaVoiceCandidateInput; signal?: AbortSignal }) => Promise<DianaVoiceCandidateResult>;
}): Promise<DianaWorkerCycleResult> {
  const job = await claimNextWorkerJob({ config, fetchImpl });
  if (!job) return { status: 'idle' };
  const identity = { traceId: job.traceId, workerId: config.workerId, capability: job.capability };
  const startedAt = Date.now();
  let authorized = false;
  let completing = false;
  const post = (path: string, body: unknown) => fetchImpl(new URL(path, config.baseUrl), {
    method: 'POST', headers: workerHeaders(config.token), body: JSON.stringify(body),
  });
  try {
    const response = await post('/api/workers/authorize', identity);
    if (!response.ok) throw new WorkerCycleFailure('accounting_unavailable', { phase: 'accounting', retryable: false });
    const body = await response.json();
    const input = normalizeDianaVoiceCandidateInput(body?.permit?.input);
    const expiresAt = Date.parse(body?.permit?.expiresAt);
    const timeoutMs = body?.permit?.timeoutMs;
    if (body?.ok !== true || !input || !Number.isFinite(expiresAt) || expiresAt <= Date.now()
      || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
      throw new WorkerCycleFailure('invalid_job_payload', { phase: 'input' });
    }
    authorized = true;
    // The server has screened the exact stored input and durably reserved/marked
    // this job once. Never retry authorization or the local provider in a cycle.
    const result = await runWithWorkerTimeout(signal => executeVoiceCandidate({ input, signal }), Math.min(timeoutMs, expiresAt - Date.now()));
    completing = true;
    const completed = await post('/api/workers/complete', { ...identity, status: 'succeeded', result: {
      response: result.response, provider: result.trace.provider, model: result.trace.model,
      durationMs: Date.now() - startedAt, imageSha: config.imageSha,
    } });
    if (!completed.ok) throw new WorkerCycleFailure('worker_completion_unavailable', { phase: 'completion', retryable: true });
    return { status: 'completed', traceId: job.traceId, tenantId: job.tenantId, responseChars: result.response.length };
  } catch (error) {
    const code = error instanceof WorkerCycleFailure || error instanceof DianaVoiceProviderError ? error.code : 'worker_internal_error';
    const metadata = sanitizeWorkerErrorMetadata(error instanceof WorkerCycleFailure || error instanceof DianaVoiceProviderError ? error.metadata : { phase: 'provider' });
    if (authorized && !completing) {
      const response = await post('/api/workers/complete', { ...identity, status: 'error', errorCode: code, errorMetadata: metadata });
      if (!response.ok) return { status: 'error', traceId: job.traceId, tenantId: job.tenantId,
        errorCode: 'worker_completion_unavailable', errorMetadata: { phase: 'completion', retryable: true } };
    }
    return { status: 'error', traceId: job.traceId, tenantId: job.tenantId, errorCode: code, errorMetadata: metadata };
  }
}

async function runWithWorkerTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new WorkerCycleFailure("provider_timeout", { phase: "provider", retryable: true }));
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([work(controller.signal), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function workerHeaders(token: string) {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}
