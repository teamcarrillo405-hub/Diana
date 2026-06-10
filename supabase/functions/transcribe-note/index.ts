import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

interface OutlineNode {
  heading: string;
  bullets: string[];
}

interface AiPayload {
  transcript: string;
  outline: OutlineNode[];
  actionItems?: string[];
}

const SYSTEM_PROMPT = `You are helping a high-school student with ADHD and dyslexia review their in-class notes.

You will receive raw notes the student wrote or dictated during class. They may be fragmented, contain partial sentences, voice-to-text errors, or topical jumps.

Your job:
1. Produce a cleaned transcript: rewrite the raw text into clear, complete sentences. Preserve the student's voice and meaning. Do NOT add facts not present in the raw text. If something is genuinely unclear, leave a brief "[unclear]" marker.
2. Produce a structured outline: 3-6 top-level headings, each with 2-5 short bullet points summarizing what the student captured under that topic.
3. Extract action items: homework, reading, study tasks, project next steps, materials to bring, or dates the student needs to review. Include only tasks explicitly present in the notes. Use short student-facing phrases.

Constraints:
- No numeric scores. No grading.
- Calm, encouraging tone.
- Never say the student's notes are "incomplete" or "wrong." If a section is thin, just summarize what's there.
- Return ONLY valid JSON in this exact shape, with no markdown fence:

{
  "transcript": "<cleaned text>",
  "outline": [
    {"heading": "<topic>", "bullets": ["<point>", "<point>"]}
  ],
  "actionItems": ["<task from the notes>"]
}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { noteId } = await req.json() as { noteId: string };
    if (!noteId) {
      return new Response(JSON.stringify({ error: "noteId required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the note
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, owner_id, body_text, source")
      .eq("id", noteId)
      .single();

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: "Note not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!note.body_text || note.body_text.trim().length < 5) {
      return new Response(JSON.stringify({ error: "Note is empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Call Claude Sonnet 4.6 (reasoning quality matters for outline structuring)
    const truncated = note.body_text.slice(0, 8000);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: `Raw class notes:\n\n${truncated}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "AI transcription failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json() as {
      content: Array<{ type: string; text: string }>;
    };
    const rawText = anthropicData.content?.[0]?.text ?? "{}";

    // 3. Parse JSON safely
    let parsed: AiPayload;
    try {
      // Strip any accidental code fence
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned) as AiPayload;
      if (typeof parsed.transcript !== "string" || !Array.isArray(parsed.outline)) {
        throw new Error("Schema mismatch");
      }
      if (parsed.actionItems !== undefined && !Array.isArray(parsed.actionItems)) {
        parsed.actionItems = [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", rawText, e);
      return new Response(JSON.stringify({ error: "Parse error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actionItems = (parsed.actionItems ?? [])
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);

    // 4. Write transcript + outline back to the row
    const { error: updateError } = await supabase
      .from("notes")
      .update({
        transcript_text:   parsed.transcript,
        outline_json:      parsed.outline,
        action_items_json: actionItems,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", noteId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (note.source === "lecture" && actionItems.length > 0) {
      const rows = actionItems.map((item) => ({
        owner_id: note.owner_id,
        raw: item,
        capture_mode: "text",
        status: "unclassified",
        source_note_id: note.id,
      }));

      const { error: inboxError } = await supabase
        .from("inbox_items")
        .insert(rows);

      if (inboxError) {
        console.warn("action item inbox insert skipped:", inboxError.message);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        noteId,
        outlineCount: parsed.outline.length,
        actionItemCount: actionItems.length,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err) {
    console.error("transcribe-note error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
