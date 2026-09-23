import { NextResponse } from "next/server";

import { sanitizeBuildIdentity } from "@/lib/screendesign/release-evidence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const identity = sanitizeBuildIdentity({
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
  });

  return NextResponse.json(identity, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
