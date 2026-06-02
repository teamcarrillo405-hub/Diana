// supabase/functions/math-step/index.ts
// F09: Socratic math tutor — Haiku 4.5, never reveals the answer.
// ai_mode: 'red' and 'yellow' both return 403 (math is highest Socratic concern).
// Fire-and-forget: logInteraction + incrementTokens never block the response.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";

const MATH_PROMPT = `You are a Socratic math tutor for a high-school student.
The student will share a math problem they are stuck on. Your rules:
- Never write out the final numeric or algebraic answer.
- Never finish the next step for them. Hint at it.
- Always end with a question they can act on, e.g. "What do you think the
  first move is?" or "What rule from class might apply here?"
- If the student says "just give me the answer" or similar, refer to the
  refuse-with-redirect guidance.
- Keep responses \u2264 5 short sentences. Calm tone, never alarmist.`;

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // 1. Parse and validate body
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      history?: unknown;
      prompt?: unknown;
      aiMode?: unknown;
    };

    const { ownerId, assignmentId, history, prompt, aiMode } = body;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof prompt !== "string" || !prompt) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(history)) {
      return new Response(JSON.stringify({ error: "history must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. aiMode check — both 'red' and 'yellow' block math (yellow = citations only)
    if (aiMode === "red" || aiMode === "yellow") {
      return new Response(
        JSON.stringify({ error: "AI not available for this class" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 3. Supabase service-role client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 4. Reset budget if it's a new day, then check remaining budget
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "You've used your AI quota for today \u2014 resets at midnight.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
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

    // 5. Compose system prompt with F17 + F18 + MINOR_SAFETY fragments
    const systemPrompt = composeSystemPrompt(MATH_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
      personalization,
    });

    // 6. Build messages — cap history at last 6 turns (cost + frustration detection window)
    const messages = [
      ...(history as Array<{ role: "user" | "assistant"; content: string }>)
        .slice(-6)
        .map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: prompt as string },
    ];

    // 7. Call Anthropic Haiku 4.5
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 400,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI request failed" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const content = data.content?.[0]?.text ?? "";
    const tokens =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    // 8. Fire-and-forget: log to ai_interactions + increment token counter.
    //    Must NOT block the response (AI-SAFETY-01 constraint).
    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: (assignmentId as string | null | undefined) ?? null,
            feature: "math_step",
            model: "claude-haiku-4-5",
            promptSummary: (prompt as string).slice(0, 200),
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    // 9. Return response
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("math-step error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
