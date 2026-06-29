import { loadEnvConfig } from "@next/env";
import { createVoiceCandidateWorkerJob, VOICE_CANDIDATE_SMOKE_QUEUE } from "../lib/worker-tier/production-worker-tier";
import { enqueueWorkerJob } from "../lib/worker-tier/worker-queue";
import { createServiceClient } from "../lib/supabase/service";

loadEnvConfig(process.cwd());

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
  const token = process.env.WORKER_API_TOKEN;
  if (!token) {
    throw new Error("WORKER_API_TOKEN is required to run the worker load smoke.");
  }

  const admin = createServiceClient();
  if (!admin) {
    throw new Error("Supabase service client is required for worker load smoke.");
  }

  const baseUrl = argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000";
  const count = Math.max(1, Math.min(100, numberArg("count", 10)));
  const ownerId = argValue("owner-id") ?? await firstUserId(admin);
  const runId = `load-smoke-${Date.now().toString(36)}`;
  const queueName = argValue("queue") ?? process.env.DIANA_WORKER_SMOKE_QUEUE ?? `${VOICE_CANDIDATE_SMOKE_QUEUE}-${runId}`;

  for (let index = 0; index < count; index += 1) {
    const traceId = `dw-${runId}-${index}`;
    const job = createVoiceCandidateWorkerJob({
      input: {
        transcript: `Managed queue load smoke ${index + 1}.`,
        source: "typed",
        assignmentId: null,
      },
      studentId: ownerId,
      tenantId: `personal:${ownerId}`,
      queueMode: "managed_queue",
      queueName,
      sessionId: runId,
      traceId,
      idempotencyKey: `${runId}:${index}`,
    });
    await enqueueWorkerJob(job, "queued", admin);
    await admin.from("worker_jobs").update({ priority: 900 }).eq("trace_id", traceId);
  }

  const results = [];
  const startedAt = Date.now();
  for (let index = 0; index < count; index += 1) {
    const workerId = `${runId}-worker-${index}`;
    const claimed = await claimJob(baseUrl, token, workerId, queueName);
    if (!claimed.traceId.startsWith(`dw-${runId}-`)) {
      throw new Error(`Worker load smoke claimed an unexpected trace ${claimed.traceId}.`);
    }
    const complete = await postComplete(baseUrl, token, {
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      status: "succeeded",
      result: {
        responseChars: 0,
        provider: "load-smoke",
        model: "queue-api",
        workerId,
        durationMs: 0,
      },
    });
    if (!complete.ok) {
      throw new Error(`Worker load smoke completion returned ${complete.status}.`);
    }
    results.push({
      traceId: claimed.traceId,
      tenantId: claimed.tenantId,
      completeStatus: complete.status,
    });
  }

  const metrics = await getMetrics(baseUrl, token, queueName);
  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    runId,
    queueName,
    count,
    durationMs: Date.now() - startedAt,
    completed: results.length,
    metrics: metrics.metrics,
  }));
}

async function firstUserId(admin: NonNullable<ReturnType<typeof createServiceClient>>): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  const user = data.users[0];
  if (!user) {
    throw new Error("No auth user is available for worker load smoke.");
  }
  return user.id;
}

async function claimJob(
  baseUrl: string,
  token: string,
  workerId: string,
  queueName: string,
): Promise<{ traceId: string; tenantId: string }> {
  const response = await fetch(new URL("/api/workers/claim", baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      workerId,
      queueName,
      leaseSeconds: 60,
    }),
  });
  if (!response.ok) {
    throw new Error(`Worker load smoke claim returned ${response.status}.`);
  }

  const json = await response.json().catch(() => null) as {
    ok?: boolean;
    job?: { traceId?: unknown; tenantId?: unknown } | null;
  } | null;
  if (!json?.ok || !json.job || typeof json.job.traceId !== "string" || typeof json.job.tenantId !== "string") {
    throw new Error("Worker load smoke did not receive a claimed job.");
  }
  return { traceId: json.job.traceId, tenantId: json.job.tenantId };
}

async function postComplete(baseUrl: string, token: string, body: Record<string, unknown>) {
  return fetch(new URL("/api/workers/complete", baseUrl), {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getMetrics(baseUrl: string, token: string, queueName: string) {
  const url = new URL("/api/workers/metrics", baseUrl);
  url.searchParams.set("windowMinutes", "15");
  url.searchParams.set("queueName", queueName);
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Worker load smoke metrics returned ${response.status}.`);
  }
  return response.json() as Promise<{ ok: true; metrics: unknown }>;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
