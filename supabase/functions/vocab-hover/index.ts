import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const VOCAB_PROMPT = `You are Diana's vocabulary scaffold for a high-school student.
Return ONLY JSON:
{
  "definition": "1-2 short plain-language sentences",
  "contextClue": "one short context-clue prompt that asks the student to infer meaning from nearby words",
  "phonics": {
    "syllables": ["short", "chunks"],
    "stress": "which syllable to stress",
    "pronunciation": "hyphenated pronunciation"
  }
}
Rules:
- Pick the meaning that fits the context.
- Use the student's interests only as light context when helpful.
- Keep it calm, short, and age-appropriate.
- Do not answer homework questions or define unsafe content beyond a brief redirect.`;

const WORD_RE = /^[a-zA-Z][a-zA-Z'-]{0,31}$/;
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
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      word?: unknown;
      context?: unknown;
      aiMode?: unknown;
    };

    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const word = typeof body.word === "string" ? body.word.trim() : "";
    const context = typeof body.context === "string" ? body.context.slice(0, 700) : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";

    if (!ownerId) return json({ error: "ownerId required" }, 400);
    if (!word || !WORD_RE.test(word)) return json({ error: "invalid_word" }, 400);
    if (aiMode === "red" || aiMode === "yellow") return json({ error: "ai_disabled" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "budget_exceeded" }, 429);

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests")
      .eq("user_id", ownerId)
      .single();
    const interests = Array.isArray(profile?.interests)
      ? profile.interests.filter((item): item is string => typeof item === "string").slice(0, 5)
      : [];

    const systemPrompt = composeSystemPrompt(VOCAB_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
    });

    const userMessage = [
      `Word: ${word}`,
      context ? `Context: ${context}` : "",
      interests.length > 0 ? `Student interests: ${interests.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic error:", await res.text());
      return json(fallbackSupport(word, context), 200);
    }

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const raw = data.content?.[0]?.text?.trim() ?? "";
    const support = normalizeSupport(raw, word, context);
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;

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

    return json(support);
  } catch (err) {
    console.error("vocab-hover error:", err);
    return json({ error: "internal" }, 500);
  }
});

function normalizeSupport(raw: string, word: string, context: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fallback = fallbackSupport(word, context);
    const phonics = parsed.phonics && typeof parsed.phonics === "object"
      ? parsed.phonics as Record<string, unknown>
      : {};
    const syllables = Array.isArray(phonics.syllables)
      ? phonics.syllables.filter((part): part is string => typeof part === "string" && part.trim().length > 0).slice(0, 8)
      : fallback.phonics.syllables;
    return {
      definition: stringOr(parsed.definition, fallback.definition, 360),
      contextClue: stringOr(parsed.contextClue, fallback.contextClue, 280),
      phonics: {
        syllables: syllables.length > 0 ? syllables : fallback.phonics.syllables,
        stress: stringOr(phonics.stress, fallback.phonics.stress, 120),
        pronunciation: stringOr(phonics.pronunciation, fallback.phonics.pronunciation, 120),
      },
    };
  } catch {
    return {
      ...fallbackSupport(word, context),
      definition: raw ? raw.slice(0, 360) : fallbackSupport(word, context).definition,
    };
  }
}

function fallbackSupport(word: string, context: string) {
  return {
    definition: `A class word to define from the surrounding sentence: ${word}.`,
    contextClue: context
      ? `Context clue: look at how ${word} is used near "${context.replace(/\s+/g, " ").slice(0, 120)}".`
      : `Context clue: look at the words before and after ${word}.`,
    phonics: phonicsFor(word),
  };
}

function phonicsFor(word: string) {
  const clean = word.toLowerCase().replace(/[^a-z'-]/g, "");
  const parts = clean.length <= 4 ? [clean] : clean.match(/[bcdfghjklmnpqrstvwxyz']*[aeiouy]+(?:[bcdfghjklmnpqrstvwxyz](?=[bcdfghjklmnpqrstvwxyz]*[aeiouy]|$))?/gi) ?? [clean];
  const stress = parts.length > 2 ? parts[1] : parts[0];
  return {
    syllables: parts,
    stress: `Stress ${stress}.`,
    pronunciation: parts.map((part) => part === stress ? part.toUpperCase() : part).join("-"),
  };
}

function stringOr(value: unknown, fallback: string, max: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}
