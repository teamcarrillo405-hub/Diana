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

const TARGETS = ["simpler", "more_detail"] as const;
type Target = (typeof TARGETS)[number];

const READING_LEVEL_PROMPT = `You are Diana's reading-level adapter.
Return only the adapted student-facing text.
Rules:
- Preserve the original meaning.
- For simpler: shorter sentences, plain vocabulary, no new claims.
- For more_detail: add brief connective explanation and define key terms, but do not invent facts not supported by the text.
- Keep a calm, neutral tone.
- No preamble and no markdown heading.`;

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
      aiMode?: unknown;
      target?: unknown;
      text?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    const target = TARGETS.includes(body.target as Target) ? body.target as Target : null;
    const text = typeof body.text === "string" ? body.text.trim().slice(0, 8000) : "";

    if (!ownerId || !target || text.length < 20) return json({ error: "Missing reading input" }, 400);
    if (aiMode === "red" || aiMode === "yellow") return json({ error: "AI not available for this class" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const { data: profile } = await supabase
      .from("profiles")
      .select("interests, accommodations")
      .eq("user_id", ownerId)
      .single();

    const system = composeSystemPrompt(READING_LEVEL_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
    });

    const userMessage = [
      `Target: ${target}`,
      `Student interests: ${arrayText(profile?.interests)}`,
      `Accommodations: ${arrayText(profile?.accommodations)}`,
      `Text:\n${text}`,
    ].join("\n");
    const modelResult = await callStudentTextModel({
      system,
      user: userMessage,
      maxTokens: 900,
      fallbackContent: fallbackAdapt(text, target),
    });
    const adapted = modelResult.content.trim() || fallbackAdapt(text, target);

    Promise.allSettled([
      logInteraction(
        {
          ownerId,
          feature: "reading_level",
          model: modelResult.model,
          promptSummary: `reading-level: ${target}`,
          tokensUsed: modelResult.tokens,
        },
        supabase,
      ),
      incrementTokens(ownerId, modelResult.tokens, supabase),
    ]).catch(() => {});

    return json({ text: adapted, fallback: modelResult.model.endsWith(":fallback") });
  } catch (err) {
    console.error("reading-level error:", err);
    return json({ error: "internal" }, 500);
  }
});

function arrayText(value: unknown): string {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").slice(0, 6).join(", ")
    : "";
}

function fallbackAdapt(text: string, target: Target): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (target === "more_detail") {
    return `${trimmed}\n\nFocus points: name the main idea, circle two key terms, and connect one detail back to the assignment.`;
  }
  return trimmed
    .split(/(?<=[.!?])\s+/)
    .slice(0, 8)
    .map((sentence) => sentence.length > 140 ? `${sentence.slice(0, 137).trim()}...` : sentence)
    .join("\n");
}
