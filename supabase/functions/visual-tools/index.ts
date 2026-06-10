// supabase/functions/visual-tools/index.ts
// Phase 17: visual learning tools for notes and diagram photos.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  checkTokenBudget,
  incrementTokens,
  logInteraction,
  resetBudgetIfNewDay,
} from "../_shared/safety.ts";
import { buildPersonalizationPrompt, composeSystemPrompt } from "../_shared/system-prompts.ts";
import { adaptationLineForOwner } from "../_shared/adaptation.ts";

const TEXT_MODES = new Set(["mind_map", "concept_graph", "timeline", "comparison_table"]);
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const VISUAL_PROMPT = `You are Diana's visual learning tool for a high-school student.

Return exactly one JSON object. Do not use markdown.

For mind_map or concept_graph:
{
  "title": string,
  "nodes": [{ "id": string, "label": string, "group": string | null }],
  "edges": [{ "from": string, "to": string, "label": string | null }],
  "events": [],
  "columns": [],
  "rows": []
}

For timeline:
{
  "title": string,
  "nodes": [],
  "edges": [],
  "events": [{ "date": string, "label": string, "note": string }],
  "columns": [],
  "rows": []
}

For comparison_table:
{
  "title": string,
  "nodes": [],
  "edges": [],
  "events": [],
  "columns": [string],
  "rows": [{ "label": string, "values": [string] }]
}

Rules:
- Keep labels short.
- Use only facts from the note text.
- For concept_graph, edge labels should explain relationships in 1 to 4 words.
- For timeline, include only events with visible date or clear order.
- For comparison_table, choose 2 to 4 concepts worth comparing.
- Calm tone. No shame/scolding words.`;

const DIAGRAM_PROMPT = `Analyze this class diagram photo for study support.
Return JSON only:
{
  "title": string,
  "annotations": [
    { "label": string, "x": number, "y": number, "prompt": string }
  ],
  "quizPrompt": string
}

x and y are percentages from 0 to 100 of the image width/height.
Label only visible, study-relevant parts. Do not invent details.`;

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function runDiagramAnnotation(
  supabase: ReturnType<typeof createClient>,
  storageKey: string,
  bucket: string,
): Promise<{ content: string; tokens: number }> {
  const ext = (storageKey.split(".").pop() ?? "").toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) throw new Error("Pick a .jpg, .png, .webp, or .gif image.");

  const { data: blob, error } = await supabase.storage.from(bucket).download(storageKey);
  if (error || !blob) throw new Error("Diagram image not found.");
  const base64Data = uint8ArrayToBase64(new Uint8Array(await blob.arrayBuffer()));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY") ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: DIAGRAM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" } },
            { type: "text", text: "Annotate the diagram for study. Do not invent unseen labels." },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("visual-tools diagram error:", await res.text());
    throw new Error("We couldn't annotate that diagram. Try a clearer crop.");
  }
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    content: data.choices?.[0]?.message?.content ?? "{}",
    tokens: Number(data.usage?.prompt_tokens ?? 0) + Number(data.usage?.completion_tokens ?? 0),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      noteId?: unknown;
      aiMode?: unknown;
      mode?: unknown;
      noteTitle?: unknown;
      text?: unknown;
      storageKey?: unknown;
      bucket?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const noteId = typeof body.noteId === "string" ? body.noteId : null;
    const mode = typeof body.mode === "string" ? body.mode : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (aiMode === "red" || aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) {
      return jsonResponse({ error: "You've used your AI quota for today — resets at midnight." }, 429);
    }

    let content = "";
    let tokens = 0;
    let model = "claude-haiku-4-5";
    if (mode === "diagram_annotation") {
      const storageKey = typeof body.storageKey === "string" ? body.storageKey : "";
      const bucket = typeof body.bucket === "string" && body.bucket.length > 0 ? body.bucket : "note-docs";
      const result = await runDiagramAnnotation(supabase, storageKey, bucket);
      content = result.content;
      tokens = result.tokens;
      model = "gpt-4o";
    } else {
      if (!TEXT_MODES.has(mode)) return jsonResponse({ error: "Unknown visual mode" }, 400);
      const noteTitle = typeof body.noteTitle === "string" ? body.noteTitle.slice(0, 200) : "Note";
      const text = typeof body.text === "string" ? body.text.slice(0, 7000) : "";
      if (text.trim().length < 20) return jsonResponse({ error: "Add a little more note text first." }, 400);

      const { data: profile } = await supabase
        .from("profiles")
        .select("interests, session_mood")
        .eq("user_id", ownerId)
        .single();
      const personalization = buildPersonalizationPrompt({
        interests: Array.isArray(profile?.interests) ? profile.interests : [],
        sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
      });
      const systemPrompt = composeSystemPrompt(VISUAL_PROMPT, {
        includeRefuseRedirect: true,
        includeFrustration: false,
        includeMinorSafety: true,
        personalization: [personalization, await adaptationLineForOwner(ownerId, supabase)].filter(Boolean).join("\n") || null,
      });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: `Mode: ${mode}\nTitle: ${noteTitle}\nNote text:\n${text}`,
          }],
        }),
      });
      if (!res.ok) {
        console.error("visual-tools Anthropic error:", await res.text());
        return jsonResponse({ error: "AI request failed" }, 502);
      }
      const data = await res.json() as {
        content?: Array<{ type: string; text: string }>;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      content = data.content?.[0]?.text ?? "";
      tokens = Number(data.usage?.input_tokens ?? 0) + Number(data.usage?.output_tokens ?? 0);
    }

    Promise.resolve()
      .then(async () => {
        await logInteraction(
          {
            ownerId,
            assignmentId: null,
            feature: "visual_tool",
            model,
            promptSummary: `${mode}:${noteId ?? "note"}`,
            tokensUsed: tokens,
          },
          supabase,
        );
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("visual-tools error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
    return jsonResponse({ error: message }, 500);
  }
});
