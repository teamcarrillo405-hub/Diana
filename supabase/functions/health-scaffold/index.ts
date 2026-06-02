import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const MODES = ["health_question", "movement_goal", "cpr_first_aid", "sleep_recovery"] as const;
type HealthMode = (typeof MODES)[number];

const HEALTH_PROMPT = `You are Diana's PE, health, and wellness scaffold.
Return ONLY JSON:
{
  "prompts": ["student-facing question first"],
  "cards": [{"title": "short", "body": "short explanation", "action": "student action"}],
  "checklist": ["short check"]
}
Rules:
- Keep health class answers calm, factual, medically accurate, and age-appropriate.
- Do not diagnose, prescribe, or replace a clinician, school nurse, counselor, guardian, or emergency service.
- For urgent symptoms or immediate safety concerns, tell the student to get in-person help now.
- For reproductive health, use neutral biology terms and tell the student to follow class materials and ask a trusted adult or clinician for personal situations.
- For nutrition, focus on energy, hydration, regular meals, and class concepts. Do not create body-size or restriction goals.
- For mental health, validate feelings, suggest a small support step, and name trusted support.
- For CPR and first aid, frame content as study support and defer to certified course protocol.
- Keep every item short.`;

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
      mode?: unknown;
      prompt?: unknown;
      aiMode?: unknown;
      classContext?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = MODES.includes(body.mode as HealthMode) ? body.mode as HealthMode : null;
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

    const system = composeSystemPrompt(HEALTH_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
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
        max_tokens: 800,
        system,
        messages: [{
          role: "user",
          content: [
            `Mode: ${mode}`,
            classContext ? `Class context:\n${classContext.slice(0, 2500)}` : "",
            `Student context:\n${prompt.slice(0, 5000)}`,
          ].filter(Boolean).join("\n\n"),
        }],
      }),
    });

    if (!res.ok) {
      console.error("health-scaffold anthropic error:", await res.text());
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
          feature: "health_scaffold",
          model: "claude-haiku-4-5",
          promptSummary: `${mode}: ${prompt}`.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("health-scaffold side effects failed", e));

    return json({ raw });
  } catch (err) {
    console.error("health-scaffold error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
