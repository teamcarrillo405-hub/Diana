// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT =
  'You are Diana, a study assistant for students with ADHD. Given a student\'s quick note about schoolwork and their list of classes, extract structured assignment information. Respond with valid JSON only: {"class_id": string|null, "title": string, "assignment_type": "essay"|"reading"|"problem_set"|"lab_report"|"study"|"other", "due_date": "YYYY-MM-DD"|null, "confidence": 0.0-1.0}. Match class_id from the provided list or null if unclear. Be generous with confidence — students know their own classes.';

interface ClassRef {
  id: string;
  name: string;
  subject_category: string | null;
}

interface RequestBody {
  text: string;
  classes: ClassRef[];
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

async function logAiCall(
  supabaseUrl: string,
  serviceKey: string,
  ownerId: string,
  status: "ok" | "error",
  promptSummary: string,
  blockedReason?: string,
) {
  try {
    const admin = createClient(supabaseUrl, serviceKey);
    await admin.from("ai_calls").insert({
      owner_id: ownerId,
      feature: "ai-classify-inbox",
      model: MODEL,
      prompt_summary: promptSummary.slice(0, 500),
      status,
      blocked_reason: blockedReason ?? null,
    });
  } catch (_e) {
    // swallow logging failures
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

  if (!anthropicKey) {
    return jsonResponse({ error: "missing ANTHROPIC_API_KEY" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "missing authorization" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse({ error: "invalid token" }, 401);
  }
  const ownerId = userData.user.id;

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json body" }, 400);
  }

  if (!body.text || typeof body.text !== "string") {
    return jsonResponse({ error: "text required" }, 400);
  }
  if (!Array.isArray(body.classes)) {
    return jsonResponse({ error: "classes must be an array" }, 400);
  }

  const userMessage = `Student note: ${body.text}\n\nClasses:\n${
    JSON.stringify(body.classes, null, 2)
  }`;

  const anthropicResp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text();
    await logAiCall(
      supabaseUrl,
      serviceKey,
      ownerId,
      "error",
      body.text,
      `anthropic ${anthropicResp.status}: ${errText.slice(0, 200)}`,
    );
    return jsonResponse(
      { error: "anthropic api error", detail: errText },
      502,
    );
  }

  const anthropicJson: any = await anthropicResp.json();
  const textBlock = anthropicJson?.content?.find((b: any) => b.type === "text");
  const raw = textBlock?.text ?? "";

  let parsed: any;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : raw);
  } catch {
    await logAiCall(
      supabaseUrl,
      serviceKey,
      ownerId,
      "error",
      body.text,
      "json parse failed",
    );
    return jsonResponse(
      { error: "invalid model output", raw },
      502,
    );
  }

  await logAiCall(supabaseUrl, serviceKey, ownerId, "ok", body.text);

  return jsonResponse({
    class_id: parsed.class_id ?? null,
    assignment_type: parsed.assignment_type ?? "other",
    due_date: parsed.due_date ?? null,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    title: parsed.title ?? body.text.slice(0, 80),
  });
});
