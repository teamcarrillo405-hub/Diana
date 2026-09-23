import {
  createDianaVoiceCandidate,
  createDianaVoiceCandidateAuditPayload,
  DianaVoiceProviderError,
  normalizeDianaVoiceCandidateInput,
  type DianaVoiceCandidateInput,
  type DianaVoiceCandidateResult,
} from "@/lib/integrations/diana-voice-sidecar";
import {
  runSafeBudgetedAiCall,
  type AiGuardFailure,
  type StructuredModerator,
} from "@/lib/ai/safety";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";
import {
  sanitizeWorkerErrorMetadata,
  type WorkerErrorMetadata,
  type WorkerOperationalErrorCode,
} from "./worker-queue";

export type DianaWorkerConfig = {
  baseUrl: string;
  token: string;
  workerId: string;
  imageSha?: string;
  queueName: string;
  leaseSeconds: number;
};

export type ClaimedWorkerJob = {
  traceId: string;
  tenantId: string;
  ownerId: string;
  feature: string;
  payload: unknown;
  constraints: unknown;
};

type ExecuteVoiceCandidate = (args: {
  input: DianaVoiceCandidateInput;
  signal?: AbortSignal;
}) => Promise<DianaVoiceCandidateResult>;

type AiServiceClient = NonNullable<ReturnType<typeof createAiServiceClient>>;

export type DianaWorkerCycleResult =
  | { status: "idle" }
  | { status: "completed"; traceId: string; tenantId: string; responseChars: number }
  | {
      status: "error";
      traceId: string;
      tenantId: string;
      errorCode: WorkerOperationalErrorCode;
      errorMetadata: WorkerErrorMetadata;
    };

class WorkerCycleFailure extends Error {
  readonly code: WorkerOperationalErrorCode;
  readonly metadata: WorkerErrorMetadata;

  constructor(code: WorkerOperationalErrorCode, metadata: WorkerErrorMetadata = {}) {
    super(code);
    this.name = "WorkerCycleFailure";
    this.code = code;
    this.metadata = sanitizeWorkerErrorMetadata(metadata);
  }
}

export async function runOneDianaWorkerCycle({
  config,
  fetchImpl = fetch,
  executeVoiceCandidate = ({ input, signal }) => createDianaVoiceCandidate({ input, fetchImpl, signal }),
  serviceClient = createAiServiceClient(),
  moderator,
}: {
  config: DianaWorkerConfig;
  fetchImpl?: typeof fetch;
  executeVoiceCandidate?: ExecuteVoiceCandidate;
  serviceClient?: AiServiceClient | null;
  moderator?: StructuredModerator;
}): Promise<DianaWorkerCycleResult> {
  const claimed = await claimNextWorkerJob({ config, fetchImpl });
  if (!claimed) return { status: "idle" };

  const startedAt = Date.now();
  let providerInvoked = false;
  let completionAttempted = false;
  try {
    if (claimed.feature !== "diana.voice_candidate") {
      throw new WorkerCycleFailure("unsupported_feature", { phase: "claim" });
    }

    const input = normalizeClaimedVoiceCandidateInput(claimed.payload);
    if (!input) {
      throw new WorkerCycleFailure("invalid_job_payload", { phase: "input" });
    }
    if (!serviceClient) {
      throw new WorkerCycleFailure("accounting_unavailable", { phase: "accounting", retryable: true });
    }

    const guarded = await runSafeBudgetedAiCall({
      ownerId: claimed.ownerId,
      supabase: serviceClient,
      input: [input.transcript, input.learnedContext ?? ""],
      systemPrompt: "Return one safe, student-owned next move. Never provide final homework or actionable harm.",
      maxOutputTokens: 500,
      idempotencyKey: `worker:${claimed.traceId}`.slice(0, 128),
      invoke: () => {
        providerInvoked = true;
        return runWithWorkerTimeout(
          (signal) => executeVoiceCandidate({ input, signal }),
          extractWorkerTimeoutMs(claimed.constraints),
        );
      },
      getOutput: (value) => value.response,
      ...(moderator ? { moderator } : {}),
    });
    if (!guarded.ok) {
      throw guardFailure(guarded, providerInvoked);
    }

    const result = guarded.value;
    const durationMs = Date.now() - startedAt;
    await recordManagedVoiceMetadata({
      client: serviceClient,
      claimed,
      input,
      result,
      workerId: config.workerId,
      imageSha: config.imageSha,
      durationMs,
    });

    completionAttempted = true;
    await completeWorkerJobViaApi({
      config,
      fetchImpl,
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      status: "succeeded",
      result: {
        response: result.response,
        responseChars: result.response.length,
        provider: result.trace.provider,
        model: result.trace.model,
        workerId: config.workerId,
        imageSha: config.imageSha,
        durationMs,
      },
    });

    return {
      status: "completed",
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      responseChars: result.response.length,
    };
  } catch (error) {
    const failure = operationalFailure(error, providerInvoked, completionAttempted);
    if (!completionAttempted) {
      await completeWorkerJobViaApi({
        config,
        fetchImpl,
        traceId: claimed.traceId,
        tenantId: claimed.tenantId,
        status: "error",
        errorCode: failure.code,
        errorMetadata: failure.metadata,
      });
    }
    return {
      status: "error",
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      errorCode: failure.code,
      errorMetadata: failure.metadata,
    };
  }
}

