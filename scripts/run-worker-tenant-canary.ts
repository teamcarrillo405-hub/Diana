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

async function main() {
  const token = process.env.WORKER_API_TOKEN;
  if (!token) {
    throw new Error("WORKER_API_TOKEN is required to run the worker tenant canary.");
  }

  const baseUrl = argValue("base-url") ?? process.env.DIANA_WORKER_BASE_URL ?? "http://127.0.0.1:3000";
  let traceId = argValue("trace-id");
  let tenantId = argValue("tenant-id");
  const crossTenantId = argValue("cross-tenant-id") ?? "personal:tenant-canary-cross";
  const seed = process.argv.includes("--seed");
  const runId = `tenant-canary-${Date.now().toString(36)}`;
  const queueName = argValue("queue") ?? process.env.DIANA_WORKER_SMOKE_QUEUE ?? `${VOICE_CANDIDATE_SMOKE_QUEUE}-${runId}`;

  const missingTenant = await postComplete(baseUrl, token, {
    traceId: traceId ?? "dw-tenant-canary",
    status: "succeeded",
    result: { responseChars: 0, workerId: "tenant-canary" },
  });
  if (missingTenant.status !== 400) {
    throw new Error(`Expected missing-tenant canary to return 400, got ${missingTenant.status}.`);
  }

  const results: Record<string, unknown> = {
    missingTenantStatus: missingTenant.status,
    queueName,
  };

  if (seed && (!traceId || !tenantId)) {
    const seeded = await seedCanaryJob(queueName, runId);
    traceId = seeded.traceId;
    tenantId = seeded.tenantId;
    results.seededTraceId = seeded.traceId;
    results.seededTenantId = seeded.tenantId;
  }

  if (traceId && tenantId) {
    const crossTenant = await postComplete(baseUrl, token, {
      traceId,
      tenantId: crossTenantId === tenantId ? `${crossTenantId}-other` : crossTenantId,
      status: "succeeded",
      result: { responseChars: 0, workerId: "tenant-canary" },
    });
    if (crossTenant.status !== 404) {
      throw new Error(`Expected cross-tenant canary to return 404, got ${crossTenant.status}.`);
    }
    results.crossTenantStatus = crossTenant.status;

    const cleanup = await postComplete(baseUrl, token, {
      traceId,
      tenantId,
      status: "error",
      errorSummary: "Tenant canary completed its boundary check.",
    });
    if (!cleanup.ok) {
      throw new Error(`Tenant canary cleanup returned ${cleanup.status}.`);
    }
    results.cleanupStatus = cleanup.status;
  } else {
    results.crossTenantStatus = "skipped-no-known-job";
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl,
    results,
  }));
}

async function seedCanaryJob(queueName: string, runId: string) {
  const admin = createServiceClient();
  if (!admin) {
    throw new Error("Supabase service client is required for --seed.");
  }

  const ownerId = argValue("owner-id") ?? await firstUserId(admin);
  const traceId = `dw-${runId}`;
  const job = createVoiceCandidateWorkerJob({
    input: {
      transcript: "Tenant canary managed queue job.",
      source: "typed",
      assignmentId: null,
    },
    studentId: ownerId,
    tenantId: `personal:${ownerId}`,
    queueMode: "managed_queue",
    queueName,
    sessionId: "tenant-canary",
    traceId,
    idempotencyKey: `${runId}:${traceId}`,
  });
  await enqueueWorkerJob(job, "queued", admin);
  await admin.from("worker_jobs").update({ priority: 1000 }).eq("trace_id", traceId);
  return { traceId, tenantId: job.tenantId };
}

async function firstUserId(admin: NonNullable<ReturnType<typeof createServiceClient>>): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error(error.message);
  const user = data.users[0];
  if (!user) {
    throw new Error("No auth user is available for the tenant canary seed.");
  }
  return user.id;
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

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  }));
  process.exit(1);
});
