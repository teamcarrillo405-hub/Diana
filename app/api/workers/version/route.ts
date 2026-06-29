import { NextResponse } from "next/server";
import { hasValidWorkerBearer } from "@/lib/worker-tier/worker-api-auth";

function appSha(env: NodeJS.ProcessEnv = process.env): { sha: string; source: string } {
  const candidates = [
    ["DIANA_APP_BUILD_SHA", env.DIANA_APP_BUILD_SHA],
    ["VERCEL_GIT_COMMIT_SHA", env.VERCEL_GIT_COMMIT_SHA],
    ["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA],
  ] as const;

  for (const [source, value] of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return { sha: trimmed, source };
  }

  return { sha: "unknown", source: "unavailable" };
}

export async function GET(request: Request) {
  if (!hasValidWorkerBearer(request)) {
    return NextResponse.json({ ok: false, error: "Worker authorization required." }, { status: 401 });
  }

  const version = appSha();
  return NextResponse.json({
    ok: true,
    app: {
      sha: version.sha,
      source: version.source,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
  });
}

export const runtime = "nodejs";
