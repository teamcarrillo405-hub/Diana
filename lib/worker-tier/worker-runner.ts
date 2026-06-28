import {
  createDianaVoiceCandidate,
  normalizeDianaVoiceCandidateInput,
  type DianaVoiceCandidateInput,
  type DianaVoiceCandidateResult,
} from "@/lib/integrations/diana-voice-sidecar";

export type DianaWorkerConfig = {
  baseUrl: string;
  token: string;
  workerId: string;
  queueName: string;
  leaseSeconds: number;
};

export type ClaimedWorkerJob = {
  traceId: string;
  tenantId: string;
  feature: string;
  payload: unknown;
  constraints: unknown;
};

type ExecuteVoiceCandidate = (args: {
  input: DianaVoiceCandidateInput;
  signal?: AbortSignal;
}) => Promise<DianaVoiceCandidateResult>;

export type DianaWorkerCycleResult =
  | { status: "idle" }
  | { status: "completed"; traceId: string; tenantId: string; responseChars: number }
  | { status: "error"; traceId: string; tenantId: string; errorSummary: string };

export async function runOneDianaWorkerCycle({
  config,
  fetchImpl = fetch,
  executeVoiceCandidate = ({ input, signal }) => createDianaVoiceCandidate({ input, fetchImpl, signal }),
}: {
  config: DianaWorkerConfig;
  fetchImpl?: typeof fetch;
  executeVoiceCandidate?: ExecuteVoiceCandidate;
}): Promise<DianaWorkerCycleResult> {
  const claimed = await claimNextWorkerJob({ config, fetchImpl });
  if (!claimed) return { status: "idle" };

  const startedAt = Date.now();
  try {
    if (claimed.feature !== "diana.voice_candidate") {
      throw new Error(`Unsupported worker feature: ${claimed.feature}`);
    }

    const input = normalizeClaimedVoiceCandidateInput(claimed.payload);
    if (!input) {
      throw new Error("Worker job payload did not contain a valid Diana voice candidate input.");
    }

    const result = await runWithWorkerTimeout(
      (signal) => executeVoiceCandidate({ input, signal }),
      extractWorkerTimeoutMs(claimed.constraints),
    );
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
        durationMs: Date.now() - startedAt,
      },
    });

    return {
      status: "completed",
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      responseChars: result.response.length,
    };
  } catch (error) {
    const errorSummary = error instanceof Error ? error.message : "Worker execution ended without a result.";
    await completeWorkerJobViaApi({
      config,
      fetchImpl,
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      status: "error",
      errorSummary,
    });
    return { status: "error", traceId: claimed.traceId, tenantId: claimed.tenantId, errorSummary };
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
  if (!response.ok) {
    throw new Error(`Worker claim returned ${response.status}.`);
  }

  const json = await response.json().catch(() => null) as {
    ok?: boolean;
    job?: {
      traceId?: unknown;
      tenantId?: unknown;
      feature?: unknown;
      payload?: unknown;
      constraints?: unknown;
    } | null;
  } | null;
  if (!json?.ok || !json.job) return null;
  if (
    typeof json.job.traceId !== "string" ||
    typeof json.job.tenantId !== "string" ||
    typeof json.job.feature !== "string"
  ) {
    throw new Error("Worker claim returned an invalid job shape.");
  }
  return {
    traceId: json.job.traceId,
    tenantId: json.job.tenantId,
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
  errorSummary,
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
    durationMs: number;
  };
  errorSummary?: string;
}) {
  const response = await fetchImpl(new URL("/api/workers/complete", config.baseUrl), {
    method: "POST",
    headers: workerHeaders(config.token),
    body: JSON.stringify({
      traceId,
      tenantId,
      status,
      result,
      errorSummary,
    }),
  });
  if (!response.ok) {
    throw new Error(`Worker completion returned ${response.status}.`);
  }
}

function normalizeClaimedVoiceCandidateInput(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const input = (payload as { input?: unknown }).input;
  return normalizeDianaVoiceCandidateInput(input);
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
      reject(new Error("Worker execution timed out."));
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
