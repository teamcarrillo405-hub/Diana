import { NextResponse } from "next/server";
import { studyBuddyEligibility } from "@/lib/assignment-help/study-buddy-eligibility";
import { recordVoiceCandidateAssistance } from "@/lib/learning-engine/voice-candidate-assistance";
import type { StudyBuddyAssistanceClient } from "@/lib/learning-engine/study-buddy-assistance";
import { recordLearningEvent } from "@/lib/learning-loop/server";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";
import { isAllowedWorkerQueueName } from "@/lib/worker-tier/production-worker-tier";
import { voiceJobScope } from "@/lib/worker-tier/voice-job-scope";

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

  // Raw results are service-only. Always constrain this privileged read to the
  // authenticated owner and the voice feature before evaluating release policy.
  const { data, error } = await accounting
    .from("worker_jobs")
    .select("trace_id,tenant_id,owner_id,feature,queue_name,queue_mode,status,payload,result_payload,error_summary")
    .eq("trace_id", traceId)
    .eq("owner_id", user.id)
    .eq("feature", "diana.voice_candidate")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "Diana candidate status is unavailable right now." }, { status: 503 });
  }
  if (!data || data.owner_id !== user.id || data.feature !== "diana.voice_candidate"
    || !isAllowedWorkerQueueName(data.queue_name)) {
    return NextResponse.json({ ok: false, error: "That Diana request is not available for this session." }, { status: 404 });
  }
  const scope = voiceJobScope(data.payload);
  if (!scope.ok) return NextResponse.json({ ok: false, error: "Diana candidate status is unavailable right now." }, { status: 503 });
  const assignmentId = scope.assignmentId;
  const eligibility = await studyBuddyEligibility(supabase, { ownerId: user.id, assignmentId, classId: null });
  if (!eligibility.ok) return NextResponse.json({ ok: false, error: eligibility.error }, { status: eligibility.status });

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
    try {
      await recordVoiceCandidateAssistance(supabase as unknown as StudyBuddyAssistanceClient, {
        ownerId: user.id, assignmentId, phase: "release", key: data.trace_id,
        context: { job: data.payload, result: data.result_payload },
      });
    } catch {
      return NextResponse.json({ ok: false, error: "Diana needs to save the assistance record before showing that help." },
        { status: 503, headers: { "Cache-Control": "no-store" } });
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
        assignmentId,
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
    }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({
    ok: false,
    status,
    error: "Diana could not get a candidate right now.",
    trace: publicTrace(data.trace_id, data.queue_mode),
  });
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
