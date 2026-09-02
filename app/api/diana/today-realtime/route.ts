import { NextResponse } from "next/server";

import { estimateTokenReservation, logInteraction, runSafeBudgetedAiCall } from "@/lib/ai/safety";
import { createAiServiceClient } from "@/lib/supabase/ai-service";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const REALTIME_TTL_SECONDS = 600;
const MAX_OUTPUT_TOKENS = 500;

const TODAY_PROMPT = [
  "You are Diana, the student's voice-first guide on the Today dashboard.",
  "Speak in short, calm sentences. Ask one question at a time and use plain language that works well for ADHD and dyslexia.",
  "Use the provided Today context before calling a tool. Read-only tools may run immediately.",
  "For current facts, use search_current_information. For weather, use get_weather. Never invent current information.",
  "Opening a destination, starting a focus session, or creating a quick capture always requires confirmation.",
  "When an action tool returns confirmation_required, ask the student to say yes or use the visible Confirm button, then call confirm_action with the token.",
  "Never submit school work, delete data, send messages, change settings, or expose another student's information.",
  "Do not claim an action happened until the confirmed tool result says it succeeded.",
].join(" ");

type RealtimeSecretResponse = {
  value?: unknown;
  expires_at?: unknown;
  session?: { id?: unknown; model?: unknown } | null;
};

function safeRealtimeModel() {
  return process.env.OPENAI_REALTIME_MODEL?.trim() || "gpt-realtime-2.1-mini";
}

function safeRealtimeVoice() {
  const value = process.env.OPENAI_REALTIME_VOICE?.trim() || "marin";
  return /^(alloy|ash|ballad|coral|echo|sage|shimmer|verse|marin|cedar)$/u.test(value) ? value : "marin";
}

function tool(name: string, description: string, properties: Record<string, unknown> = {}, required: string[] = []) {
  return {
    type: "function",
    name,
    description,
    parameters: { type: "object", additionalProperties: false, properties, required },
  };
}

const TODAY_TOOLS = [
  tool("get_today_summary", "Read the student's current Today summary. This does not modify data."),
  tool("list_assignments", "List the signed-in student's active assignments. This does not modify data."),
  tool("list_calendar", "List assignment due dates on the signed-in student's calendar. This does not modify data."),
  tool("get_weather", "Get current weather. Call without coordinates first so Diana can request browser location only after the student asks about weather.", {
    latitude: { type: "number", minimum: -90, maximum: 90 },
    longitude: { type: "number", minimum: -180, maximum: 180 },
    city: { type: "string", maxLength: 80 },
  }),
  tool("search_current_information", "Search the web for current information when freshness matters.", {
    query: { type: "string", minLength: 2, maxLength: 300 },
  }, ["query"]),
  tool("answer_complex_question", "Use Diana's strongest configured reasoning model for a complex academic or general question.", {
    question: { type: "string", minLength: 2, maxLength: 1200 },
  }, ["question"]),
  tool("open_destination", "Prepare to open a safe Diana destination. This requires student confirmation.", {
    destination: { type: "string", enum: ["next_move", "work", "calendar", "classes", "wellness", "search", "settings"] },
  }, ["destination"]),
  tool("start_focus_session", "Prepare to start a 30 minute focus session for the student's Next Move. This requires confirmation."),
  tool("create_quick_capture", "Prepare a text quick-capture draft. This requires confirmation.", {
    text: { type: "string", minLength: 1, maxLength: 1000 },
  }, ["text"]),
  tool("confirm_action", "Confirm a previously prepared action only after the student clearly says yes.", {
    token: { type: "string", minLength: 20, maxLength: 5000 },
  }, ["token"]),
] as const;

async function loadTodayContext(ownerId: string) {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [{ data: assignments }, { data: profile }, { data: checkIn }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, title, due_at, status, estimated_minutes, classes(name)")
      .eq("owner_id", ownerId)
      .not("status", "in", "(submitted,graded,abandoned)")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from("profiles")
      .select("display_name, diagnoses, accommodations, reduced_motion, dyslexia_font, high_contrast, timezone")
      .eq("user_id", ownerId)
      .maybeSingle(),
    supabase
      .from("task_signals")
      .select("value")
      .eq("owner_id", ownerId)
      .eq("kind", "mood_checkin")
      .gte("occurred_at", `${today}T00:00:00.000Z`)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const compactAssignments = (assignments ?? []).map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    className: Array.isArray(assignment.classes) ? assignment.classes[0]?.name : assignment.classes?.name,
    dueAt: assignment.due_at,
    status: assignment.status,
    estimatedMinutes: assignment.estimated_minutes,
  }));
  return {
    currentDate: today,
    studentName: profile?.display_name?.split(/\s+/u)[0] || "Student",
    nextMove: compactAssignments[0] ?? null,
    assignments: compactAssignments,
    calendarToday: compactAssignments.filter((assignment) => assignment.dueAt?.startsWith(today)),
    checkIn: checkIn?.value ?? null,
    accessibility: {
      diagnoses: profile?.diagnoses ?? [],
      accommodations: profile?.accommodations ?? [],
      reducedMotion: profile?.reduced_motion ?? false,
      dyslexiaFont: profile?.dyslexia_font ?? false,
      highContrast: profile?.high_contrast ?? false,
    },
    timezone: profile?.timezone ?? "America/Los_Angeles",
  };
}

