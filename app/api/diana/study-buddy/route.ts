import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { ENGINE_VERSION } from "@/lib/learning-engine/contracts";
import { curriculumPromptContext, retrieveForAssignment,learningAccess,tutorLearningContext } from "@/lib/learning-engine/server";
import { assignmentProblemSourceState } from "@/lib/learning-engine/assignment-problem-source";
import { referenceBookSelectionSchema, retrieveTextbookForTutor, textbookTutorPromptContext, textbookResponseAnchor, type ReferenceBookSelection } from "@/lib/learning-engine/textbook-tutor";
import { createLinearEquationStudyResponse } from "@/lib/math/linear-equation-tutor";
import { localFirstAlgebra, LOCAL_FIRST_ALGEBRA_VERSION } from "@/lib/math/local-first-algebra";
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
import { studyBuddyEligibility } from "@/lib/assignment-help/study-buddy-eligibility";
import { recordStudyBuddyAssistance, type StudyBuddyAssistanceClient } from "@/lib/learning-engine/study-buddy-assistance";
import { assertDianaHomeworkAllowed, resolveDianaHomeworkTrust } from "@/lib/ai/diana-trust-rules";
import type { Json } from "@/lib/supabase/types";
import {
  normalizeTutorComplexity,
  normalizeTutorPersona,
  normalizeTutorStyle,
} from "@/lib/profile";
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
  problemId: string | null;
  qaScenario: string | null;
  referenceBook?: ReferenceBookSelection;
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
  const referenceBook = data.referenceBook === undefined ? undefined : referenceBookSelectionSchema.safeParse(data.referenceBook);
  if (referenceBook && !referenceBook.success) return null;
  if (referenceBook && !data.classId && !data.assignmentId) return null;
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
  if (
    data.problemId !== undefined && data.problemId !== null && data.problemId !== "" &&
    (typeof data.problemId !== "string" || !UUID_PATTERN.test(data.problemId))
  ) return null;
  if (data.problemId && !data.assignmentId) return null;
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
    ...(referenceBook?.success ? {referenceBook: referenceBook.data} : {}),
    classId: typeof data.classId === "string" && data.classId
      ? data.classId
      : null,
    assignmentId: typeof data.assignmentId === "string" && data.assignmentId
      ? data.assignmentId
      : null,
    problemId: typeof data.problemId === "string" && data.problemId
      ? data.problemId
      : null,
    qaScenario: data.qaScenario === "tutor-chat:default"
      ? data.qaScenario
      : null,
  };
}

