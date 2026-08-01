import { NextResponse } from "next/server";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      checks: { application: "ok" },
    },
    { status: 200, headers: RESPONSE_HEADERS },
  );
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
