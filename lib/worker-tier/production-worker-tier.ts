import {
  STUDENT_RUNTIME_READ_TOOLS,
  STUDENT_RUNTIME_WRITE_TOOLS,
  type DianaPolicyMode,
  type DianaToolName,
} from "@/lib/integrations/command-center-contract";
import type { DianaVoiceCandidateInput } from "@/lib/integrations/diana-voice-sidecar";

export type WorkerFeature = "diana.voice_candidate";
export type WorkerQueueMode = "inline" | "managed_queue";
export type WorkerJobStatus = "queued" | "running" | "succeeded" | "error" | "rate_limited";

export type WorkerBudget = {
  maxCostCents: number;
  timeoutMs: number;
};

export type ProductionWorkerJob<Input> = {
  id: string;
  traceId: string;
  idempotencyKey: string;
  feature: WorkerFeature;
  queueName: string;
  queueMode: WorkerQueueMode;
  tenantId: string;
  studentId: string;
  sessionId: string;
  input: Input;
  constraints: {
    policyMode: DianaPolicyMode;
    readOnly: boolean;
    allowedDianaTools: readonly DianaToolName[];
    budget: WorkerBudget;
    backendVisibleToStudent: false;
  };
  observability: {
    enqueuedAt: string;
    traceId: string;
    feature: WorkerFeature;
    queueName: string;
    queueMode: WorkerQueueMode;
    tenantScoped: true;
  };
};

export type PublicWorkerTrace = {
  traceId: string;
  queueMode: WorkerQueueMode;
  policyMode: "student_runtime";
  readOnly: true;
};

export type WorkerRateLimitPolicy = {
  feature: WorkerFeature;
  maxPerWindow: number;
  windowMs: number;
};

export type WorkerRateLimitDecision = {
  allowed: boolean;
  remaining: number;
  resetAt: string;
};

export const VOICE_CANDIDATE_QUEUE = "student-ai-candidate";
export const VOICE_CANDIDATE_SMOKE_QUEUE = "student-ai-candidate-smoke";
const SMOKE_QUEUE_PATTERN = /^student-ai-candidate-smoke-[a-z0-9-]{4,80}$/;

const DEFAULT_VOICE_BUDGET: WorkerBudget = {
  maxCostCents: 2,
  timeoutMs: 30_000,
};

export const VOICE_CANDIDATE_RATE_LIMIT: WorkerRateLimitPolicy = {
  feature: "diana.voice_candidate",
  maxPerWindow: 12,
  windowMs: 60_000,
};

export function createWorkerTraceId(now = Date.now()): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `dw-${now.toString(36)}-${random}`;
}

export function personalTenantId(studentId: string): string {
  return `personal:${studentId}`;
}

export function resolveVoiceCandidateQueueMode({
  tenantId,
  env = process.env,
}: {
  tenantId?: string;
  env?: NodeJS.ProcessEnv;
} = {}): WorkerQueueMode {
  if (tenantId && tenantListIncludes(env.DIANA_VOICE_INLINE_QUEUE_TENANTS, tenantId)) {
    return "inline";
  }
  if (env.DIANA_VOICE_QUEUE_MODE === "managed_queue") {
    return "managed_queue";
  }
  if (tenantId && tenantListIncludes(env.DIANA_VOICE_MANAGED_QUEUE_TENANTS, tenantId)) {
    return "managed_queue";
  }
  return "inline";
}

export function isAllowedWorkerQueueName(queueName: string): boolean {
  return queueName === VOICE_CANDIDATE_QUEUE ||
    queueName === VOICE_CANDIDATE_SMOKE_QUEUE ||
    SMOKE_QUEUE_PATTERN.test(queueName);
}

