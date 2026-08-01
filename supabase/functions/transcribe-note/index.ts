import { withStudentSecurity } from "../_shared/student-handler.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callSafeStudentTextModel,
  contentByteLength,
  logInteraction,
} from "../_shared/safety.ts";
import { composeSystemPrompt } from "../_shared/system-prompts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

interface OutlineNode {
  heading: string;
  bullets: string[];
}

interface AiPayload {
  transcript: string;
  outline: OutlineNode[];
  actionItems?: string[];
}

const SYSTEM_PROMPT =
  `You are helping a high-school student with ADHD and dyslexia review their in-class notes.

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

Deno.serve(withStudentSecurity("transcribe-note", async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const { noteId, ownerId } = await req.json() as {
      noteId: string;
      ownerId: string;
    };
    if (!noteId || !ownerId) {
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
      .eq("owner_id", ownerId)
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

    // 2. Moderate the complete note, generate, then moderate the complete result.
    const truncated = note.body_text.slice(0, 8000);
    const userMessage = `Raw class notes:\n\n${truncated}`;
    const systemPrompt = composeSystemPrompt(SYSTEM_PROMPT, {
      includeRefuseRedirect: true,
      includeFrustration: true,
      includeMinorSafety: true,
    });
    const modelResult = await callSafeStudentTextModel({
      ownerId,
      supabase,
      system: systemPrompt,
      user: userMessage,
      maxTokens: 1500,
      quality: "quality",
      json: true,
      fallbackContent: "{}",
    });
    const rawText = modelResult.content;

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
      if (
        typeof parsed.transcript !== "string" || !Array.isArray(parsed.outline)
      ) {
        throw new Error("Schema mismatch");
      }
      if (
        parsed.actionItems !== undefined && !Array.isArray(parsed.actionItems)
      ) {
        parsed.actionItems = [];
      }
    } catch (error) {
      console.error("transcribe-note response parse did not complete", {
        responseBytes: contentByteLength(rawText),
        errorName: error instanceof Error ? error.name : "unknown",
      });
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
        transcript_text: parsed.transcript,
        outline_json: parsed.outline,
        action_items_json: actionItems,
        updated_at: new Date().toISOString(),
      })
      .eq("id", noteId)
      .eq("owner_id", note.owner_id);

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

    void logInteraction({
      ownerId,
      feature: "transcribe_note",
      model: modelResult.model,
      correlationId: crypto.randomUUID(),
      inputBytes: contentByteLength(userMessage),
      outputBytes: contentByteLength(rawText),
      tokensUsed: modelResult.tokens,
    }, supabase);

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
        },
      },
    );
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("transcribe-note error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}));
