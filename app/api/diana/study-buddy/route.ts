import { NextResponse } from "next/server";
import { createLinearEquationStudyResponse } from "@/lib/math/linear-equation-tutor";
import {
  formatHomeworkKernelForTutor,
  homeworkAuthorshipMetadata,
  homeworkModelRouting,
  inferStudyHelperEvent,
  loadAssignmentHomeworkKernel,
  type AssignmentHomeworkKernel,
} from "@/lib/assignment-help/server-understanding";
import { createClient } from "@/lib/supabase/server";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { assertDianaHomeworkAllowed, resolveDianaHomeworkTrust } from "@/lib/ai/diana-trust-rules";
import type { Json } from "@/lib/supabase/types";
import {
  normalizeTutorComplexity,
  normalizeTutorPersona,
  normalizeTutorStyle,
} from "@/lib/profile";
import { logInteraction } from "@/lib/ai/safety";
import {
  createTutorResponseEvidence,
  parseTutorResponseEvidence,
  type TutorResponseEvidence,
} from "@/lib/ai/tutor-response-evidence";
import {
  parseVisibleTutorProviderState,
  resolveVisibleTutorProviderState,
  type VisibleTutorProviderState,
} from "@/lib/assignment-help/provider-state";
import {
  addTrustedStudyBuddySourceEvidence,
  buildStudyBuddySourceEvidenceContext,
  linearEquationTutorEvidence,
  studyBuddySourceAnchorLabel,
} from "@/lib/assignment-help/study-buddy-evidence";
import type {
  StudyHelperInput,
  StudyHelperMode,
  StudyHelperResult,
} from "@/lib/integrations/diana-study-helper-sidecar";
import {
  formatCanonicalSpecialistContextsForPrompt,
  loadCanonicalSpecialistContextsForAssignment,
} from "@/lib/assignment-submission-server";

const DAILY_LIMIT = 35;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type ConversationTurn = { role: "assistant" | "student"; text: string };

type StudyHelperRouteInput = StudyHelperInput & {
  classId: string | null;
  assignmentId: string | null;
  qaScenario: string | null;
};

function normalizeInput(raw: unknown): StudyHelperRouteInput | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const source = typeof data.source === "string" ? data.source.trim() : "";
  const conversation: ConversationTurn[] = Array.isArray(data.conversation)
    ? data.conversation
      .filter((turn): turn is Record<string, unknown> => Boolean(turn) && typeof turn === "object" && !Array.isArray(turn))
      .map((turn) => ({
        role: turn.role === "assistant" ? "assistant" as const : turn.role === "student" ? "student" as const : null,
        text: typeof turn.text === "string" ? turn.text.trim().slice(0, 1000) : "",
      }))
      .filter((turn): turn is ConversationTurn => Boolean(turn.role) && turn.text.length > 0)
      .slice(-10)
    : [];
  const question = typeof data.question === "string"
    ? data.question.trim()
    : "";
  if (question.length < 1 || question.length > 1000) return null;
  if (
    data.classId !== undefined && data.classId !== null &&
    data.classId !== "" && (
      typeof data.classId !== "string" || !UUID_PATTERN.test(data.classId)
    )
  ) return null;
  if (
    data.assignmentId !== undefined && data.assignmentId !== null &&
    data.assignmentId !== "" && (
      typeof data.assignmentId !== "string" || !UUID_PATTERN.test(data.assignmentId)
    )
  ) return null;
  const mode: StudyHelperMode = data.mode === "hint"
    ? "hint"
    : data.mode === "quiz"
    ? "quiz"
    : "guide";
  return {
    source,
    question,
    mode,
    conversation,
    classId: typeof data.classId === "string" && data.classId
      ? data.classId
      : null,
    assignmentId: typeof data.assignmentId === "string" && data.assignmentId
      ? data.assignmentId
      : null,
    qaScenario: data.qaScenario === "tutor-chat:default"
      ? data.qaScenario
      : null,
  };
}

