import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const TAG_PROMPT = `You suggest short study-note tags for a high-school student.
Rules:
- Output ONLY a JSON array of 3 to 6 strings.
- Tags are lowercase, 2 to 32 characters, no hashtag symbol.
- Prefer course concepts, people, events, formulas, or skills.
- Do not include labels like "notes" or "homework".
- Do not judge note quality.`;

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

function normalizeTags(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const tag = value
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    if (tag.length < 2 || tag.length > 32 || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 6) break;
  }
  return tags;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as { ownerId?: unknown; noteId?: unknown };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const noteId = typeof body.noteId === "string" ? body.noteId : "";
    if (!ownerId || !noteId) return json({ error: "ownerId and noteId required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: note } = await supabase
      .from("notes")
      .select("id, owner_id, title, body_text, transcript_text, class_id, classes(ai_mode)")
      .eq("id", noteId)
      .single();

    if (!note || note.owner_id !== ownerId) return json({ error: "Note not found" }, 404);
    const aiMode = Array.isArray(note.classes) ? note.classes[0]?.ai_mode : note.classes?.ai_mode;
    if (aiMode === "red" || aiMode === "yellow") {
      return json({ error: "AI not available for this class" }, 403);
    }

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    const system = composeSystemPrompt(TAG_PROMPT, {
      includeRefuseRedirect: false,
      includeFrustration: false,
      includeMinorSafety: true,
    });
    const noteText = [
      `Title: ${note.title}`,
      `Text: ${(note.transcript_text || note.body_text || "").slice(0, 5000)}`,
    ].join("\n");

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
        messages: [{ role: "user", content: noteText }],
      }),
    });

    if (!res.ok) {
      console.error("note-tags anthropic error:", await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const raw = data.content?.[0]?.text ?? "[]";
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
    } catch {
      parsed = [];
    }
    const tags = normalizeTags(parsed);
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId: null,
          feature: "note_tags",
          model: "claude-haiku-4-5",
          promptSummary: String(note.title ?? "").slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("note-tags side effects failed", e));

    return json({ tags });
  } catch (err) {
    console.error("note-tags error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
