// supabase/functions/history-scaffold/index.ts
// Phase 20: history and social studies scaffold engine.
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

const TEXT_MODES = new Set(["primary_source", "cause_effect", "happ", "dbq", "compare", "current_events"]);
const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const HISTORY_PROMPT = `You are Diana's history and social studies scaffold engine for a high-school student.

Methodology:
- Evidence first. Ask the student to observe source details before interpretation.
- Never write the essay for the student.
- Primary source mode creates annotation prompts, not conclusions.
- Cause-effect mode creates a branching chain with evidence checkpoints.
- HAPP mode covers Historical context, Audience, Purpose, and Point of view.
- DBQ mode creates a six-part outline from the provided documents or prompt.
- Compare mode uses lenses such as context, evidence, cause, impact, and limitation.
- Current events mode connects a historical pattern to today while naming differences.

Return exactly one JSON object:
{
  "title": string,
  "cards": [
    { "label": string, "prompt": string, "sentenceFrame": string | null, "evidenceHint": string | null }
  ],
  "causeEffect": [
    { "cause": string, "effect": string, "connector": string | null }
  ],
  "happ": [
    { "key": "historical_context" | "audience" | "purpose" | "point_of_view", "prompt": string, "evidenceHint": string | null }
  ],
  "dbqOutline": [
    { "label": string, "goal": string, "evidenceSlots": string[] }
  ],
  "comparison": [
    { "lens": string, "first": string, "second": string, "bridge": string | null }
  ],
  "currentConnections": [
    { "then": string, "now": string, "bridgeQuestion": string }
  ],
  "checkPrompt": string
}

Rules:
- Use only the student's provided source, prompt, and class context.
- If evidence is missing, ask for the missing source detail.
- Keep prompts short and student-actionable.
- Calm tone. No shame/scolding words. No exclamation marks.`;

const MAP_PROMPT = `Analyze this map image for social studies support.
Return JSON only:
{
  "title": string,
  "annotations": [
    { "label": string, "x": number, "y": number, "prompt": string }
  ],
  "quizPrompt": string
}

x and y are percentages from 0 to 100 of the image width/height.
Label only visible, study-relevant regions, routes, borders, or symbols.
Prompts should ask the student to connect the map detail to history, geography, government, or economics.
Do not invent unseen regions.`;

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

async function runMapAnnotation(
  supabase: ReturnType<typeof createClient>,
  storageKey: string,
  bucket: string,
): Promise<{ content: string; tokens: number }> {
  const ext = (storageKey.split(".").pop() ?? "").toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) throw new Error("Pick a .jpg, .png, .webp, or .gif image.");

  const { data: blob, error } = await supabase.storage.from(bucket).download(storageKey);
  if (error || !blob) throw new Error("Map image not found.");
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
        { role: "system", content: MAP_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" } },
            { type: "text", text: "Annotate the map for a student label quiz. Use visible map details only." },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("history-scaffold map error:", await res.text());
    throw new Error("We couldn't annotate that map. Try a clearer crop.");
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

  try {
    const body = await req.json() as {
      ownerId?: unknown;
      assignmentId?: unknown;
      aiMode?: unknown;
      mode?: unknown;
      sourceText?: unknown;
      classContext?: unknown;
      storageKey?: unknown;
      bucket?: unknown;
    };
    const ownerId = typeof body.ownerId === "string" ? body.ownerId : "";
    const assignmentId = typeof body.assignmentId === "string" ? body.assignmentId : null;
    const mode = typeof body.mode === "string" ? body.mode : "";
    const aiMode = typeof body.aiMode === "string" ? body.aiMode : "green";
    const sourceText = typeof body.sourceText === "string" ? body.sourceText.slice(0, 10000) : "";
    const classContext = typeof body.classContext === "string" ? body.classContext.slice(0, 3000) : "";
    if (!ownerId) return jsonResponse({ error: "ownerId required" }, 400);
    if (aiMode === "red" || aiMode === "yellow") {
      return jsonResponse({ error: "AI not available for this class" }, 403);
    }
    if (!TEXT_MODES.has(mode) && mode !== "map_annotation") {
      return jsonResponse({ error: "mode required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await resetBudgetIfNewDay(ownerId, supabase);
    const { allowed } = await checkTokenBudget(ownerId, supabase);
    if (!allowed) return jsonResponse({ error: "You've used your AI quota for today - resets at midnight." }, 429);

    let content = "";
    let tokens = 0;
    let model = "claude-haiku-4-5";

    if (mode === "map_annotation") {
      const storageKey = typeof body.storageKey === "string" ? body.storageKey : "";
      const bucket = typeof body.bucket === "string" && body.bucket.length > 0 ? body.bucket : "note-docs";
      if (!storageKey) return jsonResponse({ error: "storageKey required" }, 400);
      const result = await runMapAnnotation(supabase, storageKey, bucket);
      content = result.content;
      tokens = result.tokens;
      model = "gpt-4o";
    } else {
      if (sourceText.trim().length < 5) return jsonResponse({ error: "Add the source or prompt first." }, 400);
      const { data: profile } = await supabase
        .from("profiles")
        .select("interests, session_mood")
        .eq("user_id", ownerId)
        .single();
      const personalization = buildPersonalizationPrompt({
        interests: Array.isArray(profile?.interests) ? profile.interests : [],
        sessionMood: typeof profile?.session_mood === "string" ? profile.session_mood : null,
      });
      const systemPrompt = composeSystemPrompt(HISTORY_PROMPT, {
        includeRefuseRedirect: true,
        includeFrustration: true,
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
          max_tokens: 1300,
          system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
          messages: [{
            role: "user",
            content: `Mode: ${mode}\nSource or prompt:\n${sourceText}\n\nClass context:\n${classContext}`,
          }],
        }),
      });
      if (!res.ok) {
        console.error("history-scaffold Anthropic error:", await res.text());
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
        await logInteraction({
          ownerId,
          assignmentId,
          feature: "history_scaffold",
          model,
          promptSummary: `${mode}:${sourceText.slice(0, 180) || "map"}`,
          tokensUsed: tokens,
        }, supabase);
        await incrementTokens(ownerId, tokens, supabase);
      })
      .catch((e) => console.warn("post-response side effects failed", e));

    return jsonResponse({ content });
  } catch (err) {
    console.error("history-scaffold error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return jsonResponse({ error: message }, 500);
  }
});
