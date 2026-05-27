// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT =
  'You are Diana, a study assistant. Extract structured grading information from a class syllabus or rubric. Respond with valid JSON only matching this schema: {"assignment_types": string[], "citation_style": string|null, "show_work_required": boolean, "mechanics_weight": string|null, "ai_policy_hint": string|null, "key_rules": string[]}. key_rules: up to 5 most important rules a student must know. ai_policy_hint: if the teacher mentions AI tools, summarize their policy in one sentence.';

interface RequestBody {
  text: string;
  class_name: string;
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
      feature: "ai-summarize-rubric",
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
  if (!body.class_name || typeof body.class_name !== "string") {
    return jsonResponse({ error: "class_name required" }, 400);
  }

  const userMessage = `Class: ${body.class_name}\n\n${body.text}`;
  const promptSummary = `${body.class_name}: ${body.text.slice(0, 200)}`;

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
      max_tokens: 512,
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
      promptSummary,
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
      promptSummary,
      "json parse failed",
    );
    return jsonResponse(
      { error: "invalid model output", raw },
      502,
    );
  }

  await logAiCall(supabaseUrl, serviceKey, ownerId, "ok", promptSummary);

  return jsonResponse({
    assignment_types: Array.isArray(parsed.assignment_types)
      ? parsed.assignment_types
      : [],
    citation_style: parsed.citation_style ?? null,
    show_work_required: Boolean(parsed.show_work_required),
    mechanics_weight: parsed.mechanics_weight ?? null,
    ai_policy_hint: parsed.ai_policy_hint ?? null,
    key_rules: Array.isArray(parsed.key_rules) ? parsed.key_rules : [],
  });
});
