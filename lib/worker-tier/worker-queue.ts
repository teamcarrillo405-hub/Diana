import { createServiceClient } from "@/lib/supabase/service";
import type { Json, Tables, TablesInsert } from "@/lib/supabase/types";
import type { DianaVoiceCandidateInput } from "@/lib/integrations/diana-voice-sidecar";
import type {
  ProductionWorkerJob,
  WorkerFeature,
  WorkerJobStatus,
  WorkerRateLimitPolicy,
} from "./production-worker-tier";
import { VOICE_CANDIDATE_RATE_LIMIT } from "./production-worker-tier";

type WorkerQueueClient = NonNullable<ReturnType<typeof createServiceClient>>;

export type WorkerJobRow = Tables<"worker_jobs">;

export type WorkerJobResultPayload = {
  response?: string;
  responseChars?: number;
  provider?: string;
  model?: string;
  workerId?: string;
  durationMs?: number;
  status: Extract<WorkerJobStatus, "succeeded" | "error" | "rate_limited">;
};

export type WorkerRateLimitScope = "student" | "tenant" | "feature";

export type ReservedWorkerRateLimit = {
  allowed: boolean;
  count: number;
  remaining: number;
  resetAt: string;
};

export class WorkerJobTenantScopeError extends Error {
  constructor(message = "Worker job did not match a tenant-scoped job.") {
    super(message);
    this.name = "WorkerJobTenantScopeError";
  }
}

export function createWorkerJobInsert(
  job: ProductionWorkerJob<DianaVoiceCandidateInput>,
  status: Extract<WorkerJobStatus, "queued" | "running" | "rate_limited"> = "queued",
): TablesInsert<"worker_jobs"> {
  const now = new Date().toISOString();
  return {
    tenant_id: job.tenantId,
    owner_id: job.studentId,
    feature: job.feature,
    queue_name: job.queueName,
    queue_mode: job.queueMode,
    status,
    trace_id: job.traceId,
    idempotency_key: job.idempotencyKey,
    input_summary: {
      source: job.input.source,
      transcriptChars: job.input.transcript.length,
      hasAssignmentId: Boolean(job.input.assignmentId),
    } satisfies Json,
    payload: {
      input: job.input,
      sessionId: job.sessionId,
    } as unknown as Json,
    constraints: job.constraints as unknown as Json,
    observability: job.observability as unknown as Json,
    attempts: status === "running" ? 1 : 0,
    available_at: now,
    started_at: status === "running" ? now : null,
    locked_at: status === "running" ? now : null,
    locked_until: status === "running"
      ? new Date(Date.now() + job.constraints.budget.timeoutMs).toISOString()
      : null,
    locked_by: status === "running" ? "diana-inline-worker" : null,
  };
}

export async function enqueueWorkerJob(
  job: ProductionWorkerJob<DianaVoiceCandidateInput>,
  status: Extract<WorkerJobStatus, "queued" | "running" | "rate_limited"> = "queued",
  client: WorkerQueueClient | null = createServiceClient(),
): Promise<WorkerJobRow> {
  if (!client) throw new Error("Worker queue service client is unavailable.");
  const { data, error } = await client
    .from("worker_jobs")
    .insert(createWorkerJobInsert(job, status))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Worker job could not be enqueued.");
  }
  return data;
}

export async function claimWorkerJob({
  queueName,
  workerId,
  leaseSeconds = 60,
  client = createServiceClient(),
}: {
  queueName: string;
  workerId: string;
  leaseSeconds?: number;
  client?: WorkerQueueClient | null;
}): Promise<WorkerJobRow | null> {
  if (!client) throw new Error("Worker queue service client is unavailable.");
  const { data, error } = await client.rpc("claim_worker_job", {
    requested_queue_name: queueName,
    worker_id: workerId,
    lease_seconds: leaseSeconds,
  });
  if (error) throw new Error(error.message);
  if (!data?.trace_id) return null;
  return data;
}

export async function reserveWorkerRateLimit({
  tenantId,
  ownerId,
  feature = VOICE_CANDIDATE_RATE_LIMIT.feature,
  scope = "student",
  policy = VOICE_CANDIDATE_RATE_LIMIT,
  client = createServiceClient(),
}: {
  tenantId: string;
  ownerId: string;
  feature?: WorkerFeature;
  scope?: WorkerRateLimitScope;
  policy?: WorkerRateLimitPolicy;
  client?: WorkerQueueClient | null;
}): Promise<ReservedWorkerRateLimit> {
  if (!client) throw new Error("Worker queue service client is unavailable.");
  const { data, error } = await client.rpc("reserve_worker_rate_limit", {
    requested_tenant_id: tenantId,
    requested_owner_id: ownerId,
    requested_feature: feature,
    requested_scope: scope,
    window_seconds: Math.max(1, Math.ceil(policy.windowMs / 1000)),
    max_count: policy.maxPerWindow,
  });
  if (error) throw new Error(error.message);
  const decision = Array.isArray(data) ? data[0] : data;
  if (!decision) throw new Error("Worker rate limit could not be reserved.");
  return {
    allowed: decision.allowed,
    count: decision.count,
    remaining: decision.remaining,
    resetAt: decision.reset_at,
  };
}

export async function completeWorkerJob({
  traceId,
  tenantId,
  result,
  client = createServiceClient(),
}: {
  traceId: string;
  tenantId?: string;
  result: WorkerJobResultPayload;
  client?: WorkerQueueClient | null;
}): Promise<void> {
  if (!client) throw new Error("Worker queue service client is unavailable.");
  let query = client
    .from("worker_jobs")
    .update({
      status: result.status,
      result_payload: {
        ...result,
        response: result.response?.slice(0, 1200),
      } as unknown as Json,
      completed_at: new Date().toISOString(),
      locked_until: null,
      locked_by: null,
    })
    .eq("trace_id", traceId);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query.select("trace_id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new WorkerJobTenantScopeError("Worker job completion did not match a tenant-scoped job.");
}

export async function markWorkerJobError({
  traceId,
  tenantId,
  errorSummary,
  client = createServiceClient(),
}: {
  traceId: string;
  tenantId?: string;
  errorSummary: string;
  client?: WorkerQueueClient | null;
}): Promise<void> {
  if (!client) throw new Error("Worker queue service client is unavailable.");
  let query = client
    .from("worker_jobs")
    .update({
      status: "error",
      error_summary: errorSummary.slice(0, 500),
      completed_at: new Date().toISOString(),
      locked_until: null,
      locked_by: null,
    })
    .eq("trace_id", traceId);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query.select("trace_id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new WorkerJobTenantScopeError("Worker job error update did not match a tenant-scoped job.");
}