export async function claimNextWorkerJob({
  config,
  fetchImpl = fetch,
}: {
  config: DianaWorkerConfig;
  fetchImpl?: typeof fetch;
}): Promise<ClaimedWorkerJob | null> {
  const response = await fetchImpl(new URL("/api/workers/claim", config.baseUrl), {
    method: "POST",
    headers: workerHeaders(config.token),
    body: JSON.stringify({
      queueName: config.queueName,
      workerId: config.workerId,
      leaseSeconds: config.leaseSeconds,
    }),
  });
  if (!response.ok) throw new WorkerCycleFailure("worker_internal_error", { phase: "claim", retryable: true });

  const json = await response.json().catch(() => null) as {
    ok?: boolean;
    job?: {
      traceId?: unknown;
      tenantId?: unknown;
      ownerId?: unknown;
      feature?: unknown;
      payload?: unknown;
      constraints?: unknown;
    } | null;
  } | null;
  if (!json?.ok || !json.job) return null;
  if (
    typeof json.job.traceId !== "string" ||
    typeof json.job.tenantId !== "string" ||
    typeof json.job.ownerId !== "string" ||
    typeof json.job.feature !== "string"
  ) {
    throw new WorkerCycleFailure("invalid_job_payload", { phase: "claim" });
  }
  return {
    traceId: json.job.traceId,
    tenantId: json.job.tenantId,
    ownerId: json.job.ownerId,
    feature: json.job.feature,
    payload: json.job.payload,
    constraints: json.job.constraints,
  };
}

async function completeWorkerJobViaApi({
  config,
  fetchImpl,
  traceId,
  tenantId,
  status,
  result,
  errorCode,
  errorMetadata,
}: {
  config: DianaWorkerConfig;
  fetchImpl: typeof fetch;
  traceId: string;
  tenantId: string;
  status: "succeeded" | "error";
  result?: {
    response?: string;
    responseChars: number;
    provider: DianaVoiceCandidateResult["trace"]["provider"];
    model: string;
    workerId: string;
    imageSha?: string;
    durationMs: number;
  };
  errorCode?: WorkerOperationalErrorCode;
  errorMetadata?: WorkerErrorMetadata;
}) {
  const response = await fetchImpl(new URL("/api/workers/complete", config.baseUrl), {
    method: "POST",
    headers: workerHeaders(config.token),
    body: JSON.stringify({ traceId, tenantId, status, result, errorCode, errorMetadata }),
  });
  if (!response.ok) {
    throw new WorkerCycleFailure("worker_completion_unavailable", {
      phase: "completion",
      httpStatus: response.status,
      retryable: true,
    });
  }
}

