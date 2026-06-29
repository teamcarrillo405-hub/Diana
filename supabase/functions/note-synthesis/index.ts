import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { callStudentTextModel } from "../_shared/student-model.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const SYNTHESIS_PROMPT = `You synthesize a student's own class notes.
Rules:
- Answer the student's query using only the provided note excerpts.
- Cite source notes inline with bracket labels like [N1] and [N2].
- If the notes do not contain enough information, say what the notes do show and what is missing.
- Keep the summary concise: 2 to 5 short paragraphs.
- Add an audioOverviewScript that sounds like a calm 60 to 90 second study briefing for a teenager.
- Output ONLY valid JSON with shape:
{"summary":"...","audioOverviewScript":"...","citations":[{"label":"N1","noteId":"...","title":"...","reason":"..."}]}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

type NoteExcerpt = {
  id: string;
  title: string | null;
  body_text: string | null;
  transcript_text: string | null;
  outline_json: unknown;
  tags: string[] | null;
  ai_suggested_tags: string[] | null;
};

const GENERIC_FALLBACK_SUMMARY = "I found source notes for this question. Start with the cited notes below, then ask a narrower question if you want a tighter answer.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseJsonObject(raw: string): {
  summary: string;
  audioOverviewScript: string;
  citations: Array<{ label: string; noteId: string; title: string; reason: string }>;
} {
  try {
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()) as {
      summary?: unknown;
      audioOverviewScript?: unknown;
      citations?: unknown;
    };
    const summary = typeof parsed.summary === "string"
      ? parsed.summary
      : GENERIC_FALLBACK_SUMMARY;
    const audioOverviewScript = typeof parsed.audioOverviewScript === "string" && parsed.audioOverviewScript.trim().length > 0
      ? parsed.audioOverviewScript.slice(0, 1800)
      : `Quick study overview. ${summary}`.slice(0, 1800);
    return {
      summary,
      audioOverviewScript,
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
    return {
      summary: GENERIC_FALLBACK_SUMMARY,
      audioOverviewScript: `Quick study overview. ${GENERIC_FALLBACK_SUMMARY}`,
      citations: [],
    };
  }
}

function needsSourceFallback(summary: string): boolean {
  return summary === GENERIC_FALLBACK_SUMMARY || summary.includes("Next move scaffold");
}

function buildSourceNotebookFallback(query: string, notes: NoteExcerpt[]): { summary: string; audioOverviewScript: string } {
  const source = notes[0];
  const title = source?.title ?? "your notes";
  const text = source ? notePlainText(source) : "";
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 25)
    .slice(0, 5);
  const tags = source ? [...(source.tags ?? []), ...(source.ai_suggested_tags ?? [])].slice(0, 5) : [];
  const focus = tags.length > 0 ? tags.join(", ") : "the main class ideas";
  const details = sentences.length > 0
    ? sentences
    : ["Use the source note to name the main terms, compare the key ideas, and choose one example from class."];
  const summary = [
    `Your notebook answer for "${query}" should start from [N1] ${title}.`,
    `The main focus is ${focus}. ${details.slice(0, 3).join(" ")}`,
    "For studying, turn this into three checks: define the key terms, compare the ideas side by side, and explain one class example in your own words.",
  ].join("\n\n");
  const audioOverviewScript = [
    `Here is the quick audio overview for ${title}.`,
    `The big idea is ${focus}.`,
    details.slice(0, 4).join(" "),
    "Before the quiz, listen for three things: what each term means, how the ideas compare, and one example you can explain without looking.",
    "A strong next move is to make two flashcards and one compare-and-contrast note from this source.",
  ].join(" ").slice(0, 1800);
  return { summary, audioOverviewScript };
}

function notePlainText(note: NoteExcerpt): string {
  const outline = Array.isArray(note.outline_json)
    ? note.outline_json.map((node) => {
        const n = node as { heading?: string; bullets?: string[] };
        return [n.heading, ...(Array.isArray(n.bullets) ? n.bullets : [])].filter(Boolean).join(". ");
      }).join(". ")
    : "";
  return [note.transcript_text, note.body_text, outline]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackCitations(
  notes: Array<{ id: string; title: string | null }>,
): Array<{ label: string; noteId: string; title: string; reason: string }> {
  return notes.slice(0, 3).map((note, index) => ({
    label: `N${index + 1}`,
    noteId: note.id,
    title: note.title ?? `Note ${index + 1}`,
    reason: "Used as one of the source notes for this answer.",
  }));
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

    const ai = await callStudentTextModel({
      system,
      user: `Query: ${query}\n\nSource notes:\n${excerpts}`,
      maxTokens: 700,
      quality: "quality",
      json: true,
    });
    let parsed = parseJsonObject(ai.content);
    if (needsSourceFallback(parsed.summary)) {
      const sourceFallback = buildSourceNotebookFallback(query, notes as NoteExcerpt[]);
      parsed = {
        ...parsed,
        summary: sourceFallback.summary,
        audioOverviewScript: sourceFallback.audioOverviewScript,
      };
    }
    const validIds = new Set(notes.map((note) => note.id));
    const citations = parsed.citations.filter((citation) => validIds.has(citation.noteId));
    const sourceCitations = citations.length > 0 ? citations : fallbackCitations(notes);

    Promise.resolve()
      .then(async () => {
        await logInteraction({
          ownerId,
          assignmentId: null,
          feature: "note_synthesis",
          model: ai.model,
          promptSummary: query.slice(0, 200),
          tokensUsed: ai.tokens,
        }, supabase);
        await incrementTokens(ownerId, ai.tokens, supabase);
      })
      .catch((e) => console.warn("note-synthesis side effects failed", e));

    return json({
      summary: parsed.summary,
      audioOverviewScript: parsed.audioOverviewScript,
      citations: sourceCitations,
    });
  } catch (err) {
    console.error("note-synthesis error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
