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

const MODES = ["frq_outline", "mcq_practice", "study_plan"] as const;
type ApMode = (typeof MODES)[number];

const AP_PROMPT = `You are Diana's AP command center scaffold.
Return ONLY JSON:
{
  "title": "short",
  "outline": [{"label": "short", "prompt": "student action", "evidence": "what to use"}],
  "questions": [{"stem": "question", "bestChoice": "A", "skill": "AP skill", "choices": [{"label": "A", "text": "choice", "explanation": "why this fits or is less supported"}]}],
  "plan": ["short milestone"],
  "checklist": ["short check"]
}
Rules:
- Mirror AP/College Board task formats for the requested subject.
- FRQ outlines must be structured by format: DBQ, synthesis, literary analysis, science CER, math work/interpretation, statistics state-plan-do-conclude, language task/register, or social science define-apply-explain.
- MCQ practice must include explanations for every answer choice.
- Use "best fit" and "less supported"; do not use the word wrong.
- Score language must use bands such as "You're in the 3-4 range."
- Keep the tone calm and brief.`;

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
      subject?: unknown;
      mode?: unknown;
      prompt?: unknown;
      aiMode?: unknown;
      classContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const subject = typeof body.subject === "string" ? body.subject : "us_history";
    const mode = MODES.includes(body.mode as ApMode) ? body.mode as ApMode : null;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    const classContext = typeof body.classContext === "string" ? body.classContext : "";

    if (!ownerId || !mode || prompt.length < 2) return json({ error: "Missing scaffold input" }, 400);
    if (aiMode === "red" || aiMode === "yellow") return json({ error: "AI not available for this class" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const system = composeSystemPrompt(AP_PROMPT, {
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
        model: "claude-haiku-4-5",
        max_tokens: 900,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: [
            `Subject: ${subject}`,
            `Mode: ${mode}`,
            classContext ? `Class context:\n${classContext.slice(0, 2500)}` : "",
            `Student context:\n${prompt.slice(0, 5000)}`,
          ].filter(Boolean).join("\n\n"),
        }],
      }),
    });

    if (!res.ok) {
      console.error("ap-scaffold anthropic error:", await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const raw = data.content?.[0]?.text ?? "{}";
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "ap_scaffold",
          model: "claude-haiku-4-5",
          promptSummary: `${subject}/${mode}: ${prompt}`.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("ap-scaffold side effects failed", e));

    return json({ raw });
  } catch (err) {
    console.error("ap-scaffold error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
