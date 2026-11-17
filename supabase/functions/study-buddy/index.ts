import { STUDY_BUDDY_PROMPT, WORKED_SOLUTION_INSTRUCTION, buildUserPrompt, FALLBACK_RESULT, parseResult, type StudyMode, type ConversationTurn, type RoutingInput } from "../_shared/study-buddy-prompt.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireStudentContext } from "../_shared/student-auth.ts";
import { runOpenAIHomeworkAdapter } from "../_shared/homework-adapter.ts";
import {
  normalizeHomeworkAcademicBand,
} from "../_shared/homework-model-tier.ts";
import { logInteraction } from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";
import { withStudentSecurity } from "../_shared/student-handler.ts";
import { loadStudentSupportPersonalization } from "../_shared/student-support-context.ts";
import { recordEdgeStudyBuddyAssistance } from "../_shared/learning/study-buddy-assistance.ts";
import { observeWorkedSolutionEvidence, recordWorkedSolutionDelivery } from "../_shared/learning/worked-solution-evidence.ts";
import {
  edgeAiGuidanceEvidence,
  edgeNeedsMoreInformationEvidence,
  edgeTutorProviderState,
  normalizeEdgeSourceAnchors,
} from "../_shared/tutor-response-evidence.ts";

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function boundedText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedUtf8Text(value: unknown, maxBytes: number): string {
  if (typeof value !== "string") return "";
  const encoded = new TextEncoder().encode(value.trim());
  return encoded.byteLength <= maxBytes
    ? value.trim()
    : new TextDecoder().decode(encoded.slice(0, maxBytes)).trim();
}

function boundedNumber(value: unknown, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.trunc(value)))
    : 0;
}

function allowedChoice(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function normalizeConversation(value: unknown): ConversationTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((turn): turn is Record<string, unknown> => Boolean(turn) && typeof turn === "object" && !Array.isArray(turn))
    .map((turn) => ({
      role: turn.role === "assistant" ? "assistant" as const : "student" as const,
      text: boundedText(turn.text, 1_000),
    }))
    .filter((turn) => turn.text.length > 0)
    .slice(-10);
}

function normalizeRouting(value: unknown): RoutingInput {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    template: boundedText(raw.template, 80) || null,
    subjectDomain: boundedText(raw.subjectDomain, 80) || null,
    academicBand: normalizeHomeworkAcademicBand(raw.academicBand),
    sourceChars: boundedNumber(raw.sourceChars, 100_000),
    studentWorkChars: boundedNumber(raw.studentWorkChars, 100_000),
    hasRubric: raw.hasRubric === true,
    signals: boundedText(raw.signals, 4_000),
  };
}