export async function POST(request: Request) {
  const suppliedRequestKey = request.headers.get("x-idempotency-key");
  if (suppliedRequestKey !== null && (!suppliedRequestKey.trim() || suppliedRequestKey.trim().length > 128)) {
    return NextResponse.json({ ok: false, error: "Use a valid request identifier." }, { status: 400 });
  }
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
  const eligibility = await studyBuddyEligibility(supabase, {
    ownerId: user.id, assignmentId: input.assignmentId, classId: input.classId,
  });
  if (!eligibility.ok) {
    return NextResponse.json({ ok: false, error: eligibility.error }, { status: eligibility.status });
  }
  input = { ...input, classId: eligibility.classId };
  let homeworkKernel: AssignmentHomeworkKernel | null = null;
  const studentWorkSource = input.source;
  let canonicalSpecialistContext = "";
  let selectedProblemContext = "";
  let selectedProblemText: string | null = null;
  let selectedProblemHasNoSavedWork = false;
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
    if (input.problemId) {
      const selectedProblem = await supabase.from("assignment_problems").select("id,problem_number,problem_text,source,unit_label,unit_type,student_work")
        .eq("id", input.problemId).eq("assignment_id", homeworkKernel.assignment.id).eq("owner_id", user.id).maybeSingle();
      if (selectedProblem.error || !selectedProblem.data) {
        return NextResponse.json({ ok: false, error: "This problem is not available in this assignment." }, { status: 404 });
      }
      const saved = selectedProblem.data;
      selectedProblemHasNoSavedWork = Boolean(saved.student_work && typeof saved.student_work === "object"
        && !Array.isArray(saved.student_work) && Object.values(saved.student_work).every(value => typeof value === "string" && value.trim() === ""));
      const sourceState = assignmentProblemSourceState(saved.source,saved.unit_type);
      if (saved.unit_type === "problem" && sourceState.interpretation === "model_extraction") {
        return NextResponse.json({ok:false,error:"Check the imported problem wording against the source before asking Diana about it."},{status:409});
      }
      if (saved.unit_type === "problem" && sourceState.interpretation !== "model_extraction") {
        selectedProblemText = saved.problem_text;
      }
      selectedProblemContext = `Selected work unit from the owned assignment: ${saved.unit_label || `Problem ${saved.problem_number}`}. ${saved.problem_text.slice(0, 4000)}\n`
        + `Source state: ${sourceState.description}`;
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
      source: (selectedProblemContext ? selectedProblemContext + "\n\n" : "") + formatHomeworkKernelForTutor(homeworkKernel, {
        visibleWork: input.source,
        maxChars: 20_000,
      }),
    };
  }
  let referenceClassMode: unknown;
  if (input.referenceBook && !homeworkKernel) {
    const course = await supabase.from("classes").select("id,ai_mode").eq("id",input.classId!).eq("owner_id",user.id).maybeSingle();
    if (course.error || !course.data) return NextResponse.json({ok:false,error:"Class not found."},{status:404});
    referenceClassMode = course.data.ai_mode;
  }
  const trustDecision = homeworkKernel?.trustDecision ?? resolveDianaHomeworkTrust({classAiMode:referenceClassMode});
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
  const deterministicQa = process.env.NODE_ENV !== "production" &&
    process.env.QA_CREATE_USER === "true" &&
    input.qaScenario === "tutor-chat:default";
  const providerEnabled = process.env.DIANA_STUDY_BUDDY_PROVIDER_ENABLED !== "false";
  // Work chat includes the current question as its first student turn. That is
  // the same request, not prior instructional context. Any other history stays
  // on the broader tutor path.
  const initialQuestionOnly = input.conversation?.length === 1 && input.conversation[0].role === "student"
    && input.conversation[0].text === input.question;
  const initialLocalResult = deterministicQa ? null : localFirstAlgebra({
    ownedProblem: selectedProblemHasNoSavedWork ? selectedProblemText : null, visibleWork: studentWorkSource,
    question: input.question, mode: input.mode, conversationLength: initialQuestionOnly ? 0 : input.conversation?.length ?? 0,
    hasReferenceSelection: Boolean(input.referenceBook),
  });
  const sourceEvidenceContext = buildStudyBuddySourceEvidenceContext(
    homeworkKernel,
    input.question,
  );
  const curriculumEvidence = homeworkKernel && await learningAccess("retrieval", user.id)
    ? await retrieveForAssignment({
        ownerId: user.id,
        assignmentId: homeworkKernel.assignment.id,
        classId: homeworkKernel.assignment.class_id,
        query: input.question,
        referenceBook: input.referenceBook,
        allowSemanticFallback: providerEnabled && !initialLocalResult,
      })
    : null;
  if (curriculumEvidence?.status === "source_conflict") {
    // Conflicting versions cannot become a tutoring evidence set by adding a
    // textbook or asking a provider to choose between them.
    return NextResponse.json({
      ok: true,
      response: {
        title: "Choose the source version",
        main: "The selected source versions conflict. I need the intended version before helping with this question.",
        reason: "Choosing the source keeps the next step tied to your assignment.",
        steps: ["Open the assigned source.", "Check its edition or revision label.", "Which source version should we use?"],
        anchor: "Source selection needs confirmation.",
      },
      evidence: createTutorResponseEvidence({ verificationLevel: "needs_more_information", confidence: 0,
        limitations: ["The source conflict is unresolved; no answer or interpretation was checked."],
        escalationReason: "Confirm the intended source version." }),
      provider: { called: false, responseOrigin: "local", tokens: 0 },
      providerState: resolveVisibleTutorProviderState({ availability: "available" }),
      learning: { version: ENGINE_VERSION, retrieval: curriculumEvidence, interpretationVerified: false,
        eligibleForKnowledge: false, learner: null },
    }, { headers: { "Cache-Control": "no-store" } });
  }
  const referenceEvidence = curriculumEvidence?.references ?? (input.referenceBook
    ? await retrieveTextbookForTutor(input.question,input.referenceBook) : null);
  if (curriculumEvidence?.status === "matched") {
    configuredInput.source = curriculumPromptContext(curriculumEvidence)
      + "\nCurrent student work:\n" + studentWorkSource.slice(0,6000)
      + "\nAssignment context:\n" + input.source.slice(0,2500);
  }
  if (referenceEvidence && !curriculumEvidence?.references) {
    configuredInput.source += "\n" + textbookTutorPromptContext(referenceEvidence);
  }
  const learnerEvidence=homeworkKernel&&await learningAccess("assessment",user.id)
    ? await tutorLearningContext({ownerId:user.id,assignmentId:homeworkKernel.assignment.id,
      hasEvidence:curriculumEvidence?.status==="matched"||referenceEvidence?.status==="matched"||sourceEvidenceContext.validatedAnchors.length>0,
      priorSupport:(input.conversation??[]).filter(turn=>turn.role==="assistant").length,
      ...(input.problemId?{problemId:input.problemId}:{})})
    : null;
  if(learnerEvidence) configuredInput.source=
    "Server-selected support step: "+learnerEvidence.support.action+". "+learnerEvidence.support.reason
    +"\nSkill evidence is provisional; never infer understanding from help requests or completion.\n"+configuredInput.source;

  // A whole assignment, retrieved example or conversation is not the selected
  // exercise. Assignment help requires an exact owned problem for this helper.
  const deterministicInput = homeworkKernel
    ? selectedProblemText === null ? null : { ...configuredInput, source: selectedProblemText }
    : { ...configuredInput, source: studentWorkSource };
  const deterministicLinearResult = deterministicInput ? createLinearEquationStudyResponse(deterministicInput) : null;
  if (!providerEnabled && !initialLocalResult && !deterministicQa) {
    return NextResponse.json({ ok: false, error: "This question needs help beyond the available local tools. Your work is still here.",
      provider: { called: false, tokens: 0 }, code: "local_capability_unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const qaResult = deterministicLinearResult ?? fallbackStudyHelperResult(input.source);
    let providerResult: {
      value: StudyHelperResult;
      moderationContent: string;
      tokens: number;
      malformed: boolean;
      evidence: TutorResponseEvidence;
      providerState: VisibleTutorProviderState;
      origin: "local" | "api";
    };
    let providerModel = "qa-deterministic";
    let providerAttempted = false;
    const idempotencyKey = boundedIdempotencyKey(request);
    const routing = homeworkKernel
      ? homeworkModelRouting(homeworkKernel, { visibleWork: configuredInput.source, signals: configuredInput.question })
      : undefined;
    // Whole-assignment context is visible even when a problem is selected.
    // Record that full scope before releasing local help or dispatching to Edge.
    const assistance = input.assignmentId ? await recordStudyBuddyAssistance(
      supabase as unknown as StudyBuddyAssistanceClient,
      { ownerId: user.id, assignmentId: input.assignmentId,
        requestId: assistanceRequestId(user.id, idempotencyKey), selectedProblemId: input.problemId,
        channel: deterministicQa || initialLocalResult ? "local" : "api", kind: input.mode === "hint" ? "hint" : "guide" },
      JSON.parse(JSON.stringify({ contextVersion: "study-buddy-route-v1", input: configuredInput, routing,
        classId: input.classId, sourceAnchors: sourceEvidenceContext.validatedAnchors,
        specialistContext: canonicalSpecialistContext, referenceBook: input.referenceBook,
        retrieval: curriculumEvidence, referenceEvidence,
        localCapabilityVersion: initialLocalResult ? LOCAL_FIRST_ALGEBRA_VERSION : null,
        responsePath: deterministicQa ? "local-qa" : initialLocalResult ? "local-initial-algebra" : "edge-with-local-fallback" })),
    ) : null;

    if (initialLocalResult) {
      providerResult = {
        value: initialLocalResult, moderationContent: JSON.stringify(initialLocalResult),
        tokens: 0, malformed: false,
        evidence: linearEquationTutorEvidence(sourceEvidenceContext, ["An initial operation was selected locally from the owned problem; no student answer was assessed."]),
        providerState: resolveVisibleTutorProviderState({ availability: "available" }), origin: "local",
      };
      providerModel = LOCAL_FIRST_ALGEBRA_VERSION;
    } else if (deterministicQa) {
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
        origin: "local",
      };
    } else {
      providerAttempted = true;
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
        const failure = await studyBuddyEdgeFailure(error, data);
        if (!deterministicLinearResult || failure.status !== 503 || failure.guardBlocked) {
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
          tokens: 0,
          malformed: false,
          evidence: linearEquationTutorEvidence(sourceEvidenceContext, [
            "The provider is limited, so Diana is showing a local algebra scaffold.",
          ]),
          providerState: degradedState,
          origin: "local",
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
          origin: "api",
        };
        providerModel = edgeSuccess.model;
      }
    }
    // Verification describes the exact delivered result, never neighboring API prose.
    let result = providerResult.value;
    const evidence = providerResult.origin === "local" && deterministicLinearResult
      ? linearEquationTutorEvidence(sourceEvidenceContext, providerResult.evidence.limitations)
      : addTrustedStudyBuddySourceEvidence(providerResult.evidence, sourceEvidenceContext);
    const exactAnchorLabel = studyBuddySourceAnchorLabel(sourceEvidenceContext);
    if (!initialLocalResult && exactAnchorLabel && evidence.validatedAnchors.length > 0) {
      result = { ...result, anchor: exactAnchorLabel };
    } else if (!initialLocalResult && referenceEvidence) {
      result = { ...result, anchor: textbookResponseAnchor(referenceEvidence) };
    }
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
          inputBytes: new TextEncoder().encode(JSON.stringify(configuredInput)).byteLength,
          outputBytes: new TextEncoder().encode(JSON.stringify(result)).byteLength,
          model: providerModel,
          responseOrigin: providerResult.origin,
          responseProviderTokens: providerResult.tokens,
          durableAssistance: assistance?.status === "recorded" ? {
            scope: assistance.receipt.scope, requestId: assistance.receipt.requestId,
            payloadSha256: assistance.receipt.payloadSha256, recordedAt: assistance.receipt.recordedAt,
          } : null,
          evidence: homeworkEvidenceReceipt(evidence, providerResult.providerState),
          homework: homeworkKernel ? homeworkAuthorshipMetadata(homeworkKernel, { route: "study-buddy", visibleWorkChars: configuredInput.source.length }) : null,
        } as unknown as Json,
      });
    } catch {
      console.warn("study_buddy authorship log did not complete");
    }

    // Actual API usage is recorded by Edge. Local feedback must not invent an AI call or token estimate.

    return NextResponse.json({
      ok: true,
      response: result,
      evidence,
      providerState: providerResult.providerState,
      provider: { called: providerAttempted, responseOrigin: providerResult.origin, tokens: providerResult.tokens },
      routing: { localCapability: initialLocalResult ? LOCAL_FIRST_ALGEBRA_VERSION : null },
      ...(referenceEvidence ? {references:referenceEvidence} : {}),
      ...(curriculumEvidence||learnerEvidence ? { learning: {
        version: ENGINE_VERSION,
        retrieval: curriculumEvidence,
        interpretationVerified: false,
        learner:learnerEvidence,
      } } : {}),
    }, { headers: { "Cache-Control": "no-store" } });
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
  return value || undefined;
}
function assistanceRequestId(ownerId: string, key: string | undefined): string {
  if (!key) return randomUUID();
  // Owner-bound request identity is deliberately independent of payload/scope:
  // reusing a key for changed content must conflict, not create another request.
  const hex = createHash("sha256").update(`study-buddy-assistance-v1:${ownerId}:${key}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
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
  guardBlocked: boolean;
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
  // A structured guard failure must not become a local success, including
  // unavailable moderation or accounting services that return HTTP 503.
  const guardBlocked = typeof candidate.code === "string" || typeof candidate.kind === "string";
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
      guardBlocked,
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
    guardBlocked,
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
