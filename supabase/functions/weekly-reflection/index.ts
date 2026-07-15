import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";

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

    const userMessage = [
      `Mood: ${mood ?? "not set"}`,
      `Reflection: ${reflection.slice(0, 2000)}`,
    ].join("\n");
    const modelResult = await callStudentTextModel({
      system,
      user: userMessage,
      maxTokens: 180,
      fallbackContent: "You took time to notice what this week felt like. Carry one small thing that helped into next week.",
    });
    const text = modelResult.content.trim();
    const tokens = modelResult.tokens;

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId: null,
          feature: "weekly_reflection",
          model: modelResult.model,
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
