import { NextResponse } from "next/server";
import { runtimeReadiness } from "@/lib/launch/readiness";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export async function GET() {
  const report = await runtimeReadiness();

  return NextResponse.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: RESPONSE_HEADERS,
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
