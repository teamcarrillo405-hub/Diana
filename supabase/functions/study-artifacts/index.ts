import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";

const ARTIFACT_PROMPT = `You create study artifacts from the student's real class material.
Rules:
- Use only the provided assignment, note, rubric, and class context.
- Do not create final assignment work for the student.
- Keep all output as study support: recall prompts, hints, source anchors, and student-authored next steps.
- Prefer active recall over passive summary.
- If a fact is not in the provided material, do not invent it.
- Include sourceAnchor strings that point back to the provided material.
- Output ONLY valid JSON with this exact shape:
{
  "title": string,
  "summary": string,
  "guide": [{"heading": string, "bullets": string[]}],
  "quiz": [{"question": string, "choices": string[], "answer": string, "hint": string, "sourceAnchor": string}],
  "cards": [{"front": string, "back": string, "sourceAnchor": string}],
  "nextSteps": string[],
  "trustNote": string,
  "authorshipReceipt": string,
  "practiceSettings": {
    "questionCount": number,
    "difficulty": "light" | "standard" | "challenge",
    "questionTypes": ("short_response" | "multiple_choice" | "evidence_check" | "application")[]
  },
  "editState": {
    "cardsReviewed": number,
    "cardsEdited": number,
    "lastEditedAt": null,
    "readyForReview": boolean
  },
  "reviewLoop": {
    "currentStage": "source" | "helper" | "artifact" | "review" | "mastery" | "next_support",
    "steps": [{"stage": string, "label": string, "sourceAnchor": string, "studentAction": string, "masterySignal": string}],
    "nextReviewAction": string,
    "masterySignal": "still_learning" | "getting_there" | "secure",
    "nextSupportUse": string
  },
  "visualBreakdown": {
    "kind": string,
    "title": string,
    "sourceAnchored": boolean,
    "blocks": [{"label": string, "prompt": string, "sourceAnchor": string, "studentAction": string}],
    "quizPrompt": string,
    "storyboard": {
      "format": "board" | "timeline" | "concept_map" | "process_diagram" | "compare_table" | "card_stack",
      "layout": string,
      "altText": string,
      "sourceAnchors": string[],
      "interactionPrompt": string
    }
  },
  "authorshipReceiptDetail": {
    "sourceAnchors": string[],
    "dianaActions": string[],
    "studentActions": string[],
    "aiContribution": "none" | "organize" | "hint" | "practice" | "draft_suggestion",
    "finalWorkProtected": true,
    "refusalRedirectLogged": boolean,
    "sensitiveDataExcluded": true,
    "teacherSafeSummary": string,
    "studentActionRequired": string,
    "shareSummary": string
  }
}

Artifact expectations:
- study_guide: 3 to 5 guide sections, 3 to 5 quiz items, 3 to 6 cards.
- practice_test: 6 to 8 quiz items, each with a hint and source anchor.
- flashcard_set: 8 to 12 cards with concise student-editable wording.

Study modes:
- guided_steps: break the material into first moves and questions.
- visual_breakdown: use boards, timelines, compare cards, or concept maps in guide sections.
- retrieval_quiz: focus on recall and test-like questions.
- flashcard_builder: focus on term/idea cards the student should edit before saving.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildStudyArtifactFallback({
  artifactType,
  studyMode,
  sourceType,
  sourceTitle,
}: {
  artifactType: string;
  studyMode: string;
  sourceType: string;
  sourceTitle: string;
}) {
  const anchor = `${sourceType}: ${sourceTitle}`;
  const questionCount = artifactType === "practice_test" ? 6 : 3;
  return JSON.stringify({
    title: `${sourceTitle} study support`,
    summary: "A source-anchored review scaffold is ready. Add your own wording as you work through it.",
    guide: [
      {
        heading: "Find the key idea",
        bullets: [
          "Reread the source once.",
          "Mark one term, detail, or step that seems central.",
          "Explain that part in your own words.",
        ],
      },
    ],
    quiz: [
      {
        question: "What does the source say directly?",
        choices: ["I can point to a source detail", "I need another look at the source"],
        answer: "I can point to a source detail",
        hint: "Keep the source open and choose one exact detail before answering.",
        sourceAnchor: anchor,
      },
    ],
    cards: [
      {
        front: `What is one key idea in ${sourceTitle}?`,
        back: "Write the idea in your own words, then check it against the source.",
        sourceAnchor: anchor,
      },
    ],
    nextSteps: ["Choose one source detail.", "Write one short recall response.", "Check your response against the source."],
    trustNote: "This scaffold stays anchored to the material you provided.",
    authorshipReceipt: "Diana organized a review scaffold. The student supplies and checks the learning responses.",
    practiceSettings: {
      questionCount,
      difficulty: "standard",
      questionTypes: ["short_response", "evidence_check"],
    },
    editState: {
      cardsReviewed: 0,
      cardsEdited: 0,
      lastEditedAt: null,
      readyForReview: false,
    },
    reviewLoop: {
      currentStage: "artifact",
      steps: [
        {
          stage: "source",
          label: "Open the source",
          sourceAnchor: anchor,
          studentAction: "Choose one detail to recall.",
          masterySignal: "Can you explain it without copying?",
        },
        {
          stage: "review",
          label: "Check your wording",
          sourceAnchor: anchor,
          studentAction: "Compare your response with the source.",
          masterySignal: "Does your response match the source meaning?",
        },
      ],
      nextReviewAction: "Try one source-anchored recall response.",
      masterySignal: "still_learning",
      nextSupportUse: `Use ${studyMode.replaceAll("_", " ")} after the first recall response.`,
    },
    visualBreakdown: {
      kind: "source_board",
      title: "Source to recall",
      sourceAnchored: true,
      blocks: [
        {
          label: "Source detail",
          prompt: "Choose one exact detail from the material.",
          sourceAnchor: anchor,
          studentAction: "Restate it in your own words.",
        },
      ],
      quizPrompt: "Which source detail supports your response?",
      storyboard: {
        format: "board",
        layout: "Source detail, student wording, source check",
        altText: "A three-step board that moves from a source detail to a student response and a source check.",
        sourceAnchors: [anchor],
        interactionPrompt: "Complete one block at a time.",
      },
    },
    authorshipReceiptDetail: {
      sourceAnchors: [anchor],
      dianaActions: ["Organized a source-anchored review scaffold"],
      studentActions: ["Select source details", "Write recall responses", "Check responses against the source"],
      aiContribution: "organize",
      finalWorkProtected: true,
      refusalRedirectLogged: false,
      sensitiveDataExcluded: true,
      teacherSafeSummary: "Diana organized source-based review prompts without creating final assignment work.",
      studentActionRequired: "The student writes and checks every learning response.",
      shareSummary: "Source-based study scaffold created. Student responses remain student-authored.",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      aiMode?: unknown;
      artifactType?: unknown;
      studyMode?: unknown;
      sourceType?: unknown;
      sourceTitle?: unknown;
      sourceText?: unknown;
      classContext?: unknown;
    };

    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const aiMode = body.aiMode === "green" || body.aiMode === "yellow" || body.aiMode === "red"
      ? body.aiMode
      : "green";
    const artifactType = typeof body.artifactType === "string" ? body.artifactType : "";
    const studyMode = typeof body.studyMode === "string" ? body.studyMode : "";
    const sourceType = typeof body.sourceType === "string" ? body.sourceType : "";
    const sourceTitle = typeof body.sourceTitle === "string" ? body.sourceTitle.slice(0, 240) : "Class material";
    const sourceText = typeof body.sourceText === "string" ? body.sourceText.trim().slice(0, 10000) : "";
    const classContext = typeof body.classContext === "string" ? body.classContext.trim().slice(0, 5000) : "";

    if (!ownerId || sourceText.length < 20) return json({ error: "source material required" }, 400);
    if (!["study_guide", "practice_test", "flashcard_set"].includes(artifactType)) {
      return json({ error: "artifact type required" }, 400);
    }
    if (!["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"].includes(studyMode)) {
      return json({ error: "study mode required" }, 400);
    }
    if (!["assignment", "note"].includes(sourceType)) return json({ error: "source type required" }, 400);
    if (aiMode === "red" || aiMode === "yellow") return json({ error: "AI not available for this class" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const system = composeSystemPrompt(ARTIFACT_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    const userMessage = [
      `Artifact type: ${artifactType}`,
      `Study mode: ${studyMode}`,
      `Source type: ${sourceType}`,
      `Source title: ${sourceTitle}`,
      classContext ? `Class context:\n${classContext}` : "",
      `Source material:\n${sourceText}`,
    ].filter(Boolean).join("\n\n");
    const fallbackContent = buildStudyArtifactFallback({
      artifactType,
      studyMode,
      sourceType,
      sourceTitle,
    });
    const modelResult = await callStudentTextModel({
      system,
      user: userMessage,
      maxTokens: artifactType === "practice_test" ? 3000 : 2400,
      quality: "quality",
      json: true,
      fallbackContent,
      timeoutMs: 30_000,
    });
    const content = modelResult.content;
    const tokens = modelResult.tokens;

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "study_artifacts",
          model: modelResult.model,
          promptSummary: `${artifactType}: ${sourceTitle}`.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("study-artifacts side effects failed", e));

    return json({ content });
  } catch (err) {
    console.error("study-artifacts error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
