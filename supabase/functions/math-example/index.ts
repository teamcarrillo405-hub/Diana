// supabase/functions/math-example/index.ts
// F6 (AP Math depth): Worked example of an ANALOGOUS problem — never the student's actual problem.
// ai_mode: 'red' and 'yellow' both return 403 (math AI gated same as math-step).
// Fire-and-forget: logInteraction + incrementTokens never block the response.
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

const EXAMPLE_PROMPT = `You are a math tutor helping a high-school student see a worked example.

The student describes a problem they are stuck on. You generate an ANALOGOUS BUT DIFFERENT problem (same concept, different numbers and surface form) and show the worked solution step by step.

Strict rules:
- The problem you solve MUST be different from the student's. Different numbers. Different context. Same underlying technique.
- Show the solution in numbered steps. Each step: a short label, the math, and a one-sentence reason.
- Use plain text math notation: x², √, ∫, π, Δ, =, ≠, ≤, ≥. Do not use LaTeX or KaTeX. No backslashes.
- End with one sentence prompting the student back to their own problem, e.g. "Now try the same technique on yours."
- Calm tone. No exclamation marks. Never say "you must", "wrong", or "behind".
- Keep the entire response under 12 short lines.`;

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
      problem?: unknown;
      subject?: unknown;
      aiMode?: unknown;
    };

    const { ownerId, assignmentId, problem, subject, aiMode } = body;

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof problem !== "string" || !problem || (problem as string).length < 1 || (problem as string).length > 2000) {
      return new Response(JSON.stringify({ error: "problem required (1–2000 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const VALID_SUBJECTS = ["calculus", "physics", "algebra"];
    if (typeof subject !== "string" || !VALID_SUBJECTS.includes(subject)) {
      return new Response(JSON.stringify({ error: "subject must be calculus, physics, or algebra" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. aiMode check — both 'red' and 'yellow' block math AI (same gate as math-step)
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

    // 5. Compose system prompt — worked example IS the F18 redirect; no frustration layer needed
    const systemPrompt = composeSystemPrompt(EXAMPLE_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: false,
      includeMinorSafety: true,
      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    // 6. Build single user message — worked example is one-shot, no history
    const userMessage = `Subject: ${subject}\nProblem the student is stuck on:\n${(problem as string).slice(0, 2000)}`;

    // 7. Call Anthropic Haiku 4.5 (D-06)
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
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
            feature: "math_example",
            model: "claude-haiku-4-5",
            promptSummary: (problem as string).slice(0, 200),
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
    console.error("math-example error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
