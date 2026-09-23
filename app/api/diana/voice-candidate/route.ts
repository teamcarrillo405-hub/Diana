import { NextResponse } from "next/server";
import {
  createDianaVoiceCandidate,
  createDianaVoiceCandidateAuditPayload,
  type DianaVoiceCandidateInput,
  isDianaVoiceSidecarEnabled,
  normalizeDianaVoiceCandidateInput,
} from "@/lib/integrations/diana-voice-sidecar";
import { learnerPromptLine } from "@/lib/learning-loop/profile";
import {
  getLearnerProfile,
  recordLearningEvent,
} from "@/lib/learning-loop/server";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import type { Json } from "@/lib/supabase/types";
import { logInteraction, runSafeBudgetedAiCall } from "@/lib/ai/safety";
import {
  assertProductionWorkerBoundary,
  createPublicWorkerTrace,
  createVoiceCandidateWorkerJob,
  personalTenantId,
  type ProductionWorkerJob,
  resolveVoiceCandidateQueueMode,
  VOICE_CANDIDATE_RATE_LIMIT,
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

  const parsed = normalizeDianaVoiceCandidateInput(
    await request.json().catch(() => null),
  );
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Add a short typed note or voice transcript first." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to ask Diana." }, {
      status: 401,
    });
  }

  const assignmentId = parsed.assignmentId
    ? await verifiedAssignmentId(supabase, user.id, parsed.assignmentId)
    : null;
  if (parsed.assignmentId && !assignmentId) {
    return NextResponse.json(
      {
        ok: false,
        error: "That assignment is not available for this session.",
      },
      { status: 404 },
    );
  }

  const accounting = createAiServiceClient();
  if (!accounting) {
    return NextResponse.json(
      { ok: false, error: "Diana candidate help is unavailable right now." },
      { status: 503 },
    );
  }

  const learnerProfile = await getLearnerProfile({ supabase, ownerId: user.id })
    .catch(() => null);
  const inputWithLearnedContext = {
    ...parsed,
    learnedContext: learnerProfile ? learnerPromptLine(learnerProfile) : null,
  };

  let workerJob: ProductionWorkerJob<DianaVoiceCandidateInput> | null = null;
  try {
    const tenantId = personalTenantId(user.id);
    workerJob = createVoiceCandidateWorkerJob({
      input: inputWithLearnedContext,
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
          error:
            "Diana candidate help is taking a short pause for this account.",
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

    const guarded = await runSafeBudgetedAiCall({
      ownerId: user.id,
      supabase: accounting,
      input: [
        inputWithLearnedContext.transcript,
        inputWithLearnedContext.learnedContext ?? "",
      ],
      systemPrompt:
        "Return one safe, student-owned next move. Never provide final homework or actionable harm.",
      maxOutputTokens: 500,
      idempotencyKey: boundedIdempotencyKey(request),
      invoke: async () => {
        await enqueueWorkerJob(
          workerJob as ProductionWorkerJob<DianaVoiceCandidateInput>,
          "running",
        );
        return createDianaVoiceCandidate({ input: inputWithLearnedContext });
      },
      getOutput: (value) => value.response,
    });
    if (!guarded.ok) {
      const message = guarded.kind === "budget"
        ? "Diana candidate help is paused for today. Try again tomorrow."
        : guarded.kind === "safety"
        ? guarded.message
        : "Diana candidate help is unavailable right now.";
      return NextResponse.json({ ok: false, error: message }, {
        status: guarded.status,
      });
    }
    const result = guarded.value;
    const { error } = await accounting.from("authorship_log").insert({
      owner_id: user.id,
      assignment_id: assignmentId,
      actor: "diana",
      event_type: "local_voice_candidate",
      payload: {
        ...createDianaVoiceCandidateAuditPayload(
          inputWithLearnedContext,
          result,
        ),
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
        errorCode: "audit_write_unavailable",
        errorMetadata: { phase: "audit", retryable: true },
      });
      return NextResponse.json(
        {
          ok: false,
          error:
            "Diana needs to save the authorship receipt before showing that help.",
        },
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
    await recordLearningEvent({
      supabase: accounting,
      ownerId: user.id,
      eventName: "voice_candidate_completed",
      assignmentId,
      feature: "diana.voice_candidate",
      sourceTable: "worker_jobs",
      sourceId: workerJob.id,
      payload: {
        source: parsed.source,
        queued: false,
        responseChars: result.response.length,
      } as unknown as Json,
    }).catch(() => undefined);
    await logInteraction({
      ownerId: user.id,
      assignmentId,
      feature: "voice_candidate",
      model: result.trace.model,
      correlationId: request.headers.get("x-request-id") ?? undefined,
      inputBytes:
        new TextEncoder().encode(inputWithLearnedContext.transcript).byteLength,
      outputBytes: new TextEncoder().encode(result.response).byteLength,
      tokensUsed: Math.max(
        1,
        Math.ceil(
          (inputWithLearnedContext.transcript.length + result.response.length) /
            4,
        ),
      ),
    }, accounting);

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
        errorCode: "worker_internal_error",
        errorMetadata: { phase: "provider", retryable: true },
      }).catch(() => undefined);
    }
    return NextResponse.json(
      { ok: false, error: "Diana candidate help is unavailable right now." },
      { status: 503 },
    );
  }
}

function boundedIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("x-idempotency-key")?.trim();
  return value ? value.slice(0, 128) : undefined;
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
