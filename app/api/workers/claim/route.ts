import { NextResponse } from "next/server";
import { hasValidWorkerBearer, workerMayAccessQueue } from "@/lib/worker-tier/worker-api-auth";
import { isAllowedWorkerQueueName, VOICE_CANDIDATE_QUEUE } from "@/lib/worker-tier/production-worker-tier";
import { claimWorkerJob } from "@/lib/worker-tier/worker-queue";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { studyBuddyEligibility } from "@/lib/assignment-help/study-buddy-eligibility";
import { voiceJobScope } from "@/lib/worker-tier/voice-job-scope";

import { issueWorkerExecution, rejectWorkerClaim } from "@/lib/worker-tier/worker-execution-server";

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

  if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(workerId)) {
    return NextResponse.json({ ok: false, error: "Worker id is required." }, { status: 400 });
  }
  if (!isAllowedWorkerQueueName(queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is not supported." }, { status: 400 });
  }
  if (!workerMayAccessQueue(request, queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is outside this credential's scope." }, { status: 403 });
  }

  try {
    const service = createAiServiceClient();
    if (!service) throw new Error("worker_service_unavailable");
    const job = await claimWorkerJob({ queueName, workerId, leaseSeconds });
    if (!job) {
      return NextResponse.json({ ok: true, job: null });
    }

    const execution = await issueWorkerExecution(service, job.trace_id, workerId);
    const scope = voiceJobScope(job.payload);
    const eligibility = job.feature === "diana.voice_candidate" && job.queue_name === queueName && scope.ok
      ? await studyBuddyEligibility(service, { ownerId: job.owner_id, assignmentId: scope.assignmentId, classId: null })
      : { ok: false };
    if (!eligibility.ok) {
      await rejectWorkerClaim(service, { ...execution, workerId });
      return NextResponse.json({ ok: true, job: null });
    }

    return NextResponse.json({ ok: true, job: { ...execution, tenantId: job.tenant_id } },
      { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: "Worker claim is unavailable right now." }, { status: 503 });
  }
}

export const runtime = "nodejs";
