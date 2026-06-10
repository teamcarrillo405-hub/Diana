// supabase/functions/language-scaffold/index.ts
// Phase 22: foreign language scaffold engine.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";

const MODES = new Set(["vocabulary", "conjugation", "reading", "speaking", "writing", "culture"]);

const LANGUAGE_PROMPT = `You are Diana's foreign language scaffold engine for a high-school student.

Methodology:
- Keep the target language visible, but explain task directions in English when helpful.
- Vocabulary mode gives meaning, cognate hint, interest-based example sentence, and pronunciation text.
- Conjugation mode builds a table one cell at a time with prompts for the student to fill.
- Reading mode asks guided questions in English and gives answer frames in the target language.
- Speaking mode uses the transcript from speech-to-text and gives practice prompts, never grades.
- Writing mode helps the student write in the target language without writing the full response.
- Culture mode connects vocabulary to places, customs, daily routines, media, food, or sports.

Return exactly one JSON object:
{
  "targetLanguage": string,
  "title": string,
  "vocabularyCards": [
    { "term": string, "meaning": string, "cognateHint": string | null, "interestSentence": string, "pronunciation": string | null }
  ],
  "conjugationRows": [
    { "pronoun": string, "prompt": string, "example": string | null, "studentHint": string | null }
  ],
  "readingQuestions": [
    { "questionEnglish": string, "answerFrameTarget": string }
  ],
  "speakingPrompts": [
    { "label": string, "feedbackPrompt": string, "practiceLine": string | null }
  ],
  "writingSuggestions": [
    { "label": string, "prompt": string, "exampleFrame": string | null }
  ],
  "cultureCards": [
    { "title": string, "context": string, "comparePrompt": string }
  ],
  "checkPrompt": string
}

Rules:
- Do not grade the student.
- Do not write the full assignment for the student.
- Use the student's interests when building example sentences.
- For Mandarin, use Latin script support when useful.
- Calm tone. No shame/scolding words. No exclamation marks.`;

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      aiMode?: unknown;
      mode?: unknown;
      targetLanguage?: unknown;
      sourceText?: unknown;
      spokenText?: unknown;
      classContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = typeof body.mode === "string" && MODES.has(body.mode) ? body.mode : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    const targetLanguage = typeof body.targetLanguage === "string" ? body.targetLanguage.slice(0, 80) : "Spanish";
    const sourceText = typeof body.sourceText === "string" ? body.sourceText.slice(0, 7000) : "";
    const spokenText = typeof body.spokenText === "string" ? body.spokenText.slice(0, 2500) : "";
    const classContext = typeof body.classContext === "string" ? body.classContext.slice(0, 3000) : "";
    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (!mode) return jsonResponse({ error: "mode required" }, 400);
    if (aiMode === "red" || aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }
    if (`${sourceText}${spokenText}`.trim().length < 2) {
      return jsonResponse({ error: "Add a word, sentence, reading, or spoken transcript first." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return jsonResponse({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, session_mood")
      .eq("user_id", ownerId)
      .single();
    const personalization = buildPersonalizationPrompt({
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
    });
    const systemPrompt = composeSystemPrompt(LANGUAGE_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: [personalization, await adaptationLineForOwner(ownerId, supabase)].filter(Boolean).join("\n") || null,
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Mode: ${mode}
Target language: ${targetLanguage}
Student text or vocabulary:
${sourceText}

Spoken transcript:
${spokenText}

Class context:
${classContext}`,
        }],
      }),
    });
    if (!res.ok) {
      console.error("language-scaffold Anthropic error:", await res.text());
      return jsonResponse({ error: "AI request failed" }, 502);
    }
    const data = await res.json() as {
      content?: Array<{ type: string; text: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = data.content?.[0]?.text ?? "";
    const tokens = Number(data.usage?.input_tokens ?? 0) + Number(data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "language_scaffold",
          model: "claude-haiku-4-5",
          promptSummary: `${mode}:${targetLanguage}:${(sourceText || spokenText).slice(0, 140)}`,
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("language-scaffold error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
