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

const MODES = ["art_reflection", "music_theory", "drama_speech", "art_history", "storyboard"] as const;
type ArtsMode = (typeof MODES)[number];

const ARTS_PROMPT = `You are Diana's arts and electives scaffold.
Return ONLY JSON:
{
  "prompts": ["student-facing question first"],
  "cards": [{"title": "short", "body": "short explanation", "action": "student action"}],
  "checklist": ["short check"]
}
Rules:
- Start with student process questions before any comment.
- Never grade the artwork or performance.
- For music theory, cover scale construction and triads when relevant.
- For drama/speech, include memorization chunks and stage direction annotation.
- For AP Art History, use formal analysis: line, color, composition, material, scale, context.
- For photography/film, include shot type, action, sound, and transition.
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
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = MODES.includes(body.mode as ArtsMode) ? body.mode as ArtsMode : null;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";

    if (!ownerId || !mode || prompt.length < 2) return json({ error: "Missing scaffold input" }, 400);
    if (aiMode === "red" || aiMode === "yellow") return json({ error: "AI not available for this class" }, 403);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const system = composeSystemPrompt(ARTS_PROMPT, {
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
        max_tokens: 700,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: [`Mode: ${mode}`, `Student context: ${prompt.slice(0, 5000)}`].join("\n"),
        }],
      }),
    });

    if (!res.ok) {
      console.error("arts-scaffold anthropic error:", await res.text());
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
          feature: "arts_scaffold",
          model: "claude-haiku-4-5",
          promptSummary: `${mode}: ${prompt}`.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("arts-scaffold side effects failed", e));

    return json({ raw });
  } catch (err) {
    console.error("arts-scaffold error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
