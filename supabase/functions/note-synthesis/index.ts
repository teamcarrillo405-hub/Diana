import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const SYNTHESIS_PROMPT = `You synthesize a student's own class notes.
Rules:
- Answer the student's query using only the provided note excerpts.
- Cite source notes inline with bracket labels like [N1] and [N2].
- If the notes do not contain enough information, say what the notes do show and what is missing.
- Keep the summary concise: 2 to 5 short paragraphs.
- Output ONLY valid JSON with shape:
{"summary":"...","citations":[{"label":"N1","noteId":"...","title":"...","reason":"..."}]}`;

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

function parseJsonObject(raw: string): { summary: string; citations: Array<{ label: string; noteId: string; title: string; reason: string }> } {
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as {
      summary?: unknown;
      citations?: unknown;
    };
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : raw,
      citations: Array.isArray(parsed.citations)
        ? parsed.citations
            .map((item) => item as Record<string, unknown>)
            .filter((item) => typeof item.noteId === "string" && typeof item.title === "string")
            .map((item) => ({
              label: typeof item.label === "string" ? item.label : "",
              noteId: item.noteId as string,
              title: item.title as string,
              reason: typeof item.reason === "string" ? item.reason : "",
            }))
            .slice(0, 8)
        : [],
    };
  } catch {
    return { summary: raw, citations: [] };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      query?: unknown;
      classId?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const classId = typeof body.classId === "string" ? body.classId : null;
    if (!ownerId || query.length < 3) return json({ error: "query required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (classId) {
      const { data: klass } = await supabase
        .from("classes")
        .select("ai_mode")
        .eq("id", classId)
        .eq("owner_id", ownerId)
        .single();
      if (klass?.ai_mode === "red" || klass?.ai_mode === "yellow") {
        return json({ error: "AI not available for this class" }, 403);
      }
    }

    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return json({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    let notesQuery = supabase
      .from("notes")
      .select("id, title, body_text, transcript_text, outline_json, tags, ai_suggested_tags, updated_at")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(12);
    if (classId) notesQuery = notesQuery.eq("class_id", classId);
    const { data: notes, error: notesErr } = await notesQuery;
    if (notesErr) return json({ error: "Could not load notes" }, 500);
    if (!notes || notes.length === 0) return json({ error: "No notes available" }, 404);

    const excerpts = notes.map((note, index) => {
      const label = `N${index + 1}`;
      const outline = Array.isArray(note.outline_json)
        ? note.outline_json.map((node) => {
            const n = node as { heading?: string; bullets?: string[] };
            return [n.heading, ...(Array.isArray(n.bullets) ? n.bullets : [])].filter(Boolean).join("; ");
          }).join("\n")
        : "";
      const text = [note.transcript_text, note.body_text, outline]
        .filter((part) => typeof part === "string" && part.trim().length > 0)
        .join("\n")
        .slice(0, 1400);
      return `[${label}] noteId=${note.id}\nTitle: ${note.title}\nTags: ${[...(note.tags ?? []), ...(note.ai_suggested_tags ?? [])].join(", ")}\nExcerpt:\n${text}`;
    }).join("\n\n---\n\n");

    const system = composeSystemPrompt(SYNTHESIS_PROMPT, {
      includeRefuseRedirect: false,
      includeFrustration: false,
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
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: `Query: ${query}\n\nSource notes:\n${excerpts}`,
        }],
      }),
    });

    if (!res.ok) {
      console.error("note-synthesis anthropic error:", await res.text());
      return json({ error: "AI request failed" }, 502);
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const raw = data.content?.[0]?.text ?? "";
    const parsed = parseJsonObject(raw);
    const validIds = new Set(notes.map((note) => note.id));
    const citations = parsed.citations.filter((citation) => validIds.has(citation.noteId));
    const tokens = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId: null,
          feature: "note_synthesis",
          model: "claude-sonnet-4-6",
          promptSummary: query.slice(0, 200),
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("note-synthesis side effects failed", e));

    return json({ summary: parsed.summary, citations });
  } catch (err) {
    console.error("note-synthesis error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