export async function POST(request: Request) {
  let input = normalizeInput(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json(
      { ok: false, error: "Add a question to get Diana's help." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({
      ok: false,
      error: "Sign in to get Diana's help.",
    }, { status: 401 });
  }
  let homeworkKernel: AssignmentHomeworkKernel | null = null;
  let canonicalSpecialistContext = "";
  if (input.assignmentId) {
    const currentStudyEvent = inferStudyHelperEvent(input.question);
    homeworkKernel = await loadAssignmentHomeworkKernel({
      supabase,
      ownerId: user.id,
      assignmentId: input.assignmentId,
      currentStudyEvent,
      eventSource: "study_buddy",
    });
    if (!homeworkKernel) {
      return NextResponse.json({ ok: false, error: "Assignment not found." }, { status: 404 });
    }
    const specialistContexts = await loadCanonicalSpecialistContextsForAssignment({
      supabase,
      ownerId: user.id,
      assignmentId: input.assignmentId,
      consumer: "ask_diana",
      kernel: homeworkKernel,
    });
    canonicalSpecialistContext = specialistContexts && specialistContexts.length > 0
      ? formatCanonicalSpecialistContextsForPrompt(specialistContexts)
      : "";
    input = {
      ...input,
      classId: homeworkKernel.assignment.class_id,
      source: formatHomeworkKernelForTutor(homeworkKernel, {
        visibleWork: input.source,
        maxChars: 20_000,
      }),
    };
  }
  const trustDecision = homeworkKernel?.trustDecision ?? resolveDianaHomeworkTrust();
  const trustAllowed = assertDianaHomeworkAllowed(trustDecision);
  if (!trustAllowed.ok) {
    return NextResponse.json({ ok: false, error: trustAllowed.error }, { status: 403 });
  }

  const accounting = createAiServiceClient();
  if (!accounting) {
    const providerState = resolveVisibleTutorProviderState({
      availability: "unavailable",
      reasonCode: "unknown",
      retryable: true,
    });
    return NextResponse.json(
      {
        ok: false,
        error: providerState.message ?? "Diana study help is unavailable right now.",
        evidence: unavailableTutorEvidence(providerState),
        providerState,
      },
      { status: 503 },
    );
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await accounting
    .from("authorship_log")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .eq("event_type", "study_buddy_response")
    .gte("created_at", yesterday);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        ok: false,
        error: "Diana study help is paused for today. Try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tutor_persona, tutor_style, tutor_complexity")
    .eq("user_id", user.id)
    .maybeSingle();

  const configuredInput: StudyHelperInput = {
    source: input.source,
    question: input.question,
    mode: input.mode,
    conversation: input.conversation,
    tutorPersona: normalizeTutorPersona(profile?.tutor_persona),
    tutorStyle: normalizeTutorStyle(profile?.tutor_style),
    complexity: normalizeTutorComplexity(profile?.tutor_complexity),
  };
  const sourceEvidenceContext = buildStudyBuddySourceEvidenceContext(
    homeworkKernel,
    input.question,
  );

  const deterministicQa = process.env.NODE_ENV !== "production" &&
    process.env.QA_CREATE_USER === "true" &&
    input.qaScenario === "tutor-chat:default";
  const deterministicLinearResult = createLinearEquationStudyResponse(configuredInput);

  try {
    const qaResult = deterministicLinearResult ?? fallbackStudyHelperResult(input.source);
    let providerResult: {
      value: StudyHelperResult;
      moderationContent: string;
      tokens: number;
      malformed: boolean;
      evidence: TutorResponseEvidence;
      providerState: VisibleTutorProviderState;
    };
    let providerModel = "qa-deterministic";
    let providerLogged = false;
    const idempotencyKey = boundedIdempotencyKey(request);

    if (deterministicQa) {
      providerResult = {
        value: qaResult,
        moderationContent: JSON.stringify(qaResult),
        tokens: 0,
        malformed: false,
        evidence: addTrustedStudyBuddySourceEvidence(
          aiGuidanceEvidence(),
          sourceEvidenceContext,
        ),
        providerState: resolveVisibleTutorProviderState({ availability: "available" }),
      };
    } else {
      const routing = homeworkKernel
        ? homeworkModelRouting(homeworkKernel, {
            visibleWork: configuredInput.source,
            signals: configuredInput.question,
          })
        : undefined;
      const { data, error } = await supabase.functions.invoke("study-buddy", {
        body: {
          ownerId: user.id,
          classId: input.classId,
          assignmentId: input.assignmentId,
          source: configuredInput.source,
          question: configuredInput.question,
          mode: configuredInput.mode,
          conversation: configuredInput.conversation ?? [],
          tutorPersona: configuredInput.tutorPersona,
          tutorStyle: configuredInput.tutorStyle,
          complexity: configuredInput.complexity,
          routing,
          sourceAnchors: sourceEvidenceContext.validatedAnchors,
          specialistContext: canonicalSpecialistContext || undefined,
          idempotencyKey,
          correlationId: request.headers.get("x-request-id") ?? undefined,
        },
      });
      const edgeSuccess = parseStudyBuddyEdgeSuccess(data);
      if (error || !edgeSuccess) {
        if (!deterministicLinearResult) {
          const failure = await studyBuddyEdgeFailure(error, data);
          return NextResponse.json(
            {
              ok: false,
              error: failure.message,
              ...(failure.evidence ? { evidence: failure.evidence } : {}),
              ...(failure.providerState ? { providerState: failure.providerState } : {}),
            },
            { status: failure.status },
          );
        }
        const degradedState = resolveVisibleTutorProviderState({
          availability: "degraded",
          reasonCode: "network",
        });
        providerResult = {
          value: deterministicLinearResult,
          moderationContent: JSON.stringify(deterministicLinearResult),
          tokens: 1,
          malformed: false,
          evidence: linearEquationTutorEvidence(sourceEvidenceContext, [
            "The provider is limited, so Diana is showing only the locally checked algebra step.",
          ]),
          providerState: degradedState,
        };
        providerModel = "deterministic-linear-equation";
      } else {
        providerResult = {
          value: edgeSuccess.response,
          moderationContent: JSON.stringify(edgeSuccess.response),
          tokens: edgeSuccess.tokens,
          malformed: false,
          evidence: edgeSuccess.evidence,
          providerState: edgeSuccess.providerState,
        };
        providerModel = edgeSuccess.model;
        providerLogged = true;
      }
    }
    let result = mergeLinearEquationStudyResult(providerResult.value, deterministicLinearResult);
    const evidence = deterministicLinearResult
      ? linearEquationTutorEvidence(sourceEvidenceContext, providerResult.evidence.limitations)
      : addTrustedStudyBuddySourceEvidence(providerResult.evidence, sourceEvidenceContext);
    const exactAnchorLabel = studyBuddySourceAnchorLabel(sourceEvidenceContext);
    if (exactAnchorLabel && evidence.validatedAnchors.length > 0) {
      result = { ...result, anchor: exactAnchorLabel };
    }
    const estimatedTokens = providerResult.tokens || Math.max(
      1,
      Math.ceil(
        (input.source.length + input.question.length +
          JSON.stringify(result).length) / 4,
      ),
    );

    try {
      await accounting.from("authorship_log").insert({
        owner_id: user.id,
        assignment_id: input.assignmentId,
        actor: "diana",
        event_type: "study_buddy_response",
        payload: {
          mode: input.mode,
          tutorPersona: configuredInput.tutorPersona,
          tutorStyle: configuredInput.tutorStyle,
          complexity: configuredInput.complexity,
          sourceChars: input.source.length,
          questionChars: input.question.length,
          responseChars: JSON.stringify(result).length,
          model: providerModel,
          evidence: homeworkEvidenceReceipt(evidence, providerResult.providerState),
          homework: homeworkKernel ? homeworkAuthorshipMetadata(homeworkKernel, { route: "study-buddy", visibleWorkChars: configuredInput.source.length }) : null,
        } as unknown as Json,
      });
    } catch {
      console.warn("study_buddy authorship log did not complete");
    }

    if (!providerLogged) {
      await logInteraction({
        ownerId: user.id,
        assignmentId: input.assignmentId,
        feature: "study_buddy",
        model: providerModel,
        correlationId: request.headers.get("x-request-id") ?? undefined,
        inputBytes: new TextEncoder().encode(`${input.source}\n${input.question}`)
          .byteLength,
        outputBytes: new TextEncoder().encode(JSON.stringify({
          response: result,
          evidence,
          providerState: providerResult.providerState,
        })).byteLength,
        tokensUsed: estimatedTokens,
      }, accounting);
    }

    return NextResponse.json({
      ok: true,
      response: result,
      evidence,
      providerState: providerResult.providerState,
    });
  } catch {
    const providerState = resolveVisibleTutorProviderState({
      availability: "unavailable",
      reasonCode: "unknown",
    });
    return NextResponse.json(
      {
        ok: false,
        error: providerState.message ?? "Diana study help is unavailable right now.",
        providerState,
        evidence: unavailableTutorEvidence(providerState),
      },
      { status: 503 },
    );
  }
}

function boundedIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("x-idempotency-key")?.trim();
  return value ? value.slice(0, 128) : undefined;
}
function fallbackStudyHelperResult(source: string): StudyHelperResult {
  return {
    title: "Guided step",
    main: "Which phrase in the source gives you the clearest starting point?",
    reason: "Naming that phrase keeps the reasoning in your own words.",
    steps: [
      "Point to one phrase.",
      "Explain it simply.",
      "Connect it to your claim.",
    ],
    anchor: `This help is anchored to: ${source.slice(0, 100)}`,
  };
}

type StudyBuddyEdgeSuccess = {
  ok: true;
  response: StudyHelperResult;
  evidence: TutorResponseEvidence;
  providerState: VisibleTutorProviderState;
  model: string;
  tokens: number;
};

function parseStudyBuddyEdgeSuccess(value: unknown): StudyBuddyEdgeSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const evidence = parseTutorResponseEvidence(candidate.evidence);
  const providerState = parseVisibleTutorProviderState(candidate.providerState);
  if (
    candidate.ok !== true ||
    !isStudyHelperResultValue(candidate.response) ||
    typeof candidate.model !== "string" ||
    candidate.model.endsWith(":fallback") ||
    typeof candidate.tokens !== "number" ||
    !evidence ||
    evidence.verificationLevel !== "ai_guidance" ||
    evidence.validatedAnchors.length > 0 ||
    evidence.verifierResult !== null ||
    !providerState ||
    providerState.availability !== "available" ||
    providerState.visible
  ) return null;
  return {
    ok: true,
    response: candidate.response,
    evidence,
    providerState,
    model: candidate.model,
    tokens: candidate.tokens,
  };
}