Deno.serve(withStudentSecurity("study-buddy", async (request: Request) => {
  try {
    const body = await request.json() as Record<string, unknown>;
    const ownerId = boundedText(body.ownerId, 128);
    const assignmentId = boundedText(body.assignmentId, 128) || null;
    const problemId = boundedText(body.problemId, 128) || null;
    const source = boundedText(body.source, 20_000);
    const question = boundedText(body.question, 1_000);
    const mode: StudyMode = body.mode === "hint" ? "hint" : body.mode === "quiz" ? "quiz" : "guide";
    const conversation = normalizeConversation(body.conversation);
    const routing = normalizeRouting(body.routing);
    const sourceAnchors = normalizeEdgeSourceAnchors(body.sourceAnchors);
    const specialistContext = boundedUtf8Text(body.specialistContext, 96_000);
    const rawIdempotencyKey = body.idempotencyKey;
    if (rawIdempotencyKey !== undefined && (typeof rawIdempotencyKey !== "string" ||
      !rawIdempotencyKey.trim() || rawIdempotencyKey.trim().length > 128)) {
      return jsonResponse({ error: "Use a valid request identifier." }, 400);
    }
    const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;
    if (!ownerId) return jsonResponse({ error: "Authentication required." }, 401);
    if (!question) return jsonResponse({ error: "Add a question to get Diana's help." }, 400);

    // Direct Edge callers must satisfy the same stored policy as the Next route,
    // regardless of the general homework product-tier configuration.
    const auth = await requireStudentContext(request, {
      suppliedOwnerId: ownerId, assignmentId, classId: body.classId, requireAiGreen: true,
    });
    if (auth instanceof Response) return auth;
    const supabase = auth.serviceClient;
    const observed = assignmentId && problemId && body.mode === "guide"
      ? await observeWorkedSolutionEvidence({ userClient: auth.userClient, serviceClient: supabase, ownerId: auth.ownerId,
          assignmentId, problemId, mode, question }).catch(() => null)
      : null;
    const workedScope = observed?.decision.allowed ? observed.scope : undefined;
    const userPrompt = buildUserPrompt({
      mode,
      tutorPersona: allowedChoice(body.tutorPersona, ["diana", "xavier", "maya"], "diana"),
      tutorStyle: allowedChoice(body.tutorStyle, ["socratic", "supportive", "direct"], "socratic"),
      complexity: allowedChoice(body.complexity, ["simple", "balanced", "advanced"], "balanced"),
      source,
      question,
      conversation,
      routing,
      sourceAnchors,
      specialistContext,
      selectedWork: workedScope ? { problemText: workedScope.problemText, studentWork: workedScope.studentWork } : undefined,
    });
    const fallbackContent = JSON.stringify(FALLBACK_RESULT);
    const personalization = await loadStudentSupportPersonalization(auth.userClient, auth.ownerId);
    const tutoringPrompt = composeSystemPrompt(STUDY_BUDDY_PROMPT, {
      includeRefuseRedirect: !workedScope, includeFrustration: true, includeMinorSafety: true,
      personalization,
    });
    const system = workedScope ? `${tutoringPrompt}\n\n${WORKED_SOLUTION_INSTRUCTION}` : tutoringPrompt;
    const maxTokens = workedScope ? 1_100 : 800;
    try {
      await recordEdgeStudyBuddyAssistance({ enabled: Deno.env.get("DIANA_DURABLE_TASK_ASSISTANCE_ENABLED") === "true",
        client: auth.userClient, ownerId: auth.ownerId, assignmentId, idempotencyKey, mode,
        system, user: userPrompt, routing, maxTokens, selectedProblemId: workedScope?.problemId ?? null });
    } catch {
      return jsonResponse({ ok: false, code: "assistance_receipt_unavailable",
        error: "Diana study help is paused while this work is saved. Please try again." }, 503);
    }
    const ai = await runOpenAIHomeworkAdapter({
      ownerId,
      supabase,
      task: "study_buddy",
      system,
      user: userPrompt,
      maxTokens,
      json: true,
      fallbackContent,
      routing,
      idempotencyKey,
    });
    const parsedResponse = parseResult(ai.content, Boolean(workedScope));
    const response = parsedResponse.response;
    const providerDegraded = ai.model.endsWith(":fallback") ||
      ai.content === fallbackContent ||
      parsedResponse.usedFallback;
    const providerState = edgeTutorProviderState(providerDegraded ? "degraded" : "available");
    const evidence = providerDegraded
      ? edgeNeedsMoreInformationEvidence(
        providerState.escalationReason ?? "A new provider response is required.",
        ["The provider response used a local fallback and is not returned as a normal tutor success."],
      )
      : edgeAiGuidanceEvidence([
        "Stored source spans are promoted to source checked only after the owner-scoped Next route validates them.",
      ]);

    await logInteraction({
      ownerId,
      assignmentId,
      feature: "study_buddy",
      model: ai.model,
      correlationId: boundedText(body.correlationId, 128) || undefined,
      inputBytes: new TextEncoder().encode(userPrompt).byteLength,
      outputBytes: new TextEncoder().encode(JSON.stringify({ response, evidence, providerState })).byteLength,
      tokensUsed: ai.tokens,
    }, supabase);

    if (providerDegraded) {
      return jsonResponse({
        ok: false,
        error: providerState.message,
        evidence,
        providerState,
      }, 503);
    }

    if (response.workedSolution && (!assignmentId || !workedScope || !await recordWorkedSolutionDelivery({
      serviceClient: supabase, ownerId: auth.ownerId, assignmentId, scope: workedScope,
    }).catch(() => false))) {
      return jsonResponse({ ok: false, code: "worked_solution_record_unavailable",
        error: "Diana could not save this worked solution to your learning record. Try again in a moment." }, 503);
    }

    return jsonResponse({
      ok: true,
      response,
      evidence,
      providerState,
      model: ai.model,
      tokens: ai.tokens,
      ...(response.workedSolution && workedScope ? { workedSolutionProblemId: workedScope.problemId } : {}),
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("study-buddy request did not complete", {
      name: error instanceof Error ? error.name : "unknown",
    });
    const providerState = edgeTutorProviderState("unavailable");
    return jsonResponse({
      ok: false,
      error: providerState.message,
      evidence: edgeNeedsMoreInformationEvidence(
        providerState.escalationReason ?? "A later retry is required.",
        ["The provider request did not produce a response that can be shown as verified guidance."],
      ),
      providerState,
    }, 503);
  }
}));
