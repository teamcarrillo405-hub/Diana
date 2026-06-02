import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const REFLECTION_PROMPT = `You are Diana, a calm weekly reflection mirror for a high-school student.
Rules:
- Respond in 2 short sentences.
- Reflect what the student noticed without grading them.
- Name one small carry-forward for next week.
- Do not use streak, ranking, shame, or alarm language.
- Do not diagnose or provide therapy.`;

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
    const body = await req.json() as { ownerId?: unknown; reflection?: unknown; mood?: unknown };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const reflection = typeof body.reflection === "string" ? body.reflection.trim() : "";
    const mood = typeof body.mood === "string" ? body.mood : null;
    if (!ownerId || reflection.length < 2) return json({ error: "Reflection text required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const system = composeSystemPrompt(REFLECTION_PROMPT, {
      includeRefuseRedirect: false,
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
        max_tokens: 180,
        system,
        messages: [{
          role: "user",
          content: [`Mood: ${mood ?? "not set"}`, `Reflection: ${reflection.slice(0, 2000)}`].join("\n"),
        }],
      }),
    });

    if (!res.ok) {
      console.error("weekly-reflection anthropic error:", await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const text = (data.content?.[0]?.text ?? "").trim();
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId: null,
          feature: "weekly_reflection",
          model: "claude-haiku-4-5",
          promptSummary: reflection.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("weekly-reflection side effects failed", e));

    return json({ reflection: text });
  } catch (err) {
    console.error("weekly-reflection error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
