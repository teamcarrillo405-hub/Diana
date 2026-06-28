import { loadEnvConfig } from "@next/env";
import { createVoiceCandidateWorkerJob, VOICE_CANDIDATE_QUEUE } from "../lib/worker-tier/production-worker-tier";
import { enqueueWorkerJob, markWorkerJobError } from "../lib/worker-tier/worker-queue";
import { createServiceClient } from "../lib/supabase/service";

loadEnvConfig(process.cwd());

type WorkerJobProbe = {
  trace_id: string;
  tenant_id: string;
  status: "queued" | "running" | "succeeded" | "error" | "rate_limited";
  result_payload: unknown;
  error_summary: string | null;
  attempts: number;
  locked_by: string | null;
  started_at: string | null;
  completed_at: string | null;
};

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const admin = createServiceClient();
  if (!admin) {
    throw new Error("Supabase service client is required for deployed worker canary.");
  }

  const ownerId = argValue("owner-id") ?? process.env.DIANA_WORKER_CANARY_OWNER_ID ?? await firstUserId(admin);
  const queueName = argValue("queue") ?? process.env.DIANA_WORKER_QUEUE ?? VOICE_CANDIDATE_QUEUE;
  const timeoutMs = Math.max(5_000, numberArg("timeout-ms", 120_000));
  const pollMs = Math.max(500, numberArg("poll-ms", 2_000));
  const runId = `deployed-canary-${Date.now().toString(36)}`;
  const traceId = `dw-${runId}`;
  const tenantId = `personal:${ownerId}`;
  const startedAt = Date.now();

  const job = createVoiceCandidateWorkerJob({
    input: {
      transcript: "Production worker canary: reply with one calm next step.",
      source: "typed",
      assignmentId: null,
    },
    studentId: ownerId,
    tenantId,
    queueMode: "managed_queue",
    queueName,
    sessionId: runId,
    traceId,
    idempotencyKey: `${runId}:${traceId}`,
  });
  await enqueueWorkerJob(job, "queued", admin);
  await admin.from("worker_jobs").update({ priority: 3000 }).eq("trace_id", traceId);

  try {
    const completed = await waitForCompletion({
      admin,
      traceId,
      tenantId,
      timeoutMs,
      pollMs,
    });
    const result = completed.result_payload && typeof completed.result_payload === "object"
      ? completed.result_payload as Record<string, unknown>
      : {};

    if (completed.status !== "succeeded") {
      throw new Error(
        `Deployed worker canary ended with ${completed.status}: ${completed.error_summary ?? "no error summary"}`,
      );
    }
    if (typeof result.workerId !== "string" || !result.workerId.trim()) {
      throw new Error("Deployed worker canary did not record a worker id in result_payload.");
    }

    console.log(JSON.stringify({
      ok: true,
      traceId,
      tenantId,
      queueName,
      durationMs: Date.now() - startedAt,
      attempts: completed.attempts,
      lockedBy: completed.locked_by,
      startedAt: completed.started_at,
      completedAt: completed.completed_at,
      result: {
        provider: result.provider,
        model: result.model,
        workerId: result.workerId,
        durationMs: result.durationMs,
        responseChars: result.responseChars,
      },
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("timed out")) {
      await markWorkerJobError({
        traceId,
        tenantId,
        errorSummary: "Deployed worker canary did not complete before timeout.",
        client: admin,
      }).catch(() => undefined);
    }
    throw error;
  }
}

async function firstUserId(admin: NonNullable<ReturnType<typeof createServiceClient>>): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  const user = data.users[0];
  if (!user) {
    throw new Error("No auth user is available for deployed worker canary.");
  }
  return user.id;
}

async function waitForCompletion({
  admin,
  traceId,
  tenantId,
  timeoutMs,
  pollMs,
}: {
  admin: NonNullable<ReturnType<typeof createServiceClient>>;
  traceId: string;
  tenantId: string;
  timeoutMs: number;
  pollMs: number;
}): Promise<WorkerJobProbe> {
  const dueAt = Date.now() + timeoutMs;
  let last: WorkerJobProbe | null = null;

  while (Date.now() <= dueAt) {
    const { data, error } = await admin
      .from("worker_jobs")
      .select("trace_id,tenant_id,status,result_payload,error_summary,attempts,locked_by,started_at,completed_at")
      .eq("trace_id", traceId)
      .eq("tenant_id", tenantId)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Deployed worker canary job could not be read.");
    }
    last = data as WorkerJobProbe;
    if (last.status === "succeeded" || last.status === "error" || last.status === "rate_limited") {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(
    `Deployed worker canary timed out after ${timeoutMs}ms with status ${last?.status ?? "unknown"}.`,
  );
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