async function recordManagedVoiceMetadata({
  client,
  claimed,
  input,
  result,
  workerId,
  imageSha,
  durationMs,
}: {
  client: AiServiceClient;
  claimed: ClaimedWorkerJob;
  input: DianaVoiceCandidateInput;
  result: DianaVoiceCandidateResult;
  workerId: string;
  imageSha?: string;
  durationMs: number;
}) {
  const sessionId = sessionIdFromPayload(claimed.payload);
  const auditPayload = createDianaVoiceCandidateAuditPayload(input, result);
  let authorshipError: unknown;
  try {
    ({ error: authorshipError } = await client.from("authorship_log").insert({
      owner_id: claimed.ownerId,
      assignment_id: input.assignmentId ?? null,
      actor: "diana",
      event_type: "local_voice_candidate",
      payload: {
        ...auditPayload,
        workerJob: {
          traceId: claimed.traceId,
          feature: claimed.feature,
          queueMode: "managed_queue",
          tenantId: claimed.tenantId,
          sessionId,
          workerId: workerId.slice(0, 128),
          imageSha: imageSha?.slice(0, 128),
          durationMs: Math.max(0, Math.min(300_000, Math.floor(durationMs))),
        },
      } as unknown as Json,
    }));
  } catch {
    authorshipError = true;
  }
  if (authorshipError) {
    throw new WorkerCycleFailure("audit_write_unavailable", { phase: "audit", retryable: true });
  }

  const inputBytes = new TextEncoder().encode(input.transcript).byteLength;
  const outputBytes = new TextEncoder().encode(result.response).byteLength;
  let interactionError: unknown;
  try {
    ({ error: interactionError } = await client.from("ai_interactions").insert({
      owner_id: claimed.ownerId,
      assignment_id: input.assignmentId ?? null,
      feature: "voice_candidate",
      model: result.trace.model.slice(0, 128),
      prompt_summary: [
        "feature=voice_candidate",
        `correlation_id=${safeIdentifier(claimed.traceId)}`,
        `input_bytes=${Math.min(10_000_000, inputBytes)}`,
        `output_bytes=${Math.min(10_000_000, outputBytes)}`,
      ].join(";"),
      tokens_used: Math.max(1, Math.ceil((inputBytes + outputBytes) / 4)),
    }));
  } catch {
    interactionError = true;
  }
  if (interactionError) {
    throw new WorkerCycleFailure("audit_write_unavailable", { phase: "audit", retryable: true });
  }
}

function guardFailure(failure: AiGuardFailure, providerInvoked: boolean): WorkerCycleFailure {
  if (failure.kind === "budget") {
    return new WorkerCycleFailure("budget_exhausted", { phase: "accounting" });
  }
  if (failure.kind === "accounting") {
    return new WorkerCycleFailure(
      failure.code === "provider_start_not_recorded"
        ? "provider_start_not_recorded"
        : "accounting_unavailable",
      { phase: "accounting", retryable: true },
    );
  }
  if (failure.kind === "screening") {
    return new WorkerCycleFailure("safety_screen_unavailable", {
      phase: providerInvoked ? "output" : "input",
      retryable: true,
    });
  }
  return new WorkerCycleFailure(
    providerInvoked ? "safety_output_blocked" : "safety_input_blocked",
    { phase: providerInvoked ? "output" : "input" },
  );
}

function operationalFailure(
  error: unknown,
  providerInvoked: boolean,
  completionAttempted: boolean,
): WorkerCycleFailure {
  if (error instanceof WorkerCycleFailure) return error;
  if (error instanceof DianaVoiceProviderError) {
    return new WorkerCycleFailure(error.code, { phase: "provider", ...error.metadata, retryable: true });
  }
  if (completionAttempted) {
    return new WorkerCycleFailure("worker_completion_unavailable", { phase: "completion", retryable: true });
  }
  if (providerInvoked) {
    return new WorkerCycleFailure("settlement_reconciliation_pending", { phase: "settlement", retryable: true });
  }
  return new WorkerCycleFailure("worker_internal_error", { phase: "input", retryable: true });
}

function normalizeClaimedVoiceCandidateInput(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  return normalizeDianaVoiceCandidateInput((payload as { input?: unknown }).input);
}

function sessionIdFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "voice-session";
  const value = (payload as { sessionId?: unknown }).sessionId;
  return typeof value === "string" && /^[a-z0-9._:-]{1,128}$/iu.test(value)
    ? value
    : "voice-session";
}

function safeIdentifier(value: string): string {
  const safe = value.trim().slice(0, 64);
  return /^[a-z0-9._:-]+$/iu.test(safe) ? safe : "unavailable";
}

function extractWorkerTimeoutMs(constraints: unknown): number {
  if (!constraints || typeof constraints !== "object") return 30_000;
  const budget = (constraints as { budget?: unknown }).budget;
  if (!budget || typeof budget !== "object") return 30_000;
  const timeoutMs = (budget as { timeoutMs?: unknown }).timeoutMs;
  if (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs)) return 30_000;
  return Math.max(1, Math.min(30_000, Math.floor(timeoutMs)));
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
