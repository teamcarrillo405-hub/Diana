import { NextResponse } from "next/server";

import { openAIHomeworkModel } from "@/lib/ai/openai-homework-adapter";

export const runtime = "nodejs";

export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, visible: false }, { status: 404 });
  }

  const connected = Boolean(process.env.OPENAI_API_KEY?.trim());

  return NextResponse.json({
    ok: true,
    visible: true,
    connected,
    provider: "OpenAI API",
    homeworkModel: openAIHomeworkModel("fast"),
    reviewModel: openAIHomeworkModel("quality"),
    complexModel: openAIHomeworkModel("complex"),
    realtimeModel: process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1-mini",
    fallback: connected ? "off" : "on",
    budgetGuard: "local daily limits active",
    dashboardBudget: "OpenAI project monthly limit is managed in the OpenAI dashboard",
  });
}