async function studyBuddyEdgeFailure(
  error: unknown,
  data: unknown,
): Promise<{
  status: number;
  message: string;
  evidence: TutorResponseEvidence | null;
  providerState: VisibleTutorProviderState | null;
}> {
  let status = 503;
  let payload = data;
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      status = context.status;
      payload = await context.clone().json().catch(() => payload);
    }
  }
  const candidate = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : {};
  const parsedEvidence = parseTutorResponseEvidence(candidate.evidence);
  const parsedProviderState = parseVisibleTutorProviderState(candidate.providerState);
  if (![400, 401, 403, 422, 429].includes(status)) {
    const limitedProviderState = parsedProviderState && parsedProviderState.availability !== "available"
      ? parsedProviderState
      : null;
    const providerState = limitedProviderState ?? resolveVisibleTutorProviderState({
      availability: "unavailable",
      reasonCode: "network",
    });
    return {
      status: 503,
      message: providerState.message ?? "Diana study help is unavailable right now.",
      evidence: limitedProviderState && parsedEvidence
        ? parsedEvidence
        : unavailableTutorEvidence(providerState),
      providerState,
    };
  }
  const message = typeof candidate.message === "string" && candidate.message.trim()
    ? candidate.message.trim()
    : typeof candidate.error === "string" && candidate.error.trim()
    ? candidate.error.trim()
    : "Diana study help is unavailable right now.";
  return {
    status,
    message,
    evidence: parsedEvidence,
    providerState: parsedProviderState,
  };
}

