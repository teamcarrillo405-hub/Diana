// supabase/functions/cs-scaffold/index.ts
// Phase 21: computer science scaffold engine.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";

const MODES = new Set(["error_hint", "pseudocode_bridge", "code_review", "debug_log", "project_scaffold"]);

const CS_PROMPT = `You are Diana's computer science scaffold engine for a high-school student.

Methodology:
- Ask the student to predict, trace, and test before changing code.
- Never paste a complete corrected solution.
- Error hint mode must start with a guiding question about the observed error or line.
- Pseudocode bridge turns student pseudocode into an outline, not finished code.
- Code review mode asks comprehension questions.
- Debug log mode structures: expected, observed, smallest check, next experiment.
- Project scaffold mode supports AP CSP Create Task and AP CSA projects with milestones.

Return exactly one JSON object:
{
  "title": string,
  "cards": [
    { "label": string, "prompt": string, "studentAction": string | null }
  ],
  "pseudocodeSteps": string[],
  "reviewQuestions": string[],
  "debugLog": [
    { "label": string, "prompt": string }
  ],
  "milestones": [
    { "label": string, "goal": string, "check": string }
  ],
  "checkPrompt": string
}

Rules:
- Do not provide complete corrected code.
- If showing a tiny snippet, keep it under one line and make it a question.
- Use only the student's code, error, prompt, and class context.
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
      code?: unknown;
      language?: unknown;
      runtimeError?: unknown;
      prompt?: unknown;
      classContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = typeof body.mode === "string" && MODES.has(body.mode) ? body.mode : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    const code = typeof body.code === "string" ? body.code.slice(0, 8000) : "";
    const language = typeof body.language === "string" ? body.language.slice(0, 40) : "javascript";
    const runtimeError = typeof body.runtimeError === "string" ? body.runtimeError.slice(0, 1200) : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 2000) : "";
    const classContext = typeof body.classContext === "string" ? body.classContext.slice(0, 3000) : "";
    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (!mode) return jsonResponse({ error: "mode required" }, 400);
    if (aiMode === "red" || aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }
    if (`${code}${runtimeError}${prompt}`.trim().length < 3) {
      return jsonResponse({ error: "Add code, an error, or a prompt first." }, 400);
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
    const systemPrompt = composeSystemPrompt(CS_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization,
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
        max_tokens: 1100,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Mode: ${mode}
Language: ${language}
Assignment prompt:
${prompt}

Runtime error:
${runtimeError}

Student code or pseudocode:
${code}

Class context:
${classContext}`,
        }],
      }),
    });
    if (!res.ok) {
      console.error("cs-scaffold Anthropic error:", await res.text());
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
          feature: "cs_scaffold",
          model: "claude-haiku-4-5",
          promptSummary: `${mode}:${prompt || runtimeError || code}`.slice(0, 180),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("cs-scaffold error:", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
