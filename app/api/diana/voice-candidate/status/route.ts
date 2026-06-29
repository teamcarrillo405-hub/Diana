import { NextResponse } from "next/server";
import { STUDENT_RUNTIME_READ_TOOLS } from "@/lib/integrations/command-center-contract";
import { createClient } from "@/lib/supabase/server";
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
    const receiptSaved = await ensureAuthorshipReceipt({
      supabase,
      ownerId: user.id,
      job: data,
      response,
      result: result ?? {},
    });
    if (!receiptSaved) {
      return NextResponse.json(
        { ok: false, error: "Diana needs to save the authorship receipt before showing that help." },
        { status: 500 },
      );
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

function publicTrace(traceId: string, queueMode: string) {
  return {
    traceId,
    queueMode,
    policyMode: "student_runtime",
    readOnly: true,
  };
}

async function ensureAuthorshipReceipt({
  supabase,
  ownerId,
  job,
  response,
  result,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  ownerId: string;
  job: {
    trace_id: string;
    tenant_id: string;
    feature: string;
    queue_name: string;
    queue_mode: string;
    payload: Json;
  };
  response: string;
  result: WorkerResultPayload;
}): Promise<boolean> {
  const existing = await supabase
    .from("authorship_log")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("event_type", "local_voice_candidate")
    .contains("payload", { workerJob: { traceId: job.trace_id } })
    .maybeSingle();
  if (existing.error) return false;
  if (existing.data) return true;

  const payload = job.payload as WorkerPayload | null;
  const input = payload?.input;
  const transcript = typeof input?.transcript === "string" ? input.transcript : "";
  const assignmentId = typeof input?.assignmentId === "string" ? input.assignmentId : null;
  const source = input?.source === "voice" ? "voice" : "typed";
  const responseChars = typeof result.responseChars === "number" ? result.responseChars : response.length;
  const provider = typeof result.provider === "string" ? result.provider : "openjarvis";
  const model = typeof result.model === "string" ? result.model : "unknown";
  const workerId = typeof result.workerId === "string" ? result.workerId : undefined;
  const durationMs = typeof result.durationMs === "number" ? result.durationMs : undefined;

  const inserted = await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: assignmentId,
    actor: "diana",
    event_type: "local_voice_candidate",
    payload: {
      source,
      transcriptChars: transcript.length,
      responseChars,
      trace: {
        worker: "openjarvis",
        provider,
        model,
        policyMode: "student_runtime",
        readOnly: true,
        allowedDianaTools: [...STUDENT_RUNTIME_READ_TOOLS],
      },
      workerJob: {
        traceId: job.trace_id,
        feature: job.feature,
        queueName: job.queue_name,
        queueMode: job.queue_mode,
        tenantId: job.tenant_id,
        sessionId: typeof payload?.sessionId === "string" ? payload.sessionId : "voice-session",
        workerId,
        durationMs,
      },
    } as unknown as Json,
  });

  return !inserted.error;
}

export const runtime = "nodejs";