async function createRealtimeClientSecret(args: { apiKey: string; model: string; instructions: string; idempotencyKey: string }) {
  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Request-Id": args.idempotencyKey,
    },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: REALTIME_TTL_SECONDS },
      session: {
        type: "realtime",
        model: args.model,
        instructions: args.instructions,
        output_modalities: ["audio"],
        max_output_tokens: MAX_OUTPUT_TOKENS,
        tool_choice: "auto",
        tools: TODAY_TOOLS,
        tracing: null,
        truncation: { type: "retention_ratio", retention_ratio: 0.5, token_limits: { post_instructions: 5_000 } },
        audio: {
          input: {
            noise_reduction: { type: "near_field" },
            transcription: { model: "gpt-4o-mini-transcribe", language: "en" },
            turn_detection: { type: "semantic_vad", create_response: true, interrupt_response: true, eagerness: "auto" },
          },
          output: { voice: safeRealtimeVoice(), speed: 0.96 },
        },
      },
    }),
  });
  const payload = await response.json().catch(() => ({})) as RealtimeSecretResponse;
  if (!response.ok || typeof payload.value !== "string" || !payload.value.startsWith("ek_")) {
    throw new Error(response.status === 429 ? "realtime_rate_limited" : "realtime_provider_unavailable");
  }
  return {
    clientSecret: payload.value,
    expiresAt: typeof payload.expires_at === "number" ? payload.expires_at : null,
    sessionId: typeof payload.session?.id === "string" ? payload.session.id : null,
    model: typeof payload.session?.model === "string" ? payload.session.model : args.model,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ ok: false, error: "Diana Live is not connected yet." }, { status: 503 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to use Diana Live." }, { status: 401 });

  const accounting = createAiServiceClient();
  if (!accounting) return NextResponse.json({ ok: false, error: "Diana Live is unavailable right now." }, { status: 503 });

  const context = await loadTodayContext(user.id);
  const contextText = JSON.stringify(context);
  const instructions = `${TODAY_PROMPT}\n\nPrivate Today context for this session:\n${contextText}`;
  const model = safeRealtimeModel();
  const idempotencyKey = request.headers.get("x-idempotency-key")?.trim().slice(0, 128) || crypto.randomUUID();
  const estimatedTokens = estimateTokenReservation({ systemPrompt: TODAY_PROMPT, input: contextText, maxOutputTokens: MAX_OUTPUT_TOKENS });

  try {
    const guarded = await runSafeBudgetedAiCall({
      ownerId: user.id,
      supabase: accounting,
      input: contextText,
      systemPrompt: TODAY_PROMPT,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      idempotencyKey,
      invoke: () => createRealtimeClientSecret({ apiKey, model, instructions, idempotencyKey }),
      getTokens: () => estimatedTokens,
      getOutput: (value) => ({ sessionId: value.sessionId, model: value.model }),
    });
    if (!guarded.ok) return NextResponse.json({ ok: false, error: guarded.message }, { status: guarded.status });

    const value = guarded.value;
    void accounting.from("authorship_log").insert({
      owner_id: user.id,
      assignment_id: null,
      actor: "diana",
      event_type: "today_realtime_started",
      payload: { model: value.model, sessionId: value.sessionId, expiresAt: value.expiresAt, route: "today-realtime" } as Json,
    });
    void logInteraction({
      ownerId: user.id,
      assignmentId: null,
      feature: "assignment_realtime",
      model: value.model,
      correlationId: idempotencyKey,
      inputBytes: new TextEncoder().encode(contextText).byteLength,
      outputBytes: 0,
      tokensUsed: estimatedTokens,
    }, accounting);

    return NextResponse.json({
      ok: true,
      clientSecret: value.clientSecret,
      expiresAt: value.expiresAt,
      sessionId: value.sessionId,
      model: value.model,
      realtimeUrl: "https://api.openai.com/v1/realtime/calls",
    });
  } catch (error) {
    const message = error instanceof Error && error.message === "realtime_rate_limited"
      ? "Diana Live is busy. Try again in a moment."
      : "Diana Live could not start. Try again.";
    return NextResponse.json({ ok: false, error: message }, { status: 503 });
  }
}

export const runtime = "nodejs";