function mergeLinearEquationStudyResult(
  value: StudyHelperResult,
  deterministicLinearResult: StudyHelperResult | null,
): StudyHelperResult {
  if (!deterministicLinearResult) return value;
  const deterministicText = [
    deterministicLinearResult.main,
    deterministicLinearResult.reason,
    ...(deterministicLinearResult.steps ?? []),
  ].join(" ");
  if (/answer box is not ready|answer is not ready|works for x|subtract \d+(?:\.\d+)? from both whole sides/iu.test(deterministicText)) {
    return deterministicLinearResult;
  }
  return {
    ...value,
    steps: deterministicLinearResult.steps.length > 0 ? deterministicLinearResult.steps : value.steps,
    visualAid: deterministicLinearResult.visualAid ?? value.visualAid,
  };
}
function isStudyHelperResultValue(value: unknown): value is StudyHelperResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.title === "string"
    && typeof candidate.main === "string"
    && typeof candidate.reason === "string"
    && Array.isArray(candidate.steps)
    && candidate.steps.every((step) => typeof step === "string")
    && typeof candidate.anchor === "string";
}

function aiGuidanceEvidence(): TutorResponseEvidence {
  return createTutorResponseEvidence({
    verificationLevel: "ai_guidance",
    confidence: 0.65,
    validatedAnchors: [],
    verifierResult: null,
    limitations: ["This response is guidance and has not been independently tool checked."],
    escalationReason: null,
  });
}

function unavailableTutorEvidence(
  providerState: VisibleTutorProviderState,
): TutorResponseEvidence {
  return createTutorResponseEvidence({
    verificationLevel: "needs_more_information",
    confidence: 0.2,
    validatedAnchors: [],
    verifierResult: null,
    limitations: ["A provider response is not available for this request."],
    escalationReason: providerState.escalationReason,
  });
}

function homeworkEvidenceReceipt(
  evidence: TutorResponseEvidence,
  providerState: VisibleTutorProviderState,
): Record<string, unknown> {
  return {
    verificationLevel: evidence.verificationLevel,
    confidence: evidence.confidence,
    validatedAnchorCount: evidence.validatedAnchors.length,
    verifier: evidence.verifierResult?.verifier ?? null,
    verifierStatus: evidence.verifierResult?.status ?? null,
    limitationCount: evidence.limitations.length,
    escalationReason: evidence.escalationReason,
    providerAvailability: providerState.availability,
  };
}
export const runtime = "nodejs";
