// supabase/functions/writing-cowrite/index.ts
// Phase 18: student-first writing co-author engine.
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

const MODES = new Set([
  "essay_scaffold",
  "cowrite",
  "transition",
  "evidence",
  "argument",
  "readability",
  "tone",
]);

const COWRITE_PROMPT = `You are Diana's writing co-author engine for a high-school student.

Core rule: student words go first. You may organize, question, and suggest, but you never write the full assignment or replace the student's voice.

Return exactly one JSON object:
{
  "title": string,
  "suggestions": [
    {
      "label": string,
      "text": string,
      "rationale": string,
      "action": string
    }
  ],
  "authorshipNote": string
}

Mode rules:
- essay_scaffold: produce thesis/outline prompts and paragraph starters, not completed paragraphs.
- cowrite: continue only the student's current sentence or next phrase, <= 35 words, ghost-text style.
- transition: identify the relationship between paragraphs and suggest a bridge move, not a full paragraph.
- evidence: find note/source lines that could support the student's claim; do not invent quotes.
- argument: check claim/evidence/reasoning alignment and ask what connection needs explaining.
- readability: flag long sentences, dense clauses, or unclear references; do not rewrite without student action.
- tone: flag passive voice, vague language, or formality mismatch; do not rewrite the draft.

Keep output short, calm, and specific. No shame/scolding words. No exclamation marks.`;

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
      draft?: unknown;
      prompt?: unknown;
      evidenceContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = typeof body.mode === "string" && MODES.has(body.mode) ? body.mode : "";
    const draft = typeof body.draft === "string" ? body.draft.slice(0, 8000) : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 1500) : "";
    const evidenceContext = typeof body.evidenceContext === "string" ? body.evidenceContext.slice(0, 5000) : "";

    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (!mode) return jsonResponse({ error: "mode required" }, 400);
    if (body.aiMode === "red" || body.aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }
    if (mode !== "essay_scaffold" && draft.trim().length < 10) {
      return jsonResponse({ error: "Add a little of your draft first." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return jsonResponse({ error: "You've used your AI quota for today — resets at midnight." }, 429);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, session_mood")
      .eq("user_id", ownerId)
      .single();
    const personalization = buildPersonalizationPrompt({
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
    });

    const systemPrompt = composeSystemPrompt(COWRITE_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: [personalization, await adaptationLineForOwner(ownerId, supabase)].filter(Boolean).join("\n") || null,
    });

    const userMessage = [
      `Mode: ${mode}`,
      prompt ? `Assignment prompt or student request:\n${prompt}` : "",
      draft ? `Student draft:\n${draft}` : "",
      evidenceContext ? `Available note/source context:\n${evidenceContext}` : "",
    ].filter(Boolean).join("\n\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 900,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error("writing-cowrite Anthropic error:", await res.text());
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
        await logInteraction(
          {
            ownerId,
            assignmentId,
            feature: "writing_cowrite",
            model: "claude-sonnet-4-6",
            promptSummary: `${mode}:${(prompt || draft).slice(0, 180)}`,
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("writing-cowrite error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
