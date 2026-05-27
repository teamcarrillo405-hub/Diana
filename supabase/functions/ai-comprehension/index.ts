// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT =
  "You are Diana, a reading comprehension assistant for students with ADHD. Keep questions short and concrete. Feedback is always encouraging and specific — never use the words 'incorrect', 'wrong', or 'mistake'. Respond with valid JSON only.";

interface GenerateBody {
  mode: "generate";
  text: string;
  title: string;
}

interface ValidateBody {
  mode: "validate";
  question: string;
  answer: string;
  context: string;
}

type RequestBody = GenerateBody | ValidateBody;

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
      feature: "comprehension",
      model: MODEL,
      prompt_summary: promptSummary.slice(0, 500),
      status,
      blocked_reason: blockedReason ?? null,
    });
  } catch (_e) {
    // swallow logging failures
  }
}

function parseJson(raw: string): any {
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
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

  let userMessage: string;
  let maxTokens: number;
  let promptSummary: string;

  if (body.mode === "generate") {
    if (!body.text || !body.title) {
      return jsonResponse({ error: "text and title required" }, 400);
    }
    userMessage =
      `Generate 3 comprehension questions for this reading titled '${body.title}':\n\n${body.text}`;
    maxTokens = 512;
    promptSummary = `generate: ${body.title}`;
  } else if (body.mode === "validate") {
    if (!body.question || !body.answer || !body.context) {
      return jsonResponse(
        { error: "question, answer, context required" },
        400,
      );
    }
    userMessage =
      `Question: ${body.question}\nStudent answer: ${body.answer}\nContext: ${body.context}\n\nValidate the answer and provide brief encouraging feedback.`;
    maxTokens = 256;
    promptSummary = `validate: ${body.question.slice(0, 80)}`;
  } else {
    return jsonResponse({ error: "mode must be generate or validate" }, 400);
  }

  try {
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
        max_tokens: maxTokens,
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
    const textBlock = anthropicJson?.content?.find((b: any) =>
      b.type === "text"
    );
    const raw = textBlock?.text ?? "";

    let parsed: any;
    try {
      parsed = parseJson(raw);
    } catch {
      await logAiCall(
        supabaseUrl,
        serviceKey,
        ownerId,
        "error",
        promptSummary,
        "json parse failed",
      );
      return jsonResponse({ error: "invalid model output", raw }, 502);
    }

    await logAiCall(supabaseUrl, serviceKey, ownerId, "ok", promptSummary);

    if (body.mode === "generate") {
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
      return jsonResponse({ questions });
    } else {
      return jsonResponse({
        correct: Boolean(parsed.correct),
        feedback: typeof parsed.feedback === "string" ? parsed.feedback : "",
      });
    }
  } catch (e) {
    await logAiCall(
      supabaseUrl,
      serviceKey,
      ownerId,
      "error",
      promptSummary,
      `exception: ${String(e).slice(0, 200)}`,
    );
    return jsonResponse({ error: "anthropic api error" }, 502);
  }
});
