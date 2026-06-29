import { NextResponse } from "next/server";
import { hasValidWorkerBearer } from "@/lib/worker-tier/worker-api-auth";
import { isAllowedWorkerQueueName, VOICE_CANDIDATE_QUEUE } from "@/lib/worker-tier/production-worker-tier";
import { claimWorkerJob } from "@/lib/worker-tier/worker-queue";

export async function POST(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Worker authorization required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    queueName?: unknown;
    workerId?: unknown;
    leaseSeconds?: unknown;
  } | null;
  const queueName = typeof body?.queueName === "string" && body.queueName.trim()
    ? body.queueName.trim()
    : VOICE_CANDIDATE_QUEUE;
  const workerId = typeof body?.workerId === "string" && body.workerId.trim()
    ? body.workerId.trim()
    : "";
  const leaseSeconds = typeof body?.leaseSeconds === "number" && Number.isFinite(body.leaseSeconds)
    ? Math.max(1, Math.min(300, Math.floor(body.leaseSeconds)))
    : 60;

  if (!workerId) {
    return NextResponse.json({ ok: false, error: "Worker id is required." }, { status: 400 });
  }
  if (!isAllowedWorkerQueueName(queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is not supported." }, { status: 400 });
  }

  try {
    const job = await claimWorkerJob({ queueName, workerId, leaseSeconds });
    if (!job) {
      return NextResponse.json({ ok: true, job: null });
    }

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        traceId: job.trace_id,
        tenantId: job.tenant_id,
        ownerId: job.owner_id,
        feature: job.feature,
        queueName: job.queue_name,
        status: job.status,
        attempts: job.attempts,
        lockedUntil: job.locked_until,
        payload: job.payload,
        constraints: job.constraints,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Worker claim is unavailable right now." }, { status: 503 });
  }
}

export const runtime = "nodejs";
