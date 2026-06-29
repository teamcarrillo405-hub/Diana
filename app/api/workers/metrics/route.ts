import { NextResponse } from "next/server";
import { hasValidWorkerBearer } from "@/lib/worker-tier/worker-api-auth";
import { isAllowedWorkerQueueName, VOICE_CANDIDATE_QUEUE } from "@/lib/worker-tier/production-worker-tier";
import { getWorkerQueueMetrics } from "@/lib/worker-tier/worker-metrics";

export async function GET(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Worker authorization required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const queueName = url.searchParams.get("queueName")?.trim() || VOICE_CANDIDATE_QUEUE;
  if (!isAllowedWorkerQueueName(queueName)) {
    return NextResponse.json({ ok: false, error: "Worker queue is not supported." }, { status: 400 });
  }

  const rawWindowMinutes = Number(url.searchParams.get("windowMinutes") ?? 15);
  const windowMinutes = Number.isFinite(rawWindowMinutes)
    ? Math.max(1, Math.min(24 * 60, Math.floor(rawWindowMinutes)))
    : 15;

  try {
    const metrics = await getWorkerQueueMetrics({
      queueName,
      windowMs: windowMinutes * 60_000,
    });
    return NextResponse.json({ ok: true, metrics });
  } catch {
    return NextResponse.json({ ok: false, error: "Worker metrics are unavailable right now." }, { status: 503 });
  }
}

export const runtime = "nodejs";
