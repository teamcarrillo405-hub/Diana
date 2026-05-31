// supabase/functions/vocab-hover/index.ts
// F20-POLISH: Vocab lookup — Haiku 4.5, plain-language definition for 14-17 year olds.
// Trigger: double-click in client — only valid alphabetic words (1-20 chars) reach here.
// aiMode gate: red and yellow both return 403 (silent failure in client).
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

const VOCAB_PROMPT = `You are defining a single word for a 14-17 year old student. Write 1-2 short sentences in plain everyday language. No "in academic terms". No jargon. If the word has multiple meanings, pick the meaning that fits the surrounding context. Return ONLY the definition — no preamble, no "Definition:", no quotes around the word.`;

const WORD_RE = /^[a-zA-Z][a-zA-Z'-]{0,19}$/;

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

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // 1. Parse and validate body
    const body = await req.json() as {
      ownerId?: unknown;
      word?: unknown;
      context?: unknown;
      aiMode?: unknown;
    };

    const { ownerId, aiMode } = body;
    const word = typeof body.word === "string" ? body.word.trim() : "";
    const context = typeof body.context === "string"
      ? body.context.slice(0, 500)
      : "";

    if (typeof ownerId !== "string" || !ownerId) {
      return new Response(JSON.stringify({ error: "ownerId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!word || !WORD_RE.test(word)) {
      return new Response(JSON.stringify({ error: "invalid_word" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. aiMode gate — red and yellow both return 403 (silent in client)
    if (aiMode === "red" || aiMode === "yellow") {
      return new Response(JSON.stringify({ error: "ai_disabled" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
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
        JSON.stringify({ error: "budget_exceeded" }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 5. Compose system prompt with safety fragments
    const systemPrompt = composeSystemPrompt(VOCAB_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
    });

    // 6. Build user message with optional context
    const userMessage = context
      ? `Word: "${word}"\nContext sentence: "${context}"`
      : `Word: "${word}"`;

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
        max_tokens: 150,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "claude_error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const definition = data.content?.[0]?.text?.trim() ?? "";
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;

    // 8. Fire-and-forget — never block response
    Promise.allSettled([
      logInteraction(
        {
          ownerId,
          feature: "vocab_hover",
          model: "claude-haiku-4-5",
          promptSummary: `vocab: ${word}`,
          tokensUsed: inputTokens + outputTokens,
        },
        supabase,
      ),
      incrementTokens(ownerId, inputTokens + outputTokens, supabase),
    ]).catch(() => {});

    return new Response(JSON.stringify({ definition }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("vocab-hover error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
