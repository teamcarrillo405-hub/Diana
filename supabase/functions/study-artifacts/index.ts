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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: artifactType === "practice_test" ? 1600 : 1300,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: [
            `Artifact type: ${artifactType}`,
            `Study mode: ${studyMode}`,
            `Source type: ${sourceType}`,
            `Source title: ${sourceTitle}`,
            classContext ? `Class context:\n${classContext}` : "",
            `Source material:\n${sourceText}`,
          ].filter(Boolean).join("\n\n"),
        }],
      }),
    });

    if (!res.ok) {
      console.error("study-artifacts anthropic error:", await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = data.content?.[0]?.text ?? "";
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "study_artifacts",
          model: "claude-sonnet-4-6",
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
