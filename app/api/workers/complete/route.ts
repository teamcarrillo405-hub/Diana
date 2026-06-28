import { NextResponse } from "next/server";
import { hasValidWorkerBearer } from "@/lib/worker-tier/worker-api-auth";
import { completeWorkerJob, markWorkerJobError, WorkerJobTenantScopeError } from "@/lib/worker-tier/worker-queue";

export async function POST(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Worker authorization required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    traceId?: unknown;
    tenantId?: unknown;
    status?: unknown;
    result?: unknown;
    errorSummary?: unknown;
  } | null;
  const traceId = typeof body?.traceId === "string" ? body.traceId.trim() : "";
  const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";
  const status = body?.status;
  if (!traceId) {
    return NextResponse.json({ ok: false, error: "Trace id is required." }, { status: 400 });
  }
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Tenant id is required." }, { status: 400 });
  }

  try {
    if (status === "succeeded") {
      const result = body?.result && typeof body.result === "object"
        ? body.result as Record<string, unknown>
        : {};
      await completeWorkerJob({
        traceId,
        tenantId,
        result: {
          status: "succeeded",
          response: typeof result.response === "string" ? result.response : undefined,
          responseChars: typeof result.responseChars === "number" ? result.responseChars : undefined,
          provider: typeof result.provider === "string" ? result.provider : undefined,
          model: typeof result.model === "string" ? result.model : undefined,
          workerId: typeof result.workerId === "string" ? result.workerId : undefined,
          durationMs: typeof result.durationMs === "number" ? result.durationMs : undefined,
        },
      });
      return NextResponse.json({ ok: true });
    }

    if (status === "error") {
      await markWorkerJobError({
        traceId,
        tenantId,
        errorSummary: typeof body?.errorSummary === "string"
          ? body.errorSummary
          : "Worker reported an error state.",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Worker status is not supported." }, { status: 400 });
  } catch (error) {
    if (error instanceof WorkerJobTenantScopeError) {
      return NextResponse.json({ ok: false, error: "Worker job was not found for that tenant." }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "Worker completion is unavailable right now." }, { status: 503 });
  }
}

export const runtime = "nodejs";
