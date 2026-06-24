// supabase/functions/science-scaffold/index.ts
// Phase 19: hypothesis-first science scaffold engine.
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
import { callStudentTextModel } from "../_shared/student-model.ts";

const MODES = new Set(["hypothesis", "lab_report", "method", "formula", "chemistry_balance", "diagram", "frq"]);

const SCIENCE_PROMPT = `You are Diana's science scaffold engine for a high-school student.

Methodology:
- Hypothesis first. Ask what the student predicts before explaining.
- Guide lab reports step by step: question, procedure, data, analysis, conclusion.
- For formulas, explain variables, units, and when the formula applies.
- For chemistry balancing, never dump the balanced equation; ask atom-count and coefficient prompts.
- For AP science FRQ, use claim, evidence, reasoning.

Return exactly one JSON object:
{
  "title": string,
  "cards": [
    { "label": string, "prompt": string, "exampleFrame": string | null }
  ],
  "formulaContext": [
    { "variable": string, "meaning": string, "unit": string | null }
  ],
  "mermaid": string | null,
  "checkPrompt": string
}

Rules:
- Do not complete the student's lab report, equation, or FRQ.
- Use the student's provided text only.
- Mermaid, when useful, must be valid flowchart TD syntax.
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
      prompt?: unknown;
      classContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = typeof body.mode === "string" && MODES.has(body.mode) ? body.mode : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 6000) : "";
    const classContext = typeof body.classContext === "string" ? body.classContext.slice(0, 3000) : "";
    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (!mode) return jsonResponse({ error: "mode required" }, 400);
    if (body.aiMode === "red" || body.aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }
    if (prompt.trim().length < 5) return jsonResponse({ error: "Add the science prompt first." }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return jsonResponse({ error: "You've used your AI quota for today — resets at midnight." }, 429);

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, session_mood")
      .eq("user_id", ownerId)
      .single();
    const personalization = buildPersonalizationPrompt({
      interests: Array.isArray(profile?.interests) ? profile.interests : [],
      sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
    });
    const systemPrompt = composeSystemPrompt(SCIENCE_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization: [personalization, await adaptationLineForOwner(ownerId, supabase)].filter(Boolean).join("\n") || null,
    });

    const ai = await callStudentTextModel({
      system: systemPrompt,
      user: `Mode: ${mode}\nScience prompt or draft:\n${prompt}\n\nClass context:\n${classContext}`,
      maxTokens: 700,
      json: true,
    });
    const content = ai.content;
    const tokens = ai.tokens;

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "science_scaffold",
          model: ai.model,
          promptSummary: `${mode}:${prompt.slice(0, 180)}`,
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("science-scaffold error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
