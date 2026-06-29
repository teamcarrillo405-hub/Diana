// supabase/functions/writing-aid/index.ts
// F10: Writing coach — Sonnet 4.6, explains rules without editing student text.
// ai_mode: 'red' and 'yellow' both return 403 (yellow = citations only).
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
import { callStudentTextModel } from "../_shared/student-model.ts";

const WRITING_PROMPT = `You are a writing coach for a high-school student
with dyslexia and/or ADHD. The student will share a sentence or short
passage from their writing. Your rules:
- NEVER edit, rewrite, or "fix" the student's text. Do not output a corrected version.
- Identify ONE rule the passage breaks (grammar, mechanics, style, or substance).
  Explain that rule in plain language, then give a parallel example sentence
  that demonstrates the rule correctly using DIFFERENT content.
- End with: "Want to try rewriting yours?"
- If asked to "just fix it" or "write this for me", refer to the
  refuse-with-redirect guidance.
- Calm tone. \u2264 6 short sentences total.`;

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
      prompt?: unknown;
      aiMode?: unknown;
    };

    const { ownerId, assignmentId, prompt, aiMode } = body;

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

    // 2. aiMode check — both 'red' and 'yellow' block writing-aid (yellow = citations only)
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

    // 5. Compose system prompt with F17 + F18 + MINOR_SAFETY fragments
    const systemPrompt = composeSystemPrompt(WRITING_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,

      personalization: await adaptationLineForOwner(ownerId, supabase),
    });

    // 6. Build single user message — writing-aid is per-sentence (no history needed)
    const messages = [
      { role: "user" as const, content: prompt as string },
    ];

    const ai = await callStudentTextModel({
      system: systemPrompt,
      user: messages[0].content,
      maxTokens: 500,
      quality: "quality",
    });
    const content = ai.content;
    const tokens = ai.tokens;

    // 8. Fire-and-forget: log to ai_interactions + increment token counter.
    //    Must NOT block the response (AI-SAFETY-01 constraint).
    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: (assignmentId as string | null | undefined) ?? null,
            feature: "writing_aid",
            model: ai.model,
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
    console.error("writing-aid error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
