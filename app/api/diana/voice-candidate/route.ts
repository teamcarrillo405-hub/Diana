import { NextResponse } from "next/server";
import {
  createDianaVoiceCandidate,
  createDianaVoiceCandidateAuditPayload,
  isDianaVoiceSidecarEnabled,
  normalizeDianaVoiceCandidateInput,
} from "@/lib/integrations/diana-voice-sidecar";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  VOICE_CANDIDATE_RATE_LIMIT,
  assertProductionWorkerBoundary,
  createPublicWorkerTrace,
  createVoiceCandidateWorkerJob,
  personalTenantId,
  resolveVoiceCandidateQueueMode,
  type ProductionWorkerJob,
} from "@/lib/worker-tier/production-worker-tier";
import {
  completeWorkerJob,
  enqueueWorkerJob,
  markWorkerJobError,
  reserveWorkerRateLimit,
} from "@/lib/worker-tier/worker-queue";

export async function POST(request: Request) {
  if (!isDianaVoiceSidecarEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Diana candidate help is off right now." },
      { status: 503 },
    );
  }

  const parsed = normalizeDianaVoiceCandidateInput(await request.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Add a short typed note or voice transcript first." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to ask Diana." }, { status: 401 });
  }

  const assignmentId = parsed.assignmentId
    ? await verifiedAssignmentId(supabase, user.id, parsed.assignmentId)
    : null;
  if (parsed.assignmentId && !assignmentId) {
    return NextResponse.json(
      { ok: false, error: "That assignment is not available for this session." },
      { status: 404 },
    );
  }

  let workerJob: ProductionWorkerJob<typeof parsed> | null = null;
  try {
    const tenantId = personalTenantId(user.id);
    workerJob = createVoiceCandidateWorkerJob({
      input: parsed,
      studentId: user.id,
      tenantId,
      sessionId: request.headers.get("x-diana-session-id") ?? "voice-session",
      queueMode: resolveVoiceCandidateQueueMode({ tenantId }),
      idempotencyKey: request.headers.get("x-idempotency-key") ?? undefined,
    });
    assertProductionWorkerBoundary(workerJob);

    const rateLimit = await reserveWorkerRateLimit({
      tenantId: workerJob.tenantId,
      ownerId: user.id,
      feature: VOICE_CANDIDATE_RATE_LIMIT.feature,
      scope: "student",
      policy: VOICE_CANDIDATE_RATE_LIMIT,
    });
    if (!rateLimit.allowed) {
      await enqueueWorkerJob(workerJob, "rate_limited");
      return NextResponse.json(
        {
          ok: false,
          error: "Diana candidate help is taking a short pause for this account.",
          retryAt: rateLimit.resetAt,
        },
        { status: 429 },
      );
    }

    if (workerJob.queueMode === "managed_queue") {
      await enqueueWorkerJob(workerJob, "queued");
      return NextResponse.json(
        {
          ok: true,
          queued: true,
          trace: createPublicWorkerTrace(workerJob),
        },
        { status: 202 },
      );
    }

    await enqueueWorkerJob(workerJob, "running");
    const result = await createDianaVoiceCandidate({ input: parsed });
    const { error } = await supabase.from("authorship_log").insert({
      owner_id: user.id,
      assignment_id: assignmentId,
      actor: "diana",
      event_type: "local_voice_candidate",
      payload: {
        ...createDianaVoiceCandidateAuditPayload(parsed, result),
        workerJob: {
          id: workerJob.id,
          traceId: workerJob.traceId,
          feature: workerJob.feature,
          queueName: workerJob.queueName,
          queueMode: workerJob.queueMode,
          tenantId: workerJob.tenantId,
          sessionId: workerJob.sessionId,
          rateLimit: {
            feature: VOICE_CANDIDATE_RATE_LIMIT.feature,
            remaining: rateLimit.remaining,
            resetAt: rateLimit.resetAt,
          },
        },
      } as unknown as Json,
    });

    if (error) {
      await markWorkerJobError({
        traceId: workerJob.traceId,
        tenantId: workerJob.tenantId,
        errorSummary: "Authorship receipt could not be saved.",
      });
      return NextResponse.json(
        { ok: false, error: "Diana needs to save the authorship receipt before showing that help." },
        { status: 500 },
      );
    }

    await completeWorkerJob({
      traceId: workerJob.traceId,
      tenantId: workerJob.tenantId,
      result: {
        status: "succeeded",
        responseChars: result.response.length,
        provider: result.trace.provider,
        model: result.trace.model,
      },
    });

    return NextResponse.json({
      ok: true,
      response: result.response,
      trace: createPublicWorkerTrace(workerJob),
    });
  } catch {
    if (workerJob) {
      await markWorkerJobError({
        traceId: workerJob.traceId,
        tenantId: workerJob.tenantId,
        errorSummary: "Voice candidate worker could not finish.",
      }).catch(() => undefined);
    }
    return NextResponse.json(
      { ok: false, error: "Diana candidate help is unavailable right now." },
      { status: 503 },
    );
  }
}

async function verifiedAssignmentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return data?.id ?? null;
}

export const runtime = "nodejs";
