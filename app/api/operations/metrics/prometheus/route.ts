import { NextResponse } from "next/server";
import { hasValidWorkerBearer } from "@/lib/worker-tier/worker-api-auth";
import {
  formatOperationalHealthPrometheus,
  getOperationalHealthSnapshot,
} from "@/lib/operations/operational-health";

export async function GET(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Operations authorization required." }, { status: 401 });
  }

  const snapshot = await getOperationalHealthSnapshot();
  return new NextResponse(formatOperationalHealthPrometheus(snapshot), {
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
