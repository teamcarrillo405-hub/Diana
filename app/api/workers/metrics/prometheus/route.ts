import { NextResponse } from "next/server";
import { hasValidWorkerBearer, workerBearerScope, workerMayAccessQueue, WINDOWS_WORKER_SMOKE_QUEUE } from "@/lib/worker-tier/worker-api-auth";
import { isAllowedWorkerQueueName, VOICE_CANDIDATE_QUEUE } from "@/lib/worker-tier/production-worker-tier";
import {
  formatWorkerQueueMetricsPrometheus,
  getWorkerQueueMetrics,
} from "@/lib/worker-tier/worker-metrics";

export async function GET(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Worker authorization required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const queueName = url.searchParams.get("queueName")?.trim() || (workerBearerScope(request) === 'windows_host' ? WINDOWS_WORKER_SMOKE_QUEUE : VOICE_CANDIDATE_QUEUE);
  if (!isAllowedWorkerQueueName(queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is not supported." }, { status: 400 });
  }
  if (!workerMayAccessQueue(request, queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is outside this credential's scope." }, { status: 403 });
  }

  const rawWindowMinutes = Number(url.searchParams.get("windowMinutes") ?? 15);
  const windowMinutes = Number.isFinite(rawWindowMinutes)
    ? Math.max(1, Math.min(24 * 60, Math.floor(rawWindowMinutes)))
    : 15;
  const includeTenants = url.searchParams.get("includeTenants") === "true";

  try {
    const metrics = await getWorkerQueueMetrics({
      queueName,
      windowMs: windowMinutes * 60_000,
    });
    return new NextResponse(formatWorkerQueueMetricsPrometheus(metrics, { includeTenants }), {
      headers: {
        "content-type": "text/plain; version=0.0.4; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Worker metrics are unavailable right now." }, { status: 503 });
  }
}

export const runtime = "nodejs";