export function createVoiceCandidateWorkerJob({
  input,
  studentId,
  tenantId = personalTenantId(studentId),
  sessionId = "voice-session",
  queueMode = "inline",
  queueName = VOICE_CANDIDATE_QUEUE,
  now = new Date(),
  traceId = createWorkerTraceId(now.getTime()),
  budget = DEFAULT_VOICE_BUDGET,
  idempotencyKey,
}: {
  input: DianaVoiceCandidateInput;
  studentId: string;
  tenantId?: string;
  sessionId?: string;
  queueMode?: WorkerQueueMode;
  queueName?: string;
  now?: Date;
  traceId?: string;
  budget?: WorkerBudget;
  idempotencyKey?: string;
}): ProductionWorkerJob<DianaVoiceCandidateInput> {
  const stableInputKey = [
    input.source,
    input.assignmentId ?? "none",
    input.transcript.length,
    input.transcript.slice(0, 80),
  ].join(":");

  return {
    id: `job-${traceId}`,
    traceId,
    feature: "diana.voice_candidate",
    queueName,
    queueMode,
    tenantId,
    studentId,
    sessionId,
    input,
    idempotencyKey: idempotencyKey ?? `${tenantId}:${studentId}:diana.voice_candidate:${stableInputKey}:${traceId}`,
    constraints: {
      policyMode: "student_runtime",
      readOnly: true,
      allowedDianaTools: STUDENT_RUNTIME_READ_TOOLS,
      budget,
      backendVisibleToStudent: false,
    },
    observability: {
      enqueuedAt: now.toISOString(),
      traceId,
      feature: "diana.voice_candidate",
      queueName,
      queueMode,
      tenantScoped: true,
    },
  };
}

export function productionWorkerBoundaryIssues(job: ProductionWorkerJob<unknown>): string[] {
  const issues: string[] = [];
  if (!job.tenantId.trim()) issues.push("Worker jobs require a tenant id.");
  if (!job.studentId.trim()) issues.push("Worker jobs require a student id.");
  if (!job.traceId.trim()) issues.push("Worker jobs require a trace id.");
  if (!job.queueName.trim()) issues.push("Worker jobs require a queue name.");
  if (job.constraints.policyMode !== "student_runtime") issues.push("Student worker jobs must use student_runtime policy.");
  if (job.constraints.readOnly !== true) issues.push("Voice candidate jobs must be read-only.");
  if (job.constraints.backendVisibleToStudent !== false) issues.push("Backend worker details must not be browser-visible.");
  if (job.observability.tenantScoped !== true) issues.push("Worker observability must be tenant scoped.");
  if (job.constraints.budget.timeoutMs < 1 || job.constraints.budget.timeoutMs > 30_000) {
    issues.push("Voice candidate worker timeout must be between 1ms and 30000ms.");
  }
  if (job.constraints.budget.maxCostCents < 0 || job.constraints.budget.maxCostCents > 10) {
    issues.push("Voice candidate worker budget must stay within the student-runtime cap.");
  }

  const writeTools = new Set<DianaToolName>(STUDENT_RUNTIME_WRITE_TOOLS);
  for (const tool of job.constraints.allowedDianaTools) {
    if (writeTools.has(tool)) {
      issues.push(`Read-only worker job cannot allow write tool ${tool}.`);
    }
  }
  if (job.constraints.allowedDianaTools.length === 0) {
    issues.push("Worker jobs require explicit Diana tools.");
  }
  return issues;
}

export function assertProductionWorkerBoundary(job: ProductionWorkerJob<unknown>) {
  const issues = productionWorkerBoundaryIssues(job);
  if (issues.length > 0) {
    throw new Error(`Production worker boundary issue: ${issues.join("; ")}`);
  }
}

export function evaluateWorkerRateLimit({
  countInWindow,
  now = new Date(),
  policy = VOICE_CANDIDATE_RATE_LIMIT,
}: {
  countInWindow: number;
  now?: Date;
  policy?: WorkerRateLimitPolicy;
}): WorkerRateLimitDecision {
  const remaining = Math.max(0, policy.maxPerWindow - countInWindow - 1);
  return {
    allowed: countInWindow < policy.maxPerWindow,
    remaining,
    resetAt: new Date(now.getTime() + policy.windowMs).toISOString(),
  };
}

export function createPublicWorkerTrace(job: ProductionWorkerJob<unknown>): PublicWorkerTrace {
  return {
    traceId: job.traceId,
    queueMode: job.queueMode,
    policyMode: "student_runtime",
    readOnly: true,
  };
}

function tenantListIncludes(value: string | undefined, tenantId: string): boolean {
  if (!value) return false;
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .includes(tenantId);
}
