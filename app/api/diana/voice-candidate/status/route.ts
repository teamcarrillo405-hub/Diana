import { NextResponse } from "next/server";
import { recordLearningEvent } from "@/lib/learning-loop/server";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";

type WorkerResultPayload = {
  response?: unknown;
  responseChars?: unknown;
  provider?: unknown;
  model?: unknown;
  workerId?: unknown;
  durationMs?: unknown;
};

type WorkerPayload = {
  input?: {
    source?: unknown;
    transcript?: unknown;
    assignmentId?: unknown;
  };
  sessionId?: unknown;
};

export async function GET(request: Request) {
  const traceId = new URL(request.url).searchParams.get("traceId")?.trim() ?? "";
  if (!traceId) {
    return NextResponse.json({ ok: false, error: "Trace id is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to ask Diana." }, { status: 401 });
  }
  const accounting = createAiServiceClient();
  if (!accounting) {
    return NextResponse.json(
      { ok: false, error: "Diana candidate status is unavailable right now." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("worker_jobs")
    .select("trace_id,tenant_id,owner_id,feature,queue_name,queue_mode,status,payload,result_payload,error_summary")
    .eq("trace_id", traceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "Diana candidate status is unavailable right now." }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "That Diana request is not available for this session." }, { status: 404 });
  }

  const status = data.status;
  if (status === "queued" || status === "running") {
    return NextResponse.json({
      ok: true,
      status,
      trace: publicTrace(data.trace_id, data.queue_mode),
    });
  }

  if (status === "succeeded") {
    const result = data.result_payload as WorkerResultPayload | null;
    const response = typeof result?.response === "string" ? result.response : "";
    if (!response) {
      return NextResponse.json(
        { ok: false, error: "Diana candidate status is unavailable right now." },
        { status: 503 },
      );
    }
    const hasLearningEvent = await learningEventExists({
      supabase: accounting,
      ownerId: user.id,
      traceId: data.trace_id,
    });
    if (!hasLearningEvent) {
      await recordLearningEvent({
        supabase: accounting,
        ownerId: user.id,
        eventName: "voice_candidate_completed",
        assignmentId: assignmentIdFromJob(data.payload),
        feature: "diana.voice_candidate",
        sourceTable: "worker_jobs",
        sourceId: data.trace_id,
        payload: {
          source: sourceFromJob(data.payload),
          queued: true,
          responseChars: response.length,
        } as unknown as Json,
      }).catch(() => undefined);
    }
    return NextResponse.json({
      ok: true,
      status,
      response,
      trace: publicTrace(data.trace_id, data.queue_mode),
    });
  }

  return NextResponse.json({
    ok: false,
    status,
    error: "Diana could not get a candidate right now.",
    trace: publicTrace(data.trace_id, data.queue_mode),
  });
}

function assignmentIdFromJob(payload: Json): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const input = (payload as WorkerPayload).input;
  return typeof input?.assignmentId === "string" ? input.assignmentId : null;
}

function sourceFromJob(payload: Json): "voice" | "typed" {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "typed";
  const input = (payload as WorkerPayload).input;
  return input?.source === "voice" ? "voice" : "typed";
}

async function learningEventExists({
  supabase,
  ownerId,
  traceId,
}: {
  supabase: NonNullable<ReturnType<typeof createAiServiceClient>>;
  ownerId: string;
  traceId: string;
}): Promise<boolean> {
  const { data, error } = await supabase
    .from("learning_events")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("event_name", "voice_candidate_completed")
    .eq("source_table", "worker_jobs")
    .eq("source_id", traceId)
    .maybeSingle();
  if (error) return true;
  return Boolean(data);
}

function publicTrace(traceId: string, queueMode: string) {
  return {
    traceId,
    queueMode,
    policyMode: "student_runtime",
    readOnly: true,
  };
}

export const runtime = "nodejs";
